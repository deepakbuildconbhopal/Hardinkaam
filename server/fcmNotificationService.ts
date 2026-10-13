/**
 * HARDINKAAM FIREBASE CLOUD MESSAGING (FCM) SERVICE
 * 
 * Provides server-authoritative push notification dispatching to customers,
 * service professionals, franchise partners, and administrators.
 * 
 * Features:
 * - Multi-token resolution for users across web, PWA, and mobile
 * - Automatic token lifecycle management (deactivation of stale/invalid tokens)
 * - Structured payloads with Android high-priority heads-up channels & Web Push actions
 * - Dual-delivery: Sends FCM push + synchronizes in-app Firestore notification feed
 * - Full booking lifecycle coverage (new assignments, offers, acceptance, arrivals, completion, payments)
 */

import admin from 'firebase-admin';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getMessaging as getAdminMessaging } from 'firebase-admin/messaging';
import firebaseConfig from '../firebase-applet-config.json';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { db } from '../src/firebase/config';

let adminDbInstance: any = null;
export function getAdminDb() {
  if (!adminDbInstance) {
    try {
      const app = admin.getApps()[0] || admin.initializeApp({ projectId: firebaseConfig.projectId });
      adminDbInstance = getAdminFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
    } catch {
      try {
        adminDbInstance = getAdminFirestore(firebaseConfig.firestoreDatabaseId || '(default)');
      } catch {
        adminDbInstance = null;
      }
    }
  }
  return adminDbInstance;
}

export interface FcmPushPayload {
  title: string;
  body: string;
  bookingId?: string;
  eventType?: string;
  type?: 'booking' | 'payment' | 'system';
  url?: string;
  targetRole?: 'customer' | 'pro' | 'service_man' | 'franchise' | 'admin';
  data?: Record<string, string>;
  tag?: string;
  sound?: string;
}

export interface FcmSendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  tokensCount: number;
  error?: string;
  unregisteredTokens?: string[];
}

/**
 * Normalizes user ID string safely.
 */
function cleanId(id: string | undefined | null): string {
  return (id || '').trim();
}

// In-memory token cache ensuring immediate availability regardless of cloud IAM environment
const inMemoryUserTokens = new Map<string, Set<string>>();

export function recordServerUserToken(userId: string, token: string): void {
  const cId = cleanId(userId);
  const cTok = (token || '').trim();
  if (!cId || !cTok) return;
  if (!inMemoryUserTokens.has(cId)) {
    inMemoryUserTokens.set(cId, new Set<string>());
  }
  inMemoryUserTokens.get(cId)!.add(cTok);
}

/**
 * Look up all active FCM tokens for a given user ID across collections.
 */
export async function lookupDeviceTokensForUser(userId: string): Promise<string[]> {
  const cId = cleanId(userId);
  if (!cId) return [];

  const tokens = new Set<string>();

  // Check in-memory token registry first
  const inMem = inMemoryUserTokens.get(cId);
  if (inMem) {
    inMem.forEach((t) => tokens.add(t));
  }

  try {
    const adb = getAdminDb();
    if (adb) {
      try {
        const snap1 = await adb.collection('device_tokens').where('userId', '==', cId).limit(20).get();
        snap1.forEach((d: any) => {
          const data = d.data();
          if (data.isActive !== false && data.token && typeof data.token === 'string') {
            tokens.add(data.token.trim());
          }
        });
      } catch {}

      try {
        const snap2 = await adb.collection('device_tokens').where('uid', '==', cId).limit(20).get();
        snap2.forEach((d: any) => {
          const data = d.data();
          if (data.isActive !== false && data.token && typeof data.token === 'string') {
            tokens.add(data.token.trim());
          }
        });
      } catch {}

      try {
        const proSnap = await adb.collection('service_men').doc(cId).get();
        if (proSnap.exists) {
          const proData = proSnap.data();
          if (Array.isArray(proData?.fcmTokens)) {
            for (const t of proData.fcmTokens) {
              if (typeof t === 'string' && t.trim()) tokens.add(t.trim());
            }
          }
          if (typeof proData?.fcmToken === 'string' && proData.fcmToken.trim()) {
            tokens.add(proData.fcmToken.trim());
          }
        }
      } catch {}

      try {
        const userSnap = await adb.collection('users').doc(cId).get();
        if (userSnap.exists) {
          const uData = userSnap.data();
          if (Array.isArray(uData?.fcmTokens)) {
            for (const t of uData.fcmTokens) {
              if (typeof t === 'string' && t.trim()) tokens.add(t.trim());
            }
          }
          if (typeof uData?.fcmToken === 'string' && uData.fcmToken.trim()) {
            tokens.add(uData.fcmToken.trim());
          }
        }
      } catch {}

      return Array.from(tokens).filter((t) => t.length > 10);
    }

    // Client SDK fallback if adminDb unavailable
    const q1 = query(
      collection(db, 'device_tokens'),
      where('userId', '==', cId),
      limit(20)
    );
    const snap1 = await getDocs(q1);
    snap1.forEach((d) => {
      const data = d.data();
      if (data.isActive !== false && data.token && typeof data.token === 'string') {
        tokens.add(data.token.trim());
      }
    });

    const q2 = query(
      collection(db, 'device_tokens'),
      where('uid', '==', cId),
      limit(20)
    );
    const snap2 = await getDocs(q2);
    snap2.forEach((d) => {
      const data = d.data();
      if (data.isActive !== false && data.token && typeof data.token === 'string') {
        tokens.add(data.token.trim());
      }
    });
  } catch (err: any) {
    console.warn(`[FCM Service] Error looking up tokens for user ${cId}:`, err?.message || err);
  }

  return Array.from(tokens).filter((t) => t.length > 10);
}

/**
 * Remove or mark invalid FCM tokens as inactive in Firestore.
 */
export async function cleanupUnregisteredTokens(badTokens: string[]): Promise<void> {
  if (!badTokens || badTokens.length === 0) return;

  const adb = getAdminDb();
  if (adb) {
    for (const token of badTokens) {
      try {
        const snap = await adb.collection('device_tokens').where('token', '==', token).limit(10).get();
        for (const d of snap.docs) {
          await d.ref.update({
            isActive: false,
            invalidatedAt: new Date().toISOString(),
            invalidationReason: 'FCM_UNREGISTERED',
          });
        }
      } catch (err) {
        console.warn('[FCM Service] Failed to cleanup token:', err);
      }
    }
    return;
  }

  for (const token of badTokens) {
    try {
      const q = query(
        collection(db, 'device_tokens'),
        where('token', '==', token),
        limit(10)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(d.ref, {
          isActive: false,
          invalidatedAt: new Date().toISOString(),
          invalidationReason: 'FCM_UNREGISTERED',
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[FCM Service] Failed to cleanup token:', err);
    }
  }
}

/**
 * Sends a push notification to a list of registration tokens.
 */
export async function sendFcmPushToTokens(
  tokens: string[],
  payload: FcmPushPayload
): Promise<FcmSendResult> {
  const validTokens = Array.from(new Set(tokens.filter((t) => t && typeof t === 'string' && t.trim().length > 10)));

  if (validTokens.length === 0) {
    return {
      success: false,
      sentCount: 0,
      failedCount: 0,
      tokensCount: 0,
      error: 'No valid device tokens provided',
    };
  }

  const targetUrl =
    payload.url ||
    (payload.bookingId
      ? (payload.targetRole === 'pro' || payload.targetRole === 'service_man'
          ? `/pro?bookingId=${payload.bookingId}`
          : `/#booking_${payload.bookingId}`)
      : '/');

  // Format string-only data dictionary for FCM compatibility
  const stringData: Record<string, string> = {
    bookingId: payload.bookingId || '',
    eventType: payload.eventType || '',
    type: payload.type || 'booking',
    url: targetUrl,
    title: payload.title,
    body: payload.body,
    tag: payload.tag || payload.bookingId || 'hardinkaam_alert',
    timestamp: new Date().toISOString(),
  };

  if (payload.data) {
    for (const [k, v] of Object.entries(payload.data)) {
      if (v !== undefined && v !== null) {
        stringData[k] = String(v);
      }
    }
  }

  const multicastMessage: any = {
    tokens: validTokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: stringData,
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/pwa-192x192.png',
        badge: '/favicon-32x32.png',
        tag: payload.tag || payload.bookingId || 'hardinkaam-booking-push',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: payload.targetRole === 'pro' || payload.eventType === 'booking_offer',
      },
      fcmOptions: {
        link: targetUrl,
      },
    },
    android: {
      priority: 'high',
      notification: {
        title: payload.title,
        body: payload.body,
        channelId: 'hardinkaam_booking_alerts',
        sound: payload.sound || 'default',
        icon: 'ic_notification',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
  };

  try {
    let messaging: any;
    try {
      messaging = getAdminMessaging();
    } catch {
      messaging = typeof (admin as any).messaging === 'function' ? (admin as any).messaging() : null;
    }

    if (!messaging) {
      console.warn('[FCM Service] Firebase Admin Messaging instance could not be retrieved.');
      return {
        success: false,
        sentCount: 0,
        failedCount: validTokens.length,
        tokensCount: validTokens.length,
        error: 'Messaging instance unavailable',
      };
    }

    let sendResponse: any;
    if (typeof messaging.sendEachForMulticast === 'function') {
      sendResponse = await messaging.sendEachForMulticast(multicastMessage);
    } else if (typeof messaging.sendMulticast === 'function') {
      sendResponse = await messaging.sendMulticast(multicastMessage);
    } else {
      // Fallback: Individual send
      let success = 0;
      let failure = 0;
      const unregistered: string[] = [];
      for (const token of validTokens) {
        try {
          await messaging.send({
            token,
            notification: multicastMessage.notification,
            data: multicastMessage.data,
            webpush: multicastMessage.webpush,
            android: multicastMessage.android,
          });
          success++;
        } catch (e: any) {
          failure++;
          if (
            e.code === 'messaging/registration-token-not-registered' ||
            e.code === 'messaging/invalid-registration-token'
          ) {
            unregistered.push(token);
          }
        }
      }
      if (unregistered.length > 0) {
        cleanupUnregisteredTokens(unregistered).catch(() => {});
      }
      return {
        success: success > 0,
        sentCount: success,
        failedCount: failure,
        tokensCount: validTokens.length,
        unregisteredTokens: unregistered,
      };
    }

    const unregisteredTokens: string[] = [];
    sendResponse.responses.forEach((resp: any, idx: number) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          unregisteredTokens.push(validTokens[idx]);
        }
      }
    });

    if (unregisteredTokens.length > 0) {
      cleanupUnregisteredTokens(unregisteredTokens).catch(() => {});
    }

    return {
      success: sendResponse.successCount > 0,
      sentCount: sendResponse.successCount,
      failedCount: sendResponse.failureCount,
      tokensCount: validTokens.length,
      unregisteredTokens,
    };
  } catch (err: any) {
    console.warn('[FCM Service] Multicast push dispatch note:', err?.message || err);
    return {
      success: false,
      sentCount: 0,
      failedCount: validTokens.length,
      tokensCount: validTokens.length,
      error: err?.message || 'FCM dispatch failed',
    };
  }
}

/**
 * Synchronizes an in-app notification in Firestore to guarantee delivery
 * even if the user has push notifications disabled or muted in browser settings.
 */
export async function syncInAppNotification(
  userId: string,
  payload: FcmPushPayload
): Promise<void> {
  const cId = cleanId(userId);
  if (!cId) return;

  const docId = `notif_fcm_${payload.eventType || 'alert'}_${payload.bookingId || Date.now()}_${cId}`.substring(0, 120);
  const notifData = {
    id: docId,
    userId: cId,
    title: payload.title,
    message: payload.body,
    type: payload.type || 'booking',
    link: payload.url || (payload.bookingId ? `/#booking_${payload.bookingId}` : ''),
    bookingId: payload.bookingId || '',
    eventType: payload.eventType || '',
    targetRole: payload.targetRole || 'customer',
    read: false,
    createdAt: new Date().toISOString(),
    metadata: payload.data || {},
  };

  try {
    const adb = getAdminDb();
    if (adb) {
      await adb.collection('notifications').doc(docId).set(notifData, { merge: true });
      return;
    }

    const notifRef = doc(db, 'notifications', docId);
    await setDoc(notifRef, notifData, { merge: true });
  } catch (err) {
    console.warn('[FCM Service] Non-fatal notice creating in-app notification:', err);
  }
}

/**
 * Sends a push notification to a specific user by resolving their registered device tokens.
 */
export async function sendPushToUser(
  userId: string,
  payload: FcmPushPayload
): Promise<FcmSendResult> {
  const cId = cleanId(userId);
  if (!cId) {
    return { success: false, sentCount: 0, failedCount: 0, tokensCount: 0, error: 'Empty userId' };
  }

  // 1. Always create the in-app notification first for 100% reliable visibility
  await syncInAppNotification(cId, payload);

  // 2. Look up all active FCM tokens for this user
  const tokens = await lookupDeviceTokensForUser(cId);

  if (tokens.length === 0) {
    console.log(`[FCM Service] User ${cId} has no active FCM push tokens registered (in-app notification created)`);
    return {
      success: true,
      sentCount: 0,
      failedCount: 0,
      tokensCount: 0,
    };
  }

  console.log(`[FCM Service] Sending push notification to user ${cId} across ${tokens.length} token(s)...`);
  const result = await sendFcmPushToTokens(tokens, payload);
  console.log(`[FCM Service] Result for user ${cId}: ${result.sentCount} sent, ${result.failedCount} failed`);
  return result;
}

/**
 * High-level helper: Notifies a service professional of a new job assignment or offer.
 */
export async function notifyServiceProNewAssignment(
  booking: any,
  serviceManId: string,
  offerId?: string
): Promise<FcmSendResult> {
  const bookingId = booking.id || booking.bookingId || '';
  const serviceName = booking.serviceName || 'Service Request';
  const locality = booking.locality || booking.address || 'Local area';
  const payout = booking.servicemanPayoutAmount || Math.round((booking.amount || 500) * 0.85);

  const payload: FcmPushPayload = {
    title: '🔔 नया काम आया है! (New Service Job)',
    body: `Booking #${bookingId} (${serviceName}) at ${locality}. Earnings: ₹${payout}. Tap to review & accept!`,
    bookingId,
    eventType: 'booking_offer',
    type: 'booking',
    targetRole: 'service_man',
    url: `/pro?bookingId=${bookingId}`,
    tag: `booking_offer_${bookingId}`,
    sound: 'booking_chime',
    data: {
      offerId: offerId || '',
      serviceName,
      payout: String(payout),
      scheduledDate: booking.scheduledDate || '',
      scheduledTime: booking.scheduledTime || '',
    },
  };

  return sendPushToUser(serviceManId, payload);
}

/**
 * High-level helper: Dispatches push notifications for all booking status lifecycle transitions.
 */
export async function notifyBookingStatusChange(
  booking: any,
  newStatus: string,
  actorUid?: string,
  extraData?: any
): Promise<void> {
  const bookingId = booking.id || booking.bookingId || '';
  const serviceName = booking.serviceName || 'Service';
  const customerId = booking.customerId || booking.userId;
  const proId = booking.serviceManId || booking.servicemanId || booking.assignedProId;
  const proName = booking.serviceManName || 'Technician';

  const cleanStatus = String(newStatus || '').toLowerCase().trim();

  switch (cleanStatus) {
    case 'accepted':
      if (customerId) {
        await sendPushToUser(customerId, {
          title: '🤝 Technician Assigned!',
          body: `${proName} has accepted your booking #${bookingId} for ${serviceName}. Tap to track live location.`,
          bookingId,
          eventType: 'booking_accepted',
          type: 'booking',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
          tag: `booking_accepted_${bookingId}`,
        });
      }
      break;

    case 'on_the_way':
      if (customerId) {
        const eta = extraData?.etaMinutes || 15;
        await sendPushToUser(customerId, {
          title: '🛵 Technician On The Way!',
          body: `${proName} is en route to your service address. Estimated arrival: ~${eta} minutes.`,
          bookingId,
          eventType: 'on_the_way',
          type: 'booking',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
          tag: `on_the_way_${bookingId}`,
        });
      }
      break;

    case 'arrived':
      if (customerId) {
        await sendPushToUser(customerId, {
          title: '📍 Technician Arrived at Doorstep!',
          body: `${proName} has reached your location for #${bookingId}. Please share your 4-digit OTP to start service.`,
          bookingId,
          eventType: 'arrived',
          type: 'booking',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
          tag: `arrived_${bookingId}`,
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: '📍 Arrival Confirmed',
          body: `You arrived at booking #${bookingId}. Collect Start OTP from customer to start timer.`,
          bookingId,
          eventType: 'arrived',
          type: 'booking',
          targetRole: 'service_man',
          url: `/pro?bookingId=${bookingId}`,
        });
      }
      break;

    case 'in_progress':
    case 'work_started':
      if (customerId) {
        await sendPushToUser(customerId, {
          title: '⏱️ Service Work Started',
          body: `${proName} verified your OTP and started work on #${bookingId} (${serviceName}). Live timer active.`,
          bookingId,
          eventType: 'work_started',
          type: 'booking',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
        });
      }
      break;

    case 'completed':
    case 'work_completed': {
      const finalAmount = extraData?.amount || booking.finalAmount || booking.amount || 0;
      if (customerId) {
        await sendPushToUser(customerId, {
          title: '🎉 Service Completed!',
          body: `${proName} completed #${bookingId} (${serviceName}). Payable: ₹${finalAmount}. Tap to inspect & pay.`,
          bookingId,
          eventType: 'work_completed',
          type: 'booking',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: '✅ Job Completed Successfully',
          body: `Work for booking #${bookingId} completed. Bill of ₹${finalAmount} generated.`,
          bookingId,
          eventType: 'work_completed',
          type: 'booking',
          targetRole: 'service_man',
          url: `/pro?bookingId=${bookingId}`,
        });
      }
      break;
    }

    case 'paid': {
      const amt = extraData?.amount || booking.finalAmount || booking.amount || 0;
      if (customerId) {
        await sendPushToUser(customerId, {
          title: '💳 Payment Successful!',
          body: `Payment of ₹${amt} for #${bookingId} was received. Thank you for choosing HARDINKAAM!`,
          bookingId,
          eventType: 'payment_status',
          type: 'payment',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: '💰 Payment Received!',
          body: `Payment of ₹${amt} for #${bookingId} received. Earnings credited to your wallet balance.`,
          bookingId,
          eventType: 'payment_status',
          type: 'payment',
          targetRole: 'service_man',
          url: `/pro?bookingId=${bookingId}`,
        });
      }
      break;
    }

    case 'cancelled': {
      const reason = extraData?.reason || 'Service cancelled';
      if (customerId) {
        await sendPushToUser(customerId, {
          title: '🚫 Booking Cancelled',
          body: `Booking #${bookingId} (${serviceName}) was cancelled. Reason: ${reason}`,
          bookingId,
          eventType: 'cancellation',
          type: 'booking',
          targetRole: 'customer',
          url: `/#booking_${bookingId}`,
        });
      }
      if (proId) {
        await sendPushToUser(proId, {
          title: '🚫 Job Cancelled',
          body: `Job #${bookingId} (${serviceName}) was cancelled.`,
          bookingId,
          eventType: 'cancellation',
          type: 'booking',
          targetRole: 'service_man',
          url: `/pro`,
        });
      }
      break;
    }
  }
}

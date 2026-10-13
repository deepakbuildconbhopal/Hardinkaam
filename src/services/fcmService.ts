import {
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  isFCMSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMRegistrationToken,
  deleteFCMRegistrationToken,
  subscribeToForegroundMessages,
} from '../firebase/fcm';
import { DeviceToken } from '../types';

const FCM_LOCAL_TOKEN_KEY = 'hardinkaam_fcm_token';

/**
 * Generates a safe, deterministic Firestore document ID for a device token.
 * Enables multiple devices per user without collision or overwrite.
 */
function generateTokenDocId(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const prefix = token.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `fcm_${prefix}_${Math.abs(hash)}`;
}

/**
 * Detects device and platform information safely.
 */
function detectDevicePlatform(): { device: string; platform: 'web' | 'pwa' | 'android' | 'ios' } {
  if (typeof window === 'undefined' || !navigator) {
    return { device: 'web', platform: 'web' };
  }

  const ua = navigator.userAgent || '';
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  const pwaTag = isPWA ? ' [PWA]' : '';
  let platform: 'web' | 'pwa' | 'android' | 'ios' = isPWA ? 'pwa' : 'web';
  let device = `Browser${pwaTag}`;

  if (/android/i.test(ua)) {
    device = `Android Web${pwaTag}`;
    if (!isPWA) platform = 'android';
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    device = `iOS Safari${pwaTag}`;
    if (!isPWA) platform = 'ios';
  } else if (/Windows/i.test(ua)) {
    device = `Windows PC${pwaTag}`;
  } else if (/Macintosh/i.test(ua)) {
    device = `Mac OS${pwaTag}`;
  } else if (/Linux/i.test(ua)) {
    device = `Linux PC${pwaTag}`;
  }

  return { device, platform };
}

export interface PushSubscriptionResult {
  success: boolean;
  permission: NotificationPermission;
  token?: string | null;
  error?: string;
}

export interface PushNotificationStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  token: string | null;
}

/**
 * Registers an FCM device token in the Firestore `device_tokens` collection.
 */
export async function registerDeviceToken(
  user: { uid: string; role?: string },
  token: string
): Promise<boolean> {
  if (!user?.uid || !token) {
    return false;
  }

  try {
    const docId = generateTokenDocId(token);
    const { device, platform } = detectDevicePlatform();
    const now = new Date().toISOString();

    const deviceTokenData: DeviceToken = {
      id: docId,
      token,
      uid: user.uid,
      userId: user.uid,
      role: user.role || 'customer',
      device,
      deviceType: 'web',
      platform,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 200) : '',
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    };

    const docRef = doc(db, 'device_tokens', docId);
    await setDoc(docRef, deviceTokenData, { merge: true });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FCM_LOCAL_TOKEN_KEY, token);
    }

    // Synchronize token with backend server
    try {
      fetch('/api/fcm/register-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          userId: user.uid,
          role: user.role || 'customer',
          deviceType: platform,
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking
    }

    return true;
  } catch (err) {
    console.warn('[FCM Service] Failed to save device token in Firestore:', err);
    return false;
  }
}

/**
 * Removes or deactivates a specific device token in Firestore.
 */
export async function removeDeviceToken(token: string, userId?: string): Promise<boolean> {
  if (!token) return false;

  try {
    const docId = generateTokenDocId(token);
    const docRef = doc(db, 'device_tokens', docId);

    try {
      await deleteDoc(docRef);
    } catch {
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    if (typeof localStorage !== 'undefined' && localStorage.getItem(FCM_LOCAL_TOKEN_KEY) === token) {
      localStorage.removeItem(FCM_LOCAL_TOKEN_KEY);
    }

    return true;
  } catch (err) {
    console.warn('[FCM Service] Failed to remove device token:', err);
    return false;
  }
}

/**
 * User-action-driven subscription flow:
 * 1. Checks FCM browser support.
 * 2. Prompts user for browser notification permission.
 * 3. If granted, retrieves FCM token and registers it in Firestore.
 */
export async function subscribeToPushNotifications(user: {
  uid: string;
  role?: string;
}): Promise<PushSubscriptionResult> {
  const supported = await isFCMSupported();
  if (!supported) {
    return {
      success: false,
      permission: 'denied',
      error: 'Push notifications are not supported in this browser or environment.',
    };
  }

  let permission = getNotificationPermission();
  if (permission === 'default') {
    permission = await requestNotificationPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      permission,
      error:
        permission === 'denied'
          ? 'Notification permission was denied in browser settings.'
          : 'Notification permission was not granted.',
    };
  }

  try {
    const token = await getFCMRegistrationToken();
    if (!token) {
      return {
        success: false,
        permission: 'granted',
        error: 'Could not obtain push registration token. Check Web Push / VAPID setup in Firebase Console.',
      };
    }

    const saved = await registerDeviceToken(user, token);
    if (!saved) {
      return {
        success: false,
        permission: 'granted',
        token,
        error: 'Push token generated, but failed to save in Firestore device registry.',
      };
    }

    return {
      success: true,
      permission: 'granted',
      token,
    };
  } catch (err: any) {
    console.warn('[FCM Service] Subscribe error:', err);
    return {
      success: false,
      permission: getNotificationPermission(),
      error: err?.message || 'An error occurred during push registration.',
    };
  }
}

/**
 * Unsubscribes the current device from push notifications.
 */
export async function unsubscribeFromPushNotifications(user?: { uid: string }): Promise<boolean> {
  try {
    const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(FCM_LOCAL_TOKEN_KEY) : null;
    if (savedToken) {
      await removeDeviceToken(savedToken, user?.uid);
    }

    await deleteFCMRegistrationToken();

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(FCM_LOCAL_TOKEN_KEY);
    }

    return true;
  } catch (err) {
    console.warn('[FCM Service] Unsubscribe error:', err);
    return false;
  }
}

/**
 * Retrieves the current push notification status for this device and user.
 */
export async function getPushNotificationStatus(): Promise<PushNotificationStatus> {
  try {
    const isSupported = await isFCMSupported();
    const permission = getNotificationPermission();
    const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(FCM_LOCAL_TOKEN_KEY) : null;

    return {
      isSupported,
      permission,
      isSubscribed: isSupported && permission === 'granted' && !!savedToken,
      token: savedToken,
    };
  } catch {
    return {
      isSupported: false,
      permission: 'denied',
      isSubscribed: false,
      token: null,
    };
  }
}

/**
 * Dispatches a test push notification to verify end-to-end FCM delivery.
 */
export async function sendTestPushNotification(
  userId: string,
  role: string = 'customer'
): Promise<{ success: boolean; message: string }> {
  try {
    const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(FCM_LOCAL_TOKEN_KEY) : null;
    const resp = await fetch('/api/fcm/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        token: savedToken,
        role,
      }),
    });
    const data = await resp.json();
    return {
      success: data.success === true,
      message: data.success
        ? 'Test push notification dispatched successfully! ✓'
        : data.error || 'Failed to dispatch test notification.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error triggering test push.',
    };
  }
}

export {
  isFCMSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMRegistrationToken,
  deleteFCMRegistrationToken,
  subscribeToForegroundMessages,
};

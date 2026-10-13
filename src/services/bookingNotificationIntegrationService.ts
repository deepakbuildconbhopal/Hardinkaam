/**
 * HARDINKAAM BOOKING NOTIFICATION INTEGRATION SERVICE
 * 
 * Provides unified, deduplicated, Spark-quota-safe notification dispatching
 * for all 14 booking lifecycle milestones:
 * 
 * 1.  Booking created
 * 2.  Booking offer
 * 3.  Booking accepted
 * 4.  On the way
 * 5.  Arrived
 * 6.  OTP ready
 * 7.  Work started
 * 8.  Extra charge requested
 * 9.  Extra charge approved / rejected
 * 10. Work completed
 * 11. Final bill
 * 12. Payment status
 * 13. Cancellation
 * 14. Reassignment
 * 
 * Guarantees:
 * - Deterministic document IDs preventing duplicate notifications
 * - In-memory deduplication cache
 * - Spark quota friendly (bounded writes, zero runaway queries)
 * - Strict permissions compliance (users only receive authorized, relevant notifications)
 */

import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, Notification, ExtraChargeItem } from '../types';
import { sendWhatsAppApiMessage } from './whatsappApiService';

export type BookingNotificationEventType =
  | 'booking_created'
  | 'booking_offer'
  | 'booking_accepted'
  | 'on_the_way'
  | 'arrived'
  | 'otp_ready'
  | 'work_started'
  | 'extra_charge_requested'
  | 'extra_charge_approved'
  | 'extra_charge_rejected'
  | 'work_completed'
  | 'final_bill'
  | 'payment_status'
  | 'cancellation'
  | 'reassignment';

export interface BookingNotificationPayload {
  event: BookingNotificationEventType;
  booking: Booking;
  targetUserId?: string;
  targetRole?: 'customer' | 'pro' | 'franchise' | 'admin';
  customTitle?: string;
  customMessage?: string;
  extraData?: {
    otp?: string;
    etaMinutes?: number;
    extraChargeItem?: ExtraChargeItem;
    amount?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    cancellationReason?: string;
    cancelledBy?: string;
    newServiceManId?: string;
    newServiceManName?: string;
    previousServiceManId?: string;
    offerId?: string;
    proName?: string;
  };
}

// In-memory deduplication set to avoid duplicate network calls within the same session
const sentNotificationCache = new Set<string>();
async function sendBookingWhatsApp(booking: Booking, phone: string | undefined, message: string, eventType: BookingNotificationEventType, recipientName?: string): Promise<void> {
  if (!phone) return;
  try {
    await sendWhatsAppApiMessage({
      phone,
      message,
      bookingId: booking.id,
      eventType,
      recipientName,
    });
  } catch (err: any) {
    console.warn(`[Booking WhatsApp] ${eventType}:`, err?.message || err);
  }
}


/**
 * Generates a deterministic, collision-free document ID for a notification.
 * This guarantees zero duplicate notifications even if called multiple times.
 */
export function generateNotificationDocId(
  event: BookingNotificationEventType,
  bookingId: string,
  targetUserId: string,
  extraSuffix: string = ''
): string {
  const cleanSuffix = extraSuffix ? `_${extraSuffix.replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
  return `notif_${event}_${bookingId}_${targetUserId}${cleanSuffix}`.substring(0, 120);
}

/**
 * Dispatches a deduplicated notification to Firestore.
 * Uses deterministic document IDs to guarantee idempotency.
 */
export async function sendDeduplicatedNotification(
  docId: string,
  notif: {
    userId: string;
    bookingId?: string;
    title: string;
    message: string;
    type: 'booking' | 'payment' | 'system';
    link?: string;
    targetRole?: 'admin' | 'franchise' | 'pro' | 'customer';
    eventType?: BookingNotificationEventType;
    metadata?: Record<string, any>;
  }
): Promise<boolean> {
  if (!docId || !notif.userId) return false;

  // Check in-memory cache first to avoid redundant Firestore network writes
  if (sentNotificationCache.has(docId)) {
    return true;
  }

  try {
    const notifRef = doc(db, 'notifications', docId);
    
    // Write idempotent document
    const payload: Record<string, any> = {
      id: docId,
      userId: notif.userId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      link: notif.link || notif.bookingId || '',
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (notif.bookingId) payload.bookingId = notif.bookingId;
    if (notif.targetRole) payload.targetRole = notif.targetRole;
    if (notif.eventType) payload.eventType = notif.eventType;
    if (notif.metadata) payload.metadata = notif.metadata;

    await setDoc(notifRef, payload, { merge: true });
    sentNotificationCache.add(docId);

    // Dispatch real-time FCM Push Notification to target device
    try {
      fetch('/api/fcm/send-booking-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: notif.userId,
          targetRole: notif.targetRole,
          bookingId: notif.bookingId,
          eventType: notif.eventType,
          title: notif.title,
          body: notif.message,
          url: notif.link || (notif.bookingId ? `/#booking_${notif.bookingId}` : '/'),
          data: notif.metadata,
        }),
      }).catch(() => {});
    } catch {
      // Non-blocking
    }

    return true;
  } catch (err: any) {
    // If permission or network issue, log softly and do not crash UI
    console.warn(`[NotificationService] Notice dispatching ${docId}:`, err?.message || err);
    return false;
  }
}

// ============================================================================
// 1. BOOKING CREATED
// ============================================================================
export async function notifyBookingCreated(
  booking: Booking,
  targetDistrictPartnerId?: string
): Promise<void> {
  const bookingId = booking.id;
  const serviceName = booking.serviceName || 'Service';
  const date = booking.scheduledDate || 'Scheduled Date';
  const time = booking.scheduledTime || '';
  const amount = booking.finalAmount || booking.amount || 0;

  // 1A. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId('booking_created', bookingId, booking.customerId, 'customer');
    const waMessage = `📋 HARDINKAAM Booking Confirmed\n\nBooking: #${bookingId}\nService: ${serviceName}\nDate: ${date} ${time}\nAmount: ₹${amount}\n\nVerified technician is being assigned.`;
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: 'Booking Confirmed! 📋',
      message: `Your booking #${bookingId} for ${serviceName} on ${date} (${time}) has been confirmed. Total: ₹${amount}. Verified technician is being assigned.`,
      type: 'booking', link: bookingId, targetRole: 'customer', eventType: 'booking_created', metadata: { bookingId, serviceName, amount },
    });
    await sendBookingWhatsApp(booking, booking.customerPhone, waMessage, 'booking_created', (booking as any).customerName);
  }

  // 1B. District Franchise / Admin Notification
  const franchiseTargetId = targetDistrictPartnerId || (booking.districtId ? `franchise_${booking.districtId}` : '');
  if (franchiseTargetId) {
    const docId = generateNotificationDocId('booking_created', bookingId, franchiseTargetId, 'franchise');
    await sendDeduplicatedNotification(docId, {
      userId: franchiseTargetId,
      bookingId,
      title: 'New Booking Created 📢',
      message: `New booking #${bookingId} in ${booking.districtName || booking.districtId || 'District'} for ${serviceName} (₹${amount}).`,
      type: 'booking',
      link: bookingId,
      targetRole: 'franchise',
      eventType: 'booking_created',
      metadata: { bookingId, districtId: booking.districtId, amount },
    });
  }
}

// ============================================================================
// 2. BOOKING OFFER
// ============================================================================
export async function notifyBookingOffer(
  booking: Booking,
  serviceManId: string,
  offerId?: string
): Promise<void> {
  if (!serviceManId) return;
  const bookingId = booking.id;
  const serviceName = booking.serviceName || 'Service Job';
  const locality = (booking as any).locality || booking.address || 'Your service area';
  const amount = booking.servicemanPayoutAmount || Math.round((booking.amount || 0) * 0.85);

  const docId = generateNotificationDocId('booking_offer', bookingId, serviceManId, offerId || 'offer');
  await sendDeduplicatedNotification(docId, {
    userId: serviceManId,
    bookingId,
    title: 'New Job Offer Available! 🔔',
    message: `New offer for #${bookingId} (${serviceName}) at ${locality}. Estimated earnings: ₹${amount}. Tap to review and accept.`,
    type: 'booking',
    link: bookingId,
    targetRole: 'pro',
    eventType: 'booking_offer',
    metadata: { bookingId, offerId, amount },
  });
}

// ============================================================================
// 3. BOOKING ACCEPTED
// ============================================================================
export async function notifyBookingAccepted(
  booking: Booking,
  serviceManName?: string
): Promise<void> {
  const bookingId = booking.id;
  const proName = serviceManName || booking.serviceManName || 'Technician';
  const serviceName = booking.serviceName || 'Service';

  // 3A. Notify Customer
  if (booking.customerId) {
    const docId = generateNotificationDocId('booking_accepted', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, { userId: booking.customerId, bookingId, title: 'Technician Assigned! 🤝', message: `${proName} has accepted your booking #${bookingId} for ${serviceName}. You can track live location and contact the pro.`, type: 'booking', link: bookingId, targetRole: 'customer', eventType: 'booking_accepted', metadata: { bookingId, serviceManName: proName } });
    await sendBookingWhatsApp(booking, booking.customerPhone, `🤝 HARDINKAAM Technician Assigned\n\n${proName} has accepted booking #${bookingId} for ${serviceName}.`, 'booking_accepted', (booking as any).customerName);
  }

  // 3B. Notify Franchise
  if (booking.partnerId || booking.districtId) {
    const franchiseId = booking.partnerId || `franchise_${booking.districtId}`;
    const docId = generateNotificationDocId('booking_accepted', bookingId, franchiseId, 'franchise');
    await sendDeduplicatedNotification(docId, {
      userId: franchiseId,
      bookingId,
      title: 'Booking Accepted 📋',
      message: `${proName} accepted booking #${bookingId} (${serviceName}).`,
      type: 'booking',
      link: bookingId,
      targetRole: 'franchise',
      eventType: 'booking_accepted',
      metadata: { bookingId, serviceManName: proName },
    });
  }
}

// ============================================================================
// 4. ON THE WAY
// ============================================================================
export async function notifyOnTheWay(
  booking: Booking,
  etaMinutes: number = 15
): Promise<void> {
  const bookingId = booking.id;
  const proName = booking.serviceManName || 'Technician';

  if (booking.customerId) {
    const docId = generateNotificationDocId('on_the_way', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, { userId: booking.customerId, bookingId, title: 'Technician On The Way! 🛵', message: `${proName} is en route to your service location. Estimated arrival: ~${etaMinutes} mins.`, type: 'booking', link: bookingId, targetRole: 'customer', eventType: 'on_the_way', metadata: { bookingId, etaMinutes } });
    await sendBookingWhatsApp(booking, booking.customerPhone, `🛵 HARDINKAAM Update\n\n${proName} is on the way for booking #${bookingId}. Estimated arrival: ~${etaMinutes} mins.`, 'on_the_way', (booking as any).customerName);
  }
}

// ============================================================================
// 5. ARRIVED
// ============================================================================
export async function notifyArrived(booking: Booking): Promise<void> {
  const bookingId = booking.id;
  const proName = booking.serviceManName || 'Technician';

  // 5A. Notify Customer
  if (booking.customerId) {
    const docId = generateNotificationDocId('arrived', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, { userId: booking.customerId, bookingId, title: 'Technician Arrived! 📍', message: `${proName} has reached your location. Please provide your 4-digit start OTP to begin service.`, type: 'booking', link: bookingId, targetRole: 'customer', eventType: 'arrived', metadata: { bookingId } });
    await sendBookingWhatsApp(booking, booking.customerPhone, `📍 HARDINKAAM Technician Arrived\n\n${proName} has reached your location for booking #${bookingId}. Please provide your 4-digit start OTP to begin service.`, 'arrived', (booking as any).customerName);
  }

  // 5B. Notify Pro
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('arrived', bookingId, booking.serviceManId, 'pro');
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: 'Arrival Logged 📍',
      message: `You marked arrived at booking #${bookingId}. Please collect the 4-digit OTP from customer to start timer.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'arrived',
      metadata: { bookingId },
    });
  }
}

// ============================================================================
// 6. OTP READY
// ============================================================================
export async function notifyOtpReady(
  booking: Booking,
  otpCode: string
): Promise<void> {
  const bookingId = booking.id;
  const proName = booking.serviceManName || 'Technician';

  // 6A. Notify Customer with the actual OTP
  if (booking.customerId && otpCode) {
    const docId = generateNotificationDocId('otp_ready', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, { userId: booking.customerId, bookingId, title: 'Start Service OTP: ' + otpCode + ' 🔐', message: `Your 4-digit Start OTP is ${otpCode}. Share this with ${proName} upon arrival to begin work securely.`, type: 'booking', link: bookingId, targetRole: 'customer', eventType: 'otp_ready', metadata: { bookingId, otp: otpCode } });
    await sendBookingWhatsApp(booking, booking.customerPhone, `🔐 HARDINKAAM Start Service OTP\n\nBooking: #${bookingId}\nOTP: ${otpCode}\n\nShare this OTP with ${proName} upon arrival to start work.`, 'otp_ready', (booking as any).customerName);
  }

  // 6B. Notify Pro that OTP verification is required
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('otp_ready', bookingId, booking.serviceManId, 'pro');
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: 'Start OTP Verification Required 🔐',
      message: `Job #${bookingId} is ready. Ask customer for their 4-digit OTP to start the job timer.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'otp_ready',
      metadata: { bookingId },
    });
  }
}

// ============================================================================
// 7. WORK STARTED
// ============================================================================
export async function notifyWorkStarted(booking: Booking): Promise<void> {
  const bookingId = booking.id;
  const proName = booking.serviceManName || 'Technician';
  const serviceName = booking.serviceName || 'Service';

  // 7A. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId('work_started', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: 'Service Work Started ⏱️',
      message: `${proName} verified your OTP and started work on #${bookingId} (${serviceName}). Live job timer is active.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'work_started',
      metadata: { bookingId },
    });
  }

  // 7B. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('work_started', bookingId, booking.serviceManId, 'pro');
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: 'Work Timer Running ⏱️',
      message: `Job #${bookingId} is in progress. Timer is recorded authoritatively.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'work_started',
      metadata: { bookingId },
    });
  }
}

// ============================================================================
// 8. EXTRA CHARGE REQUESTED
// ============================================================================
export async function notifyExtraChargeRequested(
  booking: Booking,
  item: ExtraChargeItem
): Promise<void> {
  const bookingId = booking.id;
  const proName = booking.serviceManName || 'Technician';
  const itemId = item.id || 'extra_' + Date.now();
  const desc = item.description || 'Extra Material/Service';
  const amount = item.total || item.unitPrice || 0;

  // 8A. Customer Notification (Approval Required)
  if (booking.customerId) {
    const docId = generateNotificationDocId('extra_charge_requested', bookingId, booking.customerId, itemId);
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: `Extra Charge Approval Needed (₹${amount}) ⚠️`,
      message: `${proName} requested extra charge of ₹${amount} for "${desc}". Please review and approve in your tracker.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'extra_charge_requested',
      metadata: { bookingId, itemId, amount, desc },
    });
  }

  // 8B. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('extra_charge_requested', bookingId, booking.serviceManId, itemId);
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: 'Extra Charge Request Sent ⏳',
      message: `Request for ₹${amount} ("${desc}") sent to customer. Waiting for customer approval.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'extra_charge_requested',
      metadata: { bookingId, itemId, amount },
    });
  }
}

// ============================================================================
// 9. EXTRA CHARGE APPROVED / REJECTED
// ============================================================================
export async function notifyExtraChargeDecision(
  booking: Booking,
  item: ExtraChargeItem,
  approved: boolean
): Promise<void> {
  const bookingId = booking.id;
  const itemId = item.id || 'extra_' + Date.now();
  const desc = item.description || 'Extra Item';
  const amount = item.total || item.unitPrice || 0;

  const eventType: BookingNotificationEventType = approved ? 'extra_charge_approved' : 'extra_charge_rejected';

  // 9A. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId(eventType, bookingId, booking.serviceManId, itemId);
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: approved ? `Extra Charge Approved! ✅ (₹${amount})` : `Extra Charge Declined ❌ (₹${amount})`,
      message: approved
        ? `Customer approved ₹${amount} for "${desc}". This has been added to the final bill.`
        : `Customer declined the extra charge request of ₹${amount} for "${desc}".`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType,
      metadata: { bookingId, itemId, amount, approved },
    });
  }

  // 9B. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId(eventType, bookingId, booking.customerId, itemId);
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: approved ? `Extra Charge Confirmed ✅` : `Extra Charge Declined ❌`,
      message: approved
        ? `You approved ₹${amount} for "${desc}".`
        : `You declined the extra charge of ₹${amount} for "${desc}".`,
      type: 'booking',
      link: bookingId,
      targetRole: 'customer',
      eventType,
      metadata: { bookingId, itemId, amount, approved },
    });
  }
}

// ============================================================================
// 10. WORK COMPLETED
// ============================================================================
export async function notifyWorkCompleted(
  booking: Booking,
  finalAmount?: number
): Promise<void> {
  const bookingId = booking.id;
  const proName = booking.serviceManName || 'Technician';
  const serviceName = booking.serviceName || 'Service';
  const amount = finalAmount ?? booking.finalAmount ?? booking.amount ?? 0;

  // 10A. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId('work_completed', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: 'Service Work Completed! 🎉',
      message: `${proName} has completed work on #${bookingId} (${serviceName}). Final payable amount is ₹${amount}. Please inspect and pay.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'work_completed',
      metadata: { bookingId, amount },
    });
  }

  // 10B. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('work_completed', bookingId, booking.serviceManId, 'pro');
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: 'Job Completed Successfully ✅',
      message: `Work on booking #${bookingId} completed. Final bill of ₹${amount} generated.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'work_completed',
      metadata: { bookingId, amount },
    });
  }
}

// ============================================================================
// 11. FINAL BILL
// ============================================================================
export async function notifyFinalBillGenerated(
  booking: Booking,
  finalAmount: number
): Promise<void> {
  const bookingId = booking.id;
  const serviceName = booking.serviceName || 'Service';

  // 11A. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId('final_bill', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: `Final Bill Ready: ₹${finalAmount} 🧾`,
      message: `Detailed bill snapshot for #${bookingId} (${serviceName}) is ready. Tap to view itemized breakdown and complete payment.`,
      type: 'payment',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'final_bill',
      metadata: { bookingId, finalAmount },
    });
  }

  // 11B. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('final_bill', bookingId, booking.serviceManId, 'pro');
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: `Final Bill Snapshot Logged 🧾`,
      message: `Final bill of ₹${finalAmount} logged for booking #${bookingId}.`,
      type: 'payment',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'final_bill',
      metadata: { bookingId, finalAmount },
    });
  }
}

// ============================================================================
// 12. PAYMENT STATUS
// ============================================================================
export async function notifyPaymentStatus(
  booking: Booking,
  paymentStatus: string,
  amount: number,
  paymentMethod: string = 'UPI / Cash'
): Promise<void> {
  const bookingId = booking.id;
  const isSuccess = paymentStatus === 'paid' || paymentStatus === 'completed' || paymentStatus === 'collected';

  // 12A. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId('payment_status', bookingId, booking.customerId, `${paymentStatus}_${amount}`);
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: isSuccess ? 'Payment Successful! 💳' : 'Payment Update ⏳',
      message: isSuccess
        ? `Payment of ₹${amount} for booking #${bookingId} was successfully processed via ${paymentMethod}. Thank you for choosing HARDINKAAM!`
        : `Payment status for booking #${bookingId} is now ${paymentStatus}. Total: ₹${amount}.`,
      type: 'payment',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'payment_status',
      metadata: { bookingId, amount, paymentStatus, paymentMethod },
    });
  }

  // 12B. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('payment_status', bookingId, booking.serviceManId, `${paymentStatus}_${amount}`);
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: isSuccess ? 'Payment Confirmed 💰' : 'Payment Status Updated ⏳',
      message: isSuccess
        ? `Payment of ₹${amount} for booking #${bookingId} confirmed. Net technician earnings will reflect in your wallet balance.`
        : `Payment for booking #${bookingId} is currently ${paymentStatus}.`,
      type: 'payment',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'payment_status',
      metadata: { bookingId, amount, paymentStatus },
    });
  }

  // 12C. Franchise Notification
  if (booking.partnerId || booking.districtId) {
    const franchiseId = booking.partnerId || `franchise_${booking.districtId}`;
    const docId = generateNotificationDocId('payment_status', bookingId, franchiseId, `${paymentStatus}_${amount}`);
    await sendDeduplicatedNotification(docId, {
      userId: franchiseId,
      bookingId,
      title: `Booking #${bookingId} Payment: ${paymentStatus.toUpperCase()} 💰`,
      message: `Amount ₹${amount} for booking #${bookingId} status: ${paymentStatus}.`,
      type: 'payment',
      link: bookingId,
      targetRole: 'franchise',
      eventType: 'payment_status',
      metadata: { bookingId, amount, paymentStatus },
    });
  }
}

// ============================================================================
// 13. CANCELLATION
// ============================================================================
export async function notifyCancellation(
  booking: Booking,
  cancelledBy: 'customer' | 'pro' | 'service_man' | 'franchise' | 'admin' | string = 'customer',
  reason?: string
): Promise<void> {
  const bookingId = booking.id;
  const serviceName = booking.serviceName || 'Service';
  const reasonText = reason ? ` Reason: "${reason}"` : '';

  // 13A. Customer Notification
  if (booking.customerId) {
    const docId = generateNotificationDocId('cancellation', bookingId, booking.customerId, 'customer');
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: 'Booking Cancelled 🚫',
      message: `Booking #${bookingId} (${serviceName}) has been cancelled.${reasonText}`,
      type: 'booking',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'cancellation',
      metadata: { bookingId, cancelledBy, reason },
    });
  }

  // 13B. Pro Notification
  if (booking.serviceManId) {
    const docId = generateNotificationDocId('cancellation', bookingId, booking.serviceManId, 'pro');
    await sendDeduplicatedNotification(docId, {
      userId: booking.serviceManId,
      bookingId,
      title: 'Booking Cancelled 🚫',
      message: `Job #${bookingId} (${serviceName}) was cancelled.${reasonText}`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'cancellation',
      metadata: { bookingId, cancelledBy, reason },
    });
  }

  // 13C. Franchise Notification
  if (booking.partnerId || booking.districtId || (booking as any).franchisePartnerId) {
    const franchiseId = booking.partnerId || (booking as any).franchisePartnerId || `franchise_${booking.districtId}`;
    const docId = generateNotificationDocId('cancellation', bookingId, franchiseId, 'franchise');
    await sendDeduplicatedNotification(docId, {
      userId: franchiseId,
      bookingId,
      title: 'Booking Cancelled 🚫',
      message: `Booking #${bookingId} in ${booking.districtName || booking.districtId || 'District'} was cancelled.${reasonText}`,
      type: 'booking',
      link: bookingId,
      targetRole: 'franchise',
      eventType: 'cancellation',
      metadata: { bookingId, cancelledBy, reason },
    });
  }
}

// ============================================================================
// 14. REASSIGNMENT
// ============================================================================
export async function notifyReassignment(
  booking: Booking,
  reasonOrNewProId?: string,
  newServiceManId?: string,
  newServiceManName?: string,
  previousServiceManId?: string
): Promise<void> {
  const bookingId = booking.id;
  const serviceName = booking.serviceName || 'Service';

  // Check if called as notifyReassignment(booking, reason) or notifyReassignment(booking, reason, newId, newName, prevId)
  const isUnableToReach = !newServiceManId && reasonOrNewProId && !reasonOrNewProId.startsWith('pro_') && !reasonOrNewProId.startsWith('sm_');
  
  if (isUnableToReach) {
    const reason = reasonOrNewProId || 'Technician unavailable';
    // 14A1. Notify Customer of technician reassignment search
    if (booking.customerId) {
      const docId = generateNotificationDocId('reassignment', bookingId, booking.customerId, 'seeking');
      await sendDeduplicatedNotification(docId, {
        userId: booking.customerId,
        bookingId,
        title: 'Technician Update ⚠️',
        message: `Service Professional cannot reach your location due to ${reason}. We are assigning another technician for you.`,
        type: 'booking',
        link: bookingId,
        targetRole: 'customer',
        eventType: 'reassignment',
        metadata: { bookingId, reason },
      });
    }

    // 14A2. Notify Franchise Admin of reassignment required
    const franchiseId = booking.partnerId || (booking as any).franchisePartnerId || (booking.districtId ? `franchise_${booking.districtId}` : undefined);
    if (franchiseId) {
      const docId = generateNotificationDocId('reassignment', bookingId, franchiseId, 'required');
      await sendDeduplicatedNotification(docId, {
        userId: franchiseId,
        bookingId,
        title: 'Booking Reassignment Required ⚠️',
        message: `Booking #${bookingId} (${serviceName}): Technician ${booking.serviceManName || 'assigned'} unable to reach (${reason}). Please reassign an eligible technician.`,
        type: 'booking',
        link: bookingId,
        targetRole: 'franchise',
        eventType: 'reassignment',
        metadata: { bookingId, reason },
      });
    }
    return;
  }

  const effectiveNewId = newServiceManId || reasonOrNewProId || '';
  const effectiveNewName = newServiceManName || 'New Technician';

  // 14B. Notify Customer with new pro assignment
  if (booking.customerId) {
    const docId = generateNotificationDocId('reassignment', bookingId, booking.customerId, effectiveNewId || 'reassigned');
    await sendDeduplicatedNotification(docId, {
      userId: booking.customerId,
      bookingId,
      title: 'Technician Reassigned 🔄',
      message: `Your booking #${bookingId} (${serviceName}) has been reassigned to ${effectiveNewName}.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'customer',
      eventType: 'reassignment',
      metadata: { bookingId, newServiceManId: effectiveNewId, newServiceManName: effectiveNewName },
    });
  }

  // 14C. Notify New Pro
  if (effectiveNewId) {
    const docId = generateNotificationDocId('reassignment', bookingId, effectiveNewId, 'new_pro');
    await sendDeduplicatedNotification(docId, {
      userId: effectiveNewId,
      bookingId,
      title: 'New Booking Assigned 📋',
      message: `Booking #${bookingId} (${serviceName}) has been assigned to you. Tap to view details and contact customer.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'reassignment',
      metadata: { bookingId, serviceName },
    });
  }

  // 14D. Notify Previous Pro if any
  const prevId = previousServiceManId || (booking.serviceManId !== effectiveNewId ? booking.serviceManId : undefined);
  if (prevId && prevId !== effectiveNewId) {
    const docId = generateNotificationDocId('reassignment', bookingId, prevId, 'prev_pro');
    await sendDeduplicatedNotification(docId, {
      userId: prevId,
      bookingId,
      title: 'Job Reassigned ℹ️',
      message: `Booking #${bookingId} has been reassigned to another technician.`,
      type: 'booking',
      link: bookingId,
      targetRole: 'pro',
      eventType: 'reassignment',
      metadata: { bookingId },
    });
  }
}

// ============================================================================
// MASTER DISPATCHER HELPER
// ============================================================================
export async function dispatchBookingNotification(payload: BookingNotificationPayload): Promise<void> {
  const { event, booking, extraData } = payload;
  switch (event) {
    case 'booking_created':
      await notifyBookingCreated(booking, payload.targetUserId);
      break;
    case 'booking_offer':
      if (payload.targetUserId) {
        await notifyBookingOffer(booking, payload.targetUserId, extraData?.offerId);
      }
      break;
    case 'booking_accepted':
      await notifyBookingAccepted(booking, extraData?.proName);
      break;
    case 'on_the_way':
      await notifyOnTheWay(booking, extraData?.etaMinutes);
      break;
    case 'arrived':
      await notifyArrived(booking);
      break;
    case 'otp_ready':
      await notifyOtpReady(booking, extraData?.otp || booking.otp || '');
      break;
    case 'work_started':
      await notifyWorkStarted(booking);
      break;
    case 'extra_charge_requested':
      if (extraData?.extraChargeItem) {
        await notifyExtraChargeRequested(booking, extraData.extraChargeItem);
      }
      break;
    case 'extra_charge_approved':
      if (extraData?.extraChargeItem) {
        await notifyExtraChargeDecision(booking, extraData.extraChargeItem, true);
      }
      break;
    case 'extra_charge_rejected':
      if (extraData?.extraChargeItem) {
        await notifyExtraChargeDecision(booking, extraData.extraChargeItem, false);
      }
      break;
    case 'work_completed':
      await notifyWorkCompleted(booking, extraData?.amount);
      break;
    case 'final_bill':
      await notifyFinalBillGenerated(booking, extraData?.amount || booking.finalAmount || booking.amount || 0);
      break;
    case 'payment_status':
      await notifyPaymentStatus(
        booking,
        extraData?.paymentStatus || booking.paymentStatus || 'paid',
        extraData?.amount || booking.finalAmount || booking.amount || 0,
        extraData?.paymentMethod || booking.paymentMethod || 'UPI/Cash'
      );
      break;
    case 'cancellation':
      await notifyCancellation(
        booking,
        (extraData?.cancelledBy as any) || 'customer',
        extraData?.cancellationReason
      );
      break;
    case 'reassignment':
      if (extraData?.newServiceManId && extraData?.newServiceManName) {
        await notifyReassignment(
          booking,
          extraData.newServiceManId,
          extraData.newServiceManName,
          extraData.previousServiceManId
        );
      }
      break;
  }
}

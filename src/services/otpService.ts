import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';

/**
 * Generates a cryptographically secure numeric OTP code of specified length (default 4 digits).
 */
export function generateSecureOtp(length: number = 4): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    const code = min + (array[0] % (max - min + 1));
    return code.toString();
  }
  // Fallback
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Ensures that a booking in or entering 'in_progress' has a secure OTP code assigned.
 * If none exists, generates one and persists it to Firestore.
 */
export async function ensureBookingHasOtp(booking: Booking): Promise<string> {
  if (booking.otp && booking.otp.trim().length >= 4) {
    return booking.otp;
  }

  const generatedOtp = generateSecureOtp(4);
  const nowIso = new Date().toISOString();

  const bookingRef = doc(db, 'bookings', booking.id);
  await updateDoc(bookingRef, {
    otp: generatedOtp,
    otpCreatedAt: nowIso,
    otpAttempts: 0,
    deliveryStatus: 'in_progress',
    isVerifiedDelivery: false,
    updatedAt: nowIso,
  });

  return generatedOtp;
}

export interface OtpVerificationResult {
  success: boolean;
  message: string;
  isLocked?: boolean;
}

/**
 * Verifies the provider's completion OTP entered by the customer.
 * On success, marks the booking as 'completed' and sets deliveryStatus to 'verified'.
 */
export async function verifyDeliveryOtp(
  booking: Booking,
  enteredCode: string,
  customerId?: string
): Promise<OtpVerificationResult> {
  const sanitizedEntered = enteredCode.trim();

  // If already verified
  if (booking.isVerifiedDelivery && booking.status === 'completed') {
    return {
      success: true,
      message: 'Service delivery has already been verified and completed.',
    };
  }

  // Ensure an expected OTP exists
  const expectedOtp = booking.otp?.trim();
  if (!expectedOtp) {
    return {
      success: false,
      message: 'Verification code has not been generated for this booking. Ask technician to refresh their job status.',
    };
  }

  const currentAttempts = booking.otpAttempts || 0;
  if (currentAttempts >= 5) {
    return {
      success: false,
      message: 'Maximum verification attempts exceeded (5/5). Please contact customer support or request a new code.',
      isLocked: true,
    };
  }

  // Check code match
  if (sanitizedEntered !== expectedOtp) {
    const newAttempts = currentAttempts + 1;
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, {
      otpAttempts: newAttempts,
      updatedAt: new Date().toISOString(),
    });

    const remaining = 5 - newAttempts;
    return {
      success: false,
      message: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining. Check code with technician.`
        : 'Incorrect code. Maximum verification attempts reached.',
      isLocked: remaining <= 0,
    };
  }

  // SUCCESS: Transition to verified delivery & completed status
  const nowIso = new Date().toISOString();
  const bookingRef = doc(db, 'bookings', booking.id);

  await updateDoc(bookingRef, {
    status: 'completed',
    trackingStatus: 'COMPLETED',
    deliveryStatus: 'verified',
    isVerifiedDelivery: true,
    verifiedAt: nowIso,
    completedAt: nowIso,
    paymentStatus: 'paid',
    verifiedBy: customerId || booking.customerId || 'customer',
    otpAttempts: 0,
    updatedAt: nowIso,
  });

  // Phase 8: Update existing serviceTracking status to COMPLETED
  try {
    await updateDoc(doc(db, 'serviceTracking', booking.id), {
      status: 'COMPLETED',
      lastUpdatedAt: nowIso,
    });
  } catch (trackErr) {
    console.warn('Could not update serviceTracking document to COMPLETED:', trackErr);
  }

  // Create immutable audit log entry
  try {
    await addDoc(collection(db, 'audit_logs'), {
      bookingId: booking.id,
      action: 'service_delivery_verified',
      details: `Customer successfully verified service delivery using provider OTP code. Booking #${booking.id} transitioned to 'completed' with 'verified' delivery state.`,
      verifiedBy: customerId || booking.customerId,
      timestamp: nowIso,
    });
  } catch (err) {
    console.warn('Failed to write audit log for verified delivery:', err);
  }

  // Create real-time in-app notifications
  try {
    // Notify technician
    if (booking.serviceManId) {
      await addDoc(collection(db, 'notifications'), {
        userId: booking.serviceManId,
        title: 'Service Delivery Verified! 🎯',
        message: `Customer has entered your completion code and verified delivery for booking #${booking.id} (${booking.serviceName}). Payment settled.`,
        type: 'booking',
        link: booking.id,
        read: false,
        createdAt: nowIso,
      });
    }

    // Notify customer
    if (booking.customerId) {
      await addDoc(collection(db, 'notifications'), {
        userId: booking.customerId,
        title: 'Service Verified & Completed! ✅',
        message: `Your service delivery for #${booking.id} (${booking.serviceName}) has been verified. You can now download your receipt and rate the technician.`,
        type: 'booking',
        link: booking.id,
        read: false,
        createdAt: nowIso,
      });
    }
  } catch (err) {
    console.warn('Failed to send verified delivery notification:', err);
  }

  return {
    success: true,
    message: 'Service delivery verified! Order is now marked as Completed.',
  };
}

/**
 * Regenerates the provider's OTP code if needed.
 */
export async function regenerateBookingOtp(booking: Booking): Promise<string> {
  const newOtp = generateSecureOtp(4);
  const nowIso = new Date().toISOString();

  const bookingRef = doc(db, 'bookings', booking.id);
  await updateDoc(bookingRef, {
    otp: newOtp,
    otpCreatedAt: nowIso,
    otpAttempts: 0,
    deliveryStatus: 'in_progress',
    isVerifiedDelivery: false,
    updatedAt: nowIso,
  });

  return newOtp;
}

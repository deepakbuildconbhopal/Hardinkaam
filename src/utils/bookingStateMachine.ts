import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, BookingStatus, UserRole } from '../types';
import { generateSecureOtp } from '../services/otpService';

export interface StateMachineStep {
  key: BookingStatus;
  label: string;
  shortLabel: string;
  stepNumber: number;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const LIFECYCLE_STEPS: StateMachineStep[] = [
  {
    key: 'pending',
    label: 'Pending Confirmation',
    shortLabel: 'Pending',
    stepNumber: 1,
    description: 'Booking requested by customer. Waiting for technician confirmation.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
  {
    key: 'accepted',
    label: 'Booking Accepted',
    shortLabel: 'Accepted',
    stepNumber: 2,
    description: 'Technician has accepted the booking and is assigned to the scheduled slot.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
  },
  {
    key: 'in_progress',
    label: 'Service In Progress',
    shortLabel: 'In Progress',
    stepNumber: 3,
    description: 'Technician has arrived on-site and is actively performing the service.',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
  {
    key: 'completed',
    label: 'Service Completed',
    shortLabel: 'Completed',
    stepNumber: 4,
    description: 'Work is finished. Payment settlement and customer review available.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
];

export const CANCELLED_STATE: StateMachineStep = {
  key: 'cancelled',
  label: 'Booking Cancelled',
  shortLabel: 'Cancelled',
  stepNumber: 0,
  description: 'Booking was cancelled before completion.',
  badgeBg: 'bg-rose-50',
  badgeText: 'text-rose-700',
  badgeBorder: 'border-rose-200',
};

/**
 * Normalizes 'on_the_way' to 'accepted' or 'in_progress' display in the primary 4-step state machine
 */
export function getStepIndex(status: BookingStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'assigned':
    case 'accepted':
      return 1;
    case 'on_the_way':
    case 'arriving':
    case 'arrived':
    case 'otp_pending':
      return 2;
    case 'in_progress':
    case 'work_started':
      return 3;
    case 'completed':
    case 'work_completed':
      return 4;
    case 'cancelled':
    case 'rejected':
      return -1;
    default:
      return 0;
  }
}

/**
 * Validates whether transition from `from` to `to` is allowed
 */
export function canTransitionStatus(
  from: BookingStatus,
  to: BookingStatus,
  role: UserRole
): boolean {
  if (from === to) return false;
  if (from === 'completed' || from === 'work_completed' || from === 'cancelled' || from === 'rejected') {
    return false; // Terminal states
  }

  // Admin has superuser transition permissions
  if (role === 'admin') return true;

  switch (from) {
    case 'pending':
    case 'assigned':
      if (to === 'accepted') return role === 'service_man' || role === 'business_partner';
      if (to === 'cancelled') return true; // Both customer and pro can cancel pending
      return false;

    case 'accepted':
      if (to === 'on_the_way') return role === 'service_man' || role === 'business_partner';
      if (to === 'in_progress' || to === 'work_started') return role === 'service_man';
      if (to === 'cancelled') return true;
      return false;

    case 'on_the_way':
    case 'arriving':
      if (to === 'arrived' || to === 'otp_pending') return role === 'service_man' || role === 'business_partner';
      if (to === 'in_progress' || to === 'work_started') return role === 'service_man';
      if (to === 'cancelled') return true;
      return false;

    case 'arrived':
    case 'otp_pending':
      if (to === 'in_progress' || to === 'work_started') return role === 'service_man' || role === 'business_partner';
      if (to === 'cancelled') return true;
      return false;

    case 'in_progress':
    case 'work_started':
      if (to === 'completed' || to === 'work_completed') return role === 'service_man' || role === 'business_partner' || role === 'customer';
      if (to === 'cancelled') return false; // In-progress cancellation requires admin permission (checked above)
      return false;

    default:
      return false;
  }
}

export interface TransitionPayload {
  reason?: string;
  cancelledBy?: string;
  notes?: string;
  proShare?: number;
  otpVerified?: boolean;
}

/**
 * Executes a state transition in Firestore with proper timestamps and logs
 */
export async function executeStatusTransition(
  booking: Booking,
  newStatus: BookingStatus,
  payload?: TransitionPayload
): Promise<void> {
  const nowIso = new Date().toISOString();
  const updateData: Partial<Booking> = {
    status: newStatus,
    updatedAt: nowIso,
  };

  if (newStatus === 'accepted') {
    updateData.acceptedAt = nowIso;
  } else if (newStatus === 'in_progress') {
    updateData.startedAt = nowIso;
    updateData.trackingStatus = 'WORK_STARTED';
    // Generate secure 4-digit OTP if not already generated
    if (!booking.otp || booking.otp.trim().length < 4) {
      updateData.otp = generateSecureOtp(4);
      updateData.otpCreatedAt = nowIso;
    }
    updateData.deliveryStatus = 'in_progress';
    updateData.isVerifiedDelivery = false;
    updateData.otpAttempts = 0;
  } else if (newStatus === 'completed') {
    updateData.completedAt = nowIso;
    updateData.workEndedAt = nowIso;
    updateData.workStatus = 'completed';
    updateData.trackingStatus = 'COMPLETED';
    // Preserve paymentStatus integrity - do not blindly mark as paid on bill generation
    if (booking.paymentStatus === 'paid') {
      updateData.paymentStatus = 'paid';
    } else if (booking.paymentStatus === 'cod') {
      updateData.paymentStatus = 'cod';
    } else {
      updateData.paymentStatus = booking.paymentStatus || 'unpaid';
    }
    updateData.deliveryStatus = 'verified';
    updateData.isVerifiedDelivery = true;
    updateData.verifiedAt = nowIso;
  } else if (newStatus === 'cancelled') {
    updateData.cancelledAt = nowIso;
    updateData.cancellationReason = payload?.reason || 'Cancelled by user';
    updateData.cancelledBy = payload?.cancelledBy || 'system';
  }

  const bookingRef = doc(db, 'bookings', booking.id);
  await updateDoc(bookingRef, updateData);

  // Phase 8: Update existing serviceTracking status
  if (newStatus === 'in_progress' || newStatus === 'completed') {
    try {
      const trackingStatus = newStatus === 'in_progress' ? 'WORK_STARTED' : 'COMPLETED';
      await updateDoc(doc(db, 'serviceTracking', booking.id), {
        status: trackingStatus,
        lastUpdatedAt: nowIso,
      });
    } catch (trackErr) {
      console.warn('Could not update serviceTracking document:', trackErr);
    }
  }

  // Add audit log
  try {
    await addDoc(collection(db, 'audit_logs'), {
      bookingId: booking.id,
      action: `status_change_to_${newStatus}`,
      details: `Booking #${booking.id} transitioned from ${booking.status} to ${newStatus}. ${
        payload?.reason ? `Reason: ${payload.reason}` : ''
      }`,
      timestamp: nowIso,
    });
  } catch (err) {
    console.warn('Audit log write note:', err);
  }
}

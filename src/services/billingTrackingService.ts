import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ExtraChargeItem, BillSnapshot, Booking } from '../types';
import { apiPost } from '../utils/apiHandler';
import {
  notifyExtraChargeRequested,
  notifyExtraChargeDecision,
  notifyWorkCompleted,
  notifyFinalBillGenerated,
} from './bookingNotificationIntegrationService';

export interface ProposeExtraChargeParams {
  bookingId: string;
  serviceManId: string;
  serviceManName?: string;
  type: 'material' | 'service' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface RespondExtraChargeParams {
  bookingId: string;
  customerId: string;
  chargeId: string;
  decision: 'approve' | 'reject';
  rejectionReason?: string;
}

export interface CompleteWorkParams {
  bookingId: string;
  serviceManId: string;
  notes?: string;
}

export interface CurrentBillBreakdown {
  baseAmount: number;
  approvedExtraChargesAmount?: number;
  extraServicesAmount: number;
  materialsAmount: number;
  applicableCharges?: number;
  discount?: number;
  pendingTotal: number;
  currentEstimatedFinal: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount?: number;
}

/**
 * Propose an additional service or material charge.
 * Calls authoritative server endpoint /api/bookings/propose-extra-charge with authenticated Firebase Token.
 */
export async function proposeExtraChargeServer(
  params: ProposeExtraChargeParams
): Promise<{ success: boolean; charge?: ExtraChargeItem; error?: string }> {
  try {
    const res = await apiPost('/api/bookings/propose-extra-charge', params);

    if (res.ok && res.data?.success) {
      // Trigger customer notification
      try {
        const snap = await getDoc(doc(db, 'bookings', params.bookingId));
        if (snap.exists() && res.data.charge) {
          notifyExtraChargeRequested(snap.data() as Booking, res.data.charge).catch(() => {});
        }
      } catch (_) {}

      return { success: true, charge: res.data.charge };
    }
    return { success: false, error: res.error || res.data?.error || 'Failed to propose extra charge' };
  } catch (err: any) {
    console.error('Error calling propose extra charge API:', err);
    return { success: false, error: err.message || 'Error proposing extra charge' };
  }
}

/**
 * Customer approves or rejects a proposed extra charge.
 * Calls authoritative server endpoint /api/bookings/respond-extra-charge.
 */
export async function respondExtraChargeServer(
  params: RespondExtraChargeParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiPost('/api/bookings/respond-extra-charge', params);

    if (res.ok && res.data?.success) {
      try {
        const snap = await getDoc(doc(db, 'bookings', params.bookingId));
        if (snap.exists()) {
          notifyExtraChargeDecision(snap.data() as Booking, { id: params.chargeId, description: '', total: 0 } as any, params.decision === 'approve').catch(() => {});
        }
      } catch (_) {}

      return { success: true };
    }
    return { success: false, error: res.error || res.data?.error || 'Failed to submit response' };
  } catch (err: any) {
    console.error('Error calling respond extra charge API:', err);
    return { success: false, error: err.message || 'Error responding to extra charge' };
  }
}

/**
 * Service Professional completes work:
 * Server stops timer, calculates transparent final bill snapshot, and updates booking.
 */
export async function completeWorkServer(
  params: CompleteWorkParams
): Promise<{ success: boolean; finalBill?: BillSnapshot; finalAmount?: number; error?: string }> {
  try {
    const res = await apiPost('/api/bookings/complete-work', params);

    if (res.ok && res.data?.success) {
      try {
        const snap = await getDoc(doc(db, 'bookings', params.bookingId));
        if (snap.exists()) {
          const bData = snap.data() as Booking;
          const finalAmt = res.data.finalAmount || res.data.finalBill?.finalPayableAmount || bData.finalAmount || bData.amount;
          notifyWorkCompleted(bData, finalAmt).catch(() => {});
          notifyFinalBillGenerated(bData, finalAmt).catch(() => {});
        }
      } catch (_) {}

      return {
        success: true,
        finalBill: res.data.finalBill,
        finalAmount: res.data.finalAmount,
      };
    }
    return { success: false, error: res.error || res.data?.error || 'Failed to complete work' };
  } catch (err: any) {
    console.error('Network failure calling complete-work server API:', err);
    return {
      success: false,
      error: err.message || 'Network error while generating final bill. Please retry.',
    };
  }
}

/**
 * Calculate current bill breakdown in real-time
 */
export async function calculateCurrentBillServer(
  bookingId: string
): Promise<{ success: boolean; breakdown?: CurrentBillBreakdown; error?: string }> {
  try {
    const res = await apiPost('/api/bookings/calculate-current-bill', { bookingId });
    if (res.ok && res.data?.success) {
      return { success: true, breakdown: res.data.breakdown };
    }
    return { success: false, error: res.error || res.data?.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

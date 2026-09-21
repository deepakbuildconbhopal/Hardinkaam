import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { ExtraChargeItem, BillSnapshot } from '../types';

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
  extraServicesAmount: number;
  materialsAmount: number;
  pendingTotal: number;
  currentEstimatedFinal: number;
  approvedCount: number;
  pendingCount: number;
}

/**
 * Propose an additional service or material charge.
 * Calls server endpoint /api/bookings/propose-extra-charge with fallback.
 */
export async function proposeExtraChargeServer(
  params: ProposeExtraChargeParams
): Promise<{ success: boolean; charge?: ExtraChargeItem; error?: string }> {
  try {
    const res = await fetch('/api/bookings/propose-extra-charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, charge: data.charge };
    }
    return { success: false, error: data.error || 'Failed to propose extra charge' };
  } catch (err: any) {
    console.warn('Network issue calling server propose endpoint, attempting client fallback:', err);
    // Fallback: direct firestore append of pending charge
    try {
      const bookingRef = doc(db, 'bookings', params.bookingId);
      const snap = await getDoc(bookingRef);
      if (!snap.exists()) return { success: false, error: 'Booking not found' };

      const bData = snap.data();
      const numQty = Math.max(1, Number(params.quantity) || 1);
      const numPrice = Math.max(0, Number(params.unitPrice) || 0);
      const total = numQty * numPrice;
      const nowIso = new Date().toISOString();

      const newCharge: ExtraChargeItem = {
        id: `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: params.type,
        description: params.description.trim(),
        quantity: numQty,
        unitPrice: numPrice,
        total,
        addedBy: params.serviceManId,
        addedByName: params.serviceManName || bData.serviceManName || 'Service Professional',
        addedAt: nowIso,
        status: 'pending',
      };

      const existing = Array.isArray(bData.extraCharges) ? bData.extraCharges : [];
      await updateDoc(bookingRef, {
        extraCharges: [...existing, newCharge],
        updatedAt: nowIso,
      });

      return { success: true, charge: newCharge };
    } catch (fallbackErr: any) {
      return { success: false, error: fallbackErr.message || 'Error proposing charge' };
    }
  }
}

/**
 * Customer approves or rejects a proposed extra charge.
 * Calls server endpoint /api/bookings/respond-extra-charge with fallback.
 */
export async function respondExtraChargeServer(
  params: RespondExtraChargeParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/bookings/respond-extra-charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to respond to charge' };
  } catch (err: any) {
    console.warn('Network issue calling server respond endpoint, attempting client fallback:', err);
    try {
      const bookingRef = doc(db, 'bookings', params.bookingId);
      const snap = await getDoc(bookingRef);
      if (!snap.exists()) return { success: false, error: 'Booking not found' };

      const bData = snap.data();
      const existing: ExtraChargeItem[] = Array.isArray(bData.extraCharges) ? bData.extraCharges : [];
      const idx = existing.findIndex((c) => c.id === params.chargeId);
      if (idx === -1) return { success: false, error: 'Charge not found' };

      const isApproved = params.decision === 'approve';
      const nowIso = new Date().toISOString();

      existing[idx] = {
        ...existing[idx],
        status: isApproved ? 'approved' : 'rejected',
        approvedBy: isApproved ? params.customerId : undefined,
        approvedAt: isApproved ? nowIso : undefined,
        rejectionReason: !isApproved ? (params.rejectionReason || 'Declined by customer') : undefined,
      };

      await updateDoc(bookingRef, {
        extraCharges: existing,
        updatedAt: nowIso,
      });

      return { success: true };
    } catch (fallbackErr: any) {
      return { success: false, error: fallbackErr.message || 'Error updating charge response' };
    }
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
    const res = await fetch('/api/bookings/complete-work', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        finalBill: data.finalBill,
        finalAmount: data.finalAmount,
      };
    }
    return { success: false, error: data.error || 'Failed to complete work' };
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
    const res = await fetch('/api/bookings/calculate-current-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, breakdown: data.breakdown };
    }
    return { success: false, error: data.error };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

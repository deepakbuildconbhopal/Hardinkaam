import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { CommissionSettings, LedgerEntry, LedgerOwnerRole } from '../types';

/**
 * Fetches ledger entries for a specific participant (Serviceman, Partner, Franchise, or Admin)
 */
export async function getLedgerEntriesForUser(
  userId: string,
  role?: LedgerOwnerRole,
  maxResults: number = 50
): Promise<LedgerEntry[]> {
  try {
    const ledgersRef = collection(db, 'ledgers');
    let q = query(
      ledgersRef,
      where('ledgerOwnerId', '==', userId)
    );

    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as LedgerEntry);

    // Sort client-side by date descending
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, maxResults);
  } catch (err: any) {
    console.warn('[CommissionLedgerService] Error fetching user ledgers:', err?.message);
    // Fallback to server API if direct Firestore permission boundary triggers
    try {
      const res = await fetch(`/api/ledgers?ownerId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.ledgers || [];
      }
    } catch (_) {}
    return [];
  }
}

/**
 * Fetches all platform ledgers for Admin audit and reconciliation
 */
export async function getAllPlatformLedgers(
  filters?: { role?: LedgerOwnerRole; bookingId?: string },
  maxResults: number = 100
): Promise<LedgerEntry[]> {
  try {
    const ledgersRef = collection(db, 'ledgers');
    let q = query(ledgersRef);

    if (filters?.role) {
      q = query(ledgersRef, where('ledgerOwnerRole', '==', filters.role));
    } else if (filters?.bookingId) {
      q = query(ledgersRef, where('bookingId', '==', filters.bookingId));
    }

    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as LedgerEntry);
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results.slice(0, maxResults);
  } catch (err: any) {
    console.warn('[CommissionLedgerService] Error fetching all ledgers:', err?.message);
    try {
      const roleParam = filters?.role ? `&role=${filters.role}` : '';
      const bkParam = filters?.bookingId ? `&bookingId=${filters.bookingId}` : '';
      const res = await fetch(`/api/ledgers?${roleParam}${bkParam}`);
      if (res.ok) {
        const data = await res.json();
        return data.ledgers || [];
      }
    } catch (_) {}
    return [];
  }
}

/**
 * Reads current Admin Commission Configuration from backend
 */
export async function fetchCommissionSettings(): Promise<CommissionSettings> {
  try {
    const res = await fetch('/api/admin/commission-settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) return data.settings;
    }
  } catch (err: any) {
    console.warn('[CommissionLedgerService] Error fetching commission settings:', err?.message);
  }

  return {
    companyRatePercent: 15,
    franchiseRatePercent: 15, // Default 15% PAYABLE TO HARDINKAAM (not Franchise income)
    partnerRatePercent: 5,
    taxRatePercent: 5,
    minServicemanRatePercent: 65,
    updatedAt: new Date().toISOString(),
    updatedBy: 'fallback',
  };
}

export interface FranchiseCommissionSummary {
  business: number;
  commissionRate: number; // default 15% payable to HARDINKAAM
  commissionDue: number; // e.g. ₹1,000 applicable business -> 15% = ₹150 payable to HARDINKAAM
  paid: number;
  pending: number;
  overdue: number;
  history: LedgerEntry[];
}

/**
 * Fetches dedicated Franchise Commission summary and transaction history.
 * NON-NEGOTIABLE RULE: Franchise does NOT receive commission. Franchise owes commission to HARDINKAAM.
 * Preserves historical commission rates for past transactions.
 */
export async function getFranchiseCommissionSummary(
  franchiseId: string,
  districtId?: string
): Promise<FranchiseCommissionSummary> {
  try {
    const settings = await fetchCommissionSettings();
    const activeRate = typeof settings.franchiseRatePercent === 'number' ? settings.franchiseRatePercent : 15;

    // Fetch ledgers specifically for this franchise
    const ledgersRef = collection(db, 'ledgers');
    let q = query(ledgersRef, where('ledgerOwnerId', '==', franchiseId));
    let snap = await getDocs(q);

    // If empty and districtId provided, try district alias
    if (snap.empty && districtId) {
      const aliasQ = query(ledgersRef, where('ledgerOwnerId', '==', `franchise_${districtId}`));
      snap = await getDocs(aliasQ);
    }

    const history = snap.docs.map((d) => d.data() as LedgerEntry);
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let totalBusiness = 0;
    let totalDue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    for (const entry of history) {
      if (entry.commissionType === 'franchise_commission' || entry.isPayableToHardinkaam) {
        totalBusiness += entry.grossBookingAmount || 0;
        totalDue += entry.amount || 0;
        if (entry.collectionStatus === 'paid' || entry.status === 'cleared') {
          totalPaid += entry.amount || 0;
        } else if (entry.collectionStatus === 'overdue') {
          totalOverdue += entry.amount || 0;
          totalPending += entry.amount || 0;
        } else {
          totalPending += entry.amount || 0;
        }
      }
    }

    return {
      business: totalBusiness,
      commissionRate: activeRate,
      commissionDue: totalDue,
      paid: totalPaid,
      pending: totalPending,
      overdue: totalOverdue,
      history,
    };
  } catch (err: any) {
    console.warn('[CommissionLedgerService] Error getting franchise commission summary:', err?.message);
    return {
      business: 0,
      commissionRate: 15,
      commissionDue: 0,
      paid: 0,
      pending: 0,
      overdue: 0,
      history: [],
    };
  }
}

/**
 * Updates Admin Commission Configuration via server API
 */
export async function saveCommissionSettings(settings: Partial<CommissionSettings>): Promise<CommissionSettings> {
  const res = await fetch('/api/admin/commission-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!res.ok) {
    throw new Error('Failed to update commission settings on server.');
  }

  const data = await res.json();
  return data.settings;
}

/**
 * Triggers a payment refund and reverses related commission ledgers
 */
export async function triggerPaymentRefund(
  paymentId: string,
  amount?: number,
  reason?: string
): Promise<{ success: boolean; message: string; reversalLedgerIds: string[] }> {
  const res = await fetch('/api/payments/refund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId, amount, reason }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Refund processing failed on server.');
  }

  return await res.json();
}

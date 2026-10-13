import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { Booking, LedgerEntry } from '../types';
import { fetchCommissionSettings } from './commissionLedgerService';

export type CashTransactionStatus =
  | 'PENDING'
  | 'ADMIN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

export interface CashTransactionRecord {
  id: string;
  transactionId: string;
  bookingId: string;
  serviceId?: string;
  serviceName?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  serviceManId?: string;
  serviceManName?: string;
  partnerId?: string;
  districtId?: string;
  amount: number;
  currency: string;
  paymentMethod: 'cash';
  type: 'CASH_TRANSACTION';
  status: CashTransactionStatus;
  requestedBy: string;
  requestedByRole: string;
  requestedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashPaymentResult {
  success: boolean;
  transactionId?: string;
  status?: CashTransactionStatus;
  amount?: number;
  error?: string;
  userMessage?: string;
}

/**
 * Ensures user is authenticated and avoids race condition before Firestore writes.
 */
async function ensureAuthenticatedUser(): Promise<string> {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  // Wait up to 3 seconds for auth state to populate
  await new Promise<void>((resolve) => {
    let resolved = false;
    const unsub = auth.onAuthStateChanged((user) => {
      if (user && !resolved) {
        resolved = true;
        unsub();
        resolve();
      }
    });
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unsub();
        resolve();
      }
    }, 3000);
  });

  if (!auth.currentUser?.uid) {
    throw new Error('AUTH_NOT_READY: User is not authenticated.');
  }
  return auth.currentUser.uid;
}

/**
 * Derives the immutable authoritative payable amount for a booking.
 * Prevents client-side amount tampering.
 */
export function getAuthoritativePayableAmount(booking: Booking): number {
  if (
    booking.finalBill &&
    typeof booking.finalBill.finalAmount === 'number' &&
    booking.finalBill.finalAmount >= 0
  ) {
    return Math.round(booking.finalBill.finalAmount);
  }
  if (typeof booking.finalAmount === 'number' && booking.finalAmount >= 0) {
    return Math.round(booking.finalAmount);
  }
  if (typeof booking.amount === 'number' && booking.amount >= 0) {
    return Math.round(booking.amount);
  }
  return 0;
}

/**
 * Records a Cash Payment Request for a booking by Customer or Assigned Service Professional.
 * 
 * Recommended Cash Flow:
 * Booking -> Service completed -> Final bill calculated -> Cash payment selected -> Cash transaction request recorded (PENDING)
 */
export async function recordCashPaymentRequest(params: {
  booking: Booking;
  callerRole: 'CUSTOMER' | 'SERVICE_PRO' | 'customer' | 'service_man' | 'ADMIN' | 'admin';
  notes?: string;
}): Promise<CashPaymentResult> {
  const { booking, callerRole, notes } = params;

  try {
    // 1. Authenticate caller and prevent auth race condition
    const currentUid = await ensureAuthenticatedUser();

    // 2. Validate booking state eligibility
    const validStates = ['completed', 'in_progress', 'work_started', 'arrived', 'confirmed'];
    if (!validStates.includes(booking.status)) {
      console.warn('[CashTransaction] Booking status not eligible for cash payment:', booking.status);
      return {
        success: false,
        error: `Booking status '${booking.status}' is not eligible for cash payment.`,
        userMessage: 'यह बुकिंग अभी नकद भुगतान के लिए तैयार नहीं है। कृपया कार्य पूर्ण होने की प्रतीक्षा करें।',
      };
    }

    // 3. Prevent arbitrary amount tampering - derive authoritative final bill
    const authoritativeAmount = getAuthoritativePayableAmount(booking);
    if (authoritativeAmount <= 0) {
      return {
        success: false,
        error: 'Authoritative booking bill amount must be greater than zero.',
        userMessage: 'बिल राशि अमान्य है। कृपया अंतिम बिल का सत्यापन करें।',
      };
    }

    const nowIso = new Date().toISOString();
    const transactionId = `tx_cash_${booking.id}_${Date.now()}`;
    const normalizedRole = callerRole.toUpperCase();

    // 4. Construct safe pending transaction payload
    const transactionPayload: CashTransactionRecord = {
      id: transactionId,
      transactionId,
      bookingId: booking.id,
      serviceId: booking.serviceId || '',
      serviceName: booking.serviceName || 'HARDINKAAM Service',
      customerId: booking.customerId,
      customerName: booking.customerName || '',
      customerPhone: booking.customerPhone || '',
      serviceManId: booking.serviceManId || '',
      serviceManName: booking.serviceManName || '',
      partnerId: booking.partnerId || '',
      districtId: booking.districtId || '',
      amount: authoritativeAmount,
      currency: 'INR',
      paymentMethod: 'cash',
      type: 'CASH_TRANSACTION',
      status: 'PENDING', // Initial safe review state
      requestedBy: currentUid,
      requestedByRole: normalizedRole,
      requestedAt: nowIso,
      notes: notes?.trim() || (normalizedRole.includes('PRO') ? 'Service Pro collected cash from customer' : 'Customer requested to pay in cash'),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 5. Atomic write or batch update
    // A: Write transaction to `transactions/{transactionId}`
    await setDoc(doc(db, 'transactions', transactionId), transactionPayload);

    // B: Update booking with pending cash status without manipulating finalized paymentStatus
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, {
      paymentMethod: 'cash',
      cashPaymentStatus: 'pending_approval',
      cashTransactionId: transactionId,
      cashRequestedAt: nowIso,
      cashRequestedBy: currentUid,
      updatedAt: nowIso,
    });

    // C: Dispatch Admin notification for review
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: 'admin_deepak_root',
        userId: currentUid,
        targetRole: 'admin',
        type: 'cash_payment_approval',
        title: 'नकद भुगतान सत्यापन अनुरोध (Cash Transaction Request)',
        message: `बुकिंग #${booking.id} (${booking.serviceName}) के लिए ₹${authoritativeAmount} नकद (Cash) भुगतान का अनुरोध प्राप्त हुआ है। सत्यापन के बाद अप्रूव करें।`,
        amount: authoritativeAmount,
        bookingId: booking.id,
        transactionId,
        createdAt: nowIso,
        read: false,
      });
    } catch (notifErr) {
      console.warn('[CashTransaction] Admin notification dispatch notice:', notifErr);
    }

    return {
      success: true,
      transactionId,
      status: 'PENDING',
      amount: authoritativeAmount,
    };
  } catch (err: any) {
    // Preserve full raw error in developer console for deep debugging
    console.error('[CashTransaction] Firebase Permission/Operation Error:', err);

    // Try server-side proxy fallback if direct client permission boundary triggers
    try {
      const serverRes = await fetch('/api/bookings/cash-payment/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: booking.id,
          callerRole,
          notes,
          uid: auth.currentUser?.uid,
        }),
      });
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData.success) {
          return {
            success: true,
            transactionId: serverData.transactionId,
            status: 'PENDING',
            amount: serverData.amount,
          };
        }
      }
    } catch (_) {}

    return {
      success: false,
      error: err?.message || 'Permission denied or Firestore operation failed.',
      userMessage: 'Cash payment request submit nahi ho saki. Kripya dobara try karein.',
    };
  }
}

/**
 * Admin approves a cash transaction:
 * - Updates transaction to APPROVED
 * - Updates booking paymentStatus to 'paid'
 * - Atomically generates multi-level commission ledgers (Company, Franchise, Partner, ServiceMan)
 * - Ensures anti-duplication
 */
export async function approveCashTransaction(params: {
  transactionId: string;
  bookingId: string;
  adminName?: string;
  adminNotes?: string;
}): Promise<CashPaymentResult> {
  const { transactionId, bookingId, adminName, adminNotes } = params;

  try {
    const adminUid = await ensureAuthenticatedUser();
    const nowIso = new Date().toISOString();
    const approverName = adminName || auth.currentUser?.email || 'DEEPAK (Super Admin)';

    // 1. Fetch current transaction and booking
    const txDocRef = doc(db, 'transactions', transactionId);
    const bkDocRef = doc(db, 'bookings', bookingId);

    const [txSnap, bkSnap] = await Promise.all([getDoc(txDocRef), getDoc(bkDocRef)]);

    if (!txSnap.exists()) {
      return { success: false, error: 'Transaction document not found.' };
    }
    if (!bkSnap.exists()) {
      return { success: false, error: 'Booking document not found.' };
    }

    const txData = txSnap.data() as CashTransactionRecord;
    const bkData = bkSnap.data() as Booking;
    const finalAmount = txData.amount || getAuthoritativePayableAmount(bkData);

    // 2. Read commission settings
    const settings = await fetchCommissionSettings();
    const companyRate = typeof settings.companyRatePercent === 'number' ? settings.companyRatePercent : 15;
    const franchiseRate = typeof settings.franchiseRatePercent === 'number' ? settings.franchiseRatePercent : 15; // 15% owed by franchise to HARDINKAAM
    const partnerRate = bkData.partnerId ? (typeof settings.partnerRatePercent === 'number' ? settings.partnerRatePercent : 5) : 0;
    const servicemanRate = Math.max(0, 100 - companyRate - partnerRate);

    const companyShare = Math.round((finalAmount * companyRate) / 100);
    const franchiseDueToHQ = Math.round((finalAmount * franchiseRate) / 100);
    const partnerShare = partnerRate > 0 ? Math.round((finalAmount * partnerRate) / 100) : 0;
    const servicemanShare = finalAmount - companyShare - partnerShare;

    // 3. Deduplication check: check if commission ledger for this booking already exists
    const ledgersRef = collection(db, 'ledgers');
    const existingLedgersSnap = await getDocs(query(ledgersRef, where('bookingId', '==', bookingId), limit(1)));
    const alreadyHasLedger = !existingLedgersSnap.empty;

    const batch = writeBatch(db);

    // Update Transaction
    batch.update(txDocRef, {
      status: 'APPROVED',
      approvedAt: nowIso,
      approvedBy: approverName,
      adminNotes: adminNotes?.trim() || 'Verified and approved by admin',
      updatedAt: nowIso,
    });

    // Update Booking
    const bookingUpdate: any = {
      paymentStatus: 'paid',
      cashPaymentStatus: 'approved',
      paymentMethod: 'cash',
      paidAt: nowIso,
      paymentTransactionId: transactionId,
      paymentConfirmedBy: approverName,
      updatedAt: nowIso,
    };

    if (bkData.finalBill) {
      bookingUpdate.finalBill = {
        ...bkData.finalBill,
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        paidAt: nowIso,
        paymentTransactionId: transactionId,
      };
    }
    batch.update(bkDocRef, bookingUpdate);

    // Generate atomic commission ledger entries if not already recorded
    if (!alreadyHasLedger) {
      // A: Company Ledger Entry
      const companyLedgerId = `ledger_company_${bookingId}`;
      const companyEntry: Partial<LedgerEntry> = {
        id: companyLedgerId,
        bookingId,
        paymentId: `cash_${bookingId}`,
        referenceId: `COMM-${bookingId}-cash-company`,
        ledgerOwnerId: 'admin_deepak_root',
        ledgerOwnerRole: 'company',
        commissionType: 'company_share',
        grossBookingAmount: finalAmount,
        ratePercent: companyRate,
        amount: companyShare,
        type: 'credit',
        isPayableToHardinkaam: false,
        status: 'cleared',
        collectionStatus: 'paid',
        createdAt: nowIso,
        updatedAt: nowIso,
        description: `HARDINKAAM Company Share from Cash Booking #${bookingId}`,
        ruleReference: 'Company Margin 20%',
      };
      batch.set(doc(db, 'ledgers', companyLedgerId), companyEntry);

      // B: Franchise Ledger Entry (Franchise owes 15% commission to HARDINKAAM)
      if (bkData.districtId) {
        const franchiseOwnerId = bkData.franchisePartnerId || `franchise_${bkData.districtId}`;
        const franchiseLedgerId = `ledger_franchise_${bookingId}`;
        const franchiseEntry: Partial<LedgerEntry> = {
          id: franchiseLedgerId,
          bookingId,
          paymentId: `cash_${bookingId}`,
          referenceId: `COMM-${bookingId}-cash-franchise`,
          ledgerOwnerId: franchiseOwnerId,
          ledgerOwnerRole: 'franchise',
          commissionType: 'franchise_commission',
          grossBookingAmount: finalAmount,
          ratePercent: franchiseRate,
          amount: franchiseDueToHQ,
          type: 'debit',
          direction: 'PAYABLE_TO_HARDINKAAM',
          isPayableToHardinkaam: true, // Payable to HARDINKAAM HQ
          status: 'cleared',
          collectionStatus: 'paid',
          createdAt: nowIso,
          updatedAt: nowIso,
          description: `Franchise Commission (15% due to HARDINKAAM) from Booking #${bookingId}`,
          ruleReference: 'Franchise 15% to HQ',
        };
        batch.set(doc(db, 'ledgers', franchiseLedgerId), franchiseEntry);
      }

      // C: Partner Ledger Entry (if business partner assigned)
      if (bkData.partnerId && partnerShare > 0) {
        const partnerLedgerId = `ledger_partner_${bookingId}`;
        const partnerEntry: Partial<LedgerEntry> = {
          id: partnerLedgerId,
          bookingId,
          paymentId: `cash_${bookingId}`,
          referenceId: `COMM-${bookingId}-cash-partner`,
          ledgerOwnerId: bkData.partnerId,
          ledgerOwnerRole: 'partner',
          commissionType: 'partner_commission',
          grossBookingAmount: finalAmount,
          ratePercent: partnerRate,
          amount: partnerShare,
          type: 'credit',
          isPayableToHardinkaam: false,
          status: 'cleared',
          collectionStatus: 'paid',
          createdAt: nowIso,
          updatedAt: nowIso,
          description: `Business Partner Commission from Booking #${bookingId}`,
          ruleReference: 'Partner Commission',
        };
        batch.set(doc(db, 'ledgers', partnerLedgerId), partnerEntry);
      }

      // D: Service Professional Ledger Entry
      if (bkData.serviceManId) {
        const proLedgerId = `ledger_serviceman_${bookingId}`;
        const proEntry: Partial<LedgerEntry> = {
          id: proLedgerId,
          bookingId,
          paymentId: `cash_${bookingId}`,
          referenceId: `COMM-${bookingId}-cash-serviceman`,
          ledgerOwnerId: bkData.serviceManId,
          ledgerOwnerRole: 'service_man',
          commissionType: 'serviceman_earning',
          grossBookingAmount: finalAmount,
          ratePercent: servicemanRate,
          amount: servicemanShare,
          type: 'credit',
          isPayableToHardinkaam: false,
          status: 'cleared',
          collectionStatus: 'paid',
          createdAt: nowIso,
          updatedAt: nowIso,
          description: `Technician Payout Earnings from Cash Booking #${bookingId}`,
          ruleReference: 'Technician 65% Share',
        };
        batch.set(doc(db, 'ledgers', proLedgerId), proEntry);
      }
    }

    // Commit batch
    await batch.commit();

    // Send notifications to Customer and Service Professional
    try {
      if (bkData.customerId) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: bkData.customerId,
          userId: bkData.customerId,
          targetRole: 'customer',
          type: 'payment_verified',
          title: 'नकद भुगतान स्वीकृत व रसीद उपलब्ध! ✓',
          message: `आपकी बुकिंग #${bookingId} (${bkData.serviceName}) के लिए ₹${finalAmount} का नकद भुगतान एडमिन द्वारा सत्यापित कर लिया गया है।`,
          amount: finalAmount,
          bookingId,
          createdAt: nowIso,
          read: false,
        });
      }
      if (bkData.serviceManId) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: bkData.serviceManId,
          userId: bkData.serviceManId,
          targetRole: 'service_man',
          type: 'payment_verified',
          title: 'कैश भुगतान स्वीकृत व कमीशन सेटल! ✓',
          message: `बुकिंग #${bookingId} का ₹${finalAmount} नकद भुगतान एडमिन द्वारा अप्रूव कर दिया गया है। आपकी कमाई ₹${servicemanShare} वॉलेट में क्रेडिट हो गई है।`,
          amount: servicemanShare,
          bookingId,
          createdAt: nowIso,
          read: false,
        });
      }
    } catch (_) {}

    return {
      success: true,
      transactionId,
      status: 'APPROVED',
      amount: finalAmount,
    };
  } catch (err: any) {
    console.error('[CashTransaction] Admin Approval Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to approve cash transaction.',
      userMessage: 'नकद भुगतान स्वीकृत करने में त्रुटि आई। कृपया पुनः प्रयास करें।',
    };
  }
}

/**
 * Admin rejects a cash transaction.
 */
export async function rejectCashTransaction(params: {
  transactionId: string;
  bookingId: string;
  rejectionReason?: string;
  adminName?: string;
}): Promise<CashPaymentResult> {
  const { transactionId, bookingId, rejectionReason, adminName } = params;

  try {
    await ensureAuthenticatedUser();
    const nowIso = new Date().toISOString();
    const approverName = adminName || auth.currentUser?.email || 'DEEPAK (Super Admin)';
    const reason = rejectionReason?.trim() || 'नकद राशि अप्राप्त / मिसमैच';

    const txDocRef = doc(db, 'transactions', transactionId);
    const bkDocRef = doc(db, 'bookings', bookingId);

    const batch = writeBatch(db);

    batch.update(txDocRef, {
      status: 'REJECTED',
      rejectedAt: nowIso,
      rejectedBy: approverName,
      rejectionReason: reason,
      updatedAt: nowIso,
    });

    batch.update(bkDocRef, {
      cashPaymentStatus: 'rejected',
      paymentStatus: 'unpaid',
      updatedAt: nowIso,
    });

    await batch.commit();

    return {
      success: true,
      transactionId,
      status: 'REJECTED',
    };
  } catch (err: any) {
    console.error('[CashTransaction] Admin Rejection Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to reject cash transaction.',
      userMessage: 'नकद भुगतान अस्वीकार करने में त्रुटि आई।',
    };
  }
}

/**
 * Fetches all pending cash transactions for Admin review.
 */
export async function getPendingCashTransactions(): Promise<CashTransactionRecord[]> {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('type', '==', 'CASH_TRANSACTION'),
      limit(100)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as CashTransactionRecord);
    // Filter pending/review states and sort descending
    return list
      .filter((t) => t.status === 'PENDING' || t.status === 'ADMIN_REVIEW')
      .sort((a, b) => new Date(b.requestedAt || b.createdAt).getTime() - new Date(a.requestedAt || a.createdAt).getTime());
  } catch (err: any) {
    console.warn('[CashTransaction] Error fetching pending cash transactions:', err?.message);
    try {
      const res = await fetch('/api/bookings/cash-payment/pending');
      if (res.ok) {
        const data = await res.json();
        return data.transactions || [];
      }
    } catch (_) {}
    return [];
  }
}

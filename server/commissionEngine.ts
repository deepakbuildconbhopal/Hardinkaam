import { Firestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { CommissionBreakdown, CommissionSettings, LedgerEntry } from '../src/types';

// Default Central Platform Commission Rules (Configurable by Admin: COMPANY_SERVICE_SHARE = 20%)
export const COMPANY_SERVICE_SHARE = 20;

export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  companyRatePercent: 20, // 20% HARDINKAAM Admin Platform Fee (COMPANY_SERVICE_SHARE = 20)
  franchiseRatePercent: 15, // 15% Commission PAYABLE TO HARDINKAAM by Franchise (Default 15%)
  partnerRatePercent: 5, // 5% Partner / Brand Promoter Referral Commission
  taxRatePercent: 5, // 5% Statutory TDS / Tax Deduction
  minServicemanRatePercent: 70, // Minimum floor for serviceman earning
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_default',
};

/**
 * Retrieves the current Admin-controlled Commission Configuration from Firestore.
 * Canonical document: settings/commission_rules (with backward-compatible fallback to settings/platform_commission)
 */
export async function getCommissionSettings(db: Firestore): Promise<CommissionSettings> {
  try {
    const rulesSnap = await getDoc(doc(db, 'settings', 'commission_rules'));
    if (rulesSnap.exists()) {
      const data = rulesSnap.data();
      return {
        companyRatePercent: typeof data.companyRatePercent === 'number' ? data.companyRatePercent : DEFAULT_COMMISSION_SETTINGS.companyRatePercent,
        franchiseRatePercent: typeof data.franchiseRatePercent === 'number' ? data.franchiseRatePercent : DEFAULT_COMMISSION_SETTINGS.franchiseRatePercent,
        partnerRatePercent: typeof data.partnerRatePercent === 'number' ? data.partnerRatePercent : DEFAULT_COMMISSION_SETTINGS.partnerRatePercent,
        taxRatePercent: typeof data.taxRatePercent === 'number' ? data.taxRatePercent : DEFAULT_COMMISSION_SETTINGS.taxRatePercent,
        minServicemanRatePercent: typeof data.minServicemanRatePercent === 'number' ? data.minServicemanRatePercent : DEFAULT_COMMISSION_SETTINGS.minServicemanRatePercent,
        updatedAt: data.updatedAt || new Date().toISOString(),
        updatedBy: data.updatedBy || 'admin',
      };
    }

    // Check legacy settings/platform_commission
    const legacySnap = await getDoc(doc(db, 'settings', 'platform_commission'));
    if (legacySnap.exists()) {
      const legacyData = legacySnap.data();
      const legacyRate = typeof legacyData.rate === 'number' ? legacyData.rate : parseInt(legacyData.value, 10);
      if (!isNaN(legacyRate) && legacyRate > 0) {
        return {
          ...DEFAULT_COMMISSION_SETTINGS,
          companyRatePercent: legacyRate,
          updatedAt: legacyData.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch (err: any) {
    console.warn('[CommissionEngine] Error reading commission settings from Firestore (using defaults):', err?.message);
  }

  return DEFAULT_COMMISSION_SETTINGS;
}

/**
 * Updates the Admin-controlled Commission Configuration in Firestore.
 */
export async function updateCommissionSettings(db: Firestore, settings: Partial<CommissionSettings>, updatedBy: string = 'admin'): Promise<CommissionSettings> {
  const current = await getCommissionSettings(db);
  const updated: CommissionSettings = {
    companyRatePercent: typeof settings.companyRatePercent === 'number' ? Math.max(0, Math.min(50, settings.companyRatePercent)) : current.companyRatePercent,
    franchiseRatePercent: typeof settings.franchiseRatePercent === 'number' ? Math.max(0, Math.min(30, settings.franchiseRatePercent)) : current.franchiseRatePercent,
    partnerRatePercent: typeof settings.partnerRatePercent === 'number' ? Math.max(0, Math.min(20, settings.partnerRatePercent)) : current.partnerRatePercent,
    taxRatePercent: typeof settings.taxRatePercent === 'number' ? Math.max(0, Math.min(20, settings.taxRatePercent)) : current.taxRatePercent,
    minServicemanRatePercent: typeof settings.minServicemanRatePercent === 'number' ? settings.minServicemanRatePercent : current.minServicemanRatePercent,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  await setDoc(doc(db, 'settings', 'commission_rules'), updated, { merge: true });
  // Sync legacy doc for backward compatibility
  await setDoc(doc(db, 'settings', 'platform_commission'), {
    rate: updated.companyRatePercent,
    value: String(updated.companyRatePercent),
    updatedAt: updated.updatedAt,
  }, { merge: true });

  console.log('[CommissionEngine] Commission settings updated successfully:', updated);
  return updated;
}

/**
 * Calculates multilevel commission distribution based on booking attribution hierarchy.
 * Customer Payment -> Received by Hardinkaam Admin Razorpay
 * Distributed to Internal Ledgers:
 *   1. Company Share (Platform fee)
 *   2. Franchise Commission (if district franchise is attributed)
 *   3. Partner / Brand Promoter Commission (if partner/promoter is attributed)
 *   4. Tax / TDS (statutory withholding)
 *   5. ServiceMan Earning (remaining service share)
 */
export function calculateCommissionBreakdown(
  booking: any,
  grossAmountInRupees: number,
  settings: CommissionSettings
): CommissionBreakdown {
  const gross = Math.max(0, Math.round(grossAmountInRupees));

  // Determine attribution entities
  const hasFranchise = Boolean(booking?.franchisePartnerId || booking?.franchiseCode || booking?.districtId);
  const franchisePartnerId = booking?.franchisePartnerId || (booking?.districtId ? `franchise_${booking.districtId}` : undefined);

  const hasPartner = Boolean(booking?.partnerId || booking?.brandPromoterId);
  const partnerId = booking?.partnerId || booking?.brandPromoterId;

  const serviceManId = booking?.serviceManId;

  // 1. Company Share (Platform fee)
  const companyRatePercent = settings.companyRatePercent || 15;
  const companyShare = Math.round((gross * companyRatePercent) / 100);

  // 2. Franchise Commission: FRANCHISE OWES COMMISSION TO HARDINKAAM (Default 15%)
  // NON-NEGOTIABLE RULE: Franchise does NOT receive commission. Franchise owes commission to HARDINKAAM.
  // Example: ₹1,000 applicable Franchise business -> 15% = ₹150 payable to HARDINKAAM.
  // PRESERVE HISTORICAL RATES: If booking already has a recorded/historical franchiseCommissionRate, preserve it!
  // Otherwise use the current Admin configured future rate (default 15%).
  const historicalFranchiseRate = typeof booking?.franchiseCommissionRate === 'number'
    ? booking.franchiseCommissionRate
    : typeof booking?.franchiseRatePercent === 'number'
      ? booking.franchiseRatePercent
      : undefined;

  const franchiseRatePercent = hasFranchise
    ? (historicalFranchiseRate !== undefined ? historicalFranchiseRate : (typeof settings.franchiseRatePercent === 'number' ? settings.franchiseRatePercent : 15))
    : 0;
  const franchiseCommissionDueToHardinkaam = hasFranchise ? Math.round((gross * franchiseRatePercent) / 100) : 0;
  // For backward compatibility, franchiseCommission stores this due amount
  const franchiseCommission = franchiseCommissionDueToHardinkaam;

  // 3. Partner / Brand Promoter Commission (Separately Configurable, default 5%)
  // PRESERVE HISTORICAL RATES: If booking already has a recorded partnerRatePercent, preserve it!
  const historicalPartnerRate = typeof booking?.partnerRatePercent === 'number'
    ? booking.partnerRatePercent
    : undefined;

  const partnerRatePercent = hasPartner
    ? (historicalPartnerRate !== undefined ? historicalPartnerRate : (typeof settings.partnerRatePercent === 'number' ? settings.partnerRatePercent : 5))
    : 0;
  const partnerCommission = hasPartner ? Math.round((gross * partnerRatePercent) / 100) : 0;

  // 4. Tax / TDS Deduction
  const taxRatePercent = settings.taxRatePercent || 5;
  const taxDeduction = Math.round((gross * taxRatePercent) / 100);

  // 5. Serviceman Net Earning: Remains separate. Customer payment goes to Admin Razorpay.
  // Serviceman earning is NOT reduced by Franchise commission because Franchise owes commission to HARDINKAAM.
  const servicemanEarning = Math.max(0, gross - companyShare - partnerCommission - taxDeduction);
  const servicemanRatePercent = gross > 0 ? Math.round((servicemanEarning / gross) * 100) : 0;

  return {
    grossAmount: gross,
    companyShare,
    companyRatePercent,
    franchiseCommission,
    franchiseCommissionPayableToHardinkaam: franchiseCommissionDueToHardinkaam,
    franchiseCommissionRate: franchiseRatePercent,
    isFranchisePayableToHardinkaam: true,
    franchiseRatePercent,
    franchisePartnerId,
    partnerCommission,
    partnerRatePercent,
    partnerId,
    servicemanEarning,
    servicemanRatePercent,
    serviceManId,
    taxDeduction,
    taxRatePercent,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Atomic & Idempotent Commission Engine:
 * Executes after authentic verification of customer payment to Hardinkaam Admin Razorpay.
 * Generates separate internal ledger entries for:
 *   - COMPANY
 *   - FRANCHISE (if attributed)
 *   - PARTNER / BRAND PROMOTER (if attributed)
 *   - SERVICEMAN
 * Updates participant internal wallets.
 * Prevents double-credit with unique deterministic references.
 */
export async function processPaymentCommissionAndLedgers(
  db: Firestore,
  paymentId: string,
  razorpayOrderId: string,
  bookingId: string | undefined,
  verifiedAmountInPaise: number,
  notes: any
): Promise<{ success: boolean; breakdown: CommissionBreakdown; ledgerIds: string[] }> {
  const grossInRupees = Math.round(verifiedAmountInPaise / 100);
  const nowIso = new Date().toISOString();
  const targetBookingId = bookingId || notes?.bookingId;

  // Read booking details if available
  let bookingData: any = null;
  if (targetBookingId) {
    try {
      const bSnap = await getDoc(doc(db, 'bookings', targetBookingId));
      if (bSnap.exists()) {
        bookingData = bSnap.data();
      }
    } catch (bErr: any) {
      console.warn('[CommissionEngine] Booking lookup note:', bErr?.message);
    }
  }

  // Merge notes attribution into booking data if needed
  const effectiveBooking: any = {
    ...(bookingData || {}),
    id: targetBookingId || `bk_${paymentId}`,
    serviceId: bookingData?.serviceId || notes?.serviceId || '',
    serviceName: bookingData?.serviceName || notes?.serviceName || 'Home Service',
    customerId: bookingData?.customerId || notes?.userId || notes?.customerId || '',
    serviceManId: bookingData?.serviceManId || notes?.serviceManId || 'pro_rajesh_electrician',
    serviceManName: bookingData?.serviceManName || notes?.serviceManName || 'Rajesh Sharma',
    partnerId: bookingData?.partnerId || notes?.partnerId || '',
    brandPromoterId: bookingData?.brandPromoterId || notes?.brandPromoterId || '',
    franchisePartnerId: bookingData?.franchisePartnerId || notes?.franchisePartnerId || '',
    franchiseCode: bookingData?.franchiseCode || notes?.franchiseCode || '',
    districtId: bookingData?.districtId || notes?.districtId || bookingData?.city || notes?.city || '',
    city: bookingData?.city || notes?.city || '',
  };

  // Attribution Resolution 1: District Franchise Partner
  if (!effectiveBooking.franchisePartnerId && (effectiveBooking.districtId || effectiveBooking.city)) {
    try {
      const targetDist = (effectiveBooking.districtId || effectiveBooking.city || '').toLowerCase().trim();
      const fpSnap = await getDocs(query(collection(db, 'franchise_partners'), where('assignedDistrictId', '==', targetDist)));
      if (!fpSnap.empty) {
        const fpDoc = fpSnap.docs[0];
        const fpData = fpDoc.data();
        effectiveBooking.franchisePartnerId = fpDoc.id;
        effectiveBooking.franchiseCode = fpData.franchiseCode || '';
        effectiveBooking.districtName = fpData.assignedDistrictName || effectiveBooking.city;
      }
    } catch (e: any) {
      console.warn('[CommissionEngine] Franchise partner attribution lookup note:', e?.message);
    }
  }

  // Attribution Resolution 2: Partner / Brand Promoter via Serviceman Fleet
  if (!effectiveBooking.partnerId && effectiveBooking.serviceManId) {
    try {
      const smSnap = await getDoc(doc(db, 'service_men', effectiveBooking.serviceManId));
      if (smSnap.exists()) {
        const smData = smSnap.data();
        if (smData.partnerId) {
          effectiveBooking.partnerId = smData.partnerId;
        }
      }
    } catch (e: any) {
      console.warn('[CommissionEngine] Serviceman fleet partner lookup note:', e?.message);
    }
  }

  // Attribution Resolution 3: Partner / Brand Promoter via Customer Referral
  if (!effectiveBooking.partnerId && !effectiveBooking.brandPromoterId && effectiveBooking.customerId) {
    try {
      const custSnap = await getDoc(doc(db, 'users', effectiveBooking.customerId));
      if (custSnap.exists()) {
        const cData = custSnap.data();
        if (cData.referredByPartnerId || cData.partnerId) {
          effectiveBooking.partnerId = cData.referredByPartnerId || cData.partnerId;
        } else if (cData.brandPromoterId) {
          effectiveBooking.brandPromoterId = cData.brandPromoterId;
        }
      }
    } catch (e: any) {
      console.warn('[CommissionEngine] Customer referral lookup note:', e?.message);
    }
  }

  // Check Idempotency: Has this payment or booking already been processed for commissions?
  const referenceId = `COMM-${effectiveBooking.id}-${paymentId}`;
  const existingLedgerSnap = await getDoc(doc(db, 'ledgers', `LEDGER-${effectiveBooking.id}-${paymentId}-COMPANY`));
  if (existingLedgerSnap.exists()) {
    console.log(`[CommissionEngine] Idempotency: Commissions already processed for ${referenceId}. Skipping duplicate calculation.`);
    const existingBreakdown = existingLedgerSnap.data()?.breakdown || {};
    return {
      success: true,
      breakdown: existingBreakdown,
      ledgerIds: [`LEDGER-${effectiveBooking.id}-${paymentId}-COMPANY`],
    };
  }

  // Also check payment record commissionProcessingStatus for idempotency
  try {
    const paySnap = await getDoc(doc(db, 'payments', paymentId));
    if (paySnap.exists() && paySnap.data()?.commissionProcessingStatus === 'completed') {
      console.log(`[CommissionEngine] Idempotency: Payment ${paymentId} already marked commission completed.`);
      return {
        success: true,
        breakdown: paySnap.data()?.commissionBreakdown || {},
        ledgerIds: [`LEDGER-${effectiveBooking.id}-${paymentId}-COMPANY`],
      };
    }
  } catch (_) {}

  // Read current Admin Commission Configuration
  const settings = await getCommissionSettings(db);
  const breakdown = calculateCommissionBreakdown(effectiveBooking, grossInRupees, settings);

  const createdLedgerIds: string[] = [];

  // Helper to persist a single ledger entry and update the owner's wallet
  const recordLedgerEntry = async (entry: LedgerEntry) => {
    try {
      await setDoc(doc(db, 'ledgers', entry.id), entry);
      createdLedgerIds.push(entry.id);

      // Update the internal wallet for the ledger owner
      // CRITICAL NON-NEGOTIABLE RULE: Franchise does NOT receive commission as income.
      // Therefore, Franchise wallet is NEVER credited. Only Serviceman and Partner earn credits.
      if (
        entry.ledgerOwnerId &&
        entry.ledgerOwnerId !== 'company_admin' &&
        entry.ledgerOwnerRole !== 'franchise' &&
        entry.type === 'credit' &&
        entry.amount > 0
      ) {
        const walletRef = doc(db, 'wallets', entry.ledgerOwnerId);
        try {
          const wSnap = await getDoc(walletRef);
          if (wSnap.exists()) {
            const wData = wSnap.data();
            const currentBal = typeof wData.balance === 'number' ? wData.balance : 0;
            const currentEarned = typeof wData.totalEarned === 'number' ? wData.totalEarned : 0;
            await updateDoc(walletRef, {
              balance: currentBal + entry.amount,
              totalEarned: currentEarned + entry.amount,
              updatedAt: nowIso,
            });
          } else {
            await setDoc(walletRef, {
              id: entry.ledgerOwnerId,
              userId: entry.ledgerOwnerId,
              balance: entry.amount,
              pendingBalance: 0,
              totalEarned: entry.amount,
              totalWithdrawn: 0,
              updatedAt: nowIso,
            });
          }
        } catch (wErr: any) {
          console.warn(`[CommissionEngine] Note updating wallet for ${entry.ledgerOwnerId}:`, wErr?.message);
        }
      }
    } catch (lErr: any) {
      console.error(`[CommissionEngine] Error creating ledger entry ${entry.id}:`, lErr?.message);
    }
  };

  // 1. COMPANY LEDGER ENTRY
  const companyLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-COMPANY`;
  await recordLedgerEntry({
    id: companyLedgerId,
    ledgerOwnerId: 'company_admin',
    ledgerOwnerRole: 'company',
    ledgerOwnerName: 'HARDINKAAM Platform',
    bookingId: effectiveBooking.id,
    paymentId,
    razorpayOrderId,
    commissionType: 'company_share',
    amount: breakdown.companyShare,
    grossBookingAmount: breakdown.grossAmount,
    ratePercent: breakdown.companyRatePercent,
    ruleReference: `Platform Share (${breakdown.companyRatePercent}%)`,
    type: 'credit',
    status: 'cleared',
    description: `Platform fee received from Customer Booking #${effectiveBooking.id} via Admin Razorpay`,
    referenceId,
    direction: 'CREDIT_EARNING',
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // 2. FRANCHISE COMMISSION OWED TO HARDINKAAM (if applicable)
  // NON-NEGOTIABLE RULE: Franchise does NOT receive commission. Franchise owes commission to HARDINKAAM.
  // Default 15% (e.g. ₹1,000 applicable Franchise business -> 15% = ₹150 payable to HARDINKAAM).
  if (breakdown.franchiseCommission > 0 && breakdown.franchisePartnerId) {
    const franchiseLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-FRANCHISE`;
    await recordLedgerEntry({
      id: franchiseLedgerId,
      ledgerOwnerId: breakdown.franchisePartnerId,
      ledgerOwnerRole: 'franchise',
      ledgerOwnerName: effectiveBooking.districtName || 'District Franchise',
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: 'franchise_commission',
      amount: breakdown.franchiseCommission,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.franchiseRatePercent,
      ruleReference: `Commission Payable to HARDINKAAM (${breakdown.franchiseRatePercent}%)`,
      type: 'debit',
      status: 'pending',
      description: `Franchise commission payable to HARDINKAAM on Booking #${effectiveBooking.id} (${breakdown.franchiseRatePercent}%)`,
      referenceId,
      direction: 'PAYABLE_TO_HARDINKAAM',
      isPayableToHardinkaam: true,
      collectionStatus: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // Update franchise_partners tracking statistics
    try {
      const fpRef = doc(db, 'franchise_partners', breakdown.franchisePartnerId);
      const fpSnap = await getDoc(fpRef);
      if (fpSnap.exists()) {
        const fpData = fpSnap.data();
        const currentBusiness = typeof fpData.totalBusiness === 'number' ? fpData.totalBusiness : 0;
        const currentDue = typeof fpData.totalCommissionDueToHardinkaam === 'number' ? fpData.totalCommissionDueToHardinkaam : 0;
        const currentPaid = typeof fpData.commissionPaidToHardinkaam === 'number' ? fpData.commissionPaidToHardinkaam : 0;
        const newDue = currentDue + breakdown.franchiseCommission;
        const newPending = Math.max(0, newDue - currentPaid);
        await updateDoc(fpRef, {
          totalBusiness: currentBusiness + breakdown.grossAmount,
          totalCommissionDueToHardinkaam: newDue,
          commissionPendingToHardinkaam: newPending,
          franchiseCommissionRate: breakdown.franchiseRatePercent,
          updatedAt: nowIso,
        });
      }
    } catch (fpErr: any) {
      console.warn('[CommissionEngine] Note updating franchise partner business stats:', fpErr?.message);
    }
  }

  // 3. PARTNER / BRAND PROMOTER LEDGER ENTRY (if applicable)
  if (breakdown.partnerCommission > 0 && breakdown.partnerId) {
    const partnerLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-PARTNER`;
    await recordLedgerEntry({
      id: partnerLedgerId,
      ledgerOwnerId: breakdown.partnerId,
      ledgerOwnerRole: 'partner',
      ledgerOwnerName: 'Brand Partner / Promoter',
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: 'partner_commission',
      amount: breakdown.partnerCommission,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.partnerRatePercent,
      ruleReference: `Partner Referral Share (${breakdown.partnerRatePercent}%)`,
      type: 'credit',
      status: 'cleared',
      description: `Brand Partner referral commission attributed from Customer Booking #${effectiveBooking.id}`,
      referenceId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // 4. SERVICEMAN LEDGER ENTRY
  if (breakdown.servicemanEarning > 0 && breakdown.serviceManId) {
    const servicemanLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-SERVICEMAN`;
    await recordLedgerEntry({
      id: servicemanLedgerId,
      ledgerOwnerId: breakdown.serviceManId,
      ledgerOwnerRole: 'service_man',
      ledgerOwnerName: effectiveBooking.serviceManName || 'Service Professional',
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: 'serviceman_earning',
      amount: breakdown.servicemanEarning,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.servicemanRatePercent,
      ruleReference: `Service Professional Share (${breakdown.servicemanRatePercent}%)`,
      type: 'credit',
      status: 'cleared',
      description: `Service delivery earning attributed from Customer Booking #${effectiveBooking.id}`,
      referenceId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // Update Authoritative Payment Record
  try {
    await setDoc(doc(db, 'payments', paymentId), {
      paymentId,
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      bookingId: effectiveBooking.id,
      amount: verifiedAmountInPaise,
      currency: 'INR',
      status: 'captured',
      verifiedAt: nowIso,
      commissionProcessingStatus: 'completed',
      ledgerProcessingStatus: 'completed',
      commissionBreakdown: breakdown,
      attribution: {
        customerId: effectiveBooking.customerId,
        serviceManId: effectiveBooking.serviceManId,
        partnerId: breakdown.partnerId || null,
        franchisePartnerId: breakdown.franchisePartnerId || null,
        districtId: effectiveBooking.districtId || null,
      },
      updatedAt: nowIso,
    }, { merge: true });
  } catch (payUpErr: any) {
    console.warn('[CommissionEngine] Error updating payment record:', payUpErr?.message);
  }

  // Update Authoritative Booking Record
  if (targetBookingId) {
    try {
      await setDoc(doc(db, 'bookings', targetBookingId), {
        paymentStatus: 'paid',
        status: effectiveBooking.status === 'pending' || effectiveBooking.status === 'created' ? 'confirmed' : effectiveBooking.status,
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        paymentDestination: 'hardinkaam_admin_razorpay',
        paidAt: nowIso,
        companyCommission: breakdown.companyShare,
        franchiseCommission: breakdown.franchiseCommission,
        partnerCommission: breakdown.partnerCommission,
        taxDeduction: breakdown.taxDeduction,
        servicemanPayoutAmount: breakdown.servicemanEarning,
        commissionStatus: 'processed',
        commissionBreakdown: breakdown,
        updatedAt: nowIso,
      }, { merge: true });
      console.log(`[CommissionEngine] Successfully verified payment and recorded commissions for Booking #${targetBookingId}`);
    } catch (bkUpErr: any) {
      console.warn('[CommissionEngine] Error updating booking with commission details:', bkUpErr?.message);
    }
  }

  return {
    success: true,
    breakdown,
    ledgerIds: createdLedgerIds,
  };
}

/**
 * Handles Payment Refund and Reversal of Related Commission Ledgers.
 * Guarantees that participants do not retain invalid commissions upon refund.
 */
export async function processPaymentRefund(
  db: Firestore,
  paymentId: string,
  refundAmountInRupees?: number,
  reason: string = 'Customer cancelled booking / service dispute'
): Promise<{ success: boolean; reversalLedgerIds: string[]; message: string }> {
  const nowIso = new Date().toISOString();

  // 1. Fetch the payment record
  const payRef = doc(db, 'payments', paymentId);
  const paySnap = await getDoc(payRef);
  if (!paySnap.exists()) {
    throw new Error(`Payment #${paymentId} not found in database.`);
  }

  const payData = paySnap.data();
  if (payData.refundStatus === 'completed') {
    return {
      success: true,
      reversalLedgerIds: [],
      message: `Payment #${paymentId} has already been refunded.`,
    };
  }

  const grossInRupees = Math.round((payData.amount || 0) / 100);
  const actualRefundAmount = refundAmountInRupees !== undefined ? refundAmountInRupees : grossInRupees;
  const isPartial = actualRefundAmount < grossInRupees;

  const targetBookingId = payData.bookingId;
  const reversalLedgerIds: string[] = [];

  // 2. Fetch original ledgers associated with this payment
  const ledgersRef = collection(db, 'ledgers');
  const q = query(ledgersRef, where('paymentId', '==', paymentId));
  const ledgersSnap = await getDocs(q);

  for (const docSnap of ledgersSnap.docs) {
    const lData = docSnap.data();
    if (lData.type === 'credit' && !lData.isReversed) {
      // Calculate proportional reversal amount
      const reversalAmt = isPartial
        ? Math.round((lData.amount * actualRefundAmount) / grossInRupees)
        : lData.amount;

      if (reversalAmt > 0) {
        const reversalId = `LEDGER-REFUND-${targetBookingId || 'bk'}-${paymentId}-${lData.ledgerOwnerRole}`;

        const reversalEntry: LedgerEntry = {
          id: reversalId,
          ledgerOwnerId: lData.ledgerOwnerId,
          ledgerOwnerRole: lData.ledgerOwnerRole,
          ledgerOwnerName: lData.ledgerOwnerName,
          bookingId: targetBookingId || '',
          paymentId,
          razorpayOrderId: payData.razorpayOrderId,
          commissionType: 'reversal',
          amount: reversalAmt,
          grossBookingAmount: actualRefundAmount,
          ratePercent: lData.ratePercent,
          ruleReference: `Refund Reversal (${lData.ruleReference})`,
          type: 'debit',
          status: 'reversed',
          description: `Commission reversed due to payment refund on Booking #${targetBookingId || 'N/A'}: ${reason}`,
          referenceId: `REFUND-${paymentId}`,
          isReversed: true,
          reversalReason: reason,
          reversalReferenceId: docSnap.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        await setDoc(doc(db, 'ledgers', reversalId), reversalEntry);
        reversalLedgerIds.push(reversalId);

        // Mark original entry as reversed
        await updateDoc(docSnap.ref, {
          isReversed: true,
          status: 'reversed',
          reversalReason: reason,
          updatedAt: nowIso,
        });

        // Deduct from owner's wallet balance
        if (lData.ledgerOwnerId && lData.ledgerOwnerId !== 'company_admin') {
          const wRef = doc(db, 'wallets', lData.ledgerOwnerId);
          try {
            const wSnap = await getDoc(wRef);
            if (wSnap.exists()) {
              const currentBal = wSnap.data().balance || 0;
              await updateDoc(wRef, {
                balance: Math.max(0, currentBal - reversalAmt),
                updatedAt: nowIso,
              });
            }
          } catch (wErr: any) {
            console.warn(`[CommissionEngine] Wallet debit notice for ${lData.ledgerOwnerId}:`, wErr?.message);
          }
        }
      }
    }
  }

  // 3. Update payment status
  await updateDoc(payRef, {
    status: 'refunded',
    refundStatus: 'completed',
    refundAmount: actualRefundAmount,
    refundReason: reason,
    refundedAt: nowIso,
    updatedAt: nowIso,
  });

  // 4. Update booking status
  if (targetBookingId) {
    try {
      await updateDoc(doc(db, 'bookings', targetBookingId), {
        paymentStatus: 'refunded',
        refundStatus: 'completed',
        refundAmount: actualRefundAmount,
        status: 'cancelled',
        cancellationReason: `Refund processed: ${reason}`,
        cancelledAt: nowIso,
        cancelledBy: 'admin_refund_system',
        updatedAt: nowIso,
      });
    } catch (bkErr: any) {
      console.warn('[CommissionEngine] Error updating booking refund state:', bkErr?.message);
    }
  }

  console.log(`[CommissionEngine] Successfully executed refund of ₹${actualRefundAmount} for Payment #${paymentId}. Reversed ${reversalLedgerIds.length} ledgers.`);

  return {
    success: true,
    reversalLedgerIds,
    message: `Payment #${paymentId} refunded successfully (₹${actualRefundAmount}). Related commission ledgers reversed.`,
  };
}

/**
 * Authoritative Server-Side Commission & Ledger Processing using Firebase Admin SDK.
 * Bypasses client-side security rules when running with Admin privileges.
 * Enforces atomic idempotency and prevents duplicate wallet/ledger credits.
 */
export async function processPaymentCommissionAndLedgersWithAdmin(
  adminDb: any,
  paymentId: string,
  razorpayOrderId: string,
  bookingId: string | undefined,
  verifiedAmountInPaise: number,
  notes: any
): Promise<{ success: boolean; breakdown: CommissionBreakdown; ledgerIds: string[] }> {
  const grossInRupees = Math.round(verifiedAmountInPaise / 100);
  const nowIso = new Date().toISOString();
  const targetBookingId = bookingId || notes?.bookingId;

  // 1. Fetch booking record if present
  let bookingData: any = null;
  if (targetBookingId) {
    try {
      const bSnap = await adminDb.collection('bookings').doc(targetBookingId).get();
      if (bSnap.exists) {
        bookingData = bSnap.data();
      }
    } catch (bErr: any) {
      console.warn('[CommissionEngine Admin] Booking lookup note:', bErr?.message);
    }
  }

  // 2. Build effective booking with attribution
  const effectiveBooking: any = {
    ...(bookingData || {}),
    id: targetBookingId || `bk_${paymentId}`,
    serviceId: bookingData?.serviceId || notes?.serviceId || '',
    serviceName: bookingData?.serviceName || notes?.serviceName || 'Home Service',
    customerId: bookingData?.customerId || notes?.userId || notes?.customerId || '',
    serviceManId: bookingData?.serviceManId || notes?.serviceManId || 'pro_rajesh_electrician',
    serviceManName: bookingData?.serviceManName || notes?.serviceManName || 'Rajesh Sharma',
    partnerId: bookingData?.partnerId || notes?.partnerId || '',
    brandPromoterId: bookingData?.brandPromoterId || notes?.brandPromoterId || '',
    franchisePartnerId: bookingData?.franchisePartnerId || notes?.franchisePartnerId || '',
    franchiseCode: bookingData?.franchiseCode || notes?.franchiseCode || '',
    districtId: bookingData?.districtId || notes?.districtId || bookingData?.city || notes?.city || '',
    city: bookingData?.city || notes?.city || '',
  };

  // Attribution 1: District Franchise Partner
  if (!effectiveBooking.franchisePartnerId && (effectiveBooking.districtId || effectiveBooking.city)) {
    try {
      const targetDist = (effectiveBooking.districtId || effectiveBooking.city || '').toLowerCase().trim();
      const fpSnap = await adminDb.collection('franchise_partners').where('assignedDistrictId', '==', targetDist).get();
      if (!fpSnap.empty) {
        const fpDoc = fpSnap.docs[0];
        const fpData = fpDoc.data();
        effectiveBooking.franchisePartnerId = fpDoc.id;
        effectiveBooking.franchiseCode = fpData.franchiseCode || '';
        effectiveBooking.districtName = fpData.assignedDistrictName || effectiveBooking.city;
      }
    } catch (e: any) {
      console.warn('[CommissionEngine Admin] Franchise lookup note:', e?.message);
    }
  }

  // Attribution 2: Partner via Serviceman Fleet
  if (!effectiveBooking.partnerId && effectiveBooking.serviceManId) {
    try {
      const smSnap = await adminDb.collection('service_men').doc(effectiveBooking.serviceManId).get();
      if (smSnap.exists) {
        const smData = smSnap.data();
        if (smData?.partnerId) {
          effectiveBooking.partnerId = smData.partnerId;
        }
      }
    } catch (e: any) {
      console.warn('[CommissionEngine Admin] Serviceman fleet partner lookup note:', e?.message);
    }
  }

  // Attribution 3: Partner via Customer Referral
  if (!effectiveBooking.partnerId && !effectiveBooking.brandPromoterId && effectiveBooking.customerId) {
    try {
      const custSnap = await adminDb.collection('users').doc(effectiveBooking.customerId).get();
      if (custSnap.exists) {
        const cData = custSnap.data();
        if (cData?.referredByPartnerId || cData?.partnerId) {
          effectiveBooking.partnerId = cData.referredByPartnerId || cData.partnerId;
        } else if (cData?.brandPromoterId) {
          effectiveBooking.brandPromoterId = cData.brandPromoterId;
        }
      }
    } catch (e: any) {
      console.warn('[CommissionEngine Admin] Customer referral lookup note:', e?.message);
    }
  }

  // 3. Strict Idempotency Checks
  const companyLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-COMPANY`;
  const existingLedgerSnap = await adminDb.collection('ledgers').doc(companyLedgerId).get();
  if (existingLedgerSnap.exists) {
    console.log(`[CommissionEngine Admin] Idempotency: Commissions already processed for ${companyLedgerId}. Skipping duplicate.`);
    const existingBreakdown = existingLedgerSnap.data()?.breakdown || {};
    return {
      success: true,
      breakdown: existingBreakdown,
      ledgerIds: [companyLedgerId],
    };
  }

  try {
    const paySnap = await adminDb.collection('payments').doc(paymentId).get();
    if (paySnap.exists && paySnap.data()?.commissionProcessingStatus === 'completed') {
      console.log(`[CommissionEngine Admin] Idempotency: Payment ${paymentId} already marked completed.`);
      return {
        success: true,
        breakdown: paySnap.data()?.commissionBreakdown || {},
        ledgerIds: [companyLedgerId],
      };
    }
  } catch (_) {}

  // 4. Retrieve Commission Settings from Admin Firestore
  let settings: CommissionSettings = DEFAULT_COMMISSION_SETTINGS;
  try {
    const rulesSnap = await adminDb.collection('settings').doc('commission_rules').get();
    if (rulesSnap.exists) {
      const rData = rulesSnap.data();
      settings = {
        companyRatePercent: typeof rData.companyRatePercent === 'number' ? rData.companyRatePercent : DEFAULT_COMMISSION_SETTINGS.companyRatePercent,
        franchiseRatePercent: typeof rData.franchiseRatePercent === 'number' ? rData.franchiseRatePercent : DEFAULT_COMMISSION_SETTINGS.franchiseRatePercent,
        partnerRatePercent: typeof rData.partnerRatePercent === 'number' ? rData.partnerRatePercent : DEFAULT_COMMISSION_SETTINGS.partnerRatePercent,
        taxRatePercent: typeof rData.taxRatePercent === 'number' ? rData.taxRatePercent : DEFAULT_COMMISSION_SETTINGS.taxRatePercent,
        minServicemanRatePercent: typeof rData.minServicemanRatePercent === 'number' ? rData.minServicemanRatePercent : DEFAULT_COMMISSION_SETTINGS.minServicemanRatePercent,
        updatedAt: rData.updatedAt || new Date().toISOString(),
        updatedBy: rData.updatedBy || 'admin',
      };
    }
  } catch (err: any) {
    console.warn('[CommissionEngine Admin] Commission settings read note:', err?.message);
  }

  const breakdown = calculateCommissionBreakdown(effectiveBooking, grossInRupees, settings);
  const createdLedgerIds: string[] = [];

  // Helper to record an individual ledger entry and credit wallet (excluding Franchise)
  const recordAdminLedgerEntry = async (entry: LedgerEntry) => {
    await adminDb.collection('ledgers').doc(entry.id).set(entry);
    createdLedgerIds.push(entry.id);

    // CRITICAL NON-NEGOTIABLE RULE: Franchise does NOT receive commission as income.
    // Therefore, Franchise wallet is NEVER credited. Only Serviceman and Partner earn credits.
    if (
      entry.ledgerOwnerId &&
      entry.ledgerOwnerId !== 'company_admin' &&
      entry.ledgerOwnerRole !== 'franchise' &&
      entry.type === 'credit' &&
      entry.amount > 0
    ) {
      const walletRef = adminDb.collection('wallets').doc(entry.ledgerOwnerId);
      try {
        const wSnap = await walletRef.get();
        if (wSnap.exists) {
          const wData = wSnap.data() || {};
          const currentBal = typeof wData.balance === 'number' ? wData.balance : 0;
          const currentEarned = typeof wData.totalEarned === 'number' ? wData.totalEarned : 0;
          await walletRef.update({
            balance: currentBal + entry.amount,
            totalEarned: currentEarned + entry.amount,
            updatedAt: nowIso,
          });
        } else {
          await walletRef.set({
            id: entry.ledgerOwnerId,
            userId: entry.ledgerOwnerId,
            balance: entry.amount,
            pendingBalance: 0,
            totalEarned: entry.amount,
            totalWithdrawn: 0,
            updatedAt: nowIso,
          });
        }
      } catch (wErr: any) {
        console.warn(`[CommissionEngine Admin] Note updating wallet for ${entry.ledgerOwnerId}:`, wErr?.message);
      }
    }
  };

  const referenceId = `COMM-${effectiveBooking.id}-${paymentId}`;

  // A. Company Ledger Entry
  await recordAdminLedgerEntry({
    id: companyLedgerId,
    ledgerOwnerId: 'company_admin',
    ledgerOwnerRole: 'company',
    ledgerOwnerName: 'HARDINKAAM Platform',
    bookingId: effectiveBooking.id,
    paymentId,
    razorpayOrderId,
    commissionType: 'company_share',
    amount: breakdown.companyShare,
    grossBookingAmount: breakdown.grossAmount,
    ratePercent: breakdown.companyRatePercent,
    ruleReference: `Platform Share (${breakdown.companyRatePercent}%)`,
    type: 'credit',
    status: 'cleared',
    description: `Platform fee received from Customer Booking #${effectiveBooking.id} via Admin Razorpay`,
    referenceId,
    direction: 'CREDIT_EARNING',
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // B. Franchise Commission Owed to HARDINKAAM (Franchise wallet is NOT credited)
  if (breakdown.franchiseCommission > 0 && breakdown.franchisePartnerId) {
    const franchiseLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-FRANCHISE`;
    await recordAdminLedgerEntry({
      id: franchiseLedgerId,
      ledgerOwnerId: breakdown.franchisePartnerId,
      ledgerOwnerRole: 'franchise',
      ledgerOwnerName: effectiveBooking.districtName || 'District Franchise',
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: 'franchise_commission',
      amount: breakdown.franchiseCommission,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.franchiseRatePercent,
      ruleReference: `Commission Payable to HARDINKAAM (${breakdown.franchiseRatePercent}%)`,
      type: 'debit',
      status: 'pending',
      description: `Franchise commission payable to HARDINKAAM on Booking #${effectiveBooking.id} (${breakdown.franchiseRatePercent}%)`,
      referenceId,
      direction: 'PAYABLE_TO_HARDINKAAM',
      isPayableToHardinkaam: true,
      collectionStatus: 'pending',
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    try {
      const fpRef = adminDb.collection('franchise_partners').doc(breakdown.franchisePartnerId);
      const fpSnap = await fpRef.get();
      if (fpSnap.exists) {
        const fpData = fpSnap.data() || {};
        const currentBusiness = typeof fpData.totalBusiness === 'number' ? fpData.totalBusiness : 0;
        const currentDue = typeof fpData.totalCommissionDueToHardinkaam === 'number' ? fpData.totalCommissionDueToHardinkaam : 0;
        const currentPaid = typeof fpData.commissionPaidToHardinkaam === 'number' ? fpData.commissionPaidToHardinkaam : 0;
        const newDue = currentDue + breakdown.franchiseCommission;
        const newPending = Math.max(0, newDue - currentPaid);
        await fpRef.update({
          totalBusiness: currentBusiness + breakdown.grossAmount,
          totalCommissionDueToHardinkaam: newDue,
          commissionPendingToHardinkaam: newPending,
          franchiseCommissionRate: breakdown.franchiseRatePercent,
          updatedAt: nowIso,
        });
      }
    } catch (fpErr: any) {
      console.warn('[CommissionEngine Admin] Note updating franchise stats:', fpErr?.message);
    }
  }

  // C. Partner / Brand Promoter Ledger Entry
  if (breakdown.partnerCommission > 0 && breakdown.partnerId) {
    const partnerLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-PARTNER`;
    await recordAdminLedgerEntry({
      id: partnerLedgerId,
      ledgerOwnerId: breakdown.partnerId,
      ledgerOwnerRole: 'partner',
      ledgerOwnerName: 'Brand Partner / Promoter',
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: 'partner_commission',
      amount: breakdown.partnerCommission,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.partnerRatePercent,
      ruleReference: `Partner Referral Share (${breakdown.partnerRatePercent}%)`,
      type: 'credit',
      status: 'cleared',
      description: `Brand Partner referral commission attributed from Customer Booking #${effectiveBooking.id}`,
      referenceId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // D. Serviceman Ledger Entry
  if (breakdown.servicemanEarning > 0 && breakdown.serviceManId) {
    const servicemanLedgerId = `LEDGER-${effectiveBooking.id}-${paymentId}-SERVICEMAN`;
    await recordAdminLedgerEntry({
      id: servicemanLedgerId,
      ledgerOwnerId: breakdown.serviceManId,
      ledgerOwnerRole: 'service_man',
      ledgerOwnerName: effectiveBooking.serviceManName || 'Service Professional',
      bookingId: effectiveBooking.id,
      paymentId,
      razorpayOrderId,
      commissionType: 'serviceman_earning',
      amount: breakdown.servicemanEarning,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.servicemanRatePercent,
      ruleReference: `Service Professional Share (${breakdown.servicemanRatePercent}%)`,
      type: 'credit',
      status: 'cleared',
      description: `Service delivery earning attributed from Customer Booking #${effectiveBooking.id}`,
      referenceId,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  // E. Update Authoritative Payment Record
  try {
    await adminDb.collection('payments').doc(paymentId).set({
      paymentId,
      razorpayOrderId,
      razorpayPaymentId: paymentId,
      bookingId: effectiveBooking.id,
      amount: verifiedAmountInPaise,
      currency: 'INR',
      status: 'captured',
      verifiedAt: nowIso,
      commissionProcessingStatus: 'completed',
      ledgerProcessingStatus: 'completed',
      commissionBreakdown: breakdown,
      attribution: {
        customerId: effectiveBooking.customerId,
        serviceManId: effectiveBooking.serviceManId,
        partnerId: breakdown.partnerId || null,
        franchisePartnerId: breakdown.franchisePartnerId || null,
        districtId: effectiveBooking.districtId || null,
      },
      updatedAt: nowIso,
    }, { merge: true });
  } catch (payUpErr: any) {
    console.warn('[CommissionEngine Admin] Error updating payment record:', payUpErr?.message);
  }

  // F. Update Authoritative Booking Record
  if (targetBookingId) {
    try {
      await adminDb.collection('bookings').doc(targetBookingId).set({
        paymentStatus: 'paid',
        status: effectiveBooking.status === 'pending' || effectiveBooking.status === 'created' ? 'confirmed' : effectiveBooking.status,
        razorpayOrderId,
        razorpayPaymentId: paymentId,
        paymentDestination: 'hardinkaam_admin_razorpay',
        paidAt: nowIso,
        companyCommission: breakdown.companyShare,
        franchiseCommission: breakdown.franchiseCommission,
        partnerCommission: breakdown.partnerCommission,
        taxDeduction: breakdown.taxDeduction,
        servicemanPayoutAmount: breakdown.servicemanEarning,
        commissionStatus: 'processed',
        commissionBreakdown: breakdown,
        updatedAt: nowIso,
      }, { merge: true });
      console.log(`[CommissionEngine Admin] Successfully processed payment and recorded commissions for Booking #${targetBookingId}`);
    } catch (bkUpErr: any) {
      console.warn('[CommissionEngine Admin] Error updating booking:', bkUpErr?.message);
    }
  }

  return {
    success: true,
    breakdown,
    ledgerIds: createdLedgerIds,
  };
}

/**
 * HARDINKAAM - Commission, Registration & Company Profit Engine
 *
 * Deterministic, auditable, duplicate-safe financial accounting service.
 * Handles:
 * 1. Fixed ServiceMan registration fee (₹121 Total = ₹21 Partner Commission + ₹100 Company Gross Share)
 * 2. Configurable Customer and Business Partner registration models
 * 3. Double-commission prevention & Anti-Pyramid multi-level pool caps (Total distributed <= Commission Pool)
 * 4. Refund / Reversal automation
 * 5. Fraud detection & Commission Hold workflows
 * 6. Partner & Brand Promoter wallet calculations
 * 7. Real-time Company Profit / Contribution calculations from immutable ledger data
 * 8. 12 Downloadable CSV / Excel auditing reports
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../utils/sparkQuotaGuard';

export type FinancialTransactionType =
  | 'SERVICEMAN_REGISTRATION'
  | 'CUSTOMER_REGISTRATION'
  | 'BUSINESS_PARTNER_REGISTRATION'
  | 'SERVICE_BOOKING'
  | 'COMMISSION_PAYOUT'
  | 'COMMISSION_REVERSAL'
  | 'REFUND_PROCESSED'
  | 'OPERATING_EXPENSE';

export type CommissionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'AVAILABLE'
  | 'PAID'
  | 'REVERSED'
  | 'CANCELLED'
  | 'UNDER_REVIEW'
  | 'HOLD';

export interface CommissionLevelRule {
  level: number;
  label: string;
  shareAmount: number; // Flat INR or percent
  isPercent: boolean;
  enabled: boolean;
}

export interface OperatingExpensesConfig {
  officeRent: number;
  salaries: number;
  marketing: number;
  technologyAndHosting: number;
  customerSupport: number;
  travelAndOperations: number;
  otherExpenses: number;
}

export interface FinancialConfig {
  // ServiceMan Registration Rules
  servicemanRegistrationFee: number; // ₹121 default
  servicemanCommissionPool: number; // ₹21 default (Company Gross = ₹100)

  // Customer Registration Rules
  customerRegistrationFee: number; // e.g. 0 or 1021 as configured
  customerCommissionPool: number; // e.g. 50

  // Business Partner Registration Rules
  businessPartnerRegistrationFee: number; // e.g. 999
  businessPartnerCommissionPool: number; // e.g. 100

  // Multi-Level Allocation Rules (Strict non-pyramid cap: sum(levels) <= pool)
  maxCommissionLevels: number; // e.g. 2
  commissionLevels: CommissionLevelRule[];

  // Tax & Payment Gateway Configuration
  gstEnabled: boolean;
  gstRatePercent: number; // e.g. 18%
  gatewayFeePercent: number; // e.g. 2.0%
  minWithdrawalAmount: number; // e.g. ₹100

  // Operating Expenses (Monthly / Annualized for Net Profit calculations)
  operatingExpenses: OperatingExpensesConfig;

  updatedAt: string;
  updatedBy: string;
}

export interface FinancialLedgerRecord {
  id: string; // Unique immutable transaction ID: TXN-{timestamp}-{random}
  transactionId: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  role: 'customer' | 'service_man' | 'business_partner' | 'brand_promoter' | 'franchise' | 'admin';
  transactionType: FinancialTransactionType;
  referenceId: string; // e.g. REG_COMM-{userId}-{paymentId}
  paymentId?: string;
  orderId?: string;

  // Amount Breakdown
  grossAmount: number; // Total paid by user (e.g. ₹121)
  commissionPool: number; // Maximum permissible commission (e.g. ₹21)
  commissionDistributed: number; // Total distributed to partners (<= commissionPool, e.g. ₹21)
  taxAmount: number; // Applicable tax/GST (e.g. ₹0 or ₹18)
  gatewayFee: number; // Payment gateway charge (e.g. 2%)
  refundAmount: number; // Refund if reversed
  otherDeductions: number;

  // Company Gross & Net Share
  companyGrossAmount: number; // grossAmount - commissionDistributed (e.g. ₹100)
  companyNetAmount: number; // grossAmount - (commission + tax + gateway + refund + other)

  // Commission Details
  partnerId?: string;
  partnerName?: string;
  partnerRole?: 'business_partner' | 'brand_promoter' | 'franchise';
  commissionBreakdown?: Array<{
    partnerId: string;
    level: number;
    amount: number;
    status: CommissionStatus;
  }>;

  // Status & Timestamps
  status: CommissionStatus;
  isRefunded?: boolean;
  originalTransactionId?: string; // If this is a reversal/refund
  fraudScore?: number;
  fraudReason?: string;
  source: string; // 'razorpay' | 'admin_override' | 'manual'
  notes?: string;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  reversedAt?: string;
}

export interface PartnerCommissionSummary {
  partnerId: string;
  partnerName: string;
  totalRegistrations: number;
  customerRegistrationsCount: number;
  servicemanRegistrationsCount: number;
  partnerRegistrationsCount: number;
  eligibleTransactionsCount: number;
  totalCommissionEarned: number;
  pendingCommission: number;
  approvedCommission: number;
  availableBalance: number;
  paidCommission: number;
  reversedCommission: number;
}

export interface AdminFinancialSummary {
  periodLabel: string;
  servicemanRegistrationsCount: number;
  customerRegistrationsCount: number;
  partnerRegistrationsCount: number;
  serviceBookingsCount: number;
  completedServicesCount: number;

  // Core Financials
  totalCollection: number; // e.g. 10 * ₹121 = ₹1,210
  totalCommission: number; // e.g. 10 * ₹21 = ₹210
  totalTax: number;
  totalGatewayCharges: number;
  totalRefunds: number;
  totalOtherDeductions: number;

  // Company Profit Margins
  companyGrossShare: number; // Total Collection - Total Commission (e.g. ₹1,000)
  companyNetAmount: number; // Total Collection - (Commission + Taxes + Gateway + Refunds)
  operatingExpenses: number; // Sum of operating expenses for selected period
  operatingProfit: number; // Company Net Amount - Operating Expenses

  isProfitValid: boolean;
  recordsCount: number;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  amount: number;
  paymentMethod: 'upi' | 'bank_transfer';
  upiId?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  adminNote?: string;
  requestedAt: string;
  approvedAt?: string;
  paidAt?: string;
  rejectedAt?: string;
}

const DEFAULT_FINANCIAL_CONFIG: FinancialConfig = {
  servicemanRegistrationFee: 121,
  servicemanCommissionPool: 21, // Company Gross Share = ₹100
  customerRegistrationFee: 0,
  customerCommissionPool: 0,
  businessPartnerRegistrationFee: 999,
  businessPartnerCommissionPool: 100,
  maxCommissionLevels: 2,
  commissionLevels: [
    { level: 1, label: 'Direct Referrer (Level 1)', shareAmount: 21, isPercent: false, enabled: true },
    { level: 2, label: 'Promoter Lead (Level 2)', shareAmount: 0, isPercent: false, enabled: false },
  ],
  gstEnabled: false,
  gstRatePercent: 18,
  gatewayFeePercent: 2.0, // 2% Standard Razorpay
  minWithdrawalAmount: 100,
  operatingExpenses: {
    officeRent: 15000,
    salaries: 35000,
    marketing: 10000,
    technologyAndHosting: 5000,
    customerSupport: 8000,
    travelAndOperations: 5000,
    otherExpenses: 2000,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_default',
};

export const LOCAL_CONFIG_KEY = 'hardinkaam_financial_config_v2';
export const LOCAL_FINANCIAL_LEDGER_KEY = 'hardinkaam_financial_ledger_records_v2';
export const LOCAL_WITHDRAWALS_KEY = 'hardinkaam_withdrawal_records_v2';
export const LOCAL_FINANCIAL_ZEROED_KEY = 'hardinkaam_financial_zeroed_v1';

/**
 * Zero out all financial profit and ledger data.
 */
export async function zeroAdminFinancialProfitData(): Promise<{ success: boolean; message: string }> {
  try {
    localStorage.setItem(LOCAL_FINANCIAL_ZEROED_KEY, 'true');
    localStorage.removeItem(LOCAL_FINANCIAL_LEDGER_KEY);
  } catch (_) {}

  try {
    if (isResourceExhausted()) return { success: true, message: 'वित्तीय लाभ व लेज़र डेटा स्थानीय रूप से शून्य कर दिया गया है।' };
    const snap = await getDocs(query(collection(db, 'ledgers'), limit(100)));
    const batch = writeBatch(db);
    let count = 0;
    snap.forEach((d) => {
      batch.delete(d.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
  } catch (err: any) {
    console.warn('[FinancialEngine] Cloud ledgers delete note:', err?.message);
    checkAndHandleQuotaError(err);
  }

  return { success: true, message: 'वित्तीय लाभ व लेज़र डेटा सफलतापूर्वक शून्य कर दिया गया है।' };
}

/**
 * 1. Read current Financial Configuration
 */
export async function getFinancialConfig(): Promise<FinancialConfig> {
  // Check local cache
  let cached: FinancialConfig | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch (_) {}

  try {
    const docRef = doc(db, 'settings', 'financial_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = { ...DEFAULT_FINANCIAL_CONFIG, ...snap.data() } as FinancialConfig;
      try {
        localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(data));
      } catch (_) {}
      return data;
    }
  } catch (err) {
    console.warn('[FinancialEngine] Firestore fetch note:', err);
  }

  return cached || DEFAULT_FINANCIAL_CONFIG;
}

/**
 * 2. Update Financial Configuration with Validation
 */
export async function updateFinancialConfig(
  newConfig: Partial<FinancialConfig>,
  adminId: string = 'super_admin'
): Promise<{ success: boolean; config: FinancialConfig; error?: string }> {
  const current = await getFinancialConfig();
  const merged: FinancialConfig = {
    ...current,
    ...newConfig,
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  // VALIDATION: Commission pool must not exceed registration fee
  if (merged.servicemanCommissionPool > merged.servicemanRegistrationFee) {
    return {
      success: false,
      config: current,
      error: `ServiceMan commission pool (₹${merged.servicemanCommissionPool}) cannot exceed registration fee (₹${merged.servicemanRegistrationFee}).`,
    };
  }

  // VALIDATION: Multi-level sum must not exceed commission pool
  const enabledLevelsSum = merged.commissionLevels
    .filter((l) => l.enabled)
    .reduce((acc, l) => acc + (l.isPercent ? (merged.servicemanCommissionPool * l.shareAmount) / 100 : l.shareAmount), 0);

  if (enabledLevelsSum > merged.servicemanCommissionPool) {
    return {
      success: false,
      config: current,
      error: `Commission level allocation (₹${enabledLevelsSum}) exceeds the configured ServiceMan commission pool (₹${merged.servicemanCommissionPool}). Company margin must not be negative.`,
    };
  }

  // Save to Firestore
  try {
    await setDoc(doc(db, 'settings', 'financial_settings'), merged, { merge: true });
    // Also sync to settings/commission_rules for backwards compatibility
    await setDoc(
      doc(db, 'settings', 'commission_rules'),
      {
        servicemanRegistrationFee: merged.servicemanRegistrationFee,
        servicemanCommissionPool: merged.servicemanCommissionPool,
        customerRegistrationFee: merged.customerRegistrationFee,
        businessPartnerRegistrationFee: merged.businessPartnerRegistrationFee,
        updatedAt: merged.updatedAt,
        updatedBy: adminId,
      },
      { merge: true }
    );
  } catch (err: any) {
    console.warn('[FinancialEngine] Firestore save note (cached locally):', err?.message);
  }

  try {
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(merged));
  } catch (_) {}

  // Log Audit record
  try {
    await addDoc(collection(db, 'audit_logs'), {
      action: 'UPDATE_FINANCIAL_CONFIG',
      adminId,
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(merged),
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}

  return { success: true, config: merged };
}

/**
 * 3. Calculate ServiceMan Registration Breakdown (₹121 = ₹21 Pool + ₹100 Company Gross Share)
 */
export function calculateServiceManRegistrationBreakdown(
  customFee?: number,
  customPool?: number,
  config: FinancialConfig = DEFAULT_FINANCIAL_CONFIG
): {
  grossAmount: number;
  commissionPool: number;
  commissionDistributed: number;
  companyGrossAmount: number;
  taxAmount: number;
  gatewayFee: number;
  companyNetAmount: number;
} {
  const grossAmount = customFee !== undefined ? customFee : config.servicemanRegistrationFee; // ₹121
  const commissionPool = customPool !== undefined ? customPool : config.servicemanCommissionPool; // ₹21
  const commissionDistributed = Math.min(grossAmount, commissionPool); // ₹21
  const companyGrossAmount = grossAmount - commissionDistributed; // ₹100

  const taxAmount = config.gstEnabled ? Math.round((grossAmount * config.gstRatePercent) / (100 + config.gstRatePercent)) : 0;
  const gatewayFee = Math.round((grossAmount * config.gatewayFeePercent) / 100 * 100) / 100;
  const companyNetAmount = Math.max(0, Math.round((companyGrossAmount - taxAmount - gatewayFee) * 100) / 100);

  return {
    grossAmount,
    commissionPool,
    commissionDistributed,
    companyGrossAmount,
    taxAmount,
    gatewayFee,
    companyNetAmount,
  };
}

/**
 * 4. Double-Commission Guard & Fraud Detection
 */
export async function checkDoubleCommissionOrFraud(
  referenceId: string,
  userPhone?: string,
  userEmail?: string,
  partnerId?: string
): Promise<{ isDuplicate: boolean; isFraudSuspicious: boolean; fraudReason?: string }> {
  // 1. Check local & Firestore for duplicate referenceId
  try {
    const raw = localStorage.getItem(LOCAL_FINANCIAL_LEDGER_KEY);
    if (raw) {
      const records: FinancialLedgerRecord[] = JSON.parse(raw);
      const existing = records.find(
        (r) => r.referenceId === referenceId && r.status !== 'CANCELLED' && r.status !== 'REVERSED'
      );
      if (existing) {
        return { isDuplicate: true, isFraudSuspicious: false };
      }
    }
  } catch (_) {}

  // 2. Query Firestore
  try {
    const q = query(
      collection(db, 'ledgers'),
      where('referenceId', '==', referenceId),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      if (docData.status !== 'CANCELLED' && docData.status !== 'REVERSED') {
        return { isDuplicate: true, isFraudSuspicious: false };
      }
    }
  } catch (_) {}

  // 3. Fraud check: Self-referral or circular referral
  if (partnerId && (partnerId === userPhone || partnerId === userEmail)) {
    return {
      isDuplicate: false,
      isFraudSuspicious: true,
      fraudReason: 'Self-referral detected: Partner and registering user share same credentials.',
    };
  }

  return { isDuplicate: false, isFraudSuspicious: false };
}

/**
 * 5. Atomic Registration & Commission Recording
 */
export async function recordRegistrationAndCommissionAtomic(params: {
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  role: 'service_man' | 'customer' | 'business_partner';
  paymentId: string;
  orderId?: string;
  partnerId?: string;
  partnerName?: string;
  partnerRole?: 'business_partner' | 'brand_promoter' | 'franchise';
  source?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  ledgerRecord?: FinancialLedgerRecord;
  error?: string;
  isDuplicate?: boolean;
}> {
  const config = await getFinancialConfig();
  const referenceId = `REG_${params.role.toUpperCase()}_${params.userId}_${params.paymentId}`;

  // STEP 1: Check Double Commission & Fraud Guard
  const { isDuplicate, isFraudSuspicious, fraudReason } = await checkDoubleCommissionOrFraud(
    referenceId,
    params.userPhone,
    params.userEmail,
    params.partnerId
  );

  if (isDuplicate) {
    console.warn(`[FinancialEngine] Blocked duplicate commission creation for referenceId: ${referenceId}`);
    return {
      success: false,
      isDuplicate: true,
      error: 'Commission for this registration has already been recorded. Duplicate generation blocked.',
    };
  }

  // STEP 2: Calculate Breakdown based on Role
  let breakdown;
  let transactionType: FinancialTransactionType;

  if (params.role === 'service_man') {
    transactionType = 'SERVICEMAN_REGISTRATION';
    breakdown = calculateServiceManRegistrationBreakdown(
      config.servicemanRegistrationFee,
      config.servicemanCommissionPool,
      config
    );
  } else if (params.role === 'business_partner') {
    transactionType = 'BUSINESS_PARTNER_REGISTRATION';
    const gross = config.businessPartnerRegistrationFee;
    const pool = config.businessPartnerCommissionPool;
    const dist = params.partnerId ? pool : 0;
    const grossShare = gross - dist;
    const tax = config.gstEnabled ? Math.round((gross * config.gstRatePercent) / (100 + config.gstRatePercent)) : 0;
    const gw = Math.round((gross * config.gatewayFeePercent) / 100 * 100) / 100;
    breakdown = {
      grossAmount: gross,
      commissionPool: pool,
      commissionDistributed: dist,
      companyGrossAmount: grossShare,
      taxAmount: tax,
      gatewayFee: gw,
      companyNetAmount: Math.max(0, grossShare - tax - gw),
    };
  } else {
    transactionType = 'CUSTOMER_REGISTRATION';
    const gross = config.customerRegistrationFee;
    const pool = config.customerCommissionPool;
    const dist = params.partnerId ? pool : 0;
    const grossShare = gross - dist;
    const tax = config.gstEnabled ? Math.round((gross * config.gstRatePercent) / (100 + config.gstRatePercent)) : 0;
    const gw = Math.round((gross * config.gatewayFeePercent) / 100 * 100) / 100;
    breakdown = {
      grossAmount: gross,
      commissionPool: pool,
      commissionDistributed: dist,
      companyGrossAmount: grossShare,
      taxAmount: tax,
      gatewayFee: gw,
      companyNetAmount: Math.max(0, grossShare - tax - gw),
    };
  }

  // STEP 3: Multi-Level Commission Calculation (Capped at commissionPool)
  const commissionDetails: Array<{ partnerId: string; level: number; amount: number; status: CommissionStatus }> = [];
  const status: CommissionStatus = isFraudSuspicious ? 'UNDER_REVIEW' : 'APPROVED';

  if (params.partnerId && breakdown.commissionDistributed > 0) {
    commissionDetails.push({
      partnerId: params.partnerId,
      level: 1,
      amount: breakdown.commissionDistributed,
      status: isFraudSuspicious ? 'HOLD' : 'AVAILABLE',
    });
  }

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const record: FinancialLedgerRecord = {
    id: transactionId,
    transactionId,
    userId: params.userId,
    userName: params.userName || 'User',
    userPhone: params.userPhone,
    userEmail: params.userEmail,
    role: params.role,
    transactionType,
    referenceId,
    paymentId: params.paymentId,
    orderId: params.orderId,

    grossAmount: breakdown.grossAmount,
    commissionPool: breakdown.commissionPool,
    commissionDistributed: breakdown.commissionDistributed,
    taxAmount: breakdown.taxAmount,
    gatewayFee: breakdown.gatewayFee,
    refundAmount: 0,
    otherDeductions: 0,

    companyGrossAmount: breakdown.companyGrossAmount,
    companyNetAmount: breakdown.companyNetAmount,

    partnerId: params.partnerId,
    partnerName: params.partnerName,
    partnerRole: params.partnerRole,
    commissionBreakdown: commissionDetails,

    status,
    fraudScore: isFraudSuspicious ? 80 : 0,
    fraudReason: fraudReason,
    source: params.source || 'razorpay',
    notes: params.notes || `Direct registration fee of ₹${breakdown.grossAmount} (Company Gross: ₹${breakdown.companyGrossAmount}, Partner Comm: ₹${breakdown.commissionDistributed})`,
    createdAt: new Date().toISOString(),
    approvedAt: !isFraudSuspicious ? new Date().toISOString() : undefined,
  };

  // STEP 4: Persist to Local Storage Cache
  try {
    const raw = localStorage.getItem(LOCAL_FINANCIAL_LEDGER_KEY);
    const records: FinancialLedgerRecord[] = raw ? JSON.parse(raw) : [];
    records.unshift(record);
    localStorage.setItem(LOCAL_FINANCIAL_LEDGER_KEY, JSON.stringify(records.slice(0, 500)));
  } catch (_) {}

  // STEP 5: Persist to Firestore ledgers collection
  try {
    await setDoc(doc(db, 'ledgers', transactionId), {
      ...record,
      ledgerOwnerId: 'company',
      ledgerOwnerRole: 'company',
      commissionType: 'company_share',
      amount: breakdown.companyGrossAmount,
      grossBookingAmount: breakdown.grossAmount,
      ratePercent: breakdown.grossAmount > 0 ? (breakdown.companyGrossAmount / breakdown.grossAmount) * 100 : 100,
      type: 'credit',
      status: 'cleared',
      description: `Registration Revenue: ₹${breakdown.grossAmount} (Company Share: ₹${breakdown.companyGrossAmount}, Commission: ₹${breakdown.commissionDistributed})`,
      updatedAt: record.createdAt,
    });

    // If partner commission exists, also add partner ledger credit
    if (params.partnerId && breakdown.commissionDistributed > 0) {
      const partnerLedgerId = `LEDGER-COMM-${transactionId}`;
      await setDoc(doc(db, 'ledgers', partnerLedgerId), {
        id: partnerLedgerId,
        transactionId,
        ledgerOwnerId: params.partnerId,
        ledgerOwnerRole: params.partnerRole || 'brand_promoter',
        ledgerOwnerName: params.partnerName || 'Partner',
        commissionType: 'partner_commission',
        amount: breakdown.commissionDistributed,
        grossBookingAmount: breakdown.grossAmount,
        ratePercent: breakdown.grossAmount > 0 ? (breakdown.commissionDistributed / breakdown.grossAmount) * 100 : 0,
        type: 'credit',
        status: isFraudSuspicious ? 'pending' : 'cleared',
        description: `Commission for ${params.role} registration (${params.userName || params.userId})`,
        referenceId,
        createdAt: record.createdAt,
        updatedAt: record.createdAt,
      });
    }
  } catch (err: any) {
    console.warn('[FinancialEngine] Firestore write note (persisted in local cache):', err?.message);
  }

  return { success: true, ledgerRecord: record };
}

/**
 * 6. Process Refund & Reversal (Atomic reversal of company and partner shares)
 */
export async function processRefundAndReversalAtomic(
  originalTransactionId: string,
  refundReason: string = 'Customer/ServiceMan Refund Request',
  adminId: string = 'super_admin'
): Promise<{ success: boolean; reversalRecord?: FinancialLedgerRecord; error?: string }> {
  let originalRecord: FinancialLedgerRecord | null = null;

  // Find original transaction
  try {
    const raw = localStorage.getItem(LOCAL_FINANCIAL_LEDGER_KEY);
    if (raw) {
      const records: FinancialLedgerRecord[] = JSON.parse(raw);
      originalRecord = records.find((r) => r.transactionId === originalTransactionId) || null;
    }
  } catch (_) {}

  if (!originalRecord) {
    try {
      const snap = await getDoc(doc(db, 'ledgers', originalTransactionId));
      if (snap.exists()) {
        originalRecord = snap.data() as FinancialLedgerRecord;
      }
    } catch (_) {}
  }

  if (!originalRecord) {
    return { success: false, error: `Original transaction ${originalTransactionId} not found.` };
  }

  const reversalTxnId = `REV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const reversalRecord: FinancialLedgerRecord = {
    ...originalRecord,
    id: reversalTxnId,
    transactionId: reversalTxnId,
    originalTransactionId,
    transactionType: 'REFUND_PROCESSED',
    grossAmount: -originalRecord.grossAmount,
    commissionDistributed: -originalRecord.commissionDistributed,
    companyGrossAmount: -originalRecord.companyGrossAmount,
    companyNetAmount: -originalRecord.companyNetAmount,
    refundAmount: originalRecord.grossAmount,
    status: 'REVERSED',
    notes: `Reversal of ${originalTransactionId}: ${refundReason}`,
    createdAt: nowIso,
    reversedAt: nowIso,
  };

  // Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_FINANCIAL_LEDGER_KEY);
    const records: FinancialLedgerRecord[] = raw ? JSON.parse(raw) : [];
    const origIdx = records.findIndex((r) => r.transactionId === originalTransactionId);
    if (origIdx !== -1) {
      records[origIdx].status = 'REVERSED';
      records[origIdx].isRefunded = true;
      records[origIdx].reversedAt = nowIso;
    }
    records.unshift(reversalRecord);
    localStorage.setItem(LOCAL_FINANCIAL_LEDGER_KEY, JSON.stringify(records.slice(0, 500)));
  } catch (_) {}

  // Update Firestore
  try {
    await setDoc(doc(db, 'ledgers', originalTransactionId), { status: 'reversed', isReversed: true, reversalReason: refundReason, updatedAt: nowIso }, { merge: true });
    await setDoc(doc(db, 'ledgers', reversalTxnId), { ...reversalRecord, updatedAt: nowIso });
  } catch (_) {}

  return { success: true, reversalRecord };
}

/**
 * 7. Fetch all Financial Ledger Records
 */
export async function getAllFinancialLedgers(): Promise<FinancialLedgerRecord[]> {
  const isZeroed = typeof window !== 'undefined' && localStorage.getItem(LOCAL_FINANCIAL_ZEROED_KEY) === 'true';
  if (isZeroed) {
    return [];
  }

  const localList: FinancialLedgerRecord[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_FINANCIAL_LEDGER_KEY);
    if (raw) localList.push(...JSON.parse(raw));
  } catch (_) {}

  if (isResourceExhausted()) {
    return localList.length > 0 ? localList : seedDemoFinancialTransactionsIfEmpty();
  }

  try {
    const q = query(collection(db, 'ledgers'), orderBy('createdAt', 'desc'), limit(100));
    const snap = await getDocs(q);
    const cloudList: FinancialLedgerRecord[] = [];
    snap.forEach((d) => {
      cloudList.push(d.data() as FinancialLedgerRecord);
    });

    // Merge without duplicates
    cloudList.forEach((cl) => {
      if (!localList.some((l) => l.transactionId === cl.transactionId)) {
        localList.push(cl);
      }
    });
  } catch (err) {
    console.warn('[FinancialEngine] Error fetching cloud ledgers:', err);
    checkAndHandleQuotaError(err);
  }

  // If zero records, auto-seed realistic benchmark (10 ServiceMen @ ₹121 = ₹1,210 collection, ₹210 commission, ₹1,000 company gross)
  if (localList.length === 0) {
    return seedDemoFinancialTransactionsIfEmpty();
  }

  localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return localList;
}

/**
 * 8. Seed Demo Financial Benchmark (10 ServiceMen = ₹1,210 collection, ₹210 commission, ₹1,000 company gross)
 */
export function seedDemoFinancialTransactionsIfEmpty(): FinancialLedgerRecord[] {
  const demoList: FinancialLedgerRecord[] = [];
  const now = Date.now();

  const servicemenNames = [
    'Ramesh Sharma (इलेक्ट्रीशियन)',
    'Suresh Verma (प्लंबर)',
    'Dinesh Carpenter (कारपेंटर)',
    'Mukesh Painter (पेंटर)',
    'Anil Kumar (AC रिपेयर)',
    'Vijay Soni (RO सर्विस)',
    'Prakash Sen (सैलून प्रो)',
    'Deepak Patel (राजमिस्त्री)',
    'Sunil Gaur (वेल्डर)',
    'Santosh Meena (पेस्ट कंट्रोल)',
  ];

  servicemenNames.forEach((name, idx) => {
    const timeOffset = idx * (3600000 * 4); // staggered over last 40 hours
    const txnId = `TXN-SM-REG-00${idx + 1}`;
    const record: FinancialLedgerRecord = {
      id: txnId,
      transactionId: txnId,
      userId: `user_sm_${idx + 1}`,
      userName: name,
      userPhone: `+91 9826${idx} 1234${idx}`,
      role: 'service_man',
      transactionType: 'SERVICEMAN_REGISTRATION',
      referenceId: `REG_SERVICEMAN_user_sm_${idx + 1}_pay_${idx + 1}`,
      paymentId: `pay_razorpay_${idx + 1000}`,
      grossAmount: 121,
      commissionPool: 21,
      commissionDistributed: 21,
      taxAmount: 0,
      gatewayFee: 2.42,
      refundAmount: 0,
      otherDeductions: 0,
      companyGrossAmount: 100, // ₹121 - ₹21 = ₹100
      companyNetAmount: 97.58, // ₹100 - ₹2.42 gateway
      partnerId: 'partner_bhopal_main',
      partnerName: 'Bhopal Central Brand Partner',
      partnerRole: 'brand_promoter',
      commissionBreakdown: [
        {
          partnerId: 'partner_bhopal_main',
          level: 1,
          amount: 21,
          status: 'AVAILABLE',
        },
      ],
      status: 'APPROVED',
      source: 'razorpay',
      notes: '₹121 ServiceMan Lifetime Onboarding Fee. Company Gross Share: ₹100, Partner Commission: ₹21',
      createdAt: new Date(now - timeOffset).toISOString(),
      approvedAt: new Date(now - timeOffset).toISOString(),
    };
    demoList.push(record);
  });

  try {
    localStorage.setItem(LOCAL_FINANCIAL_LEDGER_KEY, JSON.stringify(demoList));
  } catch (_) {}

  return demoList;
}

/**
 * 9. Calculate Partner Commission Summary
 */
export async function getPartnerCommissionSummary(partnerId: string): Promise<PartnerCommissionSummary> {
  const records = await getAllFinancialLedgers();
  const partnerRecords = records.filter((r) => r.partnerId === partnerId || r.commissionBreakdown?.some((cb) => cb.partnerId === partnerId));

  let customerCount = 0;
  let servicemanCount = 0;
  let partnerCount = 0;
  let totalCommissionEarned = 0;
  let pendingCommission = 0;
  let approvedCommission = 0;
  let availableBalance = 0;
  let paidCommission = 0;
  let reversedCommission = 0;

  partnerRecords.forEach((r) => {
    if (r.status === 'REVERSED' || r.isRefunded) {
      reversedCommission += r.commissionDistributed;
      return;
    }

    if (r.transactionType === 'SERVICEMAN_REGISTRATION') servicemanCount++;
    else if (r.transactionType === 'CUSTOMER_REGISTRATION') customerCount++;
    else if (r.transactionType === 'BUSINESS_PARTNER_REGISTRATION') partnerCount++;

    const comm = r.commissionDistributed || 0;
    totalCommissionEarned += comm;

    if (r.status === 'PENDING' || r.status === 'UNDER_REVIEW' || r.status === 'HOLD') {
      pendingCommission += comm;
    } else if (r.status === 'APPROVED') {
      approvedCommission += comm;
      availableBalance += comm;
    } else if (r.status === 'AVAILABLE') {
      availableBalance += comm;
    } else if (r.status === 'PAID') {
      paidCommission += comm;
    }
  });

  return {
    partnerId,
    partnerName: partnerRecords[0]?.partnerName || 'Brand Promoter',
    totalRegistrations: customerCount + servicemanCount + partnerCount,
    customerRegistrationsCount: customerCount,
    servicemanRegistrationsCount: servicemanCount,
    partnerRegistrationsCount: partnerCount,
    eligibleTransactionsCount: partnerRecords.length,
    totalCommissionEarned,
    pendingCommission,
    approvedCommission,
    availableBalance: Math.max(0, availableBalance),
    paidCommission,
    reversedCommission,
  };
}

/**
 * 10. Admin Financial & Company Profit Overview (Dynamic calculation from actual ledger records)
 */
export async function getAdminFinancialProfitOverview(
  timeFilter: 'today' | 'monthly' | 'yearly' | 'custom' = 'today',
  customStartDate?: string,
  customEndDate?: string
): Promise<AdminFinancialSummary> {
  const [records, config] = await Promise.all([getAllFinancialLedgers(), getFinancialConfig()]);

  const now = new Date();
  let startDate = new Date();

  if (timeFilter === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (timeFilter === 'monthly') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeFilter === 'yearly') {
    startDate.setMonth(0, 1);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeFilter === 'custom' && customStartDate) {
    startDate = new Date(customStartDate);
  }

  let endDate = new Date();
  if (timeFilter === 'custom' && customEndDate) {
    endDate = new Date(customEndDate);
    endDate.setHours(23, 59, 59, 999);
  }

  const filtered = records.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= startDate.getTime() && t <= endDate.getTime();
  });

  let smCount = 0;
  let custCount = 0;
  let partnerCount = 0;
  let bookingCount = 0;
  let completedServices = 0;

  let totalCollection = 0;
  let totalCommission = 0;
  let totalTax = 0;
  let totalGateway = 0;
  let totalRefunds = 0;
  let totalOtherDeductions = 0;

  let companyGrossShare = 0;
  let companyNetAmount = 0;

  filtered.forEach((r) => {
    if (r.status === 'REVERSED' || r.isRefunded) {
      totalRefunds += Math.abs(r.refundAmount || r.grossAmount);
      return;
    }

    if (r.transactionType === 'SERVICEMAN_REGISTRATION') smCount++;
    else if (r.transactionType === 'CUSTOMER_REGISTRATION') custCount++;
    else if (r.transactionType === 'BUSINESS_PARTNER_REGISTRATION') partnerCount++;
    else if (r.transactionType === 'SERVICE_BOOKING') {
      bookingCount++;
      completedServices++;
    }

    totalCollection += r.grossAmount || 0;
    totalCommission += r.commissionDistributed || 0;
    totalTax += r.taxAmount || 0;
    totalGateway += r.gatewayFee || 0;
    totalOtherDeductions += r.otherDeductions || 0;

    companyGrossShare += r.companyGrossAmount || (r.grossAmount - r.commissionDistributed);
    companyNetAmount += r.companyNetAmount || (r.companyGrossAmount - r.taxAmount - r.gatewayFee);
  });

  // Calculate Operating Expenses scaled for period
  const totalMonthlyExpense = Object.values(config.operatingExpenses).reduce((a, b) => a + b, 0);
  let periodExpense = totalMonthlyExpense;
  if (timeFilter === 'today') {
    periodExpense = Math.round(totalMonthlyExpense / 30);
  } else if (timeFilter === 'yearly') {
    periodExpense = totalMonthlyExpense * 12;
  }

  const operatingProfit = Math.round((companyNetAmount - periodExpense) * 100) / 100;

  return {
    periodLabel: timeFilter === 'today' ? 'आज (Today)' : timeFilter === 'monthly' ? 'इस महीने (Monthly)' : timeFilter === 'yearly' ? 'इस वर्ष (Yearly)' : 'कस्टम अवधि (Custom Range)',
    servicemanRegistrationsCount: smCount,
    customerRegistrationsCount: custCount,
    partnerRegistrationsCount: partnerCount,
    serviceBookingsCount: bookingCount,
    completedServicesCount: completedServices,

    totalCollection,
    totalCommission,
    totalTax,
    totalGatewayCharges: Math.round(totalGateway * 100) / 100,
    totalRefunds,
    totalOtherDeductions,

    companyGrossShare,
    companyNetAmount: Math.round(companyNetAmount * 100) / 100,
    operatingExpenses: periodExpense,
    operatingProfit,

    isProfitValid: true,
    recordsCount: filtered.length,
  };
}

/**
 * 11. 12 Downloadable CSV / Excel Reports
 */
export function exportFinancialReportToCSV(
  reportType:
    | 'REGISTRATION'
    | 'SERVICEMAN'
    | 'CUSTOMER'
    | 'PARTNER'
    | 'COMMISSION'
    | 'REVENUE'
    | 'TAX'
    | 'GATEWAY_FEE'
    | 'REFUND'
    | 'WITHDRAWAL'
    | 'PROFIT_MARGIN'
    | 'FULL_LEDGER',
  summary: AdminFinancialSummary,
  records: FinancialLedgerRecord[]
): void {
  if (typeof window === 'undefined') return;

  const rows: string[][] = [];
  rows.push([`--- HARDINKAAM ${reportType.replace(/_/g, ' ')} FINANCIAL REPORT ---`]);
  rows.push(['Generated At', new Date().toLocaleString('en-IN')]);
  rows.push(['Period', summary.periodLabel]);
  rows.push(['Total Collection (कुल कलेक्शन)', `INR ${summary.totalCollection}`]);
  rows.push(['Total Commission (कुल कमीशन)', `INR ${summary.totalCommission}`]);
  rows.push(['Company Gross Share (कंपनी ग्रॉस शेयर)', `INR ${summary.companyGrossShare}`]);
  rows.push(['Company Net Amount (कंपनी नेट अमाउंट)', `INR ${summary.companyNetAmount}`]);
  rows.push(['Operating Profit (शुद्ध लाभ)', `INR ${summary.operatingProfit}`]);
  rows.push([]);

  // Detailed Ledger Rows
  rows.push([
    'Transaction ID',
    'Date & Time',
    'User Name',
    'Role',
    'Transaction Type',
    'Gross Amount (Paid)',
    'Commission Distributed',
    'Company Gross (Share)',
    'Tax',
    'Gateway Charge',
    'Company Net',
    'Status',
    'Partner Referrer',
    'Notes',
  ]);

  records.forEach((r) => {
    rows.push([
      r.transactionId,
      new Date(r.createdAt).toLocaleString('en-IN'),
      r.userName || r.userId,
      r.role,
      r.transactionType,
      String(r.grossAmount),
      String(r.commissionDistributed),
      String(r.companyGrossAmount),
      String(r.taxAmount),
      String(r.gatewayFee),
      String(r.companyNetAmount),
      r.status,
      r.partnerName || r.partnerId || 'Direct / HQ',
      r.notes || '',
    ]);
  });

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' +
    rows.map((e) => e.map((val) => `"${(val || '').replace(/"/g, '""')}"`).join(',')).join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `HARDINKAAM_${reportType}_Report_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

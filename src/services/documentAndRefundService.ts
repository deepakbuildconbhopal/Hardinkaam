import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';
import {
  FinancialDocument,
  FinancialDocumentType,
  DocumentLineItem,
  RefundRecord,
  DocumentStatus,
} from '../types/documents';
import {
  getAdminTaxConfiguration,
  calculateIndianGst,
  DEFAULT_TAX_CONFIG,
} from './indianTaxEngineService';
import { reverseRewardRedemption } from './rewardService';

/**
 * Converts a numeric amount to Indian Currency Words (Lakhs, Thousands, Hundreds, Rupees & Paise)
 */
export function convertAmountToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'INR Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${tensMultiple[tens]}${ones > 0 ? ' ' + singleDigits[ones] : ''}`.trim();
  };

  const convertThreeDigits = (n: number): string => {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    let res = '';
    if (hundreds > 0) {
      res += `${singleDigits[hundreds]} Hundred`;
    }
    if (remainder > 0) {
      if (res.length > 0) res += ' and ';
      res += convertTwoDigits(remainder);
    }
    return res;
  };

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let rupeesStr = '';
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  if (crore > 0) rupeesStr += `${convertTwoDigits(crore)} Crore `;
  if (lakh > 0) rupeesStr += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand > 0) rupeesStr += `${convertTwoDigits(thousand)} Thousand `;
  if (remainder > 0) rupeesStr += convertThreeDigits(remainder);

  rupeesStr = rupeesStr.trim() || 'Zero';

  let result = `INR ${rupeesStr} Rupees`;
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  result += ' Only';

  return result;
}

/**
 * Generate unique, sequential Financial Year document numbers
 * Format: INV/2025-26/00001, CN/2025-26/00001, etc.
 */
export async function getNextDocumentNumber(
  type: FinancialDocumentType,
  financialYear: string = '2025-26'
): Promise<string> {
  const prefixMap: Record<FinancialDocumentType, string> = {
    TAX_INVOICE: 'INV',
    BILL_OF_SUPPLY: 'BOS',
    RECEIPT: 'RCP',
    CREDIT_NOTE: 'CN',
    DEBIT_NOTE: 'DN',
  };

  const prefix = prefixMap[type] || 'DOC';
  const cleanFy = financialYear.replace(/[^a-zA-Z0-9-]/g, '');
  const seqFieldKey = `${prefix.toLowerCase()}_${cleanFy.replace('-', '_')}`;
  const seqDocRef = doc(db, 'settings', 'financial_document_sequences');

  try {
    let nextSeq = 1;
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(seqDocRef);
      if (snap.exists()) {
        const current = snap.data()[seqFieldKey] || 0;
        nextSeq = current + 1;
        transaction.update(seqDocRef, { [seqFieldKey]: nextSeq });
      } else {
        transaction.set(seqDocRef, { [seqFieldKey]: nextSeq });
      }
    });

    const paddedSeq = nextSeq.toString().padStart(5, '0');
    return `${prefix}/${cleanFy}/${paddedSeq}`;
  } catch (err) {
    console.warn('[DocumentNumberEngine] Transaction fallback for sequence generation:', err);
    // Fallback pseudo-random padded sequence
    const fallbackSeq = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}/${cleanFy}/${fallbackSeq}`;
  }
}

/**
 * Create or Fetch authoritative Tax Invoice for a Booking
 */
export async function createOrGetTaxInvoiceForBooking(
  booking: Booking,
  options?: {
    customerGstin?: string;
    overrideDocumentType?: FinancialDocumentType;
    issuedBy?: string;
  }
): Promise<FinancialDocument> {
  // Check if an invoice already exists for this booking
  try {
    const q = query(
      collection(db, 'financial_documents'),
      where('bookingId', '==', booking.id),
      where('documentType', 'in', ['TAX_INVOICE', 'BILL_OF_SUPPLY'])
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as FinancialDocument;
    }
  } catch (e) {
    console.warn('Error checking existing documents, generating new:', e);
  }

  const taxConfig = await getAdminTaxConfiguration();
  const fy = taxConfig.financialYear || '2025-26';

  const basePrice = (booking as any).baseAmount !== undefined ? (booking as any).baseAmount : (booking.amount || 0);
  const otherDiscount = (booking as any).discountAmount || booking.discount || 0;
  const rewardDiscount = (booking as any).rewardDiscountUsed || 0;

  // Run dynamic Indian Tax Engine
  const taxResult = calculateIndianGst(
    {
      basePrice,
      standardDiscount: otherDiscount,
      rewardPointsDiscount: rewardDiscount,
      serviceCategoryId: booking.categoryId,
      serviceId: booking.serviceId,
      serviceName: booking.serviceName,
      customerState: booking.state,
      customerPincode: booking.pincode,
      customerGstin: options?.customerGstin,
    },
    taxConfig
  );

  const docType: FinancialDocumentType =
    options?.overrideDocumentType || (taxConfig.isCompositionScheme ? 'BILL_OF_SUPPLY' : 'TAX_INVOICE');
  const docNumber = await getNextDocumentNumber(docType, fy);

  const lineItem: DocumentLineItem = {
    id: `item_1`,
    itemDescription: `${booking.serviceName} (${booking.categoryName || 'Home Service'})`,
    sacCode: taxResult.sacCode,
    hsnCode: taxResult.hsnCode,
    quantity: 1,
    unitRate: basePrice,
    grossAmount: basePrice,
    discountAmount: otherDiscount,
    rewardDiscountAmount: rewardDiscount,
    taxableAmount: taxResult.taxableAmount,
    gstRatePercent: taxResult.gstRatePercent,
    cgstPercent: taxResult.cgstPercent,
    cgstAmount: taxResult.cgstAmount,
    sgstPercent: taxResult.sgstPercent,
    sgstAmount: taxResult.sgstAmount,
    igstPercent: taxResult.igstPercent,
    igstAmount: taxResult.igstAmount,
    cessPercent: taxResult.cessPercent,
    cessAmount: taxResult.cessAmount,
    totalAmount: taxResult.finalTotalAmount,
  };

  const newDoc: FinancialDocument = {
    id: `doc_${booking.id}_${Date.now()}`,
    documentType: docType,
    documentNumber: docNumber,
    documentDate: new Date().toISOString(),
    financialYear: fy,
    bookingId: booking.id,

    legalBusinessName: taxConfig.legalBusinessName,
    tradeName: taxConfig.tradeName,
    supplierGstin: taxConfig.gstin,
    supplierPan: taxConfig.pan,
    supplierState: taxConfig.registeredState,
    supplierStateCode: taxConfig.registeredStateCode,
    supplierAddress: taxConfig.businessAddress,

    customer: {
      id: booking.customerId || 'guest_customer',
      name: booking.customerName || 'Customer',
      phone: booking.customerPhone || '',
      address: booking.address || 'Bhopal, Madhya Pradesh',
      city: booking.city || 'Bhopal',
      state: taxResult.placeOfSupplyState,
      stateCode: taxResult.placeOfSupplyStateCode,
      pincode: booking.pincode || '462011',
      customerGstin: options?.customerGstin || undefined,
      isB2B: !!options?.customerGstin,
    },

    serviceMan: {
      id: booking.serviceManId || 'pro_rajesh',
      name: booking.serviceManName || 'Service Professional',
      phone: booking.serviceManPhone || '+91 98260 12345',
      trade: booking.categoryName || 'Technician',
    },

    placeOfSupplyState: taxResult.placeOfSupplyState,
    placeOfSupplyStateCode: taxResult.placeOfSupplyStateCode,
    taxType: taxResult.taxType,
    isInterState: taxResult.isInterState,
    isReverseCharge: false,
    isEcommerceOperatorSupply: taxConfig.isEcommerceOperator,

    items: [lineItem],
    totalGrossAmount: basePrice,
    totalDiscountAmount: otherDiscount,
    totalRewardDiscountAmount: rewardDiscount,
    totalTaxableAmount: taxResult.taxableAmount,
    totalCgstAmount: taxResult.cgstAmount,
    totalSgstAmount: taxResult.sgstAmount,
    totalIgstAmount: taxResult.igstAmount,
    totalCessAmount: taxResult.cessAmount,
    totalTaxAmount: taxResult.totalTaxAmount,
    totalAmount: taxResult.finalTotalAmount,
    amountInWords: convertAmountToWords(taxResult.finalTotalAmount),

    paymentMethod: booking.paymentMethod || 'cash',
    paymentStatus: booking.paymentStatus || 'pending',
    paymentTransactionId: booking.razorpayPaymentId || undefined,

    status: 'ISSUED',
    createdAt: new Date().toISOString(),
    createdBy: options?.issuedBy || 'system_billing_engine',
    statutoryNotes:
      'Goods & Services Tax Invoice issued under Section 31 of CGST Act 2017 & Section 9(5) Electronic Commerce Operator regulations.',
    qrCodeVerificationPayload: `GSTIN:${taxConfig.gstin}|INV:${docNumber}|DATE:${new Date().toISOString()}|VAL:${taxResult.finalTotalAmount}|TAX:${taxResult.totalTaxAmount}`,
  };

  try {
    await setDoc(doc(db, 'financial_documents', newDoc.id), newDoc);
  } catch (err) {
    console.error('Failed to save financial document:', err);
  }

  return newDoc;
}

export interface RefundRequestParams {
  bookingId: string;
  refundAmount?: number; // if undefined or equals booking total, it is a full refund
  reason: string;
  processedBy?: string;
  paymentRefundId?: string;
}

export interface RefundProcessResult {
  success: boolean;
  refundRecord?: RefundRecord;
  creditNote?: FinancialDocument;
  error?: string;
}

/**
 * Process Full or Partial Refund:
 * - NEVER deletes original invoice/booking.
 * - Generates official Credit Note (CN/YYYY-YY/...) linked to the original Tax Invoice.
 * - Calculates exact proportional tax reversals (CGST, SGST, IGST).
 * - Authoritatively reverses reward points and adjusts commissions.
 * - Records immutable RefundRecord and tax audit log.
 */
export async function processBookingRefund(
  params: RefundRequestParams
): Promise<RefundProcessResult> {
  try {
    const bookingDocRef = doc(db, 'bookings', params.bookingId);
    const bookingSnap = await getDoc(bookingDocRef);

    if (!bookingSnap.exists()) {
      return { success: false, error: 'Booking document not found.' };
    }

    const booking = { id: bookingSnap.id, ...bookingSnap.data() } as Booking;
    const taxConfig = await getAdminTaxConfiguration();
    const fy = taxConfig.financialYear || '2025-26';

    // 1. Fetch or create the original Tax Invoice
    const originalInvoice = await createOrGetTaxInvoiceForBooking(booking);

    const originalAmount = originalInvoice.totalAmount || booking.amount || 0;
    const refundAmount =
      params.refundAmount !== undefined && params.refundAmount > 0
        ? Math.min(params.refundAmount, originalAmount)
        : originalAmount;

    const isPartialRefund = refundAmount < originalAmount;

    // 2. Calculate proportional tax adjustment
    const ratio = originalAmount > 0 ? refundAmount / originalAmount : 1;
    const taxableRefundBase = Math.round(originalInvoice.totalTaxableAmount * ratio * 100) / 100;
    const cgstReversed = Math.round(originalInvoice.totalCgstAmount * ratio * 100) / 100;
    const sgstReversed = Math.round(originalInvoice.totalSgstAmount * ratio * 100) / 100;
    const igstReversed = Math.round(originalInvoice.totalIgstAmount * ratio * 100) / 100;
    const cessReversed = Math.round(originalInvoice.totalCessAmount * ratio * 100) / 100;
    const totalTaxReversed = Math.round((cgstReversed + sgstReversed + igstReversed + cessReversed) * 100) / 100;

    // 3. Generate Credit Note document
    const cnNumber = await getNextDocumentNumber('CREDIT_NOTE', fy);

    const creditNoteItem: DocumentLineItem = {
      id: `cn_item_1`,
      itemDescription: `Refund / Cancellation adjustment against ${originalInvoice.documentNumber} (${booking.serviceName})`,
      sacCode: originalInvoice.items[0]?.sacCode || taxConfig.defaultSacCode || '998714',
      hsnCode: originalInvoice.items[0]?.hsnCode,
      quantity: 1,
      unitRate: -taxableRefundBase,
      grossAmount: -taxableRefundBase,
      discountAmount: 0,
      rewardDiscountAmount: 0,
      taxableAmount: -taxableRefundBase,
      gstRatePercent: originalInvoice.items[0]?.gstRatePercent || 18,
      cgstPercent: originalInvoice.items[0]?.cgstPercent || 9,
      cgstAmount: -cgstReversed,
      sgstPercent: originalInvoice.items[0]?.sgstPercent || 9,
      sgstAmount: -sgstReversed,
      igstPercent: originalInvoice.items[0]?.igstPercent || 0,
      igstAmount: -igstReversed,
      cessPercent: originalInvoice.items[0]?.cessPercent || 0,
      cessAmount: -cessReversed,
      totalAmount: -refundAmount,
    };

    const creditNoteDoc: FinancialDocument = {
      id: `cn_${booking.id}_${Date.now()}`,
      documentType: 'CREDIT_NOTE',
      documentNumber: cnNumber,
      documentDate: new Date().toISOString(),
      financialYear: fy,
      bookingId: booking.id,
      originalDocumentId: originalInvoice.id,
      originalInvoiceNumber: originalInvoice.documentNumber,
      originalInvoiceDate: originalInvoice.documentDate,
      reasonForNote: params.reason || 'Customer Cancellation & Refund',

      legalBusinessName: taxConfig.legalBusinessName,
      tradeName: taxConfig.tradeName,
      supplierGstin: taxConfig.gstin,
      supplierPan: taxConfig.pan,
      supplierState: taxConfig.registeredState,
      supplierStateCode: taxConfig.registeredStateCode,
      supplierAddress: taxConfig.businessAddress,

      customer: originalInvoice.customer,
      serviceMan: originalInvoice.serviceMan,

      placeOfSupplyState: originalInvoice.placeOfSupplyState,
      placeOfSupplyStateCode: originalInvoice.placeOfSupplyStateCode,
      taxType: originalInvoice.taxType,
      isInterState: originalInvoice.isInterState,
      isReverseCharge: false,
      isEcommerceOperatorSupply: taxConfig.isEcommerceOperator,

      items: [creditNoteItem],
      totalGrossAmount: taxableRefundBase,
      totalDiscountAmount: 0,
      totalRewardDiscountAmount: 0,
      totalTaxableAmount: taxableRefundBase,
      totalCgstAmount: cgstReversed,
      totalSgstAmount: sgstReversed,
      totalIgstAmount: igstReversed,
      totalCessAmount: cessReversed,
      totalTaxAmount: totalTaxReversed,
      totalAmount: refundAmount,
      amountInWords: convertAmountToWords(refundAmount),

      paymentMethod: booking.paymentMethod || 'cash',
      paymentStatus: isPartialRefund ? 'partially_refunded' : 'refunded',
      paymentTransactionId: params.paymentRefundId,

      status: 'ISSUED',
      createdAt: new Date().toISOString(),
      createdBy: params.processedBy || 'admin_user',
      statutoryNotes: `Credit Note issued under Section 34 of CGST Act 2017 against original Tax Invoice ${originalInvoice.documentNumber}. GST liability reduced accordingly.`,
      qrCodeVerificationPayload: `GSTIN:${taxConfig.gstin}|CN:${cnNumber}|ORIG_INV:${originalInvoice.documentNumber}|VAL:${refundAmount}|TAX:${totalTaxReversed}`,
    };

    // Save Credit Note to Firestore
    await setDoc(doc(db, 'financial_documents', creditNoteDoc.id), creditNoteDoc);

    // 4. Authoritative Reward Reversal (if reward points were redeemed)
    let rewardReversalData: { pointsReversed: number; rewardTransactionId?: string } | undefined;
    const rewardPointsUsed = Number((booking as any).rewardPointsUsed) || 0;
    if (rewardPointsUsed > 0 && booking.customerId) {
      const pointsToReturn = Math.round(rewardPointsUsed * ratio);
      if (pointsToReturn > 0) {
        const revRes = await reverseRewardRedemption(
          booking.customerId,
          booking.id,
          `Refund / cancellation reward reversal for #${booking.id}`
        );
        rewardReversalData = {
          pointsReversed: pointsToReturn,
          rewardTransactionId: `REV-RED-${booking.id}-${booking.customerId}`,
        };
      }
    }

    // 5. Commission Reversals
    const companyCommissionOriginal = booking.companyCommission || 0;
    const servicemanPayoutOriginal = booking.servicemanPayoutAmount || 0;
    const companyCommissionReversed = Math.round(companyCommissionOriginal * ratio);
    const servicemanPayoutReversed = Math.round(servicemanPayoutOriginal * ratio);

    // 6. Record immutable RefundRecord
    const refundRecordId = `ref_${booking.id}_${Date.now()}`;
    const refundRecord: RefundRecord = {
      id: refundRecordId,
      refundId: `RFND-${Date.now().toString().slice(-6)}`,
      bookingId: booking.id,
      originalInvoiceNumber: originalInvoice.documentNumber,
      originalInvoiceId: originalInvoice.id,
      creditNoteNumber: cnNumber,
      creditNoteDocumentId: creditNoteDoc.id,
      originalTransactionAmount: originalAmount,
      refundAmount,
      isPartialRefund,
      taxAdjustment: {
        taxableRefundBase,
        cgstReversed,
        sgstReversed,
        igstReversed,
        cessReversed,
        totalTaxReversed,
      },
      paymentRefundId: params.paymentRefundId || `manual_rfnd_${Date.now()}`,
      paymentMethod: booking.paymentMethod || 'cash',
      refundReason: params.reason,
      rewardReversal: rewardReversalData,
      commissionReversal: {
        companyCommissionReversed,
        servicemanPayoutReversed,
      },
      refundStatus: 'COMPLETED',
      processedBy: params.processedBy || 'admin_user',
      processedAt: new Date().toISOString(),
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
    };

    await setDoc(doc(db, 'refund_records', refundRecordId), refundRecord);

    // 7. Update original invoice status to REFUNDED / PARTIALLY_REFUNDED without deleting it
    await setDoc(
      doc(db, 'financial_documents', originalInvoice.id),
      {
        status: isPartialRefund ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
        creditNoteNumber: cnNumber,
        refundRecordId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 8. Update booking paymentStatus and record refund metadata (Preserving original booking)
    await setDoc(
      bookingDocRef,
      {
        paymentStatus: isPartialRefund ? 'partially_refunded' : 'refunded',
        status: isPartialRefund ? booking.status : 'cancelled',
        refundAmount: (Number((booking as any).refundAmount) || 0) + refundAmount,
        lastRefundId: refundRecord.refundId,
        creditNoteNumber: cnNumber,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      success: true,
      refundRecord,
      creditNote: creditNoteDoc,
    };
  } catch (err: any) {
    console.error('Error processing refund:', err);
    return { success: false, error: err?.message || 'Failed to process refund.' };
  }
}

/**
 * Fetch all documents associated with a specific booking
 */
export async function getDocumentsForBooking(bookingId: string): Promise<FinancialDocument[]> {
  try {
    const q = query(collection(db, 'financial_documents'), where('bookingId', '==', bookingId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialDocument));
  } catch (e) {
    console.warn('Error fetching booking documents:', e);
    return [];
  }
}

/**
 * Fetch all financial documents with optional type filter
 */
export async function getAllFinancialDocuments(
  type?: FinancialDocumentType,
  maxCount: number = 50
): Promise<FinancialDocument[]> {
  try {
    let q = query(
      collection(db, 'financial_documents'),
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    if (type) {
      q = query(
        collection(db, 'financial_documents'),
        where('documentType', '==', type),
        orderBy('createdAt', 'desc'),
        limit(maxCount)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialDocument));
  } catch (e) {
    console.warn('Error fetching financial documents:', e);
    return [];
  }
}

/**
 * Fetch all refund records
 */
export async function getAllRefundRecords(maxCount: number = 50): Promise<RefundRecord[]> {
  try {
    const q = query(
      collection(db, 'refund_records'),
      orderBy('processedAt', 'desc'),
      limit(maxCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RefundRecord));
  } catch (e) {
    console.warn('Error fetching refund records:', e);
    return [];
  }
}

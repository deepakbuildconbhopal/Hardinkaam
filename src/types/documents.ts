import { GstTaxType } from './tax';

export type FinancialDocumentType =
  | 'TAX_INVOICE'
  | 'BILL_OF_SUPPLY'
  | 'RECEIPT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE';

export type DocumentStatus = 'ISSUED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'ADJUSTED';

export interface DocumentLineItem {
  id: string;
  itemDescription: string;
  sacCode: string;
  hsnCode?: string;
  quantity: number;
  unitRate: number;
  grossAmount: number;
  discountAmount: number;
  rewardDiscountAmount: number;
  taxableAmount: number;
  gstRatePercent: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  cessPercent: number;
  cessAmount: number;
  totalAmount: number;
}

export interface FinancialDocument {
  id: string;
  documentType: FinancialDocumentType;
  documentNumber: string; // e.g. INV/2025-26/00001, CN/2025-26/00001
  documentDate: string;
  financialYear: string; // e.g. 2025-26
  bookingId: string;
  
  // Linkages for Credit/Debit Notes
  originalDocumentId?: string;
  originalInvoiceNumber?: string;
  originalInvoiceDate?: string;
  reasonForNote?: string;

  // Supplier Details
  legalBusinessName: string;
  tradeName: string;
  supplierGstin: string;
  supplierPan: string;
  supplierState: string;
  supplierStateCode: string;
  supplierAddress: {
    street: string;
    locality: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
  };

  // Recipient / Customer Details
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address: string;
    city?: string;
    state: string;
    stateCode: string;
    pincode: string;
    customerGstin?: string; // B2B
    isB2B: boolean;
  };

  // Service Professional
  serviceMan?: {
    id: string;
    name: string;
    phone: string;
    trade?: string;
  };

  // Place of Supply & Tax Treatment
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  taxType: GstTaxType;
  isInterState: boolean;
  isReverseCharge: boolean;
  isEcommerceOperatorSupply: boolean;

  // Financial Totals
  items: DocumentLineItem[];
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalRewardDiscountAmount: number;
  totalTaxableAmount: number;
  totalCgstAmount: number;
  totalSgstAmount: number;
  totalIgstAmount: number;
  totalCessAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  amountInWords: string;

  // Payment Details
  paymentMethod: string;
  paymentStatus: string;
  paymentTransactionId?: string;

  // Status & Metadata
  status: DocumentStatus;
  createdAt: string;
  createdBy: string;
  statutoryNotes?: string;
  qrCodeVerificationPayload?: string;
}

export interface RefundRecord {
  id: string;
  refundId: string; // Unique refund identifier
  bookingId: string;
  originalInvoiceNumber: string;
  originalInvoiceId?: string;
  creditNoteNumber: string;
  creditNoteDocumentId: string;
  
  // Amounts
  originalTransactionAmount: number;
  refundAmount: number;
  isPartialRefund: boolean;
  
  // Tax Adjustments
  taxAdjustment: {
    taxableRefundBase: number;
    cgstReversed: number;
    sgstReversed: number;
    igstReversed: number;
    cessReversed: number;
    totalTaxReversed: number;
  };

  // Gateway & Method
  paymentRefundId: string; // Gateway refund ID or manual cash ref
  paymentMethod: string;
  refundReason: string;
  
  // Ledger & Reversals
  rewardReversal?: {
    pointsReversed: number;
    rewardTransactionId?: string;
  };
  commissionReversal?: {
    companyCommissionReversed: number;
    servicemanPayoutReversed: number;
  };

  refundStatus: 'COMPLETED' | 'INITIATED' | 'FAILED';
  processedBy: string;
  processedAt: string;
  customerName?: string;
  customerPhone?: string;
}

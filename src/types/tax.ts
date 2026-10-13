export type GstTaxType = 'INTRA_STATE' | 'INTER_STATE' | 'EXEMPT' | 'ZERO_RATED' | 'RCM';

export type CaReviewStatus = 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'DRAFT';

export interface IndianState {
  code: string;
  name: string;
  isUnionTerritory: boolean;
}

export interface SacTaxRule {
  id: string;
  sacCode: string;
  hsnCode?: string;
  serviceCategoryId?: string;
  serviceCategoryName?: string;
  serviceId?: string;
  serviceName?: string;
  ruleName: string;
  description: string;
  gstRatePercent: number; // e.g. 18, 12, 5, 0, 28
  cgstPercent: number; // e.g. 9
  sgstPercent: number; // e.g. 9
  igstPercent: number; // e.g. 18
  cessPercent: number; // e.g. 0
  isTaxInclusive: boolean; // false = base + GST, true = inclusive
  effectiveFrom: string; // YYYY-MM-DD
  effectiveUntil?: string; // YYYY-MM-DD or empty for ongoing
  section9_5Applicable: boolean; // E-Commerce operator liability under Sec 9(5) CGST Act
  rcmApplicable: boolean; // Reverse Charge Mechanism
  exemptionNotification?: string;
  version: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TcsTdsConfig {
  tcsEnabled: boolean;
  tcsRatePercent: number; // default 1.0 (0.5% CGST + 0.5% SGST or 1% IGST u/s 52)
  tcsThresholdAnnual: number; // e.g. 0 or 2000000
  tcsEffectiveFrom: string;
  tcsEffectiveUntil?: string;
  tcsSection: string; // e.g. "Section 52 CGST Act (TCS on E-Commerce)"
  tdsEnabled: boolean;
  tdsSection: string; // e.g. "Section 194-O (TDS on E-Commerce participants)"
  tdsRateWithPanPercent: number; // default 1.0%
  tdsRateWithoutPanPercent: number; // default 5.0%
  tdsThresholdAnnual: number; // e.g. 500000
  tdsEffectiveFrom: string;
  tdsEffectiveUntil?: string;
  tdsDeductAtSource: boolean;
}

export interface AdminTaxConfiguration {
  id: string;
  legalBusinessName: string;
  tradeName: string;
  pan: string;
  gstin: string;
  registeredState: string;
  registeredStateCode: string;
  businessAddress: {
    street: string;
    locality: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
  };
  financialYear: string; // e.g. "2025-26"
  taxRuleVersion: string; // e.g. "v2026.1"
  isCompositionScheme: boolean;
  isEcommerceOperator: boolean;
  defaultSacCode: string; // e.g. "998714"
  defaultGstRatePercent: number; // e.g. 18
  defaultPricingMode: 'inclusive' | 'exclusive';
  caReviewStatus: CaReviewStatus;
  caReviewedBy: string;
  caReviewNotes: string;
  caReviewTimestamp: string;
  statutoryDisclaimer: string;
  tcsTdsConfig: TcsTdsConfig;
  taxRules: SacTaxRule[];
  updatedAt: string;
  updatedBy: string;
}

export interface TaxCalculationInput {
  serviceId?: string;
  serviceCategoryId?: string;
  serviceName?: string;
  basePrice: number;
  standardDiscount?: number;
  rewardPointsDiscount?: number;
  couponDiscount?: number;
  customerStateCode?: string;
  customerState?: string;
  customerDistrict?: string;
  customerPincode?: string;
  customerGstin?: string;
  overrideSacCode?: string;
  calculationDate?: string;
  isB2B?: boolean;
}

export interface TaxCalculationResult {
  taxRuleId: string;
  taxRuleVersion: string;
  sacCode: string;
  hsnCode?: string;
  ruleName: string;
  taxType: GstTaxType;
  supplierState: string;
  supplierStateCode: string;
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  isInterState: boolean;
  isTaxInclusive: boolean;
  
  // Amounts
  baseGrossAmount: number;
  standardDiscount: number;
  rewardPointsDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  taxableAmount: number;
  
  // GST Tax Components
  gstRatePercent: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  igstPercent: number;
  igstAmount: number;
  cessPercent: number;
  cessAmount: number;
  totalTaxAmount: number;
  
  // Final Payable
  finalTotalAmount: number;
  
  // Statutory Withholding & ECO details
  tcsApplicable: boolean;
  tcsRatePercent: number;
  tcsAmount: number;
  tdsApplicable: boolean;
  tdsRatePercent: number;
  tdsAmount: number;
  section9_5Applicable: boolean;
  
  // Operational Segregation
  statutoryTaxLiability: number; // Real GST to be deposited with Govt
  netOperationalRevenue: number; // Real operating base for platform & professional
  
  calculatedAt: string;
  taxEngineVersion: string;
  caReviewed: boolean;
}

export interface TaxAuditRecord {
  id: string;
  bookingId?: string;
  invoiceNumber?: string;
  transactionId?: string;
  customerId?: string;
  customerGstin?: string;
  serviceManId?: string;
  calculation: TaxCalculationResult;
  timestamp: string;
  financialYear: string;
  placeOfSupplyCode: string;
  sacCode: string;
}

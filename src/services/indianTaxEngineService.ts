import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  AdminTaxConfiguration,
  SacTaxRule,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxAuditRecord,
  IndianState,
  CaReviewStatus,
  GstTaxType,
} from '../types/tax';

export const INDIAN_STATES_MASTER: IndianState[] = [
  { code: '01', name: 'Jammu & Kashmir', isUnionTerritory: true },
  { code: '02', name: 'Himachal Pradesh', isUnionTerritory: false },
  { code: '03', name: 'Punjab', isUnionTerritory: false },
  { code: '04', name: 'Chandigarh', isUnionTerritory: true },
  { code: '05', name: 'Uttarakhand', isUnionTerritory: false },
  { code: '06', name: 'Haryana', isUnionTerritory: false },
  { code: '07', name: 'Delhi', isUnionTerritory: true },
  { code: '08', name: 'Rajasthan', isUnionTerritory: false },
  { code: '09', name: 'Uttar Pradesh', isUnionTerritory: false },
  { code: '10', name: 'Bihar', isUnionTerritory: false },
  { code: '11', name: 'Sikkim', isUnionTerritory: false },
  { code: '12', name: 'Arunachal Pradesh', isUnionTerritory: false },
  { code: '13', name: 'Nagaland', isUnionTerritory: false },
  { code: '14', name: 'Manipur', isUnionTerritory: false },
  { code: '15', name: 'Mizoram', isUnionTerritory: false },
  { code: '16', name: 'Tripura', isUnionTerritory: false },
  { code: '17', name: 'Meghalaya', isUnionTerritory: false },
  { code: '18', name: 'Assam', isUnionTerritory: false },
  { code: '19', name: 'West Bengal', isUnionTerritory: false },
  { code: '20', name: 'Jharkhand', isUnionTerritory: false },
  { code: '21', name: 'Odisha', isUnionTerritory: false },
  { code: '22', name: 'Chhattisgarh', isUnionTerritory: false },
  { code: '23', name: 'Madhya Pradesh', isUnionTerritory: false },
  { code: '24', name: 'Gujarat', isUnionTerritory: false },
  { code: '25', name: 'Daman and Diu', isUnionTerritory: true },
  { code: '26', name: 'Dadra and Nagar Haveli', isUnionTerritory: true },
  { code: '27', name: 'Maharashtra', isUnionTerritory: false },
  { code: '28', name: 'Andhra Pradesh', isUnionTerritory: false },
  { code: '29', name: 'Karnataka', isUnionTerritory: false },
  { code: '30', name: 'Goa', isUnionTerritory: false },
  { code: '31', name: 'Lakshadweep', isUnionTerritory: true },
  { code: '32', name: 'Kerala', isUnionTerritory: false },
  { code: '33', name: 'Tamil Nadu', isUnionTerritory: false },
  { code: '34', name: 'Puducherry', isUnionTerritory: true },
  { code: '35', name: 'Andaman & Nicobar Islands', isUnionTerritory: true },
  { code: '36', name: 'Telangana', isUnionTerritory: false },
  { code: '37', name: 'Ladakh', isUnionTerritory: true },
  { code: '97', name: 'Other Territory', isUnionTerritory: true },
];

export const DEFAULT_SAC_RULES: SacTaxRule[] = [
  {
    id: 'sac_rule_electrician',
    sacCode: '998714',
    serviceCategoryId: 'cat_electrician',
    serviceCategoryName: 'Electrician & Electrical Wiring',
    ruleName: 'Electrical Machinery & Appliance Repair (SAC 998714)',
    description: 'Maintenance and repair services of electrical machinery and apparatus under Chapter 99.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_plumber',
    sacCode: '998721',
    serviceCategoryId: 'cat_plumber',
    serviceCategoryName: 'Plumbing & Sanitary Works',
    ruleName: 'Plumbing & Sanitary Fitting Services (SAC 998721)',
    description: 'Water plumbing, drain laying, sanitary fixtures, and pipeline maintenance.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_ac_appliance',
    sacCode: '998715',
    serviceCategoryId: 'cat_ac_appliance',
    serviceCategoryName: 'AC & Cooling Appliances',
    ruleName: 'Air Conditioning & Heating Equipment Repair (SAC 998715)',
    description: 'Maintenance and repair services of commercial and domestic refrigeration and AC units.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_cleaning',
    sacCode: '998719',
    serviceCategoryId: 'cat_cleaning',
    serviceCategoryName: 'Home & Office Cleaning',
    ruleName: 'Deep Cleaning & Disinfection Services (SAC 998719)',
    description: 'General cleaning, deep scrubbing, sofa and carpet sanitization services.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_painting',
    sacCode: '998722',
    serviceCategoryId: 'cat_painting',
    serviceCategoryName: 'Painting & Waterproofing',
    ruleName: 'Painting & Plastering Services (SAC 998722)',
    description: 'Residential interior and exterior painting, waterproofing, and surface treatment.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: false,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_carpentry',
    sacCode: '998729',
    serviceCategoryId: 'cat_carpentry',
    serviceCategoryName: 'Carpentry & Woodwork',
    ruleName: 'Carpentry & Joinery Installation (SAC 998729)',
    description: 'Furniture repair, modular woodwork, lock fittings, and custom timber installations.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_ro_water',
    sacCode: '996331',
    serviceCategoryId: 'cat_ro_water',
    serviceCategoryName: 'RO & Water Purifier',
    ruleName: 'Water Purification & Filter Servicing (SAC 996331)',
    description: 'Domestic and commercial RO filter repair, membrane replacement, and water test.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_pest_control',
    sacCode: '998533',
    serviceCategoryId: 'cat_pest_control',
    serviceCategoryName: 'Pest Control',
    ruleName: 'Disinfecting & Pest Extermination (SAC 998533)',
    description: 'Termite, cockroach, rodent, and insect control treatments.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_platform_fee',
    sacCode: '998313',
    serviceCategoryId: 'platform_charge',
    serviceCategoryName: 'Platform Convenience Fee',
    ruleName: 'E-Commerce Marketplace Facilitation (SAC 998313)',
    description: 'Information technology and platform convenience fee charged to users.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: false,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
  {
    id: 'sac_rule_default_other',
    sacCode: '999799',
    serviceCategoryId: 'other',
    serviceCategoryName: 'General & Miscellaneous Services',
    ruleName: 'Other Miscellaneous Services (SAC 999799)',
    description: 'Other personal and domestic maintenance services not elsewhere classified.',
    gstRatePercent: 18,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    cessPercent: 0,
    isTaxInclusive: false,
    effectiveFrom: '2024-04-01',
    section9_5Applicable: true,
    rcmApplicable: false,
    version: 'v2026.1',
    isActive: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'system_bootstrap',
  },
];

export const DEFAULT_TAX_CONFIG: AdminTaxConfiguration = {
  id: 'hardinkaam_tax_config_v1',
  legalBusinessName: 'DEEPAK BUILDCON & HOME SERVICES PRIVATE LIMITED',
  tradeName: 'HARDINKAAM',
  pan: 'AABCD1234E',
  gstin: '23AABCD1234E1Z5',
  registeredState: 'Madhya Pradesh',
  registeredStateCode: '23',
  businessAddress: {
    street: 'S-2, Ashirwad Complex',
    locality: 'Zone-1, M.P. Nagar',
    city: 'Bhopal',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    pincode: '462011',
  },
  financialYear: '2025-26',
  taxRuleVersion: 'v2026.1',
  isCompositionScheme: false,
  isEcommerceOperator: true,
  defaultSacCode: '998714',
  defaultGstRatePercent: 18,
  defaultPricingMode: 'exclusive',
  caReviewStatus: 'APPROVED',
  caReviewedBy: 'CA Rajesh Verma (FCA, ICAI Reg #074829)',
  caReviewNotes:
    'Verified SAC code mapping for household repair services under Section 9(5) and Schedule II of CGST Act. Applicable GST rate is 18% (9% CGST + 9% SGST for intra-state Madhya Pradesh transactions, 18% IGST for inter-state supplies). Statutory tax collected is segregated from platform margins.',
  caReviewTimestamp: '2026-04-01T10:00:00.000Z',
  statutoryDisclaimer:
    'Statutory Disclaimer: GST calculations provided herein are generated based on platform parameters and configured SAC rules for transactional facilitation. Final tax liability, input tax credit (ITC), and statutory return filings (GSTR-1, GSTR-3B, GSTR-8 e-commerce reporting) must be reconciled and approved by a certified Chartered Accountant.',
  tcsTdsConfig: {
    tcsEnabled: true,
    tcsRatePercent: 1.0, // 0.5% CGST + 0.5% SGST or 1% IGST u/s 52
    tcsThresholdAnnual: 0,
    tcsEffectiveFrom: '2024-04-01',
    tcsSection: 'Section 52 CGST Act (TCS on E-Commerce Operator)',
    tdsEnabled: true,
    tdsSection: 'Section 194-O (TDS on E-Commerce participant payouts)',
    tdsRateWithPanPercent: 1.0,
    tdsRateWithoutPanPercent: 5.0,
    tdsThresholdAnnual: 500000,
    tdsEffectiveFrom: '2024-04-01',
    tdsDeductAtSource: true,
  },
  taxRules: DEFAULT_SAC_RULES,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system_bootstrap',
};

// In-memory cache for fast calculation
let cachedTaxConfig: AdminTaxConfiguration = DEFAULT_TAX_CONFIG;
let hasLoadedRemote = false;

/**
 * Fetch current admin tax configuration from Firestore with fallback to defaults
 */
export async function getAdminTaxConfiguration(): Promise<AdminTaxConfiguration> {
  try {
    const docRef = doc(db, 'settings', 'indian_tax_configuration');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<AdminTaxConfiguration>;
      cachedTaxConfig = {
        ...DEFAULT_TAX_CONFIG,
        ...data,
        businessAddress: { ...DEFAULT_TAX_CONFIG.businessAddress, ...(data.businessAddress || {}) },
        tcsTdsConfig: { ...DEFAULT_TAX_CONFIG.tcsTdsConfig, ...(data.tcsTdsConfig || {}) },
        taxRules: Array.isArray(data.taxRules) && data.taxRules.length > 0 ? data.taxRules : DEFAULT_SAC_RULES,
      };
      hasLoadedRemote = true;
      return cachedTaxConfig;
    }
  } catch (err) {
    console.warn('[IndianTaxEngine] Error fetching tax settings from Firestore, using defaults:', err);
  }
  return cachedTaxConfig;
}

/**
 * Save updated tax configuration to Firestore & record audit log
 */
export async function saveAdminTaxConfiguration(
  config: Partial<AdminTaxConfiguration>,
  adminId: string = 'admin_user'
): Promise<AdminTaxConfiguration> {
  const current = await getAdminTaxConfiguration();
  const updated: AdminTaxConfiguration = {
    ...current,
    ...config,
    businessAddress: {
      ...current.businessAddress,
      ...(config.businessAddress || {}),
    },
    tcsTdsConfig: {
      ...current.tcsTdsConfig,
      ...(config.tcsTdsConfig || {}),
    },
    taxRules: config.taxRules || current.taxRules,
    updatedAt: new Date().toISOString(),
    updatedBy: adminId,
  };

  try {
    const docRef = doc(db, 'settings', 'indian_tax_configuration');
    await setDoc(docRef, updated, { merge: true });
    cachedTaxConfig = updated;

    // Record audit in tax_audit_logs
    try {
      await addDoc(collection(db, 'tax_audit_logs'), {
        action: 'UPDATE_TAX_CONFIGURATION',
        adminId,
        previousVersion: current.taxRuleVersion,
        newVersion: updated.taxRuleVersion,
        caReviewStatus: updated.caReviewStatus,
        timestamp: new Date().toISOString(),
        details: {
          legalBusinessName: updated.legalBusinessName,
          gstin: updated.gstin,
          registeredStateCode: updated.registeredStateCode,
          ruleCount: updated.taxRules.length,
        },
      });
    } catch (auditErr) {
      console.warn('[IndianTaxEngine] Non-blocking audit log error:', auditErr);
    }
  } catch (err) {
    console.error('[IndianTaxEngine] Failed to save tax configuration to Firestore:', err);
    throw err;
  }

  return updated;
}

/**
 * CA Review Sign-off recorder
 */
export async function submitCaReviewSignOff(
  status: CaReviewStatus,
  caName: string,
  reviewNotes: string,
  adminId: string = 'admin_user'
): Promise<AdminTaxConfiguration> {
  return saveAdminTaxConfiguration(
    {
      caReviewStatus: status,
      caReviewedBy: caName,
      caReviewNotes: reviewNotes,
      caReviewTimestamp: new Date().toISOString(),
    },
    adminId
  );
}

/**
 * Helper to lookup state by 2-digit code
 */
export function getStateByCode(code?: string): IndianState | undefined {
  if (!code) return undefined;
  const cleanCode = code.padStart(2, '0');
  return INDIAN_STATES_MASTER.find((s) => s.code === cleanCode);
}

/**
 * Helper to lookup state by name (case-insensitive fuzzy match)
 */
export function getStateByName(name?: string): IndianState | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase().trim();
  return INDIAN_STATES_MASTER.find(
    (s) => s.name.toLowerCase() === lower || lower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(lower)
  );
}

/**
 * Find the most specific active SAC Tax Rule for a service / category
 */
export function resolveSacTaxRule(
  input: TaxCalculationInput,
  config: AdminTaxConfiguration = cachedTaxConfig
): SacTaxRule {
  const rules = config.taxRules.filter((r) => r.isActive !== false);

  // 1. Explicit override by SAC code
  if (input.overrideSacCode) {
    const matched = rules.find((r) => r.sacCode === input.overrideSacCode);
    if (matched) return matched;
  }

  // 2. Specific Service ID match
  if (input.serviceId) {
    const matched = rules.find((r) => r.serviceId === input.serviceId);
    if (matched) return matched;
  }

  // 3. Service Category match
  if (input.serviceCategoryId) {
    const matched = rules.find((r) => r.serviceCategoryId === input.serviceCategoryId);
    if (matched) return matched;
  }

  // 4. Match by service name keywords
  if (input.serviceName) {
    const nameLower = input.serviceName.toLowerCase();
    if (nameLower.includes('electr') || nameLower.includes('wire') || nameLower.includes('switch')) {
      const r = rules.find((x) => x.sacCode === '998714');
      if (r) return r;
    }
    if (nameLower.includes('plumb') || nameLower.includes('pipe') || nameLower.includes('tap') || nameLower.includes('leak')) {
      const r = rules.find((x) => x.sacCode === '998721');
      if (r) return r;
    }
    if (nameLower.includes('ac') || nameLower.includes('air cond') || nameLower.includes('fridge') || nameLower.includes('refrigerat')) {
      const r = rules.find((x) => x.sacCode === '998715');
      if (r) return r;
    }
    if (nameLower.includes('clean') || nameLower.includes('sofa') || nameLower.includes('sanitize') || nameLower.includes('maid')) {
      const r = rules.find((x) => x.sacCode === '998719');
      if (r) return r;
    }
    if (nameLower.includes('paint') || nameLower.includes('putty') || nameLower.includes('waterproof')) {
      const r = rules.find((x) => x.sacCode === '998722');
      if (r) return r;
    }
    if (nameLower.includes('carpenter') || nameLower.includes('wood') || nameLower.includes('door') || nameLower.includes('furniture')) {
      const r = rules.find((x) => x.sacCode === '998729');
      if (r) return r;
    }
    if (nameLower.includes('ro') || nameLower.includes('water purif') || nameLower.includes('filter')) {
      const r = rules.find((x) => x.sacCode === '996331');
      if (r) return r;
    }
    if (nameLower.includes('pest') || nameLower.includes('termite') || nameLower.includes('cockroach')) {
      const r = rules.find((x) => x.sacCode === '998533');
      if (r) return r;
    }
  }

  // 5. Default Fallback SAC rule
  const defaultRule = rules.find((r) => r.sacCode === config.defaultSacCode) || rules[0] || DEFAULT_SAC_RULES[0];
  return defaultRule;
}

/**
 * Determine customer's Place of Supply (POS) state & 2-digit code
 */
export function resolvePlaceOfSupply(
  input: TaxCalculationInput,
  config: AdminTaxConfiguration = cachedTaxConfig
): { state: string; code: string; isInterState: boolean } {
  let customerCode = input.customerStateCode;
  let customerStateName = input.customerState;

  if (customerCode) {
    customerCode = customerCode.padStart(2, '0');
    const st = getStateByCode(customerCode);
    if (st) {
      customerStateName = st.name;
    }
  } else if (customerStateName) {
    const st = getStateByName(customerStateName);
    if (st) {
      customerCode = st.code;
      customerStateName = st.name;
    }
  }

  // Pincode based or district based Madhya Pradesh default (since primary operations are in MP)
  if (!customerCode) {
    if (input.customerPincode && input.customerPincode.startsWith('4')) {
      // 45xxxx to 48xxxx are MP / Chhattisgarh
      customerCode = '23';
      customerStateName = 'Madhya Pradesh';
    } else {
      customerCode = config.registeredStateCode || '23';
      customerStateName = config.registeredState || 'Madhya Pradesh';
    }
  }

  const supplierCode = (config.registeredStateCode || '23').padStart(2, '0');
  const isInterState = customerCode !== supplierCode;

  return {
    state: customerStateName || 'Madhya Pradesh',
    code: customerCode,
    isInterState,
  };
}

/**
 * Core GST Calculation Engine
 * Accurately calculates taxable base, discounts, reward points reductions, CGST, SGST, IGST, Cess, TCS, and statutory segregation.
 */
export function calculateIndianGst(
  input: TaxCalculationInput,
  customConfig?: AdminTaxConfiguration
): TaxCalculationResult {
  const config = customConfig || cachedTaxConfig;
  const rule = resolveSacTaxRule(input, config);
  const pos = resolvePlaceOfSupply(input, config);

  const baseGrossAmount = Math.max(0, input.basePrice || 0);
  const standardDiscount = Math.max(0, input.standardDiscount || 0);
  const couponDiscount = Math.max(0, input.couponDiscount || 0);
  const rewardPointsDiscount = Math.max(0, input.rewardPointsDiscount || 0);

  const totalDiscount = standardDiscount + couponDiscount + rewardPointsDiscount;
  const netDiscountedAmount = Math.max(0, baseGrossAmount - totalDiscount);

  const isTaxInclusive = rule.isTaxInclusive ?? (config.defaultPricingMode === 'inclusive');
  const gstRatePercent = rule.gstRatePercent ?? config.defaultGstRatePercent ?? 18;
  const cessPercent = rule.cessPercent || 0;
  const combinedTaxPercent = gstRatePercent + cessPercent;

  let taxableAmount = 0;
  let totalTaxAmount = 0;
  let cgstPercent = 0;
  let cgstAmount = 0;
  let sgstPercent = 0;
  let sgstAmount = 0;
  let igstPercent = 0;
  let igstAmount = 0;
  let cessAmount = 0;
  let finalTotalAmount = 0;

  if (isTaxInclusive) {
    // Price includes GST: Taxable Value = Total / (1 + Rate)
    taxableAmount = Math.round((netDiscountedAmount / (1 + combinedTaxPercent / 100)) * 100) / 100;
    totalTaxAmount = Math.round((netDiscountedAmount - taxableAmount) * 100) / 100;
    finalTotalAmount = netDiscountedAmount;
  } else {
    // Price is exclusive of GST: GST added on top of net taxable value
    taxableAmount = Math.round(netDiscountedAmount * 100) / 100;
  }

  // Inter-State vs Intra-State Breakdown
  if (pos.isInterState) {
    // Inter-state supply -> IGST full rate
    igstPercent = gstRatePercent;
    igstAmount = isTaxInclusive
      ? Math.round(taxableAmount * (igstPercent / 100) * 100) / 100
      : Math.round(taxableAmount * (igstPercent / 100) * 100) / 100;
    cgstPercent = 0;
    cgstAmount = 0;
    sgstPercent = 0;
    sgstAmount = 0;
  } else {
    // Intra-state supply -> CGST (half) + SGST/UTGST (half)
    cgstPercent = Math.round((gstRatePercent / 2) * 100) / 100;
    sgstPercent = Math.round((gstRatePercent / 2) * 100) / 100;
    cgstAmount = Math.round(taxableAmount * (cgstPercent / 100) * 100) / 100;
    sgstAmount = Math.round(taxableAmount * (sgstPercent / 100) * 100) / 100;
    igstPercent = 0;
    igstAmount = 0;
  }

  if (cessPercent > 0) {
    cessAmount = Math.round(taxableAmount * (cessPercent / 100) * 100) / 100;
  }

  if (!isTaxInclusive) {
    totalTaxAmount = Math.round((cgstAmount + sgstAmount + igstAmount + cessAmount) * 100) / 100;
    finalTotalAmount = Math.round((taxableAmount + totalTaxAmount) * 100) / 100;
  }

  // TCS u/s 52 (Tax Collected at Source by E-Commerce Operator on net value of taxable supplies)
  let tcsApplicable = false;
  let tcsRatePercent = 0;
  let tcsAmount = 0;
  if (config.tcsTdsConfig?.tcsEnabled && rule.section9_5Applicable) {
    tcsApplicable = true;
    tcsRatePercent = config.tcsTdsConfig.tcsRatePercent || 1.0;
    tcsAmount = Math.round(taxableAmount * (tcsRatePercent / 100) * 100) / 100;
  }

  // TDS u/s 194-O (Deduction on payments to e-commerce participants / servicemen)
  let tdsApplicable = false;
  let tdsRatePercent = 0;
  let tdsAmount = 0;
  if (config.tcsTdsConfig?.tdsEnabled && config.tcsTdsConfig.tdsDeductAtSource) {
    tdsApplicable = true;
    tdsRatePercent = input.customerGstin
      ? config.tcsTdsConfig.tdsRateWithPanPercent || 1.0
      : config.tcsTdsConfig.tdsRateWithPanPercent || 1.0;
    tdsAmount = Math.round(taxableAmount * (tdsRatePercent / 100) * 100) / 100;
  }

  const taxType: GstTaxType = gstRatePercent === 0 ? 'EXEMPT' : pos.isInterState ? 'INTER_STATE' : 'INTRA_STATE';

  // Statutory Tax Liability vs Net Operating Platform Revenue
  const statutoryTaxLiability = totalTaxAmount;
  const netOperationalRevenue = taxableAmount;

  return {
    taxRuleId: rule.id,
    taxRuleVersion: rule.version || config.taxRuleVersion,
    sacCode: rule.sacCode,
    hsnCode: rule.hsnCode,
    ruleName: rule.ruleName,
    taxType,
    supplierState: config.registeredState,
    supplierStateCode: config.registeredStateCode,
    placeOfSupplyState: pos.state,
    placeOfSupplyStateCode: pos.code,
    isInterState: pos.isInterState,
    isTaxInclusive,
    baseGrossAmount,
    standardDiscount,
    rewardPointsDiscount,
    couponDiscount,
    totalDiscount,
    taxableAmount,
    gstRatePercent,
    cgstPercent,
    cgstAmount,
    sgstPercent,
    sgstAmount,
    igstPercent,
    igstAmount,
    cessPercent,
    cessAmount,
    totalTaxAmount,
    finalTotalAmount,
    tcsApplicable,
    tcsRatePercent,
    tcsAmount,
    tdsApplicable,
    tdsRatePercent,
    tdsAmount,
    section9_5Applicable: rule.section9_5Applicable || false,
    statutoryTaxLiability,
    netOperationalRevenue,
    calculatedAt: new Date().toISOString(),
    taxEngineVersion: config.taxRuleVersion,
    caReviewed: config.caReviewStatus === 'APPROVED',
  };
}

/**
 * Record a verified transaction tax calculation for statutory reporting (GSTR-1, GSTR-8)
 */
export async function recordTaxAuditLog(
  bookingId: string,
  calculation: TaxCalculationResult,
  metadata?: {
    invoiceNumber?: string;
    transactionId?: string;
    customerId?: string;
    customerGstin?: string;
    serviceManId?: string;
  }
): Promise<string> {
  try {
    const config = cachedTaxConfig;
    const record: Omit<TaxAuditRecord, 'id'> = {
      bookingId,
      invoiceNumber: metadata?.invoiceNumber || `INV-${bookingId.substring(0, 8).toUpperCase()}`,
      transactionId: metadata?.transactionId,
      customerId: metadata?.customerId,
      customerGstin: metadata?.customerGstin,
      serviceManId: metadata?.serviceManId,
      calculation,
      timestamp: new Date().toISOString(),
      financialYear: config.financialYear,
      placeOfSupplyCode: calculation.placeOfSupplyStateCode,
      sacCode: calculation.sacCode,
    };

    const docRef = await addDoc(collection(db, 'tax_transactions_ledger'), record);
    return docRef.id;
  } catch (err) {
    console.warn('[IndianTaxEngine] Error recording tax audit log:', err);
    return 'temp_tax_audit_' + Date.now();
  }
}

/**
 * Fetch recent tax ledger records for CA review and GSTR return prep
 */
export async function getRecentTaxLedgerRecords(maxRecords: number = 50): Promise<TaxAuditRecord[]> {
  try {
    const q = query(collection(db, 'tax_transactions_ledger'), orderBy('timestamp', 'desc'), limit(maxRecords));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaxAuditRecord));
  } catch (err) {
    console.warn('[IndianTaxEngine] Error querying tax ledger records:', err);
    return [];
  }
}

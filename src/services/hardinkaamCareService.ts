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
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { isResourceExhausted } from '../utils/sparkQuotaGuard';
import {
  HardinkaamCarePolicy,
  HardinkaamMembershipPlan,
  AmcPlan,
  AmcCalculationResult,
  CareComplaintRecord,
} from '../types/care';

export const DEFAULT_CARE_POLICIES: HardinkaamCarePolicy[] = [
  {
    id: 'policy_electrical',
    categoryId: 'cat_electrician',
    categoryName: 'Electrical & Wiring',
    warrantyDurationMonths: 3,
    maxLiabilityRupees: 5000,
    revisitLimit: 2,
    exclusions: ['Surge damage from external grid', 'User tampering'],
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy_plumbing',
    categoryId: 'cat_plumber',
    categoryName: 'Plumbing & Sanitary',
    warrantyDurationMonths: 3,
    maxLiabilityRupees: 5000,
    revisitLimit: 2,
    exclusions: ['Structural pipe corrosion', 'Pre-existing leakage'],
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'policy_ac',
    categoryId: 'cat_ac_appliance',
    categoryName: 'AC & Appliance',
    warrantyDurationMonths: 6,
    maxLiabilityRupees: 10000,
    revisitLimit: 3,
    exclusions: ['Voltage fluctuation burnouts', 'Physical compressor physical impact'],
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_MEMBERSHIP_PLANS: HardinkaamMembershipPlan[] = [
  {
    id: 'plan_gold_monthly',
    name: 'HARDINKAAM Gold Monthly',
    billingCycle: 'monthly',
    priceRupees: 299,
    benefits: ['2 Free Inspection Visits/month', '15% Off all services', 'Priority emergency dispatch'],
    freeVisitsAllowed: 2,
    serviceDiscountPercent: 15,
    prioritySupport: true,
    freeReworkIncluded: true,
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_platinum_yearly',
    name: 'HARDINKAAM Platinum Yearly',
    billingCycle: 'yearly',
    priceRupees: 2499,
    benefits: ['12 Free Maintenance Visits/year', '25% Off all services', 'Dedicated Account Manager', 'Free Rework & Care Warranty'],
    freeVisitsAllowed: 12,
    serviceDiscountPercent: 25,
    prioritySupport: true,
    freeReworkIncluded: true,
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_AMC_PLANS: AmcPlan[] = [
  {
    id: 'amc_ac_standard',
    name: 'Comprehensive AC Annual Maintenance Contract (AMC)',
    categoryType: 'ac',
    billingInterval: 'yearly',
    basePriceRupees: 3499,
    scheduledVisitsCount: 3,
    sparePartsDiscountPercent: 20,
    emergencyPriority: true,
    inclusions: ['3 Preventive service checkups', 'Filter cleaning & gas pressure check', 'Free minor gas top-up'],
    exclusions: ['Major compressor replacement', 'Physical body replacement'],
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'amc_electrical_home',
    name: 'Complete Home Electrical AMC',
    categoryType: 'electrical',
    billingInterval: 'yearly',
    basePriceRupees: 1999,
    scheduledVisitsCount: 2,
    sparePartsDiscountPercent: 15,
    emergencyPriority: true,
    inclusions: ['MCB & DB health checkup', 'Switchboard tightening & inspection'],
    exclusions: ['New wiring installation', 'Appliance internal rewiring'],
    isEnabled: true,
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Calculate expected cost and margins for an AMC plan before activation
 * Never promises unlimited free services without explicit cost verification.
 */
export function calculateAmcExpectedCost(plan: AmcPlan): AmcCalculationResult {
  const estimatedLaborCostPerVisit = 350; // Standard technician visit cost
  const totalEstimatedServicingCost = plan.scheduledVisitsCount * estimatedLaborCostPerVisit;
  const projectedAdminMargin = Math.round(plan.basePriceRupees * 0.35); // 35% margin target
  const netExpectedCost = totalEstimatedServicingCost + Math.round(plan.basePriceRupees * 0.15); // Operations overhead
  const recommendedRetailPrice = Math.max(plan.basePriceRupees, netExpectedCost + projectedAdminMargin);

  const isApprovedForActivation = plan.basePriceRupees >= netExpectedCost;

  return {
    planId: plan.id,
    planName: plan.name,
    basePrice: plan.basePriceRupees,
    scheduledVisitsCount: plan.scheduledVisitsCount,
    estimatedLaborCostPerVisit,
    totalEstimatedServicingCost,
    projectedAdminMargin,
    netExpectedCost,
    recommendedRetailPrice,
    isApprovedForActivation,
    calculationNotes: isApprovedForActivation
      ? `AMC plan is economically viable. Projected Admin Margin: ₹${projectedAdminMargin}.`
      : `Warning: Base price (₹${plan.basePriceRupees}) is below expected cost (₹${netExpectedCost}). Increase price before activation.`,
  };
}

/**
 * Fetch Care Policies
 */
export async function getCarePolicies(): Promise<HardinkaamCarePolicy[]> {
  if (isResourceExhausted()) return DEFAULT_CARE_POLICIES;
  try {
    const snap = await getDocs(query(collection(db, 'care_policies'), limit(25)));
    if (snap.empty) return DEFAULT_CARE_POLICIES;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HardinkaamCarePolicy));
  } catch (e) {
    return DEFAULT_CARE_POLICIES;
  }
}

/**
 * Save Care Policy (Admin)
 */
export async function saveCarePolicy(policy: HardinkaamCarePolicy): Promise<void> {
  await setDoc(doc(db, 'care_policies', policy.id), {
    ...policy,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Fetch Membership Plans
 */
export async function getMembershipPlans(): Promise<HardinkaamMembershipPlan[]> {
  if (isResourceExhausted()) return DEFAULT_MEMBERSHIP_PLANS;
  try {
    const snap = await getDocs(query(collection(db, 'membership_plans'), limit(25)));
    if (snap.empty) return DEFAULT_MEMBERSHIP_PLANS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as HardinkaamMembershipPlan));
  } catch (e) {
    return DEFAULT_MEMBERSHIP_PLANS;
  }
}

/**
 * Save Membership Plan (Admin)
 */
export async function saveMembershipPlan(plan: HardinkaamMembershipPlan): Promise<void> {
  await setDoc(doc(db, 'membership_plans', plan.id), {
    ...plan,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Fetch AMC Plans
 */
export async function getAmcPlans(): Promise<AmcPlan[]> {
  if (isResourceExhausted()) return DEFAULT_AMC_PLANS;
  try {
    const snap = await getDocs(query(collection(db, 'amc_plans'), limit(25)));
    if (snap.empty) return DEFAULT_AMC_PLANS;
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AmcPlan));
  } catch (e) {
    return DEFAULT_AMC_PLANS;
  }
}

/**
 * Save AMC Plan (Admin)
 */
export async function saveAmcPlan(plan: AmcPlan): Promise<void> {
  await setDoc(doc(db, 'amc_plans', plan.id), {
    ...plan,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Create Care Complaint / Revisit / Rework Ticket
 */
export async function createCareComplaint(
  data: Omit<CareComplaintRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<CareComplaintRecord> {
  const id = `care_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const record: CareComplaintRecord = {
    ...data,
    id,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'care_complaints', id), record);
  return record;
}

/**
 * Fetch customer Care Complaints
 */
export async function getCustomerCareComplaints(customerId: string): Promise<CareComplaintRecord[]> {
  try {
    const q = query(collection(db, 'care_complaints'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CareComplaintRecord));
  } catch (e) {
    return [];
  }
}

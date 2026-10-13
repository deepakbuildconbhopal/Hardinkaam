export interface HardinkaamCarePolicy {
  id: string;
  categoryId: string;
  categoryName: string;
  warrantyDurationMonths: number;
  maxLiabilityRupees: number;
  revisitLimit: number;
  exclusions: string[];
  isEnabled: boolean;
  updatedAt: string;
}

export type MembershipBillingCycle = 'monthly' | 'yearly';

export interface HardinkaamMembershipPlan {
  id: string;
  name: string;
  billingCycle: MembershipBillingCycle;
  priceRupees: number;
  benefits: string[];
  freeVisitsAllowed: number;
  serviceDiscountPercent: number;
  prioritySupport: boolean;
  freeReworkIncluded: boolean;
  isEnabled: boolean;
  updatedAt: string;
}

export type AmcCategoryType =
  | 'ac'
  | 'electrical'
  | 'plumbing'
  | 'home_maintenance'
  | 'office_maintenance'
  | 'custom';

export interface AmcPlan {
  id: string;
  name: string;
  categoryType: AmcCategoryType;
  billingInterval: 'quarterly' | 'half_yearly' | 'yearly';
  basePriceRupees: number;
  scheduledVisitsCount: number;
  sparePartsDiscountPercent: number;
  emergencyPriority: boolean;
  inclusions: string[];
  exclusions: string[];
  isEnabled: boolean;
  updatedAt: string;
}

export interface AmcCalculationResult {
  planId: string;
  planName: string;
  basePrice: number;
  scheduledVisitsCount: number;
  estimatedLaborCostPerVisit: number;
  totalEstimatedServicingCost: number;
  projectedAdminMargin: number;
  netExpectedCost: number;
  recommendedRetailPrice: number;
  isApprovedForActivation: boolean;
  calculationNotes: string;
}

export interface CareComplaintRecord {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  complaintType: 'warranty' | 'revisit' | 'rework' | 'replacement_serviceman' | 'escalation';
  description: string;
  status: 'PENDING' | 'ASSIGNED' | 'RESOLVED' | 'CLOSED';
  assignedServicemanId?: string;
  assignedServicemanName?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

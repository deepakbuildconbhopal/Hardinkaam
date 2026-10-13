import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';

export interface ProfitSettings {
  minContributionMarginPercent: number; // e.g. 15%
  minContributionAmount: number; // e.g. ₹50
  maxDiscountPercent: number; // e.g. 20%
  maxRewardContributionPercent: number; // e.g. 10%
  maxReferralCostPercent: number; // e.g. 5%
  servicemanPayoutLimitPercent: number; // e.g. 75%
  promotionBudgetCap: number; // e.g. ₹50,000
  paymentGatewayFeePercent: number; // e.g. 2%
  warrantyReservePercent: number; // e.g. 1%
  enforceMarginThreshold: boolean; // whether to block/warn if below threshold
}

export interface BookingProfitBreakdown {
  bookingId: string;
  customerAmount: number;
  servicemanPayout: number;
  partnerOrPromoterPayout: number;
  paymentGatewayCost: number;
  rewardCost: number;
  referralCost: number;
  discount: number;
  warrantyReserve: number;
  otherVariableCosts: number;
  totalVariableCosts: number;
  contributionProfit: number;
  contributionMarginPercent: number;
  gstExcludedAmount: number; // Statutory tax excluded from profit
  isProfitable: boolean;
  warningMessage?: string;
}

const DEFAULT_PROFIT_SETTINGS: ProfitSettings = {
  minContributionMarginPercent: 12, // 12%
  minContributionAmount: 40, // ₹40
  maxDiscountPercent: 25,
  maxRewardContributionPercent: 10,
  maxReferralCostPercent: 5,
  servicemanPayoutLimitPercent: 70,
  promotionBudgetCap: 50000,
  paymentGatewayFeePercent: 2.0, // 2% Razorpay standard
  warrantyReservePercent: 1.0, // 1% warranty reserve
  enforceMarginThreshold: true,
};

export async function getProfitSettings(): Promise<ProfitSettings> {
  try {
    const docRef = doc(db, 'settings', 'profit_engine_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_PROFIT_SETTINGS, ...snap.data() } as ProfitSettings;
    }
  } catch (err) {
    console.warn('Error fetching profit settings, using defaults:', err);
  }
  return DEFAULT_PROFIT_SETTINGS;
}

export async function updateProfitSettings(settings: Partial<ProfitSettings>): Promise<ProfitSettings> {
  const current = await getProfitSettings();
  const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, 'settings', 'profit_engine_settings'), updated, { merge: true });
  return updated;
}

export function calculateBookingProfit(booking: Booking, settings: ProfitSettings = DEFAULT_PROFIT_SETTINGS): BookingProfitBreakdown {
  const customerAmount = (booking as any).totalAmount || booking.amount || 0;

  // IMPORTANT: Statutory tax liability is excluded from company operating margins.
  // Uses dynamic tax calculation from Indian Tax Engine if available, or dynamic taxRate.
  const statutoryTax =
    (booking as any).statutoryTaxLiability !== undefined
      ? Number((booking as any).statutoryTaxLiability)
      : (booking as any).gstAmount !== undefined
      ? Number((booking as any).gstAmount)
      : Math.round(customerAmount - customerAmount / (1 + (booking.taxRate || 18) / 100));

  const gstExcludedAmount = Math.max(0, Math.round((customerAmount - statutoryTax) * 100) / 100);

  // Variable Costs
  const servicemanPayout = Math.round(gstExcludedAmount * (settings.servicemanPayoutLimitPercent / 100));
  const partnerOrPromoterPayout = booking.partnerId || (booking as any).brandPromoterId ? Math.round(gstExcludedAmount * 0.05) : 0;
  const paymentGatewayCost = Math.round(customerAmount * (settings.paymentGatewayFeePercent / 100));
  const rewardCost = (booking as any).rewardDiscountUsed ? Number((booking as any).rewardDiscountUsed) : Math.round(gstExcludedAmount * 0.03);
  const referralCost = (booking as any).referralBonusApplied ? Number((booking as any).referralBonusApplied) : Math.round(gstExcludedAmount * 0.02);
  const discount = (booking as any).discountAmount ? Number((booking as any).discountAmount) : 0;
  const warrantyReserve = Math.round(gstExcludedAmount * (settings.warrantyReservePercent / 100));
  const otherVariableCosts = Math.round(gstExcludedAmount * 0.02); // Operations & logistics

  const totalVariableCosts =
    servicemanPayout +
    partnerOrPromoterPayout +
    paymentGatewayCost +
    rewardCost +
    referralCost +
    discount +
    warrantyReserve +
    otherVariableCosts;

  const contributionProfit = Math.round((gstExcludedAmount - totalVariableCosts) * 100) / 100;
  const contributionMarginPercent = gstExcludedAmount > 0 ? Math.round((contributionProfit / gstExcludedAmount) * 1000) / 10 : 0;

  const isProfitable =
    contributionMarginPercent >= settings.minContributionMarginPercent &&
    contributionProfit >= settings.minContributionAmount;

  let warningMessage: string | undefined;
  if (!isProfitable) {
    warningMessage = `⚠️ Low Margin Warning: Contribution margin (${contributionMarginPercent}%) or profit (₹${contributionProfit}) falls below configured threshold (${settings.minContributionMarginPercent}% / ₹${settings.minContributionAmount}).`;
  }

  return {
    bookingId: booking.id,
    customerAmount,
    servicemanPayout,
    partnerOrPromoterPayout,
    paymentGatewayCost,
    rewardCost,
    referralCost,
    discount,
    warrantyReserve,
    otherVariableCosts,
    totalVariableCosts,
    contributionProfit,
    contributionMarginPercent,
    gstExcludedAmount,
    isProfitable,
    warningMessage,
  };
}

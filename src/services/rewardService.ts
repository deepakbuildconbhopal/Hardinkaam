import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, runTransaction, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { logAuditEvent } from './auditService';
import {
  RewardType,
  RewardTransactionStatus,
  RewardTransaction,
  CustomerRewardWallet,
  CustomerReferralRecord,
  ReferralStatus,
  RewardSettings,
  AdminRewardAdjustmentRecord,
} from '../types';

export type {
  RewardType,
  RewardTransactionStatus,
  RewardTransaction,
  CustomerRewardWallet,
  CustomerReferralRecord,
  ReferralStatus,
  RewardSettings,
  AdminRewardAdjustmentRecord,
};

const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  enabled: true,
  pointsPerRupeeSpent: 1, // 1 pt per ₹1 spent
  pointsToRupeeConversion: 10, // 10 points = ₹1 (or 1,000 points = ₹100 discount)
  minPointsForRedemption: 100, // Minimum 100 points required to redeem
  maxPointsUsablePerBooking: 5000, // Maximum 5,000 points per booking
  maxBookingDiscountPercent: 50, // Maximum 50% of service amount can be covered by points
  minBookingAmountForRedemption: 199, // Minimum booking base amount to allow redemption
  referralRewardPoints: 500,
  qualifyingAction: 'first_completed_service',
  expiryDays: 365,
};

/**
 * Retrieves the global authoritative reward settings from Firestore
 */
export async function getRewardSettings(): Promise<RewardSettings> {
  try {
    const docRef = doc(db, 'settings', 'reward_settings');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_REWARD_SETTINGS, ...snap.data() } as RewardSettings;
    }
  } catch (err) {
    console.warn('Error fetching reward settings, using defaults:', err);
  }
  return DEFAULT_REWARD_SETTINGS;
}

/**
 * Updates platform reward settings (Admin only)
 */
export async function updateRewardSettings(settings: Partial<RewardSettings>): Promise<RewardSettings> {
  const current = await getRewardSettings();
  const updated = { ...current, ...settings, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, 'settings', 'reward_settings'), updated, { merge: true });
  
  logAuditEvent({
    action: 'SYSTEM_SETTINGS_UPDATE',
    details: 'Admin updated reward settings configuration',
    metadata: { previousSettings: current, updatedSettings: updated },
  }).catch((e) => console.warn('Audit logging note:', e));

  return updated;
}

/**
 * Retrieves or initializes customer reward points wallet authoritatively
 */
export async function getCustomerRewardWallet(customerId: string): Promise<CustomerRewardWallet> {
  if (!customerId) {
    throw new Error('Customer ID is required');
  }
  const walletRef = doc(db, 'reward_wallets', customerId);
  const snap = await getDoc(walletRef);
  const settings = await getRewardSettings();

  if (snap.exists()) {
    const data = snap.data() as any;
    const balance = data.pointsBalance !== undefined ? Number(data.pointsBalance) : Number(data.availablePoints || 0);
    const rupeeValue = Math.round((balance / (settings.pointsToRupeeConversion || 10)) * 10) / 10;
    
    return {
      customerId,
      pointsBalance: Math.max(0, balance),
      availablePoints: Math.max(0, balance),
      reservedPoints: Math.max(0, Number(data.reservedPoints || 0)),
      totalEarned: Number(data.totalEarned || 0),
      totalRedeemed: Number(data.totalRedeemed || 0),
      totalReversed: Number(data.totalReversed || 0),
      totalExpired: Number(data.totalExpired || 0),
      estimatedRupeeValue: rupeeValue,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  }

  // Initialize new reward wallet for customer with 0 points (no unearned bonus)
  const initialWallet: CustomerRewardWallet = {
    customerId,
    pointsBalance: 0,
    availablePoints: 0,
    reservedPoints: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    totalReversed: 0,
    totalExpired: 0,
    estimatedRupeeValue: 0,
    transactions: [],
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(walletRef, initialWallet);
  } catch (e) {
    console.warn('Notice saving initial reward wallet:', e);
  }
  return initialWallet;
}

/**
 * Validates whether a customer can redeem points for a booking
 * Enforces negative balance protection, min order values, and max percentage limits
 */
export async function validateRewardRedemption(params: {
  customerId: string;
  pointsToRedeem: number;
  baseServiceAmount: number;
}): Promise<{
  isValid: boolean;
  discountRupees: number;
  maxPointsAllowed: number;
  availablePoints: number;
  error?: string;
}> {
  const { customerId, pointsToRedeem, baseServiceAmount } = params;

  if (!customerId) {
    return { isValid: false, discountRupees: 0, maxPointsAllowed: 0, availablePoints: 0, error: 'Customer authentication required.' };
  }

  const settings = await getRewardSettings();
  if (!settings.enabled) {
    return { isValid: false, discountRupees: 0, maxPointsAllowed: 0, availablePoints: 0, error: 'Reward Points redemption is currently disabled by Admin.' };
  }

  const minBooking = settings.minBookingAmountForRedemption ?? 0;
  if (baseServiceAmount < minBooking) {
    return {
      isValid: false,
      discountRupees: 0,
      maxPointsAllowed: 0,
      availablePoints: 0,
      error: `Minimum service amount of ₹${minBooking} required to redeem reward points.`,
    };
  }

  const wallet = await getCustomerRewardWallet(customerId);
  const currentAvailable = wallet.pointsBalance !== undefined ? wallet.pointsBalance : (wallet.availablePoints || 0);

  if (currentAvailable < (settings.minPointsForRedemption || 100)) {
    return {
      isValid: false,
      discountRupees: 0,
      maxPointsAllowed: 0,
      availablePoints: currentAvailable,
      error: `Minimum ${settings.minPointsForRedemption || 100} points required to initiate redemption.`,
    };
  }

  // Calculate max allowable discount based on percentage cap
  const maxDiscountPercentage = settings.maxBookingDiscountPercent || 50;
  const maxDiscountRupees = Math.floor(baseServiceAmount * (maxDiscountPercentage / 100));
  const conversion = settings.pointsToRupeeConversion || 10;
  const maxPointsByPercentage = maxDiscountRupees * conversion;
  const maxAllowedPoints = Math.min(
    currentAvailable,
    settings.maxPointsUsablePerBooking || 5000,
    maxPointsByPercentage
  );

  if (pointsToRedeem <= 0) {
    return {
      isValid: true,
      discountRupees: 0,
      maxPointsAllowed: maxAllowedPoints,
      availablePoints: currentAvailable,
    };
  }

  if (pointsToRedeem > currentAvailable) {
    return {
      isValid: false,
      discountRupees: 0,
      maxPointsAllowed: maxAllowedPoints,
      availablePoints: currentAvailable,
      error: `Insufficient reward points available. You have ${currentAvailable} points.`,
    };
  }

  if (pointsToRedeem > maxAllowedPoints) {
    return {
      isValid: false,
      discountRupees: 0,
      maxPointsAllowed: maxAllowedPoints,
      availablePoints: currentAvailable,
      error: `Maximum ${maxAllowedPoints} points can be used for this booking (up to ${maxDiscountPercentage}% of ₹${baseServiceAmount}).`,
    };
  }

  const discountRupees = Math.round(pointsToRedeem / conversion);

  return {
    isValid: true,
    discountRupees,
    maxPointsAllowed: maxAllowedPoints,
    availablePoints: currentAvailable,
  };
}

/**
 * Reserves points for a booking checkout (Available -> Reserved)
 * Atomic and Idempotent: Same customerId and bookingId will not reserve twice.
 */
export async function reserveRewardPoints(
  customerId: string,
  pointsToUse: number,
  bookingId: string,
  baseServiceAmount?: number
): Promise<{ success: boolean; discountRupees: number; redemptionId?: string; error?: string }> {
  if (pointsToUse <= 0) {
    return { success: true, discountRupees: 0 };
  }

  const settings = await getRewardSettings();
  const conversion = settings.pointsToRupeeConversion || 10;
  const walletRef = doc(db, 'reward_wallets', customerId);
  const redemptionId = `RED-${bookingId}-${customerId}`;

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(walletRef);
      if (!snap.exists()) {
        return { success: false, discountRupees: 0, error: 'Reward wallet not found' };
      }

      const wallet = snap.data() as any;
      const currentAvailable = wallet.pointsBalance !== undefined ? Number(wallet.pointsBalance) : Number(wallet.availablePoints || 0);
      const currentReserved = Number(wallet.reservedPoints || 0);
      const existingTx: RewardTransaction[] = wallet.transactions || [];

      // Idempotency check: check if this booking already has an active reservation
      const existingRes = existingTx.find(
        (t) => (t.redemptionId === redemptionId || t.transactionId === redemptionId || t.bookingId === bookingId) && t.status === 'RESERVED'
      );

      if (existingRes) {
        return {
          success: true,
          discountRupees: existingRes.pointValue ?? existingRes.rupeeValue ?? Math.round(existingRes.points / conversion),
          redemptionId,
        };
      }

      // Negative balance protection: strictly disallow reserving more than available
      if (currentAvailable < pointsToUse) {
        return { success: false, discountRupees: 0, error: `Insufficient reward points available. Current balance: ${currentAvailable}` };
      }

      const discountRupees = Math.round(pointsToUse / conversion);
      const newAvailable = Math.max(0, currentAvailable - pointsToUse);
      const newReserved = currentReserved + pointsToUse;

      const newTx: RewardTransaction = {
        id: redemptionId,
        transactionId: redemptionId,
        redemptionId,
        customerId,
        bookingId,
        points: pointsToUse,
        amountPoints: pointsToUse,
        pointValue: discountRupees,
        rupeeValue: discountRupees,
        type: 'REDEMPTION',
        status: 'RESERVED',
        referenceId: `REDEMPTION-${bookingId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: `Points reserved for Booking #${bookingId}`,
      };

      transaction.update(walletRef, {
        pointsBalance: newAvailable,
        availablePoints: newAvailable,
        reservedPoints: newReserved,
        transactions: [newTx, ...existingTx],
        updatedAt: new Date().toISOString(),
      });

      logAuditEvent({
        action: 'REWARD_REDEMPTION_RESERVED',
        details: `Customer #${customerId} reserved ${pointsToUse} reward points for Booking #${bookingId}`,
        metadata: { customerId, bookingId, redemptionId, points: pointsToUse, discountRupees, previousBalance: currentAvailable, newBalance: newAvailable },
      }).catch(() => {});

      return { success: true, discountRupees, redemptionId };
    });
  } catch (err: any) {
    console.error('Error reserving reward points:', err);
    return { success: false, discountRupees: 0, error: err.message || 'Points reservation failed' };
  }
}

/**
 * Finalizes point redemption after verified payment / booking confirmation (Reserved -> Redeemed)
 * Enforces state machine: Only RESERVED transactions can become REDEEMED. Prevents double-finalization.
 */
export async function finalizePointRedemption(customerId: string, bookingId: string): Promise<{ success: boolean; error?: string }> {
  const walletRef = doc(db, 'reward_wallets', customerId);
  const redemptionId = `RED-${bookingId}-${customerId}`;

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(walletRef);
      if (!snap.exists()) return { success: false, error: 'Reward wallet not found' };
      const wallet = snap.data() as any;

      let pointsToFinalize = 0;
      let alreadyFinalized = false;

      const updatedTx = (wallet.transactions || []).map((t: RewardTransaction) => {
        if (
          t.redemptionId === redemptionId ||
          t.transactionId === redemptionId ||
          t.bookingId === bookingId ||
          t.referenceId === `REDEMPTION-${bookingId}`
        ) {
          if (t.status === 'REDEEMED') {
            alreadyFinalized = true;
          } else if (t.status === 'RESERVED') {
            pointsToFinalize = t.points || t.amountPoints || 0;
            return {
              ...t,
              status: 'REDEEMED' as const,
              type: 'REDEMPTION' as const,
              finalizedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          }
        }
        return t;
      });

      // Idempotency: If already finalized, return early without re-deducting
      if (alreadyFinalized && pointsToFinalize === 0) {
        return { success: true };
      }

      const currentReserved = Number(wallet.reservedPoints || 0);
      const currentRedeemed = Number(wallet.totalRedeemed || 0);
      const newReserved = Math.max(0, currentReserved - pointsToFinalize);
      const newRedeemed = currentRedeemed + pointsToFinalize;

      transaction.update(walletRef, {
        reservedPoints: newReserved,
        totalRedeemed: newRedeemed,
        transactions: updatedTx,
        updatedAt: new Date().toISOString(),
      });

      logAuditEvent({
        action: 'REWARD_REDEMPTION_FINALIZED',
        details: `Customer #${customerId} finalized redemption of ${pointsToFinalize} reward points for Booking #${bookingId}`,
        metadata: { customerId, bookingId, redemptionId, points: pointsToFinalize },
      }).catch(() => {});

      return { success: true };
    });
  } catch (err: any) {
    console.warn('Error finalizing point redemption:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Releases reserved points if payment fails, is dismissed, or checkout is cancelled (Reserved -> Released)
 * Enforces state machine: Only RESERVED transactions can become RELEASED.
 */
export async function releaseRewardPoints(
  customerId: string,
  bookingId: string,
  reason: string = 'Payment cancelled or failed'
): Promise<{ success: boolean; error?: string }> {
  const walletRef = doc(db, 'reward_wallets', customerId);
  const redemptionId = `RED-${bookingId}-${customerId}`;

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(walletRef);
      if (!snap.exists()) return { success: false, error: 'Reward wallet not found' };
      const wallet = snap.data() as any;

      let releasedPts = 0;
      const updatedTx = (wallet.transactions || []).map((t: RewardTransaction) => {
        if (
          (t.redemptionId === redemptionId ||
            t.transactionId === redemptionId ||
            t.bookingId === bookingId ||
            t.referenceId === `REDEMPTION-${bookingId}`) &&
          t.status === 'RESERVED'
        ) {
          releasedPts = t.points || t.amountPoints || 0;
          return {
            ...t,
            status: 'RELEASED' as const,
            description: `${t.description || 'Points reservation'} [RELEASED: ${reason}]`,
            updatedAt: new Date().toISOString(),
          };
        }
        return t;
      });

      if (releasedPts === 0) {
        return { success: true };
      }

      const currentBalance = wallet.pointsBalance !== undefined ? Number(wallet.pointsBalance) : Number(wallet.availablePoints || 0);
      const currentReserved = Number(wallet.reservedPoints || 0);
      const newAvailable = currentBalance + releasedPts;
      const newReserved = Math.max(0, currentReserved - releasedPts);

      transaction.update(walletRef, {
        pointsBalance: newAvailable,
        availablePoints: newAvailable,
        reservedPoints: newReserved,
        transactions: updatedTx,
        updatedAt: new Date().toISOString(),
      });

      logAuditEvent({
        action: 'REWARD_REDEMPTION_RELEASED',
        details: `Customer #${customerId} released ${releasedPts} reserved points for Booking #${bookingId} [${reason}]`,
        metadata: { customerId, bookingId, redemptionId, releasedPts, reason },
      }).catch(() => {});

      return { success: true };
    });
  } catch (err: any) {
    console.warn('Error releasing reserved reward points:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reverses previously redeemed reward points upon booking refund or cancellation
 * Restores customer points and preserves historical ledger integrity without deletion.
 */
export async function reverseRewardRedemption(
  customerId: string,
  bookingId: string,
  reason: string = 'Booking refunded'
): Promise<{ success: boolean; pointsReversed?: number; error?: string }> {
  const walletRef = doc(db, 'reward_wallets', customerId);
  const redemptionId = `RED-${bookingId}-${customerId}`;
  const reversalTxId = `REV-RED-${bookingId}-${customerId}`;

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(walletRef);
      if (!snap.exists()) return { success: false, error: 'Reward wallet not found' };
      const wallet = snap.data() as any;

      const existingTx: RewardTransaction[] = wallet.transactions || [];

      // Idempotency: Check if already reversed
      const alreadyReversed = existingTx.some((t) => t.transactionId === reversalTxId || (t.bookingId === bookingId && t.type === 'REVERSAL'));
      if (alreadyReversed) {
        return { success: true, error: 'Already reversed' };
      }

      // Find original redeemed transaction
      const redeemedTx = existingTx.find(
        (t) =>
          (t.redemptionId === redemptionId ||
            t.transactionId === redemptionId ||
            t.bookingId === bookingId ||
            t.referenceId === `REDEMPTION-${bookingId}`) &&
          t.status === 'REDEEMED'
      );

      if (!redeemedTx) {
        return { success: true, pointsReversed: 0 };
      }

      const pointsToRestore = redeemedTx.points || redeemedTx.amountPoints || 0;
      const currentBalance = wallet.pointsBalance !== undefined ? Number(wallet.pointsBalance) : Number(wallet.availablePoints || 0);
      const currentReversed = Number(wallet.totalReversed || 0);
      const newBalance = currentBalance + pointsToRestore;
      const newTotalReversed = currentReversed + pointsToRestore;

      const reversalRecord: RewardTransaction = {
        id: reversalTxId,
        transactionId: reversalTxId,
        redemptionId,
        customerId,
        bookingId,
        points: pointsToRestore,
        amountPoints: pointsToRestore,
        pointValue: redeemedTx.pointValue ?? redeemedTx.rupeeValue,
        rupeeValue: redeemedTx.rupeeValue ?? redeemedTx.pointValue,
        type: 'REVERSAL',
        status: 'REVERSED',
        referenceId: `REVERSAL-${bookingId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: `Reward Points Refund Reversal for Booking #${bookingId} [${reason}]`,
      };

      const updatedTxList = existingTx.map((t) => {
        if (t.id === redeemedTx.id || t.transactionId === redeemedTx.transactionId) {
          return { ...t, status: 'REVERSED' as const, updatedAt: new Date().toISOString() };
        }
        return t;
      });

      transaction.update(walletRef, {
        pointsBalance: newBalance,
        availablePoints: newBalance,
        totalReversed: newTotalReversed,
        transactions: [reversalRecord, ...updatedTxList],
        updatedAt: new Date().toISOString(),
      });

      logAuditEvent({
        action: 'REWARD_REDEMPTION_REVERSED',
        details: `Reversed ${pointsToRestore} redeemed reward points for Booking #${bookingId} [${reason}]`,
        metadata: { customerId, bookingId, redemptionId, pointsReversed: pointsToRestore, reason },
      }).catch(() => {});

      return { success: true, pointsReversed: pointsToRestore };
    });
  } catch (err: any) {
    console.error('Error reversing reward redemption:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Creates an idempotent reward transaction and updates customer reward points
 */
export async function createRewardTransaction(params: {
  customerId: string;
  bookingId?: string;
  type: RewardType;
  points: number;
  status?: RewardTransactionStatus;
  transactionId?: string;
  description?: string;
}): Promise<{ success: boolean; transaction?: RewardTransaction; error?: string }> {
  const { customerId, bookingId, type, points, status = 'COMPLETED', description } = params;
  if (!customerId || points === 0) {
    return { success: false, error: 'Valid customerId and non-zero points required' };
  }

  const txId = params.transactionId || `TX-${type}-${customerId}-${bookingId || Date.now()}`;
  const settings = await getRewardSettings();
  const rupeeValue = Math.round((Math.abs(points) / (settings.pointsToRupeeConversion || 10)) * 10) / 10;
  const walletRef = doc(db, 'reward_wallets', customerId);

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(walletRef);
      const existingData = snap.exists() ? (snap.data() as any) : null;

      const currentBalance = existingData
        ? existingData.pointsBalance !== undefined
          ? Number(existingData.pointsBalance)
          : Number(existingData.availablePoints || 0)
        : 0;
      const currentEarned = existingData ? Number(existingData.totalEarned || 0) : 0;
      const currentRedeemed = existingData ? Number(existingData.totalRedeemed || 0) : 0;
      const currentReversed = existingData ? Number(existingData.totalReversed || 0) : 0;
      const currentExpired = existingData ? Number(existingData.totalExpired || 0) : 0;
      const txHistory: RewardTransaction[] = existingData?.transactions || [];

      // 1. DUPLICATE REWARD PROTECTION: verify if transactionId or qualifying booking was already processed
      const alreadyProcessed = txHistory.some((t) => 
        t.transactionId === txId || 
        t.id === txId || 
        t.referenceId === txId ||
        (bookingId && t.bookingId === bookingId && t.type === type)
      );

      if (alreadyProcessed) {
        return {
          success: true,
          error: 'Transaction already processed (Idempotent ignore)',
        };
      }

      let newBalance = currentBalance;
      let newEarned = currentEarned;
      let newRedeemed = currentRedeemed;
      let newReversed = currentReversed;
      let newExpired = currentExpired;

      if (type === 'BOOKING' || type === 'REFERRAL' || type === 'PROMOTION') {
        newBalance += Math.abs(points);
        newEarned += Math.abs(points);
      } else if (type === 'ADMIN_ADJUSTMENT') {
        if (points > 0) {
          newBalance += points;
          newEarned += points;
        } else {
          // Negative balance protection
          newBalance = Math.max(0, newBalance + points);
          newReversed += Math.abs(points);
        }
      } else if (type === 'REDEMPTION') {
        newBalance = Math.max(0, newBalance - Math.abs(points));
        newRedeemed += Math.abs(points);
      } else if (type === 'REVERSAL') {
        newBalance = Math.max(0, newBalance - Math.abs(points));
        newReversed += Math.abs(points);
      } else if (type === 'EXPIRY') {
        newBalance = Math.max(0, newBalance - Math.abs(points));
        newExpired += Math.abs(points);
      }

      const newTx: RewardTransaction = {
        id: txId,
        transactionId: txId,
        customerId,
        ...(bookingId ? { bookingId } : {}),
        type,
        points: Math.abs(points),
        amountPoints: Math.abs(points),
        pointValue: rupeeValue,
        rupeeValue,
        status,
        referenceId: txId,
        description: description || `${type} Reward Points`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedWallet: CustomerRewardWallet = {
        customerId,
        pointsBalance: newBalance,
        availablePoints: newBalance,
        reservedPoints: existingData ? Number(existingData.reservedPoints || 0) : 0,
        totalEarned: newEarned,
        totalRedeemed: newRedeemed,
        totalReversed: newReversed,
        totalExpired: newExpired,
        estimatedRupeeValue: Math.round((newBalance / (settings.pointsToRupeeConversion || 10)) * 10) / 10,
        transactions: [newTx, ...txHistory],
        updatedAt: new Date().toISOString(),
      };

      transaction.set(walletRef, updatedWallet, { merge: true });
      return { success: true, transaction: newTx };
    });
  } catch (err: any) {
    console.error('Error creating reward transaction:', err);
    return { success: false, error: err.message || 'Transaction failed' };
  }
}

/**
 * Registers a new customer referral with strict anti-fraud & duplicate protections
 */
export async function registerReferral(
  referrerCustomerId: string,
  referredCustomerId: string,
  referralCode?: string
): Promise<{ success: boolean; referral?: CustomerReferralRecord; error?: string }> {
  if (!referrerCustomerId || !referredCustomerId) {
    return { success: false, error: 'Referrer and Referred Customer IDs are required.' };
  }

  // 1. SELF-REFERRAL PROTECTION
  if (referrerCustomerId === referredCustomerId) {
    return { success: false, error: 'Self-referral is strictly not allowed.' };
  }

  const settings = await getRewardSettings();
  const rewardPoints = settings.referralRewardPoints || 500;
  const referralId = `REF-${referrerCustomerId}-${referredCustomerId}`;
  const referralDocRef = doc(db, 'referrals', referralId);

  try {
    // 2. DUPLICATE REFERRAL PROTECTION: check if referredCustomerId was already referred
    const refCol = collection(db, 'referrals');
    const q = query(refCol, where('referredCustomerId', '==', referredCustomerId), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return { success: false, error: 'Referred customer has already been referred previously.' };
    }

    const newReferral: CustomerReferralRecord = {
      id: referralId,
      referralId,
      referrerCustomerId,
      referredCustomerId,
      status: 'PENDING',
      rewardPoints,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(referralDocRef, newReferral);

    logAuditEvent({
      action: 'REFERRAL_REGISTERED',
      details: `Referral registered: Referrer #${referrerCustomerId} referred Customer #${referredCustomerId}`,
      metadata: { referralId, referrerCustomerId, referredCustomerId, rewardPoints },
    }).catch(() => {});

    return { success: true, referral: newReferral };
  } catch (err: any) {
    console.error('Error registering referral:', err);
    return { success: false, error: err.message || 'Could not register referral' };
  }
}

/**
 * Awards Customer Reward Points upon qualifying action (e.g. first completed booking)
 * Strictly awards CUSTOMER REWARD POINTS ONLY (Never a cash payout).
 * Enforces duplicate reward protection.
 */
export async function processQualifyingReferralReward(
  referralId: string,
  qualifyingBookingId: string
): Promise<{ success: boolean; error?: string; rewardPoints?: number }> {
  if (!referralId || !qualifyingBookingId) {
    return { success: false, error: 'Referral ID and Qualifying Booking ID are required.' };
  }

  const referralDocRef = doc(db, 'referrals', referralId);

  try {
    const snap = await getDoc(referralDocRef);
    if (!snap.exists()) {
      return { success: false, error: 'Referral record not found.' };
    }

    const referral = snap.data() as CustomerReferralRecord;

    // DUPLICATE REWARD PROTECTION: check if already rewarded
    if (referral.status === 'REWARDED') {
      return { success: false, error: 'Referral reward has already been awarded.' };
    }

    // SELF-REFERRAL PROTECTION (secondary check)
    if (referral.referrerCustomerId === referral.referredCustomerId) {
      return { success: false, error: 'Self-referral qualification is rejected.' };
    }

    const settings = await getRewardSettings();
    const pointsToAward = referral.rewardPoints || settings.referralRewardPoints || 500;
    const idempotentTxId = `REFERRAL-REWARD-${referralId}`;

    // Award Customer Reward Points (NO CASH PAYOUT)
    const txResult = await createRewardTransaction({
      customerId: referral.referrerCustomerId,
      bookingId: qualifyingBookingId,
      type: 'REFERRAL',
      points: pointsToAward,
      status: 'COMPLETED',
      transactionId: idempotentTxId,
      description: `Referral Reward: Successfully referred customer #${referral.referredCustomerId.substring(0, 6)}`,
    });

    if (!txResult.success) {
      return { success: false, error: txResult.error };
    }

    // Update referral record to REWARDED
    await updateDoc(referralDocRef, {
      status: 'REWARDED',
      qualifyingBookingId,
      rewardPoints: pointsToAward,
      rewardTransactionId: idempotentTxId,
      updatedAt: new Date().toISOString(),
    });

    logAuditEvent({
      action: 'REFERRAL_AWARDED',
      details: `Referral reward of ${pointsToAward} points credited to Referrer #${referral.referrerCustomerId} for Booking #${qualifyingBookingId}`,
      metadata: { referralId, qualifyingBookingId, referrerCustomerId: referral.referrerCustomerId, points: pointsToAward },
    }).catch(() => {});

    return { success: true, rewardPoints: pointsToAward };
  } catch (err: any) {
    console.error('Error processing qualifying referral reward:', err);
    return { success: false, error: err.message || 'Reward processing failed' };
  }
}

/**
 * Awards booking reward points to customer upon verified booking
 * Idempotent: Same bookingId + customerId will never credit points twice.
 */
export async function awardBookingRewardPoints(
  customerId: string,
  bookingId: string,
  bookingAmount: number
): Promise<{ success: boolean; points?: number; error?: string }> {
  if (!customerId || !bookingId || bookingAmount <= 0) {
    return { success: false, error: 'Invalid parameters for booking reward' };
  }

  const settings = await getRewardSettings();
  if (!settings.enabled) {
    return { success: false, error: 'Reward system is currently disabled' };
  }

  const pointsEarned = Math.max(1, Math.round(bookingAmount * (settings.pointsPerRupeeSpent || 1)));
  const idempotentTxId = `BOOKING-REWARD-${bookingId}-${customerId}`;

  const result = await createRewardTransaction({
    customerId,
    bookingId,
    type: 'BOOKING',
    points: pointsEarned,
    status: 'COMPLETED',
    transactionId: idempotentTxId,
    description: `Booking Reward Points for Order #${bookingId}`,
  });

  if (result.success) {
    return { success: true, points: pointsEarned };
  }
  return { success: false, error: result.error };
}

/**
 * Performs an authorized Admin Reward Adjustment authoritatively and idempotently
 * Records full audit trail: adminId, customerId, points, reason, previousBalance, newBalance, timestamp, adjustmentId.
 */
export async function performAdminRewardAdjustment(params: {
  adminId: string;
  customerId: string;
  points: number;
  reason: string;
  adjustmentId?: string;
}): Promise<{
  success: boolean;
  adjustmentRecord?: AdminRewardAdjustmentRecord;
  error?: string;
}> {
  const { adminId, customerId, points, reason } = params;

  if (!customerId || points === 0) {
    return { success: false, error: 'Valid customerId and non-zero adjustment points required' };
  }

  const adjId = params.adjustmentId || `ADMIN-ADJ-${customerId}-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const walletRef = doc(db, 'reward_wallets', customerId);
  const settings = await getRewardSettings();
  const conversion = settings.pointsToRupeeConversion || 10;

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(walletRef);
      const existingData = snap.exists() ? (snap.data() as any) : null;

      const previousBalance = existingData
        ? existingData.pointsBalance !== undefined
          ? Number(existingData.pointsBalance)
          : Number(existingData.availablePoints || 0)
        : 0;

      const existingTx: RewardTransaction[] = existingData?.transactions || [];

      // Idempotency check: check if adjustmentId already processed
      const alreadyProcessed = existingTx.some((t) => t.transactionId === adjId || t.id === adjId);
      if (alreadyProcessed) {
        return {
          success: true,
          error: 'Admin adjustment already processed (Idempotent ignore)',
        };
      }

      // Negative balance protection
      const newBalance = Math.max(0, previousBalance + points);
      const currentEarned = existingData ? Number(existingData.totalEarned || 0) : 0;
      const currentReversed = existingData ? Number(existingData.totalReversed || 0) : 0;

      const newEarned = points > 0 ? currentEarned + points : currentEarned;
      const newReversed = points < 0 ? currentReversed + Math.abs(points) : currentReversed;

      const newTx: RewardTransaction = {
        id: adjId,
        transactionId: adjId,
        customerId,
        type: 'ADMIN_ADJUSTMENT',
        points: Math.abs(points),
        amountPoints: Math.abs(points),
        pointValue: Math.round((Math.abs(points) / conversion) * 10) / 10,
        rupeeValue: Math.round((Math.abs(points) / conversion) * 10) / 10,
        status: 'COMPLETED',
        referenceId: adjId,
        description: `Admin Adjustment (${adminId}): ${reason}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const updatedWallet: CustomerRewardWallet = {
        customerId,
        pointsBalance: newBalance,
        availablePoints: newBalance,
        reservedPoints: existingData ? Number(existingData.reservedPoints || 0) : 0,
        totalEarned: newEarned,
        totalRedeemed: existingData ? Number(existingData.totalRedeemed || 0) : 0,
        totalReversed: newReversed,
        totalExpired: existingData ? Number(existingData.totalExpired || 0) : 0,
        estimatedRupeeValue: Math.round((newBalance / conversion) * 10) / 10,
        transactions: [newTx, ...existingTx],
        updatedAt: nowIso,
      };

      transaction.set(walletRef, updatedWallet, { merge: true });

      const adjustmentRecord: AdminRewardAdjustmentRecord = {
        adjustmentId: adjId,
        adminId: adminId || 'super_admin',
        customerId,
        points,
        reason,
        previousBalance,
        newBalance,
        timestamp: nowIso,
        createdAt: nowIso,
      };

      logAuditEvent({
        action: 'REWARD_ADMIN_ADJUSTMENT',
        actorId: adminId,
        details: `Admin #${adminId} adjusted ${points > 0 ? '+' : ''}${points} reward points for Customer #${customerId}. Reason: ${reason}`,
        metadata: { adjustmentRecord },
      }).catch(() => {});

      return { success: true, adjustmentRecord };
    });
  } catch (err: any) {
    console.error('Error performing admin reward adjustment:', err);
    return { success: false, error: err.message || 'Admin adjustment failed' };
  }
}

/**
 * Backward compatibility alias for referral points awarding
 */
export async function awardReferralPoints(referrerId: string, referredId: string, referralCode?: string): Promise<boolean> {
  const regResult = await registerReferral(referrerId, referredId, referralCode);
  if (!regResult.success && regResult.error !== 'Referred customer has already been referred previously.') {
    return false;
  }
  const referralId = `REF-${referrerId}-${referredId}`;
  const res = await processQualifyingReferralReward(referralId, 'MANUAL-QUALIFY-' + Date.now());
  return res.success;
}

/**
 * Finds a referrer customer ID by their referral code, member code, or UID prefix.
 */
export async function findReferrerByCode(code: string): Promise<string | null> {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  try {
    // 1. Direct indexed query by memberCode
    const qMember = query(collection(db, 'users'), where('memberCode', '==', cleanCode), limit(1));
    const snap = await getDocs(qMember);
    if (!snap.empty) {
      return snap.docs[0].id;
    }

    // 2. Direct document ID lookup
    const directDoc = await getDoc(doc(db, 'users', cleanCode.toLowerCase()));
    if (directDoc.exists()) {
      return directDoc.id;
    }

    return null;
  } catch (err) {
    console.warn('Error finding referrer:', err);
    return null;
  }
}

/**
 * Checks if a customer was referred by someone and processes the qualifying referral reward on first completed booking.
 */
export async function checkAndRewardReferralOnBookingCompletion(
  customerId: string,
  bookingId: string
): Promise<{ success: boolean; rewardPoints?: number; error?: string }> {
  if (!customerId || !bookingId) {
    return { success: false, error: 'Customer ID and Booking ID required' };
  }

  try {
    const refCol = collection(db, 'referrals');
    const q = query(refCol, where('referredCustomerId', '==', customerId), where('status', '==', 'PENDING'), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, error: 'No pending referral found for this customer' };
    }

    const referralDoc = snap.docs[0];
    const referral = referralDoc.data() as CustomerReferralRecord;

    const result = await processQualifyingReferralReward(referral.referralId || referral.id, bookingId);
    return result;
  } catch (err: any) {
    console.error('Error checking referral on booking completion:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetches all referrals made by a given customer.
 */
export async function getCustomerReferrals(customerId: string): Promise<CustomerReferralRecord[]> {
  if (!customerId) return [];
  try {
    const refCol = collection(db, 'referrals');
    const q = query(refCol, where('referrerCustomerId', '==', customerId), limit(50));
    const snap = await getDocs(q);
    const list: CustomerReferralRecord[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() } as CustomerReferralRecord));
    return list;
  } catch (err) {
    console.warn('Error fetching customer referrals:', err);
    return [];
  }
}


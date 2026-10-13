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
import { RfqRequest, ProfessionalQuote, RfqFeeSettings } from '../types/rfq';

export const DEFAULT_RFQ_FEE_SETTINGS: RfqFeeSettings = {
  leadFee: 99,
  platformFee: 199,
  projectCommissionPercent: 10,
  transactionFeePercent: 2.0,
  updatedAt: new Date().toISOString(),
};

/**
 * Fetch RFQ fee settings from Firestore with defaults
 */
export async function getRfqFeeSettings(): Promise<RfqFeeSettings> {
  try {
    const ref = doc(db, 'settings', 'rfq_fee_settings');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...DEFAULT_RFQ_FEE_SETTINGS, ...snap.data() } as RfqFeeSettings;
    }
  } catch (err) {
    console.warn('[RfqService] Error fetching fee settings, using defaults:', err);
  }
  return DEFAULT_RFQ_FEE_SETTINGS;
}

/**
 * Save RFQ fee settings (Admin only)
 */
export async function saveRfqFeeSettings(settings: Partial<RfqFeeSettings>): Promise<RfqFeeSettings> {
  const current = await getRfqFeeSettings();
  const updated: RfqFeeSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'settings', 'rfq_fee_settings'), updated, { merge: true });
  return updated;
}

/**
 * Create a new Large/Custom Work RFQ Request
 */
export async function createRfqRequest(
  data: Omit<RfqRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<RfqRequest> {
  const id = `rfq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const newRfq: RfqRequest = {
    ...data,
    id,
    status: 'OPEN_FOR_QUOTES',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'rfq_requests', id), newRfq);
  return newRfq;
}

/**
 * Get RFQs submitted by a specific customer
 */
export async function getCustomerRfqs(customerId: string): Promise<RfqRequest[]> {
  try {
    const q = query(collection(db, 'rfq_requests'), where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RfqRequest));
  } catch (err) {
    console.warn('[RfqService] Error fetching customer RFQs:', err);
    return [];
  }
}

/**
 * Get all open RFQs for verified contractors / professionals
 */
export async function getOpenRfqs(): Promise<RfqRequest[]> {
  try {
    const q = query(collection(db, 'rfq_requests'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RfqRequest));
  } catch (err) {
    console.warn('[RfqService] Error fetching open RFQs:', err);
    return [];
  }
}

/**
 * Submit a professional quote for an RFQ
 */
export async function submitProfessionalQuote(
  data: Omit<ProfessionalQuote, 'id' | 'status' | 'createdAt'>
): Promise<ProfessionalQuote> {
  const id = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const quote: ProfessionalQuote = {
    ...data,
    id,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'professional_quotes', id), quote);

  // Update RFQ status to QUOTES_RECEIVED if first quote
  try {
    await setDoc(
      doc(db, 'rfq_requests', data.rfqId),
      { status: 'QUOTES_RECEIVED', updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (e) {}

  return quote;
}

/**
 * Get all quotes submitted for a specific RFQ
 */
export async function getQuotesForRfq(rfqId: string): Promise<ProfessionalQuote[]> {
  try {
    const q = query(collection(db, 'professional_quotes'), where('rfqId', '==', rfqId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProfessionalQuote));
  } catch (err) {
    console.warn('[RfqService] Error getting quotes for RFQ:', err);
    return [];
  }
}

/**
 * Accept a professional quote and hire contractor
 */
export async function acceptQuoteAndHire(rfqId: string, quoteId: string): Promise<boolean> {
  try {
    // 1. Update RFQ status
    await setDoc(
      doc(db, 'rfq_requests', rfqId),
      { status: 'ACCEPTED', acceptedQuoteId: quoteId, updatedAt: new Date().toISOString() },
      { merge: true }
    );

    // 2. Accept this quote, reject others
    const quotes = await getQuotesForRfq(rfqId);
    for (const q of quotes) {
      await setDoc(
        doc(db, 'professional_quotes', q.id),
        { status: q.id === quoteId ? 'ACCEPTED' : 'REJECTED' },
        { merge: true }
      );
    }
    return true;
  } catch (err) {
    console.error('Error accepting quote:', err);
    return false;
  }
}

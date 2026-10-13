import { collection, getDocs, doc, getDoc, query, where, limit as firestoreLimit, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../utils/sparkQuotaGuard';

export type SearchEntityType =
  | 'customer'
  | 'serviceman'
  | 'business_partner'
  | 'brand_promoter'
  | 'franchise'
  | 'booking'
  | 'ledger'
  | 'service'
  | 'rfq'
  | 'complaint'
  | 'audit_log';

export interface SearchResultItem {
  id: string;
  uniqueKey?: string;
  collectionName: string;
  entityType: SearchEntityType;
  title: string;
  subtitle: string;
  phone?: string;
  email?: string;
  status?: string;
  amount?: number;
  date?: string;
  city?: string;
  district?: string;
  pincode?: string;
  role?: string;
  badge: {
    label: string;
    color: string; // Tailwind color classes
  };
  rawData: Record<string, any>;
  metadata?: Record<string, any>;
  score?: number;
}

export interface RelatedEntitySummary {
  bookingsCount?: number;
  recentBookings?: any[];
  ledgersCount?: number;
  recentLedgers?: any[];
  walletBalance?: number;
  totalEarnings?: number;
  kycStatus?: string;
  assignedDistrict?: string;
  parentBooking?: any;
  childBookings?: any[];
}

// Memory cache for quick instantaneous queries
let cachedDatabaseRecords: SearchResultItem[] = [];
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache to preserve Spark daily read units

/**
 * Universal database loader across all core collections
 */
export async function loadUniversalDatabaseIndex(forceRefresh = false): Promise<SearchResultItem[]> {
  const now = Date.now();
  if (!forceRefresh && cachedDatabaseRecords.length > 0 && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return cachedDatabaseRecords;
  }

  if (isResourceExhausted()) {
    return cachedDatabaseRecords;
  }

  const results: SearchResultItem[] = [];

  // Helper to safely extract date string
  const extractDate = (data: any): string => {
    return data.createdAt || data.date || data.updatedAt || data.timestamp || data.bookingDate || '';
  };

  try {
    // 1. Fetch Users / Customers (capped)
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), firestoreLimit(50)));
      usersSnap.forEach((d) => {
        const u = d.data();
        const role = (u.role || 'customer').toLowerCase();
        let entityType: SearchEntityType = 'customer';
        let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        let badgeLabel = 'Customer (ग्राहक)';

        if (role.includes('service') || role === 'serviceman' || role === 'service_pro') {
          entityType = 'serviceman';
          badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
          badgeLabel = 'ServiceMan (₹121)';
        } else if (role.includes('partner') || role === 'business_partner') {
          entityType = 'business_partner';
          badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
          badgeLabel = 'Business Partner';
        } else if (role.includes('promoter') || role === 'brand_promoter') {
          entityType = 'brand_promoter';
          badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
          badgeLabel = 'Brand Promoter';
        } else if (role.includes('franchise')) {
          entityType = 'franchise';
          badgeColor = 'bg-orange-100 text-orange-800 border-orange-200';
          badgeLabel = 'Franchise Partner';
        }

        results.push({
          id: d.id,
          uniqueKey: `users_${d.id}`,
          collectionName: 'users',
          entityType,
          title: u.name || u.fullName || u.displayName || 'Unnamed User',
          subtitle: `${u.phone || 'No Phone'} • ${u.email || 'No Email'} • ${u.city || u.district || 'All India'}`,
          phone: u.phone,
          email: u.email,
          status: u.status || (u.isBlocked ? 'Blocked' : 'Active'),
          date: extractDate(u),
          city: u.city,
          district: u.district,
          pincode: u.pincode,
          role: u.role,
          badge: { label: badgeLabel, color: badgeColor },
          rawData: { ...u, _docId: d.id },
        });
      });
    } catch (e) {
      console.warn('[UniversalSearch] users collection error:', e);
      checkAndHandleQuotaError(e);
    }

    // 2. Fetch ServiceMen from 'service_men' (capped)
    try {
      const prosSnap = await getDocs(query(collection(db, 'service_men'), firestoreLimit(40)));
      prosSnap.forEach((d) => {
        const p = d.data();
        if (!results.some((r) => r.id === d.id)) {
          results.push({
            id: d.id,
            uniqueKey: `service_men_${d.id}`,
            collectionName: 'service_men',
            entityType: 'serviceman',
            title: p.name || p.fullName || 'Service Professional',
            subtitle: `${p.phone || ''} • Trade: ${p.trade || p.skills?.join(', ') || 'General'} • Rating: ⭐${p.rating || '5.0'}`,
            phone: p.phone,
            email: p.email,
            status: p.status || (p.verified ? 'Verified' : 'Pending'),
            city: p.city || p.location?.city,
            district: p.district || p.location?.district,
            pincode: p.pincode,
            role: 'service_man',
            badge: { label: 'ServiceMan (₹121 Model)', color: 'bg-teal-100 text-teal-800 border-teal-200' },
            rawData: { ...p, _docId: d.id },
          });
        }
      });
    } catch (e) {
      console.warn('[UniversalSearch] service_men collection error:', e);
      checkAndHandleQuotaError(e);
    }

    // 3. Fetch Franchise Partners from 'franchise_partners' (capped)
    try {
      const franSnap = await getDocs(query(collection(db, 'franchise_partners'), firestoreLimit(30)));
      franSnap.forEach((d) => {
        const fp = d.data();
        if (!results.some((r) => r.id === d.id)) {
          results.push({
            id: d.id,
            uniqueKey: `franchise_partners_${d.id}`,
            collectionName: 'franchise_partners',
            entityType: 'franchise',
            title: fp.name || fp.applicantName || fp.franchiseName || 'Franchise Partner',
            subtitle: `Code: ${fp.franchiseCode || d.id} • District: ${fp.district || fp.districtName || 'N/A'}, ${fp.state || ''} • Share: ${fp.revenueSharePercent || 10}%`,
            phone: fp.phone || fp.contactNumber,
            email: fp.email,
            status: fp.status || 'Active',
            district: fp.district,
            city: fp.district,
            role: 'franchise',
            badge: { label: `Franchise (${fp.franchiseCode || 'District'})`, color: 'bg-orange-100 text-orange-800 border-orange-200' },
            rawData: { ...fp, _docId: d.id },
          });
        }
      });
    } catch (e) {
      console.warn('[UniversalSearch] franchise_partners collection error:', e);
      checkAndHandleQuotaError(e);
    }

    // 4. Fetch Bookings from 'bookings' (capped)
    try {
      const bookSnap = await getDocs(query(collection(db, 'bookings'), firestoreLimit(50)));
      bookSnap.forEach((d) => {
        const b = d.data();
        results.push({
          id: d.id,
          uniqueKey: `bookings_${d.id}`,
          collectionName: 'bookings',
          entityType: 'booking',
          title: `Booking #${d.id.slice(-6).toUpperCase()}: ${b.serviceName || b.serviceTitle || 'Home Service'}`,
          subtitle: `Customer: ${b.customerName || 'N/A'} (${b.customerPhone || ''}) • Assigned: ${b.serviceManName || 'Not Assigned'} • Address: ${b.customerAddress || b.address || ''}`,
          phone: b.customerPhone || b.phone,
          status: b.status || 'pending',
          amount: Number(b.amount || b.totalAmount || b.price || 0),
          date: extractDate(b),
          city: b.city,
          district: b.district,
          pincode: b.pincode,
          badge: { label: `Booking (${(b.status || 'PENDING').toUpperCase()})`, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
          rawData: { ...b, _docId: d.id },
        });
      });
    } catch (e) {
      console.warn('[UniversalSearch] bookings collection error:', e);
      checkAndHandleQuotaError(e);
    }

    // 5. Fetch Ledgers from 'ledgers' (capped)
    try {
      const ledgerSnap = await getDocs(query(collection(db, 'ledgers'), firestoreLimit(50)));
      ledgerSnap.forEach((d) => {
        const l = d.data();
        const gross = Number(l.grossAmount || l.amount || 0);
        const comm = Number(l.commissionDistributed || l.commissionAmount || 0);
        const compGross = Number(l.companyGrossAmount || l.companyShare || 0);

        results.push({
          id: d.id,
          uniqueKey: `ledgers_${d.id}`,
          collectionName: 'ledgers',
          entityType: 'ledger',
          title: `TXN: ${l.transactionId || d.id}`,
          subtitle: `User: ${l.userName || 'N/A'} • Gross: ₹${gross} • Partner Comm: ₹${comm} • Company Profit: ₹${compGross} • Ref: ${l.referenceId || ''}`,
          phone: l.userPhone,
          status: l.status || 'APPROVED',
          amount: gross,
          date: extractDate(l),
          role: l.role,
          badge: { label: 'Financial Ledger Record', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
          rawData: { ...l, _docId: d.id },
        });
      });
    } catch (e) {
      console.warn('[UniversalSearch] ledgers collection error:', e);
      checkAndHandleQuotaError(e);
    }

    // 6. Fetch Catalog Services from 'services' (capped)
    try {
      const srvSnap = await getDocs(query(collection(db, 'services'), firestoreLimit(50)));
      srvSnap.forEach((d) => {
        const s = d.data();
        results.push({
          id: d.id,
          uniqueKey: `services_${d.id}`,
          collectionName: 'services',
          entityType: 'service',
          title: s.name || s.title || 'Service',
          subtitle: `Category: ${s.category || 'General'} • Price: ₹${s.price || 0} • Duration: ${s.duration || '60 mins'} • ${s.description?.slice(0, 60) || ''}`,
          amount: Number(s.price || 0),
          status: s.isActive !== false ? 'Active' : 'Inactive',
          badge: { label: `Catalog (${s.category || 'Service'})`, color: 'bg-purple-100 text-purple-800 border-purple-200' },
          rawData: { ...s, _docId: d.id },
        });
      });
    } catch (e) {
      console.warn('[UniversalSearch] services collection error:', e);
      checkAndHandleQuotaError(e);
    }

    // 7. Fetch RFQ Requests (capped)
    try {
      const rfqSnap = await getDocs(query(collection(db, 'rfq_requests'), firestoreLimit(20)));
      rfqSnap.forEach((d) => {
        const r = d.data();
        results.push({
          id: d.id,
          uniqueKey: `rfq_${d.id}`,
          collectionName: 'rfq_requests',
          entityType: 'rfq',
          title: `RFQ Quote Request: ${r.serviceTitle || r.category || 'Custom Job'}`,
          subtitle: `Customer: ${r.customerName || 'N/A'} (${r.customerPhone || ''}) • Budget: ₹${r.budget || 'Flexible'} • Location: ${r.district || r.city || ''}`,
          phone: r.customerPhone,
          status: r.status || 'Open',
          date: extractDate(r),
          badge: { label: 'RFQ Quote', color: 'bg-rose-100 text-rose-800 border-rose-200' },
          rawData: { ...r, _docId: d.id },
        });
      });
    } catch (e) {
      console.warn('[UniversalSearch] rfq_requests collection error:', e);
      checkAndHandleQuotaError(e);
    }

    cachedDatabaseRecords = results;
    lastCacheTimestamp = now;
  } catch (err) {
    console.error('[UniversalSearch] Master index error:', err);
    checkAndHandleQuotaError(err);
  }

  return cachedDatabaseRecords;
}

/**
 * Execute fast search query with ranking and type filtering
 */
export async function executeUniversalSearch(
  queryText: string,
  filterType: 'all' | SearchEntityType = 'all',
  limitResults = 50
): Promise<SearchResultItem[]> {
  const cleanQ = queryText.trim().toLowerCase();
  const index = await loadUniversalDatabaseIndex();

  if (!cleanQ && filterType === 'all') {
    // Return recent high-priority items
    return index.slice(0, 20).map((item, idx) => ({
      ...item,
      uniqueKey: item.uniqueKey || `${item.collectionName || item.entityType}_${item.id}_${idx}`,
    }));
  }

  const matches: Array<{ item: SearchResultItem; score: number }> = [];

  // Normalize phone query
  const cleanPhoneQ = cleanQ.replace(/[^0-9]/g, '');

  for (const item of index) {
    // Check type filter
    if (filterType !== 'all' && item.entityType !== filterType) {
      continue;
    }

    if (!cleanQ) {
      matches.push({ item, score: 1 });
      continue;
    }

    let score = 0;
    const titleLower = (item.title || '').toLowerCase();
    const subtitleLower = (item.subtitle || '').toLowerCase();
    const idLower = (item.id || '').toLowerCase();
    const phoneLower = (item.phone || '').replace(/[^0-9]/g, '');
    const emailLower = (item.email || '').toLowerCase();
    const cityLower = (item.city || '').toLowerCase();
    const districtLower = (item.district || '').toLowerCase();
    const pincodeLower = (item.pincode || '').toLowerCase();
    const rawDataStr = JSON.stringify(item.rawData).toLowerCase();

    // 1. Exact ID match (highest score)
    if (idLower === cleanQ || idLower.includes(cleanQ)) {
      score += idLower === cleanQ ? 100 : 60;
    }

    // 2. Phone match
    if (cleanPhoneQ && phoneLower.includes(cleanPhoneQ)) {
      score += phoneLower === cleanPhoneQ ? 90 : 50;
    }

    // 3. Exact or prefix title match
    if (titleLower.includes(cleanQ)) {
      score += titleLower.startsWith(cleanQ) ? 70 : 40;
    }

    // 4. Email match
    if (emailLower.includes(cleanQ)) {
      score += 45;
    }

    // 5. City / District / Pincode match
    if (cityLower.includes(cleanQ) || districtLower.includes(cleanQ) || pincodeLower.includes(cleanQ)) {
      score += 35;
    }

    // 6. Subtitle match
    if (subtitleLower.includes(cleanQ)) {
      score += 25;
    }

    // 7. Full raw data search (covers any field like orderId, paymentId, partnerId, vehicleNumber, aadharNo, etc.)
    if (rawDataStr.includes(cleanQ)) {
      score += 15;
    }

    if (score > 0) {
      matches.push({ item, score });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, limitResults).map((m, idx) => ({
    ...m.item,
    uniqueKey: m.item.uniqueKey || `${m.item.collectionName || m.item.entityType}_${m.item.id}_${idx}`,
    score: m.score,
  }));
}

/**
 * Fetch Deep Related Information for any selected item
 */
export async function getDeepEntityDetails(item: SearchResultItem): Promise<RelatedEntitySummary> {
  const summary: RelatedEntitySummary = {};

  try {
    const raw = item.rawData;

    // 1. If Customer or User: Fetch their bookings & ledgers
    if (item.entityType === 'customer' || item.entityType === 'business_partner' || item.entityType === 'brand_promoter') {
      try {
        const bq = query(collection(db, 'bookings'), where('customerId', '==', item.id), firestoreLimit(10));
        const bSnap = await getDocs(bq);
        const bList: any[] = [];
        bSnap.forEach((d) => bList.push({ id: d.id, ...d.data() }));
        summary.bookingsCount = bList.length;
        summary.recentBookings = bList;
      } catch (_) {}

      try {
        const lq = query(collection(db, 'ledgers'), where('userId', '==', item.id), firestoreLimit(10));
        const lSnap = await getDocs(lq);
        const lList: any[] = [];
        lSnap.forEach((d) => lList.push({ id: d.id, ...d.data() }));
        summary.ledgersCount = lList.length;
        summary.recentLedgers = lList;
      } catch (_) {}
    }

    // 2. If ServiceMan: Fetch their assigned jobs & earnings
    if (item.entityType === 'serviceman') {
      try {
        const bq = query(collection(db, 'bookings'), where('serviceManId', '==', item.id), firestoreLimit(15));
        const bSnap = await getDocs(bq);
        const bList: any[] = [];
        bSnap.forEach((d) => bList.push({ id: d.id, ...d.data() }));
        summary.bookingsCount = bList.length;
        summary.recentBookings = bList;
      } catch (_) {}

      summary.kycStatus = raw.verified ? 'Verified (सत्यापित)' : raw.kycStatus || 'Pending Verification';
      summary.walletBalance = raw.walletBalance || raw.wallet || 0;
      summary.totalEarnings = raw.totalEarnings || raw.earnings || 0;
    }

    // 3. If Franchise: Fetch district stats
    if (item.entityType === 'franchise') {
      summary.assignedDistrict = raw.district || raw.districtName || 'All India';
      summary.totalEarnings = raw.totalRevenue || raw.walletBalance || 0;
    }
  } catch (err) {
    console.warn('[UniversalSearch] getDeepEntityDetails error:', err);
  }

  return summary;
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Booking,
  ServiceGuarantee,
  GuaranteeClaim,
  GuaranteeSettings,
} from '../types';

export const DEFAULT_GUARANTEE_SETTINGS: GuaranteeSettings = {
  enabled: true,
  defaultValidityDays: 30,
  categoryValidityDays: {
    ac_repair: 30,
    ac: 30,
    electrician: 15,
    plumber: 15,
    cleaning: 7,
    carpenter: 15,
    ro_water_purifier: 30,
    appliance_repair: 30,
  },
  standardTerms: [
    'हार्डिनकाम 100% संतोषजनक सेवा गारंटी के तहत कवर किया गया कार्य।',
    'उसी तकनीकी समस्या की पुनरावृत्ति पर निःशुल्क रिविजिट (Free Revisit) की सुविधा।',
    'तकनीशियन द्वारा किए गए वास्तविक कार्य पर लागू, बाह्य भौतिक क्षति पर नहीं।',
  ],
  standardExclusions: [
    'ग्राहक द्वारा स्वयं या किसी तीसरे पक्ष द्वारा उपकरण के साथ की गई छेड़छाड़।',
    'विद्युत वोल्टेज में अचानक उतार-चढ़ाव या प्राकृतिक आपदा से हुई क्षति।',
    'नए पुर्जों (Spare Parts) का सामान्य टूट-फूट जो प्रारंभिक कार्य का हिस्सा नहीं था।',
  ],
  coversLabourOnly: false,
};

class ServiceGuaranteeService {
  /**
   * Retrieves active guarantee settings from Firestore or defaults
   */
  public async getGuaranteeSettings(): Promise<GuaranteeSettings> {
    try {
      const snap = await getDoc(doc(db, 'system_settings', 'service_guarantee'));
      if (snap.exists()) {
        return { ...DEFAULT_GUARANTEE_SETTINGS, ...snap.data() } as GuaranteeSettings;
      }
    } catch (e) {
      console.warn('[GuaranteeService] Using default guarantee settings:', e);
    }
    return DEFAULT_GUARANTEE_SETTINGS;
  }

  /**
   * Updates guarantee settings in Firestore
   */
  public async updateGuaranteeSettings(settings: GuaranteeSettings): Promise<void> {
    await setDoc(doc(db, 'system_settings', 'service_guarantee'), {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Generates or fetches a service guarantee for a completed & verified booking
   */
  public async generateGuaranteeForBooking(booking: Booking): Promise<ServiceGuarantee | null> {
    // Only completed bookings are eligible
    if (booking.status !== 'completed' && booking.status !== 'work_completed') {
      return null;
    }

    const guaranteeId = `guar_${booking.id}`;
    const guaranteeRef = doc(db, 'service_guarantees', guaranteeId);

    try {
      const existing = await getDoc(guaranteeRef);
      if (existing.exists()) {
        return existing.data() as ServiceGuarantee;
      }

      const settings = await this.getGuaranteeSettings();
      if (!settings.enabled) return null;

      const catKey = (booking.categoryId || '').toLowerCase();
      const validityDays =
        settings.categoryValidityDays[catKey] || settings.defaultValidityDays;

      const completionDate = booking.completedAt || booking.updatedAt || new Date().toISOString();
      const startDate = completionDate;
      const expiry = new Date(new Date(completionDate).getTime() + validityDays * 24 * 60 * 60 * 1000);
      const expiryDate = expiry.toISOString();
      const isExpired = Date.now() > expiry.getTime();

      const newGuarantee: ServiceGuarantee = {
        id: guaranteeId,
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        serviceId: booking.serviceId,
        serviceName: booking.serviceName,
        categoryId: booking.categoryId,
        categoryName: booking.categoryName,
        serviceManId: booking.serviceManId || '',
        serviceManName: booking.serviceManName || 'Hardinkaam Verified Technician',
        completionDate,
        startDate,
        expiryDate,
        validityDays,
        terms: settings.standardTerms,
        exclusions: settings.standardExclusions,
        coveredWork: [booking.serviceName, 'सेवा के दौरान किए गए समस्त समायोजन एवं परीक्षण'],
        status: isExpired ? 'expired' : 'active',
        createdAt: new Date().toISOString(),
      };

      await setDoc(guaranteeRef, newGuarantee);
      return newGuarantee;
    } catch (err) {
      console.error('[GuaranteeService] Failed to generate guarantee:', err);
      return null;
    }
  }

  /**
   * Fetches all guarantees for a customer
   */
  public async getGuaranteesForCustomer(customerId: string): Promise<ServiceGuarantee[]> {
    try {
      const q = query(
        collection(db, 'service_guarantees'),
        where('customerId', '==', customerId),
        firestoreLimit(50)
      );
      const snap = await getDocs(q);
      const list: ServiceGuarantee[] = [];
      const now = Date.now();

      snap.forEach((d) => {
        const item = d.data() as ServiceGuarantee;
        if (item.status === 'active' && new Date(item.expiryDate).getTime() < now) {
          item.status = 'expired';
        }
        list.push(item);
      });

      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e) {
      console.warn('[GuaranteeService] Error fetching customer guarantees:', e);
      return [];
    }
  }

  /**
   * Fetches single guarantee by booking ID
   */
  public async getGuaranteeByBookingId(bookingId: string): Promise<ServiceGuarantee | null> {
    try {
      const snap = await getDoc(doc(db, 'service_guarantees', `guar_${bookingId}`));
      if (snap.exists()) {
        const data = snap.data() as ServiceGuarantee;
        if (data.status === 'active' && new Date(data.expiryDate).getTime() < Date.now()) {
          data.status = 'expired';
        }
        return data;
      }
    } catch (e) {
      console.warn('[GuaranteeService] Error getting guarantee:', e);
    }
    return null;
  }

  /**
   * Submits a customer guarantee claim
   */
  public async submitGuaranteeClaim(
    claimData: Omit<GuaranteeClaim, 'id' | 'status' | 'createdAt'>
  ): Promise<GuaranteeClaim> {
    // 1. Verify guarantee exists and is still active
    const guarantee = await this.getGuaranteeByBookingId(claimData.bookingId);
    if (!guarantee) {
      throw new Error('इस बुकिंग के लिए कोई सक्रिय गारंटी रिकॉर्ड नहीं मिला।');
    }
    if (guarantee.status === 'expired' || new Date(guarantee.expiryDate).getTime() < Date.now()) {
      throw new Error('इस सेवा की गारंटी अवधि समाप्त (Expired) हो चुकी है।');
    }
    if (guarantee.status === 'claimed') {
      throw new Error('इस गारंटी के तहत पहले से एक दावा सक्रिय है।');
    }

    const claimId = `gclaim_${Date.now()}`;
    const newClaim: GuaranteeClaim = {
      ...claimData,
      id: claimId,
      status: 'submitted',
      createdAt: new Date().toISOString(),
    };

    // Save claim document
    await setDoc(doc(db, 'guarantee_claims', claimId), newClaim);

    // Update guarantee status to 'claimed'
    await updateDoc(doc(db, 'service_guarantees', guarantee.id), {
      status: 'claimed',
      claimId,
      updatedAt: new Date().toISOString(),
    });

    return newClaim;
  }

  /**
   * Admin approves guarantee claim and auto-generates linked Free Revisit booking (₹0 customer charge)
   */
  public async adminApproveClaim(
    claimId: string,
    assignedProId?: string,
    assignedProName?: string,
    revisitDate?: string
  ): Promise<{ claim: GuaranteeClaim; revisitBooking: Booking }> {
    const claimRef = doc(db, 'guarantee_claims', claimId);
    const claimSnap = await getDoc(claimRef);
    if (!claimSnap.exists()) {
      throw new Error('दावा रिकॉर्ड नहीं मिला।');
    }

    const claim = claimSnap.data() as GuaranteeClaim;
    const origBookingSnap = await getDoc(doc(db, 'bookings', claim.bookingId));
    if (!origBookingSnap.exists()) {
      throw new Error('मूल बुकिंग रिकॉर्ड नहीं मिला।');
    }
    const origBooking = origBookingSnap.data() as Booking;

    const revisitBookingId = `bkg_revisit_${claim.bookingId.slice(-6)}_${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();
    const scheduledDate = revisitDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const revisitBooking: Booking = {
      id: revisitBookingId,
      customerId: origBooking.customerId,
      customerName: origBooking.customerName,
      customerPhone: origBooking.customerPhone,
      serviceId: origBooking.serviceId,
      serviceName: `[मुफ़्त रिविजिट / Free Revisit] ${origBooking.serviceName}`,
      categoryId: origBooking.categoryId,
      categoryName: origBooking.categoryName,
      serviceManId: assignedProId || origBooking.serviceManId,
      serviceManName: assignedProName || origBooking.serviceManName || 'Hardinkaam Verified Pro',
      serviceManPhone: origBooking.serviceManPhone || '+91 98260 12345',
      partnerId: origBooking.partnerId || '',
      scheduledDate,
      scheduledTime: claim.preferredContactTime || '11:00 AM - 01:00 PM',
      address: origBooking.address,
      city: origBooking.city || 'Bhopal',
      pincode: origBooking.pincode || '462001',
      notes: `सर्विस गारंटी दावा #${claimId} के तहत निःशुल्क रिविजिट। समस्या विवरण: ${claim.description}`,
      amount: 0,
      totalAmount: 0,
      status: 'pending',
      paymentStatus: 'paid', // Marked 100% covered under warranty, ₹0 charged
      paymentMethod: 'cash',
      companyCommission: 0,
      taxDeduction: 0,
      servicemanPayoutAmount: 150, // Subsidized guarantee labor compensation covered by platform
      payoutStatus: 'pending',
      isReviewed: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // 1. Create revisit booking in Firestore
    await setDoc(doc(db, 'bookings', revisitBookingId), revisitBooking);

    // 2. Update claim with approval & link
    const updatedClaim: GuaranteeClaim = {
      ...claim,
      status: 'approved',
      revisitBookingId,
      assignedProId: revisitBooking.serviceManId,
      assignedProName: revisitBooking.serviceManName,
      reviewedAt: nowIso,
    };
    await updateDoc(claimRef, updatedClaim as any);

    // 3. Update guarantee record
    await updateDoc(doc(db, 'service_guarantees', claim.guaranteeId), {
      revisitBookingId,
      updatedAt: nowIso,
    });

    return { claim: updatedClaim, revisitBooking };
  }

  /**
   * Admin rejects claim with clear documented reason
   */
  public async adminRejectClaim(claimId: string, reason: string): Promise<GuaranteeClaim> {
    const claimRef = doc(db, 'guarantee_claims', claimId);
    const claimSnap = await getDoc(claimRef);
    if (!claimSnap.exists()) throw new Error('Claim not found');
    const claim = claimSnap.data() as GuaranteeClaim;

    const nowIso = new Date().toISOString();
    const updatedClaim: GuaranteeClaim = {
      ...claim,
      status: 'rejected',
      rejectionReason: reason,
      reviewedAt: nowIso,
    };
    await updateDoc(claimRef, updatedClaim as any);

    // Reset guarantee status back to active (so customer can still see it or appeal)
    await updateDoc(doc(db, 'service_guarantees', claim.guaranteeId), {
      status: 'active',
      updatedAt: nowIso,
    });

    return updatedClaim;
  }

  /**
   * Admin marks claim resolved once customer confirms resolution
   */
  public async adminResolveClaim(claimId: string, notes?: string): Promise<GuaranteeClaim> {
    const claimRef = doc(db, 'guarantee_claims', claimId);
    const claimSnap = await getDoc(claimRef);
    if (!claimSnap.exists()) throw new Error('Claim not found');
    const claim = claimSnap.data() as GuaranteeClaim;

    const nowIso = new Date().toISOString();
    const updatedClaim: GuaranteeClaim = {
      ...claim,
      status: 'resolved',
      adminNotes: notes || 'समस्या का संतोषजनक समाधान कर दिया गया।',
      resolvedAt: nowIso,
    };
    await updateDoc(claimRef, updatedClaim as any);
    return updatedClaim;
  }

  /**
   * Fetches all claims for Admin panel review
   */
  public async getAllClaims(): Promise<GuaranteeClaim[]> {
    try {
      const q = query(collection(db, 'guarantee_claims'), firestoreLimit(100));
      const snap = await getDocs(q);
      const list: GuaranteeClaim[] = [];
      snap.forEach((d) => list.push(d.data() as GuaranteeClaim));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (e) {
      console.warn('[GuaranteeService] Error fetching all claims:', e);
      return [];
    }
  }
}

export const serviceGuaranteeService = new ServiceGuaranteeService();

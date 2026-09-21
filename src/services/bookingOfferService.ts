/**
 * HARDINKAAM SERVICE PROFESSIONAL BOOKING OFFER ENGINE
 * Secure Booking Offer System with Atomic Concurrency Protection
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
  writeBatch,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  addDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, BookingOffer, BookingOfferStatus, ServiceMan } from '../types';

/**
 * Result of attempting to accept a booking offer
 */
export interface AcceptOfferResult {
  success: boolean;
  message: string;
  code?: 'ACCEPTED' | 'ALREADY_TAKEN' | 'OFFER_EXPIRED' | 'NOT_PENDING' | 'UNAUTHORIZED' | 'ERROR';
  bookingId?: string;
  offerId?: string;
}

/**
 * Parameters for offer acceptance
 */
export interface AcceptOfferParams {
  offerId: string;
  bookingId: string;
  serviceManId: string;
  serviceManName?: string;
  serviceManPhone?: string;
}

/**
 * Strict Eligibility Validator for Service Professionals.
 * 
 * Rules:
 * 1. active ServiceMan (isActive !== false, not suspended/blocked)
 * 2. approved/verified according to existing rules (isVerified === true OR kycStatus === 'verified')
 * 3. correct district (districtId / districtName / city matches booking)
 * 4. correct service/category (categoryIds includes booking.categoryId or service match)
 * 5. available status (isAvailable === true, not busy)
 * 6. permitted service area (serviceArea / city covers booking location)
 * 
 * DO NOT notify unrelated Service Professionals.
 */
export function checkServiceManEligibility(pro: ServiceMan, booking: Booking): boolean {
  // 1. active ServiceMan check
  const isSuspended = (pro as any).status === 'suspended' || (pro as any).accountStatus === 'suspended';
  const isBlocked = (pro as any).status === 'blocked' || (pro as any).accountStatus === 'blocked';
  const isInactive = (pro as any).status === 'inactive' || (pro as any).isActive === false;
  if (isSuspended || isBlocked || isInactive) {
    return false;
  }

  // 2. approved/verified according to existing rules
  const isKycVerified = pro.kycStatus === 'verified' || (pro as any).kycStatus === 'approved';
  const isVerifiedFlag = pro.isVerified === true;
  if (!isVerifiedFlag && !isKycVerified) {
    return false;
  }

  // 3. available status
  if (!pro.isAvailable) {
    return false;
  }
  if ((pro as any).dutyStatus === 'busy' || (pro as any).isBusy === true) {
    return false;
  }

  // 4. correct service / category
  if (booking.categoryId) {
    const bookingCat = booking.categoryId.toLowerCase().trim();
    const hasCategoryMatch = pro.categoryIds && pro.categoryIds.some((catId) => {
      const c = catId.toLowerCase().trim();
      return c === bookingCat || c.includes(bookingCat) || bookingCat.includes(c);
    });

    // Also check categoryNames fallback
    const hasCatNameMatch = pro.categoryNames && pro.categoryNames.some((catName) => {
      const cn = catName.toLowerCase().trim();
      const bCatName = (booking.categoryName || '').toLowerCase().trim();
      return (bCatName && (cn.includes(bCatName) || bCatName.includes(cn))) || cn.includes(bookingCat);
    });

    if (!hasCategoryMatch && !hasCatNameMatch) {
      return false;
    }
  }

  // 5. correct district
  const bookingDistrict = (booking.districtId || (booking as any).assignedDistrictId || '').toLowerCase().trim();
  const bookingDistrictName = (booking.districtName || (booking as any).assignedDistrictName || '').toLowerCase().trim();
  const bookingCity = (booking.city || '').toLowerCase().trim();

  const proDistrict = (pro.districtId || (pro as any).assignedDistrictId || '').toLowerCase().trim();
  const proDistrictName = (pro.districtName || (pro as any).assignedDistrictName || '').toLowerCase().trim();
  const proCity = (pro.city || '').toLowerCase().trim();
  const proArea = (pro.serviceArea || '').toLowerCase().trim();

  // District must match if booking specifies a district
  if (bookingDistrict || bookingDistrictName || bookingCity) {
    const districtMatch =
      (bookingDistrict && (proDistrict === bookingDistrict || proDistrictName.includes(bookingDistrict) || proArea.includes(bookingDistrict))) ||
      (bookingDistrictName && (proDistrictName.includes(bookingDistrictName) || proArea.includes(bookingDistrictName) || proCity.includes(bookingDistrictName))) ||
      (bookingCity && (proCity === bookingCity || proArea.includes(bookingCity) || proDistrictName.includes(bookingCity)));

    if (!districtMatch) {
      return false;
    }
  }

  // 6. permitted service area
  if (booking.pincode && (pro as any).coveredPincodes && Array.isArray((pro as any).coveredPincodes)) {
    if ((pro as any).coveredPincodes.length > 0 && !(pro as any).coveredPincodes.includes(booking.pincode)) {
      return false;
    }
  }

  return true;
}

class BookingOfferService {
  private activeListeners: Map<string, () => void> = new Map();

  /**
   * Generates a deterministic offer ID linking booking and serviceman
   */
  public getOfferId(bookingId: string, serviceManId: string): string {
    return `offer_${bookingId}_${serviceManId}`;
  }

  /**
   * Find eligible Service Professionals for a booking
   */
  public async getEligibleProfessionals(booking: Booking): Promise<ServiceMan[]> {
    try {
      const prosRef = collection(db, 'service_men');
      const snap = await getDocs(prosRef);
      const eligible: ServiceMan[] = [];

      snap.forEach((docSnap) => {
        const pro = { id: docSnap.id, ...docSnap.data() } as ServiceMan;
        if (checkServiceManEligibility(pro, booking)) {
          eligible.push(pro);
        }
      });

      return eligible;
    } catch (err) {
      console.error('[BookingOfferService] Error fetching professionals:', err);
      return [];
    }
  }

  /**
   * Customer booking creates actionable offers for eligible Service Professionals.
   * DO NOT notify unrelated Service Professionals.
   */
  public async createBookingOffersForBooking(
    booking: Booking,
    expiryMinutes: number = 15
  ): Promise<BookingOffer[]> {
    if (!booking || !booking.id) {
      console.warn('[BookingOfferService] Invalid booking provided to createBookingOffersForBooking');
      return [];
    }

    // If booking is already taken/assigned or not pending, do not generate offers
    if (booking.status && booking.status !== 'pending') {
      return [];
    }

    try {
      const eligiblePros = await this.getEligibleProfessionals(booking);
      if (eligiblePros.length === 0) {
        console.warn(`[BookingOfferService] No eligible service pros found for booking ${booking.id}`);
        return [];
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();
      const nowIso = now.toISOString();

      const createdOffers: BookingOffer[] = [];
      const batch = writeBatch(db);

      for (const pro of eligiblePros) {
        const offerId = this.getOfferId(booking.id, pro.id);
        const offerDocRef = doc(db, 'booking_offers', offerId);

        const offer: BookingOffer = {
          offerId,
          bookingId: booking.id,
          serviceManId: pro.id,
          serviceManName: pro.name,
          serviceManPhone: pro.phone,
          districtId: booking.districtId || (booking as any).assignedDistrictId || pro.districtId || '',
          districtName: booking.districtName || (booking as any).assignedDistrictName || pro.districtName || '',
          serviceId: booking.serviceId || '',
          serviceName: booking.serviceName || '',
          categoryId: booking.categoryId || '',
          categoryName: booking.categoryName || '',
          status: 'PENDING',
          createdAt: nowIso,
          expiresAt: expiresAt,
          amount: booking.amount,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          address: booking.address,
          city: booking.city,
          pincode: booking.pincode,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone,
          updatedAt: nowIso,
        };

        batch.set(offerDocRef, offer);
        createdOffers.push(offer);

        // Also create a backup record in booking_assignments for legacy compatibility
        try {
          const assignmentRef = doc(db, 'booking_assignments', `assign_${booking.id}_${pro.id}`);
          batch.set(
            assignmentRef,
            {
              assignmentId: `assign_${booking.id}_${pro.id}`,
              bookingId: booking.id,
              serviceManId: pro.id,
              status: 'offered',
              amount: booking.amount,
              createdAt: nowIso,
              expiresAt: expiresAt,
              districtId: offer.districtId,
            },
            { merge: true }
          );
        } catch (_) {
          // Non-critical
        }
      }

      await batch.commit();

      console.log(
        `[BookingOfferService] Dispatched ${createdOffers.length} offers for booking ${booking.id} to verified pros:`,
        eligiblePros.map((p) => `${p.name} (${p.id})`)
      );

      return createdOffers;
    } catch (err) {
      console.error('[BookingOfferService] Error creating booking offers:', err);
      return [];
    }
  }

  /**
   * ATOMIC ACCEPTANCE ENGINE
   * 
   * CRITICAL GUARANTEES:
   * 1. Two Service Professionals must NOT be able to successfully accept the same booking.
   * 2. Uses Firestore transaction/atomic state protection.
   * 3. Only: PENDING → ACCEPTED is allowed for first valid acceptance.
   * 4. After acceptance: all other offers become unavailable/expired.
   * 5. Do not allow ServiceMan to assign himself to arbitrary booking (verified by offer link).
   */
  public async acceptBookingOffer(params: AcceptOfferParams): Promise<AcceptOfferResult> {
    const { offerId, bookingId, serviceManId, serviceManName, serviceManPhone } = params;

    if (!offerId || !bookingId || !serviceManId) {
      return {
        success: false,
        code: 'ERROR',
        message: 'Invalid parameters for offer acceptance.',
      };
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const offerRef = doc(db, 'booking_offers', offerId);
    const nowIso = new Date().toISOString();

    try {
      // 1. Execute the atomic Firestore transaction
      await runTransaction(db, async (transaction) => {
        // Read Booking Doc
        const bookingSnap = await transaction.get(bookingRef);
        if (!bookingSnap.exists()) {
          throw new Error('BOOKING_NOT_FOUND');
        }

        const bookingData = bookingSnap.data() as Booking;

        // Check if booking is already taken by ANY professional
        const terminalOrClaimed = [
          'accepted',
          'on_the_way',
          'arriving',
          'arrived',
          'in_progress',
          'work_started',
          'work_completed',
          'completed',
          'cancelled',
          'rejected',
        ];

        if (terminalOrClaimed.includes(bookingData.status)) {
          throw new Error('BOOKING_ALREADY_TAKEN');
        }

        // Verify no other serviceManId is set on this booking
        if (bookingData.serviceManId && bookingData.serviceManId !== serviceManId && bookingData.serviceManId !== 'unassigned') {
          throw new Error('BOOKING_ALREADY_TAKEN');
        }

        // Read Offer Doc
        const offerSnap = await transaction.get(offerRef);
        if (!offerSnap.exists()) {
          throw new Error('OFFER_NOT_FOUND');
        }

        const offerData = offerSnap.data() as BookingOffer;

        // Verify caller matches offer serviceManId (prevent unauthorized arbitrary self-assignment)
        if (offerData.serviceManId !== serviceManId) {
          throw new Error('UNAUTHORIZED_OFFER');
        }

        // Verify offer links to target booking
        if (offerData.bookingId !== bookingId) {
          throw new Error('OFFER_BOOKING_MISMATCH');
        }

        // Enforce state transition: ONLY PENDING → ACCEPTED allowed
        if (offerData.status !== 'PENDING') {
          if (offerData.status === 'ACCEPTED') {
            return; // already accepted by this caller
          }
          throw new Error('OFFER_NOT_PENDING');
        }

        // Check if offer expired
        if (offerData.expiresAt && new Date(offerData.expiresAt).getTime() < Date.now()) {
          throw new Error('OFFER_EXPIRED');
        }

        // ATOMIC WRITES INSIDE TRANSACTION
        // 1. Mark booking as accepted by this professional
        transaction.update(bookingRef, {
          status: 'accepted',
          serviceManId: serviceManId,
          serviceManName: serviceManName || offerData.serviceManName || 'Verified Professional',
          serviceManPhone: serviceManPhone || offerData.serviceManPhone || '',
          acceptedAt: nowIso,
          updatedAt: nowIso,
        });

        // 2. Mark this specific offer as ACCEPTED
        transaction.update(offerRef, {
          status: 'ACCEPTED',
          respondedAt: nowIso,
          updatedAt: nowIso,
        });

        // Also initialize / update live serviceTracking document
        try {
          const trackingRef = doc(db, 'serviceTracking', bookingId);
          transaction.set(
            trackingRef,
            {
              bookingId,
              servicemanId: serviceManId,
              servicemanName: serviceManName || 'Verified Professional',
              servicemanPhone: serviceManPhone || '',
              status: 'ASSIGNED',
              assignedAt: nowIso,
              lastUpdatedAt: nowIso,
            },
            { merge: true }
          );
        } catch (_) {
          // non-blocking
        }

        // Also update legacy assignment if exists
        try {
          const legacyRef = doc(db, 'booking_assignments', `assign_${bookingId}_${serviceManId}`);
          transaction.set(
            legacyRef,
            {
              status: 'accepted',
              respondedAt: nowIso,
              updatedAt: nowIso,
            },
            { merge: true }
          );
        } catch (_) {
          // ignore
        }
      });

      // Audit log acceptance
      try {
        await addDoc(collection(db, 'audit_logs'), {
          bookingId,
          offerId,
          serviceManId,
          action: 'OFFER_ACCEPTED',
          details: `Booking offer accepted atomically by technician ${serviceManName || serviceManId}`,
          timestamp: nowIso,
        });
      } catch (_) {}

      // 2. POST-ACCEPTANCE INVALIDATION
      // "After acceptance: all other offers become unavailable/expired according to existing architecture."
      try {
        await this.expireRemainingOffers(bookingId, offerId);
      } catch (invalidationErr) {
        console.warn('[BookingOfferService] Error invalidating other offers:', invalidationErr);
      }

      return {
        success: true,
        code: 'ACCEPTED',
        message: 'Booking successfully accepted! Customer has been notified.',
        bookingId,
        offerId,
      };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.warn(`[BookingOfferService] Accept offer failed for ${offerId}:`, errMsg);

      if (errMsg.includes('BOOKING_ALREADY_TAKEN')) {
        // Mark caller's offer as EXPIRED since someone else won the race
        try {
          await updateDoc(offerRef, {
            status: 'EXPIRED',
            respondedAt: nowIso,
            rejectionReason: 'Claimed by another service professional',
            updatedAt: nowIso,
          });
        } catch (_) {}

        return {
          success: false,
          code: 'ALREADY_TAKEN',
          message: 'यह बुकिंग पहले ही किसी अन्य सर्विसमैन द्वारा स्वीकार कर ली गई है। (Booking already accepted by another professional.)',
          bookingId,
          offerId,
        };
      }

      if (errMsg.includes('OFFER_EXPIRED')) {
        try {
          await updateDoc(offerRef, {
            status: 'EXPIRED',
            respondedAt: nowIso,
            updatedAt: nowIso,
          });
        } catch (_) {}

        return {
          success: false,
          code: 'OFFER_EXPIRED',
          message: 'इस ऑफर की समय सीमा समाप्त हो चुकी है। (This offer has expired.)',
          bookingId,
          offerId,
        };
      }

      if (errMsg.includes('UNAUTHORIZED_OFFER')) {
        return {
          success: false,
          code: 'UNAUTHORIZED',
          message: 'अनधिकृत: आप केवल अपने लिए जारी किए गए वैध प्रस्ताव को ही स्वीकार कर सकते हैं।',
          bookingId,
          offerId,
        };
      }

      if (errMsg.includes('OFFER_NOT_PENDING')) {
        return {
          success: false,
          code: 'NOT_PENDING',
          message: 'यह प्रस्ताव अब सक्रिय (PENDING) नहीं है।',
          bookingId,
          offerId,
        };
      }

      return {
        success: false,
        code: 'ERROR',
        message: 'ऑफर स्वीकार करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
        bookingId,
        offerId,
      };
    }
  }

  /**
   * Reject an offer explicitly by the professional
   * Stops alarm, records rejection, preserves history, and triggers reassignment if needed
   */
  public async rejectBookingOffer(
    offerId: string,
    serviceManId: string,
    reason: string = 'Declined by professional'
  ): Promise<boolean> {
    try {
      const offerRef = doc(db, 'booking_offers', offerId);
      const offerSnap = await getDoc(offerRef);

      if (!offerSnap.exists()) return false;
      const data = offerSnap.data() as BookingOffer;

      // Verify ownership
      if (data.serviceManId !== serviceManId) {
        throw new Error('Unauthorized reject attempt');
      }

      // Can only reject PENDING offer
      if (data.status !== 'PENDING') {
        return false;
      }

      const nowIso = new Date().toISOString();
      await updateDoc(offerRef, {
        status: 'REJECTED',
        respondedAt: nowIso,
        rejectionReason: reason,
        updatedAt: nowIso,
      });

      // Record rejection on booking document to preserve history and prevent re-dispatch
      if (data.bookingId) {
        try {
          const bookingRef = doc(db, 'bookings', data.bookingId);
          await updateDoc(bookingRef, {
            rejectedBy: arrayUnion(serviceManId),
            updatedAt: nowIso,
          });

          // Check if any other pending offers exist for this booking
          const remainingQ = query(
            collection(db, 'booking_offers'),
            where('bookingId', '==', data.bookingId),
            where('status', '==', 'PENDING')
          );
          const remainingSnap = await getDocs(remainingQ);

          // If no pending offers remain and booking is unassigned, make available for reassignment
          if (remainingSnap.empty) {
            await updateDoc(bookingRef, {
              offersDispatched: false,
              reassignmentNeeded: true,
              lastReassignmentTriggerAt: nowIso,
            });
          }
        } catch (bookingUpdateErr) {
          console.warn('[BookingOfferService] Booking rejection history update note:', bookingUpdateErr);
        }

        // Audit log rejection
        try {
          await addDoc(collection(db, 'audit_logs'), {
            bookingId: data.bookingId,
            offerId,
            serviceManId,
            action: 'OFFER_REJECTED',
            details: `Technician declined booking offer. Reason: ${reason}`,
            timestamp: nowIso,
          });
        } catch (_) {}
      }

      return true;
    } catch (err) {
      console.error('[BookingOfferService] Error rejecting offer:', err);
      return false;
    }
  }

  /**
   * Expire an offer (e.g. countdown timeout)
   * Transitions PENDING → EXPIRED, makes booking available for reassignment if needed
   */
  public async expireBookingOffer(offerId: string): Promise<boolean> {
    try {
      const offerRef = doc(db, 'booking_offers', offerId);
      const offerSnap = await getDoc(offerRef);

      if (!offerSnap.exists()) return false;
      const data = offerSnap.data() as BookingOffer;

      if (data.status !== 'PENDING') return false;

      const nowIso = new Date().toISOString();
      await updateDoc(offerRef, {
        status: 'EXPIRED',
        respondedAt: nowIso,
        updatedAt: nowIso,
      });

      // Check if any other pending offers remain for this booking
      if (data.bookingId) {
        try {
          const bookingRef = doc(db, 'bookings', data.bookingId);
          const remainingQ = query(
            collection(db, 'booking_offers'),
            where('bookingId', '==', data.bookingId),
            where('status', '==', 'PENDING')
          );
          const remainingSnap = await getDocs(remainingQ);

          if (remainingSnap.empty) {
            await updateDoc(bookingRef, {
              offersDispatched: false,
              reassignmentNeeded: true,
              lastReassignmentTriggerAt: nowIso,
            });
          }

          // Audit log expiry
          await addDoc(collection(db, 'audit_logs'), {
            bookingId: data.bookingId,
            offerId,
            serviceManId: data.serviceManId,
            action: 'OFFER_EXPIRED',
            details: 'Booking offer expired due to response timeout.',
            timestamp: nowIso,
          });
        } catch (bErr) {
          console.warn('[BookingOfferService] Booking reassignment flag note:', bErr);
        }
      }

      return true;
    } catch (err) {
      console.error('[BookingOfferService] Error expiring offer:', err);
      return false;
    }
  }

  /**
   * Cancel all pending offers when customer or admin cancels the booking
   */
  public async cancelBookingOffersForBooking(bookingId: string, reason: string = 'Booking cancelled'): Promise<void> {
    try {
      const q = query(
        collection(db, 'booking_offers'),
        where('bookingId', '==', bookingId),
        where('status', '==', 'PENDING')
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();

      snap.forEach((d) => {
        batch.update(d.ref, {
          status: 'CANCELLED',
          respondedAt: nowIso,
          cancellationReason: reason,
          updatedAt: nowIso,
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('[BookingOfferService] Error cancelling offers:', err);
    }
  }

  /**
   * Invalidates and expires all other pending offers for a booking once accepted
   */
  public async expireRemainingOffers(bookingId: string, acceptedOfferId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'booking_offers'),
        where('bookingId', '==', bookingId),
        where('status', '==', 'PENDING')
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      const batch = writeBatch(db);
      const nowIso = new Date().toISOString();

      snap.forEach((d) => {
        if (d.id !== acceptedOfferId) {
          batch.update(d.ref, {
            status: 'EXPIRED',
            respondedAt: nowIso,
            rejectionReason: 'Claimed by another service professional',
            updatedAt: nowIso,
          });
        }
      });

      await batch.commit();
    } catch (err) {
      console.error('[BookingOfferService] Error expiring remaining offers:', err);
    }
  }

  /**
   * Real-time listener for a Service Professional's active pending offers
   */
  public listenToProOffers(
    serviceManId: string,
    callback: (offers: BookingOffer[]) => void
  ): () => void {
    if (!serviceManId) return () => {};

    const q = query(
      collection(db, 'booking_offers'),
      where('serviceManId', '==', serviceManId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const offers: BookingOffer[] = [];
        const now = Date.now();

        snap.forEach((d) => {
          const data = d.data() as BookingOffer;
          // Only collect offers
          offers.push({ offerId: d.id, ...data });
        });

        // Sort: PENDING first, then by createdAt desc
        offers.sort((a, b) => {
          if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
          if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        callback(offers);
      },
      (err) => {
        console.warn('[BookingOfferService] Snapshot listener error:', err);
      }
    );

    this.activeListeners.set(serviceManId, unsubscribe);
    return () => {
      unsubscribe();
      this.activeListeners.delete(serviceManId);
    };
  }
}

export const bookingOfferService = new BookingOfferService();

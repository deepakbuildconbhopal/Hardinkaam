import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking, Service } from '../../types';
import { StructuredBookingContext } from './memoryTypes';
import { bookingOfferService } from '../../services/bookingOfferService';
import { generateSecureOtp } from '../../services/otpService';
import { INITIAL_SERVICES } from '../../firebase/seed';
import { notifyAdminNewBookingAndWhatsApp } from '../../services/adminNotificationService';
import { calculateIndianGst, recordTaxAuditLog } from '../../services/indianTaxEngineService';
import { offlineBookingSyncService } from '../../services/offlineBookingSyncService';

export interface BookingCreationResult {
  success: boolean;
  booking?: Booking;
  bookingId?: string;
  otp?: string;
  error?: string;
}

export class ConversationalBookingService {
  /**
   * Creates a confirmed booking in the existing HARDINKAAM Firestore schema
   */
  public async createBooking(
    context: StructuredBookingContext,
    userProfile?: any,
    currentUser?: any,
    availableServices: Service[] = []
  ): Promise<BookingCreationResult> {
    try {
      const allServices = availableServices.length > 0 ? availableServices : INITIAL_SERVICES;

      // 1. Resolve matching service from catalog
      let matchedService: Service | undefined;
      if (context.serviceType) {
        const lowerType = context.serviceType.toLowerCase();
        matchedService = allServices.find(
          (s) =>
            s.name.toLowerCase() === lowerType ||
            s.name.toLowerCase().includes(lowerType) ||
            lowerType.includes(s.name.toLowerCase())
        );
      }

      if (!matchedService && context.serviceCategory) {
        const lowerCat = context.serviceCategory.toLowerCase();
        matchedService = allServices.find(
          (s) =>
            s.categoryName.toLowerCase().includes(lowerCat) ||
            s.categoryId.toLowerCase().includes(lowerCat)
        );
      }

      // Default fallback service if none matched
      if (!matchedService) {
        matchedService = allServices[0] || {
          id: 'srv_elec_fan',
          name: 'Ceiling Fan Installation & Repair',
          categoryId: 'cat_electrician',
          categoryName: 'Electrician',
          basePrice: 199,
          durationMinutes: 45,
          priceUnit: 'per fan',
          description: 'Electrician service in Bhopal',
          rating: 4.85,
          ratingCount: 120,
          isActive: true,
        };
      }

      // 2. Pricing calculation via Indian Tax Engine
      const basePrice = context.estimatedPrice || matchedService.basePrice || 199;
      const taxCalc = calculateIndianGst({
        basePrice,
        serviceCategoryId: matchedService.categoryId,
        serviceId: matchedService.id,
        serviceName: matchedService.name,
      });
      const gst = taxCalc.totalTaxAmount;
      const totalAmount = taxCalc.finalTotalAmount;
      const companyComm = Math.round(totalAmount * 0.15); // 15%
      const taxDed = Math.round(totalAmount * 0.05); // 5%
      const proPayout = Math.max(0, totalAmount - companyComm - taxDed);

      // 3. Resolve Assigned Pro based on Category or User Selection (Phase 10)
      let pro = context.selectedServiceMan
        ? {
            id: context.selectedServiceMan.id,
            name: context.selectedServiceMan.name,
            phone: context.selectedServiceMan.phone || '+91 98260 12345',
            trade: context.selectedServiceMan.skill || context.selectedServiceMan.trade || 'Service Professional',
            rating: context.selectedServiceMan.rating || 4.9,
          }
        : {
            id: 'pro_rajesh_electrician',
            name: 'Rajesh Sharma',
            phone: '+91 98260 12345',
            trade: 'Senior Electrician',
            rating: 4.9,
          };

      if (!context.selectedServiceMan) {
        const catLower = (matchedService.categoryName || context.serviceCategory || '').toLowerCase();
        if (catLower.includes('plumb')) {
          pro = {
            id: 'pro_ramesh_plumber',
            name: 'Ramesh Verma',
            phone: '+91 98260 54321',
            trade: 'Master Plumber',
            rating: 4.88,
          };
        } else if (catLower.includes('ac')) {
          pro = {
            id: 'pro_sunil_ac',
            name: 'Sunil Chouhan',
            phone: '+91 98260 99887',
            trade: 'Certified AC & Appliance Specialist',
            rating: 4.92,
          };
        } else if (catLower.includes('clean')) {
          pro = {
            id: 'pro_anita_clean',
            name: 'Anita Bai & Team',
            phone: '+91 98260 33445',
            trade: 'Deep Cleaning Expert',
            rating: 4.86,
          };
        }
      }

      // 4. Generate Unique Booking ID & Security OTP
      const bookingId = 'BK_' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const arrivalOtp = generateSecureOtp(4);
      const nowIso = new Date().toISOString();

      const customerId =
        currentUser?.uid || userProfile?.id || ('usr_' + Date.now());
      const customerName =
        (context.customerName || userProfile?.name || currentUser?.displayName || 'Customer').trim();
      const customerPhone =
        (context.mobile || userProfile?.phone || '+91 98260 12345').trim();
      const fullAddress =
        (context.address || context.location || userProfile?.address || 'Bhopal, Madhya Pradesh').trim();

      const scheduledDate =
        context.preferredDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const scheduledTime = context.preferredTime || '09:00 AM - 11:00 AM';

      // 5. Construct Firestore Booking Document (Strictly preserving existing schema)
      const newBooking: Booking = {
        id: bookingId,
        customerId,
        customerName,
        customerPhone,
        serviceId: matchedService.id,
        serviceName: matchedService.name,
        categoryId: matchedService.categoryId,
        categoryName: matchedService.categoryName,
        serviceManId: pro.id,
        serviceManName: pro.name,
        serviceManPhone: pro.phone,
        partnerId: '',
        scheduledDate,
        scheduledTime,
        address: fullAddress,
        city: context.city || 'Bhopal',
        districtId: 'mp_bhopal_dist',
        districtName: context.district || 'Bhopal',
        pincode: context.pincode || '462011',
        houseFlat: context.houseFlat,
        street: context.street,
        area: context.area,
        state: context.state || 'Madhya Pradesh',
        landmark: context.landmark,
        latitude: context.latitude,
        longitude: context.longitude,
        locationSource: context.locationSource,
        notes: (context.problemDescription || '').trim(),
        amount: totalAmount,
        estimatedCharge: totalAmount,
        approxDistanceKm: context.selectedServiceMan?.distanceKm || 2.5,
        approxDistanceText: context.selectedServiceMan?.approxDistance || '2.5 किमी',
        etaMinutes: context.selectedServiceMan?.etaMinutes || 30,
        estimatedArrivalTime: context.selectedServiceMan?.estimatedArrival || '30 मिनट में',
        status: 'pending',
        paymentStatus: 'cod',
        paymentMethod: 'cash',
        companyCommission: companyComm,
        taxDeduction: taxDed,
        taxRate: taxCalc.gstRatePercent,
        taxCalculation: taxCalc as any,
        sacCode: taxCalc.sacCode,
        gstAmount: gst,
        statutoryTaxLiability: taxCalc.statutoryTaxLiability,
        servicemanPayoutAmount: proPayout,
        payoutStatus: 'pending',
        isReviewed: false,
        otp: arrivalOtp,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // 6. Check if offline - queue in IndexedDB
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const offlineRecord = await offlineBookingSyncService.savePendingBooking(newBooking, {
          taxCalculation: taxCalc,
          customerPhone,
          customerName,
          scheduledDate,
          scheduledTime,
          serviceName: matchedService.name,
          totalAmount: totalAmount,
          source: 'conversational_ai',
        });
        return {
          success: true,
          booking: offlineRecord.booking,
          bookingId,
          otp: arrivalOtp,
        };
      }

      // Write to Firestore `bookings` collection
      await setDoc(doc(db, 'bookings', bookingId), newBooking);

      // Record tax calculation audit log
      recordTaxAuditLog(bookingId, taxCalc, {
        customerId: newBooking.customerId,
        serviceManId: newBooking.serviceManId,
      }).catch((err) => console.warn('Non-fatal tax audit recording in conversational booking:', err));

      // 6B. Instantly Notify Admin via Admin Realtime Alerts & WhatsApp Notification
      notifyAdminNewBookingAndWhatsApp(newBooking).catch((adminErr) => {
        console.warn('[ConversationalBooking] Non-fatal admin alert/WhatsApp trigger notice:', adminErr);
      });

      // 7. Create actionable booking offers for eligible pros
      bookingOfferService.createBookingOffersForBooking(newBooking).catch((err) => {
        console.warn('[ConversationalBooking] Non-fatal offer generation:', err);
      });

      // 8. Trigger alert dispatch via backend Express API (idempotent)
      fetch('/api/bookings/dispatch-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      }).catch((err) => console.warn('Non-fatal dispatch alert trigger:', err));

      // 9. Write WhatsApp log record
      try {
        await addDoc(collection(db, 'whatsapp_logs'), {
          recipientPhone: customerPhone,
          recipientName: customerName,
          type: 'booking_confirmation',
          messageBody: `Namaste ${customerName}! Your HARDINKAAM booking #${bookingId} for ${matchedService.name} has been confirmed for ${scheduledDate} (${scheduledTime}). Assigned Pro: ${pro.name} (${pro.phone}). Service OTP: ${arrivalOtp}`,
          status: 'sent',
          timestamp: nowIso,
        });
      } catch (logErr) {
        console.warn('Non-fatal WhatsApp log notice:', logErr);
      }

      return {
        success: true,
        booking: newBooking,
        bookingId,
        otp: arrivalOtp,
      };
    } catch (error: any) {
      console.error('Conversational booking creation failed:', error);
      return {
        success: false,
        error: error.message || 'Booking creation failed',
      };
    }
  }
}

export const conversationalBooking = new ConversationalBookingService();

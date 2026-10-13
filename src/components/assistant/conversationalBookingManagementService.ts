import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking } from '../../types';
import { BookingManagementItem } from './componentTypes';
import { bookingOfferService } from '../../services/bookingOfferService';

export type BookingIntentType =
  | 'show_all'
  | 'show_today'
  | 'cancel_booking'
  | 'reschedule_booking'
  | 'eta_tracking'
  | 'pro_details'
  | 'booking_details'
  | 'show_past';

export type NormalizedBookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED'
  | 'CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAID';

export class ConversationalBookingManagementService {
  /**
   * Normalizes Firestore status to standard HARDINKAAM Phase 11 status
   */
  public getNormalizedStatus(booking: Partial<Booking>): NormalizedBookingStatus {
    const status = (booking.status || '').toLowerCase().trim();
    const paymentStatus = (booking.paymentStatus || '').toLowerCase().trim();

    if (
      status === 'cancelled' ||
      status === 'rejected' ||
      status === 'service_man_unable_to_reach'
    ) {
      return 'CANCELLED';
    }

    if (status === 'completed' || status === 'work_completed') {
      if (paymentStatus === 'paid' || paymentStatus === 'settled') {
        return 'PAID';
      }
      return 'WORK_COMPLETED';
    }

    if (status === 'work_started' || status === 'in_progress') {
      return 'WORK_STARTED';
    }

    if (status === 'arrived' || status === 'otp_pending') {
      return 'ARRIVED';
    }

    if (status === 'on_the_way' || status === 'arriving') {
      return 'ARRIVING';
    }

    if (status === 'accepted' || status === 'assigned') {
      return 'ACCEPTED';
    }

    if (status === 'pending') {
      return 'PENDING';
    }

    if (paymentStatus === 'pending' || paymentStatus === 'cod') {
      return 'PAYMENT_PENDING';
    }

    if (paymentStatus === 'paid') {
      return 'PAID';
    }

    return 'PENDING';
  }

  /**
   * Formats a raw Firestore Booking into a rich BookingManagementItem for UI display
   */
  public formatBookingItem(b: Booking): BookingManagementItem {
    const displayStatus = this.getNormalizedStatus(b);
    const isCompletedOrCancelled =
      displayStatus === 'CANCELLED' || displayStatus === 'WORK_COMPLETED' || displayStatus === 'PAID';

    return {
      id: b.id,
      serviceName: b.serviceName || 'होम सर्विस (Home Service)',
      categoryName: b.categoryName || (b as any).serviceCategory || 'सामान्य सर्विस',
      displayStatus,
      rawStatus: b.status || 'pending',
      scheduledDate: b.scheduledDate || (b as any).date || 'आज (Today)',
      scheduledTime: b.scheduledTime || (b as any).time || '10:00 AM - 12:00 PM',
      scheduledDateTime: (b as any).scheduledDateTime || `${b.scheduledDate || (b as any).date || 'आज'}, ${b.scheduledTime || (b as any).time || 'स्लॉट'}`,
      address: b.address || 'भोपाल, मध्य प्रदेश',
      totalAmount: b.amount || b.estimatedCharge || 235,
      paymentStatus: b.paymentStatus || 'cod',
      paymentMethod: b.paymentMethod || 'cash',
      otp: b.otp || (b as any).arrivalOtp,
      serviceManId: b.serviceManId,
      serviceManName: b.serviceManName || 'राजेश शर्मा (सीनियर कारीगर)',
      serviceManPhone: b.serviceManPhone || '+91 98260 12345',
      serviceManRating: (b as any).serviceManRating || 4.9,
      serviceManTrade: (b as any).serviceManTrade || 'वेरिफाइड तकनीशियन',
      serviceManPhoto: (b as any).serviceManPhoto,
      etaMinutes: (b as any).etaMinutes || (displayStatus === 'ARRIVING' ? 25 : undefined),
      approxDistance: (b as any).approxDistanceText || (b as any).approxDistanceKm ? `${(b as any).approxDistanceKm} किमी दूर` : undefined,
      createdAt: b.createdAt,
      canCancel: !isCompletedOrCancelled,
      canReschedule: !isCompletedOrCancelled && displayStatus !== 'WORK_STARTED' && displayStatus !== 'ARRIVED',
      canTrack: displayStatus === 'ACCEPTED' || displayStatus === 'ARRIVING' || displayStatus === 'ARRIVED',
      canCall: Boolean(b.serviceManPhone) && displayStatus !== 'CANCELLED',
    };
  }

  /**
   * Detects the specific booking management intent from user natural language query
   */
  public detectBookingIntent(query: string): BookingIntentType | null {
    const q = query.toLowerCase().trim();

    // 1. Show Today's Booking
    if (
      q.includes('aaj wali') ||
      q.includes('aaj ki booking') ||
      q.includes('today booking') ||
      q.includes('today ki booking') ||
      q.includes('आज वाली') ||
      q.includes('आज की बुकिंग')
    ) {
      return 'show_today';
    }

    // 2. Cancel Booking
    if (
      q.includes('cancel') ||
      q.includes('कैंसल') ||
      q.includes('रद्द') ||
      q.includes('radd') ||
      q.includes('booking cancel') ||
      q.includes('cancel karo')
    ) {
      return 'cancel_booking';
    }

    // 3. Reschedule Booking
    if (
      q.includes('reschedule') ||
      q.includes('रीशेड्यूल') ||
      q.includes('समय बदलो') ||
      q.includes('time change') ||
      q.includes('date change') ||
      q.includes('तारीख बदलो') ||
      q.includes('टाइम बदलो') ||
      q.includes('postpone')
    ) {
      return 'reschedule_booking';
    }

    // 4. ETA & Arrival Tracking
    if (
      q.includes('kab aa raha hai') ||
      q.includes('kab aayega') ||
      q.includes('kitni der') ||
      q.includes('when is service man coming') ||
      q.includes('eta') ||
      q.includes('tracking') ||
      q.includes('कब आ रहा है') ||
      q.includes('कब आएगा') ||
      q.includes('कितनी देर') ||
      q.includes('लाइव लोकेशन')
    ) {
      return 'eta_tracking';
    }

    // 5. Service Man Profile & Identity
    if (
      q.includes('service man kaun hai') ||
      q.includes('technician kaun hai') ||
      q.includes('kaun aayega') ||
      q.includes('who is the service man') ||
      q.includes('karigar kaun hai') ||
      q.includes('कारीगर कौन है') ||
      q.includes('सर्विसमैन कौन है') ||
      q.includes('कारीगर का नाम') ||
      q.includes('technician details')
    ) {
      return 'pro_details';
    }

    // 6. Past & Completed Bookings
    if (
      q.includes('purani booking') ||
      q.includes('old booking') ||
      q.includes('past booking') ||
      q.includes('completed booking') ||
      q.includes('history') ||
      q.includes('पुरानी बुकिंग') ||
      q.includes('पिछली बुकिंग')
    ) {
      return 'show_past';
    }

    // 7. Booking Details
    if (
      q.includes('booking details') ||
      q.includes('details batao') ||
      q.includes('booking info') ||
      q.includes('बुकिंग डिटेल्स') ||
      q.includes('विवरण') ||
      q.includes('details')
    ) {
      return 'booking_details';
    }

    // 8. General "Meri Booking Dikhao"
    if (
      q.includes('meri booking') ||
      q.includes('my booking') ||
      q.includes('show booking') ||
      q.includes('bookings') ||
      q.includes('मेरी बुकिंग') ||
      q.includes('बुकिंग दिखाओ') ||
      q.includes('booking dikhao')
    ) {
      return 'show_all';
    }

    return null;
  }

  /**
   * Filter bookings for Today
   */
  public getTodayBookings(bookings: Booking[]): Booking[] {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayHindi = 'आज';

    return bookings.filter((b) => {
      const scheduledDate = (b.scheduledDate || (b as any).date || '').toLowerCase();
      const createdAt = (b.createdAt || '').split('T')[0];
      return (
        scheduledDate.includes(todayStr) ||
        scheduledDate.includes('today') ||
        scheduledDate.includes(todayHindi) ||
        createdAt === todayStr
      );
    });
  }

  /**
   * Filter Active / In-Progress Bookings
   */
  public getActiveBookings(bookings: Booking[]): Booking[] {
    return bookings.filter((b) => {
      const norm = this.getNormalizedStatus(b);
      return norm !== 'CANCELLED' && norm !== 'PAID' && norm !== 'WORK_COMPLETED';
    });
  }

  /**
   * Filter Past / Completed / Cancelled Bookings
   */
  public getPastBookings(bookings: Booking[]): Booking[] {
    return bookings.filter((b) => {
      const norm = this.getNormalizedStatus(b);
      return norm === 'CANCELLED' || norm === 'PAID' || norm === 'WORK_COMPLETED';
    });
  }

  /**
   * Cancels a booking in Firestore and releases offers
   */
  public async cancelBooking(
    bookingId: string,
    reason: string = 'Customer cancelled via KaamDost Assistant'
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!bookingId) {
        return { success: false, message: 'Invalid Booking ID' };
      }

      const bookingRef = doc(db, 'bookings', bookingId);
      const nowIso = new Date().toISOString();

      await updateDoc(bookingRef, {
        status: 'cancelled',
        cancelledBy: 'customer',
        cancelReason: reason,
        cancelledAt: nowIso,
        updatedAt: nowIso,
      });

      // Release any active broadcast booking offers
      try {
        await bookingOfferService.cancelBookingOffersForBooking(bookingId, reason);
      } catch (offerErr) {
        console.warn('Booking offer cancel note:', offerErr);
      }

      return {
        success: true,
        message: `बुकिंग #${bookingId} सफलतापूर्वक रद्द (Cancel) कर दी गई है।`,
      };
    } catch (err: any) {
      console.error('[ConversationalBookingManagement] Cancel failed:', err);
      return {
        success: false,
        message: `बुकिंग कैंसल करने में समस्या आई: ${err.message || 'Firestore Error'}`,
      };
    }
  }

  /**
   * Reschedules a booking in Firestore
   */
  public async rescheduleBooking(
    bookingId: string,
    newDate: string,
    newTime: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!bookingId || !newDate) {
        return { success: false, message: 'Invalid Reschedule parameters' };
      }

      const bookingRef = doc(db, 'bookings', bookingId);
      const nowIso = new Date().toISOString();
      const combined = `${newDate}, ${newTime}`;

      await updateDoc(bookingRef, {
        scheduledDate: newDate,
        scheduledTime: newTime,
        scheduledDateTime: combined,
        date: newDate,
        time: newTime,
        rescheduledBy: 'customer',
        rescheduledAt: nowIso,
        updatedAt: nowIso,
      });

      return {
        success: true,
        message: `बुकिंग #${bookingId} को नए समय (${combined}) पर सफलतापूर्वक रीशेड्यूल कर दिया गया है।`,
      };
    } catch (err: any) {
      console.error('[ConversationalBookingManagement] Reschedule failed:', err);
      return {
        success: false,
        message: `बुकिंग रीशेड्यूल करने में समस्या आई: ${err.message || 'Firestore Error'}`,
      };
    }
  }
}

export const conversationalBookingManagement = new ConversationalBookingManagementService();

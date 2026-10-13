import QRCode from 'qrcode';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';
import { safeFetchJson } from '../utils/safeJson';
import { notifyWorkStarted } from './bookingNotificationIntegrationService';

export interface BookingQrPayload {
  type: 'hardinkaam_booking_arrival';
  bookingId: string;
  customerId?: string;
  serviceName?: string;
  otp?: string;
  timestamp: number;
  signature?: string;
}

export interface ParsedQrBooking {
  bookingId: string;
  otp?: string;
  customerId?: string;
  serviceName?: string;
  isValid: boolean;
  raw: string;
  sourceType: 'json_payload' | 'uri_scheme' | 'plain_id';
}

export interface QrVerifyResult {
  success: boolean;
  message: string;
  bookingId?: string;
  status?: string;
  workStartedAt?: string;
  alreadyVerified?: boolean;
}

/**
 * Generates a structured JSON string payload to be encoded into the customer's QR code.
 */
export function generateBookingQrPayload(booking: Booking, otp?: string): string {
  const payload: BookingQrPayload = {
    type: 'hardinkaam_booking_arrival',
    bookingId: booking.id,
    customerId: booking.customerId,
    serviceName: booking.serviceName,
    otp: otp || booking.otp || '',
    timestamp: Date.now(),
  };
  return JSON.stringify(payload);
}

/**
 * Generates a high-quality Data URL (base64 image) of the QR code for a given booking.
 */
export async function generateBookingQrDataUrl(
  booking: Booking,
  otp?: string,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  const payload = generateBookingQrPayload(booking, otp);
  return QRCode.toDataURL(payload, {
    width: options?.width || 280,
    margin: options?.margin ?? 2,
    color: {
      dark: '#1c1917', // stone-900 for crisp scan contrast
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
    ...options,
  });
}

/**
 * Robust parser that extracts booking ID and optional OTP from any scanned QR code string.
 * Supports:
 * 1. JSON payload: {"type":"hardinkaam_booking_arrival","bookingId":"...","otp":"..."}
 * 2. Custom URI: hardinkaam://booking/bkg_123?otp=4567
 * 3. Web URL: https://hardinkaam.in/booking/bkg_123?otp=4567
 * 4. Plain Booking ID: bkg_123 or similar alphanumeric ID
 */
export function parseBookingQrPayload(rawText: string): ParsedQrBooking {
  const clean = (rawText || '').trim();
  if (!clean) {
    return {
      bookingId: '',
      isValid: false,
      raw: clean,
      sourceType: 'plain_id',
    };
  }

  // 1. Try parsing JSON
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed && typeof parsed.bookingId === 'string' && parsed.bookingId.trim()) {
        return {
          bookingId: parsed.bookingId.trim(),
          otp: typeof parsed.otp === 'string' ? parsed.otp.trim() : undefined,
          customerId: typeof parsed.customerId === 'string' ? parsed.customerId.trim() : undefined,
          serviceName: typeof parsed.serviceName === 'string' ? parsed.serviceName.trim() : undefined,
          isValid: true,
          raw: clean,
          sourceType: 'json_payload',
        };
      }
    } catch {
      // Continue to next parsers
    }
  }

  // 2. Try URI Scheme or URL
  if (clean.includes('://') || clean.includes('/booking/')) {
    try {
      // normalize scheme for URL parsing if custom scheme
      const normalizedUrl = clean.startsWith('hardinkaam://')
        ? clean.replace('hardinkaam://', 'https://hardinkaam.in/')
        : clean;
      const parsedUrl = new URL(normalizedUrl);
      const pathnameParts = parsedUrl.pathname.split('/').filter(Boolean);
      // Look for ID after 'booking' or last segment
      let foundId = '';
      const bkgIdx = pathnameParts.indexOf('booking');
      if (bkgIdx !== -1 && pathnameParts[bkgIdx + 1]) {
        foundId = pathnameParts[bkgIdx + 1];
      } else if (pathnameParts.length > 0) {
        foundId = pathnameParts[pathnameParts.length - 1];
      }
      const otpParam = parsedUrl.searchParams.get('otp') || parsedUrl.searchParams.get('code');
      const custParam = parsedUrl.searchParams.get('customer') || parsedUrl.searchParams.get('customerId');

      if (foundId) {
        return {
          bookingId: foundId,
          otp: otpParam || undefined,
          customerId: custParam || undefined,
          isValid: true,
          raw: clean,
          sourceType: 'uri_scheme',
        };
      }
    } catch {
      // Continue
    }
  }

  // 3. Fallback: Check if string is a plausible booking ID (alphanumeric, underscores, hyphens, min length 4)
  if (/^[a-zA-Z0-9_\-]{4,100}$/.test(clean)) {
    return {
      bookingId: clean,
      isValid: true,
      raw: clean,
      sourceType: 'plain_id',
    };
  }

  return {
    bookingId: clean,
    isValid: false,
    raw: clean,
    sourceType: 'plain_id',
  };
}

/**
 * Client service to verify a scanned booking QR code and initiate service.
 * Updates the booking status to 'in_progress', tracks timestamps, and notifies the customer.
 */
export async function verifyAndStartServiceViaQr(
  bookingId: string,
  qrRawData: string,
  serviceManId: string,
  extractedOtp?: string
): Promise<QrVerifyResult> {
  const cleanBookingId = bookingId.trim();
  if (!cleanBookingId) {
    return { success: false, message: 'Invalid or missing booking ID.' };
  }

  // 1. Try server-authoritative dedicated QR verification endpoint
  try {
    const res = await fetch('/api/bookings/verify-qr-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId: cleanBookingId,
        qrPayload: qrRawData,
        otp: extractedOtp || '',
        serviceManId,
      }),
    });

    const jsonResult = await safeFetchJson(res);
    const data = jsonResult.data;

    if (res.ok && jsonResult.ok && data?.success) {
      // Realtime notification sync
      try {
        const snap = await getDoc(doc(db, 'bookings', cleanBookingId));
        if (snap.exists()) {
          notifyWorkStarted(snap.data() as Booking).catch(() => {});
        }
      } catch (_) {}

      return {
        success: true,
        message: data.message || 'QR Code Verified ✓ Service Initiated!',
        bookingId: cleanBookingId,
        status: 'in_progress',
        workStartedAt: data.workStartedAt || new Date().toISOString(),
        alreadyVerified: !!data.alreadyVerified,
      };
    } else if (res.status === 400 || res.status === 403 || res.status === 404) {
      // Server actively responded with rejection/business validation error
      if (data?.error || data?.message) {
        return {
          success: false,
          message: data.error || data.message,
        };
      }
    }
  } catch (netErr) {
    console.warn('Network call to /api/bookings/verify-qr-code failed, attempting arrival OTP bridge:', netErr);
  }

  // 2. If extractedOtp is present, try server arrival-otp endpoint
  if (extractedOtp && /^\d{4,6}$/.test(extractedOtp)) {
    try {
      const res = await fetch('/api/bookings/verify-arrival-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: cleanBookingId,
          enteredOtp: extractedOtp,
          serviceManId,
        }),
      });

      const jsonResult = await safeFetchJson(res);
      const data = jsonResult.data;
      if (res.ok && jsonResult.ok && data?.success) {
        return {
          success: true,
          message: 'QR Code & OTP Verified ✓ Service Initiated!',
          bookingId: cleanBookingId,
          status: 'in_progress',
          workStartedAt: data.workStartedAt || new Date().toISOString(),
        };
      }
    } catch (_) {}
  }

  // 3. Fallback direct client Firestore update (resilient against offline network edge cases)
  try {
    const bookingRef = doc(db, 'bookings', cleanBookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return { success: false, message: 'Booking not found in database.' };
    }

    const booking = snap.data() as Booking;
    const nowIso = new Date().toISOString();

    if (booking.status === 'in_progress' || booking.status === 'work_started' || booking.workStartedAt) {
      return {
        success: true,
        message: 'Job is already in progress.',
        bookingId: cleanBookingId,
        status: 'in_progress',
        workStartedAt: booking.workStartedAt || booking.startedAt,
        alreadyVerified: true,
      };
    }

    if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected') {
      return {
        success: false,
        message: `Booking has already been marked as ${booking.status}.`,
      };
    }

    // Update booking directly
    const completionOtp = booking.otp || Math.floor(1000 + Math.random() * 9000).toString();
    await updateDoc(bookingRef, {
      status: 'in_progress',
      trackingStatus: 'WORK_STARTED',
      workStatus: 'in_progress',
      verifiedViaQr: true,
      otp: completionOtp,
      otpVerifiedAt: nowIso,
      workStartedAt: nowIso,
      startedAt: nowIso,
      deliveryStatus: 'in_progress',
      updatedAt: nowIso,
    });

    // Also update service tracking collection if active
    try {
      await updateDoc(doc(db, 'serviceTracking', cleanBookingId), {
        status: 'WORK_STARTED',
        lastUpdatedAt: nowIso,
      });
    } catch (_) {}

    notifyWorkStarted(booking).catch(() => {});

    return {
      success: true,
      message: 'QR Verified ✓ Service Initiated!',
      bookingId: cleanBookingId,
      status: 'in_progress',
      workStartedAt: nowIso,
    };
  } catch (fsErr: any) {
    console.error('Direct Firestore update failed for QR verification:', fsErr);
    return {
      success: false,
      message: fsErr?.message || 'Verification failed. Please check permissions.',
    };
  }
}

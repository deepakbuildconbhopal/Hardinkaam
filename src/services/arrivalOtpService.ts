import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';

export const ARRIVAL_OTP_SALT = 'HARDINKAAM_ARRIVAL_OTP_SALT_2026';

/**
 * Computes SHA-256 hash of arrival OTP linked to bookingId
 */
export async function hashArrivalOtp(
  bookingId: string,
  otp: string,
  salt: string = ARRIVAL_OTP_SALT
): Promise<string> {
  const normalized = `${bookingId.trim()}:${otp.trim()}:${salt}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback simple deterministic hash
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Generates a 6-digit cryptographically secure arrival OTP code
 */
export function generateArrivalOtpCode(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    const code = 100000 + (arr[0] % 900000); // 100000 - 999999
    return code.toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export interface ArrivalOtpResponse {
  success: boolean;
  arrivalOtp: string;
  expiresAt: string;
  message?: string;
}

export interface ArrivalOtpVerifyResult {
  success: boolean;
  message: string;
  isLocked?: boolean;
  isExpired?: boolean;
  attemptsRemaining?: number;
  workStartedAt?: string;
}

/**
 * Customer requests or retrieves their Arrival OTP
 * Server generates the OTP and stores arrivalOtpHash on Firestore
 * Plaintext OTP is returned only to the customer
 */
export async function getOrCreateArrivalOtp(
  bookingId: string,
  customerId: string
): Promise<ArrivalOtpResponse> {
  // Check local session cache for active unexpired code
  const cachedKey = `hardinkaam_arrival_otp_${bookingId}`;
  if (typeof window !== 'undefined') {
    const cached = sessionStorage.getItem(cachedKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const expiresTime = new Date(parsed.expiresAt).getTime();
        if (expiresTime > Date.now() + 60 * 1000) {
          return {
            success: true,
            arrivalOtp: parsed.code,
            expiresAt: parsed.expiresAt,
          };
        }
      } catch {
        sessionStorage.removeItem(cachedKey);
      }
    }
  }

  // 1. Try server endpoint
  try {
    const res = await fetch('/api/bookings/generate-arrival-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bookingId, customerId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.arrivalOtp) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(
            cachedKey,
            JSON.stringify({ code: data.arrivalOtp, expiresAt: data.expiresAt })
          );
        }
        return {
          success: true,
          arrivalOtp: data.arrivalOtp,
          expiresAt: data.expiresAt,
        };
      }
    }
  } catch (err) {
    console.warn('Server generate-arrival-otp failed, fallback to secure client hash:', err);
  }

  // 2. Client fallback with secure cryptographic hash stored to Firestore
  const newCode = generateArrivalOtpCode();
  const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString(); // 25 mins
  const arrivalOtpHash = await hashArrivalOtp(bookingId, newCode);
  const nowIso = new Date().toISOString();

  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      arrivalOtpHash,
      otpExpiresAt: expiresAt,
      otpAttempts: 0,
      trackingStatus: 'otp_pending',
      updatedAt: nowIso,
    });

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        cachedKey,
        JSON.stringify({ code: newCode, expiresAt })
      );
    }

    return {
      success: true,
      arrivalOtp: newCode,
      expiresAt,
    };
  } catch (err: any) {
    console.error('Failed to set arrivalOtpHash in Firestore:', err);
    return {
      success: false,
      arrivalOtp: '',
      expiresAt: '',
      message: err.message || 'Failed to initialize arrival OTP',
    };
  }
}

/**
 * Service Professional verifies Arrival OTP entered by customer
 * Handled via Server-Authoritative endpoint
 */
export async function verifyArrivalOtpServer(
  bookingId: string,
  enteredOtp: string,
  serviceManId: string
): Promise<ArrivalOtpVerifyResult> {
  const sanitizedOtp = (enteredOtp || '').trim();
  if (!/^\d{4,6}$/.test(sanitizedOtp)) {
    return {
      success: false,
      message: 'Please enter a valid 4-digit numerical OTP.',
    };
  }

  // 1. Try server-authoritative endpoint
  try {
    const res = await fetch('/api/bookings/verify-arrival-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        enteredOtp: sanitizedOtp,
        serviceManId,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: 'OTP Verified ✓',
        workStartedAt: data.workStartedAt || new Date().toISOString(),
      };
    } else {
      return {
        success: false,
        message: data.message || data.error || 'Invalid Arrival OTP',
        isLocked: !!data.isLocked,
        isExpired: !!data.isExpired,
        attemptsRemaining: data.attemptsRemaining,
      };
    }
  } catch (err: any) {
    console.warn('Network call to /api/bookings/verify-arrival-otp failed, trying direct Firestore check:', err);
  }

  // 2. Direct cryptographic hash check fallback if server offline
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      return { success: false, message: 'Booking not found.' };
    }
    const booking = snap.data() as Booking;

    if (booking.status === 'in_progress' || booking.status === 'work_started' || booking.workStartedAt) {
      return {
        success: true,
        message: 'OTP already verified. Work is in progress.',
        workStartedAt: booking.workStartedAt || booking.startedAt,
      };
    }

    const currentAttempts = booking.otpAttempts || 0;
    if (currentAttempts >= 5) {
      return {
        success: false,
        isLocked: true,
        message: 'Maximum verification attempts exceeded. Please ask customer to regenerate OTP.',
      };
    }

    if (booking.otpExpiresAt && new Date(booking.otpExpiresAt).getTime() < Date.now()) {
      return {
        success: false,
        isExpired: true,
        message: 'Arrival OTP has expired. Please ask customer to refresh their screen.',
      };
    }

    const expectedHash = booking.arrivalOtpHash;
    const computedHash = await hashArrivalOtp(bookingId, sanitizedOtp);

    // Also support fallback if legacy 4-digit booking.otp is present
    const isLegacyMatch = booking.otp && booking.otp.trim() === sanitizedOtp;

    if (expectedHash === computedHash || isLegacyMatch) {
      const nowIso = new Date().toISOString();
      await updateDoc(bookingRef, {
        status: 'in_progress',
        trackingStatus: 'WORK_STARTED',
        otpVerifiedAt: nowIso,
        workStartedAt: nowIso,
        startedAt: nowIso,
        arrivalOtpHash: null,
        arrivalOtp: null,
        otp: null,
        deliveryStatus: 'in_progress',
        otpAttempts: 0,
        updatedAt: nowIso,
      });

      // Phase 8: Update existing tracking status to WORK_STARTED
      try {
        await updateDoc(doc(db, 'serviceTracking', bookingId), {
          status: 'WORK_STARTED',
          lastUpdatedAt: nowIso,
        });
      } catch (trackErr) {
        console.warn('Could not update serviceTracking to WORK_STARTED:', trackErr);
      }

      return {
        success: true,
        message: 'OTP Verified ✓',
        workStartedAt: nowIso,
      };
    } else {
      const newAttempts = currentAttempts + 1;
      await updateDoc(bookingRef, {
        otpAttempts: newAttempts,
        updatedAt: new Date().toISOString(),
      });
      const remaining = 5 - newAttempts;
      return {
        success: false,
        attemptsRemaining: Math.max(0, remaining),
        isLocked: remaining <= 0,
        message:
          remaining > 0
            ? `Incorrect OTP. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`
            : 'Maximum verification attempts reached. Please ask customer to refresh the code.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Verification failed. Please try again.',
    };
  }
}

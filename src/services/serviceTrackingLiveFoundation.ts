import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  LiveLocationTrackingStatus,
  ServiceTrackingDocument,
  TrackingLocationPoint,
  Booking,
} from '../types';
import { shouldSyncLocationToFirebase, isTrackingTerminal } from './liveTrackingQuality';
import { calculateHaversineDistanceKm } from './serviceTrackingService';

export type { LiveLocationTrackingStatus, ServiceTrackingDocument, TrackingLocationPoint };

// Spark Quota Optimization: Canonical live tracking collection is live_tracking/{bookingId}
export const SERVICE_TRACKING_COLLECTION = 'live_tracking';
export const LEGACY_SERVICE_TRACKING_COLLECTION = 'serviceTracking';

// In-memory cache to prevent unnecessary Firebase location writes
const lastSavedServicemanLocations = new Map<string, { latitude: number; longitude: number; time: number }>();
const lastSavedCustomerLocations = new Map<string, { latitude: number; longitude: number; time: number }>();

/**
 * Validates if a status represents an active, trackable booking lifecycle state
 */
export function isActiveTrackingStatus(status: LiveLocationTrackingStatus): boolean {
  return [
    'REQUESTED',
    'ASSIGNED',
    'ON_THE_WAY',
    'ARRIVED',
    'WORK_STARTED',
  ].includes(status);
}

/**
 * Maps standard platform booking status to Phase 1 Live Location Tracking Status
 */
export function mapBookingStatusToLiveTrackingStatus(
  status: string,
  trackingStatus?: string
): LiveLocationTrackingStatus {
  const normStatus = (status || '').toLowerCase().trim();
  const normTracking = (trackingStatus || '').toLowerCase().trim();

  if (normStatus === 'completed' || normStatus === 'work_completed') {
    return 'COMPLETED';
  }
  if (normStatus === 'cancelled' || normStatus === 'rejected') {
    return 'CANCELLED';
  }
  if (normStatus === 'in_progress' || normStatus === 'work_started' || normTracking === 'work_started') {
    return 'WORK_STARTED';
  }
  if (normStatus === 'arrived' || normTracking === 'arrived' || normTracking === 'otp_pending') {
    return 'ARRIVED';
  }
  if (normStatus === 'on_the_way' || normTracking === 'on_the_way' || normTracking === 'arriving') {
    return 'ON_THE_WAY';
  }
  if (normStatus === 'accepted' || normStatus === 'assigned' || normTracking === 'assigned') {
    return 'ASSIGNED';
  }
  return 'REQUESTED';
}

/**
 * Verifies if the booking is currently active and eligible for location updates
 */
export async function verifyActiveBookingForTracking(
  bookingId: string
): Promise<{ isEligible: boolean; booking?: Booking; reason?: string }> {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const snap = await getDoc(bookingRef);

    if (!snap.exists()) {
      return { isEligible: false, reason: 'Booking record does not exist' };
    }

    const booking = { id: snap.id, ...snap.data() } as Booking;
    const terminalStatuses = ['completed', 'cancelled', 'rejected'];

    if (terminalStatuses.includes((booking.status || '').toLowerCase())) {
      return {
        isEligible: false,
        booking,
        reason: `Location tracking disabled for inactive/closed booking with status: ${booking.status}`,
      };
    }

    return { isEligible: true, booking };
  } catch (err: any) {
    console.warn(`[serviceTracking] Error verifying active booking ${bookingId}:`, err);
    return { isEligible: false, reason: err.message || 'Authorization check failed' };
  }
}

/**
 * Initializes or ensures the `serviceTracking/{bookingId}` record exists for an active booking.
 */
export async function initializeServiceTrackingRecord(
  booking: Booking,
  destinationCoordinates?: { latitude: number; longitude: number }
): Promise<ServiceTrackingDocument | null> {
  if (!booking?.id) return null;

  const nowIso = new Date().toISOString();
  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, booking.id);
  const derivedStatus = mapBookingStatusToLiveTrackingStatus(
    booking.status,
    booking.trackingStatus
  );

  const initialDestination: TrackingLocationPoint | null = destinationCoordinates
    ? {
        latitude: destinationCoordinates.latitude,
        longitude: destinationCoordinates.longitude,
        timestamp: nowIso,
      }
    : null;

  const initialDoc: ServiceTrackingDocument = {
    bookingId: booking.id,
    customerId: booking.customerId || '',
    servicemanId: booking.serviceManId || '',
    status: derivedStatus,
    customerLocation: null,
    servicemanLocation: booking.serviceManLocation
      ? {
          latitude: booking.serviceManLocation.latitude,
          longitude: booking.serviceManLocation.longitude,
          timestamp: booking.serviceManLocation.updatedAt || nowIso,
        }
      : null,
    destination: initialDestination,
    etaSeconds: typeof booking.etaMinutes === 'number' ? booking.etaMinutes * 60 : null,
    lastUpdatedAt: nowIso,
  };

  try {
    const existingSnap = await getDoc(trackingRef);
    if (!existingSnap.exists()) {
      await setDoc(trackingRef, initialDoc);
      return initialDoc;
    } else {
      const current = existingSnap.data() as ServiceTrackingDocument;
      // Sync servicemanId or status if changed
      const updates: Partial<ServiceTrackingDocument> = {
        lastUpdatedAt: nowIso,
      };
      if (booking.serviceManId && booking.serviceManId !== current.servicemanId) {
        updates.servicemanId = booking.serviceManId;
      }
      if (current.status !== derivedStatus && isActiveTrackingStatus(derivedStatus)) {
        updates.status = derivedStatus;
      }
      if (!current.destination && initialDestination) {
        updates.destination = initialDestination;
      }
      if (Object.keys(updates).length > 1) {
        await updateDoc(trackingRef, updates);
      }
      return { ...current, ...updates };
    }
  } catch (err) {
    console.error(`[serviceTracking] Failed to initialize serviceTracking/${booking.id}:`, err);
    return null;
  }
}

/**
 * Updates the service professional's live location.
 * Only allowed for an authorized active booking in ON_THE_WAY or WORK_STARTED status.
 * Throttles writes: max 1 write every 30 seconds and preferably only after movement >= 50 meters.
 */
export async function updateServicemanTrackingLocation(
  bookingId: string,
  location: { latitude: number; longitude: number },
  etaSeconds?: number | null,
  options?: { force?: boolean }
): Promise<{ success: boolean; message?: string }> {
  if (!bookingId) return { success: false, message: 'Missing booking ID' };

  // 1. Internet disconnect check
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Offline - Location update postponed' };
  }

  // 2. Reduce unnecessary Firebase updates (Spark tier: min 50m & max 1 every 30s)
  const prevWrite = lastSavedServicemanLocations.get(bookingId);
  if (!shouldSyncLocationToFirebase(prevWrite, location, { force: options?.force, minDistanceMeters: 50, maxIntervalMs: 30000 })) {
    return { success: true, message: 'Throttled - Location delta within threshold' };
  }

  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);
  const nowIso = new Date().toISOString();

  try {
    const locPoint: TrackingLocationPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: nowIso,
    };

    const snap = await getDoc(trackingRef);
    if (!snap.exists()) {
      // Fetch booking to auto-initialize tracking document for this active booking
      const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingSnap.exists()) {
        return { success: false, message: 'Booking record not found' };
      }
      const bData = bookingSnap.data() as Booking;
      const derivedStatus = mapBookingStatusToLiveTrackingStatus(bData.status, bData.trackingStatus);

      // SPARK QUOTA REQUIREMENT: Only write while ON_THE_WAY or WORK_STARTED
      if (derivedStatus !== 'ON_THE_WAY' && derivedStatus !== 'WORK_STARTED' && derivedStatus !== 'ARRIVED') {
        return {
          success: false,
          message: `Location tracking rejected: booking status is ${derivedStatus} (must be ON_THE_WAY or WORK_STARTED)`,
        };
      }

      const initialDoc: ServiceTrackingDocument = {
        bookingId,
        customerId: bData.customerId || '',
        servicemanId: bData.serviceManId || '',
        status: derivedStatus,
        customerLocation: null,
        servicemanLocation: locPoint,
        destination: null,
        etaSeconds: etaSeconds ?? (typeof bData.etaMinutes === 'number' ? bData.etaMinutes * 60 : null),
        lastUpdatedAt: nowIso,
        locationHistory: [locPoint],
        trackingStartedAt: nowIso,
      };

      await setDoc(trackingRef, initialDoc);
      // Also dual-write to legacy collection without blocking
      setDoc(doc(db, LEGACY_SERVICE_TRACKING_COLLECTION, bookingId), initialDoc).catch(() => {});

      lastSavedServicemanLocations.set(bookingId, {
        latitude: location.latitude,
        longitude: location.longitude,
        time: Date.now(),
      });
      return { success: true };
    }

    const current = snap.data() as ServiceTrackingDocument;

    // SPARK QUOTA REQUIREMENT: Only write while ON_THE_WAY or WORK_STARTED
    if (current.status !== 'ON_THE_WAY' && current.status !== 'WORK_STARTED' && current.status !== 'ARRIVED') {
      lastSavedServicemanLocations.delete(bookingId);
      return {
        success: false,
        message: `Location tracking halted: booking tracking is ${current.status} (must be ON_THE_WAY or WORK_STARTED)`,
      };
    }

    // Spark Quota Optimization: do not create GPS history every second. Overwrite latest point.
    const updatePayload: Partial<ServiceTrackingDocument> = {
      servicemanLocation: locPoint,
      lastUpdatedAt: nowIso,
    };

    if (!current.trackingStartedAt) {
      updatePayload.trackingStartedAt = nowIso;
    }

    if (etaSeconds !== undefined) {
      updatePayload.etaSeconds = etaSeconds;
    }

    await updateDoc(trackingRef, updatePayload);
    // Also sync legacy document without blocking
    updateDoc(doc(db, LEGACY_SERVICE_TRACKING_COLLECTION, bookingId), updatePayload).catch(() => {});

    lastSavedServicemanLocations.set(bookingId, {
      latitude: location.latitude,
      longitude: location.longitude,
      time: Date.now(),
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[serviceTracking] Error updating serviceman location for ${bookingId}:`, err);
    return { success: false, message: err.message || 'Failed to update location' };
  }
}

/**
 * Updates the customer's location.
 * Only allowed for an authorized active booking.
 * Throttles writes when movement is under 20m to reduce unnecessary Firebase writes.
 */
export async function updateCustomerTrackingLocation(
  bookingId: string,
  location: { latitude: number; longitude: number },
  options?: { force?: boolean }
): Promise<{ success: boolean; message?: string }> {
  if (!bookingId) return { success: false, message: 'Missing booking ID' };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { success: false, message: 'Offline - Location update postponed' };
  }

  const prevWrite = lastSavedCustomerLocations.get(bookingId);
  if (!shouldSyncLocationToFirebase(prevWrite, location, { force: options?.force, minDistanceMeters: 20, maxIntervalMs: 45000 })) {
    return { success: true, message: 'Throttled - Customer location delta within threshold' };
  }

  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);
  const nowIso = new Date().toISOString();

  try {
    const snap = await getDoc(trackingRef);
    if (!snap.exists()) {
      return { success: false, message: 'serviceTracking document not initialized' };
    }

    const current = snap.data() as ServiceTrackingDocument;

    // Active booking guard: Stop tracking after COMPLETED or CANCELLED
    if (!isActiveTrackingStatus(current.status) || isTrackingTerminal(current.status)) {
      lastSavedCustomerLocations.delete(bookingId);
      return {
        success: false,
        message: `Location tracking rejected: tracking status is ${current.status}`,
      };
    }

    const locPoint: TrackingLocationPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: nowIso,
    };

    await updateDoc(trackingRef, {
      customerLocation: locPoint,
      lastUpdatedAt: nowIso,
    });

    lastSavedCustomerLocations.set(bookingId, {
      latitude: location.latitude,
      longitude: location.longitude,
      time: Date.now(),
    });

    return { success: true };
  } catch (err: any) {
    console.error(`[serviceTracking] Error updating customer location for ${bookingId}:`, err);
    return { success: false, message: err.message || 'Failed to update location' };
  }
}

/**
 * Explicitly terminates and cleans up live tracking session for a booking
 */
export async function stopServiceTrackingSession(
  bookingId: string,
  terminalStatus: 'COMPLETED' | 'CANCELLED' = 'COMPLETED'
): Promise<boolean> {
  if (!bookingId) return false;
  lastSavedServicemanLocations.delete(bookingId);
  lastSavedCustomerLocations.delete(bookingId);
  try {
    const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);
    const nowIso = new Date().toISOString();
    await updateDoc(trackingRef, {
      status: terminalStatus,
      trackingEndedAt: nowIso,
      lastUpdatedAt: nowIso,
    });
    return true;
  } catch (err) {
    console.warn('[serviceTracking] Session stop note:', err);
    return false;
  }
}

// Re-export Phase 13 Location History capabilities
export {
  appendBookingLocationHistoryPoint,
  getBookingLocationHistory,
  calculateLocationHistorySummary,
  exportLocationHistoryToCSV,
} from './serviceTrackingHistoryService';
export type { LocationHistorySummary } from './serviceTrackingHistoryService';

/**
 * Updates the destination location coordinates for a booking.
 */
export async function updateTrackingDestination(
  bookingId: string,
  destination: { latitude: number; longitude: number }
): Promise<{ success: boolean; message?: string }> {
  if (!bookingId) return { success: false, message: 'Missing booking ID' };

  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);
  const nowIso = new Date().toISOString();

  try {
    const destPoint: TrackingLocationPoint = {
      latitude: destination.latitude,
      longitude: destination.longitude,
      timestamp: nowIso,
    };

    await updateDoc(trackingRef, {
      destination: destPoint,
      lastUpdatedAt: nowIso,
    });

    return { success: true };
  } catch (err: any) {
    console.error(`[serviceTracking] Error updating destination for ${bookingId}:`, err);
    return { success: false, message: err.message || 'Failed to update destination' };
  }
}

/**
 * Updates the service tracking lifecycle status.
 */
export async function updateServiceTrackingStatus(
  bookingId: string,
  status: LiveLocationTrackingStatus
): Promise<{ success: boolean; message?: string }> {
  if (!bookingId) return { success: false, message: 'Missing booking ID' };

  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);
  const nowIso = new Date().toISOString();

  try {
    await updateDoc(trackingRef, {
      status,
      lastUpdatedAt: nowIso,
    });
    return { success: true };
  } catch (err: any) {
    console.error(`[serviceTracking] Error updating status for ${bookingId}:`, err);
    return { success: false, message: err.message || 'Failed to update status' };
  }
}

/**
 * Retrieves a single snapshot of the serviceTracking document.
 */
export async function getServiceTrackingRecord(
  bookingId: string
): Promise<ServiceTrackingDocument | null> {
  if (!bookingId) return null;

  try {
    const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);
    const snap = await getDoc(trackingRef);
    if (snap.exists()) {
      return snap.data() as ServiceTrackingDocument;
    }
    return null;
  } catch (err) {
    console.error(`[serviceTracking] Error fetching serviceTracking/${bookingId}:`, err);
    return null;
  }
}

/**
 * Subscribes in real-time to the serviceTracking document for an active booking.
 */
export function subscribeToServiceTracking(
  bookingId: string,
  callback: (tracking: ServiceTrackingDocument | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!bookingId) {
    callback(null);
    return () => {};
  }

  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);

  return onSnapshot(
    trackingRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as ServiceTrackingDocument);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn(`[serviceTracking] Snapshot listener error on ${bookingId}:`, err);
      if (onError) onError(err);
    }
  );
}

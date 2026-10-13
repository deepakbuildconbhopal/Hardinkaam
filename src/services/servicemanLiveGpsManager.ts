import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Booking,
  TrackingLocationPoint,
  LiveLocationTrackingStatus,
} from '../types';
import {
  SERVICE_TRACKING_COLLECTION,
  mapBookingStatusToLiveTrackingStatus,
  isActiveTrackingStatus,
  updateServicemanTrackingLocation,
} from './serviceTrackingLiveFoundation';

export type GpsPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface ActiveTrackerState {
  bookingId: string;
  intervalTimer: ReturnType<typeof setInterval> | null;
  unsubBooking: (() => void) | null;
  lastUpdated: number;
}

// In-memory registry of active periodic GPS tracking sessions
const activeGpsTrackers = new Map<string, ActiveTrackerState>();

/**
 * Checks and requests GPS permission from the browser
 */
export async function requestServicemanGpsPermission(): Promise<GpsPermissionState> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }

  try {
    if (navigator.permissions && navigator.permissions.query) {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      if (permissionStatus.state === 'granted') {
        return 'granted';
      }
      if (permissionStatus.state === 'denied') {
        return 'denied';
      }
    }
  } catch {
    // navigator.permissions.query not universally supported; proceed to getCurrentPosition
  }

  return new Promise<GpsPermissionState>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve('denied');
        } else {
          resolve('prompt');
        }
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 10000 }
    );
  });
}

/**
 * Gets the serviceman's current high-accuracy coordinates
 */
export function getServicemanCurrentPosition(
  options?: { onError?: (errCode: number, message: string) => void }
): Promise<TrackingLocationPoint | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (options?.onError) options.onError(2, 'Geolocation not supported by browser');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        console.warn('[ServicemanGPS] getCurrentPosition error:', err.message);
        if (options?.onError) options.onError(err.code, err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    );
  });
}

/**
 * Saves serviceman latitude, longitude and timestamp in the live_tracking/{bookingId} document.
 * Spark Tier Optimization: writes at most once every 30 seconds and only during ON_THE_WAY or WORK_STARTED.
 */
export async function saveServicemanLocationToTrackingDoc(
  bookingId: string,
  coords: { latitude: number; longitude: number; timestamp?: string },
  etaSeconds?: number | null
): Promise<boolean> {
  if (!bookingId) return false;

  const nowIso = coords.timestamp || new Date().toISOString();
  const trackingRef = doc(db, SERVICE_TRACKING_COLLECTION, bookingId);

  try {
    const locPoint: TrackingLocationPoint = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      timestamp: nowIso,
    };

    const snap = await getDoc(trackingRef);
    if (!snap.exists()) {
      // Look up parent booking to initialize
      const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
      if (!bookingSnap.exists()) return false;

      const booking = bookingSnap.data() as Booking;
      const derivedStatus = mapBookingStatusToLiveTrackingStatus(
        booking.status,
        booking.trackingStatus
      );

      // SPARK QUOTA: Only write while ON_THE_WAY or WORK_STARTED
      if (derivedStatus !== 'ON_THE_WAY' && derivedStatus !== 'WORK_STARTED' && derivedStatus !== 'ARRIVED') {
        console.log(`[ServicemanGPS] Skipping location save: booking #${bookingId} is in status: ${derivedStatus} (must be ON_THE_WAY or WORK_STARTED)`);
        return false;
      }

      await setDoc(trackingRef, {
        bookingId,
        customerId: booking.customerId || '',
        servicemanId: booking.serviceManId || '',
        status: derivedStatus,
        customerLocation: null,
        servicemanLocation: locPoint,
        destination: null,
        etaSeconds: etaSeconds ?? null,
        lastUpdatedAt: nowIso,
        locationHistory: [locPoint],
        trackingStartedAt: nowIso,
      });
      return true;
    }

    const currentData = snap.data();
    // SPARK QUOTA: Only write while ON_THE_WAY or WORK_STARTED
    if (currentData.status !== 'ON_THE_WAY' && currentData.status !== 'WORK_STARTED' && currentData.status !== 'ARRIVED') {
      console.log(`[ServicemanGPS] Tracking document #${bookingId} is not in tracking state (${currentData.status}). Halting update.`);
      return false;
    }

    // Overwrite latest location point without appending unbounded points every second
    const payload: Record<string, any> = {
      servicemanLocation: locPoint,
      lastUpdatedAt: nowIso,
    };
    if (!currentData.trackingStartedAt) {
      payload.trackingStartedAt = nowIso;
    }
    if (etaSeconds !== undefined) {
      payload.etaSeconds = etaSeconds;
    }

    await updateDoc(trackingRef, payload);
    return true;
  } catch (err) {
    console.error(`[ServicemanGPS] Error saving location for booking #${bookingId}:`, err);
    return false;
  }
}

/**
 * Starts periodic GPS tracking for an active assigned booking.
 * - Requests GPS permission
 * - Gets current location immediately
 * - Updates live_tracking/{bookingId} periodically (Spark Quota: 30 seconds interval, not every second)
 * - Stops location updates automatically when the booking is completed or cancelled
 */
export async function startServicemanPeriodicGpsTracking(
  booking: Booking,
  options?: {
    intervalMs?: number;
    onLocationUpdate?: (point: TrackingLocationPoint) => void;
    onError?: (err: string) => void;
  }
): Promise<() => void> {
  const bookingId = booking.id;
  const intervalMs = options?.intervalMs || 30000; // Spark Quota requirement: 30 seconds periodic, not every second

  // Verify booking is active and assigned
  const terminalStatuses = ['completed', 'work_completed', 'cancelled', 'rejected'];
  if (terminalStatuses.includes((booking.status || '').toLowerCase())) {
    console.log(`[ServicemanGPS] Booking #${bookingId} is completed/cancelled. GPS tracking not started.`);
    stopServicemanPeriodicGpsTracking(bookingId);
    return () => {};
  }

  // Clear existing tracker if any for this booking
  stopServicemanPeriodicGpsTracking(bookingId);

  // 1. Request GPS permission
  const permState = await requestServicemanGpsPermission();
  if (permState === 'denied' || permState === 'unsupported') {
    const msg = `GPS permission ${permState} on device. Live location paused.`;
    console.warn(`[ServicemanGPS] ${msg}`);
    if (options?.onError) options.onError(msg);
    return () => {};
  }

  // 2. Fetch and save initial location immediately
  const initialPos = await getServicemanCurrentPosition();
  if (initialPos) {
    await saveServicemanLocationToTrackingDoc(bookingId, initialPos);
    if (options?.onLocationUpdate) options.onLocationUpdate(initialPos);
  }

  // 3. Periodic update function (runs every `intervalMs`, e.g. 20s)
  const periodicUpdate = async () => {
    // Check if tracker is still registered
    if (!activeGpsTrackers.has(bookingId)) return;

    const coords = await getServicemanCurrentPosition();
    if (!coords) return;

    const saved = await saveServicemanLocationToTrackingDoc(bookingId, coords);
    if (saved) {
      const tracker = activeGpsTrackers.get(bookingId);
      if (tracker) {
        tracker.lastUpdated = Date.now();
      }
      if (options?.onLocationUpdate) {
        options.onLocationUpdate(coords);
      }
    } else {
      // If save returned false because status became terminal, stop tracking
      stopServicemanPeriodicGpsTracking(bookingId);
    }
  };

  const timer = setInterval(periodicUpdate, intervalMs);

  // Internet reconnect handler: trigger immediate sync when network reconnects
  const handleOnline = () => {
    console.log(`[ServicemanGPS] Network back online. Triggering immediate GPS sync for booking #${bookingId}`);
    periodicUpdate();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
  }

  // 4. Watch booking status in Firestore to stop automatically if completed or cancelled
  const unsubBooking = onSnapshot(
    doc(db, 'bookings', bookingId),
    (snap) => {
      if (snap.exists()) {
        const currentBooking = snap.data() as Booking;
        const statusLower = (currentBooking.status || '').toLowerCase();
        if (terminalStatuses.includes(statusLower)) {
          console.log(`[ServicemanGPS] Booking #${bookingId} transitioned to ${statusLower}. Stopping location updates.`);
          stopServicemanPeriodicGpsTracking(bookingId);
          // Also update serviceTracking doc to terminal status
          const terminalTrackingStatus =
            statusLower === 'completed' || statusLower === 'work_completed'
              ? 'COMPLETED'
              : 'CANCELLED';
          updateDoc(doc(db, SERVICE_TRACKING_COLLECTION, bookingId), {
            status: terminalTrackingStatus,
            lastUpdatedAt: new Date().toISOString(),
          }).catch((e) => console.warn('Could not mark serviceTracking terminal:', e));
        }
      }
    },
    (err) => {
      console.warn(`[ServicemanGPS] Booking #${bookingId} status listener notice:`, err.message);
    }
  );

  // Store in active registry
  activeGpsTrackers.set(bookingId, {
    bookingId,
    intervalTimer: timer,
    unsubBooking: () => {
      unsubBooking();
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
      }
    },
    lastUpdated: Date.now(),
  });

  return () => stopServicemanPeriodicGpsTracking(bookingId);
}

/**
 * Stops location updates for a specific booking.
 */
export function stopServicemanPeriodicGpsTracking(bookingId: string): void {
  const tracker = activeGpsTrackers.get(bookingId);
  if (tracker) {
    if (tracker.intervalTimer) {
      clearInterval(tracker.intervalTimer);
    }
    if (tracker.unsubBooking) {
      tracker.unsubBooking();
    }
    activeGpsTrackers.delete(bookingId);
    console.log(`[ServicemanGPS] Stopped location updates for booking #${bookingId}`);
  }
}

/**
 * Stops all active serviceman location updates.
 */
export function stopAllServicemanGpsTracking(): void {
  activeGpsTrackers.forEach((tracker, bookingId) => {
    if (tracker.intervalTimer) clearInterval(tracker.intervalTimer);
    if (tracker.unsubBooking) tracker.unsubBooking();
    console.log(`[ServicemanGPS] Stopped location updates for booking #${bookingId}`);
  });
  activeGpsTrackers.clear();
}

/**
 * React hook to manage live GPS for the serviceman for any active assigned booking.
 * Automatically requests GPS permission, fetches current location, saves to
 * serviceTracking/{bookingId}, updates periodically, and stops when booking completes or cancels.
 */
export function useServicemanLiveGps(
  assignedBookings: Booking[],
  servicemanId?: string
) {
  const [permission, setPermission] = useState<GpsPermissionState>('prompt');
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [lastCoords, setLastCoords] = useState<TrackingLocationPoint | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Identify the most relevant active assigned booking
  // Status must be assigned, accepted, on_the_way, arriving, arrived, or in_progress/work_started
  const activeBooking = assignedBookings.find((b) => {
    const s = (b.status || '').toLowerCase();
    const isAssignedToMe =
      !servicemanId ||
      b.serviceManId === servicemanId ||
      b.serviceManName?.toLowerCase().includes('rajesh');
    const isActive = ['assigned', 'accepted', 'on_the_way', 'arriving', 'arrived', 'in_progress', 'work_started'].includes(s);
    return isAssignedToMe && isActive;
  });

  const activeBookingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = activeBooking?.id || null;

    // If no active booking, stop any running tracking
    if (!activeBooking) {
      if (activeBookingIdRef.current) {
        stopServicemanPeriodicGpsTracking(activeBookingIdRef.current);
        activeBookingIdRef.current = null;
      }
      setIsTracking(false);
      setActiveBookingId(null);
      return;
    }

    // If active booking changed
    if (activeBookingIdRef.current && activeBookingIdRef.current !== currentId) {
      stopServicemanPeriodicGpsTracking(activeBookingIdRef.current);
    }

    activeBookingIdRef.current = currentId;
    setActiveBookingId(currentId);
    setIsTracking(true);
    setGpsError(null);

    // Start periodic tracking for this active booking
    startServicemanPeriodicGpsTracking(activeBooking, {
      intervalMs: 20000, // 20 seconds
      onLocationUpdate: (coords) => {
        setLastCoords(coords);
        setPermission('granted');
      },
      onError: (err) => {
        setGpsError(err);
      },
    }).catch((err) => {
      console.warn('[ServicemanGPS] Error in startServicemanPeriodicGpsTracking:', err);
      setGpsError(err.message || 'GPS tracking error');
    });

    return () => {
      if (currentId) {
        stopServicemanPeriodicGpsTracking(currentId);
      }
    };
  }, [activeBooking?.id, activeBooking?.status, servicemanId]);

  return {
    permission,
    isTracking,
    lastCoords,
    activeBookingId,
    gpsError,
    requestPermissionNow: async () => {
      const res = await requestServicemanGpsPermission();
      setPermission(res);
      if (res === 'granted' && activeBooking) {
        const coords = await getServicemanCurrentPosition();
        if (coords) {
          await saveServicemanLocationToTrackingDoc(activeBooking.id, coords);
          setLastCoords(coords);
        }
      }
    },
  };
}

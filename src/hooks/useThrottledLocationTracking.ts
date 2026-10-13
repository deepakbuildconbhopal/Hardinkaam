import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export interface ThrottledTrackingOptions {
  bookingId: string;
  professionalId?: string;
  isTrackingEnabled?: boolean;
  minIntervalMs?: number; // default: 30,000 (30 seconds)
  minDistanceMeters?: number; // default: 50 (50 meters)
  collectionName?: 'live_tracking' | 'serviceTracking';
  onSyncSuccess?: (coords: LocationCoordinates) => void;
  onSyncError?: (error: Error) => void;
}

export interface ThrottledTrackingState {
  // Local immediate state for fluid 60fps UI
  currentLocation: LocationCoordinates | null;
  lastSyncedLocation: LocationCoordinates | null;
  lastSyncedAt: number | null;
  isSyncing: boolean;
  gpsActive: boolean;
  error: string | null;
  totalDistanceMovedMeters: number;
  pendingSync: boolean;
  forceSync: () => Promise<boolean>;
}

/**
 * Calculates the great-circle distance between two geographic coordinates in METERS
 * using the Haversine formula.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Determines whether a new GPS point qualifies for a Firestore write:
 * Condition 1: 30 seconds (or minIntervalMs) have elapsed since the last write.
 * OR
 * Condition 2: The professional has moved >= 50 meters (or minDistanceMeters) from the last recorded point.
 */
export function shouldSyncLocationUpdate(
  current: LocationCoordinates,
  lastSynced: LocationCoordinates | null,
  lastSyncedAt: number | null,
  options: {
    minIntervalMs?: number;
    minDistanceMeters?: number;
  } = {}
): { shouldSync: boolean; reason: 'initial' | 'distance_threshold' | 'time_elapsed' | 'none'; distanceMeters: number } {
  const minInterval = options.minIntervalMs ?? 30000; // 30s
  const minDistance = options.minDistanceMeters ?? 50; // 50m

  // Always write the very first location
  if (!lastSynced || !lastSyncedAt) {
    return { shouldSync: true, reason: 'initial', distanceMeters: 0 };
  }

  const now = Date.now();
  const timeElapsed = now - lastSyncedAt;
  const distance = calculateDistanceMeters(
    lastSynced.latitude,
    lastSynced.longitude,
    current.latitude,
    current.longitude
  );

  // Check 50-meter threshold
  if (distance >= minDistance) {
    return { shouldSync: true, reason: 'distance_threshold', distanceMeters: distance };
  }

  // Check 30-second interval threshold
  if (timeElapsed >= minInterval) {
    return { shouldSync: true, reason: 'time_elapsed', distanceMeters: distance };
  }

  return { shouldSync: false, reason: 'none', distanceMeters: distance };
}

/**
 * Custom React Hook: useThrottledLocationTracking
 * 
 * - Updates local React state continuously for a smooth, lag-free UI and map marker.
 * - Throttles network writes to Firestore: only writes every 30s or on moving >= 50m.
 * - Drastically reduces Firestore document write operations & billing costs.
 */
export function useThrottledLocationTracking({
  bookingId,
  professionalId,
  isTrackingEnabled = true,
  minIntervalMs = 30000, // 30s
  minDistanceMeters = 50, // 50m
  collectionName = 'live_tracking',
  onSyncSuccess,
  onSyncError,
}: ThrottledTrackingOptions): ThrottledTrackingState {
  // Local state for smooth UI presentation
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
  const [lastSyncedLocation, setLastSyncedLocation] = useState<LocationCoordinates | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDistanceMovedMeters, setTotalDistanceMovedMeters] = useState<number>(0);
  const [pendingSync, setPendingSync] = useState<boolean>(false);

  // Mutable refs to prevent stale closures and excess re-renders
  const lastSyncedCoordsRef = useRef<LocationCoordinates | null>(null);
  const lastSyncedAtRef = useRef<number | null>(null);
  const latestCoordsRef = useRef<LocationCoordinates | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Performs the actual Firestore write operation
   */
  const writeLocationToFirestore = useCallback(
    async (coords: LocationCoordinates) => {
      if (!bookingId) return false;

      setIsSyncing(true);
      try {
        const trackingRef = doc(db, collectionName, bookingId);
        const isoString = new Date().toISOString();

        const updatePayload = {
          bookingId,
          ...(professionalId ? { servicemanId: professionalId, professionalId } : {}),
          servicemanLocation: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
            heading: coords.heading ?? null,
            speed: coords.speed ?? null,
            timestamp: isoString,
          },
          lastUpdatedAt: isoString,
          updatedAt: isoString,
        };

        // Write to Firestore (using setDoc with merge for resilience)
        await setDoc(trackingRef, updatePayload, { merge: true });

        const now = Date.now();
        lastSyncedCoordsRef.current = coords;
        lastSyncedAtRef.current = now;

        setLastSyncedLocation(coords);
        setLastSyncedAt(now);
        setPendingSync(false);

        if (onSyncSuccess) {
          onSyncSuccess(coords);
        }

        return true;
      } catch (err: any) {
        const errObj = err instanceof Error ? err : new Error(err?.message || 'Failed to update Firestore');
        console.warn(`[useThrottledLocationTracking] Firestore write failed:`, errObj.message);
        setError(errObj.message);
        if (onSyncError) {
          onSyncError(errObj);
        }
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [bookingId, professionalId, collectionName, onSyncSuccess, onSyncError]
  );

  /**
   * Manual force-sync trigger (e.g., when technician presses "Arrived" or "Status Update")
   */
  const forceSync = useCallback(async (): Promise<boolean> => {
    if (!latestCoordsRef.current) return false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return writeLocationToFirestore(latestCoordsRef.current);
  }, [writeLocationToFirestore]);

  // Geolocation watch listener
  useEffect(() => {
    if (!isTrackingEnabled || !bookingId || typeof window === 'undefined' || !navigator.geolocation) {
      setGpsActive(false);
      return;
    }

    setGpsActive(true);
    setError(null);

    const handlePositionChange = (position: GeolocationPosition) => {
      const newCoords: LocationCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      };

      // 1. Instantly update local state for smooth 60fps UI
      setCurrentLocation(newCoords);
      latestCoordsRef.current = newCoords;

      // Update total distance counter
      if (lastSyncedCoordsRef.current) {
        const d = calculateDistanceMeters(
          lastSyncedCoordsRef.current.latitude,
          lastSyncedCoordsRef.current.longitude,
          newCoords.latitude,
          newCoords.longitude
        );
        if (d > 2) {
          setTotalDistanceMovedMeters((prev) => prev + d);
        }
      }

      // 2. Evaluate throttling condition (>=50m OR >=30s)
      const { shouldSync, reason } = shouldSyncLocationUpdate(
        newCoords,
        lastSyncedCoordsRef.current,
        lastSyncedAtRef.current,
        { minIntervalMs, minDistanceMeters }
      );

      if (shouldSync) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        writeLocationToFirestore(newCoords);
      } else {
        // Schedule trailing sync if none is queued, ensuring latest position is eventually flushed
        setPendingSync(true);
        if (!timerRef.current && lastSyncedAtRef.current) {
          const remainingTime = Math.max(1000, minIntervalMs - (Date.now() - lastSyncedAtRef.current));
          timerRef.current = setTimeout(() => {
            timerRef.current = null;
            if (latestCoordsRef.current) {
              writeLocationToFirestore(latestCoordsRef.current);
            }
          }, remainingTime);
        }
      }
    };

    const handlePositionError = (err: GeolocationPositionError) => {
      console.warn('[useThrottledLocationTracking] Geolocation error:', err.message);
      setError(err.message);
      setGpsActive(false);
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePositionChange,
      handlePositionError,
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setGpsActive(false);
    };
  }, [isTrackingEnabled, bookingId, minIntervalMs, minDistanceMeters, writeLocationToFirestore]);

  return {
    currentLocation,
    lastSyncedLocation,
    lastSyncedAt,
    isSyncing,
    gpsActive,
    error,
    totalDistanceMovedMeters,
    pendingSync,
    forceSync,
  };
}

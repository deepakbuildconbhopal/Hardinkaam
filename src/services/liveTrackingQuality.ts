import { useState, useEffect, useRef } from 'react';
import { Booking, UserProfile } from '../types';
import { calculateHaversineDistanceKm } from './serviceTrackingService';

/**
 * Validates if the current user is authorized to view or update live tracking coordinates.
 * Authorized roles:
 * 1. Master/Super Admins and Franchise Admins
 * 2. Customer associated with the booking
 * 3. Serviceman/Technician assigned to the booking
 */
export function isAuthorizedToViewTracking(
  booking?: Booking | null,
  userProfile?: UserProfile | null,
  currentUserUid?: string | null
): boolean {
  if (!booking) return false;

  // 1. Admin authorization check
  const roleStr = (userProfile?.role as string) || '';
  if (
    roleStr === 'admin' ||
    roleStr === 'super_admin' ||
    userProfile?.email === 'deepakbuildconbhopal@gmail.com' ||
    userProfile?.email === 'admin@hardinkaam.in'
  ) {
    return true;
  }

  // 2. Identify current user ID
  const effectiveUid = currentUserUid || userProfile?.id;
  if (!effectiveUid) {
    // If no user is logged in, allow demo viewing only if no customerId is set on booking
    return !booking.customerId;
  }

  // 3. Customer match
  if (booking.customerId && booking.customerId === effectiveUid) {
    return true;
  }

  // 4. Serviceman match
  if (
    booking.serviceManId &&
    (booking.serviceManId === effectiveUid || booking.serviceManId === userProfile?.id)
  ) {
    return true;
  }

  // 5. Phone / email fallbacks
  if (userProfile?.phone) {
    if (booking.customerPhone && booking.customerPhone.replace(/\D/g, '') === userProfile.phone.replace(/\D/g, '')) {
      return true;
    }
    if (booking.serviceManPhone && booking.serviceManPhone.replace(/\D/g, '') === userProfile.phone.replace(/\D/g, '')) {
      return true;
    }
  }

  const bookingCustomerEmail = (booking as { customerEmail?: string }).customerEmail;
  if (userProfile?.email && bookingCustomerEmail) {
    if (bookingCustomerEmail.toLowerCase() === userProfile.email.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a booking's tracking has reached a terminal state
 * (completed or cancelled).
 */
export function isTrackingTerminal(status?: string | null, trackingStatus?: string | null): boolean {
  const normStatus = (status || '').toLowerCase().trim();
  const normTracking = (trackingStatus || '').toLowerCase().trim();
  const terminalList = ['completed', 'work_completed', 'cancelled', 'rejected'];

  return terminalList.includes(normStatus) || terminalList.includes(normTracking);
}

/**
 * Determines whether a new GPS position should be written to Firebase.
 * Reduces unnecessary Firebase writes by:
 * - Rejecting updates if offline
 * - Rejecting updates if moved less than `minDistanceMeters` (default 15m) AND elapsed time is < `maxIntervalMs` (default 30s)
 * - Reducing update frequency when the browser tab is hidden
 */
export function shouldSyncLocationToFirebase(
  prevLoc: {
    latitude: number;
    longitude: number;
    time?: number | string;
    timestamp?: string | number;
    updatedAt?: string | number;
  } | null | undefined,
  newLoc: {
    latitude: number;
    longitude: number;
    time?: number | string;
    timestamp?: string | number;
  },
  options?: {
    minDistanceMeters?: number;
    maxIntervalMs?: number;
    force?: boolean;
  }
): boolean {
  if (options?.force) return true;

  // 1. Check network connectivity
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  // 2. Initial position always syncs
  if (!prevLoc || !prevLoc.latitude || !prevLoc.longitude) {
    return true;
  }

  const now = Date.now();
  const rawPrevTime = prevLoc.timestamp ?? prevLoc.time ?? prevLoc.updatedAt;
  const prevTime = typeof rawPrevTime === 'number'
    ? rawPrevTime
    : rawPrevTime
    ? new Date(rawPrevTime).getTime()
    : now;

  const elapsedMs = Math.max(0, now - prevTime);
  // SPARK QUOTA OPTIMIZATION: Max 1 write every 30 seconds AND preferably only after movement >= 50 meters
  const minDistanceKm = (options?.minDistanceMeters ?? 50) / 1000;
  const maxIntervalMs = options?.maxIntervalMs ?? 30000; // 30 seconds maximum frequency

  // 3. Throttle if window tab is hidden
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    if (elapsedMs < 60000) return false;
  }

  // 4. Calculate distance moved since last write
  const distKm = calculateHaversineDistanceKm(
    prevLoc.latitude,
    prevLoc.longitude,
    newLoc.latitude,
    newLoc.longitude
  );

  // If moved >= 50 meters AND at least 30 seconds have elapsed (or first movement threshold)
  // Spark Quota requirement: Maximum one update every 30 seconds AND preferably only after movement >= 50 meters
  if (elapsedMs < maxIntervalMs) {
    return false; // Hard throttle: never write more frequently than once every 30 seconds
  }

  // If >= 30 seconds elapsed, only write if moved >= 50m (or keepalive heartbeat at 120s if active)
  if (distKm >= minDistanceKm) {
    return true;
  }

  // Optional heartbeat keepalive only every 120 seconds if stationary
  if (elapsedMs >= 120000) {
    return true;
  }

  // Otherwise, skip unnecessary Firebase write
  return false;
}

/**
 * Standard error and status messages for live tracking (Phase 12)
 */
export const LIVE_TRACKING_MESSAGES = {
  GPS_OFF: 'GPS is OFF. Please turn on device location/GPS.',
  GPS_PERMISSION_DENIED: 'GPS permission is denied. Please allow location access in your browser settings.',
  INTERNET_DISCONNECTED: 'Internet is disconnected. Live tracking paused.',
  INTERNET_CONNECTED_RESUMING: 'Internet connected. Resuming live tracking...',
  SERVICEMAN_LOCATION_UNAVAILABLE: 'Serviceman location is unavailable. Waiting for GPS signal...',
} as const;

/**
 * Formats a timestamp into human-friendly "last updated" text
 * e.g. "Just now", "25s ago", "2m ago", "10:45 AM"
 */
export function formatLastUpdatedAgo(timestamp?: string | number | null): string {
  if (!timestamp) return 'Waiting for update';

  const timeMs = typeof timestamp === 'number'
    ? timestamp
    : new Date(timestamp).getTime();

  if (isNaN(timeMs) || timeMs <= 0) return 'Just now';

  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - timeMs) / 1000));

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const date = new Date(timeMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * React hook to observe browser internet connectivity (online/offline).
 * Automatically resumes tracking when the connection returns.
 */
export function useNetworkStatus(onReconnect?: () => void): {
  isOnline: boolean;
  wasOffline: boolean;
  networkMessage: string | null;
} {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [networkMessage, setNetworkMessage] = useState<string | null>(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return LIVE_TRACKING_MESSAGES.INTERNET_DISCONNECTED;
    }
    return null;
  });

  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setNetworkMessage(LIVE_TRACKING_MESSAGES.INTERNET_CONNECTED_RESUMING);
      
      // Automatically resume tracking upon reconnection
      if (onReconnectRef.current) {
        try {
          onReconnectRef.current();
        } catch (e) {
          console.warn('Error during tracking resumption on reconnect:', e);
        }
      }

      const timer = setTimeout(() => {
        setWasOffline(false);
        setNetworkMessage(null);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(false);
      setNetworkMessage(LIVE_TRACKING_MESSAGES.INTERNET_DISCONNECTED);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, wasOffline, networkMessage };
}

/**
 * React hook to observe and handle device GPS availability and permission states.
 */
export function useGpsStatus(): {
  gpsState: 'ready' | 'prompt' | 'denied' | 'off' | 'unavailable' | 'timeout';
  gpsErrorMessage: string | null;
  setGpsErrorFromCode: (code: number, message?: string) => void;
  resetGpsState: () => void;
  checkGpsPermission: () => Promise<'granted' | 'denied' | 'prompt' | 'unsupported'>;
} {
  const [gpsState, setGpsState] = useState<'ready' | 'prompt' | 'denied' | 'off' | 'unavailable' | 'timeout'>('ready');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  const setGpsErrorFromCode = (code: number, message?: string) => {
    if (code === 1) { // PERMISSION_DENIED
      setGpsState('denied');
      setGpsErrorMessage(LIVE_TRACKING_MESSAGES.GPS_PERMISSION_DENIED);
    } else if (code === 2) { // POSITION_UNAVAILABLE
      setGpsState('off');
      setGpsErrorMessage(LIVE_TRACKING_MESSAGES.GPS_OFF);
    } else if (code === 3) { // TIMEOUT
      setGpsState('timeout');
      setGpsErrorMessage('GPS request timed out. Retrying location signal...');
    } else {
      setGpsState('unavailable');
      setGpsErrorMessage(message || LIVE_TRACKING_MESSAGES.GPS_OFF);
    }
  };

  const resetGpsState = () => {
    setGpsState('ready');
    setGpsErrorMessage(null);
  };

  const checkGpsPermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return 'unsupported';
    }
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'geolocation' });
        if (status.state === 'denied') {
          setGpsState('denied');
          setGpsErrorMessage(LIVE_TRACKING_MESSAGES.GPS_PERMISSION_DENIED);
          return 'denied';
        }
        if (status.state === 'granted') {
          setGpsState('ready');
          setGpsErrorMessage(null);
          return 'granted';
        }
        return 'prompt';
      }
    } catch {
      // Fallback
    }
    return 'prompt';
  };

  return {
    gpsState,
    gpsErrorMessage,
    setGpsErrorFromCode,
    resetGpsState,
    checkGpsPermission,
  };
}

export type LiveTrackingErrorType =
  | 'internet_disconnected'
  | 'internet_reconnected'
  | 'gps_permission_denied'
  | 'gps_off'
  | 'serviceman_location_unavailable';

export interface LiveTrackingErrorInfo {
  type: LiveTrackingErrorType;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
}

/**
 * Computes the active primary error state for live tracking
 */
export function getLiveTrackingErrorInfo(params: {
  isOnline: boolean;
  wasOffline?: boolean;
  isTerminal?: boolean;
  hasProLocation?: boolean;
  hasServicemanLocation?: boolean;
  gpsState?: string;
  gpsErrorMessage?: string | null;
}): LiveTrackingErrorInfo | null {
  const { isOnline, wasOffline, isTerminal, hasProLocation, hasServicemanLocation, gpsState, gpsErrorMessage } = params;
  const isLocationAvailable = typeof hasServicemanLocation === 'boolean' ? hasServicemanLocation : hasProLocation;

  // 1. Internet Disconnected
  if (!isOnline) {
    return {
      type: 'internet_disconnected',
      message: LIVE_TRACKING_MESSAGES.INTERNET_DISCONNECTED,
      severity: 'error',
    };
  }

  // 2. Internet Just Reconnected (Resume tracking indicator)
  if (wasOffline) {
    return {
      type: 'internet_reconnected',
      message: LIVE_TRACKING_MESSAGES.INTERNET_CONNECTED_RESUMING,
      severity: 'success',
    };
  }

  // If tracking has finished (completed/cancelled), no error banners needed
  if (isTerminal) {
    return null;
  }

  // 3. GPS Permission Denied
  if (gpsState === 'denied' || gpsErrorMessage?.toLowerCase().includes('permission')) {
    return {
      type: 'gps_permission_denied',
      message: LIVE_TRACKING_MESSAGES.GPS_PERMISSION_DENIED,
      severity: 'error',
    };
  }

  // 4. GPS is OFF / Unavailable
  if (
    gpsState === 'off' ||
    gpsState === 'unavailable' ||
    gpsState === 'timeout' ||
    (gpsErrorMessage && !gpsErrorMessage.toLowerCase().includes('permission'))
  ) {
    return {
      type: 'gps_off',
      message: gpsErrorMessage || LIVE_TRACKING_MESSAGES.GPS_OFF,
      severity: 'warning',
    };
  }

  // 5. Serviceman Location is Unavailable
  if (!isLocationAvailable) {
    return {
      type: 'serviceman_location_unavailable',
      message: LIVE_TRACKING_MESSAGES.SERVICEMAN_LOCATION_UNAVAILABLE,
      severity: 'info',
    };
  }

  return null;
}

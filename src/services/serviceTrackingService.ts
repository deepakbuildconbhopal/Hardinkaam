import { doc, updateDoc, collection, query, where, getDocs, addDoc, getDoc, setDoc, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../utils/sparkQuotaGuard';
import {
  Booking,
  ServiceMan,
  ServiceManLocationData,
  TrackingStatus,
  TrackingLocationPoint,
  LiveLocationTrackingStatus,
} from '../types';
import { notifyReassignment } from './bookingNotificationIntegrationService';

export const UNABLE_TO_REACH_REASONS = [
  { id: 'emergency', label: 'Emergency (आपातकालीन स्थिति)' },
  { id: 'vehicle_problem', label: 'Vehicle problem (गाड़ी / वाहन खराब)' },
  { id: 'too_far', label: 'Too far (दूरी बहुत अधिक है)' },
  { id: 'unable_to_contact', label: 'Unable to contact customer (ग्राहक से संपर्क नहीं हो पा रहा)' },
  { id: 'other', label: 'Other (अन्य कारण)' },
] as const;

/**
 * Standard coordinates for Madhya Pradesh districts and key localities
 */
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  bhopal: { lat: 23.2599, lng: 77.4126 },
  indore: { lat: 22.7196, lng: 75.8577 },
  gwalior: { lat: 26.2183, lng: 78.1828 },
  jabalpur: { lat: 23.1815, lng: 79.9864 },
  ujjain: { lat: 23.1765, lng: 75.7885 },
  sagar: { lat: 23.8388, lng: 78.7378 },
  rewa: { lat: 24.5362, lng: 81.3037 },
  satna: { lat: 24.5804, lng: 80.8293 },
  ratlam: { lat: 23.3315, lng: 75.0367 },
  shivpuri: { lat: 25.4300, lng: 77.6599 },
  vidisha: { lat: 23.5251, lng: 77.8081 },
  sehore: { lat: 23.2031, lng: 77.0844 },
  hoshangabad: { lat: 22.7519, lng: 77.7289 },
};

export const BHOPAL_LOCALITIES: Record<string, { lat: number; lng: number }> = {
  'mp nagar': { lat: 23.2332, lng: 77.4343 },
  'arera colony': { lat: 23.2125, lng: 77.4332 },
  'kolar': { lat: 23.1783, lng: 77.4215 },
  'shahpura': { lat: 23.1977, lng: 77.4326 },
  'new market': { lat: 23.2384, lng: 77.4019 },
  'tt nagar': { lat: 23.2356, lng: 77.4045 },
  'hoshangabad road': { lat: 23.1825, lng: 77.4600 },
  'indrapuri': { lat: 23.2541, lng: 77.4682 },
  'ayodhya bypass': { lat: 23.2655, lng: 77.4789 },
  'govindpura': { lat: 23.2590, lng: 77.4520 },
  'bhel': { lat: 23.2680, lng: 77.4650 },
  'lalghati': { lat: 23.2842, lng: 77.3752 },
  'bairagarh': { lat: 23.2800, lng: 77.3400 },
  'ashoka garden': { lat: 23.2650, lng: 77.4250 },
  'karond': { lat: 23.3050, lng: 77.4050 },
  'chunabhatti': { lat: 23.1960, lng: 77.4180 },
  'misrod': { lat: 23.1550, lng: 77.4700 },
  'baghmugalia': { lat: 23.1950, lng: 77.4580 },
  'awadhpuri': { lat: 23.2350, lng: 77.4850 },
  'katara hills': { lat: 23.1750, lng: 77.4950 },
};

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Calculates Estimated Arrival Time in minutes
 * Average urban service technician 2-wheeler speed is ~22-25 km/h in Indian cities
 */
export function calculateEtaMinutes(distanceKm: number): number {
  if (distanceKm <= 0.1) return 1;
  const averageSpeedKmh = 24; // 24 km/h
  const travelMinutes = (distanceKm / averageSpeedKmh) * 60;
  const trafficBuffer = 2; // 2 mins buffer for signals/traffic
  return Math.max(1, Math.round(travelMinutes + trafficBuffer));
}

/**
 * Formats ETA string as required: "लगभग X मिनट में पहुँचेंगे"
 * If unavailable: returns "ETA unavailable"
 */
export function getArrivalEtaText(etaMinutes?: number | null): string {
  if (etaMinutes === undefined || etaMinutes === null || isNaN(etaMinutes) || etaMinutes <= 0) {
    return 'ETA unavailable';
  }
  return `लगभग ${etaMinutes} मिनट में पहुँचेंगे`;
}

/**
 * Formats last location update time: "Last updated X minutes ago"
 * If unavailable: returns "Live location unavailable"
 */
export function getLastUpdatedText(lastLocationUpdate?: string | null): string {
  if (!lastLocationUpdate) {
    return 'Live location unavailable';
  }
  const date = new Date(lastLocationUpdate);
  if (isNaN(date.getTime())) {
    return 'Live location unavailable';
  }
  const diffSecs = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSecs < 45) {
    return 'Last updated just now';
  }
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins === 1) {
    return 'Last updated 1 minute ago';
  }
  if (diffMins < 60) {
    return `Last updated ${diffMins} minutes ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  return `Last updated ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
}

/**
 * Resolves coordinates for a customer service address
 */
export function resolveAddressCoordinates(
  address: string = '',
  city: string = 'Bhopal'
): { lat: number; lng: number } {
  const lowerAddr = (address || '').toLowerCase();
  const lowerCity = (city || 'bhopal').toLowerCase().trim();

  // 1. Search Bhopal locality dictionary
  for (const [key, coords] of Object.entries(BHOPAL_LOCALITIES)) {
    if (lowerAddr.includes(key)) {
      return coords;
    }
  }

  // 2. Search City center
  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (lowerCity.includes(key) || lowerAddr.includes(key)) {
      return coords;
    }
  }

  // Default fallback: Bhopal MP Nagar Zone
  return { lat: 23.2332, lng: 77.4343 };
}

// Active tracking watch ID registry
const activeTrackingWatchers = new Map<string, number>();
const lastFirestoreWriteTime = new Map<string, number>();
const lastFirestoreWrittenPosition = new Map<string, { lat: number; lng: number; time: number; status?: string }>();

/**
 * Requests browser location permission explicitly from technician
 */
export async function requestProLocationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (err) => {
        console.warn('Geolocation permission not granted:', err.message);
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

/**
 * Starts periodic live location tracking for an active traveling service professional
 * Only tracks during ON_THE_WAY / ARRIVING status for assigned active booking
 * Throttled: maximum once per 30 seconds and preferably movement >= 50m
 */
export function startProLocationTracking(
  bookingId: string,
  serviceManId: string,
  customerAddress: string,
  customerCity?: string,
  onLocationUpdate?: (location: ServiceManLocationData, etaMinutes: number) => void
): () => void {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return () => {};
  }

  // Stop any existing tracking for this booking
  stopProLocationTracking(bookingId);

  const destination = resolveAddressCoordinates(customerAddress, customerCity);

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const nowIso = new Date().toISOString();

      const locData: ServiceManLocationData = {
        latitude,
        longitude,
        accuracy: accuracy ? Math.round(accuracy) : undefined,
        heading: heading !== null && !isNaN(heading) ? Math.round(heading) : undefined,
        speed: speed !== null && !isNaN(speed) ? parseFloat((speed * 3.6).toFixed(1)) : undefined, // km/h
        updatedAt: nowIso,
      };

      // Compute distance and ETA to customer
      const distanceKm = calculateHaversineDistanceKm(
        latitude,
        longitude,
        destination.lat,
        destination.lng
      );
      const etaMinutes = calculateEtaMinutes(distanceKm);
      const estimatedArrivalTime = new Date(Date.now() + etaMinutes * 60 * 1000).toISOString();

      // Dynamic tracking status transition
      let trackingStatus: TrackingStatus = 'on_the_way';
      if (distanceKm <= 0.15) {
        trackingStatus = 'arrived';
      } else if (distanceKm <= 0.8) {
        trackingStatus = 'arriving';
      }

      // Notify in-component listener
      if (onLocationUpdate) {
        onLocationUpdate(locData, etaMinutes);
      }

      // Location update rule: Maximum once per 30 seconds AND preferably movement >= 50m
      const now = Date.now();
      const lastWrite = lastFirestoreWriteTime.get(bookingId) || 0;
      const prevPosition = lastFirestoreWrittenPosition.get(bookingId);

      const elapsedMs = now - lastWrite;
      let shouldWrite = false;

      if (!prevPosition) {
        // First initial position update
        shouldWrite = true;
      } else if (elapsedMs >= 30000) {
        // At least 30 seconds passed - check movement threshold (>= 50m = 0.05km)
        const moveDistKm = calculateHaversineDistanceKm(
          prevPosition.lat,
          prevPosition.lng,
          latitude,
          longitude
        );

        if (moveDistKm >= 0.05 || trackingStatus !== prevPosition.status || elapsedMs >= 120000) {
          shouldWrite = true;
        }
      }

      if (shouldWrite) {
        lastFirestoreWriteTime.set(bookingId, now);
        lastFirestoreWrittenPosition.set(bookingId, {
          lat: latitude,
          lng: longitude,
          time: now,
          status: trackingStatus,
        });

        try {
          const bookingRef = doc(db, 'bookings', bookingId);
          await updateDoc(bookingRef, {
            serviceManLocation: locData,
            lastLocationUpdate: nowIso,
            etaMinutes,
            estimatedArrivalTime,
            trackingStatus,
            updatedAt: nowIso,
          });

          // Sync canonical live_tracking/{bookingId} collection and serviceTracking/{bookingId}
          try {
            const liveTrackingRef = doc(db, 'live_tracking', bookingId);
            const trackingRef = doc(db, 'serviceTracking', bookingId);
            const liveStatus: LiveLocationTrackingStatus =
              trackingStatus === 'arrived' ? 'ARRIVED' : 'ON_THE_WAY';

            const servicemanLoc: TrackingLocationPoint = {
              latitude,
              longitude,
              timestamp: nowIso,
            };

            const destLoc: TrackingLocationPoint = {
              latitude: destination.lat,
              longitude: destination.lng,
              timestamp: nowIso,
            };

            const trackingSnap = await getDoc(liveTrackingRef);
            if (!trackingSnap.exists()) {
              const bSnap = await getDoc(bookingRef);
              const bData = bSnap.data();
              const payload = {
                bookingId,
                customerId: bData?.customerId || '',
                servicemanId: serviceManId || bData?.serviceManId || '',
                status: liveStatus,
                customerLocation: null,
                servicemanLocation: servicemanLoc,
                destination: destLoc,
                etaSeconds: Math.round(etaMinutes * 60),
                lastUpdatedAt: nowIso,
              };
              await setDoc(liveTrackingRef, payload);
              setDoc(trackingRef, payload).catch(() => {});
            } else {
              const updatePayload = {
                servicemanLocation: servicemanLoc,
                destination: destLoc,
                status: liveStatus,
                etaSeconds: Math.round(etaMinutes * 60),
                lastUpdatedAt: nowIso,
              };
              await updateDoc(liveTrackingRef, updatePayload);
              updateDoc(trackingRef, updatePayload).catch(() => {});
            }
          } catch (syncErr) {
            console.warn('live_tracking sync notice:', syncErr);
          }
        } catch (err) {
          console.warn('Failed to update live location in Firestore:', err);
        }
      }
    },
    (err) => {
      console.warn(`Geolocation error for booking #${bookingId}:`, err.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 15000,
    }
  );

  activeTrackingWatchers.set(bookingId, watchId);

  return () => stopProLocationTracking(bookingId);
}

/**
 * Stops active location tracking for a booking
 */
export function stopProLocationTracking(bookingId: string): void {
  const watchId = activeTrackingWatchers.get(bookingId);
  if (watchId !== undefined && typeof window !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    activeTrackingWatchers.delete(bookingId);
  }
  lastFirestoreWriteTime.delete(bookingId);
  lastFirestoreWrittenPosition.delete(bookingId);
}

/**
 * Handles Service Professional reporting inability to reach customer ("मैं नहीं पहुँच पाऊँगा")
 * Preserves booking history and transitions to safe pending reassignment state.
 */
export async function handleServiceManUnableToReach(
  booking: Booking,
  reason: string,
  note?: string
): Promise<{ success: boolean; message: string }> {
  stopProLocationTracking(booking.id);
  const nowIso = new Date().toISOString();

  const historyEntry = {
    previousServiceManId: booking.serviceManId || '',
    previousServiceManName: booking.serviceManName || 'Technician',
    previousServiceManPhone: booking.serviceManPhone || '',
    reason: reason,
    note: note || '',
    timestamp: nowIso,
  };

  const existingHistory = Array.isArray(booking.reassignmentHistory)
    ? [...booking.reassignmentHistory]
    : [];
  existingHistory.push(historyEntry);

  const updateData: Partial<Booking> = {
    status: 'service_man_unable_to_reach',
    trackingStatus: 'service_man_unable_to_reach',
    unableToReachReason: reason,
    unableToReachNote: note || '',
    unableToReachAt: nowIso,
    reassignmentStatus: 'pending_reassignment',
    originalServiceManId: booking.originalServiceManId || booking.serviceManId,
    originalServiceManName: booking.originalServiceManName || booking.serviceManName,
    reassignmentHistory: existingHistory,
    updatedAt: nowIso,
  };

  try {
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, updateData);

    // Audit log
    await addDoc(collection(db, 'audit_logs'), {
      bookingId: booking.id,
      action: 'service_man_unable_to_reach',
      details: `Service professional ${booking.serviceManName} marked unable to reach: ${reason}. Note: ${note || 'None'}. Queued for reassignment.`,
      timestamp: nowIso,
    });

    return { success: true, message: 'Status updated. Reassignment initiated.' };
  } catch (err: any) {
    console.error('Failed to report unable to reach:', err);
    return { success: false, message: err.message || 'Failed to update booking status' };
  }
}

/**
 * Saves customer availability confirmation & landmark instructions
 */
export async function updateCustomerAvailability(
  bookingId: string,
  availabilityStatus: 'available' | 'call_before_arriving' | 'not_at_home',
  landmarkNote?: string
): Promise<{ success: boolean; message: string }> {
  const nowIso = new Date().toISOString();
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      customerAvailabilityStatus: availabilityStatus,
      customerLandmarkNote: landmarkNote || '',
      customerAvailabilityUpdatedAt: nowIso,
      updatedAt: nowIso,
    });
    return { success: true, message: 'Availability confirmed' };
  } catch (err: any) {
    console.error('Failed to update customer availability:', err);
    return { success: false, message: err.message || 'Failed to update availability' };
  }
}

/**
 * Searches for eligible replacement service professionals in the same district and trade
 */
export async function findEligibleReplacementTech(
  districtId: string,
  categoryId?: string,
  excludeTechId?: string
): Promise<ServiceMan[]> {
  if (isResourceExhausted()) return [];
  try {
    const prosRef = collection(db, 'service_men');
    const snap = await getDocs(query(prosRef, limit(50)));
    const targetDist = districtId.toLowerCase().trim();

    const matches: ServiceMan[] = [];
    snap.forEach((d) => {
      const data = d.data() as ServiceMan;
      const id = d.id;
      if (id === excludeTechId) return;

      const pDistId = (data.districtId || (data as any).assignedDistrictId || '').toLowerCase().trim();
      const pDistName = (data.districtName || (data as any).assignedDistrictName || '').toLowerCase().trim();
      const isDistrictMatch = pDistId === targetDist || pDistName.includes(targetDist);

      const isCategoryMatch =
        !categoryId ||
        data.categoryIds?.includes(categoryId) ||
        data.categoryNames?.some((c) => c.toLowerCase().includes(categoryId.toLowerCase()));

      if (isDistrictMatch && isCategoryMatch && data.isVerified !== false) {
        matches.push({ id, ...data });
      }
    });

    return matches;
  } catch (err) {
    console.warn('Find replacement tech error:', err);
    checkAndHandleQuotaError(err);
    return [];
  }
}

/**
 * Reassigns an existing booking to a new eligible service professional
 */
export async function reassignBookingToTech(
  booking: Booking,
  newTech: ServiceMan,
  reassignedBy: string = 'system',
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const nowIso = new Date().toISOString();

  const historyEntry = {
    previousServiceManId: booking.serviceManId || '',
    previousServiceManName: booking.serviceManName || 'Technician',
    previousServiceManPhone: booking.serviceManPhone || '',
    reason: reason || 'Service professional unable to reach; reassigned by franchise admin/system',
    timestamp: nowIso,
    reassignedBy,
    newServiceManId: newTech.id,
    newServiceManName: newTech.name,
  };

  const existingHistory = Array.isArray(booking.reassignmentHistory)
    ? [...booking.reassignmentHistory]
    : [];
  existingHistory.push(historyEntry);

  const updateData: Partial<Booking> = {
    serviceManId: newTech.id,
    serviceManName: newTech.name,
    serviceManPhone: newTech.phone,
    status: 'assigned',
    trackingStatus: 'assigned',
    reassignmentStatus: 'reassigned',
    reassignmentHistory: existingHistory,
    serviceManLocation: undefined,
    lastLocationUpdate: undefined,
    etaMinutes: undefined,
    estimatedArrivalTime: undefined,
    updatedAt: nowIso,
  };

  try {
    const bookingRef = doc(db, 'bookings', booking.id);
    await updateDoc(bookingRef, updateData);

    await addDoc(collection(db, 'audit_logs'), {
      bookingId: booking.id,
      action: 'booking_reassigned',
      details: `Booking #${booking.id} reassigned to ${newTech.name} (${newTech.phone}) by ${reassignedBy}.`,
      timestamp: nowIso,
    });

    // Dispatch deduplicated reassignment notifications
    notifyReassignment(
      booking,
      reason,
      newTech.id,
      newTech.name,
      historyEntry.previousServiceManId
    ).catch(() => {});

    return { success: true, message: `Booking successfully reassigned to ${newTech.name}` };
  } catch (err: any) {
    console.error('Failed to reassign booking:', err);
    return { success: false, message: err.message || 'Failed to reassign booking' };
  }
}

// Re-export Phase 1 Live Location Foundation APIs
export * from './serviceTrackingLiveFoundation';

// Re-export Phase 2 Serviceman Live GPS APIs
export * from './servicemanLiveGpsManager';



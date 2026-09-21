import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TrackingLocationPoint, ServiceTrackingDocument, Booking } from '../types';
import { calculateHaversineDistanceKm } from './serviceTrackingService';
import { isTrackingTerminal } from './liveTrackingQuality';

export interface LocationHistorySummary {
  totalPoints: number;
  totalDistanceKm: number;
  formattedDistance: string;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  formattedDuration: string;
  averageSpeedKmh: number | null;
}

/**
 * Calculates metrics and statistics for a series of location history points.
 */
export function calculateLocationHistorySummary(
  points: TrackingLocationPoint[]
): LocationHistorySummary {
  if (!points || points.length === 0) {
    return {
      totalPoints: 0,
      totalDistanceKm: 0,
      formattedDistance: '0 km',
      startTime: null,
      endTime: null,
      durationMinutes: 0,
      formattedDuration: '0 mins',
      averageSpeedKmh: null,
    };
  }

  // Sort chronologically by timestamp
  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalDistanceKm = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (
      typeof prev.latitude === 'number' &&
      typeof prev.longitude === 'number' &&
      typeof curr.latitude === 'number' &&
      typeof curr.longitude === 'number'
    ) {
      const dist = calculateHaversineDistanceKm(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude
      );
      totalDistanceKm += dist;
    }
  }

  const startIso = sorted[0].timestamp;
  const endIso = sorted[sorted.length - 1].timestamp;

  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  const durationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));

  let formattedDuration = `${durationMinutes} min${durationMinutes === 1 ? '' : 's'}`;
  if (durationMinutes >= 60) {
    const hrs = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    formattedDuration = `${hrs} hr${hrs === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`;
  }

  let formattedDistance = '';
  if (totalDistanceKm < 1) {
    formattedDistance = `${Math.round(totalDistanceKm * 1000)} m`;
  } else {
    formattedDistance = `${totalDistanceKm.toFixed(2)} km`;
  }

  const hours = durationMinutes / 60;
  const averageSpeedKmh =
    hours > 0 && totalDistanceKm > 0
      ? Number((totalDistanceKm / hours).toFixed(1))
      : null;

  return {
    totalPoints: sorted.length,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    formattedDistance,
    startTime: startIso,
    endTime: endIso,
    durationMinutes,
    formattedDuration,
    averageSpeedKmh,
  };
}

/**
 * Appends a location history point to the active booking tracking session.
 * Strictly constrained to the required active tracking period.
 */
export async function appendBookingLocationHistoryPoint(
  bookingId: string,
  point: { latitude: number; longitude: number; timestamp?: string }
): Promise<boolean> {
  if (!bookingId) return false;

  const nowIso = point.timestamp || new Date().toISOString();
  const newPoint: TrackingLocationPoint = {
    latitude: point.latitude,
    longitude: point.longitude,
    timestamp: nowIso,
  };

  try {
    const trackingRef = doc(db, 'serviceTracking', bookingId);
    const snap = await getDoc(trackingRef);

    if (!snap.exists()) {
      return false;
    }

    const trackingData = snap.data() as ServiceTrackingDocument;

    // Reject appending if tracking is already in terminal state (COMPLETED or CANCELLED)
    if (isTrackingTerminal(trackingData.status)) {
      return false;
    }

    const existingHistory: TrackingLocationPoint[] = trackingData.locationHistory || [];

    // Filter out minimal jitter (< 10m unless > 20 seconds apart) to keep the history meaningful and compact
    const lastPoint = existingHistory[existingHistory.length - 1];
    if (lastPoint) {
      const distMeters =
        calculateHaversineDistanceKm(
          lastPoint.latitude,
          lastPoint.longitude,
          newPoint.latitude,
          newPoint.longitude
        ) * 1000;
      const timeDiffMs =
        new Date(newPoint.timestamp).getTime() - new Date(lastPoint.timestamp).getTime();

      if (distMeters < 10 && timeDiffMs < 20000) {
        return false;
      }
    }

    // Keep bounded tracking history for the active session (up to 300 points)
    const updatedHistory = [...existingHistory.slice(-299), newPoint];

    const updates: Partial<ServiceTrackingDocument> = {
      locationHistory: updatedHistory,
      lastUpdatedAt: nowIso,
    };

    if (!trackingData.trackingStartedAt) {
      updates.trackingStartedAt = nowIso;
    }

    await updateDoc(trackingRef, updates);

    // Also record in subcollection for granular history audit
    try {
      const subcolRef = collection(db, 'serviceTracking', bookingId, 'locationHistory');
      await addDoc(subcolRef, newPoint);
    } catch {
      // Subcollection addition is non-blocking
    }

    return true;
  } catch (err) {
    console.warn(`[LocationHistory] Failed to append point for ${bookingId}:`, err);
    return false;
  }
}

/**
 * Retrieves the full location history for a booking.
 * Can be fetched for completed or active bookings by authorized Admin.
 */
export async function getBookingLocationHistory(
  bookingId: string
): Promise<TrackingLocationPoint[]> {
  if (!bookingId) return [];

  try {
    // 1. Try reading from serviceTracking document
    const trackingRef = doc(db, 'serviceTracking', bookingId);
    const snap = await getDoc(trackingRef);

    if (snap.exists()) {
      const data = snap.data() as ServiceTrackingDocument;
      if (Array.isArray(data.locationHistory) && data.locationHistory.length > 0) {
        return [...data.locationHistory].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    }

    // 2. Fallback: Check subcollection `serviceTracking/{bookingId}/locationHistory`
    try {
      const subcolRef = collection(db, 'serviceTracking', bookingId, 'locationHistory');
      const q = query(subcolRef, orderBy('timestamp', 'asc'), limit(300));
      const subSnap = await getDocs(q);

      if (!subSnap.empty) {
        const points: TrackingLocationPoint[] = [];
        subSnap.forEach((d) => {
          const pt = d.data() as TrackingLocationPoint;
          if (typeof pt.latitude === 'number' && typeof pt.longitude === 'number') {
            points.push({
              latitude: pt.latitude,
              longitude: pt.longitude,
              timestamp: pt.timestamp || new Date().toISOString(),
            });
          }
        });
        if (points.length > 0) {
          return points;
        }
      }
    } catch {
      // subcollection query fallback
    }

    // 3. Fallback: Check booking document itself
    const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
    if (bookingSnap.exists()) {
      const bData = bookingSnap.data() as Booking;
      if (Array.isArray(bData.locationHistory) && bData.locationHistory.length > 0) {
        return bData.locationHistory;
      }
      if (bData.serviceManLocation?.latitude && bData.serviceManLocation?.longitude) {
        return [
          {
            latitude: bData.serviceManLocation.latitude,
            longitude: bData.serviceManLocation.longitude,
            timestamp: bData.serviceManLocation.updatedAt || bData.completedAt || new Date().toISOString(),
          },
        ];
      }
    }

    return [];
  } catch (err) {
    console.error(`[LocationHistory] Failed to retrieve history for booking #${bookingId}:`, err);
    return [];
  }
}

/**
 * Downloads location history points as a CSV file.
 */
export function exportLocationHistoryToCSV(
  bookingId: string,
  serviceName: string,
  points: TrackingLocationPoint[]
): void {
  if (!points || points.length === 0) {
    alert('No location history data to export.');
    return;
  }

  const sorted = [...points].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const headers = [
    'Point #',
    'Timestamp (ISO)',
    'Date',
    'Time (Local)',
    'Latitude',
    'Longitude',
    'Distance from Prev (m)',
    'Cumulative Distance (km)',
  ];

  let cumulativeKm = 0;
  const rows = sorted.map((pt, idx) => {
    let deltaMeters = 0;
    if (idx > 0) {
      const prev = sorted[idx - 1];
      const dist = calculateHaversineDistanceKm(
        prev.latitude,
        prev.longitude,
        pt.latitude,
        pt.longitude
      );
      deltaMeters = Math.round(dist * 1000);
      cumulativeKm += dist;
    }

    const d = new Date(pt.timestamp);
    const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('en-IN') : 'N/A';
    const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('en-IN') : 'N/A';

    return [
      idx + 1,
      `"${pt.timestamp}"`,
      `"${dateStr}"`,
      `"${timeStr}"`,
      pt.latitude.toFixed(6),
      pt.longitude.toFixed(6),
      deltaMeters,
      cumulativeKm.toFixed(3),
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `Location_History_Booking_${bookingId}_${serviceName.replace(/\s+/g, '_')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

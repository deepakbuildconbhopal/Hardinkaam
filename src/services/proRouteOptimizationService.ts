/**
 * HARDINKAAM SERVICE PROFESSIONAL - DAILY TRAVEL ROUTE OPTIMIZATION SERVICE
 * 
 * Provides algorithms to optimize service technicians' daily job itineraries,
 * minimizing total travel distance, fuel consumption, and commute times between
 * client locations across city sectors.
 */

import { Booking, BookingStatus } from '../types';
import {
  resolveAddressCoordinates,
  calculateHaversineDistanceKm,
  calculateEtaMinutes,
} from './serviceTrackingService';

export interface RouteStop {
  id: string;
  sequence: number;
  bookingId: string;
  booking: Booking;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  address: string;
  city: string;
  timeSlot: string;
  scheduledDate: string;
  lat: number;
  lng: number;
  status: BookingStatus;
  amount: number;
  isCompleted: boolean;
  isActive: boolean;
  estimatedDurationMins: number;
  distanceFromPrevKm?: number;
  etaMinutesFromPrev?: number;
  estimatedArrivalTime?: string;
}

export interface OptimizationResult {
  optimizedStops: RouteStop[];
  originalTotalDistanceKm: number;
  optimizedTotalDistanceKm: number;
  distanceSavedKm: number;
  timeSavedMins: number;
  totalTravelDurationMins: number;
  percentageSaved: number;
}

/**
 * Builds RouteStop objects from assigned bookings for a given day.
 */
export function buildRouteStopsFromBookings(
  bookings: Booking[],
  filterDate?: string
): RouteStop[] {
  // Filter active jobs (excluding cancelled/rejected)
  const candidateBookings = bookings.filter((b) => {
    const s = String(b.status || '').toLowerCase();
    if (s === 'cancelled' || s === 'rejected') return false;

    if (filterDate) {
      const bDate = (b.scheduledDate || b.date || '').trim().toLowerCase();
      const todayIso = new Date().toISOString().slice(0, 10);
      const isTodayFilter = filterDate === todayIso;

      if (isTodayFilter) {
        const isMarkedToday =
          bDate.includes('today') ||
          bDate.includes('आज') ||
          bDate.includes(todayIso) ||
          (!bDate && ['accepted', 'on_the_way', 'in_progress', 'pending'].includes(s));
        if (!isMarkedToday) return false;
      } else {
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrowIso = tomorrowDate.toISOString().slice(0, 10);
        const isTomorrowFilter = filterDate === tomorrowIso;

        if (isTomorrowFilter) {
          const isMarkedTomorrow =
            bDate.includes('tomorrow') ||
            bDate.includes('कल') ||
            bDate.includes(tomorrowIso);
          if (!isMarkedTomorrow) return false;
        } else if (!bDate.includes(filterDate.toLowerCase())) {
          return false;
        }
      }
    }
    return true;
  });

  return candidateBookings.map((b, index) => {
    const coords = (b.latitude && b.longitude)
      ? { lat: b.latitude, lng: b.longitude }
      : resolveAddressCoordinates(b.address, b.city);

    const s = (b.status || '').toLowerCase();
    const isCompleted = s === 'completed';
    const isActive = ['on_the_way', 'arriving', 'arrived', 'in_progress', 'work_started'].includes(s);

    return {
      id: `stop_${b.id}`,
      sequence: index + 1,
      bookingId: b.id,
      booking: b,
      customerName: b.customerName || 'Customer',
      customerPhone: b.customerPhone || '',
      serviceName: b.serviceName || 'Service Call',
      address: b.address || b.city || 'Bhopal',
      city: b.city || 'Bhopal',
      timeSlot: b.scheduledTime || b.timeSlot || 'Anytime',
      scheduledDate: b.scheduledDate || b.date || 'Today',
      lat: coords.lat,
      lng: coords.lng,
      status: b.status,
      amount: b.amount || 0,
      isCompleted,
      isActive,
      estimatedDurationMins: 45, // default service work window
    };
  });
}

/**
 * Calculates total route distance for a given sequence of stops starting from origin.
 */
export function calculateTotalRouteDistanceKm(
  origin: { lat: number; lng: number },
  stops: RouteStop[]
): number {
  if (stops.length === 0) return 0;

  let totalKm = 0;
  let prevPos = origin;

  for (const stop of stops) {
    const dist = calculateHaversineDistanceKm(prevPos.lat, prevPos.lng, stop.lat, stop.lng);
    totalKm += dist;
    prevPos = { lat: stop.lat, lng: stop.lng };
  }

  return parseFloat(totalKm.toFixed(2));
}

/**
 * Recalculates leg distances, travel ETAs, and scheduled arrival times along a route.
 */
export function populateRouteLegMetrics(
  origin: { lat: number; lng: number },
  stops: RouteStop[],
  startTime: Date = new Date()
): RouteStop[] {
  let prevPos = origin;
  let currentTime = new Date(startTime.getTime());

  return stops.map((stop, index) => {
    const dist = calculateHaversineDistanceKm(prevPos.lat, prevPos.lng, stop.lat, stop.lng);
    const travelEtaMins = calculateEtaMinutes(dist);

    currentTime = new Date(currentTime.getTime() + travelEtaMins * 60 * 1000);
    const etaStr = currentTime.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Advance current time by job duration for next leg computation
    currentTime = new Date(currentTime.getTime() + stop.estimatedDurationMins * 60 * 1000);
    prevPos = { lat: stop.lat, lng: stop.lng };

    return {
      ...stop,
      sequence: index + 1,
      distanceFromPrevKm: dist,
      etaMinutesFromPrev: travelEtaMins,
      estimatedArrivalTime: etaStr,
    };
  });
}

/**
 * Optimizes the sequence of daily stops using Nearest-Neighbor + 2-Opt TSP optimization.
 * 
 * Rules:
 * - If a job is already 'in_progress', 'arrived', or 'on_the_way', it MUST remain Stop #1.
 * - Completed jobs are pushed to the end or omitted from travel routing.
 * - Minimizes total commute distance and fuel consumption.
 */
export function optimizeDailyJobRoute(
  origin: { lat: number; lng: number },
  stops: RouteStop[],
  departureTime: Date = new Date()
): OptimizationResult {
  if (stops.length <= 1) {
    const populated = populateRouteLegMetrics(origin, stops, departureTime);
    const dist = calculateTotalRouteDistanceKm(origin, populated);
    return {
      optimizedStops: populated,
      originalTotalDistanceKm: dist,
      optimizedTotalDistanceKm: dist,
      distanceSavedKm: 0,
      timeSavedMins: 0,
      totalTravelDurationMins: Math.round(dist * 2.5),
      percentageSaved: 0,
    };
  }

  const originalDistance = calculateTotalRouteDistanceKm(origin, stops);

  // 1. Separate stops into:
  // - Pinned active job (if technician is already at or en route to a job)
  // - Pending unstarted jobs to be optimized
  // - Already completed jobs
  const completedJobs: RouteStop[] = [];
  const activePinnedJobs: RouteStop[] = [];
  const candidateJobs: RouteStop[] = [];

  for (const stop of stops) {
    if (stop.isCompleted) {
      completedJobs.push(stop);
    } else if (stop.isActive) {
      activePinnedJobs.push(stop);
    } else {
      candidateJobs.push(stop);
    }
  }

  // 2. Nearest-Neighbor Heuristic starting from origin (or from last pinned active job)
  let currentStart = origin;
  if (activePinnedJobs.length > 0) {
    const lastPinned = activePinnedJobs[activePinnedJobs.length - 1];
    currentStart = { lat: lastPinned.lat, lng: lastPinned.lng };
  }

  const unvisited = [...candidateJobs];
  const orderedCandidates: RouteStop[] = [];
  let currPos = currentStart;

  while (unvisited.length > 0) {
    let bestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateHaversineDistanceKm(
        currPos.lat,
        currPos.lng,
        unvisited[i].lat,
        unvisited[i].lng
      );
      if (d < minDistance) {
        minDistance = d;
        bestIndex = i;
      }
    }

    const nextStop = unvisited.splice(bestIndex, 1)[0];
    orderedCandidates.push(nextStop);
    currPos = { lat: nextStop.lat, lng: nextStop.lng };
  }

  // 3. 2-Opt Pairwise Exchange Refinement on the candidate order
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < orderedCandidates.length - 1; i++) {
      for (let k = i + 1; k < orderedCandidates.length; k++) {
        // Test 2-opt swap
        const prev1 = i === 0 ? currentStart : orderedCandidates[i - 1];
        const next1 = orderedCandidates[i];
        const prev2 = orderedCandidates[k];
        const next2 = k + 1 < orderedCandidates.length ? orderedCandidates[k + 1] : null;

        const currentDist =
          calculateHaversineDistanceKm(prev1.lat, prev1.lng, next1.lat, next1.lng) +
          (next2 ? calculateHaversineDistanceKm(prev2.lat, prev2.lng, next2.lat, next2.lng) : 0);

        const newDist =
          calculateHaversineDistanceKm(prev1.lat, prev1.lng, prev2.lat, prev2.lng) +
          (next2 ? calculateHaversineDistanceKm(next1.lat, next1.lng, next2.lat, next2.lng) : 0);

        if (newDist < currentDist - 0.05) {
          // Perform 2-opt reverse between i and k
          const segment = orderedCandidates.slice(i, k + 1).reverse();
          orderedCandidates.splice(i, segment.length, ...segment);
          improved = true;
        }
      }
    }
  }

  // 4. Combine pinned jobs + optimized candidate jobs + completed jobs
  const finalOrdered = [...activePinnedJobs, ...orderedCandidates, ...completedJobs];
  const populated = populateRouteLegMetrics(origin, finalOrdered, departureTime);
  const optimizedDistance = calculateTotalRouteDistanceKm(origin, populated);

  const distanceSaved = Math.max(0, parseFloat((originalDistance - optimizedDistance).toFixed(2)));
  const timeSavedMins = Math.round(distanceSaved * 2.5); // ~2.5 mins per km in city traffic
  const totalTravelMins = Math.round(optimizedDistance * 2.5);
  const percentageSaved = originalDistance > 0 ? Math.round((distanceSaved / originalDistance) * 100) : 0;

  return {
    optimizedStops: populated,
    originalTotalDistanceKm: originalDistance,
    optimizedTotalDistanceKm: optimizedDistance,
    distanceSavedKm: distanceSaved,
    timeSavedMins,
    totalTravelDurationMins: totalTravelMins,
    percentageSaved,
  };
}

/**
 * Builds an official multi-stop Google Maps Navigation URL.
 * Works seamlessly on Android, iOS, and Web browsers.
 */
export function buildGoogleMapsMultiStopUrl(
  origin: { lat: number; lng: number },
  stops: RouteStop[]
): string {
  if (stops.length === 0) {
    return `https://www.google.com/maps/@${origin.lat},${origin.lng},14z`;
  }

  // Filter pending/active stops only (don't navigate to completed ones)
  const activeStops = stops.filter((s) => !s.isCompleted);
  const stopsToNavigate = activeStops.length > 0 ? activeStops : stops;

  if (stopsToNavigate.length === 1) {
    const dest = stopsToNavigate[0];
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=two_wheeler`;
  }

  const finalStop = stopsToNavigate[stopsToNavigate.length - 1];
  const intermediateWaypoints = stopsToNavigate.slice(0, stopsToNavigate.length - 1);
  const waypointsParam = intermediateWaypoints.map((s) => `${s.lat},${s.lng}`).join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${finalStop.lat},${finalStop.lng}&waypoints=${encodeURIComponent(waypointsParam)}&travelmode=two_wheeler`;
}

import { calculateHaversineDistanceKm } from './serviceTrackingService';

export { calculateHaversineDistanceKm };

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface CalculatedRoute {
  waypoints: RoutePoint[];
  distanceKm: number;
  durationMinutes: number;
  durationSeconds: number;
  source: 'osrm' | 'urban_grid';
}

/**
 * Generate intermediate turn points along typical urban street grid
 * when external routing engine is unavailable or loading.
 */
export function generateUrbanGridWaypoints(
  origin: RoutePoint,
  destination: RoutePoint,
  segments: number = 4
): RoutePoint[] {
  const points: RoutePoint[] = [origin];
  const dLat = destination.lat - origin.lat;
  const dLng = destination.lng - origin.lng;

  // Midpoint 1: 30% along with a perpendicular road turn offset
  const p1Lat = origin.lat + dLat * 0.35;
  const p1Lng = origin.lng + dLng * 0.15;
  points.push({ lat: p1Lat, lng: p1Lng });

  // Midpoint 2: Main arterial street junction (70% lat, 60% lng)
  const p2Lat = origin.lat + dLat * 0.7;
  const p2Lng = origin.lng + dLng * 0.65;
  points.push({ lat: p2Lat, lng: p2Lng });

  // Midpoint 3: Approaching destination neighborhood
  const p3Lat = origin.lat + dLat * 0.9;
  const p3Lng = origin.lng + dLng * 0.88;
  points.push({ lat: p3Lat, lng: p3Lng });

  points.push(destination);
  return points;
}

/**
 * Fetches real driving road route between serviceman and customer.
 * Uses public OpenStreetMap OSRM routing engine with an intelligent
 * offline/fast urban grid fallback.
 */
export async function calculateLiveServiceRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  signal?: AbortSignal
): Promise<CalculatedRoute> {
  const straightLineDistance = calculateHaversineDistanceKm(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  // If serviceman is virtually at the customer's doorstep (< 30 meters)
  if (straightLineDistance < 0.03) {
    return {
      waypoints: [origin, destination],
      distanceKm: straightLineDistance,
      durationMinutes: 1,
      durationSeconds: 30,
      source: 'urban_grid',
    };
  }

  // Attempt OSRM driving route API with 3.2-second timeout
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);

    const mergedSignal = signal || controller.signal;

    const response = await fetch(url, { signal: mergedSignal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data?.code === 'Ok' && data.routes?.[0]) {
        const route = data.routes[0];
        const coordinates: [number, number][] = route.geometry?.coordinates || [];

        if (coordinates.length >= 2) {
          const waypoints: RoutePoint[] = coordinates.map(([lng, lat]) => ({
            lat,
            lng,
          }));

          const distanceKm = Number((route.distance / 1000).toFixed(2));
          const durationSeconds = Math.round(route.duration);
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

          return {
            waypoints,
            distanceKm,
            durationMinutes,
            durationSeconds,
            source: 'osrm',
          };
        }
      }
    }
  } catch {
    // Gracefully proceed to fallback urban route
  }

  // Fallback: Street network approximation (average 1.25x winding factor vs direct line)
  const estimatedRoadDistance = Number((straightLineDistance * 1.25).toFixed(2));
  // Average urban bike/van velocity in Indian cities ~ 22 km/h + 2 min buffer
  const estimatedDurationMinutes = Math.max(
    1,
    Math.round((estimatedRoadDistance / 22) * 60 + 2)
  );

  return {
    waypoints: generateUrbanGridWaypoints(origin, destination),
    distanceKm: estimatedRoadDistance,
    durationMinutes: estimatedDurationMinutes,
    durationSeconds: estimatedDurationMinutes * 60,
    source: 'urban_grid',
  };
}

/**
 * Formats distance with appropriate units (meters or kilometers)
 */
export function formatRouteDistance(km: number | null | undefined): string {
  if (km === null || km === undefined || isNaN(km)) return 'Calculating...';
  if (km < 0.05) return 'At location';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Formats ETA minutes with projected arrival clock time
 */
export function formatRouteEtaWithTime(minutes: number | null | undefined): {
  primary: string;
  arrivalClock: string;
} {
  if (!minutes || minutes <= 0) {
    return {
      primary: 'Arrived',
      arrivalClock: 'Now',
    };
  }

  const arrivalDate = new Date(Date.now() + minutes * 60 * 1000);
  const timeString = arrivalDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    primary: `~${minutes} min${minutes > 1 ? 's' : ''}`,
    arrivalClock: `Arriving by ${timeString}`,
  };
}

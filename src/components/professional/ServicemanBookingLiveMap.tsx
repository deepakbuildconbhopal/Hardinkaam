import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Clock,
  ExternalLink,
  Activity,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { Booking, ServiceManLocationData, TrackingLocationPoint } from '../../types';
import {
  subscribeToServiceTracking,
  updateServicemanTrackingLocation,
} from '../../services/serviceTrackingLiveFoundation';
import {
  resolveAddressCoordinates,
  calculateHaversineDistanceKm,
} from '../../services/serviceTrackingService';
import {
  formatRouteDistance,
  formatRouteEtaWithTime,
  calculateLiveServiceRoute,
} from '../../services/serviceRouteService';
import {
  useNetworkStatus,
  useGpsStatus,
  LIVE_TRACKING_MESSAGES,
  getLiveTrackingErrorInfo,
} from '../../services/liveTrackingQuality';
import { LiveTrackingMap } from '../common/LiveTrackingMap';

interface Props {
  booking: Booking;
  servicemanId?: string;
  className?: string;
}

/**
 * Dedicated Live Map for the Serviceman's booking view.
 * Displays:
 *  - Serviceman's current location (updates live via GPS & Firestore)
 *  - Customer location (from Firestore or resolved address)
 *  - Destination (service job address coordinates)
 *  - Real-time road route polyline
 *  - Remaining distance
 *  - Dynamic ETA with arrival clock time
 * Only renders for the serviceman's assigned active booking.
 */
export const ServicemanBookingLiveMap: React.FC<Props> = ({
  booking,
  servicemanId,
  className = '',
}) => {
  // Only display for assigned active bookings (assigned, accepted, on_the_way, arriving, arrived, in_progress, work_started)
  const activeStatuses = [
    'assigned',
    'accepted',
    'on_the_way',
    'arriving',
    'arrived',
    'otp_pending',
    'in_progress',
    'work_started',
  ];

  const isActive = useMemo(() => {
    const s = (booking.status || '').toLowerCase();
    const t = (booking.trackingStatus || '').toLowerCase();
    return activeStatuses.includes(s) || activeStatuses.includes(t);
  }, [booking.status, booking.trackingStatus]);

  if (!isActive) {
    return null;
  }

  // 1. Destination coordinates
  const destinationCoords = useMemo(() => {
    return resolveAddressCoordinates(booking.address, booking.city);
  }, [booking.address, booking.city]);

  // 2. Serviceman & Customer location states initialized from booking
  const [proLocation, setProLocation] = useState<ServiceManLocationData | undefined>(() => {
    if (booking.serviceManLocation?.latitude && booking.serviceManLocation?.longitude) {
      return booking.serviceManLocation;
    }
    return undefined;
  });

  const [customerLocation, setCustomerLocation] = useState<TrackingLocationPoint | null>(null);
  const [liveDestination, setLiveDestination] = useState<{ lat: number; lng: number }>(destinationCoords);
  const [liveStatus, setLiveStatus] = useState<string>(
    booking.trackingStatus || booking.status || 'ACCEPTED'
  );
  const [etaSeconds, setEtaSeconds] = useState<number | null>(
    typeof booking.etaMinutes === 'number' ? booking.etaMinutes * 60 : null
  );
  const [isGpsAvailable, setIsGpsAvailable] = useState<boolean>(true);
  const [lastGpsSync, setLastGpsSync] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState<boolean>(false);
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(true);

  const { gpsState, gpsErrorMessage, setGpsErrorFromCode, resetGpsState } = useGpsStatus();

  // Automatic recovery when internet connection returns
  const handleReconnect = () => {
    if (booking.id) {
      subscribeToServiceTracking(booking.id, (trackingDoc) => {
        if (trackingDoc?.customerLocation) {
          setCustomerLocation(trackingDoc.customerLocation);
        }
      });
      handleManualRefresh();
    }
  };

  const { isOnline, wasOffline } = useNetworkStatus(handleReconnect);

  // 3. Real-time Firestore sync with `serviceTracking/{booking.id}`
  useEffect(() => {
    if (!booking.id) return;

    const unsubscribe = subscribeToServiceTracking(booking.id, (trackingDoc) => {
      if (trackingDoc) {
        // Serviceman location
        if (trackingDoc.servicemanLocation?.latitude && trackingDoc.servicemanLocation?.longitude) {
          setProLocation({
            latitude: trackingDoc.servicemanLocation.latitude,
            longitude: trackingDoc.servicemanLocation.longitude,
            updatedAt: trackingDoc.servicemanLocation.timestamp || new Date().toISOString(),
          });
          setLastGpsSync(trackingDoc.servicemanLocation.timestamp || new Date().toISOString());
        }

        // Customer location
        if (trackingDoc.customerLocation?.latitude && trackingDoc.customerLocation?.longitude) {
          setCustomerLocation(trackingDoc.customerLocation);
        }

        // Destination coords
        if (trackingDoc.destination?.latitude && trackingDoc.destination?.longitude) {
          setLiveDestination({
            lat: trackingDoc.destination.latitude,
            lng: trackingDoc.destination.longitude,
          });
        }

        // Status & ETA
        if (trackingDoc.status) {
          setLiveStatus(trackingDoc.status);
        }
        if (typeof trackingDoc.etaSeconds === 'number') {
          setEtaSeconds(trackingDoc.etaSeconds);
        }
      }
    });

    return () => unsubscribe();
  }, [booking.id]);

  // 4. Serviceman Device GPS Watcher to update live location on device coordinate change
  const watchIdRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  const syncServicemanGps = (lat: number, lng: number, speed?: number | null, heading?: number | null) => {
    const now = Date.now();
    const iso = new Date().toISOString();

    setProLocation({
      latitude: lat,
      longitude: lng,
      speed: speed ?? undefined,
      heading: heading ?? undefined,
      updatedAt: iso,
    });
    setLastGpsSync(iso);

    // Spark Quota requirement: Throttle Firestore write to maximum once every 30 seconds
    if (now - lastSyncTimeRef.current >= 30000 && booking.id) {
      lastSyncTimeRef.current = now;
      updateServicemanTrackingLocation(booking.id, {
        latitude: lat,
        longitude: lng,
      }).catch((err) => {
        console.warn('[ServicemanLiveMap] Firestore location sync note:', err);
      });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setIsGpsAvailable(false);
      return;
    }

    // Fetch initial instant position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGpsAvailable(true);
        resetGpsState();
        syncServicemanGps(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed,
          pos.coords.heading
        );
      },
      (err) => {
        console.warn('[ServicemanLiveMap] Geolocation initial query note:', err.message);
        setGpsErrorFromCode(err.code, err.message);
        setIsGpsAvailable(false);
        // Do not generate fake coordinates or fake ETA. If GPS is unavailable, rely only on real recorded location or unavailable status.
        if (booking.serviceManLocation?.latitude && booking.serviceManLocation?.longitude) {
          setProLocation(booking.serviceManLocation);
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );

    // Start watching continuous location changes
    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          setIsGpsAvailable(true);
          resetGpsState();
          syncServicemanGps(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.speed,
            pos.coords.heading
          );
        },
        (err) => {
          console.warn('[ServicemanLiveMap] watchPosition note:', err.message);
          setGpsErrorFromCode(err.code, err.message);
        },
        { enableHighAccuracy: true, maximumAge: 8000, timeout: 15000 }
      );
      watchIdRef.current = id;
    } catch {
      // Ignore watchPosition unsupported errors
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [booking.id, liveDestination.lat, liveDestination.lng]);

  // 5. Manual GPS refresh trigger
  const handleManualRefresh = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;
    setIsManualRefreshing(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        syncServicemanGps(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.speed,
          pos.coords.heading
        );
        setIsManualRefreshing(false);
      },
      () => {
        setIsManualRefreshing(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // 6. Target Customer Coordinates (prefers actual customer coordinates, fallbacks to booking address)
  const targetPoint = useMemo<{ lat: number; lng: number }>(() => {
    if (customerLocation?.latitude && customerLocation?.longitude) {
      return { lat: customerLocation.latitude, lng: customerLocation.longitude };
    }
    return { lat: liveDestination.lat, lng: liveDestination.lng };
  }, [customerLocation, liveDestination]);

  // 7. Calculate Road Distance & ETA
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);
  const [liveDurationMins, setLiveDurationMins] = useState<number | null>(null);

  useEffect(() => {
    if (!proLocation?.latitude || !proLocation?.longitude) {
      setLiveDistanceKm(null);
      setLiveDurationMins(null);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    calculateLiveServiceRoute(
      { lat: proLocation.latitude, lng: proLocation.longitude },
      targetPoint,
      controller.signal
    )
      .then((res) => {
        if (!isMounted) return;
        setLiveDistanceKm(res.distanceKm);
        setLiveDurationMins(res.durationMinutes);
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback straight-line
        const straight = calculateHaversineDistanceKm(
          proLocation.latitude,
          proLocation.longitude,
          targetPoint.lat,
          targetPoint.lng
        );
        setLiveDistanceKm(Number((straight * 1.25).toFixed(2)));
        setLiveDurationMins(Math.max(1, Math.round((straight * 1.25 / 22) * 60 + 2)));
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [proLocation?.latitude, proLocation?.longitude, targetPoint.lat, targetPoint.lng]);

  // Formatted distance display
  const distanceFormatted = useMemo(() => {
    return formatRouteDistance(liveDistanceKm);
  }, [liveDistanceKm]);

  // Effective ETA Minutes & Clock Time
  const effectiveEtaMinutes = useMemo(() => {
    if (typeof booking.etaMinutes === 'number' && booking.etaMinutes > 0) {
      return booking.etaMinutes;
    }
    if (typeof etaSeconds === 'number' && etaSeconds > 0) {
      return Math.ceil(etaSeconds / 60);
    }
    return liveDurationMins;
  }, [booking.etaMinutes, etaSeconds, liveDurationMins]);

  const etaInfo = useMemo(() => {
    return formatRouteEtaWithTime(effectiveEtaMinutes);
  }, [effectiveEtaMinutes]);

  // External turn-by-turn navigation in Google Maps
  const handleOpenGoogleMapsTurnByTurn = () => {
    const dest = `${targetPoint.lat},${targetPoint.lng}`;
    if (proLocation?.latitude && proLocation?.longitude) {
      const origin = `${proLocation.latitude},${proLocation.longitude}`;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`,
        '_blank'
      );
    } else {
      const query = encodeURIComponent(`${booking.address}, ${booking.city || 'Bhopal'}`);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    }
  };

  return (
    <div
      id={`serviceman-live-map-card-${booking.id}`}
      className={`rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-xs transition-all ${className}`}
    >
      {/* Header bar: Live Status, Distance, ETA & Controls */}
      <div className="p-3 sm:p-4 bg-stone-900 text-white flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black shadow-xs">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide text-white uppercase">
                Serviceman Live Navigation
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[11px] text-stone-300 flex items-center gap-1.5 mt-0.5">
              <span>Customer: {booking.customerName}</span>
              <span>•</span>
              <span className="text-orange-400 font-semibold">{booking.serviceName}</span>
            </p>
          </div>
        </div>

        {/* Metrics Pills: ETA & Distance */}
        <div className="flex items-center gap-2 flex-wrap">
          {effectiveEtaMinutes !== null && (
            <div
              className="px-2.5 py-1 rounded-xl bg-orange-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
              title={etaInfo.arrivalClock}
            >
              <Clock className="w-3.5 h-3.5 text-white" />
              <span>ETA {etaInfo.primary}</span>
              <span className="hidden md:inline text-orange-200 font-normal">
                ({etaInfo.arrivalClock})
              </span>
            </div>
          )}

          {liveDistanceKm !== null && (
            <div className="px-2.5 py-1 rounded-xl bg-stone-800 text-stone-100 border border-stone-700 text-xs font-bold flex items-center gap-1 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span>{distanceFormatted} to Customer</span>
            </div>
          )}

          {/* Turn-by-Turn External Maps button */}
          <button
            type="button"
            onClick={handleOpenGoogleMapsTurnByTurn}
            className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-white border border-stone-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Open Turn-by-Turn GPS Navigation"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Turn-by-Turn</span>
          </button>

          {/* Refresh GPS Button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
            title="Refresh GPS Coordinates"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isManualRefreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsMapExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
            title={isMapExpanded ? 'Collapse Map' : 'Expand Map'}
          >
            {isMapExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Live Map Body */}
      {isMapExpanded && (
        <div className="p-3 sm:p-4 bg-stone-50 space-y-3">
          {/* Real-time Map Canvas */}
          <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
            <LiveTrackingMap
              proLocation={proLocation}
              customerLocation={customerLocation}
              destinationCoords={liveDestination}
              customerAddress={booking.address}
              customerCity={booking.city}
              proName={booking.serviceManName || 'You (Serviceman)'}
              trackingStatus={liveStatus}
              bookingStatus={booking.status}
              etaMinutes={effectiveEtaMinutes}
              etaSeconds={etaSeconds}
              height="320px"
              interactive={true}
              lastUpdatedAt={lastGpsSync || proLocation?.updatedAt}
              isOffline={!isOnline}
              wasOffline={wasOffline}
              isGpsUnavailable={!isGpsAvailable || gpsState === 'off' || gpsState === 'denied'}
              gpsErrorMessage={gpsErrorMessage}
              onRetryGps={handleManualRefresh}
            />
          </div>

          {/* Map Info Footer Bar: GPS sync timestamp & destination address */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500 px-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-stone-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
                <span>Your Location (GPS)</span>
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-1 text-stone-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span>Customer ({booking.customerName})</span>
              </span>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-1 text-stone-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span>Job Destination</span>
              </span>
            </div>

            <div className="flex items-center gap-1 text-stone-400">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span>
                {lastGpsSync
                  ? `GPS synced: ${new Date(lastGpsSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                  : 'Broadcasting live GPS to customer'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

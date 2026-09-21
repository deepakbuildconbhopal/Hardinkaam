import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  Plus,
  Minus,
  Crosshair,
  Maximize2,
  Minimize2,
  AlertTriangle,
  User,
  ExternalLink,
  Clock,
  Activity,
  Home,
  CheckCircle2,
  Route,
  Zap,
} from 'lucide-react';
import { ServiceManLocationData } from '../../types';
import { calculateHaversineDistanceKm } from '../../services/serviceTrackingService';
import {
  calculateLiveServiceRoute,
  formatRouteDistance,
  formatRouteEtaWithTime,
  RoutePoint,
} from '../../services/serviceRouteService';
import { formatLastUpdatedAgo, isTrackingTerminal, LIVE_TRACKING_MESSAGES } from '../../services/liveTrackingQuality';
import { WifiOff, ShieldAlert, RefreshCw, XCircle } from 'lucide-react';

export interface LiveTrackingMapProps {
  proLocation?: ServiceManLocationData;
  customerLocation?: { latitude: number; longitude: number; timestamp?: string } | null;
  destinationCoords: { lat: number; lng: number };
  customerAddress: string;
  customerCity?: string;
  proName?: string;
  proPhoto?: string;
  trackingStatus?: string;
  bookingStatus?: string;
  etaMinutes?: number | null;
  etaSeconds?: number | null;
  height?: string;
  interactive?: boolean;
  lastUpdatedAt?: string | null;
  isGpsUnavailable?: boolean;
  gpsErrorMessage?: string | null;
  onRetryGps?: () => void;
  isOffline?: boolean;
  wasOffline?: boolean;
  isUnauthorized?: boolean;
  isTrackingStopped?: boolean;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  proLocation,
  customerLocation,
  destinationCoords,
  customerAddress,
  customerCity = 'Bhopal',
  proName = 'Service Professional',
  proPhoto,
  trackingStatus = 'on_the_way',
  bookingStatus,
  etaMinutes,
  etaSeconds,
  height = '320px',
  interactive = true,
  lastUpdatedAt,
  isGpsUnavailable = false,
  gpsErrorMessage,
  onRetryGps,
  isOffline = false,
  wasOffline = false,
  isUnauthorized = false,
  isTrackingStopped = false,
}) => {
  const [zoom, setZoom] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Target Customer coordinates (prefers actual customer device location, fallback to destination address)
  const targetCoords = useMemo<RoutePoint>(() => {
    if (customerLocation?.latitude && customerLocation?.longitude) {
      return { lat: customerLocation.latitude, lng: customerLocation.longitude };
    }
    return { lat: destinationCoords.lat, lng: destinationCoords.lng };
  }, [customerLocation, destinationCoords]);

  // Route calculation state
  const [routeWaypoints, setRouteWaypoints] = useState<RoutePoint[]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [routeDurationMinutes, setRouteDurationMinutes] = useState<number | null>(null);
  const [isRouteUpdating, setIsRouteUpdating] = useState<boolean>(false);
  const [routeUpdatedFlash, setRouteUpdatedFlash] = useState<boolean>(false);

  // Visual pulse state when new GPS coordinates arrive
  const [gpsPulse, setGpsPulse] = useState<boolean>(false);
  const prevGpsRef = useRef<{ lat?: number; lng?: number; time?: string }>({});

  // 1. Detect serviceman location change & trigger GPS pulse
  useEffect(() => {
    if (proLocation?.latitude && proLocation?.longitude) {
      const prev = prevGpsRef.current;
      const isNew =
        prev.lat !== proLocation.latitude ||
        prev.lng !== proLocation.longitude ||
        prev.time !== proLocation.updatedAt;

      if (isNew) {
        prevGpsRef.current = {
          lat: proLocation.latitude,
          lng: proLocation.longitude,
          time: proLocation.updatedAt,
        };
        setGpsPulse(true);
        const timer = setTimeout(() => setGpsPulse(false), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [proLocation?.latitude, proLocation?.longitude, proLocation?.updatedAt]);

  // 2. Recalculate Route, Distance & ETA whenever Serviceman location or Customer changes
  useEffect(() => {
    if (!proLocation?.latitude || !proLocation?.longitude) {
      setRouteWaypoints([]);
      setRouteDistanceKm(null);
      setRouteDurationMinutes(null);
      return;
    }

    let isMounted = true;
    const abortController = new AbortController();

    setIsRouteUpdating(true);
    calculateLiveServiceRoute(
      { lat: proLocation.latitude, lng: proLocation.longitude },
      targetCoords,
      abortController.signal
    )
      .then((res) => {
        if (!isMounted) return;
        setRouteWaypoints(res.waypoints);
        setRouteDistanceKm(res.distanceKm);
        setRouteDurationMinutes(res.durationMinutes);
        setIsRouteUpdating(false);
        setRouteUpdatedFlash(true);
        const t = setTimeout(() => setRouteUpdatedFlash(false), 2500);
        return () => clearTimeout(t);
      })
      .catch(() => {
        if (isMounted) setIsRouteUpdating(false);
      });

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [proLocation?.latitude, proLocation?.longitude, targetCoords.lat, targetCoords.lng]);

  // Fallback Haversine straight-line distance
  const straightDistanceKm = useMemo(() => {
    if (proLocation?.latitude && proLocation?.longitude) {
      return calculateHaversineDistanceKm(
        proLocation.latitude,
        proLocation.longitude,
        targetCoords.lat,
        targetCoords.lng
      );
    }
    return null;
  }, [proLocation, targetCoords]);

  // Phase 7: Distance check comparing serviceman GPS location with customer GPS location
  const directGpsDistanceKm = useMemo(() => {
    if (
      proLocation?.latitude &&
      proLocation?.longitude &&
      customerLocation?.latitude &&
      customerLocation?.longitude
    ) {
      return calculateHaversineDistanceKm(
        proLocation.latitude,
        proLocation.longitude,
        customerLocation.latitude,
        customerLocation.longitude
      );
    }
    return null;
  }, [proLocation, customerLocation]);

  // Effective road distance (prefers driving route distance, fallback to straight line)
  const effectiveDistanceKm = useMemo(() => {
    if (routeDistanceKm !== null && routeDistanceKm !== undefined) {
      return routeDistanceKm;
    }
    return straightDistanceKm;
  }, [routeDistanceKm, straightDistanceKm]);

  // Formatted distance string
  const formattedDistance = useMemo(() => {
    return formatRouteDistance(effectiveDistanceKm);
  }, [effectiveDistanceKm]);

  // Derived effective ETA in minutes (prefers server live eta, then route duration, then speed-calibrated)
  const effectiveEtaMinutes = useMemo(() => {
    if (typeof etaMinutes === 'number' && etaMinutes > 0) return etaMinutes;
    if (typeof etaSeconds === 'number' && etaSeconds > 0) return Math.ceil(etaSeconds / 60);
    if (typeof routeDurationMinutes === 'number' && routeDurationMinutes > 0) return routeDurationMinutes;
    if (effectiveDistanceKm !== null && effectiveDistanceKm > 0) {
      // Average 22 km/h urban speed + 2 min buffer
      return Math.max(1, Math.round((effectiveDistanceKm / 22) * 60 + 2));
    }
    return null;
  }, [etaMinutes, etaSeconds, routeDurationMinutes, effectiveDistanceKm]);

  // Formatted ETA and Clock Time
  const etaInfo = useMemo(() => {
    return formatRouteEtaWithTime(effectiveEtaMinutes);
  }, [effectiveEtaMinutes]);

  // Compute map center encompassing available points
  const center = useMemo(() => {
    const points: { lat: number; lng: number }[] = [
      { lat: destinationCoords.lat, lng: destinationCoords.lng },
    ];
    if (proLocation?.latitude && proLocation?.longitude) {
      points.push({ lat: proLocation.latitude, lng: proLocation.longitude });
    }
    if (customerLocation?.latitude && customerLocation?.longitude) {
      points.push({ lat: customerLocation.latitude, lng: customerLocation.longitude });
    }

    const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
    const avgLng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;

    return { lat: avgLat, lng: avgLng };
  }, [proLocation, customerLocation, destinationCoords]);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(center);

  useEffect(() => {
    setMapCenter(center);
  }, [center]);

  // Convert lat/lng to tile numbers for OpenStreetMap
  const latLngToTile = (lat: number, lng: number, z: number) => {
    const latRad = (lat * Math.PI) / 180;
    const n = Math.pow(2, z);
    const x = Math.floor(((lng + 180) / 360) * n);
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );
    return { x, y };
  };

  // Convert lat/lng to relative pixel offset within map container (Web Mercator projection)
  const getPixelPosition = (targetLat: number, targetLng: number) => {
    const scale = Math.pow(2, zoom) * 256;
    const worldCoordX = ((targetLng + 180) / 360) * scale;
    const latRad = (targetLat * Math.PI) / 180;
    const worldCoordY =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale;

    const centerCoordX = ((mapCenter.lng + 180) / 360) * scale;
    const centerLatRad = (mapCenter.lat * Math.PI) / 180;
    const centerCoordY =
      ((1 - Math.log(Math.tan(centerLatRad) + 1 / Math.cos(centerLatRad)) / Math.PI) / 2) * scale;

    const offsetX = worldCoordX - centerCoordX;
    const offsetY = worldCoordY - centerCoordY;

    return { x: offsetX, y: offsetY };
  };

  const proPixel = proLocation && proLocation.latitude && proLocation.longitude
    ? getPixelPosition(proLocation.latitude, proLocation.longitude)
    : null;
  const rawDestPixel = getPixelPosition(destinationCoords.lat, destinationCoords.lng);
  const rawCustomerPixel = customerLocation && customerLocation.latitude && customerLocation.longitude
    ? getPixelPosition(customerLocation.latitude, customerLocation.longitude)
    : null;

  // Handle potential overlap between customer and destination when at same address
  const areCustomerAndDestOverlapping = useMemo(() => {
    if (!rawCustomerPixel) return false;
    const dx = Math.abs(rawCustomerPixel.x - rawDestPixel.x);
    const dy = Math.abs(rawCustomerPixel.y - rawDestPixel.y);
    return dx < 30 && dy < 30;
  }, [rawCustomerPixel, rawDestPixel]);

  const destPixel = areCustomerAndDestOverlapping
    ? { x: rawDestPixel.x + 18, y: rawDestPixel.y }
    : rawDestPixel;

  const customerPixel = rawCustomerPixel
    ? areCustomerAndDestOverlapping
      ? { x: rawCustomerPixel.x - 18, y: rawCustomerPixel.y }
      : rawCustomerPixel
    : null;

  // Primary customer target pixel for route
  const targetPixel = customerPixel || destPixel;

  // Build SVG path for route from serviceman to customer
  const routeSvgPath = useMemo(() => {
    if (!proPixel || !targetPixel) return null;

    if (routeWaypoints && routeWaypoints.length >= 2) {
      return routeWaypoints.reduce((acc, pt, idx) => {
        const px = getPixelPosition(pt.lat, pt.lng);
        const cmd = idx === 0 ? 'M' : 'L';
        return `${acc} ${cmd} calc(50% + ${px.x}px) calc(50% + ${px.y}px)`;
      }, '');
    }

    // Direct fallback vector line
    return `M calc(50% + ${proPixel.x}px) calc(50% + ${proPixel.y}px) L calc(50% + ${targetPixel.x}px) calc(50% + ${targetPixel.y}px)`;
  }, [routeWaypoints, proPixel, targetPixel, mapCenter, zoom]);

  // Generate 3x3 tile grid surrounding center
  const centerTile = latLngToTile(mapCenter.lat, mapCenter.lng, zoom);
  const tiles = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({
        x: centerTile.x + dx,
        y: centerTile.y + dy,
        z: zoom,
        key: `${zoom}-${centerTile.x + dx}-${centerTile.y + dy}`,
      });
    }
  }

  const handleCenterOnPro = () => {
    if (proLocation?.latitude && proLocation?.longitude) {
      setMapCenter({ lat: proLocation.latitude, lng: proLocation.longitude });
    }
  };

  const handleCenterOnCustomer = () => {
    if (customerLocation?.latitude && customerLocation?.longitude) {
      setMapCenter({ lat: customerLocation.latitude, lng: customerLocation.longitude });
    } else {
      setMapCenter(destinationCoords);
    }
  };

  const handleCenterOnDest = () => {
    setMapCenter(destinationCoords);
  };

  const handleFitBounds = () => {
    setMapCenter(center);
    setZoom(14);
  };

  // Opens directions in Google Maps (web safe without API keys)
  const openInGoogleMaps = () => {
    const dest = `${targetCoords.lat},${targetCoords.lng}`;
    if (proLocation?.latitude && proLocation?.longitude) {
      const origin = `${proLocation.latitude},${proLocation.longitude}`;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`,
        '_blank'
      );
    } else {
      const query = encodeURIComponent(`${customerAddress}, ${customerCity}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  const isTerminal = isTrackingStopped || isTrackingTerminal(bookingStatus, trackingStatus);

  const currentStatusDisplay = useMemo(() => {
    if (isTerminal) {
      const isCancelled = (bookingStatus || trackingStatus || '').toLowerCase().includes('cancel');
      return {
        label: isCancelled ? 'Tracking Ended (Service Cancelled)' : 'Tracking Ended (Service Completed)',
        color: isCancelled ? 'text-stone-600' : 'text-emerald-700',
        bg: isCancelled ? 'bg-stone-200 text-stone-800' : 'bg-emerald-100 text-emerald-800',
      };
    }
    const s = (trackingStatus || bookingStatus || '').toLowerCase();
    switch (s) {
      case 'on_the_way':
        return { label: 'On The Way (रास्ते में है)', color: 'text-orange-600', bg: 'bg-orange-100 text-orange-800' };
      case 'arrived':
        return { label: 'Arrived at Location (पहुँच चुके हैं)', color: 'text-blue-600', bg: 'bg-blue-100 text-blue-800' };
      case 'work_started':
      case 'in_progress':
        return { label: 'Service In Progress (काम चालू है)', color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-800' };
      case 'assigned':
        return { label: 'Serviceman Assigned (असाइन किया गया)', color: 'text-amber-600', bg: 'bg-amber-100 text-amber-800' };
      case 'completed':
        return { label: 'Service Completed (पूर्ण)', color: 'text-emerald-700', bg: 'bg-emerald-100 text-emerald-800' };
      default:
        return { label: 'Active Tracking', color: 'text-stone-700', bg: 'bg-stone-100 text-stone-800' };
    }
  }, [trackingStatus, bookingStatus, isTerminal]);

  if (isUnauthorized) {
    return (
      <div
        className="w-full rounded-2xl border border-stone-200 bg-stone-50 flex flex-col items-center justify-center p-6 text-center shadow-inner"
        style={{ height }}
      >
        <div className="w-12 h-12 rounded-2xl bg-stone-200 flex items-center justify-center text-stone-600 mb-3 shadow-xs">
          <ShieldAlert className="w-6 h-6 text-stone-600" />
        </div>
        <h4 className="text-sm font-extrabold text-stone-900">Restricted Tracking Access</h4>
        <p className="text-xs text-stone-500 mt-1 max-w-sm">
          Live location coordinates are only visible to the assigned customer, technician, or authorized administration.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      className={`relative rounded-2xl overflow-hidden border border-stone-200 shadow-inner select-none transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'w-full'
      }`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Map Canvas / Tiles Background */}
      <div className="absolute inset-0 bg-[#e5e3df] overflow-hidden flex items-center justify-center touch-pan-x touch-pan-y">
        {/* Render OSM raster tiles */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-90 filter contrast-[0.98] brightness-[0.98]">
          {tiles.map((tile) => (
            <img
              key={tile.key}
              src={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
              alt="map tile"
              className="w-full h-full object-cover pointer-events-none select-none"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLElement).style.opacity = '0';
              }}
            />
          ))}
        </div>

        {/* Vector street grid overlay */}
        <div className="absolute inset-0 bg-blue-900/5 mix-blend-multiply pointer-events-none" />

        {/* Dynamic Route SVG Layer with real road geometry & flow animation */}
        {proPixel && routeSvgPath && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <style>
              {`
                @keyframes routeDashMove {
                  from { stroke-dashoffset: 28; }
                  to { stroke-dashoffset: 0; }
                }
                .animate-route-flow {
                  animation: routeDashMove 1.2s linear infinite;
                }
              `}
            </style>
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>

            {/* Road route casing / shadow */}
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#0f172a"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.22"
            />

            {/* Main vibrant navigation road route */}
            <path
              d={routeSvgPath}
              fill="none"
              stroke="url(#routeGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.95"
              className={routeUpdatedFlash ? 'filter brightness-125 drop-shadow-md' : ''}
            />

            {/* Animated directional forward flow dashes */}
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeDasharray="8 8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-route-flow"
              strokeOpacity="0.9"
            />

            {/* If Customer and Destination are distinct, dashed connector line */}
            {customerPixel && !areCustomerAndDestOverlapping && (
              <line
                x1={`calc(50% + ${customerPixel.x}px)`}
                y1={`calc(50% + ${customerPixel.y}px)`}
                x2={`calc(50% + ${destPixel.x}px)`}
                y2={`calc(50% + ${destPixel.y}px)`}
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                strokeOpacity="0.8"
              />
            )}
          </svg>
        )}

        {/* 1. DESTINATION MARKER */}
        <div
          id="tracking-map-destination-marker"
          className="absolute transform -translate-x-1/2 -translate-y-full z-20 pointer-events-auto cursor-pointer group transition-transform hover:scale-110"
          style={{
            left: `calc(50% + ${destPixel.x}px)`,
            top: `calc(50% + ${destPixel.y}px)`,
          }}
          title={`Destination: ${customerAddress}`}
        >
          <div className="flex flex-col items-center">
            <div className="mb-1 px-2 py-0.5 rounded-lg bg-blue-950/90 backdrop-blur-xs text-white text-[10px] font-bold whitespace-nowrap shadow-md flex items-center gap-1 opacity-95 group-hover:opacity-100 transition-opacity border border-blue-400/30">
              <MapPin className="w-3 h-3 text-blue-300" />
              <span>गंतव्य (Destination)</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-400/40">
              <MapPin className="w-4 h-4 fill-white" />
            </div>
            <div className="w-1.5 h-1.5 bg-blue-600 rotate-45 -mt-1" />
          </div>
        </div>

        {/* 2. CUSTOMER LOCATION MARKER */}
        {customerPixel && (
          <div
            id="tracking-map-customer-marker"
            className="absolute transform -translate-x-1/2 -translate-y-full z-25 pointer-events-auto cursor-pointer group transition-transform hover:scale-110"
            style={{
              left: `calc(50% + ${customerPixel.x}px)`,
              top: `calc(50% + ${customerPixel.y}px)`,
            }}
            title="Customer Current Location"
          >
            <div className="flex flex-col items-center">
              <div className="mb-1 px-2 py-0.5 rounded-lg bg-emerald-950/90 backdrop-blur-xs text-white text-[10px] font-bold whitespace-nowrap shadow-md flex items-center gap-1 opacity-95 group-hover:opacity-100 transition-opacity border border-emerald-400/30">
                <User className="w-3 h-3 text-emerald-300" />
                <span>ग्राहक (Customer)</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-emerald-400/50">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="w-1.5 h-1.5 bg-emerald-600 rotate-45 -mt-1" />
            </div>
          </div>
        )}

        {/* 3. SERVICEMAN LIVE MARKER (smooth position refresh) */}
        {proPixel && (
          <div
            id="tracking-map-serviceman-marker"
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto cursor-pointer group transition-all duration-700 ease-out"
            style={{
              left: `calc(50% + ${proPixel.x}px)`,
              top: `calc(50% + ${proPixel.y}px)`,
            }}
          >
            <div className="relative flex items-center justify-center">
              {/* Radar pulse ripples - only active when service is in progress */}
              {!isTerminal && (
                <>
                  <span className="animate-ping absolute inline-flex h-14 w-14 rounded-full bg-orange-500 opacity-40" />
                  {(gpsPulse || routeUpdatedFlash) && (
                    <span className="animate-ping absolute inline-flex h-20 w-20 rounded-full bg-amber-400 opacity-60" />
                  )}
                  <span className="absolute inline-flex h-10 w-10 rounded-full bg-orange-400 opacity-20" />
                </>
              )}

              {/* Serviceman Avatar Badge */}
              <div className="relative w-9 h-9 rounded-full bg-orange-600 text-white border-2 border-white shadow-xl flex items-center justify-center overflow-hidden ring-2 ring-orange-500/50">
                {proPhoto ? (
                  <img
                    src={proPhoto}
                    alt={proName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Heading arrow indicator if available */}
              {proLocation?.heading !== undefined && !isTerminal && (
                <div
                  className="absolute -top-1 w-3 h-3 text-orange-600 transform"
                  style={{ transform: `rotate(${proLocation.heading}deg)` }}
                >
                  <Navigation className="w-3 h-3 fill-orange-600" />
                </div>
              )}

              {/* Serviceman Tag */}
              <div className="absolute top-10 whitespace-nowrap bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-orange-200 text-orange-950 text-[10px] font-black shadow-md flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isTerminal
                      ? 'bg-stone-400'
                      : gpsPulse || routeUpdatedFlash
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-orange-500 animate-pulse'
                  }`}
                />
                <span>{proName} (तकनीशियन)</span>
                {proLocation?.speed && !isTerminal ? <span>• {proLocation.speed} km/h</span> : null}
              </div>
            </div>
          </div>
        )}

        {/* Fallback Banner if Pro Location is connecting or not available yet */}
        {!proLocation && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto z-20 bg-white/95 backdrop-blur-xs border border-amber-200 rounded-2xl p-3 shadow-md max-w-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              {isTerminal ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <div className="relative flex-shrink-0 mt-0.5">
                  <Activity className="w-4 h-4 text-orange-600 animate-spin" />
                  <span className="animate-ping absolute -inset-0.5 rounded-full bg-orange-400 opacity-40" />
                </div>
              )}
              <div>
                <h5 className="text-xs font-bold text-stone-900">
                  {isTerminal
                    ? 'सेवा पूर्ण (Service Closed)'
                    : 'GPS कनेक्ट हो रहा है (Connecting to GPS...)'}
                </h5>
                <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                  {isTerminal
                    ? 'बुकिंग पूर्ण हो चुकी है। लाइव लोकेशन ट्रैकिंग बंद कर दी गई है।'
                    : 'तकनीशियन का GPS सिग्नल प्राप्त होते ही लाइव रूट स्वतः दिखाई देगा।'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Header: Booking Status, ETA, Distance & Live Route Updates */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex items-start justify-between pointer-events-none z-30 gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 max-w-[calc(100%-84px)] sm:max-w-[calc(100%-140px)]">
          {/* Booking Status Badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1.5 backdrop-blur-xs border border-white/40 ${currentStatusDisplay.bg}`}
          >
            <Activity className="w-3 h-3" />
            <span>{currentStatusDisplay.label}</span>
          </div>

          {/* Internet Disconnect / Reconnection Indicator */}
          {isOffline ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-[11px] font-bold shadow-xs backdrop-blur-xs animate-pulse">
              <WifiOff className="w-3 h-3 text-rose-600" />
              <span>{LIVE_TRACKING_MESSAGES.INTERNET_DISCONNECTED}</span>
            </div>
          ) : wasOffline ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-bold shadow-xs backdrop-blur-xs animate-in fade-in">
              <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin" />
              <span>{LIVE_TRACKING_MESSAGES.INTERNET_CONNECTED_RESUMING}</span>
            </div>
          ) : null}

          {/* GPS Unavailable / Off / Permission Denied Warning */}
          {isGpsUnavailable && !isTerminal && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 text-[11px] font-bold shadow-xs backdrop-blur-xs">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-none">{gpsErrorMessage || LIVE_TRACKING_MESSAGES.GPS_OFF}</span>
              {onRetryGps && (
                <button
                  type="button"
                  onClick={onRetryGps}
                  className="px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-[10px] text-amber-900 flex items-center gap-0.5 cursor-pointer ml-0.5 font-bold shrink-0"
                  title="Retry GPS location"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {/* Last Updated Time Display */}
          {(lastUpdatedAt || proLocation?.updatedAt) && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-stone-700 border border-stone-200 text-[10px] font-bold shadow-xs backdrop-blur-xs"
              title="Last received location update timestamp"
            >
              <Clock className="w-3 h-3 text-stone-500 shrink-0" />
              <span>Updated: {formatLastUpdatedAgo(lastUpdatedAt || proLocation?.updatedAt)}</span>
            </div>
          )}

          {/* Estimated Arrival Time (ETA) */}
          {effectiveEtaMinutes !== null && effectiveEtaMinutes > 0 && !isTerminal && (
            <div
              className={`text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1.5 backdrop-blur-xs transition-colors ${
                routeUpdatedFlash ? 'bg-orange-600 ring-2 ring-orange-400' : 'bg-stone-900/90'
              }`}
              title={etaInfo.arrivalClock}
            >
              <Clock className="w-3 h-3 text-orange-400 shrink-0" />
              <span>ETA {etaInfo.primary}</span>
              <span className="hidden sm:inline text-stone-300 font-normal">
                • {etaInfo.arrivalClock}
              </span>
            </div>
          )}

          {/* Distance Check Comparing Serviceman with Customer */}
          {directGpsDistanceKm !== null ? (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold shadow-xs backdrop-blur-xs"
              title="Direct GPS Distance: Serviceman to Customer"
            >
              <Navigation className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Distance: {formatRouteDistance(directGpsDistanceKm)}</span>
            </div>
          ) : effectiveDistanceKm !== null ? (
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-stone-900 border text-[11px] font-bold shadow-xs transition-all ${
                routeUpdatedFlash
                  ? 'border-emerald-500 ring-2 ring-emerald-200'
                  : 'border-stone-200'
              }`}
            >
              <Route className="w-3 h-3 text-blue-600 shrink-0" />
              <span>{formattedDistance} away</span>
            </div>
          ) : null}

          {/* Route update / Live GPS synchronization pill */}
          {proLocation && !isTerminal && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                routeUpdatedFlash
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-emerald-50/90 text-emerald-700 border-emerald-200 backdrop-blur-xs'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">
                {isRouteUpdating
                  ? 'Recalculating route...'
                  : routeUpdatedFlash
                  ? 'Route updated live'
                  : 'Live GPS Route'}
              </span>
            </div>
          )}
        </div>

        {/* Right Tools (Google Maps & Fullscreen) */}
        <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={openInGoogleMaps}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            title="Open route directions in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Directions</span>
          </button>

          {interactive && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 sm:p-2 rounded-xl bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs hover:bg-stone-50 text-stone-700 cursor-pointer transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Legend & Route Status Bar (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-30 pointer-events-none hidden sm:flex items-center gap-2.5 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-stone-200 text-[10px] font-bold text-stone-700 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shadow-xs" />
          <span>Serviceman</span>
        </div>
        <span className="text-stone-300">→</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs" />
          <span>Customer</span>
        </div>
        <span className="text-stone-300">•</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs" />
          <span>Destination</span>
        </div>
        {directGpsDistanceKm !== null && (
          <>
            <span className="text-stone-300">•</span>
            <span className="text-blue-700 font-black">
              Distance: {formatRouteDistance(directGpsDistanceKm)}
            </span>
          </>
        )}
      </div>

      {/* Map Zoom & Quick Center Controls (Bottom Right) */}
      {interactive && (
        <div className="absolute right-3 bottom-3 flex flex-col gap-1.5 z-30 pointer-events-auto">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(18, z + 1))}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(10, z - 1))}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="h-px bg-stone-300 my-0.5" />
          <button
            type="button"
            onClick={handleCenterOnPro}
            disabled={!proLocation}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs flex items-center justify-center text-orange-600 hover:bg-orange-50 disabled:opacity-40 cursor-pointer transition-colors"
            title="Center on Serviceman"
          >
            <Navigation className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCenterOnCustomer}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs flex items-center justify-center text-emerald-600 hover:bg-emerald-50 cursor-pointer transition-colors"
            title="Center on Customer"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCenterOnDest}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs flex items-center justify-center text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors"
            title="Center on Destination"
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFitBounds}
            className="w-8 h-8 rounded-lg bg-white/95 backdrop-blur-xs border border-stone-200 shadow-xs flex items-center justify-center text-stone-700 hover:bg-stone-50 cursor-pointer transition-colors"
            title="Fit Entire Route"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

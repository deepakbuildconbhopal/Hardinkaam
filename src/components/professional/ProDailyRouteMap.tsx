import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  Phone,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  LocateFixed,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  Maximize2,
  Minimize2,
  Compass,
  Check,
  ShieldCheck,
  Fuel,
} from 'lucide-react';
import { Booking } from '../../types';
import {
  RouteStop,
  OptimizationResult,
  buildRouteStopsFromBookings,
  optimizeDailyJobRoute,
  populateRouteLegMetrics,
  buildGoogleMapsMultiStopUrl,
} from '../../services/proRouteOptimizationService';
import { calculateHaversineDistanceKm } from '../../services/serviceTrackingService';

interface Props {
  bookings: Booking[];
  servicemanLocation?: { latitude?: number; longitude?: number };
  onStatusTransition?: (booking: Booking, newStatus: string) => Promise<void>;
  onSelectBooking?: (booking: Booking) => void;
  className?: string;
}

const DEFAULT_BHOPAL_CENTER = { lat: 23.2332, lng: 77.4343 }; // MP Nagar Bhopal
const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDV0FFr6QyflBd3amvl3iTyIRsMfSPFSXs';

/**
 * Child component that accesses the Map instance and Routes Library to draw route polylines
 * and fit camera bounds to the daily job stops.
 */
function RoutePolylineAndBoundsController({
  origin,
  stops,
  selectedStopId,
}: {
  origin: { lat: number; lng: number };
  stops: RouteStop[];
  selectedStopId: string | null;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Draw route polyline between sequential stops
  useEffect(() => {
    if (!map) return;

    // Clean up previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (stops.length === 0) return;

    const pathCoordinates: { lat: number; lng: number }[] = [
      origin,
      ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ];

    // Attempt high-fidelity Route.computeRoutes via Maps JS SDK
    let renderedRoutesApi = false;
    if (routesLib && typeof (routesLib as any).Route?.computeRoutes === 'function' && stops.length <= 8) {
      try {
        const dest = stops[stops.length - 1];
        const intermediates = stops.slice(0, stops.length - 1).map((s) => ({
          location: { latLng: { lat: s.lat, lng: s.lng } },
        }));

        (routesLib as any).Route.computeRoutes({
          origin: { location: { latLng: origin } },
          destination: { location: { latLng: { lat: dest.lat, lng: dest.lng } } },
          intermediates,
          travelMode: 'DRIVING',
          fields: ['path', 'viewport'],
        })
          .then((result: any) => {
            if (result?.routes?.[0]) {
              const primaryRoute = result.routes[0];
              if (typeof primaryRoute.createPolylines === 'function') {
                const lines = primaryRoute.createPolylines();
                lines.forEach((pl: google.maps.Polyline) => {
                  pl.setOptions({
                    strokeColor: '#4f46e5',
                    strokeOpacity: 0.85,
                    strokeWeight: 5,
                  });
                  pl.setMap(map);
                });
                polylinesRef.current = lines;
                renderedRoutesApi = true;
              }
            }
          })
          .catch(() => {
            // Non-fatal: falls back to direct vector polyline
          });
      } catch {
        // Fallback below
      }
    }

    // Direct multi-segment styled polyline (smooth, reliable & instant across all stops)
    if (!renderedRoutesApi && typeof google !== 'undefined' && google.maps?.Polyline) {
      const routePolyline = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#4f46e5',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2.5,
              strokeColor: '#312e81',
              fillColor: '#6366f1',
              fillOpacity: 1,
            },
            offset: '50%',
            repeat: '100px',
          },
        ],
      });

      routePolyline.setMap(map);
      polylinesRef.current = [routePolyline];
    }

    // Fit camera viewport bounds to include pro origin and all stops
    if (typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
    }

    return () => {
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, routesLib, origin, stops]);

  // Pan to selected stop when clicked
  useEffect(() => {
    if (!map || !selectedStopId) return;
    const target = stops.find((s) => s.id === selectedStopId);
    if (target) {
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(15);
    }
  }, [map, selectedStopId, stops]);

  return null;
}

export const ProDailyRouteMap: React.FC<Props> = ({
  bookings,
  servicemanLocation,
  onStatusTransition,
  onSelectBooking,
  className = '',
}) => {
  // Pro Start / Current Position
  const proCurrentCoords = useMemo(() => {
    if (
      servicemanLocation?.latitude &&
      servicemanLocation?.longitude &&
      !isNaN(servicemanLocation.latitude)
    ) {
      return {
        lat: servicemanLocation.latitude,
        lng: servicemanLocation.longitude,
      };
    }
    return DEFAULT_BHOPAL_CENTER;
  }, [servicemanLocation]);

  // Date Filter: 'today' | 'tomorrow' | 'all'
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('today');
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeInfoWindowStop, setActiveInfoWindowStop] = useState<RouteStop | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationStats, setOptimizationStats] = useState<{
    distanceSavedKm: number;
    timeSavedMins: number;
    percentageSaved: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'map' | 'list'>('split');
  const [originType, setOriginType] = useState<'gps' | 'hub'>('gps');

  const startOrigin = useMemo(() => {
    return originType === 'gps' ? proCurrentCoords : DEFAULT_BHOPAL_CENTER;
  }, [originType, proCurrentCoords]);

  // Filter and build initial RouteStop list
  const initialStops = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    let filterStr: string | undefined = undefined;
    if (dateFilter === 'today') filterStr = todayStr;
    if (dateFilter === 'tomorrow') filterStr = tomorrowStr;

    const baseStops = buildRouteStopsFromBookings(bookings, filterStr);
    return populateRouteLegMetrics(startOrigin, baseStops);
  }, [bookings, dateFilter, startOrigin]);

  // Working sequence of stops (can be optimized or manually reordered)
  const [stops, setStops] = useState<RouteStop[]>(initialStops);

  // Sync stops when bookings or date filter change
  useEffect(() => {
    setStops(initialStops);
    setOptimizationStats(null);
    setActiveInfoWindowStop(null);
  }, [initialStops]);

  // Route metrics summary
  const routeSummary = useMemo(() => {
    let totalKm = 0;
    let prev = startOrigin;
    for (const stop of stops) {
      totalKm += calculateHaversineDistanceKm(prev.lat, prev.lng, stop.lat, stop.lng);
      prev = { lat: stop.lat, lng: stop.lng };
    }
    const totalDurationMins = Math.round(totalKm * 2.5);
    const totalEarnings = stops.reduce((sum, s) => sum + s.amount, 0);

    return {
      totalStops: stops.length,
      activeStops: stops.filter((s) => !s.isCompleted).length,
      completedStops: stops.filter((s) => s.isCompleted).length,
      totalDistanceKm: parseFloat(totalKm.toFixed(1)),
      totalDurationMins,
      totalEarnings,
    };
  }, [stops, startOrigin]);

  // Run 2-Opt TSP Route Optimization
  const handleOptimizeRoute = () => {
    if (stops.length <= 1) return;

    setIsOptimizing(true);
    setTimeout(() => {
      const result: OptimizationResult = optimizeDailyJobRoute(startOrigin, stops);
      setStops(result.optimizedStops);
      setOptimizationStats({
        distanceSavedKm: result.distanceSavedKm,
        timeSavedMins: result.timeSavedMins,
        percentageSaved: result.percentageSaved,
      });
      setIsOptimizing(false);
    }, 450);
  };

  // Move a stop up or down in the sequence manually
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;

    const updated = [...stops];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reCalculated = populateRouteLegMetrics(startOrigin, updated);
    setStops(reCalculated);
    setOptimizationStats(null);
  };

  // Open multi-stop turn-by-turn navigation in Google Maps
  const handleLaunchGoogleMapsNavigation = () => {
    const navUrl = buildGoogleMapsMultiStopUrl(startOrigin, stops);
    const link = document.createElement('a');
    link.href = navUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper status color styling
  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'completed':
        return { label: 'Completed', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' };
      case 'in_progress':
      case 'work_started':
        return { label: 'In Progress', bg: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500 animate-ping' };
      case 'on_the_way':
      case 'arrived':
        return { label: 'En Route', bg: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500 animate-pulse' };
      default:
        return { label: 'Pending', bg: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
    }
  };

  return (
    <div
      className={`bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex flex-col ${className}`}
      style={{ minHeight: '620px' }}
    >
      {/* 1. Header Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-indigo-900/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                दैनिक यात्रा मार्ग व मैप (Daily Job Route Optimizer)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Google Maps Platform
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Optimize travel route between client locations across Bhopal & save fuel/time
            </p>
          </div>
        </div>

        {/* Action Controls & Date Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Date Filter Buttons */}
          <div className="inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                dateFilter === 'today'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              आज (Today)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('tomorrow')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                dateFilter === 'tomorrow'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              कल (Tomorrow)
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                dateFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              सभी (All)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:inline-flex rounded-xl bg-slate-800/80 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('split')}
              title="Split View"
              className={`px-2 py-1 text-xs font-bold rounded-lg ${
                viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              title="Full Map"
              className={`px-2 py-1 text-xs font-bold rounded-lg ${
                viewMode === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Full List"
              className={`px-2 py-1 text-xs font-bold rounded-lg ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              List
            </button>
          </div>

          {/* 1-Tap Google Maps Turn-by-Turn Launch */}
          <button
            type="button"
            onClick={handleLaunchGoogleMapsNavigation}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
            title="Launch multi-stop navigation in Google Maps app"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Google Maps नेविगेशन</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </button>
        </div>
      </div>

      {/* 2. Route Statistics & Optimization Banner */}
      <div className="bg-slate-50 border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-stone-700">
          <div className="flex items-center gap-1.5 font-bold">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>कुल स्टॉप (Stops):</span>
            <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full font-black">
              {routeSummary.totalStops}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <Fuel className="w-4 h-4 text-amber-600" />
            <span>कुल दूरी (Distance):</span>
            <span className="font-mono text-stone-900 font-black">{routeSummary.totalDistanceKm} km</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>यात्रा समय (Travel):</span>
            <span className="font-mono text-stone-900 font-black">~{routeSummary.totalDurationMins} mins</span>
          </div>

          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-emerald-700">कमाई (Payout):</span>
            <span className="font-bold text-emerald-800">₹{routeSummary.totalEarnings}</span>
          </div>
        </div>

        {/* Optimize Route Button with Savings Callout */}
        <div className="flex items-center gap-2">
          {optimizationStats && optimizationStats.distanceSavedKm > 0 && (
            <div className="px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl font-black text-[11px] flex items-center gap-1.5 animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {optimizationStats.distanceSavedKm} km ({optimizationStats.timeSavedMins} mins) की बचत हुई!
              </span>
            </div>
          )}

          <button
            type="button"
            disabled={isOptimizing || stops.length <= 1}
            onClick={handleOptimizeRoute}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>मार्ग अनुकूलित हो रहा है...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                <span>मार्ग अनुकूलित करें (Optimize Route)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Main Split Content Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
        {/* Left Side: Interactive Itinerary List */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div
            className={`flex flex-col border-r border-stone-200 bg-white ${
              viewMode === 'list' ? 'w-full' : 'w-full md:w-5/12 lg:w-4/12'
            } min-h-0`}
          >
            <div className="p-3 bg-stone-100/70 border-b border-stone-200 flex items-center justify-between text-xs font-bold text-stone-700">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>दैनिक स्टॉप क्रम (Stop Order)</span>
              </span>
              <span className="text-[11px] text-stone-500">
                क्रम बदलने हेतु ↑ / ↓ तीर का उपयोग करें
              </span>
            </div>

            {/* List of stops */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {/* Origin Marker in List */}
              <div className="p-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                    0
                  </div>
                  <div>
                    <span className="font-bold text-indigo-950 block">प्रारंभिक बिंदु (Start Origin)</span>
                    <span className="text-[10px] text-indigo-700">
                      {originType === 'gps' ? 'आपका लाइव GPS स्थान (Live Location)' : 'भोपाल मुख्य हब (MP Nagar)'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOriginType(originType === 'gps' ? 'hub' : 'gps')}
                  className="px-2 py-0.5 rounded-lg bg-indigo-200/70 hover:bg-indigo-200 text-indigo-900 font-bold text-[10px] transition"
                >
                  बदलें ({originType === 'gps' ? 'Hub' : 'GPS'})
                </button>
              </div>

              {stops.length === 0 ? (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <MapPin className="w-8 h-8 mx-auto text-stone-300" />
                  <p className="font-bold text-sm text-stone-600">आज कोई निर्धारित नौकरी नहीं मिली</p>
                  <p className="text-xs text-stone-400">
                    जब आपको बुकिंग असाइन होगी, तो उसका रूट यहाँ दिखाई देगा।
                  </p>
                </div>
              ) : (
                stops.map((stop, idx) => {
                  const badge = getStatusBadge(stop.status);
                  const isSelected = selectedStopId === stop.id;

                  return (
                    <div
                      key={stop.id}
                      onClick={() => {
                        setSelectedStopId(stop.id);
                        setActiveInfoWindowStop(stop);
                      }}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-500 shadow-sm'
                          : 'bg-white border-stone-200 hover:border-indigo-300 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          {/* Sequence Number */}
                          <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                            {stop.sequence}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-bold text-stone-900 text-xs truncate max-w-[150px]">
                                {stop.customerName}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {badge.label}
                              </span>
                            </div>

                            <p className="text-[11px] font-medium text-stone-600 truncate mt-0.5">
                              {stop.serviceName}
                            </p>

                            <p className="text-[11px] text-stone-500 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span>{stop.address}</span>
                            </p>
                          </div>
                        </div>

                        {/* Reorder Up/Down Actions */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStop(idx, 'up');
                            }}
                            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === stops.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveStop(idx, 'down');
                            }}
                            className="p-1 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700 disabled:opacity-20 transition"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Leg Distance & Schedule Footer */}
                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                        <div className="flex items-center gap-2 font-mono">
                          {stop.distanceFromPrevKm !== undefined && (
                            <span className="text-stone-700 font-semibold">
                              +{stop.distanceFromPrevKm} km (~{stop.etaMinutesFromPrev}m)
                            </span>
                          )}
                          {stop.estimatedArrivalTime && (
                            <span className="text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                              ETA {stop.estimatedArrivalTime}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700">₹{stop.amount}</span>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=two_wheeler`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-indigo-600 hover:text-indigo-800 p-0.5"
                            title="Navigate directly to this client"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Right Side: Google Maps Interactive Canvas */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className="flex-1 relative min-h-[380px] bg-stone-100">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['routes', 'marker']}>
              <Map
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                defaultCenter={startOrigin}
                defaultZoom={13}
                gestureHandling="greedy"
                fullscreenControl={false}
                mapTypeControl={false}
                streetViewControl={false}
                style={{ width: '100%', height: '100%', minHeight: '380px' }}
              >
                {/* Route Polyline and Camera Bounds Sync */}
                <RoutePolylineAndBoundsController
                  origin={startOrigin}
                  stops={stops}
                  selectedStopId={selectedStopId}
                />

                {/* 1. Technician Starting Point Marker */}
                <AdvancedMarker position={startOrigin} title="Your Starting Location">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold">
                        <Compass className="w-4 h-4 animate-spin text-white" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border border-white rounded-full animate-ping" />
                    </div>
                    <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white text-[10px] font-black rounded-full shadow">
                      Start (Origin)
                    </span>
                  </div>
                </AdvancedMarker>

                {/* 2. Client Job Stops Markers */}
                {stops.map((stop) => {
                  const isSelected = selectedStopId === stop.id;
                  const isCompleted = stop.isCompleted;

                  return (
                    <AdvancedMarker
                      key={stop.id}
                      position={{ lat: stop.lat, lng: stop.lng }}
                      title={`Stop #${stop.sequence}: ${stop.customerName}`}
                      onClick={() => {
                        setSelectedStopId(stop.id);
                        setActiveInfoWindowStop(stop);
                      }}
                    >
                      <div className="flex flex-col items-center cursor-pointer group">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-xl transition-transform group-hover:scale-110 border-2 ${
                            isSelected
                              ? 'scale-125 ring-4 ring-indigo-400 bg-indigo-600 border-white'
                              : isCompleted
                              ? 'bg-emerald-600 border-white'
                              : stop.isActive
                              ? 'bg-purple-600 border-white ring-2 ring-purple-300'
                              : 'bg-slate-900 border-white'
                          }`}
                        >
                          {stop.sequence}
                        </div>
                        <span className="mt-0.5 px-1.5 py-0.2 rounded bg-slate-900/80 text-white text-[9px] font-bold max-w-[90px] truncate shadow">
                          {stop.customerName}
                        </span>
                      </div>
                    </AdvancedMarker>
                  );
                })}

                {/* 3. InfoWindow for Clicked Stop */}
                {activeInfoWindowStop && (
                  <InfoWindow
                    position={{
                      lat: activeInfoWindowStop.lat,
                      lng: activeInfoWindowStop.lng,
                    }}
                    onCloseClick={() => setActiveInfoWindowStop(null)}
                  >
                    <div className="p-1 max-w-xs text-stone-900 space-y-2">
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200 pb-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-black text-[10px]">
                          Stop #{activeInfoWindowStop.sequence}
                        </span>
                        <span className="text-xs font-bold text-emerald-700">
                          ₹{activeInfoWindowStop.amount}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-stone-900">
                          {activeInfoWindowStop.customerName}
                        </h4>
                        <p className="text-xs text-indigo-700 font-semibold">
                          {activeInfoWindowStop.serviceName}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {activeInfoWindowStop.address}
                        </p>
                      </div>

                      <div className="text-[11px] bg-stone-100 p-1.5 rounded-lg text-stone-700 space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Scheduled:</span>
                          <span className="font-medium">{activeInfoWindowStop.timeSlot}</span>
                        </div>
                        {activeInfoWindowStop.estimatedArrivalTime && (
                          <div className="flex justify-between text-indigo-900 font-bold">
                            <span>Est. Arrival:</span>
                            <span>{activeInfoWindowStop.estimatedArrivalTime}</span>
                          </div>
                        )}
                      </div>

                      {/* InfoWindow Actions */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {activeInfoWindowStop.customerPhone && (
                          <a
                            href={`tel:${activeInfoWindowStop.customerPhone}`}
                            className="flex-1 py-1 px-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>कॉल करें</span>
                          </a>
                        )}

                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeInfoWindowStop.lat},${activeInfoWindowStop.lng}&travelmode=two_wheeler`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>नेविगेट करें</span>
                        </a>
                      </div>

                      {onSelectBooking && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectBooking(activeInfoWindowStop.booking);
                            setActiveInfoWindowStop(null);
                          }}
                          className="w-full py-1 text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          View Job Details & Actions
                        </button>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </APIProvider>

            {/* Floating Map Legend Overlay */}
            <aside
              role="complementary"
              aria-label="Route map legend"
              className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-2xl shadow-lg border border-stone-200 text-[11px] space-y-1 pointer-events-auto"
            >
              <div className="font-bold text-stone-800 flex items-center gap-1.5 mb-1">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                <span>मैप संकेत (Map Legend)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-white" />
                <span className="text-stone-600">Start / Technician Location</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white" />
                <span className="text-stone-600">Client Stops (Stop Sequence)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-indigo-600 rounded" />
                <span className="text-stone-600">Optimal Driving Path</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  MapPin,
  Clock,
  Route,
  Navigation,
  Download,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Booking, TrackingLocationPoint } from '../../types';
import {
  getBookingLocationHistory,
  calculateLocationHistorySummary,
  exportLocationHistoryToCSV,
  LocationHistorySummary,
} from '../../services/serviceTrackingHistoryService';
import { calculateHaversineDistanceKm } from '../../services/serviceTrackingService';

interface Props {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminBookingTrackingHistoryModal: React.FC<Props> = ({
  booking,
  isOpen,
  onClose,
}) => {
  const [points, setPoints] = useState<TrackingLocationPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'timeline'>('map');
  const [mapZoom, setMapZoom] = useState<number>(14);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Fetch tracking history when modal opens with a valid booking
  const loadHistory = async () => {
    if (!booking?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const history = await getBookingLocationHistory(booking.id);
      setPoints(history);
      if (history.length > 0) {
        setSelectedPointIdx(history.length - 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load tracking history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking?.id) {
      loadHistory();
      setPanOffset({ x: 0, y: 0 });
    } else {
      setPoints([]);
      setSelectedPointIdx(null);
    }
  }, [isOpen, booking?.id]);

  const summary: LocationHistorySummary = useMemo(() => {
    return calculateLocationHistorySummary(points);
  }, [points]);

  // Destination coordinates from booking address or fallback
  const destinationCoords = useMemo(() => {
    // City coords fallback
    let lat = 23.2599;
    let lng = 77.4126;
    if (booking?.city?.toLowerCase() === 'indore') {
      lat = 22.7196;
      lng = 75.8577;
    }
    if (booking?.serviceManLocation?.latitude && booking?.serviceManLocation?.longitude) {
      lat = booking.serviceManLocation.latitude;
      lng = booking.serviceManLocation.longitude;
    }
    return { lat, lng };
  }, [booking]);

  // Bounding box calculation for map rendering
  const mapBounds = useMemo(() => {
    if (points.length === 0) {
      return {
        minLat: destinationCoords.lat - 0.01,
        maxLat: destinationCoords.lat + 0.01,
        minLng: destinationCoords.lng - 0.01,
        maxLng: destinationCoords.lng + 0.01,
        centerLat: destinationCoords.lat,
        centerLng: destinationCoords.lng,
      };
    }

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    points.forEach((p) => {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    });

    // Add destination to bounds if available
    minLat = Math.min(minLat, destinationCoords.lat);
    maxLat = Math.max(maxLat, destinationCoords.lat);
    minLng = Math.min(minLng, destinationCoords.lng);
    maxLng = Math.max(maxLng, destinationCoords.lng);

    // Add padding margin
    const latPadding = Math.max((maxLat - minLat) * 0.15, 0.005);
    const lngPadding = Math.max((maxLng - minLng) * 0.15, 0.005);

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLng: minLng - lngPadding,
      maxLng: maxLng + lngPadding,
      centerLat: (minLat + maxLat) / 2,
      centerLng: (minLng + maxLng) / 2,
    };
  }, [points, destinationCoords]);

  // Convert lat/lng to SVG/Canvas canvas coordinate percentages (0-100)
  const projectCoords = (lat: number, lng: number) => {
    const latSpan = mapBounds.maxLat - mapBounds.minLat || 0.01;
    const lngSpan = mapBounds.maxLng - mapBounds.minLng || 0.01;

    const x = ((lng - mapBounds.minLng) / lngSpan) * 100;
    const y = ((mapBounds.maxLat - lat) / latSpan) * 100; // Invert Y for SVG coordinates
    return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
  };

  const polylinePointsString = useMemo(() => {
    if (points.length < 2) return '';
    return points
      .map((p) => {
        const { x, y } = projectCoords(p.latitude, p.longitude);
        return `${x},${y}`;
      })
      .join(' ');
  }, [points, mapBounds]);

  const handleCopyPoint = (p: TrackingLocationPoint, idx: number) => {
    navigator.clipboard.writeText(`${p.latitude}, ${p.longitude} (${p.timestamp})`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div
        id="admin-booking-tracking-history-modal"
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  सेवा ट्रैकिंग इतिहास (Service Location History)
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-mono">
                  #{booking.id.slice(-6).toUpperCase()}
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    booking.status === 'completed'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 flex items-center gap-2">
                <span>{booking.serviceName}</span>
                <span>•</span>
                <span>ग्राहक: {booking.customerName}</span>
                {booking.serviceManName && (
                  <>
                    <span>•</span>
                    <span>टेक्नीशियन: {booking.serviceManName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoading}
              className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              title="रीफ्रेश करें"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {points.length > 0 && (
              <button
                type="button"
                onClick={() => exportLocationHistoryToCSV(booking.id, booking.serviceName, points)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                CSV एक्सपोर्ट
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
          <div className="p-3 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> कुल GPS बिंदु
            </div>
            <div className="text-lg sm:text-xl font-black text-indigo-950 dark:text-indigo-200 mt-1">
              {summary.totalPoints}{' '}
              <span className="text-xs font-semibold text-stone-500">रिकॉर्डेड</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> कुल दूरी (Distance)
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-950 dark:text-emerald-200 mt-1">
              {summary.formattedDistance}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> सक्रिय ट्रैकिंग अवधि
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-950 dark:text-amber-200 mt-1">
              {summary.formattedDuration}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> पूर्ण होने का समय
            </div>
            <div className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200 mt-1 truncate">
              {summary.endTime ? new Date(summary.endTime).toLocaleTimeString('en-IN') : 'सक्रिय / N/A'}
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="px-4 sm:px-5 pt-3 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'map'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              रूट मैप विज़ुअलाइज़र (Route Map)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              विस्तृत टाइमलाइन व लॉग ({points.length})
            </button>
          </div>

          {points.length > 0 && (
            <div className="text-[11px] text-stone-500 dark:text-stone-400 pb-2">
              आवश्यक ट्रैकिंग अवधि के अंतर्गत सुरक्षित GPS डेटा
            </div>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-semibold">ट्रैकिंग इतिहास लोड हो रहा है...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : points.length === 0 ? (
            <div className="py-16 text-center text-stone-400 dark:text-stone-500 flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-3">
                <MapPin className="w-7 h-7 text-stone-400" />
              </div>
              <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
                कोई GPS ट्रैकिंग इतिहास उपलब्ध नहीं है
              </h3>
              <p className="text-xs text-stone-500 max-w-md mt-1">
                इस बुकिंग के दौरान टेक्नीशियन द्वारा लाइव GPS शेयर नहीं किया गया था या ट्रैकिंग शुरू होने से पहले ही कार्य पूर्ण हो गया।
              </p>
            </div>
          ) : activeTab === 'map' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Map Canvas Visualizer */}
              <div className="lg:col-span-2 rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden bg-stone-900 relative shadow-inner h-[380px] sm:h-[420px] flex flex-col">
                {/* SVG OpenStreetMap Styled Canvas */}
                <div
                  className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden bg-[#0e1626]"
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
                  }}
                  onMouseMove={(e) => {
                    if (isDragging) {
                      setPanOffset({
                        x: e.clientX - dragStartRef.current.x,
                        y: e.clientY - dragStartRef.current.y,
                      });
                    }
                  }}
                  onMouseUp={() => setIsDragging(false)}
                  onMouseLeave={() => setIsDragging(false)}
                >
                  {/* Subtle Map Grid Lines */}
                  <svg
                    className="w-full h-full absolute inset-0 pointer-events-none"
                    style={{
                      transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    }}
                  >
                    <defs>
                      <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      </pattern>
                      <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-pattern)" />

                    {/* Polyline Route Trail */}
                    {polylinePointsString && (
                      <>
                        {/* Outer Glow */}
                        <polyline
                          points={polylinePointsString}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="8"
                          strokeOpacity="0.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Main Path */}
                        <polyline
                          points={polylinePointsString}
                          fill="none"
                          stroke="url(#routeGradient)"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                  </svg>

                  {/* Render Markers */}
                  {points.map((pt, idx) => {
                    const { x, y } = projectCoords(pt.latitude, pt.longitude);
                    const isFirst = idx === 0;
                    const isLast = idx === points.length - 1;
                    const isSelected = selectedPointIdx === idx;

                    return (
                      <div
                        key={`pt-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPointIdx(idx);
                        }}
                        style={{
                          left: `calc(${x}% + ${panOffset.x}px)`,
                          top: `calc(${y}% + ${panOffset.y}px)`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        className={`absolute cursor-pointer transition-all ${
                          isSelected ? 'z-30 scale-125' : isFirst || isLast ? 'z-20' : 'z-10'
                        }`}
                        title={`#${idx + 1} (${new Date(pt.timestamp).toLocaleTimeString()})`}
                      >
                        {isFirst ? (
                          <div className="flex flex-col items-center">
                            <div className="px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-black text-white shadow-md mb-0.5">
                              शुरुआत
                            </div>
                            <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[9px] font-bold">
                              1
                            </div>
                          </div>
                        ) : isLast ? (
                          <div className="flex flex-col items-center">
                            <div className="px-1.5 py-0.5 rounded bg-purple-500 text-[9px] font-black text-white shadow-md mb-0.5">
                              अंतिम बिंदु
                            </div>
                            <div className="w-5 h-5 rounded-full bg-purple-500 border-2 border-white shadow-lg flex items-center justify-center text-white text-[9px] font-bold">
                              {points.length}
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`w-2.5 h-2.5 rounded-full border border-white/80 shadow-xs ${
                              isSelected ? 'bg-indigo-400 ring-4 ring-indigo-500/40 w-3.5 h-3.5' : 'bg-cyan-400'
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Destination Pin */}
                  {destinationCoords && (
                    <div
                      style={{
                        left: `calc(${projectCoords(destinationCoords.lat, destinationCoords.lng).x}% + ${panOffset.x}px)`,
                        top: `calc(${projectCoords(destinationCoords.lat, destinationCoords.lng).y}% + ${panOffset.y}px)`,
                        transform: 'translate(-50%, -100%)',
                      }}
                      className="absolute z-20 pointer-events-none flex flex-col items-center"
                    >
                      <div className="px-2 py-0.5 rounded bg-rose-600 text-[9px] font-black text-white shadow-md mb-0.5 whitespace-nowrap">
                        📍 गंतव्य (Customer)
                      </div>
                      <MapPin className="w-5 h-5 text-rose-500 fill-rose-500 drop-shadow-md" />
                    </div>
                  )}

                  {/* Map Legend Overlay */}
                  <div className="absolute bottom-3 left-3 bg-stone-900/90 backdrop-blur-xs border border-stone-700/80 rounded-xl p-2 text-[10px] text-stone-300 space-y-1 z-20 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>प्रारंभिक बिंदु (Start)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                      <span>पूर्ण / अंतिम बिंदु (End)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                      <span>ग्राहक का पता (Destination)</span>
                    </div>
                  </div>

                  {/* Reset Pan Button */}
                  <button
                    type="button"
                    onClick={() => setPanOffset({ x: 0, y: 0 })}
                    className="absolute top-3 right-3 bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-white text-[10px] font-bold px-2 py-1 rounded-lg z-20"
                  >
                    केंद्रित करें (Reset View)
                  </button>
                </div>
              </div>

              {/* Selected Point Inspector */}
              <div className="rounded-2xl border border-stone-200 dark:border-stone-800 p-4 bg-stone-50 dark:bg-stone-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-700">
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      बिंदु विवरण (Point Inspection)
                    </h4>
                    {selectedPointIdx !== null && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                        #{selectedPointIdx + 1} / {points.length}
                      </span>
                    )}
                  </div>

                  {selectedPointIdx !== null && points[selectedPointIdx] ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          समय (Recorded Timestamp)
                        </div>
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-200 mt-0.5">
                          {new Date(points[selectedPointIdx].timestamp).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                          <div className="text-[10px] font-semibold text-stone-400">अक्षांश (Latitude)</div>
                          <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {points[selectedPointIdx].latitude.toFixed(6)}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
                          <div className="text-[10px] font-semibold text-stone-400">देशांतर (Longitude)</div>
                          <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {points[selectedPointIdx].longitude.toFixed(6)}
                          </div>
                        </div>
                      </div>

                      {selectedPointIdx > 0 && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                          <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                            पिछले बिंदु से दूरी (Delta from prev)
                          </div>
                          <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">
                            +{Math.round(
                              calculateHaversineDistanceKm(
                                points[selectedPointIdx - 1].latitude,
                                points[selectedPointIdx - 1].longitude,
                                points[selectedPointIdx].latitude,
                                points[selectedPointIdx].longitude
                              ) * 1000
                            )}{' '}
                            मीटर
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyPoint(points[selectedPointIdx], selectedPointIdx)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-xs font-bold transition-colors"
                      >
                        {copiedIdx === selectedPointIdx ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            कॉपी हो गया!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            निर्देशांक कॉपी करें (Copy Coordinates)
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-stone-400">
                      मैप पर किसी भी बिंदु को चुनकर विवरण देखें
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-400">
                  📍 सेवा गंतव्य पता:{' '}
                  <span className="font-semibold text-stone-800 dark:text-stone-200">
                    {booking.address}, {booking.city || 'Bhopal'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Timeline & Data Log Table */
            <div className="rounded-2xl border border-stone-200 dark:border-stone-700 overflow-hidden bg-white dark:bg-stone-900">
              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 uppercase text-[10px] font-black tracking-wider border-b border-stone-200 dark:border-stone-700">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">समय (Timestamp)</th>
                      <th className="py-2.5 px-3">अक्षांश (Lat)</th>
                      <th className="py-2.5 px-3">देशांतर (Lng)</th>
                      <th className="py-2.5 px-3">वृद्धि (Delta)</th>
                      <th className="py-2.5 px-3 text-right">क्रिया</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 font-mono">
                    {points.map((pt, idx) => {
                      let deltaStr = '-';
                      if (idx > 0) {
                        const prev = points[idx - 1];
                        const distMeters = Math.round(
                          calculateHaversineDistanceKm(
                            prev.latitude,
                            prev.longitude,
                            pt.latitude,
                            pt.longitude
                          ) * 1000
                        );
                        deltaStr = `+${distMeters} m`;
                      }

                      const isSelected = selectedPointIdx === idx;

                      return (
                        <tr
                          key={`row-${idx}`}
                          onClick={() => setSelectedPointIdx(idx)}
                          className={`hover:bg-stone-50 dark:hover:bg-stone-800/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/40' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-stone-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-stone-800 dark:text-stone-200">
                            {new Date(pt.timestamp).toLocaleTimeString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-stone-700 dark:text-stone-300">
                            {pt.latitude.toFixed(6)}
                          </td>
                          <td className="py-2.5 px-3 text-stone-700 dark:text-stone-300">
                            {pt.longitude.toFixed(6)}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {deltaStr}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPoint(pt, idx);
                              }}
                              className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500"
                              title="कॉपी करें"
                            >
                              {copiedIdx === idx ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>अधिकृत एडमिनिस्ट्रेटर सुरक्षा ऑडिट - ट्रैकिंग अवधि सुरक्षित</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-bold transition-colors cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

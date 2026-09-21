import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Navigation,
  MapPin,
  User,
  Clock,
  Phone,
  ShieldCheck,
  ChevronRight,
  Activity,
  AlertCircle,
  Sparkles,
  Receipt,
  WifiOff,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Booking, ServiceManLocationData, TrackingLocationPoint } from '../../types';
import {
  subscribeToServiceTracking,
  updateCustomerTrackingLocation,
} from '../../services/serviceTrackingLiveFoundation';
import {
  resolveAddressCoordinates,
  calculateHaversineDistanceKm,
} from '../../services/serviceTrackingService';
import { formatRouteDistance } from '../../services/serviceRouteService';
import {
  isAuthorizedToViewTracking,
  isTrackingTerminal,
  useNetworkStatus,
  useGpsStatus,
  formatLastUpdatedAgo,
  LIVE_TRACKING_MESSAGES,
  getLiveTrackingErrorInfo,
} from '../../services/liveTrackingQuality';
import { LiveTrackingMap } from '../common/LiveTrackingMap';
import { CustomerHelpModal } from './CustomerHelpModal';

interface Props {
  booking: Booking;
  onOpenDetails?: (booking: Booking) => void;
  className?: string;
}

export const CustomerBookingLiveMapCard: React.FC<Props> = ({
  booking,
  onOpenDetails,
  className = '',
}) => {
  const { currentUser, userProfile } = useAuth();
  const { gpsState, gpsErrorMessage, setGpsErrorFromCode, resetGpsState } = useGpsStatus();

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Prevent unauthorized users from viewing locations
  const isAuthorized = useMemo(() => {
    return isAuthorizedToViewTracking(booking, userProfile, currentUser?.uid);
  }, [booking, userProfile, currentUser?.uid]);

  // Terminal lifecycle check: Stop tracking after COMPLETED or CANCELLED
  const isTerminalBooking = useMemo(() => {
    return isTrackingTerminal(booking.status, booking.trackingStatus);
  }, [booking.status, booking.trackingStatus]);

  const activeStatuses = [
    'assigned',
    'accepted',
    'on_the_way',
    'arriving',
    'arrived',
    'otp_pending',
    'in_progress',
    'work_started',
    'completed',
  ];

  const isActiveBooking = useMemo(() => {
    const status = (booking.status || '').toLowerCase();
    const tracking = (booking.trackingStatus || '').toLowerCase();
    return activeStatuses.includes(status) || activeStatuses.includes(tracking);
  }, [booking.status, booking.trackingStatus]);

  if (!isAuthorized || !isActiveBooking) {
    return null;
  }

  // Live tracking state from Firestore serviceTracking/{bookingId}
  const [servicemanLocation, setServicemanLocation] = useState<ServiceManLocationData | undefined>(
    booking.serviceManLocation
  );
  const [customerLocation, setCustomerLocation] = useState<TrackingLocationPoint | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number }>(() =>
    resolveAddressCoordinates(booking.address, booking.city)
  );
  const [liveStatus, setLiveStatus] = useState<string>(
    booking.trackingStatus || booking.status || 'ASSIGNED'
  );
  const [etaSeconds, setEtaSeconds] = useState<number | null>(
    typeof booking.etaMinutes === 'number' ? booking.etaMinutes * 60 : null
  );
  const [lastGpsTime, setLastGpsTime] = useState<string | null>(null);

  // 1. Real-time subscription to serviceTracking/{booking.id}
  useEffect(() => {
    if (!booking.id || isTerminalBooking) return;

    const unsubscribe = subscribeToServiceTracking(booking.id, (trackingDoc) => {
      if (trackingDoc) {
        // Serviceman location update
        if (trackingDoc.servicemanLocation) {
          setServicemanLocation({
            latitude: trackingDoc.servicemanLocation.latitude,
            longitude: trackingDoc.servicemanLocation.longitude,
            updatedAt: trackingDoc.servicemanLocation.timestamp,
          });
          setLastGpsTime(trackingDoc.servicemanLocation.timestamp);
        }

        // Customer location update
        if (trackingDoc.customerLocation) {
          setCustomerLocation(trackingDoc.customerLocation);
        }

        // Destination update
        if (trackingDoc.destination) {
          setDestinationCoords({
            lat: trackingDoc.destination.latitude,
            lng: trackingDoc.destination.longitude,
          });
        }

        // Status & ETA update
        if (trackingDoc.status) {
          setLiveStatus(trackingDoc.status);
        }
        if (typeof trackingDoc.etaSeconds === 'number') {
          setEtaSeconds(trackingDoc.etaSeconds);
        }
      }
    });

    return () => unsubscribe();
  }, [booking.id, isTerminalBooking]);

  // 2. Request customer's device location
  const customerLocRequestedRef = useRef<boolean>(false);
  const requestCustomerGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation || isTerminalBooking) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resetGpsState();
        const pt: TrackingLocationPoint = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: new Date().toISOString(),
        };
        setCustomerLocation(pt);
        if (booking.id && !isTerminalBooking) {
          updateCustomerTrackingLocation(booking.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).catch(() => {});
        }
      },
      (err) => {
        setGpsErrorFromCode(err.code, err.message);
        const fallbackDest = resolveAddressCoordinates(booking.address, booking.city);
        setCustomerLocation({
          latitude: fallbackDest.lat,
          longitude: fallbackDest.lng,
          timestamp: new Date().toISOString(),
        });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    if (customerLocRequestedRef.current || isTerminalBooking) return;
    if (!customerLocation && navigator.geolocation) {
      customerLocRequestedRef.current = true;
      requestCustomerGps();
    }
  }, [booking.id, isTerminalBooking, customerLocation]);

  // Automatic recovery when internet connection returns
  const handleReconnect = () => {
    if (booking.id && !isTerminalBooking) {
      subscribeToServiceTracking(booking.id, (trackingDoc) => {
        if (trackingDoc?.servicemanLocation) {
          setServicemanLocation({
            latitude: trackingDoc.servicemanLocation.latitude,
            longitude: trackingDoc.servicemanLocation.longitude,
            updatedAt: trackingDoc.servicemanLocation.timestamp,
          });
          setLastGpsTime(trackingDoc.servicemanLocation.timestamp);
        }
      });
      requestCustomerGps();
    }
  };

  const { isOnline, wasOffline } = useNetworkStatus(handleReconnect);

  // Phase 12: Live tracking error status calculation
  const trackingErrorInfo = useMemo(() => {
    return getLiveTrackingErrorInfo({
      isOnline,
      wasOffline,
      gpsState,
      gpsErrorMessage,
      hasServicemanLocation: Boolean(servicemanLocation),
      isTerminal: isTerminalBooking,
    });
  }, [isOnline, wasOffline, gpsState, gpsErrorMessage, servicemanLocation, isTerminalBooking]);

  // Friendly status labels
  const statusConfig = useMemo(() => {
    const s = (liveStatus || '').toUpperCase();
    switch (s) {
      case 'ON_THE_WAY':
        return {
          badge: 'On The Way (रास्ते में है)',
          color: 'text-orange-700 bg-orange-100 border-orange-200',
          pulse: true,
        };
      case 'ARRIVED':
        return {
          badge: 'Serviceman Arrived (पहुँच गए हैं)',
          color: 'text-blue-700 bg-blue-100 border-blue-200',
          pulse: false,
        };
      case 'WORK_STARTED':
      case 'IN_PROGRESS':
        return {
          badge: 'Work in Progress (काम चालू है)',
          color: 'text-emerald-700 bg-emerald-100 border-emerald-200',
          pulse: true,
        };
      case 'COMPLETED':
        return {
          badge: 'Service Completed (काम पूरा हुआ)',
          color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
          pulse: false,
        };
      case 'ASSIGNED':
      case 'REQUESTED':
        return {
          badge: 'Professional Assigned (असाइन किया गया)',
          color: 'text-amber-700 bg-amber-100 border-amber-200',
          pulse: false,
        };
      default:
        return {
          badge: 'Live Active Tracking',
          color: 'text-stone-700 bg-stone-100 border-stone-200',
          pulse: false,
        };
    }
  }, [liveStatus]);

  // ETA calculation in minutes
  const etaMinutes = useMemo(() => {
    if (typeof etaSeconds === 'number' && etaSeconds > 0) {
      return Math.ceil(etaSeconds / 60);
    }
    if (typeof booking.etaMinutes === 'number' && booking.etaMinutes > 0) {
      return booking.etaMinutes;
    }
    return null;
  }, [etaSeconds, booking.etaMinutes]);

  // Phase 7: Distance check comparing serviceman GPS location with customer GPS location
  const liveGpsDistanceKm = useMemo(() => {
    if (
      servicemanLocation?.latitude &&
      servicemanLocation?.longitude &&
      customerLocation?.latitude &&
      customerLocation?.longitude
    ) {
      return calculateHaversineDistanceKm(
        servicemanLocation.latitude,
        servicemanLocation.longitude,
        customerLocation.latitude,
        customerLocation.longitude
      );
    }
    return null;
  }, [servicemanLocation, customerLocation]);

  return (
    <div
      id={`customer-active-live-tracking-${booking.id}`}
      className={`bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all ${className}`}
    >
      {/* Top Banner: Status, Serviceman Info & Arrival Verification */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs">
              {booking.serviceManName ? booking.serviceManName.charAt(0) : 'P'}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-stone-900">
                {booking.serviceManName || 'Assigned Professional'}
              </h4>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusConfig.color} flex items-center gap-1`}
              >
                {statusConfig.pulse && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                )}
                <span>{statusConfig.badge}</span>
              </span>
            </div>

            <p className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
              <span>{booking.serviceName}</span>
              <span>•</span>
              <span className="font-mono text-stone-400">#{booking.id}</span>
            </p>
          </div>
        </div>

        {/* ETA, Distance & Quick Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Phase 9: Service charge display for completed booking */}
          {(liveStatus === 'COMPLETED' || booking.status === 'completed') && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 text-xs font-bold shadow-2xs"
              title="Final Service Charge and Payment Status"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Service Charge: ₹{booking.finalBill?.baseAmount ?? booking.baseAmount ?? booking.amount} • Total: ₹{booking.finalBill?.finalAmount ?? booking.finalAmount ?? booking.amount}
              </span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-extrabold">
                {booking.finalBill?.paymentStatus || booking.paymentStatus || 'Paid'}
              </span>
            </div>
          )}

          {/* Phase 7: Distance check comparing serviceman GPS with customer GPS */}
          {liveGpsDistanceKm !== null && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs"
              title="Direct GPS Distance: Serviceman to Customer"
            >
              <Navigation className="w-3.5 h-3.5 text-blue-600" />
              <span>Distance: {formatRouteDistance(liveGpsDistanceKm)}</span>
            </div>
          )}

          {etaMinutes !== null && etaMinutes > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-100/90 text-orange-900 border border-orange-200/80 text-xs font-black shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>ETA ~{etaMinutes} min</span>
            </div>
          )}

          {booking.serviceManPhone && (
            <a
              href={`tel:${booking.serviceManPhone}`}
              className="p-2 rounded-xl bg-white border border-stone-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Call Serviceman"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Call</span>
            </a>
          )}

          {onOpenDetails && (
            <button
              type="button"
              onClick={() => onOpenDetails(booking)}
              className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <span>Details &amp; OTP</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Map Display */}
      <div className="p-3 sm:p-4 bg-stone-50/50 space-y-3">
        {/* Phase 12 Live Tracking Error / Offline / Unavailable banner */}
        {trackingErrorInfo && (
          <div
            className={`p-3 rounded-2xl flex items-center justify-between gap-2.5 text-xs font-bold ${
              trackingErrorInfo.severity === 'error'
                ? 'bg-rose-50 border border-rose-300 text-rose-950'
                : trackingErrorInfo.severity === 'warning'
                ? 'bg-amber-50 border border-amber-300 text-amber-950'
                : trackingErrorInfo.severity === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                : 'bg-stone-100 border border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {trackingErrorInfo.severity === 'error' ? (
                <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
              ) : trackingErrorInfo.severity === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : trackingErrorInfo.severity === 'success' ? (
                <Activity className="w-4 h-4 text-emerald-600 shrink-0 animate-spin" />
              ) : (
                <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
              )}
              <span>{trackingErrorInfo.message}</span>
            </div>
            {(trackingErrorInfo.type === 'gps_off' || trackingErrorInfo.type === 'gps_denied') && (
              <button
                type="button"
                onClick={requestCustomerGps}
                className="px-2 py-0.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-[11px] font-bold text-amber-900 cursor-pointer shrink-0"
              >
                Retry
              </button>
            )}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-inner">
          <LiveTrackingMap
            proLocation={servicemanLocation}
            customerLocation={customerLocation}
            destinationCoords={destinationCoords}
            customerAddress={booking.address}
            customerCity={booking.city}
            proName={booking.serviceManName || 'Serviceman'}
            trackingStatus={liveStatus}
            bookingStatus={booking.status}
            etaMinutes={etaMinutes}
            etaSeconds={etaSeconds}
            height="300px"
            interactive={true}
            lastUpdatedAt={lastGpsTime || servicemanLocation?.updatedAt}
            isOffline={!isOnline}
            wasOffline={wasOffline}
            isGpsUnavailable={gpsState === 'unavailable' || gpsState === 'denied' || gpsState === 'timeout' || gpsState === 'off'}
            gpsErrorMessage={gpsErrorMessage}
            onRetryGps={requestCustomerGps}
            isTrackingStopped={isTerminalBooking}
          />
        </div>

        {/* Bottom Legend & GPS Status info */}
        <div className="mt-2.5 px-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-500">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              <span className="font-semibold text-stone-700">Customer</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-600 inline-block" />
              <span className="font-semibold text-stone-700">Serviceman</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
              <span className="font-semibold text-stone-700">Destination</span>
            </span>
            {liveGpsDistanceKm !== null && (
              <span className="flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                <Navigation className="w-3 h-3 text-blue-600" />
                <span>Distance: {formatRouteDistance(liveGpsDistanceKm)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-stone-400">
            {lastGpsTime && (
              <span className="font-medium text-stone-600 flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                <span>Updated: {formatLastUpdatedAgo(lastGpsTime)}</span>
              </span>
            )}
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span>
                {isTerminalBooking
                  ? 'Tracking ended'
                  : servicemanLocation
                  ? 'Real-time GPS active'
                  : 'Waiting for serviceman'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

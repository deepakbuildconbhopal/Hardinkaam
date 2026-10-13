import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  ShieldCheck,
  Star,
  Clock,
  Navigation,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Timer,
  RefreshCw,
  Sparkles,
  Zap,
  Receipt,
  Home,
  RotateCcw,
  AlertTriangle,
  Send,
  HelpCircle,
  WifiOff,
  QrCode,
} from 'lucide-react';
import { doc, onSnapshot, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking, ServiceMan, ServiceManLocationData } from '../../types';
import { LiveTrackingMap } from '../common/LiveTrackingMap';
import { CustomerBookingQrModal } from './CustomerBookingQrModal';
import {
  subscribeToServiceTracking,
  updateCustomerTrackingLocation,
  getServiceTrackingRecord,
  TrackingLocationPoint,
} from '../../services/serviceTrackingLiveFoundation';
import {
  resolveAddressCoordinates,
  getArrivalEtaText,
  getLastUpdatedText,
  updateCustomerAvailability,
} from '../../services/serviceTrackingService';
import {
  calculateHaversineDistanceKm,
  formatRouteDistance,
} from '../../services/serviceRouteService';
import { getOrCreateArrivalOtp } from '../../services/arrivalOtpService';
import { CustomerHelpModal } from './CustomerHelpModal';
import { PostServiceFeedbackModal } from './PostServiceFeedbackModal';
import { WorkServiceTimer } from '../common/WorkServiceTimer';
import { ExtraChargesManager } from '../common/ExtraChargesManager';
import { HardinkaamServiceBill } from '../common/HardinkaamServiceBill';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  isAuthorizedToViewTracking,
  isTrackingTerminal,
  useNetworkStatus,
  useGpsStatus,
  formatLastUpdatedAgo,
  LIVE_TRACKING_MESSAGES,
  getLiveTrackingErrorInfo,
} from '../../services/liveTrackingQuality';
import { Bell } from 'lucide-react';

interface LiveServiceTrackerModalProps {
  booking: Booking;
  serviceMen?: ServiceMan[];
  onClose: () => void;
  onOpenChat: (booking: Booking) => void;
}

export const LiveServiceTrackerModal: React.FC<LiveServiceTrackerModalProps> = ({
  booking: initialBooking,
  serviceMen = [],
  onClose,
  onOpenChat,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { isPushSubscribed, pushPermission, enablePushNotifications } = useNotifications();
  const { gpsState, gpsErrorMessage, setGpsErrorFromCode, resetGpsState } = useGpsStatus();

  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [arrivalOtp, setArrivalOtp] = useState<string>('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<string>('');
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [isLoadingOtp, setIsLoadingOtp] = useState<boolean>(false);
  const [lastTick, setLastTick] = useState<number>(Date.now());
  const [lastGpsTime, setLastGpsTime] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState<boolean>(false);

  // Prevent unauthorized users from viewing locations
  const isAuthorized = useMemo(() => {
    return isAuthorizedToViewTracking(booking, userProfile, currentUser?.uid);
  }, [booking, userProfile, currentUser?.uid]);

  // Terminal lifecycle check: Stop tracking after COMPLETED or CANCELLED
  const isTerminalBooking = useMemo(() => {
    return isTrackingTerminal(booking.status, booking.trackingStatus);
  }, [booking.status, booking.trackingStatus]);

  // Automatic recovery when internet connection returns
  const handleReconnect = () => {
    if (booking.id && !isTerminalBooking) {
      getServiceTrackingRecord(booking.id).then((trackingDoc) => {
        if (trackingDoc?.servicemanLocation) {
          setLiveServicemanLocation({
            latitude: trackingDoc.servicemanLocation.latitude,
            longitude: trackingDoc.servicemanLocation.longitude,
            updatedAt: trackingDoc.servicemanLocation.timestamp,
          });
          setLastGpsTime(trackingDoc.servicemanLocation.timestamp || trackingDoc.lastUpdatedAt || null);
        }
      });
      requestCustomerGps();
    }
  };

  const { isOnline, wasOffline } = useNetworkStatus(handleReconnect);

  // Listen for real-time booking updates from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'bookings', initialBooking.id),
      (snapshot) => {
        if (snapshot.exists()) {
          setBooking({ id: snapshot.id, ...snapshot.data() } as Booking);
        }
      },
      (err) => {
        console.warn('Booking tracker listener notice:', err.message);
      }
    );
    return () => unsub();
  }, [initialBooking.id]);

  // Listen for real-time live GPS serviceTracking updates
  const [liveServicemanLocation, setLiveServicemanLocation] = useState<ServiceManLocationData | undefined>(
    initialBooking.serviceManLocation
  );
  const [liveCustomerLocation, setLiveCustomerLocation] = useState<TrackingLocationPoint | null>(null);
  const [liveTrackingStatus, setLiveTrackingStatus] = useState<string>(
    initialBooking.trackingStatus || initialBooking.status
  );
  const [liveEtaSeconds, setLiveEtaSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (!initialBooking.id || isTerminalBooking) return;
    const unsubTracking = subscribeToServiceTracking(initialBooking.id, (trackingDoc) => {
      if (trackingDoc) {
        if (trackingDoc.servicemanLocation) {
          setLiveServicemanLocation({
            latitude: trackingDoc.servicemanLocation.latitude,
            longitude: trackingDoc.servicemanLocation.longitude,
            updatedAt: trackingDoc.servicemanLocation.timestamp,
          });
          setLastGpsTime(trackingDoc.servicemanLocation.timestamp || trackingDoc.lastUpdatedAt || null);
        }
        if (trackingDoc.customerLocation) {
          setLiveCustomerLocation(trackingDoc.customerLocation);
        }
        if (trackingDoc.status) {
          setLiveTrackingStatus(trackingDoc.status);
        }
        if (typeof trackingDoc.etaSeconds === 'number') {
          setLiveEtaSeconds(trackingDoc.etaSeconds);
        }
      }
    });
    return () => unsubTracking();
  }, [initialBooking.id, isTerminalBooking]);

  // Periodic tick for ETA and "last updated" text refresh
  useEffect(() => {
    const timer = setInterval(() => {
      setLastTick(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Customer device GPS request and automatic error handling
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
        setLiveCustomerLocation(pt);
        if (booking.id && !isTerminalBooking) {
          updateCustomerTrackingLocation(booking.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }).catch(() => {});
        }
      },
      (err) => {
        setGpsErrorFromCode(err.code, err.message);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (!isTerminalBooking) {
      requestCustomerGps();
    }
  }, [booking.id, isTerminalBooking]);

  // Phase 12: Live tracking error info
  const trackingErrorInfo = useMemo(() => {
    return getLiveTrackingErrorInfo({
      isOnline,
      wasOffline,
      gpsState,
      gpsErrorMessage,
      hasServicemanLocation: Boolean(liveServicemanLocation || booking.serviceManLocation),
      isTerminal: isTerminalBooking,
    });
  }, [
    isOnline,
    wasOffline,
    gpsState,
    gpsErrorMessage,
    liveServicemanLocation,
    booking.serviceManLocation,
    isTerminalBooking,
  ]);

  // Fetch or generate Arrival OTP when appropriate
  const isEligibleForOtp =
    ['on_the_way', 'arriving', 'arrived', 'otp_pending', 'in_progress', 'work_started'].includes(
      booking.status
    ) ||
    ['arriving', 'arrived', 'otp_pending', 'work_started'].includes(
      booking.trackingStatus || ''
    );

  useEffect(() => {
    if (isEligibleForOtp && !arrivalOtp && !booking.workStartedAt && booking.status !== 'completed') {
      setIsLoadingOtp(true);
      getOrCreateArrivalOtp(booking.id, booking.customerId)
        .then((res) => {
          if (res.success && res.arrivalOtp) {
            setArrivalOtp(res.arrivalOtp);
            setOtpExpiresAt(res.expiresAt);
          }
        })
        .catch((err) => console.warn('Arrival OTP generation error:', err))
        .finally(() => setIsLoadingOtp(false));
    }
  }, [isEligibleForOtp, booking.id, booking.customerId, booking.workStartedAt, booking.status]);

  // Assigned Professional info lookup
  const proInfo = useMemo(() => {
    const found = serviceMen.find(
      (p) => p.id === booking.serviceManId || p.name === booking.serviceManName
    );
    return {
      name: booking.serviceManName || found?.name || 'Assigned Professional',
      phone: booking.serviceManPhone || found?.phone || '',
      photo: found?.profileImage || found?.photoUrl || undefined,
      rating: found?.rating || 4.9,
      totalJobs: found?.completedBookings || 140,
      category: booking.categoryName || found?.trade || 'Technical Specialist',
    };
  }, [serviceMen, booking]);

  // Destination coordinates
  const destinationCoords = useMemo(
    () => resolveAddressCoordinates(booking.address, booking.city),
    [booking.address, booking.city]
  );

  // Status computation
  const isUnableToReach =
    booking.unableToReach === true ||
    booking.isUnableToReach === true ||
    booking.trackingStatus === 'unable_to_reach' ||
    booking.status === 'unable_to_reach' ||
    booking.status === 'service_man_unable_to_reach' ||
    booking.reassignmentStatus === 'pending_reassignment';

  const isWorkStarted =
    booking.status === 'in_progress' ||
    booking.status === 'work_started' ||
    booking.trackingStatus === 'work_started' ||
    booking.trackingStatus === 'WORK_STARTED' ||
    !!booking.workStartedAt;

  const isArrived =
    booking.status === 'arrived' ||
    booking.trackingStatus === 'arrived' ||
    booking.trackingStatus === 'otp_pending';

  const isOnTheWay =
    booking.status === 'on_the_way' ||
    booking.trackingStatus === 'on_the_way' ||
    booking.trackingStatus === 'arriving';

  const etaText = useMemo(
    () => (booking.serviceManLocation ? getArrivalEtaText(booking.etaMinutes) : 'ETA unavailable'),
    [booking.serviceManLocation, booking.etaMinutes, lastTick]
  );

  const lastUpdatedText = useMemo(
    () => getLastUpdatedText(booking.lastLocationUpdate),
    [booking.lastLocationUpdate, lastTick]
  );

  // Pro and Customer / Destination Coordinates for Distance Calculation
  const proCoords = liveServicemanLocation || booking.serviceManLocation;
  const custCoords = liveCustomerLocation || destinationCoords;
  const custLatitude = (liveCustomerLocation as any)?.latitude ?? (destinationCoords as any)?.lat ?? (destinationCoords as any)?.latitude;
  const custLongitude = (liveCustomerLocation as any)?.longitude ?? (destinationCoords as any)?.lng ?? (destinationCoords as any)?.longitude;

  const liveDistanceKm = useMemo(() => {
    if (
      proCoords?.latitude &&
      proCoords?.longitude &&
      custLatitude &&
      custLongitude
    ) {
      return calculateHaversineDistanceKm(
        proCoords.latitude,
        proCoords.longitude,
        custLatitude,
        custLongitude
      );
    }
    return null;
  }, [proCoords?.latitude, proCoords?.longitude, custLatitude, custLongitude]);

  const formattedDistance = useMemo(() => {
    if (isArrived || isWorkStarted) return 'At location';
    if (booking.status === 'completed') return '0 km';
    if (liveDistanceKm !== null) {
      return formatRouteDistance(liveDistanceKm);
    }
    return 'Distance calculating...';
  }, [liveDistanceKm, isArrived, isWorkStarted, booking.status]);

  const distanceSubtext = useMemo(() => {
    if (isArrived || isWorkStarted) return 'Serviceman reached';
    if (booking.status === 'completed') return 'Job completed';
    if (liveDistanceKm !== null) return 'Live GPS transit';
    return 'Live location unavailable';
  }, [liveDistanceKm, isArrived, isWorkStarted, booking.status]);

  const formattedEta = useMemo(() => {
    if (booking.status === 'completed') return 'Completed';
    if (isWorkStarted) return 'In Progress';
    if (isArrived) return 'Arrived';
    if (typeof liveEtaSeconds === 'number' && liveEtaSeconds > 0) {
      return `~${Math.ceil(liveEtaSeconds / 60)} min${Math.ceil(liveEtaSeconds / 60) > 1 ? 's' : ''}`;
    }
    if (typeof booking.etaMinutes === 'number' && booking.etaMinutes > 0) {
      return `~${booking.etaMinutes} min${booking.etaMinutes > 1 ? 's' : ''}`;
    }
    return 'ETA unavailable';
  }, [liveEtaSeconds, booking.etaMinutes, isArrived, isWorkStarted, booking.status]);

  const etaSubtext = useMemo(() => {
    if (booking.status === 'completed') return 'Service done';
    if (isWorkStarted) return 'Work started';
    if (isArrived) return 'Enter arrival OTP';
    if (formattedEta === 'ETA unavailable') return 'Calculating route ETA';
    return 'Estimated arrival';
  }, [isArrived, isWorkStarted, booking.status, formattedEta]);

  const formattedLastUpdate = useMemo(() => {
    const ts = lastGpsTime || liveServicemanLocation?.updatedAt || booking.lastLocationUpdate;
    return formatLastUpdatedAgo(ts);
  }, [lastGpsTime, liveServicemanLocation?.updatedAt, booking.lastLocationUpdate, lastTick]);

  const liveStatusConfig = useMemo(() => {
    if (isUnableToReach) {
      return {
        label: 'Reassigning Technician',
        subLabel: 'नया तकनीशियन खोज रहे हैं',
        badgeClass: 'bg-amber-100 text-amber-950 border-amber-300',
        dotClass: 'bg-amber-600 animate-pulse',
      };
    }
    if (booking.status === 'completed') {
      return {
        label: 'Service Completed',
        subLabel: 'काम पूरा हुआ ✓',
        badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        dotClass: 'bg-emerald-600',
      };
    }
    if (isWorkStarted) {
      return {
        label: 'Work In Progress',
        subLabel: 'काम चालू है (OTP Verified)',
        badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
        dotClass: 'bg-emerald-600 animate-ping',
      };
    }
    if (isArrived) {
      return {
        label: 'Technician Arrived',
        subLabel: 'पहुँच गए हैं',
        badgeClass: 'bg-blue-100 text-blue-950 border-blue-300',
        dotClass: 'bg-blue-600 animate-pulse',
      };
    }
    if (isOnTheWay) {
      return {
        label: 'On The Way',
        subLabel: 'रास्ते में हैं',
        badgeClass: 'bg-orange-100 text-orange-950 border-orange-300',
        dotClass: 'bg-orange-600 animate-ping',
      };
    }
    return {
      label: 'Assigned & Preparing',
      subLabel: 'तकनीशियन असाइन',
      badgeClass: 'bg-stone-100 text-stone-900 border-stone-300',
      dotClass: 'bg-stone-500 animate-pulse',
    };
  }, [isUnableToReach, booking.status, isWorkStarted, isArrived, isOnTheWay]);

  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  const handleCopyOtp = () => {
    if (!arrivalOtp) return;
    navigator.clipboard.writeText(arrivalOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2500);
  };

  const handleSendQuickMessage = async (text: string) => {
    try {
      const nowIso = new Date().toISOString();
      await addDoc(collection(db, 'messages'), {
        bookingId: booking.id,
        senderId: booking.customerId || 'customer',
        senderName: booking.customerName || 'Customer',
        receiverId: booking.serviceManId || 'pro_serviceman',
        text,
        timestamp: nowIso,
        read: false,
      });
      onOpenChat(booking);
    } catch (err) {
      console.error('Failed to send quick message:', err);
      onOpenChat(booking);
    }
  };

  const handleCallPro = () => {
    if (proInfo.phone) {
      window.open(`tel:${proInfo.phone}`, '_self');
    } else {
      window.open('tel:+916267546945', '_self');
    }
  };

  // Customer Availability State
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'call_before_arriving' | 'not_at_home'>(
    booking.customerAvailabilityStatus || 'available'
  );
  const [landmarkNote, setLandmarkNote] = useState<string>(booking.customerLandmarkNote || '');
  const [isSavingAvailability, setIsSavingAvailability] = useState<boolean>(false);
  const [availabilitySavedSuccess, setAvailabilitySavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (booking.customerAvailabilityStatus) {
      setAvailabilityStatus(booking.customerAvailabilityStatus);
    }
    if (booking.customerLandmarkNote !== undefined) {
      setLandmarkNote(booking.customerLandmarkNote);
    }
  }, [booking.customerAvailabilityStatus, booking.customerLandmarkNote]);

  const handleSaveAvailability = async (
    newStatus?: 'available' | 'call_before_arriving' | 'not_at_home',
    noteText?: string
  ) => {
    const statusToUse = newStatus || availabilityStatus;
    const noteToUse = noteText !== undefined ? noteText : landmarkNote;
    setIsSavingAvailability(true);
    try {
      const res = await updateCustomerAvailability(booking.id, statusToUse, noteToUse);
      if (res.success) {
        setAvailabilitySavedSuccess(true);
        setTimeout(() => setAvailabilitySavedSuccess(false), 3000);
      }
    } catch (e) {
      console.warn('Failed to update availability:', e);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  // 6-step Visual Tracking Timeline
  const timelineSteps = useMemo(() => {
    const isCompleted =
      booking.status === 'completed' ||
      booking.status === 'work_completed' ||
      booking.trackingStatus === 'COMPLETED' ||
      booking.trackingStatus === 'completed' ||
      !!booking.finalBill;
    const isStarted =
      isCompleted ||
      booking.status === 'in_progress' ||
      booking.status === 'work_started' ||
      booking.trackingStatus === 'WORK_STARTED' ||
      booking.trackingStatus === 'work_started' ||
      !!booking.workStartedAt;
    const isArr = isStarted || booking.trackingStatus === 'arrived' || booking.trackingStatus === 'otp_pending' || booking.status === 'arrived' || !!booking.arrivedAt;
    const isEnRoute = isArr || booking.status === 'on_the_way' || booking.trackingStatus === 'on_the_way' || booking.trackingStatus === 'arriving' || !!booking.onTheWayAt;
    const isAssigned = isEnRoute || !!booking.serviceManId || ['assigned', 'accepted'].includes(booking.status);
    const isConfirmed = true;

    return [
      {
        id: 'confirmed',
        title: 'Booking Confirmed',
        subTitle: 'बुकिंग कन्फर्म',
        isDone: isConfirmed,
        isCurrent: isConfirmed && !isAssigned,
        time: booking.createdAt ? new Date(booking.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      },
      {
        id: 'assigned',
        title: 'Tech Assigned',
        subTitle: 'तकनीशियन',
        isDone: isAssigned,
        isCurrent: isAssigned && !isEnRoute,
        time: booking.acceptedAt ? new Date(booking.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      },
      {
        id: 'on_the_way',
        title: 'On The Way',
        subTitle: 'रास्ते में',
        isDone: isEnRoute,
        isCurrent: isEnRoute && !isArr,
        time: booking.onTheWayAt ? new Date(booking.onTheWayAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      },
      {
        id: 'arrived',
        title: 'Arrived',
        subTitle: 'पहुँच गए',
        isDone: isArr,
        isCurrent: isArr && !isStarted,
        time: booking.arrivedAt ? new Date(booking.arrivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      },
      {
        id: 'in_progress',
        title: 'In Progress',
        subTitle: 'काम चालू',
        isDone: isStarted,
        isCurrent: isStarted && !isCompleted,
        time: booking.workStartedAt ? new Date(booking.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      },
      {
        id: 'completed',
        title: 'Completed',
        subTitle: 'काम पूरा',
        isDone: isCompleted,
        isCurrent: isCompleted,
        time: booking.completedAt ? new Date(booking.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
      },
    ];
  }, [booking]);

  return (
    <div
      id="live-service-tracker-modal"
      className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  Live Service Professional Tracking
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/25 backdrop-blur-xs">
                  #{booking.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-orange-100 font-medium">
                Real-time transit location &amp; secure arrival verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* FCM Push Notification Status & Quick Enable Banner */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-xl bg-indigo-600 text-white shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-indigo-950 block">रियल-टाइम पुश नोटिफिकेशन (FCM Alerts)</span>
                <span className="text-[11px] text-indigo-700 block truncate">
                  {isPushSubscribed
                    ? 'सक्रिय: तकनीशियन आगमन व स्टेटस अपडेट सीधे स्क्रीन पर प्राप्त होंगे'
                    : 'तकनीशियन की लोकेशन व ओटीपी अलर्ट तुरंत पाने हेतु पुश सूचना चालू करें'}
                </span>
              </div>
            </div>

            {!isPushSubscribed && pushPermission !== 'denied' && (
              <button
                type="button"
                onClick={() => enablePushNotifications()}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition"
              >
                चालू करें (Enable)
              </button>
            )}

            {isPushSubscribed && (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0 border border-emerald-200">
                Active ✓
              </span>
            )}
          </div>

          {/* Phase 12: Live Tracking Status / Error Banner (GPS Off, GPS Denied, Internet Disconnected, Serviceman Unavailable) */}
          {trackingErrorInfo && (
            <div
              id="live-tracking-status-alert-banner"
              className={`p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold transition-all ${
                trackingErrorInfo.severity === 'error'
                  ? 'bg-rose-50 border-2 border-rose-300 text-rose-950 shadow-xs'
                  : trackingErrorInfo.severity === 'warning'
                  ? 'bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-xs'
                  : trackingErrorInfo.severity === 'success'
                  ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-xs'
                  : 'bg-stone-100 border border-stone-200 text-stone-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {trackingErrorInfo.severity === 'error' ? (
                  <WifiOff className="w-4 h-4 text-rose-600 shrink-0" />
                ) : trackingErrorInfo.severity === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : trackingErrorInfo.severity === 'success' ? (
                  <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-stone-500 shrink-0" />
                )}
                <span>{trackingErrorInfo.message}</span>
              </div>
              {(trackingErrorInfo.type === 'gps_off' || trackingErrorInfo.type === 'gps_permission_denied') && (
                <button
                  type="button"
                  onClick={requestCustomerGps}
                  className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-[11px] font-bold text-amber-900 cursor-pointer shrink-0 transition-colors"
                >
                  Retry GPS
                </button>
              )}
            </div>
          )}

          {/* Reassignment / Inability to Reach Banner */}
          {isUnableToReach && (
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="text-sm font-black text-amber-950">
                      तकनीशियन असमर्थता (Technician Reassignment in Progress)
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 uppercase">
                      Reassignment
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 mt-1 font-semibold">
                    {booking.unableToReachReason
                      ? `कारण: ${booking.unableToReachReason}`
                      : 'सेवा प्रदाता किसी कारणवश नहीं पहुँच पा रहे हैं।'}
                  </p>
                  <p className="text-[11px] text-amber-800 mt-1">
                    चिंता न करें, आपकी बुकिंग सुरक्षित है। हार्डिनकाम सिस्टम व फ्रेंचाइज़ी टीम आपके लिए तुरंत दूसरा उपलब्ध तकनीशियन असाइन कर रही है।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PRIMARY LIVE TRACKING SCREEN OVERVIEW CARD (PHASE 11) */}
          <div
            id="live-tracking-primary-metrics-card"
            className="rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30 border-2 border-orange-200/80 shadow-sm space-y-4"
          >
            {/* Top Row: Serviceman Name & Current Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/70">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-13 h-13 rounded-2xl bg-orange-100 border-2 border-orange-200 overflow-hidden flex items-center justify-center text-orange-600 font-black text-xl shadow-xs">
                    {proInfo.photo ? (
                      <img
                        src={proInfo.photo}
                        alt={proInfo.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      proInfo.name.charAt(0)
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base sm:text-lg font-black text-stone-900 tracking-tight">
                      {proInfo.name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {proInfo.rating}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Pro
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 font-medium mt-0.5">
                    {proInfo.category} • {booking.serviceName}
                  </p>
                </div>
              </div>

              {/* Current Status Badge */}
              <div className="self-start sm:self-auto">
                <div
                  className={`px-3 py-1.5 rounded-2xl text-xs font-black border flex items-center gap-2 shadow-2xs ${liveStatusConfig.badgeClass}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${liveStatusConfig.dotClass}`} />
                  <div>
                    <span className="block leading-tight text-xs">{liveStatusConfig.label}</span>
                    <span className="block text-[10px] font-medium opacity-85 leading-tight">
                      {liveStatusConfig.subLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Live Tracking Metrics: Distance, ETA, Last Location Update */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
              {/* Metric 1: Distance */}
              <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                  <Navigation className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>Distance</span>
                </div>
                <div>
                  <div className="text-base sm:text-xl font-black text-stone-900 leading-tight">
                    {formattedDistance}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-medium text-stone-500 truncate mt-0.5">
                    {distanceSubtext}
                  </div>
                </div>
              </div>

              {/* Metric 2: ETA */}
              <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>ETA</span>
                </div>
                <div>
                  <div className="text-base sm:text-xl font-black text-stone-900 leading-tight">
                    {formattedEta}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-medium text-stone-500 truncate mt-0.5">
                    {etaSubtext}
                  </div>
                </div>
              </div>

              {/* Metric 3: Last Location Update */}
              <div className="p-3 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Last Update</span>
                </div>
                <div>
                  <div className="text-base sm:text-xl font-black text-stone-900 leading-tight truncate">
                    {formattedLastUpdate}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-medium text-stone-500 truncate mt-0.5">
                    {liveServicemanLocation ? 'Live GPS Sync' : 'Live location unavailable'}
                  </div>
                </div>
              </div>
            </div>

            {/* Simple Buttons: Call Serviceman & Help */}
            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 pt-1">
              <button
                type="button"
                id="live-tracking-call-serviceman-btn"
                onClick={handleCallPro}
                className="col-span-1 sm:col-span-5 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Call Serviceman</span>
              </button>

              <button
                type="button"
                id="live-tracking-help-btn"
                onClick={() => setIsHelpOpen(true)}
                className="col-span-1 sm:col-span-4 py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 active:scale-[0.99] text-stone-800 text-xs sm:text-sm font-black flex items-center justify-center gap-2 border-2 border-stone-200 hover:border-stone-300 shadow-2xs transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-orange-600" />
                <span>Help</span>
              </button>

              <button
                type="button"
                id="live-tracking-message-btn"
                onClick={() => onOpenChat(booking)}
                className="col-span-2 sm:col-span-3 py-3 px-3 rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-[0.99] text-stone-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 border border-stone-200 shadow-2xs transition-all cursor-pointer"
                title="Send Chat Message"
              >
                <MessageSquare className="w-4 h-4 text-orange-600" />
                <span>Message</span>
              </button>
            </div>

            {/* Quick Messages for Quick Update */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Quick Message:</span>
              <button
                type="button"
                onClick={() => handleSendQuickMessage('मैं आपका इंतजार कर रहा हूँ')}
                className="text-[11px] px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-medium transition-colors cursor-pointer"
              >
                मैं आपका इंतजार कर रहा हूँ
              </button>
              <button
                type="button"
                onClick={() => handleSendQuickMessage('आप कितनी देर में पहुँचेंगे?')}
                className="text-[11px] px-2.5 py-1 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-medium transition-colors cursor-pointer"
              >
                आप कितनी देर में पहुँचेंगे?
              </button>
            </div>
          </div>

          {/* 6-Step Visual Tracking Timeline */}
          <div className="p-3 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-stone-800 uppercase tracking-wider">
              <span>Service Timeline (सेवा प्रगति)</span>
              <span className="text-[11px] font-semibold text-stone-500 lowercase">live milestones</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {timelineSteps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                    step.isCurrent
                      ? 'bg-orange-50 border-orange-400 shadow-xs ring-1 ring-orange-300'
                      : step.isDone
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : 'bg-white border-stone-200 text-stone-400 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-extrabold text-stone-400">
                      0{idx + 1}
                    </span>
                    {step.isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : step.isCurrent ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border border-stone-300 shrink-0" />
                    )}
                  </div>
                  <div>
                    <h5
                      className={`text-[11px] font-bold leading-tight ${
                        step.isCurrent
                          ? 'text-orange-950'
                          : step.isDone
                          ? 'text-emerald-950'
                          : 'text-stone-500'
                      }`}
                    >
                      {step.title}
                    </h5>
                    <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">
                      {step.subTitle}
                    </p>
                  </div>
                  {step.time && (
                    <span className="text-[9px] font-bold text-stone-600 mt-1 block">
                      {step.time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Customer Availability & Landmark Instructions Card */}
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-orange-600" />
                <h5 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  आपकी उपलब्धता (Your Availability Status)
                </h5>
              </div>
              {availabilitySavedSuccess && (
                <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> सुरक्षित हुआ (Saved)
                </span>
              )}
            </div>

            <p className="text-xs text-stone-600">
              तकनीशियन को बताएं कि क्या आप घर पर उपलब्ध हैं अथवा उन्हें कॉल करके आना चाहिए:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAvailabilityStatus('available');
                  handleSaveAvailability('available');
                }}
                disabled={isSavingAvailability}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer ${
                  availabilityStatus === 'available'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    availabilityStatus === 'available'
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-stone-400'
                  }`}
                >
                  {availabilityStatus === 'available' && <Check className="w-3 h-3" />}
                </div>
                <span>🏠 मैं घर पर उपलब्ध हूँ (Available at Home)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAvailabilityStatus('call_before_arriving');
                  handleSaveAvailability('call_before_arriving');
                }}
                disabled={isSavingAvailability}
                className={`p-2.5 rounded-xl border text-xs font-bold text-left flex items-center gap-2 transition cursor-pointer ${
                  availabilityStatus === 'call_before_arriving'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    availabilityStatus === 'call_before_arriving'
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-stone-400'
                  }`}
                >
                  {availabilityStatus === 'call_before_arriving' && <Check className="w-3 h-3" />}
                </div>
                <span>📞 पहुँचने से पहले कॉल करें (Call before arriving)</span>
              </button>
            </div>

            {/* Landmark / Address notes input */}
            <div className="pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={landmarkNote}
                  onChange={(e) => setLandmarkNote(e.target.value)}
                  placeholder="लैंडमार्क / गेट निर्देश (उदा. गेट नं. 2, दूसरी मंजिल, मंदिर के पीछे)"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleSaveAvailability(undefined, landmarkNote)}
                  disabled={isSavingAvailability}
                  className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>अपडेट करें</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Visual Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-orange-600" />
                Live Map &amp; Transit Route
              </span>
              <span className="text-[11px] font-semibold text-stone-500">
                Destination: {booking.address}, {booking.city || 'Bhopal'}
              </span>
            </div>

            <LiveTrackingMap
              proLocation={liveServicemanLocation || booking.serviceManLocation}
              customerLocation={liveCustomerLocation}
              destinationCoords={destinationCoords}
              customerAddress={booking.address}
              customerCity={booking.city}
              proName={proInfo.name}
              proPhoto={proInfo.photo}
              trackingStatus={liveTrackingStatus || booking.trackingStatus || booking.status}
              bookingStatus={booking.status}
              etaMinutes={typeof liveEtaSeconds === 'number' && liveEtaSeconds > 0 ? Math.ceil(liveEtaSeconds / 60) : booking.etaMinutes}
              etaSeconds={liveEtaSeconds}
              height="280px"
              interactive={true}
              lastUpdatedAt={lastGpsTime || liveServicemanLocation?.updatedAt}
              isOffline={!isOnline}
              wasOffline={wasOffline}
              isGpsUnavailable={gpsState === 'unavailable' || gpsState === 'denied' || gpsState === 'timeout' || gpsState === 'off'}
              gpsErrorMessage={gpsErrorMessage}
              onRetryGps={requestCustomerGps}
              isUnauthorized={!isAuthorized}
              isTrackingStopped={isTerminalBooking}
            />
          </div>

          {/* ARRIVAL OTP SECTION */}
          {!isWorkStarted ? (
            <div
              id="customer-arrival-otp-card"
              className="rounded-3xl p-5 border-2 border-orange-200 bg-gradient-to-br from-amber-50 via-orange-50/60 to-white shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-orange-200/70">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-900">
                      Arrival Verification OTP
                    </h4>
                    <p className="text-xs text-stone-600">
                      Share this OTP to start the service.
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                  {isArrived ? 'Technician Arrived' : 'Secure Arrival Code'}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-2 text-center">
                <p className="text-xs font-semibold text-stone-600 mb-2">
                  When your technician reaches your address, share this secure code to authorize starting the job:
                </p>

                {/* Styled Secure OTP Display */}
                {isLoadingOtp ? (
                  <div className="flex items-center gap-2 text-orange-600 py-3">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span className="text-xs font-bold">Generating secure arrival OTP...</span>
                  </div>
                ) : arrivalOtp ? (
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex items-center gap-2">
                      {arrivalOtp.split('').map((digit, idx) => (
                        <span
                          key={idx}
                          className="w-12 h-14 rounded-2xl bg-white border-2 border-orange-400 text-orange-950 font-black text-2xl flex items-center justify-center shadow-md tracking-tight"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="p-3 rounded-2xl bg-white border border-orange-200 text-orange-700 hover:bg-orange-100 transition-colors shadow-xs cursor-pointer flex items-center justify-center"
                      title="Copy OTP"
                    >
                      {copiedOtp ? (
                        <Check className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-xs text-stone-500">
                      OTP will be generated automatically when technician reaches your area.
                    </p>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 text-[11px] text-stone-500">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {otpExpiresAt
                      ? `Valid until ${new Date(otpExpiresAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Valid for 25 minutes'}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold">Server Authenticated</span>
                </div>

                {/* Show Booking QR Code Button */}
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="mt-3.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  title="Show QR Code on your screen for serviceman to scan"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Show Booking QR Code for Technician</span>
                </button>
              </div>
            </div>
          ) : booking.status === 'completed' || booking.finalBill ? (
            /* Work Completed: Display Official Hardinkaam Service Bill */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950">
                      Service Completed (काम पूरा हुआ ✓)
                    </h4>
                    <p className="text-xs text-emerald-800 font-medium">
                      Duration: {booking.finalBill?.workDurationFormatted || booking.workDurationFormatted || 'Completed'}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Bill Generated
                </span>
              </div>

              {/* Immutable Final Bill Snapshot */}
              <HardinkaamServiceBill
                bill={booking.finalBill}
                booking={booking}
              />

              {/* Feedback & Review Callout */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Star className="w-5 h-5 fill-white" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-stone-900">
                      {booking.isReviewed ? 'Feedback Submitted ✓' : 'Rate Your Service Experience'}
                    </h5>
                    <p className="text-[11px] text-stone-600">
                      {booking.isReviewed
                        ? `You rated this service ${booking.rating || 5}★. Thank you for helping our Bhopal community!`
                        : `Share honest feedback for ${booking.serviceManName || 'your professional'} to help improve service quality.`}
                    </p>
                  </div>
                </div>

                {!booking.isReviewed ? (
                  <button
                    type="button"
                    onClick={() => setIsFeedbackOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Star className="w-3.5 h-3.5 fill-white" />
                    <span>Rate Experience</span>
                  </button>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{booking.rating || 5}★ Rated</span>
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* Work Started: Live Timer and Extra Charges Approval Manager */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                      Arrival OTP Verified ✓
                    </h4>
                    <p className="text-xs text-emerald-800 font-medium">
                      Service started {booking.workStartedAt ? `at ${new Date(booking.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Work In Progress
                </span>
              </div>

              {/* Live Work Timer */}
              <WorkServiceTimer
                workStartedAt={booking.workStartedAt || booking.startedAt}
                workEndedAt={booking.workEndedAt}
                status={booking.status}
                workDurationFormatted={booking.workDurationFormatted}
              />

              {/* Transparent Extra Charges Review & Approval */}
              <ExtraChargesManager
                booking={booking}
                userRole="customer"
                userId={booking.userId || 'customer'}
                userName={booking.userName}
              />
            </div>
          )}

          {/* Booking Summary Details */}
          <div className="rounded-2xl bg-stone-50 p-4 border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                Booking ID
              </span>
              <span className="font-black text-stone-900">#{booking.id.slice(-6)}</span>
            </div>
            <div>
              <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                Scheduled Slot
              </span>
              <span className="font-bold text-stone-800">
                {booking.scheduledDate} ({booking.scheduledTime})
              </span>
            </div>
            <div>
              <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                Total Amount
              </span>
              <span className="font-black text-stone-900">₹{booking.amount}</span>
            </div>
            <div>
              <span className="text-stone-400 font-bold uppercase tracking-wider text-[10px] block">
                Payment Status
              </span>
              <span
                className={`font-bold capitalize ${
                  booking.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {booking.paymentStatus} ({booking.paymentMethod})
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Customer Safety Guaranteed • HARDINKAAM Verified</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            Close Tracking
          </button>
        </div>
      </div>

      {/* Customer Help / Support Modal */}
      {isHelpOpen && (
        <CustomerHelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          recentBookings={[booking]}
        />
      )}

      {/* Customer Booking QR Modal */}
      <CustomerBookingQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        booking={booking}
        arrivalOtp={arrivalOtp || booking.otp}
      />

      {/* Post-Service Feedback & Rating Modal */}
      {isFeedbackOpen && (
        <PostServiceFeedbackModal
          isOpen={isFeedbackOpen}
          booking={booking}
          onClose={() => setIsFeedbackOpen(false)}
          onSubmitted={() => {
            setIsFeedbackOpen(false);
          }}
        />
      )}
    </div>
  );
};

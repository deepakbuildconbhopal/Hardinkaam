import React, { useState, useEffect } from 'react';
import {
  Navigation,
  MapPin,
  Compass,
  Phone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  ExternalLink,
  RefreshCw,
  LocateFixed,
  Lock,
  X,
  UserX,
  HelpCircle,
  Home,
  BellRing,
  QrCode,
  Camera,
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Booking, ServiceManLocationData } from '../../types';
import { useNotifications } from '../../context/NotificationContext';
import {
  requestProLocationPermission,
  startProLocationTracking,
  stopProLocationTracking,
  resolveAddressCoordinates,
  calculateHaversineDistanceKm,
  getArrivalEtaText,
  UNABLE_TO_REACH_REASONS,
  handleServiceManUnableToReach,
} from '../../services/serviceTrackingService';
import { verifyArrivalOtpServer } from '../../services/arrivalOtpService';
import {
  notifyOnTheWay,
  notifyArrived,
  notifyReassignment,
} from '../../services/bookingNotificationIntegrationService';

interface Props {
  booking: Booking;
  currentUserId?: string;
  onOpenChat?: (booking: Booking) => void;
  onStatusUpdated?: () => void;
  onOpenQrScanner?: (booking: Booking) => void;
}

export const ProArrivalVerificationCard: React.FC<Props> = ({
  booking,
  currentUserId,
  onOpenChat,
  onStatusUpdated,
  onOpenQrScanner,
}) => {
  const { sendNotification } = useNotifications();
  const [enteredOtp, setEnteredOtp] = useState<string>('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(
    booking.status === 'in_progress' ||
      booking.status === 'work_started' ||
      !!booking.workStartedAt
  );
  const [isTrackingGps, setIsTrackingGps] = useState<boolean>(false);
  const [gpsErrorNotice, setGpsErrorNotice] = useState<string | null>(null);
  const [currentDistanceKm, setCurrentDistanceKm] = useState<number | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Unable to Reach modal states
  const [showUnableModal, setShowUnableModal] = useState<boolean>(false);
  const [selectedUnableReason, setSelectedUnableReason] = useState<string>(UNABLE_TO_REACH_REASONS[0].label);
  const [unableShortNote, setUnableShortNote] = useState<string>('');
  const [submittingUnable, setSubmittingUnable] = useState<boolean>(false);

  const destination = resolveAddressCoordinates(booking.address, booking.city);

  // Sync state if booking updates externally
  useEffect(() => {
    if (booking.status === 'in_progress' || booking.status === 'work_started' || booking.workStartedAt) {
      setIsVerified(true);
      stopProLocationTracking(booking.id);
      setIsTrackingGps(false);
    }
  }, [booking.status, booking.workStartedAt, booking.id]);

  // If already ON_THE_WAY, resume GPS tracking if active
  useEffect(() => {
    if (booking.status === 'on_the_way' && !isVerified) {
      const stopFn = startProLocationTracking(
        booking.id,
        booking.serviceManId || currentUserId || '',
        booking.address,
        booking.city,
        (loc, eta) => {
          setIsTrackingGps(true);
          setGpsErrorNotice(null);
          const dist = calculateHaversineDistanceKm(
            loc.latitude,
            loc.longitude,
            destination.lat,
            destination.lng
          );
          setCurrentDistanceKm(dist);
        }
      );
      setIsTrackingGps(true);

      return () => {
        stopFn();
      };
    }
  }, [booking.status, booking.id, booking.serviceManId, currentUserId, booking.address, booking.city, isVerified]);

  // Clean up tracking on unmount
  useEffect(() => {
    return () => {
      stopProLocationTracking(booking.id);
    };
  }, [booking.id]);

  // Open external Google Maps turn-by-turn navigation
  const handleOpenNavigation = () => {
    const destQuery = encodeURIComponent(
      `${booking.address}, ${booking.city || 'Bhopal'}, Madhya Pradesh`
    );
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destQuery}`, '_blank');
  };

  // 1. "ON THE WAY" Trigger
  const handleStartOnTheWay = async () => {
    setIsUpdatingStatus(true);
    setGpsErrorNotice(null);
    try {
      const permissionGranted = await requestProLocationPermission();
      const nowIso = new Date().toISOString();

      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        status: 'on_the_way',
        trackingStatus: 'on_the_way',
        onTheWayAt: nowIso,
        updatedAt: nowIso,
      });

      // Send Customer notification (deduplicated)
      await notifyOnTheWay(booking);

      if (permissionGranted) {
        startProLocationTracking(
          booking.id,
          booking.serviceManId || currentUserId || '',
          booking.address,
          booking.city,
          (loc, eta) => {
            setIsTrackingGps(true);
            setGpsErrorNotice(null);
            const dist = calculateHaversineDistanceKm(
              loc.latitude,
              loc.longitude,
              destination.lat,
              destination.lng
            );
            setCurrentDistanceKm(dist);
          }
        );
        setIsTrackingGps(true);
      } else {
        setGpsErrorNotice('Location permission not granted. Approximate transit ETA will be used.');
      }

      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      console.error('Failed to update status to on_the_way:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 2. "ARRIVED" Trigger
  const handleMarkArrived = async () => {
    setIsUpdatingStatus(true);
    try {
      const nowIso = new Date().toISOString();
      const bookingRef = doc(db, 'bookings', booking.id);
      await updateDoc(bookingRef, {
        status: 'on_the_way', // Remains active transit/arrival state
        trackingStatus: 'arrived',
        arrivedAt: nowIso,
        updatedAt: nowIso,
      });

      // Stop high-frequency GPS tracking once arrived
      stopProLocationTracking(booking.id);
      setIsTrackingGps(false);

      // Send customer arrival notification (deduplicated)
      await notifyArrived(booking);

      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      console.error('Failed to mark arrived:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 3. "मैं नहीं पहुँच पाऊँगा" (Unable to Reach) Trigger
  const handleSubmitUnableToReach = async () => {
    if (!selectedUnableReason) return;
    setSubmittingUnable(true);
    try {
      const result = await handleServiceManUnableToReach(
        booking,
        selectedUnableReason,
        unableShortNote
      );

      if (result.success) {
        // Send Notification to customer & franchise (deduplicated)
        await notifyReassignment(booking, selectedUnableReason);

        setShowUnableModal(false);
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err) {
      console.error('Error in unable to reach:', err);
    } finally {
      setSubmittingUnable(false);
    }
  };

  // 4. Server-Authoritative Arrival OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifyingOtp || isVerified) return;
    if (!enteredOtp || enteredOtp.trim().length < 4) {
      setOtpError('Please enter the 4-digit code provided by the customer.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError('');

    try {
      const result = await verifyArrivalOtpServer(
        booking.id,
        enteredOtp.trim(),
        booking.serviceManId || currentUserId || ''
      );

      if (result.success) {
        setIsVerified(true);
        stopProLocationTracking(booking.id);
        setIsTrackingGps(false);
        if (onStatusUpdated) onStatusUpdated();
      } else {
        setOtpError(result.message);
        if (result.isLocked) {
          setIsLocked(true);
        }
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification error. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const isArrived =
    booking.trackingStatus === 'arrived' ||
    booking.trackingStatus === 'otp_pending' ||
    booking.status === 'arrived';

  const isUnableToReach = booking.status === 'service_man_unable_to_reach';

  if (isUnableToReach) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
          <UserX className="w-4 h-4 text-amber-700" />
          <span>असमर्थता दर्ज (Unable to reach recorded)</span>
        </div>
        <p className="text-xs text-stone-700">
          कारण: <strong>{booking.unableToReachReason}</strong>
          {booking.unableToReachNote && ` • "${booking.unableToReachNote}"`}
        </p>
        <p className="text-[11px] text-amber-800">
          आपके लिए यह बुकिंग सुरक्षित रूप से री-असाइनमेंट कतार में भेज दी गई है।
        </p>
      </div>
    );
  }

  const handleSendProQuickMessage = async (text: string) => {
    try {
      const nowIso = new Date().toISOString();
      await addDoc(collection(db, 'messages'), {
        bookingId: booking.id,
        senderId: booking.serviceManId || currentUserId || 'pro_serviceman',
        senderName: booking.serviceManName || 'Technician',
        receiverId: booking.customerId,
        text,
        timestamp: nowIso,
        read: false,
      });
      if (onOpenChat) onOpenChat(booking);
    } catch (err) {
      console.error('Failed to send pro quick message:', err);
      if (onOpenChat) onOpenChat(booking);
    }
  };

  return (
    <div
      id={`pro-tracking-card-${booking.id}`}
      className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-4"
    >
      {/* Customer Contact & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-200">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
            Customer Service Address
          </span>
          <h4 className="text-sm font-extrabold text-stone-900 mt-0.5">
            {booking.customerName}
          </h4>
          <p className="text-xs text-stone-600 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <span>
              {booking.address}, {booking.city || 'Bhopal'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {booking.customerPhone && (
            <a
              href={`tel:${booking.customerPhone}`}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Call</span>
            </a>
          )}

          {onOpenChat && (
            <button
              type="button"
              onClick={() => onOpenChat(booking)}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-orange-600" />
              <span>Message</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenNavigation}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Maps</span>
          </button>
        </div>
      </div>

      {/* Pro Quick Status Update Messages */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">Quick Updates:</span>
        <button
          type="button"
          onClick={() => handleSendProQuickMessage('मैं रास्ते में हूँ')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-stone-700 border border-stone-200 font-medium transition-colors cursor-pointer"
        >
          मैं रास्ते में हूँ
        </button>
        <button
          type="button"
          onClick={() => handleSendProQuickMessage('मैं लगभग 10 मिनट में पहुँचूँगा')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-stone-700 border border-stone-200 font-medium transition-colors cursor-pointer"
        >
          मैं लगभग 10 मिनट में पहुँचूँगा
        </button>
        <button
          type="button"
          onClick={() => handleSendProQuickMessage('मैं पहुँच गया हूँ')}
          className="text-[11px] px-2.5 py-1 rounded-full bg-stone-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 text-stone-700 border border-stone-200 font-medium transition-colors cursor-pointer"
        >
          मैं पहुँच गया हूँ
        </button>
      </div>

      {/* Real-Time Customer Availability Note if confirmed */}
      {(booking.customerAvailabilityStatus || booking.customerLandmarkNote) && (
        <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <Home className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Customer Availability Update</span>
            <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
              {booking.customerAvailabilityStatus === 'available'
                ? 'घर पर उपलब्ध हैं (I am available)'
                : booking.customerAvailabilityStatus === 'call_before_arriving'
                ? 'पहुँचने से पहले कॉल करें (Call before arriving)'
                : 'Confirmed'}
            </span>
          </div>
          {booking.customerLandmarkNote && (
            <div className="text-[11px] text-stone-700 bg-white/70 p-2 rounded-xl border border-emerald-200/60">
              <strong>Landmark / Gate Instruction:</strong> "{booking.customerLandmarkNote}"
            </div>
          )}
        </div>
      )}

      {/* GPS & ETA Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isTrackingGps ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
            }`}
          />
          <span className="font-semibold text-stone-700">
            {isTrackingGps
              ? '🟢 Live Location Sharing Active'
              : 'GPS Sharing Standby'}
          </span>
          {currentDistanceKm !== null && (
            <span className="text-stone-500">({currentDistanceKm} km to customer)</span>
          )}
        </div>

        <div className="text-stone-600 font-medium">
          {booking.etaMinutes ? (
            <span className="font-bold text-orange-700">
              {getArrivalEtaText(booking.etaMinutes)}
            </span>
          ) : (
            <span>Destination: {booking.city || 'Bhopal'}</span>
          )}
        </div>
      </div>

      {gpsErrorNotice && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{gpsErrorNotice}</span>
        </div>
      )}

      {/* WORKFLOW ACTION BUTTONS */}
      {!isVerified ? (
        <div className="space-y-4">
          {/* Action: On The Way button (When Accepted) */}
          {booking.status === 'accepted' && (
            <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-black text-orange-950 uppercase tracking-wider">
                  Transit to Customer
                </h5>
                <p className="text-xs text-orange-800 mt-0.5">
                  Click when starting your travel to customer's location. Customer will see your live arrival ETA.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleStartOnTheWay}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {isUpdatingStatus ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  <span>ON THE WAY (रास्ते में निकलें)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  मैं नहीं पहुँच पाऊँगा
                </button>
              </div>
            </div>
          )}

          {/* Action: Arrived button (When On The Way) */}
          {booking.status === 'on_the_way' && !isArrived && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Reaching Destination
                </h5>
                <p className="text-xs text-amber-800 mt-0.5">
                  Reached customer's door? Click "ARRIVED" to notify customer and request their 4-digit start OTP.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={handleMarkArrived}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                >
                  {isUpdatingStatus ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  <span>ARRIVED (पहुँच गए)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowUnableModal(true)}
                  className="px-3 py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  मैं नहीं पहुँच पाऊँगा
                </button>
              </div>
            </div>
          )}

          {/* Action: ENTER CUSTOMER ARRIVAL OTP (When Arrived) */}
          {(isArrived || booking.status === 'on_the_way') && (
            <div
              id="pro-arrival-otp-verification"
              className="p-4 rounded-2xl bg-gradient-to-br from-stone-50 to-orange-50/50 border-2 border-orange-200 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center text-xs font-black">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                      Enter Customer OTP
                    </h5>
                    <p className="text-[11px] text-stone-600">
                      Ask customer for their arrival OTP to verify arrival and start service.
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
                  Required
                </span>
              </div>

              {/* Instant QR Code Scanner Button */}
              {onOpenQrScanner && (
                <div className="p-3 bg-white rounded-xl border border-orange-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 text-left w-full sm:w-auto">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">
                        Instant QR Code Verification
                      </span>
                      <span className="text-[11px] text-stone-500">
                        Scan customer's booking QR with camera to initiate work instantly
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenQrScanner(booking)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Customer QR</span>
                  </button>
                </div>
              )}

              {onOpenQrScanner && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-stone-400 my-1 justify-center">
                  <div className="h-px bg-stone-200 flex-1" />
                  <span>OR ENTER 4-DIGIT CODE MANUALLY</span>
                  <div className="h-px bg-stone-200 flex-1" />
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter OTP code"
                    value={enteredOtp}
                    onChange={(e) => {
                      setEnteredOtp(e.target.value.replace(/\D/g, ''));
                      setOtpError('');
                    }}
                    disabled={isVerifyingOtp || isLocked}
                    className="w-full sm:w-56 px-4 py-2.5 rounded-xl border border-stone-300 bg-white font-mono text-center font-black text-lg tracking-widest text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-stone-100"
                  />

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || isLocked || enteredOtp.length < 4}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify OTP &amp; Start Work</span>
                      </>
                    )}
                  </button>
                </div>

                {otpError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                {isLocked && (
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-300 text-stone-700 text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-stone-500 flex-shrink-0" />
                    <span>Code locked. Customer must refresh their screen to generate a new OTP.</span>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      ) : (
        /* Work Started & Verified Banner */
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-xs font-black text-emerald-950">
                OTP Verified ✓
              </h5>
              <p className="text-[11px] text-emerald-800 font-semibold">
                Work Started {booking.workStartedAt ? `at ${new Date(booking.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            Work in Progress
          </span>
        </div>
      )}

      {/* "मैं नहीं पहुँच पाऊँगा" Modal */}
      {showUnableModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-600" />
                <h4 className="text-sm font-black text-stone-900">
                  मैं नहीं पहुँच पाऊँगा (Unable to Reach)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowUnableModal(false)}
                className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              कृपया असमर्थता का वास्तविक कारण चुनें। यह बुकिंग रद्द नहीं होगी बल्कि ग्राहक के लिए अन्य तकनीशियन को सुरक्षित रूप से री-असाइन की जाएगी।
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800">कारण चुनें (Select Reason):</label>
              <div className="space-y-1.5">
                {UNABLE_TO_REACH_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedUnableReason === r.label
                        ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="unableReason"
                      value={r.label}
                      checked={selectedUnableReason === r.label}
                      onChange={() => setSelectedUnableReason(r.label)}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-800">
                अतिरिक्त नोट (Optional short note):
              </label>
              <input
                type="text"
                value={unableShortNote}
                onChange={(e) => setUnableShortNote(e.target.value)}
                placeholder="उदा. बाइक पंक्चर हो गई है..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUnableModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="button"
                disabled={submittingUnable}
                onClick={handleSubmitUnableToReach}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer disabled:opacity-50"
              >
                {submittingUnable ? 'सबमिट हो रहा है...' : 'सबमिट करें व री-असाइन करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  Calendar,
  IndianRupee,
  Volume2,
  VolumeX,
  AlertCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Flame,
  Navigation,
} from 'lucide-react';
import { Booking, BookingOffer } from '../../types';
import { bookingAlarmSoundService } from '../../services/bookingAlarmSoundService';

interface Props {
  booking: Booking;
  offer?: BookingOffer;
  countdownSeconds?: number;
  onAccept: (booking: Booking) => void;
  onReject: (booking: Booking, reason?: string) => void;
  onExpire?: (booking: Booking) => void;
  isSubmitting?: boolean;
}

export const IncomingBookingScreen: React.FC<Props> = ({
  booking,
  offer,
  countdownSeconds = 60,
  onAccept,
  onReject,
  onExpire,
  isSubmitting = false,
}) => {
  const initialTime = offer?.expiresAt
    ? Math.max(1, Math.min(countdownSeconds, Math.round((new Date(offer.expiresAt).getTime() - Date.now()) / 1000)))
    : countdownSeconds;

  const [timeLeft, setTimeLeft] = useState<number>(initialTime);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('व्यस्त हूँ / क्षेत्र से दूर (Busy / Too far)');
  const timerRef = useRef<number | null>(null);

  // Initialize countdown timer
  useEffect(() => {
    setTimeLeft(countdownSeconds);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current !== null) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Stop sound immediately on expiry
          bookingAlarmSoundService.stopLoop();
          onExpire?.(booking);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [countdownSeconds, booking, onExpire]);

  // Clean up alarm sound if component unmounts for any reason (e.g. cancelled by customer)
  useEffect(() => {
    return () => {
      bookingAlarmSoundService.stopLoop();
    };
  }, []);

  // Toggle audio mute during active alert
  const handleToggleMute = () => {
    if (isMuted) {
      bookingAlarmSoundService.startLoop();
      setIsMuted(false);
    } else {
      bookingAlarmSoundService.stopLoop();
      setIsMuted(true);
    }
  };

  const handleAcceptClick = () => {
    bookingAlarmSoundService.stopLoop();
    onAccept(booking);
  };

  const handleConfirmReject = () => {
    bookingAlarmSoundService.stopLoop();
    setShowRejectModal(false);
    onReject(booking, rejectReason);
  };

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / countdownSeconds) * 100));
  const estimatedCharge = booking.estimatedCharge || booking.amount || 499;
  const proPayout = Math.round(estimatedCharge * 0.85);

  const approxDistance =
    booking.approxDistanceText ||
    (booking.approxDistanceKm ? `${booking.approxDistanceKm} km` : null) ||
    offer?.approxDistanceText ||
    (offer?.approxDistanceKm ? `${offer.approxDistanceKm} km` : null) ||
    'लगभग 2.4 km (अनुमानित दूरी)';

  return (
    <div
      id="incoming-booking-alarm-screen"
      role="dialog"
      aria-modal="true"
      aria-label="New Booking Alert"
      className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border-4 border-orange-500 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
        {/* Pulsating Header Banner */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none animate-pulse" />

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white text-orange-600 flex items-center justify-center shadow-lg animate-bounce">
                <Bell className="w-6 h-6 fill-current animate-wiggle" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-black text-[10px] uppercase tracking-wider">
                    त्वरित अलर्ट • LIVE
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-200">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    नया अनुरोध
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
                  🔔 नया काम आया है!
                </h2>
                <p className="text-xs text-amber-100 font-medium">
                  New Service Request
                </p>
              </div>
            </div>

            {/* Mute Audio Toggle Button */}
            <button
              type="button"
              id="btn-incoming-mute-toggle"
              onClick={handleToggleMute}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold transition-all cursor-pointer"
              title={isMuted ? 'ध्वनि चालू करें (Unmute)' : 'ध्वनि म्यूट करें (Mute)'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-amber-200" /> : <Volume2 className="w-5 h-5 animate-pulse" />}
            </button>
          </div>

          {/* Countdown Timer Bar */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-200 animate-spin" />
              <span className="text-xs font-bold text-white">
                निर्णय लेने का समय:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-base font-black px-2.5 py-0.5 rounded-lg ${
                  timeLeft <= 10 ? 'bg-rose-500 text-white animate-ping' : 'bg-black/30 text-amber-200'
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-2 w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft <= 10 ? 'bg-rose-400' : 'bg-amber-300'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Scrollable Job Detail Body */}
        <div className="p-4 sm:p-5 space-y-3.5 max-h-[60vh] overflow-y-auto text-xs text-stone-700">
          {/* Main Service Card & Estimated Charge */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px] tracking-wide">
                  {booking.categoryName || 'Home Service'}
                </span>
                <h3 className="text-base sm:text-lg font-black text-stone-900 mt-1">
                  {booking.serviceName}
                </h3>
                <span className="font-mono text-[11px] text-stone-400 font-bold">
                  बुकिंग ID: #{booking.id.slice(-6)}
                </span>
              </div>

              {/* Estimated Charge & Technician Earnings */}
              <div className="text-right shrink-0 bg-white p-2.5 rounded-xl border border-amber-200 shadow-xs">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">आपकी आय (Earnings)</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 flex items-center justify-end">
                  <IndianRupee className="w-4 h-4" />
                  {proPayout}
                </span>
                <span className="text-[10px] font-bold text-stone-600 block">
                  अनुमानित शुल्क: ₹{estimatedCharge}
                </span>
                <span className="text-[9px] text-stone-400 block">(85% तकनीशियन शेयर)</span>
              </div>
            </div>
          </div>

          {/* Location, Distance & Time Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Area / Address */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">
                  कार्यक्षेत्र / क्षेत्र (Area)
                </span>
                <p className="font-bold text-stone-900 text-xs mt-0.5 leading-snug">
                  {booking.address || 'एमपी नगर, भोपाल'}
                </p>
                <span className="text-[11px] text-stone-500 font-medium">
                  {booking.city || 'Bhopal'} {booking.pincode ? `(${booking.pincode})` : ''}
                </span>
              </div>
            </div>

            {/* Approximate Distance */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Navigation className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-stone-400 uppercase block">
                  अनुमानित दूरी (Approx Distance)
                </span>
                <p className="font-bold text-emerald-800 text-xs mt-0.5">
                  {approxDistance}
                </p>
                <span className="text-[10px] text-stone-500 font-medium">
                  आपके वर्तमान स्थान/ज़ोन से
                </span>
              </div>
            </div>

            {/* Scheduled Date & Time */}
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-2.5 sm:col-span-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase block">
                    बुकिंग समय (Booking Time)
                  </span>
                  <p className="font-bold text-stone-900 text-xs mt-0.5">
                    {booking.scheduledDate || 'आज'}
                  </p>
                </div>
                <span className="text-xs text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1.5 self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {booking.scheduledTime || 'तत्काल सेवा (Immediate)'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Name & Notes */}
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-stone-400 uppercase">
                ग्राहक (Customer)
              </span>
              <span className="text-[11px] font-bold text-stone-900">
                {booking.customerName || 'सत्यापित ग्राहक'}
              </span>
            </div>

            {booking.notes && (
              <div className="pt-2 border-t border-stone-200/80">
                <span className="text-[10px] font-bold text-stone-400 uppercase flex items-center gap-1 mb-0.5">
                  <FileText className="w-3 h-3" />
                  ग्राहक का विशेष निर्देश (Customer Note):
                </span>
                <p className="text-xs text-stone-700 bg-white p-2 rounded-lg border border-stone-200/60 italic">
                  "{booking.notes}"
                </p>
              </div>
            )}
          </div>

          {/* Actionable Booking Offer Metadata */}
          {offer && (
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] flex items-center justify-between text-amber-900">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-200/80 font-mono font-bold text-[10px]">
                  OFFER: {offer.offerId}
                </span>
                <span className="font-semibold text-stone-700">
                  डिस्ट्रिक्ट: {offer.districtName || offer.districtId || booking.districtName || 'भोपाल (Bhopal)'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] tracking-wider">
                {offer.status}
              </span>
            </div>
          )}

          {/* Safety & OTP Notice */}
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              स्वीकार करने पर कस्टमर को आपका आगमन दिखेगा और काम शुरू करने के लिए 4-अंकीय OTP आवश्यक होगा।
            </span>
          </div>
        </div>

        {/* Large Action Buttons Footer: ACCEPT & REJECT */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 shrink-0">
          <div className="grid grid-cols-2 gap-3">
            {/* Reject Button */}
            <button
              type="button"
              id="btn-incoming-booking-reject"
              onClick={() => setShowRejectModal(true)}
              disabled={isSubmitting}
              className="py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 disabled:opacity-50"
            >
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>अस्वीकार (REJECT)</span>
            </button>

            {/* Accept Button */}
            <button
              type="button"
              id="btn-incoming-booking-accept"
              onClick={handleAcceptClick}
              disabled={isSubmitting}
              className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>स्वीकार हो रहा है...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>स्वीकार (ACCEPT)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Reject Confirmation Sub-Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-stone-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-black text-sm text-stone-900">बुकिंग अस्वीकार करने का कारण</h4>
            </div>

            <p className="text-xs text-stone-600">
              कृपया कारण चुनें ताकि इस बुकिंग को अन्य उपलब्ध सेवा पेशेवर को भेजा जा सके:
            </p>

            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-medium bg-stone-50"
            >
              <option value="व्यस्त हूँ / अन्य काम चल रहा है">व्यस्त हूँ / अन्य काम चल रहा है (Busy)</option>
              <option value="लोकेशन बहुत दूर है">लोकेशन बहुत दूर है (Location Too Far)</option>
              <option value="सामग्री / उपकरण उपलब्ध नहीं हैं">सामग्री / उपकरण उपलब्ध नहीं हैं (No Tools)</option>
              <option value="तबीयत खराब / ऑफ-ड्यूटी">तबीयत खराब / ऑफ-ड्यूटी (Off-duty)</option>
            </select>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs"
              >
                वापस जाएं
              </button>
              <button
                type="button"
                id="btn-confirm-booking-reject"
                onClick={handleConfirmReject}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                अस्वीकार करें
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, KeyRound, CheckCircle2, AlertCircle, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { Booking } from '../../types';
import { verifyDeliveryOtp, ensureBookingHasOtp } from '../../services/otpService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface DeliveryOtpPromptProps {
  booking: Booking;
  onVerified?: () => void;
  compact?: boolean;
}

export const DeliveryOtpPrompt: React.FC<DeliveryOtpPromptProps> = ({
  booking,
  onVerified,
  compact = false,
}) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showDemoHint, setShowDemoHint] = useState(false);
  const [copiedHint, setCopiedHint] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Automatically ensure OTP is initialized if missing in in_progress state
  useEffect(() => {
    if (booking.status === 'in_progress' && !booking.otp) {
      ensureBookingHasOtp(booking).catch((err) =>
        console.warn('Auto-provision OTP for in_progress booking note:', err)
      );
    }
  }, [booking.id, booking.status, booking.otp]);

  // If already verified or completed
  if (booking.status === 'completed' && booking.isVerifiedDelivery) {
    return (
      <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Service Delivery Verified
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/70 text-emerald-900">
                OTP Authenticated
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Service completion was authenticated by customer at{' '}
              {booking.verifiedAt
                ? new Date(booking.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'completion'}.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center text-xs font-bold text-emerald-700 gap-1 bg-white/80 px-2.5 py-1 rounded-xl border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Guaranteed</span>
        </div>
      </div>
    );
  }

  // Only render active verification prompt if booking is in_progress
  if (booking.status !== 'in_progress') {
    return null;
  }

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric inputs
    const sanitized = value.replace(/[^0-9]/g, '');

    // Handle paste event or single digit
    if (sanitized.length > 1) {
      const splitDigits = sanitized.slice(0, 4).split('');
      const newDigits = [...digits];
      splitDigits.forEach((d, idx) => {
        if (index + idx < 4) newDigits[index + idx] = d;
      });
      setDigits(newDigits);
      setErrorMessage(null);
      const nextIndex = Math.min(index + splitDigits.length, 3);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = sanitized;
    setDigits(newDigits);
    setErrorMessage(null);

    // Auto-advance to next box if filled
    if (sanitized && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const fullCode = digits.join('');

  const handleVerify = async () => {
    if (fullCode.length < 4) {
      setErrorMessage('Please enter the complete 4-digit code provided by your technician.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const result = await verifyDeliveryOtp(booking, fullCode, currentUser?.uid);

      if (!result.success) {
        setErrorMessage(result.message);
        addToast({
          type: 'alert',
          title: 'Verification Failed',
          description: result.message,
          bookingId: booking.id,
          serviceName: booking.serviceName,
        });
      } else {
        setIsSuccess(true);
        addToast({
          type: 'success',
          title: 'Service Delivery Verified! 🎉',
          description: `Booking #${booking.id} (${booking.serviceName}) has been successfully verified and completed.`,
          bookingId: booking.id,
          serviceName: booking.serviceName,
        });
        if (onVerified) {
          onVerified();
        }
      }
    } catch (err: any) {
      console.error('OTP Verification error:', err);
      setErrorMessage(err.message || 'Verification service error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyDemoCode = () => {
    if (booking.otp) {
      navigator.clipboard.writeText(booking.otp);
      setCopiedHint(true);
      // Auto-populate
      const split = booking.otp.slice(0, 4).split('');
      setDigits(split);
      setErrorMessage(null);
      setTimeout(() => setCopiedHint(false), 2000);
    }
  };

  return (
    <div
      id={`otp-verify-card-${booking.id}`}
      className={`rounded-2xl border transition-all ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-300'
          : 'bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-white border-amber-200/90 shadow-sm'
      } ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}
    >
      {/* Header Banner */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
              <span>Service Completion Verification</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-950">
                Action Required
              </span>
            </h4>
            <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
              Once {booking.serviceManName || 'the technician'} finishes the work on-site, ask for their{' '}
              <strong className="text-stone-900">4-digit Completion Code</strong> to verify authentic service delivery.
            </p>
          </div>
        </div>

        {/* Demo / Assistant Code Helper toggle */}
        <button
          type="button"
          onClick={() => setShowDemoHint(!showDemoHint)}
          className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer flex-shrink-0 pt-0.5"
          title="Technician Portal Code Sync"
        >
          {showDemoHint ? 'Hide Hint' : 'Technician Code Hint'}
        </button>
      </div>

      {/* Demo helper box if toggled */}
      {showDemoHint && (
        <div className="mb-3.5 p-2.5 rounded-xl bg-amber-100/70 border border-amber-300/80 text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
            <span>
              Provider's Active Code:{' '}
              <strong className="font-mono text-sm tracking-wider text-amber-950">
                {booking.otp || 'Generating...'}
              </strong>
            </span>
          </div>
          {booking.otp && (
            <button
              type="button"
              onClick={handleCopyDemoCode}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedHint ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedHint ? 'Filled!' : 'Fill Code'}</span>
            </button>
          )}
        </div>
      )}

      {/* 4-Digit Segmented OTP Input Grid */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
        <div className="flex items-center gap-2">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              disabled={isVerifying || isSuccess}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`w-11 h-12 text-center text-lg font-black rounded-xl border bg-white shadow-xs transition-all outline-none focus:ring-2 ${
                errorMessage
                  ? 'border-rose-400 focus:ring-rose-300 text-rose-700'
                  : digit
                  ? 'border-amber-400 ring-1 ring-amber-300 text-amber-950'
                  : 'border-stone-300 focus:border-amber-500 focus:ring-amber-200 text-stone-900'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleVerify}
          disabled={isVerifying || fullCode.length < 4 || isSuccess}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Verified &amp; Completed</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Verify &amp; Complete Delivery</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="mt-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub-note */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-stone-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Protects customer payment &amp; certifies authentic on-site completion
        </span>
        {booking.otpAttempts !== undefined && booking.otpAttempts > 0 && (
          <span className="text-amber-700 font-semibold">
            {booking.otpAttempts} failed attempt{booking.otpAttempts > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
};

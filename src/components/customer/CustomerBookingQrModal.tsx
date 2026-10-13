import React, { useState, useEffect } from 'react';
import {
  QrCode,
  X,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Booking } from '../../types';
import { generateBookingQrDataUrl } from '../../services/qrBookingService';

interface CustomerBookingQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
  arrivalOtp?: string;
}

export const CustomerBookingQrModal: React.FC<CustomerBookingQrModalProps> = ({
  isOpen,
  onClose,
  booking,
  arrivalOtp,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const displayOtp = arrivalOtp || booking.arrivalOtp || booking.otp;
  const isWorkStarted =
    booking.status === 'in_progress' ||
    booking.status === 'work_started' ||
    Boolean(booking.workStartedAt);

  // Generate QR Code data URL whenever booking or arrivalOtp changes
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);
    setGenerationError(null);

    generateBookingQrDataUrl(booking, displayOtp, {
      width: 320,
      margin: 2,
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGenerating(false);
        }
      })
      .catch((err) => {
        console.error('Failed to generate booking QR code:', err);
        if (isMounted) {
          setGenerationError('Failed to generate QR code graphic. You can still use the 4-digit code.');
          setIsGenerating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, booking, displayOtp]);

  const handleCopyOtp = () => {
    if (!displayOtp) return;
    navigator.clipboard.writeText(displayOtp);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Hardinkaam_Booking_${booking.id.slice(-6).toUpperCase()}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-qr-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 id="customer-qr-title" className="text-sm font-black text-stone-900 leading-tight">
                Service Arrival QR Code
              </h3>
              <p className="text-[11px] text-stone-500 font-medium">
                Booking #{booking.id.slice(-6).toUpperCase()} • {booking.serviceName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/70 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition cursor-pointer"
            aria-label="Close QR Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-center">
          {/* Status banner if already in progress */}
          {isWorkStarted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs animate-bounce">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-900">QR Code Verified ✓</h4>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  Service is currently in progress! Work timer is active.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Guidance text */}
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                  <Sparkles className="w-3 h-3 text-orange-600" />
                  Show to Service Professional
                </span>
                <p className="text-xs text-stone-600 font-medium">
                  जब सर्विसमैन आपके घर पहुँचें, तो यह QR कोड स्कैन करने के लिए कहें।
                </p>
              </div>

              {/* QR Code Container */}
              <div className="relative mx-auto w-64 h-64 bg-stone-50 border-2 border-stone-200 rounded-3xl p-3 flex items-center justify-center shadow-inner">
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-2 text-stone-400">
                    <RefreshCw className="w-8 h-8 animate-spin text-orange-600" />
                    <span className="text-xs font-bold text-stone-600">Generating Secure QR...</span>
                  </div>
                ) : generationError ? (
                  <div className="p-4 text-center text-rose-600 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto" />
                    <p className="text-xs font-medium">{generationError}</p>
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Booking QR Code for #${booking.id}`}
                    className="w-full h-full object-contain rounded-2xl"
                  />
                ) : null}
              </div>

              {/* 4-Digit Backup Arrival Code */}
              {displayOtp && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block">
                    Backup 4-Digit Arrival Code
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-black text-amber-950 tracking-widest bg-white px-4 py-1 rounded-xl border border-amber-300 shadow-xs">
                      {displayOtp}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyOtp}
                      className="p-2.5 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition shadow-xs cursor-pointer"
                      title="Copy Arrival Code"
                    >
                      {copiedOtp ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800/90 font-medium">
                    (If camera scanning is unavailable, tell this 4-digit code to technician)
                  </p>
                </div>
              )}
            </>
          )}

          {/* Booking Summary details */}
          <div className="pt-2 border-t border-stone-100 text-left text-xs space-y-1 text-stone-500">
            <div className="flex justify-between">
              <span>Customer:</span>
              <strong className="text-stone-800">{booking.customerName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Service:</span>
              <strong className="text-stone-800">{booking.serviceName}</strong>
            </div>
            <div className="flex justify-between">
              <span>Assigned Pro:</span>
              <strong className="text-stone-800">{booking.serviceManName || 'Hardinkaam Pro'}</strong>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2 shrink-0">
          {qrDataUrl && (
            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex-1 py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save QR Image</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  X,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Upload,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  QrCode,
  ShieldCheck,
  User,
  MapPin,
  Clock,
  RefreshCw,
} from 'lucide-react';
import jsQR from 'jsqr';
import { Booking } from '../../types';
import { parseBookingQrPayload, verifyAndStartServiceViaQr } from '../../services/qrBookingService';

interface ProBookingQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBooking?: Booking;
  activeJobs?: Booking[];
  serviceManId: string;
  onVerified: (bookingId: string) => void;
}

export const ProBookingQrScannerModal: React.FC<ProBookingQrScannerModalProps> = ({
  isOpen,
  onClose,
  targetBooking,
  activeJobs = [],
  serviceManId,
  onVerified,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchCapability, setHasTorchCapability] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Scanner state
  const [isScanning, setIsScanning] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedSuccessBooking, setVerifiedSuccessBooking] = useState<{
    id: string;
    serviceName: string;
    customerName: string;
  } | null>(null);

  // Manual code input
  const [manualCode, setManualCode] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string>(
    targetBooking?.id || (activeJobs[0]?.id ?? '')
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play crisp acoustic confirmation sound using Web Audio API
  const playSuccessChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // First pleasant note (A5 - 880Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second harmonic note (C#6 - 1108Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.35);

      // Haptic feedback if device supports vibration
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }
    } catch (_) {}
  }, []);

  // Stop active camera stream
  const stopCameraStream = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Toggle hardware flashlight
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (err) {
      console.warn('Torch constraint not supported on this track:', err);
    }
  }, [isTorchOn]);

  // Flip between environment (back) and user (front) cameras
  const toggleCameraFacing = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  // Process a verified QR result
  const handleDecodedQrString = useCallback(
    async (decodedText: string) => {
      if (isVerifying || !isScanning) return;
      setIsScanning(false);
      setIsVerifying(true);
      setVerificationError(null);

      const parsed = parseBookingQrPayload(decodedText);

      // Determine target booking
      let matchedBooking: Booking | undefined = targetBooking;

      if (!matchedBooking && activeJobs.length > 0) {
        // Find matching job in technician's active assignments
        matchedBooking = activeJobs.find(
          (j) => j.id.trim().toLowerCase() === parsed.bookingId.trim().toLowerCase()
        );
      }

      // If user opened scanner for a specific job, check if it matches
      if (targetBooking && targetBooking.id.trim().toLowerCase() !== parsed.bookingId.trim().toLowerCase()) {
        setIsVerifying(false);
        setIsScanning(true);
        setVerificationError(
          `QR Mismatch: Scanned code is for Booking #${parsed.bookingId.slice(-6).toUpperCase()}, but this card is for #${targetBooking.id.slice(-6).toUpperCase()}.`
        );
        return;
      }

      const bookingToVerifyId = targetBooking ? targetBooking.id : (matchedBooking ? matchedBooking.id : parsed.bookingId);

      try {
        const result = await verifyAndStartServiceViaQr(
          bookingToVerifyId,
          decodedText,
          serviceManId,
          parsed.otp
        );

        if (result.success) {
          playSuccessChime();
          const displayBooking = matchedBooking || targetBooking;
          setVerifiedSuccessBooking({
            id: bookingToVerifyId,
            serviceName: displayBooking?.serviceName || parsed.serviceName || 'Service',
            customerName: displayBooking?.customerName || 'Customer',
          });
          stopCameraStream();

          // Wait 1.8 seconds to display celebratory success screen, then notify parent
          setTimeout(() => {
            onVerified(bookingToVerifyId);
            onClose();
          }, 1800);
        } else {
          setVerificationError(result.message || 'Verification rejected. Please verify with customer.');
          setIsScanning(true);
        }
      } catch (err: any) {
        setVerificationError(err.message || 'Failed to verify booking QR code. Please try again.');
        setIsScanning(true);
      } finally {
        setIsVerifying(false);
      }
    },
    [
      isVerifying,
      isScanning,
      targetBooking,
      activeJobs,
      serviceManId,
      playSuccessChime,
      stopCameraStream,
      onVerified,
      onClose,
    ]
  );

  // Scan frame by frame using jsQR
  const scanVideoFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleDecodedQrString(code.data);
        return;
      }
    }

    if (isScanning) {
      animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
    }
  }, [isScanning, handleDecodedQrString]);

  // Start camera stream
  const startCameraStream = useCallback(async () => {
    stopCameraStream();
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraPermission('denied');
      setCameraError('Camera access is not supported on this browser. Use manual entry or upload.');
      setMode('manual');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraPermission('granted');

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      if (track && (track as any).getCapabilities) {
        const caps = (track as any).getCapabilities();
        setHasTorchCapability(Boolean(caps?.torch));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsScanning(true);
        animFrameIdRef.current = requestAnimationFrame(scanVideoFrame);
      }
    } catch (err: any) {
      console.warn('Camera stream request failed:', err);
      setCameraPermission('denied');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. Switch to manual code entry.');
      } else {
        setCameraError('Unable to start camera. Please switch to manual code entry.');
      }
    }
  }, [facingMode, scanVideoFrame, stopCameraStream]);

  // Handle uploaded QR code image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        });

        if (code && code.data) {
          handleDecodedQrString(code.data);
        } else {
          setVerificationError('No valid QR code found in the uploaded image. Please try a clearer picture.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle manual code entry submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || !manualCode || manualCode.trim().length < 4) {
      setVerificationError('Please enter a valid 4-digit code.');
      return;
    }
    const fakeQr = JSON.stringify({
      type: 'hardinkaam_booking_arrival',
      bookingId: selectedBookingId,
      otp: manualCode.trim(),
    });
    handleDecodedQrString(fakeQr);
  };

  // Modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setVerificationError(null);
      setVerifiedSuccessBooking(null);
      setIsVerifying(false);
      setIsScanning(true);
      if (mode === 'camera') {
        startCameraStream();
      }
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [isOpen, mode, startCameraStream, stopCameraStream]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-700 rounded-3xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 id="qr-scanner-title" className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>Scan Customer QR</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  Instant Start
                </span>
              </h2>
              <p className="text-[11px] text-stone-400 font-medium">
                {targetBooking
                  ? `Booking #${targetBooking.id.slice(-6).toUpperCase()} • ${targetBooking.serviceName}`
                  : 'Scan customer booking screen to initiate work'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close scanner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1.5 bg-stone-950 border-b border-stone-800 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => {
              setMode('camera');
              setVerificationError(null);
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'camera'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('upload');
              stopCameraStream();
              setVerificationError(null);
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'upload'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload QR</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('manual');
              stopCameraStream();
              setVerificationError(null);
            }}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              mode === 'manual'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Manual Code</span>
          </button>
        </div>

        {/* Hidden Canvas for QR decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Main Body */}
        <div className="relative flex-1 min-h-[340px] flex flex-col justify-center items-center overflow-hidden bg-black">
          {/* SUCCESS OVERLAY */}
          {verifiedSuccessBooking && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-emerald-950/95 text-center animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-3 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30 mb-1">
                Verified &amp; Started
              </span>
              <h3 className="text-xl font-black text-white">Status Updated to In Progress!</h3>
              <p className="text-xs text-emerald-200/90 font-medium mt-1">
                Job #{verifiedSuccessBooking.id.slice(-6).toUpperCase()} • {verifiedSuccessBooking.serviceName}
              </p>
              <div className="mt-4 flex items-center gap-2 text-[11px] text-emerald-300/80 bg-black/30 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Work timer started automatically</span>
              </div>
            </div>
          )}

          {/* VERIFYING SPINNER OVERLAY */}
          {isVerifying && !verifiedSuccessBooking && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-black/85 backdrop-blur-xs text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 mb-3 animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <h4 className="text-sm font-black text-white">Verifying Booking QR Code...</h4>
              <p className="text-xs text-stone-400 mt-0.5">Authorizing arrival &amp; starting work timer</p>
            </div>
          )}

          {/* MODE: CAMERA VIEW */}
          {mode === 'camera' && (
            <div className="relative w-full h-full min-h-[340px] flex items-center justify-center overflow-hidden">
              {cameraError ? (
                <div className="p-6 text-center max-w-xs space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Camera Access Notice</h4>
                  <p className="text-xs text-stone-300 leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => startCameraStream()}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />

                  {/* Viewfinder Target Frame */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-8">
                    <div className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-[85vw] max-h-[85vw] rounded-2xl border-2 border-white/20 shadow-2xl">
                      {/* Viewfinder Corners */}
                      <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_12px_#f97316] animate-[scan_2.2s_ease-in-out_infinite]" />

                      {/* Guide badge */}
                      <div className="absolute -bottom-10 inset-x-0 text-center">
                        <span className="px-3 py-1 rounded-full bg-stone-900/90 border border-stone-700 text-stone-300 text-[11px] font-bold shadow-md">
                          Align Customer QR inside box
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Camera Controls Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    {hasTorchCapability && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition cursor-pointer ${
                          isTorchOn
                            ? 'bg-amber-400 text-stone-950 border-amber-300 shadow-md'
                            : 'bg-stone-900/70 text-white border-white/20 hover:bg-stone-800'
                        }`}
                        title={isTorchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                      >
                        {isTorchOn ? (
                          <Flashlight className="w-4 h-4 fill-current" />
                        ) : (
                          <FlashlightOff className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-2.5 rounded-full bg-stone-900/70 hover:bg-stone-800 text-white backdrop-blur-md border border-white/20 transition cursor-pointer"
                      title="Switch Front/Back Camera"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* MODE: UPLOAD IMAGE */}
          {mode === 'upload' && (
            <div className="p-8 text-center w-full max-w-sm space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-stone-700 hover:border-orange-500 bg-stone-900/50 hover:bg-stone-900 cursor-pointer transition flex flex-col items-center justify-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Upload QR Code Image</h4>
                  <p className="text-xs text-stone-400 mt-1">
                    Select a photo or screenshot of the customer's QR code
                  </p>
                </div>
                <span className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs">
                  Choose Image File
                </span>
              </div>
            </div>
          )}

          {/* MODE: MANUAL CODE ENTRY */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} className="p-6 w-full max-w-sm space-y-4">
              {activeJobs.length > 1 && !targetBooking && (
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Select Target Job
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-white text-xs font-bold focus:border-orange-500 focus:outline-hidden"
                  >
                    {activeJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        #{job.id.slice(-6).toUpperCase()} • {job.serviceName} ({job.customerName})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Customer 4-Digit Arrival Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value.replace(/[^0-9]/g, ''));
                    setVerificationError(null);
                  }}
                  placeholder="e.g. 4821"
                  className="w-full px-4 py-3 text-center text-2xl font-black tracking-widest rounded-2xl bg-stone-800 border-2 border-stone-700 text-orange-400 focus:border-orange-500 focus:outline-hidden"
                  autoFocus
                />
                <p className="text-[11px] text-stone-400 mt-1 text-center">
                  Ask the customer for the code displayed on their screen
                </p>
              </div>

              <button
                type="submit"
                disabled={manualCode.length < 4 || isVerifying}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify Code &amp; Start Job</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer with Error or Guidance */}
        <div className="px-5 py-3.5 bg-stone-900 border-t border-stone-800 text-center shrink-0">
          {verificationError ? (
            <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="line-clamp-2">{verificationError}</span>
              </div>
              <button
                type="button"
                onClick={() => setVerificationError(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-stone-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure Hardinkaam QR Check-in
              </span>
              <span>Updates to In Progress instantly</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

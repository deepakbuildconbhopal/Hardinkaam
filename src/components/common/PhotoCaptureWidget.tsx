import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Upload, Check, AlertCircle, Sparkles, Image as ImageIcon, Trash2 } from 'lucide-react';
import { compressImageForWeb } from '../../utils/imageCompression';

interface Props {
  photo: string | null;
  onPhotoChange: (photoBase64: string | null) => void;
  label?: string;
  required?: boolean;
}

export const PhotoCaptureWidget: React.FC<Props> = ({
  photo,
  onPhotoChange,
  label = 'फोटो जोड़ें (Selfie / ID Photo)',
  required = false,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera stream on unmount or when camera deactivated
  const stopCameraStream = () => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (_) {}
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        // Fallback to native camera input if getUserMedia is not supported
        cameraFileInputRef.current?.click();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach to video element
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((e) => console.warn('Video play note:', e));
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('कैमरा अनुमति नहीं मिली। आप नीचे "गैलरी से चुनें" बटन से फ़ोटो अपलोड कर सकते हैं।');
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      setIsProcessing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 480;
      const height = video.videoHeight || 480;

      // Crop or scale to square
      const minDim = Math.min(width, height);
      canvas.width = 400;
      canvas.height = 400;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Mirror image if user camera
      if (facingMode === 'user') {
        ctx.translate(400, 0);
        ctx.scale(-1, 1);
      }

      const startX = (width - minDim) / 2;
      const startY = (height - minDim) / 2;
      ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 400, 400);

      const base64Data = canvas.toDataURL('image/jpeg', 0.85);
      onPhotoChange(base64Data);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Capture error:', err);
      setCameraError('फोटो खींचने में समस्या आई, कृपया दोबारा प्रयास करें या गैलरी से चुनें।');
    } finally {
      setIsProcessing(false);
      stopCameraStream();
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setIsProcessing(true);
    setCameraError(null);

    try {
      // 1. Try modern fast client-side compression
      const result = await compressImageForWeb(file, {
        maxDimension: 600,
        quality: 0.85,
        maxSizeKB: 250,
      });

      if (result.dataUrl) {
        onPhotoChange(result.dataUrl);
        setIsProcessing(false);
        return;
      }
    } catch (compressionErr) {
      console.warn('Fast compression fallback triggered:', compressionErr);
    }

    // 2. Direct FileReader fallback if WebWorker/canvas compression had an issue
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawResult = event.target?.result as string;
        if (rawResult) {
          onPhotoChange(rawResult);
        }
        setIsProcessing(false);
      };
      reader.onerror = () => {
        setCameraError('फ़ाइल लोड नहीं हो सकी। कृपया कोई अन्य फोटो चुनें।');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      setCameraError('फोटो प्रोसेस करने में त्रुटि: ' + (e?.message || 'Error'));
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    processFile(file);
    e.target.value = '';
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-orange-600" />
          <span>{label}</span>
          {required && <span className="text-red-500">*</span>}
        </label>
        {photo && !isCameraActive && !isProcessing && (
          <button
            type="button"
            onClick={() => onPhotoChange(null)}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>फोटो हटाएं (Remove)</span>
          </button>
        )}
      </div>

      {/* Hidden Gallery file input (STRICTLY NO CAPTURE: Opens device gallery/photo picker directly) */}
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        disabled={isProcessing}
        className="hidden"
      />

      {/* Hidden Camera file input (for direct camera capture fallback) */}
      <input
        type="file"
        ref={cameraFileInputRef}
        accept="image/*"
        capture={facingMode === 'user' ? 'user' : 'environment'}
        onChange={handleFileUpload}
        disabled={isProcessing}
        className="hidden"
      />

      {/* Processing Spinner State */}
      {isProcessing ? (
        <div className="p-4 rounded-2xl bg-orange-50/90 border border-orange-200 flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 text-orange-600 animate-spin" />
          <div className="text-xs font-bold text-stone-800">
            फोटो प्रोसेस हो रही है, कृपया प्रतीक्षा करें...
          </div>
        </div>
      ) : isCameraActive ? (
        /* Live Camera View */
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden border-2 border-orange-500 shadow-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-56 object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Camera Frame Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-2 border-dashed border-white/70 shadow-lg" />
          </div>

          {/* Controls Bar */}
          <div className="absolute bottom-2 inset-x-2 flex items-center justify-between p-2 bg-black/60 backdrop-blur-xs rounded-xl">
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition active:scale-95 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>कैमरा बदलें</span>
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>फोटो क्लिक करें (Capture)</span>
            </button>

            <button
              type="button"
              onClick={stopCameraStream}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-stone-300 text-xs font-bold cursor-pointer"
            >
              रद्द करें
            </button>
          </div>
        </div>
      ) : photo ? (
        /* Captured Photo Preview */
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-orange-50/70 border border-orange-200">
          <div className="relative">
            <img
              src={photo}
              alt="Member Selfie"
              className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-500 rounded-full text-white">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-stone-800 flex items-center gap-1">
              <span>फोटो सफलतापूर्वक जुड़ गई!</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">
              यह फोटो आपके डिजिटल ID कार्ड पर प्रिंट होगी।
            </p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold transition cursor-pointer shadow-2xs flex items-center gap-1"
              title="गैलरी से नई फोटो चुनें"
            >
              <Upload className="w-3 h-3" />
              <span>गैलरी</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                  startCamera('user');
                } else {
                  cameraFileInputRef.current?.click();
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-orange-50 text-stone-700 text-[11px] font-bold border border-stone-200 transition cursor-pointer shadow-2xs flex items-center gap-1"
              title="कैमरा से नई फोटो लें"
            >
              <Camera className="w-3 h-3 text-orange-600" />
              <span>कैमरा</span>
            </button>
          </div>
        </div>
      ) : (
        /* Action Buttons: Open Camera or Upload */
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                startCamera('user');
              } else {
                cameraFileInputRef.current?.click();
              }
            }}
            className="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>कैमरा से फोटो खींचें</span>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="py-2.5 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 border border-stone-200 transition active:scale-98 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-stone-500" />
            <span>गैलरी से चुनें</span>
          </button>
        </div>
      )}

      {cameraError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{cameraError}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
            >
              <Upload className="w-3 h-3" />
              <span>गैलरी से फोटो चुनें</span>
            </button>
            <button
              type="button"
              onClick={() => cameraFileInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
            >
              <Camera className="w-3 h-3" />
              <span>मोबाइल कैमरा</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

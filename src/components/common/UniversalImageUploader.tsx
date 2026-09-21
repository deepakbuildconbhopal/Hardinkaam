import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Camera,
  Check,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Eye,
  Trash2,
  FileCheck,
} from 'lucide-react';
import { compressImageForWeb, formatBytes } from '../../utils/imageCompression';

interface UniversalImageUploaderProps {
  label: string;
  subLabel?: string;
  currentValue?: string;
  onChange: (value: string) => void;
  maxDimension?: number;
  quality?: number;
  maxSizeKB?: number;
  acceptCamera?: boolean;
  disabled?: boolean;
  aspectRatio?: 'square' | 'wide' | 'auto';
  helperTip?: string;
}

export const UniversalImageUploader: React.FC<UniversalImageUploaderProps> = ({
  label,
  subLabel,
  currentValue,
  onChange,
  maxDimension = 1000,
  quality = 0.82,
  maxSizeKB = 280,
  acceptCamera = true,
  disabled = false,
  aspectRatio = 'auto',
  helperTip,
}) => {
  const [compressing, setCompressing] = useState(false);
  const [stats, setStats] = useState<{
    orig: string;
    comp: string;
    ratio: number;
    format: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    setCompressing(true);
    setErrorMsg(null);
    setStats(null);

    try {
      const result = await compressImageForWeb(file, {
        maxDimension,
        quality,
        maxSizeKB,
      });

      onChange(result.dataUrl);
      setStats({
        orig: formatBytes(result.originalSize),
        comp: formatBytes(result.compressedSize),
        ratio: result.compressionRatio,
        format: result.format.replace('image/', '').toUpperCase(),
      });
    } catch (err: any) {
      console.error('Image compression failed:', err);
      setErrorMsg(err?.message || 'फोटो प्रोसेस करने में विफलता।');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || compressing) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold text-stone-800 block">{label}</label>
          {subLabel && <p className="text-[11px] text-stone-500">{subLabel}</p>}
        </div>
        {currentValue && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setStats(null);
            }}
            disabled={disabled}
            className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>हटाएं</span>
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        accept={acceptCamera ? 'image/*;capture=camera' : 'image/*'}
        disabled={disabled || compressing}
        className="hidden"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !compressing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-3.5 sm:p-4 text-center cursor-pointer transition-all ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-stone-50 border-stone-200'
            : isDragOver
            ? 'border-orange-500 bg-orange-50/70 scale-[1.005]'
            : currentValue
            ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40'
            : 'border-stone-300 hover:border-orange-400 bg-stone-50/70 hover:bg-orange-50/20'
        }`}
      >
        {compressing ? (
          <div className="flex flex-col items-center justify-center py-3 gap-2">
            <RefreshCw className="w-6 h-6 text-orange-600 animate-spin" />
            <div className="text-xs font-bold text-stone-800">
              वेबसाइट के लिए फोटो ऑटो-कंप्रेस हो रही है...
            </div>
            <span className="text-[11px] text-stone-500">
              साइज रिड्यूस &amp; फास्ट अपलोड प्रोसेस जारी है
            </span>
          </div>
        ) : currentValue ? (
          <div className="flex items-center gap-3">
            <img
              src={currentValue}
              alt={label}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className={`rounded-xl object-cover border border-stone-200 shadow-xs shrink-0 ${
                aspectRatio === 'wide' ? 'w-24 h-16' : 'w-16 h-16'
              }`}
            />
            <div className="text-left flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>फोटो कम्प्रेस्ड &amp; अटैच हो गई</span>
              </div>
              <p className="text-[11px] text-stone-500 truncate mt-0.5 max-w-[200px] sm:max-w-xs">
                फोटो तैयार है
              </p>
              <p className="text-[10px] text-orange-600 font-bold mt-1 flex items-center gap-1">
                <Camera className="w-3 h-3" />
                <span>बदलने के लिए यहाँ क्लिक करें</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 gap-1.5">
            <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 text-orange-600 flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-stone-800">
              <span className="text-orange-600 font-black underline">फोटो चुनें</span> या कैमरा से खींचें
            </p>
            <p className="text-[10px] text-stone-400">
              {helperTip || 'JPG, PNG, WebP — वेबसाइट के हिसाब से स्वतः कंप्रेस होगी ताकि जल्दी अपलोड हो'}
            </p>
          </div>
        )}
      </div>

      {stats && (
        <div className="flex items-center justify-between text-[10px] bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 rounded-xl text-emerald-900 font-medium">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>
              कंप्रेशन रिजल्ट: {stats.orig} ➔ <strong>{stats.comp}</strong> ({stats.format})
            </span>
          </span>
          <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
            {stats.ratio}% डेटा बचत
          </span>
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] font-bold text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded-xl border border-red-200">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </p>
      )}
    </div>
  );
};

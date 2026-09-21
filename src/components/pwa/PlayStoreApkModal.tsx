import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HardDriveDownload,
  X
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface PlayStoreApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreApkModal: React.FC<PlayStoreApkModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadAPK = () => {
    setDownloading(true);
    
    // 1. Direct browser download prompt for the PWA APK file
    const link = document.createElement('a');
    link.href = '/hardinkaam-app.apk';
    link.setAttribute('download', 'HARDINKAAM-PWA.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2. Trigger PWA native browser prompt if available
    if (isInstallable) {
      install().catch(() => {});
    }

    setTimeout(() => {
      setDownloading(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    }, 1000);
  };

  const handleWebPWAInstall = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      alert('iPhone / Safari पर इंस्टॉल करने के लिए Share बटन ⎋ पर टैप करें और "Add to Home Screen" चुनें।');
    } else {
      handleDownloadAPK();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider text-amber-200">
                  Official Mobile App
                </span>
                <span className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> PWA APK Ready
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                Download HARDINKAAM PWA APK
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-stone-800 dark:text-stone-200">
          {downloadSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>PWA APK फाइल डाउनलोड शुरू हो गई है! डाउनलोड्स में जाकर ऐप इंस्टॉल करें।</span>
            </div>
          )}

          {/* Dedicated Prominent PWA APK Download Button */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50/60 to-orange-100/40 dark:from-stone-800 dark:to-stone-850 border-2 border-orange-300/80 dark:border-orange-500/30 space-y-4 shadow-sm">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[11px] font-black uppercase">
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>Direct PWA APK Package</span>
              </div>
              <h3 className="font-black text-stone-900 dark:text-white text-lg">
                Download PWA APK File
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                ब्राउज़र के माध्यम से तुरंत HARDINKAAM PWA APK फाइल डाउनलोड करें और अपने डिवाइस पर बिना किसी रुकावट के तेज अनुभव पाएं।
              </p>
            </div>

            {/* Prominent Action Button */}
            <div className="pt-2 flex flex-col gap-2.5">
              <button
                id="btn-download-pwa-apk-modal"
                type="button"
                onClick={handleDownloadAPK}
                disabled={downloading}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-75"
              >
                {downloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>डाउनलोड शुरू हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 text-amber-200" />
                    <span>📲 Download PWA APK File (डाउनलोड करें)</span>
                  </>
                )}
              </button>

              {isInstallable && (
                <button
                  type="button"
                  onClick={handleWebPWAInstall}
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-900 dark:bg-stone-800 hover:bg-stone-800 text-stone-100 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isInstalled ? 'App Already Installed ✓' : 'Instant 1-Click Web Install'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Specifications */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
              <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span>बिजली जैसी गति</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">ऑफ़लाइन कैशिंग और 0.5 सेकंड लोडिंग सपोर्ट।</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60">
              <div className="font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% सुरक्षित</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">वेरिफाइड डिजिटल पैकेज, ऑटो सिंक।</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-stone-50 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            HARDINKAAM PWA Edition
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition cursor-pointer"
          >
            बंद करें (Close)
          </button>
        </div>
      </div>
    </div>
  );
};


import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  X,
  Share,
  PlusSquare,
} from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface PlayStoreApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreApkModal: React.FC<PlayStoreApkModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleWebPWAInstall = async () => {
    if (isInstallable) {
      setInstalling(true);
      const success = await install();
      setInstalling(false);
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      }
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
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> PWA Instant App
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                HARDINKAAM Mobile App
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
          {(installSuccess || isInstalled) && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>✓ HARDINKAAM वेब ऐप आपकी होम स्क्रीन पर सक्रिय और इंस्टॉल है!</span>
            </div>
          )}

          {/* Prominent PWA Web App Installation Section */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-orange-50 via-amber-50/60 to-orange-100/40 dark:from-stone-800 dark:to-stone-850 border-2 border-orange-300/80 dark:border-orange-500/30 space-y-4 shadow-sm">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[11px] font-black uppercase">
                <Zap className="w-3.5 h-3.5" />
                <span>Instant Progressive Web App</span>
              </div>
              <h3 className="font-black text-stone-900 dark:text-white text-lg">
                Install Official Web App (PWA)
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                1-क्लिक में अपने मोबाइल की होम स्क्रीन पर HARDINKAAM ऐप जोड़ें। 0.5 सेकंड लोडिंग, ऑफ़लाइन सपोर्ट और फुल-स्क्रीन अनुभव बिना किसी अतिरिक्त स्टोरेज के।
              </p>
            </div>

            {/* Action Area */}
            <div className="pt-2 flex flex-col gap-2.5">
              {isInstalled ? (
                <div className="w-full py-3 px-4 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>App Already Installed ✓</span>
                </div>
              ) : isInstallable ? (
                <button
                  id="btn-install-pwa-modal"
                  type="button"
                  onClick={handleWebPWAInstall}
                  disabled={installing}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm sm:text-base shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer disabled:opacity-75"
                >
                  {installing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>इंस्टॉल हो रहा है...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 text-amber-200" />
                      <span>📲 Install Web App (होम स्क्रीन पर जोड़ें)</span>
                    </>
                  )}
                </button>
              ) : isIOS ? (
                <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 space-y-2 text-xs">
                  <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Share className="w-4 h-4 text-orange-600" /> iPhone / iPad पर इंस्टॉल करें:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-stone-600 dark:text-stone-300 text-[11px] leading-relaxed">
                    <li>Safari में नीचे स्थित <strong>Share बटन (⎋)</strong> पर टैप करें।</li>
                    <li>नीचे स्क्रॉल करके <strong>"Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" /></strong> चुनें।</li>
                  </ol>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                  <p className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-orange-600" /> आसान इंस्टॉलेशन निर्देश:
                  </p>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    अपने मोबाइल ब्राउज़र मेनू (⋮) पर टैप करें और <strong>"Add to Home Screen"</strong> या <strong>"Install app"</strong> चुनें।
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Safe Android App Status Notification */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 flex items-start gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  Android app is currently being prepared.
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed">
                गूगल प्ले स्टोर और स्टैंडअलोन एंड्रॉयड पैकेज तैयार किया जा रहा है। तब तक तुरंत और सुगम अनुभव के लिए ऊपर दिए गए आधिकारिक PWA वेब ऐप का उपयोग करें।
              </p>
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
              <p className="text-[11px] text-stone-500 mt-0.5">वेरिफाइड PWA डिजिटल पैकेज, ऑटो सिंक।</p>
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


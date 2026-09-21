import React from 'react';
import { X, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallBannerProps {
  onOpenModal?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ onOpenModal }) => {
  const { isInstallable, isInstalled, isIOS, isDismissed, dismiss } = usePWAInstall();

  // If already installed or dismissed by the user, don't show the floating banner
  if (isInstalled || isDismissed) {
    return null;
  }

  // Only show if installable via beforeinstallprompt or on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleAction = () => {
    if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <div
      id="hardinkaam-pwa-install-banner"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-stone-900/95 text-white backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-2xl border border-orange-500/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-600/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs text-orange-400 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                PWA Fast App
              </span>
            </div>
            <p className="text-xs font-bold text-stone-100 truncate">
              📲 HARDINKAAM App Install करें
            </p>
            <p className="text-[10px] text-stone-400 truncate">
              तेज़ स्पीड • 1-टैप होम बुकिंग • ऑफ़लाइन सपोर्ट
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleAction}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-orange-600/30 transition active:scale-95 cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition cursor-pointer"
            title="बाद में (Dismiss)"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};


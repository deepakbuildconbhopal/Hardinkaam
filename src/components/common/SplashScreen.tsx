import React, { useEffect, useState } from 'react';
import { ShieldCheck, Zap, Wrench } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDurationMs = 750,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Hide static pre-render HTML splash screen if present
    const staticSplash = document.getElementById('app-splash-screen');
    if (staticSplash) {
      staticSplash.style.opacity = '0';
      setTimeout(() => staticSplash.remove(), 300);
    }

    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        setIsVisible(false);
        if (onComplete) onComplete();
      }, 350);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      id="hardinkaam-splash-screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-white select-none transition-opacity duration-300 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top branding tag */}
      <div className="pt-8 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1.5 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Verified On-Demand Platform
        </span>
      </div>

      {/* Center Hero Identity */}
      <div className="flex flex-col items-center text-center space-y-5 my-auto">
        {/* Animated Brand Logo Symbol */}
        <div className="relative">
          <div className="absolute -inset-4 bg-orange-500/20 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 p-0.5 shadow-2xl shadow-orange-950/50 flex items-center justify-center">
            <div className="w-full h-full bg-stone-900 rounded-[22px] flex items-center justify-center border border-white/10">
              <div className="flex items-center justify-center text-orange-500">
                <Wrench className="w-12 h-12 sm:w-14 sm:h-14 animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 max-w-sm">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center justify-center gap-1">
            <span>HARDIN</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
              KAAM
            </span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-stone-300">
            हर दिन का काम, भरोसेमंद नाम
          </p>
          <p className="text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
            Bhopal's #1 On-Demand Home Services &amp; Franchise
          </p>
        </div>

        {/* Minimalist Progress Loader */}
        <div className="w-48 h-1.5 bg-stone-800 rounded-full overflow-hidden relative mt-4">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full w-full animate-[shimmer_1.2s_infinite]" />
        </div>
      </div>

      {/* Footer Credentials */}
      <div className="pb-4 text-center space-y-1">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-stone-400">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Deepak Buildcon Initiative • Bhopal, MP</span>
        </div>
        <p className="text-[10px] text-stone-600 font-medium">
          Trusted Web Activity (TWA) &amp; PWA Enabled
        </p>
      </div>
    </div>
  );
};

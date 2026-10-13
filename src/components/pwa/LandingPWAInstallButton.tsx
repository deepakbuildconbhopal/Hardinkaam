import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

interface Props {
  className?: string;
  variant?: 'button' | 'banner';
}

export const LandingPWAInstallButton: React.FC<Props> = ({ className, variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed or not installable and not iOS, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop Install Flow
  if (isInstallable) {
    if (variant === 'banner') {
      return (
        <div className="bg-gradient-to-r from-[#141c4a] to-[#0a1030] border border-[#ff7a00]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-xs text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff7a00] to-[#ff3d00] flex items-center justify-center font-bold text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Hardinkaam Android & Desktop App</h4>
              <p className="text-slate-300">Install app on home screen for 1-tap bookings & instant updates.</p>
            </div>
          </div>
          <button
            onClick={install}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff7a00] to-[#ff3d00] hover:scale-105 transition font-bold text-white shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={install}
        className={
          className ||
          'px-3.5 py-1.5 rounded-full font-bold text-xs text-white bg-gradient-to-r from-[#ff7a00] to-[#ff3d00] hover:scale-105 transition shadow-md flex items-center gap-1.5 cursor-pointer'
        }
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={
            className ||
            'px-3.5 py-1.5 rounded-full font-bold text-xs text-white bg-white/10 border border-white/20 hover:bg-white/20 transition flex items-center gap-1.5 cursor-pointer'
          }
        >
          <Smartphone className="w-3.5 h-3.5 text-[#ffb066]" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-3xl bg-[#0f1638] border border-white/20 p-6 shadow-2xl text-white relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-[#ff7a00]/20 border border-[#ff7a00]/40 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-[#ff7a00]" />
              </div>

              <h3 className="text-lg font-bold text-white">Install Hardinkaam on iPhone / iPad</h3>
              <div className="mt-3 space-y-2 text-xs text-slate-300 leading-relaxed">
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#ff7a00] text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                    1
                  </span>
                  <span>Safari browser me niche <strong>Share button</strong> par tap karein.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#ff7a00] text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                    2
                  </span>
                  <span>Scroll karke <strong>Add to Home Screen</strong> select karein.</span>
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-xs text-white transition"
              >
                Samajh Gaya (Close)
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

import React, { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

export const OfflineNotice: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [isRetrying, setIsRetrying] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setIsRetrying(false);
      }
    }, 800);
  };

  if (isOnline && !showFullModal) {
    return null;
  }

  return (
    <>
      {/* Top persistent offline alert strip */}
      {!isOnline && (
        <div
          id="hardinkaam-offline-bar"
          className="fixed top-0 left-0 right-0 z-50 bg-stone-900/95 text-white backdrop-blur-md border-b border-orange-500/40 px-4 py-2 flex items-center justify-between text-xs shadow-lg animate-in slide-in-from-top duration-300"
        >
          <div className="flex items-center gap-2 max-w-2xl truncate">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <WifiOff className="w-4 h-4 text-orange-400 shrink-0" />
            <div className="flex items-center gap-1.5 font-medium truncate">
              <span className="font-bold text-orange-400">HARDINKAAM</span>
              <span>•</span>
              <span className="truncate">Internet connection nahi hai. Cached app shell loaded.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFullModal(true)}
              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-[11px] font-semibold text-stone-300 transition"
            >
              विवरण
            </button>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1 px-3 py-1 rounded bg-orange-600 hover:bg-orange-500 font-bold text-[11px] text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Checking...' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      {/* Full-screen offline modal when requested or when completely disconnected */}
      {(!isOnline && showFullModal) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-stone-200 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center mb-4 shadow-inner">
              <WifiOff className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              HARDINKAAM PWA OFFLINE
            </div>

            <h2 className="text-2xl font-black text-stone-900 tracking-tight mb-2">
              HARDINKAAM
            </h2>

            <p className="text-base font-bold text-stone-800 mb-1">
              Internet connection nahi hai.
            </p>

            <p className="text-sm text-stone-600 mb-6">
              Connection check karke dobara try karein.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-left mb-6 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                सुरक्षा सूचना (Offline Protection)
              </div>
              <p className="text-stone-600 leading-relaxed">
                ऑफ़लाइन होने पर कोई नया बुकिंग ऑर्डर, भुगतान (payment), अथवा लॉगिन ट्रांज़ैक्शन प्रोसेस नहीं होगा। इंटरनेट बहाल होते ही आप बुकिंग जारी रख सकते हैं।
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full py-3.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Checking connection...' : 'Retry (पुनः प्रयास करें)'}
              </button>

              <button
                onClick={() => setShowFullModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition cursor-pointer"
              >
                कैश्ड ऐप देखें (View Cached App)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, Sparkles } from 'lucide-react';

export const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('HARDINKAAM Service Worker registered successfully');
      }
    },
    onRegisterError(error) {
      console.warn('HARDINKAAM Service Worker registration warning:', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      id="hardinkaam-pwa-update-toast"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-6 md:right-auto md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-2xl border border-amber-500/50 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">
              New version available
            </p>
            <p className="text-[11px] text-stone-400 truncate">
              HARDINKAAM का नया अपडेट उपलब्ध है।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setNeedRefresh(false)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-400 hover:text-white transition cursor-pointer"
          >
            Later
          </button>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-600/30 transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

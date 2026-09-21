import React, { useState } from 'react';
import { Sparkles, Megaphone, ChevronRight, X } from 'lucide-react';
import { AdminBroadcastMessage, BroadcastTheme } from '../../types/broadcast';
import { adminBroadcastService } from '../../services/adminBroadcastService';

interface Props {
  message: AdminBroadcastMessage | null;
  onOpenDetails: (message: AdminBroadcastMessage) => void;
}

const THEME_STYLES: Record<
  BroadcastTheme,
  {
    bannerBg: string;
    border: string;
    badgeBg: string;
    textColor: string;
    btnBg: string;
  }
> = {
  golden: {
    bannerBg: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700',
    border: 'border-amber-400',
    badgeBg: 'bg-amber-900/40 text-amber-100 border-amber-300/40',
    textColor: 'text-white',
    btnBg: 'bg-white/20 hover:bg-white/30 text-white',
  },
  saffron: {
    bannerBg: 'bg-gradient-to-r from-orange-600 via-amber-600 to-red-600',
    border: 'border-orange-400',
    badgeBg: 'bg-orange-950/40 text-orange-100 border-orange-300/40',
    textColor: 'text-white',
    btnBg: 'bg-white/20 hover:bg-white/30 text-white',
  },
  emerald: {
    bannerBg: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800',
    border: 'border-emerald-400',
    badgeBg: 'bg-emerald-950/40 text-emerald-100 border-emerald-300/40',
    textColor: 'text-white',
    btnBg: 'bg-white/20 hover:bg-white/30 text-white',
  },
  crimson: {
    bannerBg: 'bg-gradient-to-r from-rose-600 via-pink-600 to-red-700',
    border: 'border-rose-400',
    badgeBg: 'bg-rose-950/40 text-rose-100 border-rose-300/40',
    textColor: 'text-white',
    btnBg: 'bg-white/20 hover:bg-white/30 text-white',
  },
  royal_blue: {
    bannerBg: 'bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-800',
    border: 'border-indigo-400',
    badgeBg: 'bg-indigo-950/40 text-indigo-100 border-indigo-300/40',
    textColor: 'text-white',
    btnBg: 'bg-white/20 hover:bg-white/30 text-white',
  },
};

export const BroadcastAnnouncementBanner: React.FC<Props> = ({ message, onOpenDetails }) => {
  const [dismissedLocally, setDismissedLocally] = useState(false);

  if (!message || dismissedLocally) return null;

  const style = THEME_STYLES[message.theme] || THEME_STYLES.golden;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedLocally(true);
    adminBroadcastService.markDismissed(message.id);
  };

  return (
    <div
      className={`relative w-full ${style.bannerBg} border-b ${style.border} text-white shadow-md z-30 transition-all`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        <div
          onClick={() => onOpenDetails(message)}
          className="flex items-center gap-2.5 flex-1 min-w-[260px] cursor-pointer hover:opacity-95 transition-opacity"
        >
          <span className="text-xl flex-shrink-0 animate-bounce">
            {message.emoji || '🪔'}
          </span>

          <span
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.badgeBg}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {message.type === 'festival' ? 'त्योहार बधाई' : 'प्रशासनिक सूचना'}
          </span>

          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs sm:text-sm font-black tracking-tight leading-tight line-clamp-1">
              {message.title}
            </span>
            <span className="text-[11px] text-white/80 hidden md:inline truncate max-w-md">
              • {message.body}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDetails(message)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 backdrop-blur-sm border border-white/25 ${style.btnBg} transition-all cursor-pointer`}
          >
            <span>संदेश पढ़ें</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className="p-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

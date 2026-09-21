import React, { useEffect } from 'react';
import { Sparkles, X, Check, Megaphone, Heart, ExternalLink } from 'lucide-react';
import { AdminBroadcastMessage, BroadcastTheme } from '../../types/broadcast';
import { adminBroadcastService } from '../../services/adminBroadcastService';

interface Props {
  message: AdminBroadcastMessage | null;
  onClose: () => void;
  onAction?: (actionUrlOrTab?: string) => void;
}

const THEME_STYLES: Record<
  BroadcastTheme,
  {
    headerBg: string;
    border: string;
    accentBadge: string;
    btnBg: string;
    iconColor: string;
    glow: string;
  }
> = {
  golden: {
    headerBg: 'bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-600',
    border: 'border-amber-300',
    accentBadge: 'bg-amber-100 text-amber-900 border-amber-300',
    btnBg: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/25',
    iconColor: 'text-amber-400',
    glow: 'shadow-amber-500/20',
  },
  saffron: {
    headerBg: 'bg-gradient-to-br from-orange-600 via-amber-600 to-red-600',
    border: 'border-orange-300',
    accentBadge: 'bg-orange-100 text-orange-950 border-orange-300',
    btnBg: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white shadow-orange-500/25',
    iconColor: 'text-orange-300',
    glow: 'shadow-orange-500/20',
  },
  emerald: {
    headerBg: 'bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900',
    border: 'border-emerald-300',
    accentBadge: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-emerald-500/25',
    iconColor: 'text-emerald-300',
    glow: 'shadow-emerald-500/20',
  },
  crimson: {
    headerBg: 'bg-gradient-to-br from-rose-600 via-pink-600 to-red-700',
    border: 'border-rose-300',
    accentBadge: 'bg-rose-100 text-rose-950 border-rose-300',
    btnBg: 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-rose-500/25',
    iconColor: 'text-pink-300',
    glow: 'shadow-rose-500/20',
  },
  royal_blue: {
    headerBg: 'bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900',
    border: 'border-indigo-300',
    accentBadge: 'bg-indigo-100 text-indigo-950 border-indigo-300',
    btnBg: 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white shadow-indigo-500/25',
    iconColor: 'text-indigo-300',
    glow: 'shadow-indigo-500/20',
  },
};

const AUDIENCE_LABELS: Record<string, string> = {
  all: '🌟 सभी प्रिय उपयोगकर्ताओं हेतु (All Users)',
  customer: '🛍️ ग्राहक विशेष संदेश (Customer Special)',
  service_man: '🔧 सर्विसमैन साथी विशेष (Service Professional)',
  franchise: '🏢 जिला फ्रेंचाइजी पार्टनर विशेष (Franchise Partner)',
  brand_promoter: '🤝 ब्रांड प्रमोटर विशेष (Business Partner)',
};

export const BroadcastWelcomeModal: React.FC<Props> = ({ message, onClose, onAction }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [message]);

  if (!message) return null;

  const style = THEME_STYLES[message.theme] || THEME_STYLES.golden;
  const audienceLabel = AUDIENCE_LABELS[message.audience] || AUDIENCE_LABELS.all;

  const handleDismiss = () => {
    adminBroadcastService.markDismissed(message.id);
    onClose();
  };

  const handleActionClick = () => {
    adminBroadcastService.markDismissed(message.id);
    onClose();
    if (message.actionUrlOrTab && onAction) {
      onAction(message.actionUrlOrTab);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border ${style.border} overflow-hidden transform animate-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Top Accent Bar */}
        <div className={`relative ${style.headerBg} p-6 sm:p-7 text-white text-center overflow-hidden`}>
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

          {/* Close Icon Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/35 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Festive / Announcement Emoji Icon */}
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-3xl shadow-lg mb-3">
            {message.emoji || (message.type === 'festival' ? '🪔' : '📢')}
          </div>

          {/* Target Audience Pill */}
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/25 text-white backdrop-blur-sm border border-white/30">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              {audienceLabel}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black text-white leading-snug tracking-tight px-2 drop-shadow-sm">
            {message.title}
          </h2>

          <p className="text-xs text-white/80 mt-1 font-medium">
            प्रशासनिक कार्यालय • दीपक बिल्डकॉन व हरदिनकाम सर्विसेज
          </p>
        </div>

        {/* Message Body */}
        <div className="p-6 sm:p-7 space-y-5 bg-stone-50/50">
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 shadow-xs text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
            {message.body}
          </div>

          {/* Official Sign-off Footer */}
          <div className="flex items-center justify-between text-xs text-stone-500 border-t border-stone-200/60 pt-3">
            <div className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>हार्दिक शुभकामनाओं सहित</span>
            </div>
            <span className="font-semibold text-stone-600">
              टीम हरदिनकाम (Deepak Buildcon)
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-bold transition-all cursor-pointer"
            >
              बंद करें (Dismiss)
            </button>

            <button
              type="button"
              onClick={handleActionClick}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl ${style.btnBg} font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer`}
            >
              <Check className="w-4 h-4" />
              <span>{message.actionLabel || 'स्वीकार करें'}</span>
              {message.actionUrlOrTab && <ExternalLink className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

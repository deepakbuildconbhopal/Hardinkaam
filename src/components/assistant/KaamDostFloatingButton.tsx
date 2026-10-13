import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, MessageSquare, X } from 'lucide-react';
import { AssistantLanguage } from './types';

interface KaamDostFloatingButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  unreadCount?: number;
  lang: AssistantLanguage;
}

export const KaamDostFloatingButton: React.FC<KaamDostFloatingButtonProps> = ({
  isOpen,
  onToggle,
  unreadCount = 0,
  lang,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Show a gentle greeting tooltip after 2.5 seconds on first mount if not open
  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
      return;
    }

    const timer = setTimeout(() => {
      // Don't show if user dismissed it in this session
      const dismissed = sessionStorage.getItem('hardinkaam_assistant_tooltip_dismissed');
      if (!dismissed) {
        setShowTooltip(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleDismissTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(false);
    sessionStorage.setItem('hardinkaam_assistant_tooltip_dismissed', 'true');
  };

  const getGreetingText = () => {
    if (lang === 'hi') return 'नमस्ते! मैं कामदोस्त हूँ 👋 कोई भी सेवा बुक करवाएं';
    if (lang === 'hinglish') return 'Namaste! Main KaamDost hoon 👋 Kuch kaam karwana hai?';
    return 'Hi! I am KaamDost 👋 Need help booking a service?';
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end pointer-events-none select-none">
      {/* Speech Bubble / Tooltip Banner */}
      {!isOpen && showTooltip && (
        <div
          onClick={onToggle}
          className="pointer-events-auto mb-3 max-w-[280px] sm:max-w-xs bg-white text-stone-900 px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-200/80 cursor-pointer animate-bounce hover:animate-none transition-all flex items-start gap-2.5 group relative"
          style={{ animationDuration: '3s' }}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-600">KaamDost AI 🤝</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-stone-800 leading-snug mt-0.5">
              {getGreetingText()}
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismissTooltip}
            className="absolute top-2 right-2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-100 transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Arrow */}
          <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white" />
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        id="kaamdost-floating-button"
        onClick={onToggle}
        aria-label="Open KaamDost AI Digital Assistant"
        className={`pointer-events-auto group relative flex items-center gap-2.5 px-3.5 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-300 ${
          isOpen
            ? 'bg-stone-900 text-white hover:bg-stone-800 ring-2 ring-orange-500'
            : 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white hover:brightness-110 shadow-orange-500/30'
        }`}
      >
        {/* Glow Ring */}
        {!isOpen && (
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 opacity-40 blur-sm group-hover:opacity-75 transition duration-500 animate-pulse" />
        )}

        {/* Assistant Avatar Badge */}
        <div className="relative z-10 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 shadow-inner group-hover:scale-105 transition-transform">
          {isOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <>
              <Bot className="w-5 h-5 text-white animate-wiggle" />
              {/* Online Indicator Dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white" />
              </span>
            </>
          )}
        </div>

        {/* Button Label & Status */}
        <div className="relative z-10 text-left pr-1 hidden xs:block">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1">
              {isOpen ? 'बंद करें' : 'KaamDost AI'}
              {!isOpen && <span className="text-amber-200">🤝</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-amber-100 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{isOpen ? 'बातचीत जारी है' : 'ऑनलाइन डिजिटल दोस्त'}</span>
          </div>
        </div>

        {/* Unread Message Count Badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -left-1 z-20 flex items-center justify-center min-w-5 h-5 px-1.5 text-[11px] font-black text-white bg-red-600 rounded-full ring-2 ring-white shadow">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

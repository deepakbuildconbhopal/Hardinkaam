import React, { useState, useEffect, useRef } from 'react';
import { Phone, MessageSquare, PhoneCall, Copy, Check, X, ShieldCheck, Clock } from 'lucide-react';

export const getGlobalHelpline = (): string => {
  try {
    const custom = localStorage.getItem('hardinkaam_global_helpline');
    if (custom && custom.trim().length >= 10) {
      return custom.trim().replace(/\D/g, '');
    }
  } catch {}
  return '6267546945';
};

export const getGlobalHelplineDisplay = (): string => {
  const num = getGlobalHelpline();
  if (num.length >= 10) {
    const raw = num.slice(-10);
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  }
  return `+91 ${num}`;
};

export const SupportFloatingButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phoneNum, setPhoneNum] = useState(getGlobalHelpline);
  const containerRef = useRef<HTMLDivElement>(null);

  // Listen to helpline updates in real-time across the app
  useEffect(() => {
    const handleHelplineChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent?.detail) {
        const cleaned = String(customEvent.detail).trim().replace(/\D/g, '');
        if (cleaned.length >= 10) {
          setPhoneNum(cleaned);
        }
      } else {
        setPhoneNum(getGlobalHelpline());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'hardinkaam_global_helpline' || e.key === 'hardinkaam_platform_settings') {
        setPhoneNum(getGlobalHelpline());
      }
    };

    window.addEventListener('helpline_updated', handleHelplineChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('helpline_updated', handleHelplineChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const telHref = `tel:+91${phoneNum}`;
  const whatsappHref = `https://wa.me/91${phoneNum}?text=${encodeURIComponent(
    'नमस्ते HARDINKAAM (दीपक बिल्डकॉन) सपोर्ट! मुझे सेवा / बुकिंग के संबंध में सहायता चाहिए।'
  )}`;
  const displayStr = getGlobalHelplineDisplay();

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(phoneNum);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = phoneNum;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy notice:', err);
    }
  };

  const handleOpenDialer = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = telHref;
    setIsOpen(false);
  };

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(whatsappHref, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <aside
      ref={containerRef}
      aria-label="HARDINKAAM 24x7 Customer Support Helpline"
      className="fixed bottom-24 right-4 sm:bottom-24 sm:right-6 z-40 flex flex-col items-end select-none"
    >
      {/* Expanded Quick Action Popover (Opens Upward in Bottom-Right) */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-dialog-title"
          className="mb-2.5 w-[300px] sm:w-[320px] max-w-[calc(100vw-24px)] bg-stone-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-emerald-500/40 p-4 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <h3 id="support-dialog-title" className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                  <span>24x7 कस्टमर केयर सपोर्ट</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-stone-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  <span>तुरंत डायलर या व्हाट्सएप खोलें</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close support dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Number Display with Copy */}
          <div className="my-3 p-3 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                आधिकारिक हेल्पलाइन नंबर
              </span>
              <span className="text-base font-black tracking-wide text-emerald-400 font-mono">
                {displayStr}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors border border-stone-700 cursor-pointer"
              title="नंबर कॉपी करें"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">कॉपी हुआ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>कॉपी</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons: Phone Dialer & WhatsApp */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {/* Phone Dialer Button */}
            <a
              href={telHref}
              onClick={handleOpenDialer}
              id="support-fab-dialer-btn"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>कॉल डायल करें</span>
            </a>

            {/* WhatsApp Direct Chat Button */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleOpenWhatsApp}
              id="support-fab-whatsapp-btn"
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>व्हाट्सएप</span>
            </a>
          </div>

          {/* Trust / Official Note */}
          <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>दीपक बिल्डकॉन भोपाल</span>
            </span>
            <span className="text-stone-400">24x7 सेवा गारंटी</span>
          </div>
        </div>
      )}

      {/* Persistent Floating Action Pill / Button in Bottom-Right */}
      <div
        className="group relative flex items-center bg-stone-900/95 hover:bg-stone-900 text-white pl-2 pr-1.5 py-1.5 rounded-full shadow-2xl border border-emerald-500/50 hover:border-emerald-400 transition-all duration-300 hover:shadow-emerald-500/30 hover:shadow-xl backdrop-blur-md cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Support Helpline ${phoneNum}. Click to call or chat on WhatsApp.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        {/* Pulsing Glow Ring */}
        <span className="absolute -inset-0.5 rounded-full bg-emerald-500/25 blur-sm group-hover:bg-emerald-500/40 transition-all pointer-events-none" />

        {/* Live Status Indicator & Phone Icon */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md mr-2 shrink-0">
          <Phone className="w-4 h-4 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-stone-900" />
          </span>
        </div>

        {/* Phone Number Display & Label */}
        <div className="flex flex-col text-left mr-2.5">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400 leading-none">
            हेल्पलाइन
          </span>
          <span className="text-xs sm:text-sm font-black tracking-wide text-white font-mono leading-tight">
            {phoneNum}
          </span>
        </div>

        {/* Direct Action Quick-Launch Buttons (One-Click Dial & WhatsApp) */}
        <div className="flex items-center gap-1 pl-1 border-l border-stone-700/80">
          {/* Quick Call Icon (Direct to Phone Dialer) */}
          <a
            href={telHref}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDialer(e);
            }}
            title="तुरंत कॉल करें (Open Phone Dialer)"
            aria-label={`Direct Phone Call to ${phoneNum}`}
            className="w-7 h-7 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
          >
            <PhoneCall className="w-3.5 h-3.5" />
          </a>

          {/* Quick WhatsApp Icon (Direct to WhatsApp) */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenWhatsApp(e);
            }}
            title="व्हाट्सएप चैट (Direct WhatsApp)"
            aria-label={`Direct WhatsApp message to ${phoneNum}`}
            className="w-7 h-7 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
};

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, Zap, AlertCircle, Info, X, ExternalLink } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type: 'accepted' | 'in_progress' | 'success' | 'info' | 'warning';
  bookingId?: string;
  serviceName?: string;
  proName?: string;
  createdAt: number;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'>) => string;
  dismissToast: (id: string) => void;
  onOpenBooking?: (bookingId: string) => void;
  setOnOpenBookingHandler: (handler: (bookingId: string) => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const onOpenBookingRef = useRef<((bookingId: string) => void) | null>(null);

  const setOnOpenBookingHandler = useCallback((handler: (bookingId: string) => void) => {
    onOpenBookingRef.current = handler;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toastData: Omit<ToastMessage, 'id' | 'createdAt'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = {
        ...toastData,
        id,
        createdAt: Date.now(),
      };

      setToasts((prev) => [newToast, ...prev].slice(0, 4));

      // Auto-dismiss after duration (default 6000ms)
      const duration = toastData.duration ?? 6500;
      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        dismissToast,
        onOpenBooking: onOpenBookingRef.current || undefined,
        setOnOpenBookingHandler,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div
        id="realtime-toast-container"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 pointer-events-none"
        role="region"
        aria-label="Real-time notifications"
      >
        {toasts.map((toast) => {
          const isAccepted = toast.type === 'accepted';
          const isInProgress = toast.type === 'in_progress';

          return (
            <div
              key={toast.id}
              id={`toast-item-${toast.id}`}
              className={`pointer-events-auto w-full p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
                isAccepted
                  ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-50 shadow-emerald-900/30'
                  : isInProgress
                  ? 'bg-amber-950/95 border-amber-500/50 text-amber-50 shadow-amber-900/30'
                  : toast.type === 'success'
                  ? 'bg-stone-900/95 border-emerald-500/40 text-stone-100'
                  : 'bg-stone-900/95 border-stone-700 text-stone-100'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Visual Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isAccepted
                      ? 'bg-emerald-500 text-emerald-950 ring-2 ring-emerald-400/40'
                      : isInProgress
                      ? 'bg-amber-500 text-amber-950 ring-2 ring-amber-400/40 animate-pulse'
                      : 'bg-stone-700 text-stone-200'
                  }`}
                >
                  {isAccepted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isInProgress ? (
                    <Zap className="w-5 h-5 fill-current" />
                  ) : (
                    <Info className="w-5 h-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      {isAccepted
                        ? 'Booking Accepted'
                        : isInProgress
                        ? 'Service In Progress'
                        : 'Update'}
                    </span>
                    {toast.bookingId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-stone-300">
                        #{toast.bookingId.slice(-6)}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-extrabold leading-tight text-white line-clamp-1">
                    {toast.title}
                  </h4>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed line-clamp-2">
                    {toast.description}
                  </p>

                  {/* Interactive Action: Open Booking Modal */}
                  {toast.bookingId && onOpenBookingRef.current && (
                    <button
                      type="button"
                      onClick={() => {
                        if (toast.bookingId && onOpenBookingRef.current) {
                          onOpenBookingRef.current(toast.bookingId);
                          dismissToast(toast.id);
                        }
                      }}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <span>View Booking Status</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Dismiss toast"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

import React from 'react';
import {
  AlertTriangle,
  RotateCcw,
  PhoneCall,
  HelpCircle,
  MessageCircle,
  ShieldAlert,
} from 'lucide-react';
import { UserFriendlyError, kaamDostErrorHandler } from './kaamDostErrorHandler';
import { AssistantLanguage } from './types';

interface GracefulErrorCardProps {
  error: UserFriendlyError;
  lang?: AssistantLanguage;
  onRetry?: (actionType?: string, payload?: any) => void;
  onContactSupport?: () => void;
}

export const GracefulErrorCard: React.FC<GracefulErrorCardProps> = ({
  error,
  lang = 'hi',
  onRetry,
  onContactSupport,
}) => {
  const displayMessage = kaamDostErrorHandler.getLocalizedMessage(error, (lang || 'hi') as AssistantLanguage);

  return (
    <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-4 sm:p-5 text-white shadow-xl my-2 max-w-md w-full space-y-3 animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-300">{error.title}</h4>
            <span className="text-[10px] text-stone-400">HARDINKAAM Graceful Handler</span>
          </div>
        </div>

        <span className="text-[9px] font-mono uppercase bg-amber-950/60 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20">
          {error.code}
        </span>
      </div>

      {/* Body Message */}
      <p className="text-xs text-stone-200 leading-relaxed font-medium">
        {displayMessage}
      </p>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2">
        {error.retryAction && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(error.retryAction?.actionType, error.retryAction?.payload)}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 border border-amber-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{error.retryAction.label || '🔄 पुनः प्रयास करें (Retry)'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (onContactSupport) {
              onContactSupport();
            } else {
              window.open(`tel:${error.supportContact || '+916267546945'}`, '_self');
            }
          }}
          className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-stone-700"
        >
          <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
          <span>📞 हेल्पलाइन (24x7 Support)</span>
        </button>
      </div>
    </div>
  );
};

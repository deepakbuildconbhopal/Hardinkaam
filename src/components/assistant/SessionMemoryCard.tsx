import React, { useState } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
  Wrench,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { StructuredBookingContext, RequiredBookingField } from './memoryTypes';
import { AssistantLanguage } from './types';

interface SessionMemoryCardProps {
  context: StructuredBookingContext;
  missingFields: RequiredBookingField[];
  lang: AssistantLanguage;
  onResetMemory: () => void;
  userProfile?: any;
}

export const SessionMemoryCard: React.FC<SessionMemoryCardProps> = ({
  context,
  missingFields,
  lang,
  onResetMemory,
  userProfile,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any meaningful information has been gathered
  const hasAnyData = Boolean(
    context.serviceCategory ||
      context.serviceType ||
      context.location ||
      context.address ||
      context.area ||
      context.preferredDate ||
      context.preferredTime ||
      context.customerName ||
      context.mobile
  );

  if (!hasAnyData) {
    return null;
  }

  const isReady = missingFields.length === 0;

  // Active items summary
  const serviceText = context.serviceType || context.serviceCategory;
  const locationText = context.area || context.location || context.address || userProfile?.address;
  const dateText = context.preferredDate;
  const timeText = context.preferredTime;
  const contactText = context.customerName || userProfile?.name;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/80 px-3 py-2 text-xs transition-all">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 font-medium text-amber-950 text-left hover:text-amber-800 transition-colors"
        >
          <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-semibold text-[11px] tracking-tight text-amber-900">
            {lang === 'hi'
              ? 'KaamDost Memory'
              : lang === 'hinglish'
              ? 'KaamDost Active Context'
              : 'Active Booking Memory'}
          </span>

          {isReady ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {lang === 'hi' ? 'सभी विवरण तैयार' : 'Ready to Book'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
              {lang === 'hi'
                ? `छूटे: ${missingFields.length}`
                : `Missing: ${missingFields.length}`}
            </span>
          )}

          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-amber-700 ml-1" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-amber-700 ml-1" />
          )}
        </button>

        {/* Quick inline preview when collapsed */}
        {!isExpanded && (
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-amber-800/80 max-w-[240px] truncate">
            {serviceText && <span className="truncate font-medium">⚡ {serviceText}</span>}
            {locationText && <span className="truncate">📍 {locationText}</span>}
            {dateText && <span className="truncate">📅 {dateText}</span>}
          </div>
        )}

        <button
          type="button"
          onClick={onResetMemory}
          title={lang === 'hi' ? 'स्मृति रीसेट करें' : 'Reset Memory'}
          className="text-amber-700/70 hover:text-amber-900 p-1 hover:bg-amber-100/60 rounded transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded detailed breakdown */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-amber-200/60 grid grid-cols-2 gap-1.5 text-[11px]">
          {/* Service */}
          <div className="flex items-center gap-1.5 bg-white/70 p-1.5 rounded border border-amber-100">
            <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="truncate">
              <span className="text-gray-500 text-[9px] block">सेवा (Service)</span>
              <span className="font-semibold text-gray-800 truncate block">
                {serviceText || <span className="text-gray-400 italic">चुनना बाकी</span>}
              </span>
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 bg-white/70 p-1.5 rounded border border-amber-100">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-gray-500 text-[9px] block">स्थान (Location)</span>
              <span className="font-semibold text-gray-800 truncate block">
                {locationText || <span className="text-gray-400 italic">पूछना बाकी</span>}
              </span>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1.5 bg-white/70 p-1.5 rounded border border-amber-100">
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="truncate">
              <span className="text-gray-500 text-[9px] block">तारीख (Date)</span>
              <span className="font-semibold text-gray-800 truncate block">
                {dateText || <span className="text-gray-400 italic">तय करना बाकी</span>}
              </span>
            </div>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 bg-white/70 p-1.5 rounded border border-amber-100">
            <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <div className="truncate">
              <span className="text-gray-500 text-[9px] block">समय (Time)</span>
              <span className="font-semibold text-gray-800 truncate block">
                {timeText || <span className="text-gray-400 italic">स्लॉट बाकी</span>}
              </span>
            </div>
          </div>

          {/* Customer / Phone */}
          <div className="col-span-2 flex items-center justify-between bg-white/70 px-2 py-1.5 rounded border border-amber-100 text-[10px]">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-600" />
              <span className="font-medium text-gray-700">
                {contactText || 'अतिथि (Guest)'}
              </span>
              {(context.mobile || userProfile?.phone) && (
                <span className="text-gray-500 flex items-center gap-0.5">
                  • <Phone className="w-2.5 h-2.5 text-gray-400" />
                  {context.mobile || userProfile?.phone}
                </span>
              )}
            </div>

            {userProfile?.address && (
              <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                ✓ प्रोफाइल पता स्वतः सुरक्षित
              </span>
            )}
          </div>

          {/* Notice: No unnecessary questions */}
          <div className="col-span-2 text-[10px] text-amber-800/90 italic flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>
              {lang === 'hi'
                ? 'AI केवल अनुपलब्ध (Missing) जानकारी पूछेगा, पहले से दी गई जानकारी दोबारा नहीं पूछी जाएगी।'
                : 'AI only prompts for missing fields; existing details are remembered and reused.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  ClipboardList,
  Wrench,
  AlertCircle,
  MapPin,
  Calendar,
  Clock,
  Camera,
  DollarSign,
  Edit3,
  CheckCircle2,
  Sparkles,
  Phone,
  User,
  RotateCcw,
} from 'lucide-react';
import { StructuredBookingContext, RequiredBookingField } from './memoryTypes';
import { AssistantLanguage } from './types';

interface LiveBookingSummaryCardProps {
  context: StructuredBookingContext;
  missingFields: RequiredBookingField[];
  attachmentsCount?: number;
  lang?: AssistantLanguage;
  onConfirmBooking?: () => void;
  onEditField?: (field: string) => void;
  onResetSession?: () => void;
  isInlineMessageCard?: boolean;
}

export const LiveBookingSummaryCard: React.FC<LiveBookingSummaryCardProps> = ({
  context,
  missingFields = [],
  attachmentsCount = 0,
  lang = 'hi',
  onConfirmBooking,
  onEditField,
  onResetSession,
  isInlineMessageCard = false,
}) => {
  const isHindi = lang === 'hi';

  const service = context.serviceType || context.serviceCategory;
  const problem = context.problemNotes || context.symptoms?.[0] || 'डोरस्टेप चेकअप व रिपेयर';
  const address = context.address || context.location || context.area;
  const date = context.preferredDate;
  const time = context.preferredTime;
  const price = context.estimatedPrice || (service ? 299 : undefined);
  const contact = context.customerName ? `${context.customerName} (${context.mobile || ''})` : context.mobile;

  const totalCollectedCount = [service, address, date, time].filter(Boolean).length;
  if (totalCollectedCount === 0) return null;

  const isComplete = missingFields.length === 0;

  return (
    <div
      className={`bg-gradient-to-br from-stone-900 via-stone-850 to-orange-950 rounded-3xl text-white shadow-xl border border-stone-800/90 overflow-hidden transition-all duration-300 ${
        isInlineMessageCard ? 'my-2 max-w-md w-full' : 'p-4 sm:p-5'
      }`}
    >
      {/* Top Header Bar */}
      <div className="bg-stone-900/90 px-4 py-3 border-b border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-orange-600/30 text-orange-400 border border-orange-500/40">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block">
              {isComplete ? '✅ तैयार (Draft Complete)' : '🔄 लाइव बुकिंग समरी (Live Summary)'}
            </span>
            <h4 className="text-xs font-black text-white">
              {isHindi ? 'बुकिंग विवरण (Booking Details)' : 'Booking Details'}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {totalCollectedCount}/4 पूर्ण
          </span>
          {onResetSession && (
            <button
              type="button"
              onClick={onResetSession}
              className="p-1 hover:bg-stone-800 rounded-lg text-stone-400 hover:text-stone-200 transition cursor-pointer"
              title="रीसेट करें"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Items Grid */}
      <div className="p-4 space-y-2.5 text-xs font-medium divide-y divide-stone-800/60">
        {/* Service Item */}
        <div className="pt-1 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-stone-300">
            <Wrench className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="text-[11px] text-stone-400">Service:</span>
          </div>
          <span className="font-bold text-white text-right">
            {service || <span className="text-amber-400 italic">चुनना बाकी है</span>}
          </span>
        </div>

        {/* Problem Item */}
        <div className="pt-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-stone-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] text-stone-400">Problem:</span>
          </div>
          <span className="font-bold text-stone-200 text-right line-clamp-1">{problem}</span>
        </div>

        {/* Address Item */}
        <div className="pt-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-stone-300">
            <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-[11px] text-stone-400">Address:</span>
          </div>
          <span className="font-bold text-white text-right max-w-[200px] truncate">
            {address || <span className="text-amber-400 italic">पता दर्ज करें</span>}
          </span>
        </div>

        {/* Date Item */}
        <div className="pt-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-stone-300">
            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-[11px] text-stone-400">Date:</span>
          </div>
          <span className="font-bold text-white text-right">
            {date || <span className="text-amber-400 italic">तारीख चुनें</span>}
          </span>
        </div>

        {/* Time Item */}
        <div className="pt-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-stone-300">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-stone-400">Time:</span>
          </div>
          <span className="font-bold text-white text-right">
            {time || <span className="text-amber-400 italic">समय चुनें</span>}
          </span>
        </div>

        {/* Photo/Attachments count */}
        {attachmentsCount > 0 && (
          <div className="pt-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-stone-300">
              <Camera className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span className="text-[11px] text-stone-400">Photo:</span>
            </div>
            <span className="font-bold text-emerald-300 text-right">
              {attachmentsCount} attached
            </span>
          </div>
        )}

        {/* Estimated Price */}
        {price && (
          <div className="pt-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-stone-300">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-stone-400">Estimated Total:</span>
            </div>
            <span className="font-black text-emerald-400 text-sm">₹{price}</span>
          </div>
        )}

        {/* Contact info */}
        {contact && (
          <div className="pt-2 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-stone-300">
              <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-[11px] text-stone-400">Customer:</span>
            </div>
            <span className="font-bold text-stone-200 text-right truncate">{contact}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-3 bg-stone-900/80 border-t border-stone-800 flex items-center justify-between gap-2">
        {onEditField && (
          <button
            type="button"
            onClick={() => onEditField('all')}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border border-stone-700"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isHindi ? 'विवरण बदलें (Edit Details)' : 'Edit Details'}</span>
          </button>
        )}

        {onConfirmBooking && (
          <button
            type="button"
            onClick={onConfirmBooking}
            className={`px-4 py-2 text-white font-black text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-emerald-950/40 border border-emerald-400'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 shadow-orange-950/40 border border-amber-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isHindi ? 'कन्फर्म करें (Confirm Booking)' : 'Confirm Booking'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

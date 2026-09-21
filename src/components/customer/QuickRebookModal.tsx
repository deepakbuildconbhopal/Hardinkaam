import React, { useState, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Sparkles,
  User,
  Star,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Booking, Service, ServiceMan } from '../../types';
import { LazyImage } from '../common/LazyImage';
import { getStandardDurationMinutes } from './ServiceEtaWidget';

interface QuickRebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  services?: Service[];
  serviceMen?: ServiceMan[];
  onConfirmRebook: (service: Service, preferredPro?: ServiceMan) => void;
}

export function getServiceForBooking(booking: Booking, services: Service[] = []): Service {
  // 1. Match by serviceId
  if (booking.serviceId) {
    const matchById = services.find((s) => s.id === booking.serviceId);
    if (matchById) return matchById;
  }

  // 2. Match by serviceName
  if (booking.serviceName) {
    const matchByName = services.find(
      (s) => s.name.toLowerCase().trim() === booking.serviceName.toLowerCase().trim()
    );
    if (matchByName) return matchByName;
  }

  // 3. Fallback construct full Service object
  const price = booking.amount || 349;
  const basePrice = Math.round(price / 1.18);
  return {
    id: booking.serviceId || 'service_' + Math.random().toString(36).substring(2, 7),
    name: booking.serviceName || 'Home Maintenance Service',
    description: `Professional ${booking.serviceName || 'service'} in Bhopal with verified technician.`,
    categoryId: booking.categoryId || 'cat_repair',
    categoryName: booking.categoryName || 'Home Services',
    basePrice,
    priceUnit: 'job',
    durationMinutes: getStandardDurationMinutes(booking),
    rating: 4.9,
    ratingCount: 28,
    imageUrl:
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
    isActive: true,
  };
}

export function getPreviousProForBooking(
  booking: Booking,
  serviceMen: ServiceMan[] = []
): {
  pro: ServiceMan | null;
  isAvailable: boolean;
  statusMessage: string;
} {
  if (!booking.serviceManId && !booking.serviceManName) {
    return {
      pro: null,
      isAvailable: false,
      statusMessage: 'No specific previous professional found',
    };
  }

  // Find by ID first
  let pro = booking.serviceManId
    ? serviceMen.find((p) => p.id === booking.serviceManId)
    : undefined;

  // Find by Name if not found
  if (!pro && booking.serviceManName) {
    pro = serviceMen.find(
      (p) => p.name.toLowerCase().trim() === booking.serviceManName?.toLowerCase().trim()
    );
  }

  if (pro) {
    const isAvailable = pro.isAvailable !== false;
    return {
      pro,
      isAvailable,
      statusMessage: isAvailable
        ? `Available online (★ ${pro.rating || 4.8})`
        : 'Currently on job / off-duty',
    };
  }

  // If pro details exist on booking but not in serviceMen array, return virtual reference
  if (booking.serviceManName) {
    return {
      pro: {
        id: booking.serviceManId || 'pro_virtual',
        userId: 'user_' + (booking.serviceManId || 'virtual'),
        name: booking.serviceManName,
        phone: booking.serviceManPhone || '+91 98260 12345',
        email: 'pro@deepakbuildcon.com',
        categoryIds: [booking.categoryId || 'cat_repair'],
        categoryNames: [booking.categoryName || 'Service'],
        serviceArea: 'Bhopal City',
        experienceYears: 4,
        hourlyRate: 350,
        isAvailable: true,
        isVerified: true,
        kycStatus: 'verified',
        rating: 4.9,
        totalJobs: 42,
      },
      isAvailable: true,
      statusMessage: 'Available online (★ 4.9)',
    };
  }

  return {
    pro: null,
    isAvailable: false,
    statusMessage: 'Will auto-assign top rated technician',
  };
}

export const QuickRebookModal: React.FC<QuickRebookModalProps> = ({
  isOpen,
  onClose,
  booking,
  services = [],
  serviceMen = [],
  onConfirmRebook,
}) => {
  if (!isOpen || !booking) return null;

  const targetService = useMemo(
    () => getServiceForBooking(booking, services),
    [booking, services]
  );
  const { pro: previousPro, isAvailable: isProAvailable } = useMemo(
    () => getPreviousProForBooking(booking, serviceMen),
    [booking, serviceMen]
  );

  const [requestSamePro, setRequestSamePro] = useState<boolean>(isProAvailable);

  const handleProceed = () => {
    const preferred = requestSamePro && isProAvailable && previousPro ? previousPro : undefined;
    onConfirmRebook(targetService, preferred);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        id={`quick-rebook-modal-${booking.id}`}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-stone-200"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-stone-900 via-orange-950 to-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <RotateCcw className="w-5 h-5 animate-spin-reverse duration-1000" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-orange-400 block">
                Instant Rebook
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Quick Rebook Service
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Target Service Overview Card */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-full">
                  {booking.categoryName || 'Home Service'}
                </span>
                <h4 className="text-base font-black text-stone-900 mt-1">
                  {targetService.name}
                </h4>
                <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">
                  {targetService.description}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-stone-400 block">Starting from</span>
                <span className="text-lg font-black text-orange-600">
                  ₹{targetService.basePrice || booking.amount}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Est. Duration: ~{targetService.durationMinutes || 60} mins</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>30-Day Guarantee</span>
              </div>
            </div>
          </div>

          {/* Previous Assigned Professional Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-600" />
                Previously Assigned Professional
              </span>
              {previousPro && (
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isProAvailable
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isProAvailable ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  {isProAvailable ? 'Online & Available' : 'Currently Busy / Off-duty'}
                </span>
              )}
            </div>

            {previousPro ? (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  requestSamePro && isProAvailable
                    ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500/20'
                    : 'border-stone-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {previousPro.photoUrl ? (
                        <LazyImage
                          src={previousPro.photoUrl}
                          alt={previousPro.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-stone-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 font-black flex items-center justify-center text-base border border-orange-200">
                          {previousPro.name?.charAt(0) || 'P'}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isProAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-stone-900">
                          {previousPro.name}
                        </h4>
                        <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {previousPro.rating || 4.9}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {previousPro.skills?.join(', ') || previousPro.trade || 'Verified Technician'} •{' '}
                        {previousPro.totalJobs || 25}+ jobs in Bhopal
                      </p>
                    </div>
                  </div>

                  {/* Toggle choice if available */}
                  {isProAvailable ? (
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={requestSamePro}
                        onChange={(e) => setRequestSamePro(e.target.checked)}
                        className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300"
                      />
                      <span className="text-xs font-bold text-stone-700 hidden sm:inline">
                        Request
                      </span>
                    </label>
                  ) : null}
                </div>

                {/* Status Notice Callout */}
                <div className="mt-3 pt-2.5 border-t border-stone-200/60 text-xs">
                  {isProAvailable ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {requestSamePro
                          ? `${previousPro.name} is selected for this rebook. Service will be routed directly.`
                          : 'You can opt to auto-assign another technician if preferred.'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        {previousPro.name} is currently engaged on another Bhopal job. We will automatically route your rebook to the highest-rated active technician without any delay.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-orange-600 shrink-0" />
                <p className="text-xs text-stone-600">
                  We'll automatically match you with the best available verified technician in your Bhopal locality.
                </p>
              </div>
            )}
          </div>

          {/* Previous Service Address Reference */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
              Previous Service Address
            </span>
            <p className="text-xs font-semibold text-stone-800 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
              <span>
                {booking.address}, {booking.city} {booking.pincode}
              </span>
            </p>
            <p className="text-[11px] text-stone-500 pl-5">
              You will be able to customize the date, time slot, and address in the next step.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-200/60 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            id={`btn-confirm-quick-rebook-${booking.id}`}
            type="button"
            onClick={handleProceed}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {requestSamePro && isProAvailable && previousPro
                ? `Rebook with ${previousPro.name}`
                : 'Proceed to Schedule'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

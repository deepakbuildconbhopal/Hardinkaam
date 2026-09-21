import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Zap, CheckCircle, AlertTriangle, Activity, ShieldCheck, Sparkles, Timer } from 'lucide-react';
import { Booking } from '../../types';

/**
 * Returns standard estimated duration in minutes for a given service / category
 */
export function getStandardDurationMinutes(booking: Partial<Booking>): number {
  const serviceName = (booking.serviceName || '').toLowerCase();
  const categoryName = (booking.categoryName || '').toLowerCase();
  const serviceId = (booking.serviceId || '').toLowerCase();

  // 1. Check specific service name keywords
  if (serviceName.includes('deep clean') || serviceName.includes('full home') || serviceName.includes('house clean')) {
    return 180;
  }
  if (serviceName.includes('waterproofing') || serviceName.includes('full painting')) {
    return 240;
  }
  if (serviceName.includes('construction labour') || serviceName.includes('daily wage')) {
    return 240;
  }
  if (serviceName.includes('mason') || serviceName.includes('mistri') || serviceName.includes('brickwork') || serviceName.includes('plaster')) {
    return 180;
  }
  if (serviceName.includes('gas refill') || serviceName.includes('ac gas') || serviceName.includes('tank clean')) {
    return 90;
  }
  if (serviceName.includes('split ac') || serviceName.includes('ac service') || serviceName.includes('power jet')) {
    return 60;
  }
  if (serviceName.includes('washing machine') || serviceName.includes('fridge') || serviceName.includes('refrigerator') || serviceName.includes('motor')) {
    return 60;
  }
  if (serviceName.includes('inverter') || serviceName.includes('battery')) {
    return 60;
  }
  if (serviceName.includes('sofa') || serviceName.includes('carpet') || serviceName.includes('kitchen deep')) {
    return 75;
  }
  if (serviceName.includes('fan') || serviceName.includes('ceiling fan') || serviceName.includes('blockage') || serviceName.includes('drain')) {
    return 45;
  }
  if (serviceName.includes('switchboard') || serviceName.includes('socket') || serviceName.includes('tap') || serviceName.includes('faucet') || serviceName.includes('lock')) {
    return 30;
  }
  if (serviceName.includes('termite') || serviceName.includes('pest')) {
    return 60;
  }
  if (serviceName.includes('haircut') || serviceName.includes('beard') || serviceName.includes('grooming')) {
    return 35;
  }
  if (serviceName.includes('facial') || serviceName.includes('hair spa') || serviceName.includes('cleanup')) {
    return 60;
  }
  if (serviceName.includes('welding') || serviceName.includes('fabrication') || serviceName.includes('grill') || serviceName.includes('shed')) {
    return 120;
  }

  // 2. Fallbacks based on category
  if (categoryName.includes('cleaning')) return 90;
  if (categoryName.includes('ac') || categoryName.includes('appliance')) return 60;
  if (categoryName.includes('painting')) return 180;
  if (categoryName.includes('mason') || categoryName.includes('construction')) return 180;
  if (categoryName.includes('fabrication')) return 120;
  if (categoryName.includes('pest')) return 60;
  if (categoryName.includes('carpenter') || categoryName.includes('carpentry')) return 60;
  if (categoryName.includes('electrician') || categoryName.includes('plumber')) return 45;
  if (categoryName.includes('salon')) return 45;

  return 50; // Default standard baseline
}

/**
 * Derives the start time Date object for a booking
 */
export function getServiceStartTime(booking: Booking): Date {
  if (booking.startedAt) {
    const parsed = new Date(booking.startedAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (booking.updatedAt && booking.status === 'in_progress') {
    const parsed = new Date(booking.updatedAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (booking.createdAt) {
    const parsed = new Date(booking.createdAt);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  // Fallback to 15 minutes ago
  return new Date(Date.now() - 15 * 60 * 1000);
}

/**
 * Format helper for AM/PM time
 */
export function formatTimeAmPm(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface ServiceEtaWidgetProps {
  booking: Booking;
  compact?: boolean;
}

export const ServiceEtaWidget: React.FC<ServiceEtaWidgetProps> = ({ booking, compact = false }) => {
  // Only show for in_progress status (or on_the_way with arrival context)
  if (booking.status !== 'in_progress' && booking.status !== 'on_the_way') {
    return null;
  }

  const durationMinutes = useMemo(() => getStandardDurationMinutes(booking), [booking]);
  const startTime = useMemo(() => getServiceStartTime(booking), [booking]);
  const expectedEndTime = useMemo(
    () => new Date(startTime.getTime() + durationMinutes * 60 * 1000),
    [startTime, durationMinutes]
  );

  // Live timer tick every second
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsedMs = Math.max(0, now.getTime() - startTime.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsedSeconds = Math.floor((elapsedMs % (1000 * 60)) / 1000);

  const totalDurationMs = durationMinutes * 60 * 1000;
  const remainingMs = Math.max(0, totalDurationMs - elapsedMs);
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const isOvertime = elapsedMs > totalDurationMs;
  const overtimeMinutes = isOvertime ? Math.floor((elapsedMs - totalDurationMs) / (1000 * 60)) : 0;

  const progressPercent = Math.min(
    100,
    Math.max(5, Math.round((elapsedMs / totalDurationMs) * 100))
  );

  // Active Phase calculation
  const getActivePhase = () => {
    if (booking.status === 'on_the_way') {
      return {
        phase: 1,
        title: 'Technician In Transit (रास्ते में)',
        desc: 'Navigating to your registered Bhopal location',
      };
    }
    if (progressPercent < 30) {
      return {
        phase: 1,
        title: 'Initial Diagnosis & Inspection',
        desc: 'Checking equipment and setting up tools safely',
      };
    } else if (progressPercent < 80) {
      return {
        phase: 2,
        title: 'Core Service & Repair Execution',
        desc: 'Active technical work in progress by verified technician',
      };
    } else if (!isOvertime) {
      return {
        phase: 3,
        title: 'Final Testing & Quality Inspection',
        desc: 'Operational run-through before OTP customer sign-off',
      };
    } else {
      return {
        phase: 3,
        title: 'Extended Quality Finishing',
        desc: 'Technician ensuring meticulous standard inspection',
      };
    }
  };

  const activePhase = getActivePhase();

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 text-xs">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-600"></span>
        </span>
        <span className="font-extrabold text-orange-900">
          {isOvertime ? 'Finalizing checks' : `ETA: ~${remainingMinutes}m left`}
        </span>
        <span className="text-[11px] text-orange-700">
          (Est. Finish: {formatTimeAmPm(expectedEndTime)})
        </span>
      </div>
    );
  }

  return (
    <div
      id={`service-eta-widget-${booking.id}`}
      className="rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50/90 via-amber-50/50 to-stone-50 p-4 sm:p-5 shadow-xs relative overflow-hidden transition-all"
    >
      {/* Background ambient pulse */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-orange-200/30 blur-2xl pointer-events-none" />

      {/* Header with Live Pulse and Title */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-orange-200/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
          </span>
          <div className="flex items-center gap-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-orange-600 fill-orange-500" />
              Live Service Tracking & ETA
            </h4>
            <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Bhopal On-Site
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
          <Clock className="w-3.5 h-3.5 text-orange-600" />
          <span>Started: {formatTimeAmPm(startTime)}</span>
        </div>
      </div>

      {/* Main Countdown & ETA Highlight Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3.5">
        {/* Box 1: Time Remaining (ETA) */}
        <div className="bg-white rounded-xl p-3 border border-orange-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 flex items-center justify-between">
            <span>Estimated Time Remaining</span>
            <Timer className="w-3.5 h-3.5 text-orange-600" />
          </span>
          <div className="mt-1">
            {isOvertime ? (
              <div>
                <p className="text-xl font-black text-amber-700 flex items-center gap-1">
                  Wrapping Up
                </p>
                <p className="text-[11px] font-semibold text-amber-600">
                  +{overtimeMinutes}m over standard estimate
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 font-mono tracking-tight">
                    {remainingMinutes}
                  </span>
                  <span className="text-xs font-bold text-stone-600">mins</span>
                  <span className="text-xs font-mono font-bold text-orange-600">
                    {remainingSeconds < 10 ? `0${remainingSeconds}` : remainingSeconds}s
                  </span>
                </div>
                <p className="text-[11px] font-medium text-stone-500">
                  Approx. time to service completion
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Box 2: Estimated Finish Clock */}
        <div className="bg-white rounded-xl p-3 border border-orange-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Expected Completion
          </span>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-stone-900">
              {formatTimeAmPm(expectedEndTime)}
            </p>
            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Standard Slot: {durationMinutes} Mins
            </p>
          </div>
        </div>

        {/* Box 3: Live Phase Status */}
        <div className="bg-white rounded-xl p-3 border border-orange-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
            Active Phase ({activePhase.phase}/3)
          </span>
          <div className="mt-1">
            <p className="text-xs sm:text-sm font-bold text-stone-900 line-clamp-1">
              {activePhase.title}
            </p>
            <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
              {activePhase.desc}
            </p>
          </div>
        </div>
      </div>

      {/* Dynamic Animated Progress Bar */}
      <div className="space-y-1.5 mt-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-stone-700 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-orange-600" />
            Service Progress: <span className="text-orange-950 font-black">{progressPercent}%</span>
          </span>
          <span className="text-[11px] text-stone-500">
            Elapsed: {elapsedMinutes}m {elapsedSeconds}s of ~{durationMinutes}m
          </span>
        </div>

        <div className="w-full h-3 bg-stone-200/80 rounded-full overflow-hidden p-0.5 border border-stone-200/60 relative">
          <div
            className={`h-full rounded-full transition-all duration-1000 relative ${
              isOvertime
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500'
                : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer animation */}
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Multi-stage Milestones Marker */}
        <div className="grid grid-cols-3 text-[10px] text-stone-500 pt-1 text-center font-medium">
          <div className={`text-left ${progressPercent >= 10 ? 'text-orange-800 font-bold' : ''}`}>
            1. Inspection & Setup
          </div>
          <div className={`text-center ${progressPercent >= 50 ? 'text-orange-800 font-bold' : ''}`}>
            2. Main Repair Work
          </div>
          <div className={`text-right ${progressPercent >= 85 ? 'text-emerald-700 font-bold' : ''}`}>
            3. Testing & Sign-off
          </div>
        </div>
      </div>

      {/* Helpful Guarantee Note */}
      <div className="mt-3.5 pt-2.5 border-t border-orange-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-600">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-orange-600 flex-shrink-0" />
          <span>
            Calculated using Deepak Buildcon standard duration. Need to verify completion with OTP once done.
          </span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-orange-800">
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>100% Quality Guaranteed</span>
        </div>
      </div>
    </div>
  );
};

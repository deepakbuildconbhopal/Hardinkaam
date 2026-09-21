import { Booking } from '../types';

export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'this_year'
  | 'custom';

export type DateFieldOption = 'scheduled' | 'created' | 'both';

export interface DateRangeFilterState {
  preset: DateRangePreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  dateField: DateFieldOption;
}

export const DEFAULT_DATE_RANGE: DateRangeFilterState = {
  preset: 'all',
  startDate: '',
  endDate: '',
  dateField: 'both',
};

/**
 * Format a Date or date string to YYYY-MM-DD
 */
export const formatToYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Format YYYY-MM-DD to human friendly string, e.g. "16 Sep 2026"
 */
export const formatHumanDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return dateStr;
};

/**
 * Get date range start and end YYYY-MM-DD given a preset
 */
export const resolvePresetDates = (
  preset: DateRangePreset,
  customStart: string = '',
  customEnd: string = ''
): { startDate: string; endDate: string; label: string; shortLabel: string } => {
  const now = new Date();
  const todayStr = formatToYMD(now);

  switch (preset) {
    case 'today':
      return {
        startDate: todayStr,
        endDate: todayStr,
        label: `Today (${formatHumanDate(todayStr)})`,
        shortLabel: 'Today',
      };

    case 'yesterday': {
      const yest = new Date(now);
      yest.setDate(now.getDate() - 1);
      const yestStr = formatToYMD(yest);
      return {
        startDate: yestStr,
        endDate: yestStr,
        label: `Yesterday (${formatHumanDate(yestStr)})`,
        shortLabel: 'Yesterday',
      };
    }

    case 'this_week': {
      const past7 = new Date(now);
      past7.setDate(now.getDate() - 6);
      const startStr = formatToYMD(past7);
      return {
        startDate: startStr,
        endDate: todayStr,
        label: `Last 7 Days (${formatHumanDate(startStr)} – ${formatHumanDate(todayStr)})`,
        shortLabel: 'Last 7 Days',
      };
    }

    case 'last_30_days': {
      const past30 = new Date(now);
      past30.setDate(now.getDate() - 29);
      const startStr = formatToYMD(past30);
      return {
        startDate: startStr,
        endDate: todayStr,
        label: `Last 30 Days (${formatHumanDate(startStr)} – ${formatHumanDate(todayStr)})`,
        shortLabel: 'Last 30 Days',
      };
    }

    case 'this_month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = formatToYMD(firstDay);
      const monthName = now.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      return {
        startDate: startStr,
        endDate: todayStr,
        label: `This Month (${monthName})`,
        shortLabel: 'This Month',
      };
    }

    case 'last_month': {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = formatToYMD(firstDayLastMonth);
      const endStr = formatToYMD(lastDayLastMonth);
      const monthName = firstDayLastMonth.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      return {
        startDate: startStr,
        endDate: endStr,
        label: `Last Month (${monthName})`,
        shortLabel: 'Last Month',
      };
    }

    case 'last_3_months': {
      const past90 = new Date(now);
      past90.setDate(now.getDate() - 90);
      const startStr = formatToYMD(past90);
      return {
        startDate: startStr,
        endDate: todayStr,
        label: `Last 3 Months (${formatHumanDate(startStr)} – ${formatHumanDate(todayStr)})`,
        shortLabel: 'Last 3 Months',
      };
    }

    case 'this_year': {
      const firstDayYear = new Date(now.getFullYear(), 0, 1);
      const startStr = formatToYMD(firstDayYear);
      return {
        startDate: startStr,
        endDate: todayStr,
        label: `This Year (${now.getFullYear()})`,
        shortLabel: `Year ${now.getFullYear()}`,
      };
    }

    case 'custom': {
      if (customStart && customEnd) {
        return {
          startDate: customStart,
          endDate: customEnd,
          label: `${formatHumanDate(customStart)} – ${formatHumanDate(customEnd)}`,
          shortLabel: `${formatHumanDate(customStart)} – ${formatHumanDate(customEnd)}`,
        };
      }
      if (customStart) {
        return {
          startDate: customStart,
          endDate: '',
          label: `From ${formatHumanDate(customStart)}`,
          shortLabel: `From ${formatHumanDate(customStart)}`,
        };
      }
      if (customEnd) {
        return {
          startDate: '',
          endDate: customEnd,
          label: `Up to ${formatHumanDate(customEnd)}`,
          shortLabel: `Up to ${formatHumanDate(customEnd)}`,
        };
      }
      return {
        startDate: '',
        endDate: '',
        label: 'Custom Date Range',
        shortLabel: 'Custom Range',
      };
    }

    case 'all':
    default:
      return {
        startDate: '',
        endDate: '',
        label: 'All Time History',
        shortLabel: 'All Dates',
      };
  }
};

/**
 * Filter a booking based on DateRangeFilterState
 */
export const isBookingInDateRange = (
  booking: Booking,
  filter: DateRangeFilterState
): boolean => {
  if (filter.preset === 'all' && !filter.startDate && !filter.endDate) {
    return true;
  }

  const { startDate, endDate } = resolvePresetDates(
    filter.preset,
    filter.startDate,
    filter.endDate
  );

  if (!startDate && !endDate) {
    return true;
  }

  // Parse start and end timestamps
  let startMs = -Infinity;
  if (startDate) {
    const s = new Date(startDate + 'T00:00:00');
    if (!isNaN(s.getTime())) {
      startMs = s.getTime();
    }
  }

  let endMs = Infinity;
  if (endDate) {
    const e = new Date(endDate + 'T23:59:59.999');
    if (!isNaN(e.getTime())) {
      endMs = e.getTime();
    }
  }

  // Check scheduled date or created date depending on filter.dateField
  const candidateDates: number[] = [];

  const addDate = (val?: string) => {
    if (!val) return;
    // val might be YYYY-MM-DD or ISO string
    let d: Date;
    if (val.length === 10 && val.includes('-')) {
      // e.g. "2026-09-16"
      d = new Date(val + 'T12:00:00');
    } else {
      d = new Date(val);
    }
    if (!isNaN(d.getTime())) {
      candidateDates.push(d.getTime());
    }
  };

  if (filter.dateField === 'scheduled' || filter.dateField === 'both') {
    addDate(booking.scheduledDate);
  }

  if (filter.dateField === 'created' || filter.dateField === 'both') {
    addDate(booking.createdAt);
  }

  if (candidateDates.length === 0) {
    // Fallback: check either
    addDate(booking.scheduledDate || booking.createdAt);
  }

  if (candidateDates.length === 0) {
    return true; // Don't discard if no date is recorded
  }

  return candidateDates.some((ts) => ts >= startMs && ts <= endMs);
};

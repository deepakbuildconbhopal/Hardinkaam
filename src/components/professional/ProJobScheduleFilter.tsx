import React, { useMemo } from 'react';
import {
  Calendar,
  Filter,
  Clock,
  ArrowUpDown,
  Search,
  X,
  Layers,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import { Booking } from '../../types';

export type DatePreset = 'all' | 'today' | 'tomorrow' | 'upcoming' | 'custom';
export type SortOption = 'time_asc' | 'time_desc' | 'urgency' | 'earnings_desc' | 'date_asc';

export interface ProJobFilterState {
  category: string; // 'all' or category identifier
  datePreset: DatePreset;
  customDate: string; // 'YYYY-MM-DD'
  searchQuery: string;
  sortBy: SortOption;
}

interface CategoryOption {
  id: string;
  name: string;
  count: number;
}

interface Props {
  allJobs: Booking[];
  filteredCount: number;
  filterState: ProJobFilterState;
  onFilterChange: (newState: ProJobFilterState) => void;
  onResetFilters: () => void;
}

// Helper to convert time strings like "10:00 AM" or "02:30 PM" to minutes from midnight
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 9999;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3]?.toUpperCase();

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

// Helper to normalize and evaluate dates for a booking
export function getBookingDateInfo(b: Booking) {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const rawDate = (b.scheduledDate || (b as any).date || '').trim();
  const rawLower = rawDate.toLowerCase();

  let isoDate = '';
  let isToday = false;
  let isTomorrow = false;
  let isUpcoming = false;
  let isPast = false;

  if (
    rawLower === 'today' ||
    rawLower.includes('आज') ||
    rawLower === 'today (live)' ||
    rawLower.includes('live')
  ) {
    isoDate = todayIso;
    isToday = true;
    isUpcoming = true;
  } else if (rawLower === 'tomorrow' || rawLower.includes('कल')) {
    isoDate = tomorrowIso;
    isTomorrow = true;
    isUpcoming = true;
  } else {
    const isoMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) {
      isoDate = isoMatch[0];
      isToday = isoDate === todayIso;
      isTomorrow = isoDate === tomorrowIso;
      isUpcoming = isoDate >= todayIso;
      isPast = isoDate < todayIso;
    } else if (
      !rawDate &&
      ['accepted', 'on_the_way', 'in_progress', 'arrived', 'otp_pending'].includes(b.status)
    ) {
      // Active in-flight booking defaults to today
      isoDate = todayIso;
      isToday = true;
      isUpcoming = true;
    }
  }

  return { isoDate, isToday, isTomorrow, isUpcoming, isPast, rawDate };
}

export const ProJobScheduleFilter: React.FC<Props> = ({
  allJobs,
  filteredCount,
  filterState,
  onFilterChange,
  onResetFilters,
}) => {
  // Extract dynamic categories with job counts
  const categories = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, CategoryOption>();

    allJobs.forEach((b) => {
      const name =
        b.categoryName ||
        (b.categoryId ? b.categoryId.replace(/^cat_/, '').replace(/_/g, ' ') : '') ||
        b.serviceName ||
        'General';
      const cleanId = b.categoryId || name.toLowerCase().replace(/\s+/g, '_');

      const existing = map.get(cleanId);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(cleanId, {
          id: cleanId,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count: 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allJobs]);

  // Date counts for quick presets
  const dateCounts = useMemo(() => {
    let today = 0;
    let tomorrow = 0;
    let upcoming = 0;

    allJobs.forEach((b) => {
      const info = getBookingDateInfo(b);
      if (info.isToday) today += 1;
      if (info.isTomorrow) tomorrow += 1;
      if (info.isUpcoming) upcoming += 1;
    });

    return { today, tomorrow, upcoming };
  }, [allJobs]);

  // Next upcoming job for today
  const todayNextJob = useMemo(() => {
    const todayActive = allJobs.filter((b) => {
      const info = getBookingDateInfo(b);
      return info.isToday && ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status);
    });

    if (todayActive.length === 0) return null;
    return todayActive.sort(
      (a, b) => parseTimeToMinutes(a.scheduledTime) - parseTimeToMinutes(b.scheduledTime)
    )[0];
  }, [allJobs]);

  const isFiltered =
    filterState.category !== 'all' ||
    filterState.datePreset !== 'all' ||
    Boolean(filterState.customDate) ||
    filterState.searchQuery.trim() !== '' ||
    filterState.sortBy !== 'time_asc';

  const selectedCategoryName =
    filterState.category === 'all'
      ? 'All Categories'
      : categories.find((c) => c.id === filterState.category)?.name || filterState.category;

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Schedule Priority Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center gap-2">
              <span>Schedule Prioritization & Filters</span>
              {dateCounts.today > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {dateCounts.today} Today
                </span>
              )}
            </h3>
            <p className="text-[11px] text-stone-500">
              Filter by service trade or target date to plan efficient route trips and appointments.
            </p>
          </div>
        </div>

        {todayNextJob && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start md:self-auto">
            <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[240px]">
              Next up:{' '}
              <strong className="font-extrabold text-emerald-950">
                {todayNextJob.serviceName}
              </strong>{' '}
              ({todayNextJob.scheduledTime || 'Scheduled'})
            </span>
          </div>
        )}
      </div>

      {/* Filter Control Row 1: Category & Date Presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Category Dropdown */}
        <div className="md:col-span-4">
          <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>Filter by Category ({categories.length})</span>
          </label>
          <div className="relative">
            <select
              id="pro-category-filter-select"
              value={filterState.category}
              onChange={(e) =>
                onFilterChange({
                  ...filterState,
                  category: e.target.value,
                })
              }
              className="w-full px-3.5 py-2 pr-9 bg-stone-50 hover:bg-stone-100/70 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white appearance-none transition-all cursor-pointer"
            >
              <option value="all">All Categories ({allJobs.length} jobs)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.count})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Date Filter Presets */}
        <div className="md:col-span-8">
          <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-600" />
            <span>Filter by Scheduled Date</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Dates', count: allJobs.length },
              { id: 'today', label: 'Today (आज)', count: dateCounts.today },
              { id: 'tomorrow', label: 'Tomorrow (कल)', count: dateCounts.tomorrow },
              { id: 'upcoming', label: 'Upcoming (7 Days)', count: dateCounts.upcoming },
              { id: 'custom', label: 'Custom Date 🗓️', count: null },
            ].map((preset) => {
              const isSelected = filterState.datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onFilterChange({
                      ...filterState,
                      datePreset: preset.id as DatePreset,
                      customDate: preset.id === 'custom' ? (filterState.customDate || todayIso) : '',
                    })
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200/80 text-stone-700 border border-stone-200/60'
                  }`}
                >
                  <span>{preset.label}</span>
                  {preset.count !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {preset.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Custom Date Picker (when active) + Search + Sort Options */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-1">
        {/* Custom Date Input (if Custom selected) */}
        {filterState.datePreset === 'custom' ? (
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold text-stone-500 mb-1">
              Select Calendar Date:
            </label>
            <div className="relative">
              <input
                type="date"
                value={filterState.customDate}
                onChange={(e) =>
                  onFilterChange({
                    ...filterState,
                    customDate: e.target.value,
                  })
                }
                className="w-full px-3 py-1.5 bg-amber-50/60 border border-amber-300 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              />
            </div>
          </div>
        ) : null}

        {/* Search Input */}
        <div className={filterState.datePreset === 'custom' ? 'sm:col-span-4' : 'sm:col-span-7'}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, address, phone, or service..."
              value={filterState.searchQuery}
              onChange={(e) =>
                onFilterChange({
                  ...filterState,
                  searchQuery: e.target.value,
                })
              }
              className="w-full pl-8 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />
            {filterState.searchQuery && (
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filterState,
                    searchQuery: '',
                  })
                }
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Schedule Sorting / Prioritization */}
        <div className={filterState.datePreset === 'custom' ? 'sm:col-span-4' : 'sm:col-span-5'}>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <select
              id="pro-sort-by-select"
              value={filterState.sortBy}
              onChange={(e) =>
                onFilterChange({
                  ...filterState,
                  sortBy: e.target.value as SortOption,
                })
              }
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white cursor-pointer"
            >
              <option value="time_asc">⏰ Schedule Time (Earliest First)</option>
              <option value="time_desc">⏰ Schedule Time (Latest First)</option>
              <option value="urgency">⚡ Urgency (In-Progress & Accepted First)</option>
              <option value="earnings_desc">💰 Earnings (Highest Payout First)</option>
              <option value="date_asc">📅 Scheduled Date (Ascending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Category Chips for One-Tap Filtering */}
      {categories.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold text-stone-400 whitespace-nowrap mr-1">
            Categories:
          </span>
          <button
            type="button"
            onClick={() => onFilterChange({ ...filterState, category: 'all' })}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer ${
              filterState.category === 'all'
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
            }`}
          >
            All
          </button>
          {categories.map((c) => {
            const active = filterState.category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  onFilterChange({
                    ...filterState,
                    category: active ? 'all' : c.id,
                  })
                }
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  active
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{c.name}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded-full ${
                    active ? 'bg-white/25 text-white' : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Filter Summary Bar */}
      {isFiltered && (
        <div className="p-2.5 rounded-2xl bg-orange-50/70 border border-orange-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5 text-stone-700">
            <span className="font-extrabold text-stone-900">
              Showing {filteredCount} of {allJobs.length} jobs
            </span>
            <span className="text-stone-300">•</span>
            {filterState.category !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-orange-200 font-bold text-orange-900 text-[11px]">
                <Layers className="w-3 h-3 text-orange-600" />
                {selectedCategoryName}
              </span>
            )}
            {filterState.datePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-orange-200 font-bold text-orange-900 text-[11px]">
                <Calendar className="w-3 h-3 text-orange-600" />
                {filterState.datePreset === 'today'
                  ? 'Today'
                  : filterState.datePreset === 'tomorrow'
                  ? 'Tomorrow'
                  : filterState.datePreset === 'upcoming'
                  ? 'Upcoming (7 Days)'
                  : `Date: ${filterState.customDate}`}
              </span>
            )}
            {filterState.searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-orange-200 font-bold text-orange-900 text-[11px]">
                <Search className="w-3 h-3 text-orange-600" />
                "{filterState.searchQuery}"
              </span>
            )}
            {filterState.sortBy !== 'time_asc' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-orange-200 font-bold text-orange-900 text-[11px]">
                Sorted: {filterState.sortBy}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            className="px-2.5 py-1 rounded-xl bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};

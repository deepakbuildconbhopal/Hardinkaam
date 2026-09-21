import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  ChevronDown,
  X,
  RotateCcw,
  Check,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  DateRangeFilterState,
  DateRangePreset,
  DateFieldOption,
  resolvePresetDates,
  formatHumanDate,
  formatToYMD,
} from '../../utils/bookingDateUtils';

export interface BookingDateRangeFilterProps {
  value: DateRangeFilterState;
  onChange: (nextState: DateRangeFilterState) => void;
  onReset?: () => void;
  matchingCount?: number;
  totalCount?: number;
  onDownloadPDF?: () => void;
  onDownloadCSV?: () => void;
  compact?: boolean;
  className?: string;
  idPrefix?: string;
}

const PRESETS: Array<{ id: DateRangePreset; label: string; desc?: string }> = [
  { id: 'all', label: 'All Time', desc: 'Entire account history' },
  { id: 'today', label: 'Today', desc: 'Bookings for today' },
  { id: 'yesterday', label: 'Yesterday', desc: 'Previous day' },
  { id: 'this_week', label: 'Last 7 Days', desc: 'Recent week' },
  { id: 'last_30_days', label: 'Last 30 Days', desc: 'Past month' },
  { id: 'this_month', label: 'This Month', desc: '1st of current month' },
  { id: 'last_month', label: 'Last Month', desc: 'Previous full month' },
  { id: 'last_3_months', label: 'Last 3 Months', desc: 'Past 90 days' },
  { id: 'this_year', label: 'This Year', desc: 'Current calendar year' },
  { id: 'custom', label: 'Custom Range', desc: 'Pick exact start & end' },
];

export const BookingDateRangeFilter: React.FC<BookingDateRangeFilterProps> = ({
  value,
  onChange,
  onReset,
  matchingCount,
  totalCount,
  onDownloadPDF,
  onDownloadCSV,
  compact = false,
  className = '',
  idPrefix = 'booking-date-range',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Local draft state for custom dates inside the popover
  const [draftPreset, setDraftPreset] = useState<DateRangePreset>(value.preset);
  const [draftStart, setDraftStart] = useState<string>(value.startDate || '');
  const [draftEnd, setDraftEnd] = useState<string>(value.endDate || '');
  const [draftDateField, setDraftDateField] = useState<DateFieldOption>(value.dateField || 'both');

  // Sync draft when value prop changes or popover opens
  useEffect(() => {
    setDraftPreset(value.preset);
    setDraftStart(value.startDate || '');
    setDraftEnd(value.endDate || '');
    setDraftDateField(value.dateField || 'both');
  }, [value, isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Current active details
  const activeResolved = resolvePresetDates(value.preset, value.startDate, value.endDate);
  const isFiltered = value.preset !== 'all' || Boolean(value.startDate || value.endDate);

  const handleSelectPreset = (preset: DateRangePreset) => {
    setDraftPreset(preset);
    if (preset !== 'custom') {
      const { startDate, endDate } = resolvePresetDates(preset);
      setDraftStart(startDate);
      setDraftEnd(endDate);
      onChange({
        preset,
        startDate,
        endDate,
        dateField: draftDateField,
      });
      if (preset === 'all') {
        setIsOpen(false);
      }
    }
  };

  const handleApplyCustom = () => {
    onChange({
      preset: 'custom',
      startDate: draftStart,
      endDate: draftEnd,
      dateField: draftDateField,
    });
    setIsOpen(false);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange({
      preset: 'all',
      startDate: '',
      endDate: '',
      dateField: 'both',
    });
    setDraftPreset('all');
    setDraftStart('');
    setDraftEnd('');
    if (onReset) onReset();
    setIsOpen(false);
  };

  const handleDateFieldChange = (field: DateFieldOption) => {
    setDraftDateField(field);
    onChange({
      ...value,
      dateField: field,
    });
  };

  // Draft resolution for feedback inside popup
  const draftResolved = resolvePresetDates(draftPreset, draftStart, draftEnd);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id={`${idPrefix}-trigger-btn`}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Filter bookings by date range"
        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
          isFiltered
            ? 'bg-orange-50 text-orange-900 border-orange-300 ring-2 ring-orange-500/20 shadow-xs'
            : 'bg-white text-stone-700 hover:text-stone-900 border-stone-200 hover:border-stone-300 shadow-xs'
        }`}
      >
        <Calendar
          className={`w-3.5 h-3.5 shrink-0 ${
            isFiltered ? 'text-orange-600' : 'text-stone-400'
          }`}
        />

        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-bold">
            {isFiltered ? activeResolved.shortLabel : 'Date Range'}
          </span>
          {isFiltered && (
            <span className="hidden md:inline text-[10px] text-orange-700/80 font-normal">
              ({activeResolved.startDate === activeResolved.endDate
                ? formatHumanDate(activeResolved.startDate)
                : `${formatHumanDate(activeResolved.startDate)} – ${formatHumanDate(activeResolved.endDate)}`})
            </span>
          )}
        </div>

        {/* Clear icon badge when filter is active */}
        {isFiltered ? (
          <button
            type="button"
            onClick={handleClear}
            title="Clear date filter"
            className="p-0.5 rounded-md hover:bg-orange-200/70 text-orange-700 transition-colors ml-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown
            className={`w-3 h-3 text-stone-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div
          id={`${idPrefix}-popover`}
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-[340px] sm:w-[410px] bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  Filter by Time Period
                </h4>
                <p className="text-[10px] text-stone-500">
                  Select period to view or download history
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="py-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-stone-400 mb-2">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PRESETS.map((preset) => {
                const isSelected = draftPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`py-1.5 px-2.5 rounded-xl text-left text-[11px] font-semibold transition-all flex items-center justify-between cursor-pointer border ${
                      isSelected
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="truncate">{preset.label}</span>
                    {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Inputs (Visible when 'custom' is active or always available for manual tuning) */}
          <div className="pt-2 pb-3 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                Custom Range (From – To)
              </label>
              <button
                type="button"
                onClick={() => {
                  const today = formatToYMD(new Date());
                  setDraftPreset('custom');
                  setDraftStart(today);
                  setDraftEnd(today);
                }}
                className="text-[10px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                Set to Today
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                  Start Date
                </label>
                <input
                  id={`${idPrefix}-start-input`}
                  type="date"
                  value={draftStart}
                  onChange={(e) => {
                    setDraftPreset('custom');
                    setDraftStart(e.target.value);
                  }}
                  className="w-full text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-stone-500 mb-0.5">
                  End Date
                </label>
                <input
                  id={`${idPrefix}-end-input`}
                  type="date"
                  value={draftEnd}
                  onChange={(e) => {
                    setDraftPreset('custom');
                    setDraftEnd(e.target.value);
                  }}
                  className="w-full text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Date Match Field Selection (Scheduled vs Created) */}
            <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-stone-100 text-[10px]">
              <span className="font-semibold text-stone-500">Filter based on:</span>
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => handleDateFieldChange('both')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    draftDateField === 'both'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Both
                </button>
                <button
                  type="button"
                  onClick={() => handleDateFieldChange('scheduled')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    draftDateField === 'scheduled'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Service Date
                </button>
                <button
                  type="button"
                  onClick={() => handleDateFieldChange('created')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                    draftDateField === 'created'
                      ? 'bg-white text-stone-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Booked Date
                </button>
              </div>
            </div>
          </div>

          {/* Results Summary Info */}
          <div className="bg-stone-50 rounded-xl p-2.5 flex items-center justify-between text-xs text-stone-600 mb-3 border border-stone-200/60">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[11px] font-medium">
                {matchingCount !== undefined && totalCount !== undefined ? (
                  <>
                    Matching: <strong className="text-stone-900">{matchingCount}</strong> of{' '}
                    {totalCount} bookings
                  </>
                ) : (
                  <span>Period: {draftResolved.label}</span>
                )}
              </span>
            </div>
            {isFiltered && (
              <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                Active Filter
              </span>
            )}
          </div>

          {/* Download shortcuts inside popover */}
          {(onDownloadPDF || onDownloadCSV) && (
            <div className="mb-3 pt-2 border-t border-stone-100 space-y-1.5">
              <span className="block text-[10px] font-black uppercase tracking-wider text-stone-400">
                Download This Period Directly:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {onDownloadPDF && (
                  <button
                    id={`${idPrefix}-quick-pdf-btn`}
                    type="button"
                    onClick={() => {
                      if (draftPreset === 'custom') {
                        handleApplyCustom();
                      }
                      onDownloadPDF();
                    }}
                    className="py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Download PDF</span>
                  </button>
                )}
                {onDownloadCSV && (
                  <button
                    id={`${idPrefix}-quick-csv-btn`}
                    type="button"
                    onClick={() => {
                      if (draftPreset === 'custom') {
                        handleApplyCustom();
                      }
                      onDownloadCSV();
                    }}
                    className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>Download CSV</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
            <button
              id={`${idPrefix}-reset-btn`}
              type="button"
              onClick={handleClear}
              className="text-stone-500 hover:text-stone-800 font-bold text-[11px] px-3 py-1.5 rounded-xl hover:bg-stone-100 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-stone-600 hover:text-stone-900 font-bold text-[11px] px-3 py-1.5 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                Close
              </button>

              <button
                id={`${idPrefix}-apply-btn`}
                type="button"
                onClick={handleApplyCustom}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Apply Filter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Activity,
  Search,
  ArrowUpDown,
  RotateCcw,
  Layers,
  Sparkles,
  Receipt,
  X,
  Video,
  Download,
  FileSpreadsheet,
  ChevronDown,
  Check,
  Filter,
  Navigation,
  QrCode,
  Banknote,
  Database,
} from 'lucide-react';
import { CashPaymentModal } from '../common/CashPaymentModal';
import { useAuth } from '../../context/AuthContext';
import { useOfflineBookingSync } from '../../hooks/useOfflineBookingSync';
import { Booking, BookingStatus } from '../../types';
import { generateWhatsAppVideoCallUrl } from '../../utils/whatsappVideoCall';
import {
  LIFECYCLE_STEPS,
  getStepIndex,
  executeStatusTransition,
} from '../../utils/bookingStateMachine';
import {
  exportBookingsToCSV,
  exportBookingsToPDF,
  exportSingleInvoicePDF,
} from '../../utils/bookingExport';
import { BookingDateRangeFilter } from './BookingDateRangeFilter';
import {
  DateRangeFilterState,
  DEFAULT_DATE_RANGE,
  isBookingInDateRange,
  resolvePresetDates,
  formatHumanDate,
} from '../../utils/bookingDateUtils';
import { ChatModal } from './ChatModal';
import { ReviewSubmitForm } from './ReviewComponent';
import { PostServiceFeedbackModal } from './PostServiceFeedbackModal';
import { BookingModal } from './BookingModal';
import { DeliveryOtpPrompt } from './DeliveryOtpPrompt';
import { RescheduleModal } from './RescheduleModal';
import { ServiceGuaranteeModal } from './ServiceGuaranteeModal';
import { ServiceEtaWidget, getStandardDurationMinutes, getServiceStartTime, formatTimeAmPm } from './ServiceEtaWidget';
import { QuickRebookModal, getPreviousProForBooking, getServiceForBooking } from './QuickRebookModal';
import { LiveServiceTrackerModal } from './LiveServiceTrackerModal';
import { CustomerBookingQrModal } from './CustomerBookingQrModal';
import { CustomerBookingLiveMapCard } from './CustomerBookingLiveMapCard';
import { WorkServiceTimer } from '../common/WorkServiceTimer';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import { Service, ServiceMan } from '../../types';
import { FinancialDocumentModal } from '../common/FinancialDocumentModal';
import { createOrGetTaxInvoiceForBooking } from '../../services/documentAndRefundService';
import { FinancialDocument } from '../../types/documents';

interface Props {
  bookings: Booking[];
  services?: Service[];
  serviceMen?: ServiceMan[];
  onOpenBookService: () => void;
  onRebook?: (service: Service, preferredPro?: ServiceMan) => void;
  onRefresh?: () => void;
}

export type FilterTab = 'all' | 'in_progress' | 'pending' | 'completed' | 'cancelled';
export type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

export const MyBookings: React.FC<Props> = ({
  bookings,
  services = [],
  serviceMen = [],
  onOpenBookService,
  onRebook,
  onRefresh,
}) => {
  const { currentUser, userProfile } = useAuth();
  const { isOnline, pendingQueue, isSyncing, syncNow, deletePending } = useOfflineBookingSync();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Date Range Filter state
  const [dateFilter, setDateFilter] = useState<DateRangeFilterState>(DEFAULT_DATE_RANGE);

  // Modals state
  const [activeChatBooking, setActiveChatBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [lifecycleBooking, setLifecycleBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [activeFinancialDoc, setActiveFinancialDoc] = useState<FinancialDocument | null>(null);
  const [cancelBookingItem, setCancelBookingItem] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Plans changed');
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [quickRebookBooking, setQuickRebookBooking] = useState<Booking | null>(null);
  const [trackingBooking, setTrackingBooking] = useState<Booking | null>(null);
  const [qrModalBooking, setQrModalBooking] = useState<Booking | null>(null);
  const [cashPaymentBooking, setCashPaymentBooking] = useState<Booking | null>(null);
  const [guaranteeBooking, setGuaranteeBooking] = useState<Booking | null>(null);

  const handleInitiateQuickRebook = (booking: Booking) => {
    setQuickRebookBooking(booking);
  };

  const handleConfirmQuickRebook = (service: Service, preferredPro?: ServiceMan) => {
    if (onRebook) {
      onRebook(service, preferredPro);
    } else {
      onOpenBookService();
    }
  };

  // Export history states
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'custom_period'>('all');
  const [modalDateFilter, setModalDateFilter] = useState<DateRangeFilterState>(DEFAULT_DATE_RANGE);
  const [exportToast, setExportToast] = useState<{ message: string; type: 'pdf' | 'csv' } | null>(null);

  const customerInfo = useMemo(
    () => ({
      name:
        userProfile?.name ||
        currentUser?.displayName ||
        bookings[0]?.customerName ||
        'Customer',
      phone: userProfile?.phone || bookings[0]?.customerPhone || '',
      email: userProfile?.email || currentUser?.email || '',
    }),
    [userProfile, currentUser, bookings]
  );

  // Breakdown counts
  const allCount = bookings.length;
  const inProgressBookings = useMemo(
    () =>
      bookings.filter((b) =>
        b.status === 'in_progress' || b.status === 'on_the_way'
      ),
    [bookings]
  );
  const pendingBookings = useMemo(
    () =>
      bookings.filter((b) =>
        b.status === 'pending' || b.status === 'accepted'
      ),
    [bookings]
  );
  const activeBookings = useMemo(
    () =>
      bookings.filter((b) =>
        ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
      ),
    [bookings]
  );
  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === 'completed'),
    [bookings]
  );
  const cancelledBookings = useMemo(
    () => bookings.filter((b) => b.status === 'cancelled' || b.status === 'rejected'),
    [bookings]
  );

  const totalSpent = useMemo(
    () => completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0),
    [completedBookings]
  );

  const dateRangeResolved = useMemo(
    () => resolvePresetDates(dateFilter.preset, dateFilter.startDate, dateFilter.endDate),
    [dateFilter]
  );
  const isDateFiltered = dateFilter.preset !== 'all' || Boolean(dateFilter.startDate || dateFilter.endDate);

  const modalDateResolved = useMemo(
    () => resolvePresetDates(modalDateFilter.preset, modalDateFilter.startDate, modalDateFilter.endDate),
    [modalDateFilter]
  );

  const periodMatchingBookings = useMemo(() => {
    return bookings.filter((b) => isBookingInDateRange(b, modalDateFilter));
  }, [bookings, modalDateFilter]);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // 1. Status Filter (from specific status dropdown or tab selector)
    if (statusFilter !== 'all') {
      if (statusFilter === 'cancelled') {
        result = result.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
      } else {
        result = result.filter((b) => b.status === statusFilter);
      }
    } else if (activeTab === 'in_progress') {
      result = result.filter((b) => b.status === 'in_progress' || b.status === 'on_the_way');
    } else if (activeTab === 'pending') {
      result = result.filter((b) => b.status === 'pending' || b.status === 'accepted');
    } else if (activeTab === 'completed') {
      result = result.filter((b) => b.status === 'completed');
    } else if (activeTab === 'cancelled') {
      result = result.filter((b) => b.status === 'cancelled' || b.status === 'rejected');
    }

    // 2. Search Query (matches service name, booking ID, pro name, address, category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.serviceName?.toLowerCase().includes(q) ||
          b.id?.toLowerCase().includes(q) ||
          b.serviceManName?.toLowerCase().includes(q) ||
          b.categoryName?.toLowerCase().includes(q) ||
          b.address?.toLowerCase().includes(q) ||
          b.notes?.toLowerCase().includes(q)
      );
    }

    // 3. Date Range Filter
    if (isDateFiltered) {
      result = result.filter((b) => isBookingInDateRange(b, dateFilter));
    }

    // 4. Sorting
    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || b.scheduledDate).getTime() -
          new Date(a.createdAt || a.scheduledDate).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || a.scheduledDate).getTime() -
          new Date(b.createdAt || b.scheduledDate).getTime();
      }
      if (sortBy === 'amount_desc') {
        return (b.amount || 0) - (a.amount || 0);
      }
      if (sortBy === 'amount_asc') {
        return (a.amount || 0) - (b.amount || 0);
      }
      return 0;
    });

    return result;
  }, [bookings, activeTab, statusFilter, searchQuery, sortBy, dateFilter, isDateFiltered]);

  const getStatusBadge = (status: BookingStatus, isVerifiedDelivery?: boolean) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Assignment
          </span>
        );
      case 'accepted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Technician Assigned
          </span>
        );
      case 'on_the_way':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Technician On The Way
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            Work in Progress
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {isVerifiedDelivery ? 'Verified Delivery' : 'Service Completed'}
          </span>
        );
      case 'cancelled':
      case 'rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Cancelled
          </span>
        );
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingItem) return;
    try {
      await executeStatusTransition(cancelBookingItem, 'cancelled', {
        reason: cancelReason,
        cancelledBy: 'customer',
      });
      setCancelBookingItem(null);
    } catch (err) {
      console.error('Cancel booking failed:', err);
    }
  };

  const handleDownloadPDF = (
    scope: 'all' | 'filtered' | 'custom_period' = exportScope,
    periodFilterOverride?: DateRangeFilterState
  ) => {
    let listToExport: Booking[] = bookings;
    let rangeLabel = 'All Time';
    let filterTitle = 'ALL';

    if (scope === 'filtered') {
      listToExport = filteredBookings;
      rangeLabel = isDateFiltered ? dateRangeResolved.label : 'All Time';
      filterTitle =
        activeTab !== 'all'
          ? activeTab.toUpperCase()
          : isDateFiltered
          ? 'PERIOD_FILTERED'
          : 'FILTERED';
    } else if (scope === 'custom_period') {
      const activeFilter = periodFilterOverride || modalDateFilter;
      listToExport = bookings.filter((b) => isBookingInDateRange(b, activeFilter));
      const res = resolvePresetDates(activeFilter.preset, activeFilter.startDate, activeFilter.endDate);
      rangeLabel = res.label;
      filterTitle = `PERIOD_${activeFilter.preset.toUpperCase()}`;
    }

    if (listToExport.length === 0) {
      alert('No bookings match the selected criteria or date period to export.');
      return;
    }

    exportBookingsToPDF(
      listToExport,
      { ...customerInfo, dateRangeLabel: rangeLabel },
      filterTitle,
      rangeLabel
    );
    setShowExportDropdown(false);
    setShowExportModal(false);
    setExportToast({
      message: `Summary Statement PDF (${listToExport.length} bookings • ${rangeLabel}) downloaded!`,
      type: 'pdf',
    });
    setTimeout(() => setExportToast(null), 4500);
  };

  const handleDownloadCSV = (
    scope: 'all' | 'filtered' | 'custom_period' = exportScope,
    periodFilterOverride?: DateRangeFilterState
  ) => {
    let listToExport: Booking[] = bookings;
    let rangeLabel = 'All Time';
    let filterTitle = 'ALL';

    if (scope === 'filtered') {
      listToExport = filteredBookings;
      rangeLabel = isDateFiltered ? dateRangeResolved.label : 'All Time';
      filterTitle =
        activeTab !== 'all'
          ? activeTab.toUpperCase()
          : isDateFiltered
          ? 'PERIOD_FILTERED'
          : 'FILTERED';
    } else if (scope === 'custom_period') {
      const activeFilter = periodFilterOverride || modalDateFilter;
      listToExport = bookings.filter((b) => isBookingInDateRange(b, activeFilter));
      const res = resolvePresetDates(activeFilter.preset, activeFilter.startDate, activeFilter.endDate);
      rangeLabel = res.label;
      filterTitle = `PERIOD_${activeFilter.preset.toUpperCase()}`;
    }

    if (listToExport.length === 0) {
      alert('No bookings match the selected criteria or date period to export.');
      return;
    }

    exportBookingsToCSV(
      listToExport,
      { ...customerInfo, dateRangeLabel: rangeLabel },
      filterTitle,
      rangeLabel
    );
    setShowExportDropdown(false);
    setShowExportModal(false);
    setExportToast({
      message: `CSV spreadsheet (${listToExport.length} bookings • ${rangeLabel}) downloaded!`,
      type: 'csv',
    });
    setTimeout(() => setExportToast(null), 4500);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            My Service Bookings
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh Bookings"
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Track active jobs, communicate with professionals, view receipts, and rate completed services.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Download Booking History Dropdown Action */}
          <div className="relative">
            <button
              id="customer-download-history-btn"
              type="button"
              onClick={() => setShowExportDropdown((prev) => !prev)}
              disabled={bookings.length === 0}
              title={
                bookings.length === 0
                  ? 'No bookings available to download'
                  : 'Download booking history as PDF or CSV file'
              }
              className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs rounded-xl border border-stone-200 hover:border-stone-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5 text-orange-600" />
              <span>Download History</span>
              <ChevronDown
                className={`w-3 h-3 text-stone-400 transition-transform ${
                  showExportDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Invisible backdrop to dismiss dropdown */}
            {showExportDropdown && (
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowExportDropdown(false)}
              />
            )}

            {/* Quick Dropdown Menu */}
            {showExportDropdown && (
              <div
                id="customer-export-dropdown-menu"
                className="absolute right-0 mt-1.5 w-80 bg-white rounded-2xl border border-stone-200 shadow-xl p-2.5 z-40 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1.5 border-b border-stone-100 mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                    {isDateFiltered ? `Export: ${dateRangeResolved.shortLabel}` : `Export (${bookings.length} Bookings)`}
                  </span>
                  {isDateFiltered && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                      {filteredBookings.length} matching
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {/* Option 1: PDF Summary */}
                  <button
                    id="export-pdf-quick-btn"
                    type="button"
                    onClick={() => handleDownloadPDF(isDateFiltered ? 'filtered' : 'all')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-orange-50/70 transition-colors flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 group-hover:text-orange-950 flex items-center justify-between">
                        <span>Summary Statement (PDF)</span>
                        <span className="text-[10px] font-normal text-stone-400">
                          {isDateFiltered ? `${filteredBookings.length} jobs` : `${bookings.length} jobs`}
                        </span>
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">
                        {isDateFiltered ? `Period: ${dateRangeResolved.label}` : 'Printable A4 report with breakdown & totals'}
                      </p>
                    </div>
                  </button>

                  {/* Option 2: CSV Data */}
                  <button
                    id="export-csv-quick-btn"
                    type="button"
                    onClick={() => handleDownloadCSV(isDateFiltered ? 'filtered' : 'all')}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-emerald-50/70 transition-colors flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 group-hover:text-emerald-950 flex items-center justify-between">
                        <span>Spreadsheet Dataset (CSV)</span>
                        <span className="text-[10px] font-normal text-stone-400">
                          {isDateFiltered ? `${filteredBookings.length} jobs` : `${bookings.length} jobs`}
                        </span>
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">
                        {isDateFiltered ? `Period: ${dateRangeResolved.label}` : 'All columns for Excel or Google Sheets'}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="pt-1.5 mt-1.5 border-t border-stone-100 flex flex-col gap-1">
                  {isDateFiltered && (
                    <button
                      type="button"
                      onClick={() => handleDownloadPDF('all')}
                      className="w-full text-left py-1.5 px-2.5 rounded-xl hover:bg-stone-100 text-stone-600 hover:text-stone-900 font-semibold text-[11px] transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>Download All Time (All {bookings.length} Bookings)</span>
                      <ChevronRight className="w-3 h-3 text-stone-400" />
                    </button>
                  )}
                  <button
                    id="open-export-modal-btn"
                    type="button"
                    onClick={() => {
                      setShowExportDropdown(false);
                      setModalDateFilter(dateFilter);
                      setExportScope(
                        isDateFiltered
                          ? 'filtered'
                          : activeTab !== 'all' || searchQuery
                          ? 'filtered'
                          : 'all'
                      );
                      setShowExportModal(true);
                    }}
                    className="w-full text-center py-2 px-2 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-stone-100 font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-orange-600" />
                    <span>Select Specific Date Period & Formats...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenBookService}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs shadow-orange-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Book New Service</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards (Interactive Click-to-Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Active / In Progress Jobs Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('in_progress');
            setStatusFilter('all');
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            activeTab === 'in_progress' || activeTab === 'pending'
              ? 'bg-orange-50/70 border-orange-300 ring-2 ring-orange-500/20 shadow-xs'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-900">
              In Progress / Active
            </span>
            <div className="relative">
              <Clock className="w-4 h-4 text-orange-600" />
              {inProgressBookings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
              )}
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{inProgressBookings.length}</p>
          <span className="text-[11px] text-orange-700 font-semibold flex items-center gap-1 mt-0.5">
            {inProgressBookings.length > 0 ? '● Active work in progress' : `${pendingBookings.length} assigned/pending`}
          </span>
        </button>

        {/* Completed Jobs Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('completed');
            setStatusFilter('all');
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              Completed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{completedBookings.length}</p>
          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
            Successfully delivered
          </span>
        </button>

        {/* Cancelled Jobs Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('cancelled');
            setStatusFilter('all');
          }}
          className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
            activeTab === 'cancelled'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
              Cancelled
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">{cancelledBookings.length}</p>
          <span className="text-[11px] text-rose-600 font-medium mt-0.5 block">
            {cancelledBookings.length > 0 ? 'Closed or declined' : 'Zero cancellations'}
          </span>
        </button>

        {/* Total Invoiced Card */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('completed');
            setStatusFilter('all');
          }}
          className="p-4 rounded-3xl border border-stone-200 bg-white shadow-xs text-left hover:border-stone-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600">
              Total Invoiced
            </span>
            <Receipt className="w-4 h-4 text-stone-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">₹{totalSpent}</p>
          <span className="text-[11px] text-stone-500 font-medium mt-0.5 block">
            Across {completedBookings.length} completed orders
          </span>
        </button>
      </div>

      {/* Google AdSense Monetization Banner */}
      <AdSenseBanner
        slot="7182940291"
        format="responsive"
        category="home"
        label="विज्ञापन • GOOGLE ADSENSE SPONSORED OFFERS"
        className="my-2"
      />

      {/* Primary Filter Tabs Bar & History Controls */}
      <div className="bg-white rounded-3xl border border-stone-200 p-3 sm:p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Filter Tabs (All, In Progress, Pending, Completed, Cancelled) */}
          <div
            id="bookings-filter-tabs"
            className="flex items-center gap-1.5 p-1 bg-stone-100/90 rounded-2xl overflow-x-auto no-scrollbar"
          >
            {/* Tab: All */}
            <button
              id="filter-tab-all"
              type="button"
              onClick={() => {
                setActiveTab('all');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'all' && statusFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Bookings</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'all' && statusFilter === 'all'
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-200/80 text-stone-600'
                }`}
              >
                {allCount}
              </span>
            </button>

            {/* Tab: In Progress */}
            <button
              id="filter-tab-in-progress"
              type="button"
              onClick={() => {
                setActiveTab('in_progress');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'in_progress' && statusFilter === 'all'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-stone-600 hover:text-orange-600 hover:bg-white/50'
              }`}
            >
              <div className="relative flex items-center">
                <Activity className="w-3.5 h-3.5" />
                {inProgressBookings.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-600 absolute -top-0.5 -right-0.5 animate-pulse" />
                )}
              </div>
              <span>In Progress</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'in_progress' && statusFilter === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {inProgressBookings.length}
              </span>
            </button>

            {/* Tab: Pending / Assigned */}
            <button
              id="filter-tab-pending"
              type="button"
              onClick={() => {
                setActiveTab('pending');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'pending' && statusFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-stone-600 hover:text-blue-700 hover:bg-white/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending / Assigned</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'pending' && statusFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {pendingBookings.length}
              </span>
            </button>

            {/* Tab: Completed */}
            <button
              id="filter-tab-completed"
              type="button"
              onClick={() => {
                setActiveTab('completed');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'completed' && statusFilter === 'all'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-stone-600 hover:text-emerald-700 hover:bg-white/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'completed' && statusFilter === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {completedBookings.length}
              </span>
            </button>

            {/* Tab: Cancelled */}
            <button
              id="filter-tab-cancelled"
              type="button"
              onClick={() => {
                setActiveTab('cancelled');
                setStatusFilter('all');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'cancelled' && statusFilter === 'all'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-stone-600 hover:text-rose-700 hover:bg-white/50'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelled</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'cancelled' && statusFilter === 'all'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {cancelledBookings.length}
              </span>
            </button>
          </div>

          {/* Granular Status & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
            {/* Status Dropdown Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                <Filter className="w-3 h-3 text-stone-400" />
                Status:
              </span>
              <select
                id="bookings-status-filter-select"
                value={statusFilter !== 'all' ? statusFilter : activeTab !== 'all' ? activeTab : 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setStatusFilter('all');
                    setActiveTab('all');
                  } else if (val === 'in_progress' || val === 'pending' || val === 'completed' || val === 'cancelled') {
                    setStatusFilter('all');
                    setActiveTab(val as FilterTab);
                  } else {
                    setStatusFilter(val);
                  }
                }}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 font-semibold text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-hidden cursor-pointer"
              >
                <option value="all">All Statuses ({bookings.length})</option>
                <option value="in_progress">In Progress (कार्य प्रगति पर) ({bookings.filter(b => b.status === 'in_progress').length})</option>
                <option value="on_the_way">On The Way (रास्ते में) ({bookings.filter(b => b.status === 'on_the_way').length})</option>
                <option value="accepted">Assigned (कारीगर नियुक्त) ({bookings.filter(b => b.status === 'accepted').length})</option>
                <option value="pending">Pending (लंबित) ({bookings.filter(b => b.status === 'pending').length})</option>
                <option value="completed">Completed (पूर्ण) ({completedBookings.length})</option>
                <option value="cancelled">Cancelled (रद्द) ({cancelledBookings.length})</option>
              </select>
            </div>

            {/* Sort Control */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-400 font-medium flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-stone-400" />
                Sort:
              </span>
              <select
                id="bookings-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 font-semibold text-stone-800 focus:ring-2 focus:ring-orange-500 focus:outline-hidden cursor-pointer"
              >
                <option value="newest">Scheduled (Newest first)</option>
                <option value="oldest">Scheduled (Oldest first)</option>
                <option value="amount_desc">Amount (High to Low)</option>
                <option value="amount_asc">Amount (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Filter Input, Date-Range Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="bookings-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by service, booking ID, technician name, or address..."
              className="w-full text-xs pl-9 pr-8 py-2 bg-stone-50 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date-Range Filter Component */}
          <BookingDateRangeFilter
            value={dateFilter}
            onChange={(nextState) => setDateFilter(nextState)}
            onReset={() => setDateFilter(DEFAULT_DATE_RANGE)}
            matchingCount={filteredBookings.length}
            totalCount={bookings.length}
            onDownloadPDF={() => handleDownloadPDF('filtered')}
            onDownloadCSV={() => handleDownloadCSV('filtered')}
            idPrefix="customer-bookings-date"
          />

          {(searchQuery || activeTab !== 'all' || statusFilter !== 'all' || isDateFiltered) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
                setStatusFilter('all');
                setDateFilter(DEFAULT_DATE_RANGE);
              }}
              title="Reset all filters and date range"
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Quick Export History Button */}
          <button
            id="filter-bar-download-history-btn"
            type="button"
            onClick={() => {
              setModalDateFilter(dateFilter);
              setExportScope(
                isDateFiltered
                  ? 'filtered'
                  : activeTab !== 'all' || statusFilter !== 'all' || searchQuery
                  ? 'filtered'
                  : 'all'
              );
              setShowExportModal(true);
            }}
            disabled={bookings.length === 0}
            title="Download booking history as summary PDF or CSV"
            className="text-xs font-semibold text-stone-700 hover:text-stone-900 px-3 py-2 rounded-xl bg-white border border-stone-200 hover:border-stone-300 shadow-xs transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Download</span>
            <span>History</span>
            {filteredBookings.length !== bookings.length && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                {filteredBookings.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Date Filter Notification Banner */}
        {isDateFiltered && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-orange-50/90 border border-orange-200/80 text-xs text-orange-950 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="text-[11px]">
                Showing bookings for <strong className="font-bold text-orange-900">{dateRangeResolved.label}</strong> (
                <strong>{filteredBookings.length}</strong> of {bookings.length} jobs)
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleDownloadPDF('filtered')}
                className="font-bold text-orange-700 hover:text-orange-950 underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3" />
                Download PDF
              </button>
              <span className="text-orange-300">•</span>
              <button
                type="button"
                onClick={() => handleDownloadCSV('filtered')}
                className="font-bold text-emerald-700 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3 h-3" />
                Download CSV
              </button>
              <span className="text-orange-300">•</span>
              <button
                type="button"
                onClick={() => setDateFilter(DEFAULT_DATE_RANGE)}
                className="font-semibold text-stone-500 hover:text-stone-800 flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bookings List Section */}
      {/* Live In-Progress Service Spotlight Banner (When active jobs exist) */}
      {inProgressBookings.length > 0 && (activeTab === 'all' || activeTab === 'in_progress') && (
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-orange-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white shadow-xs">
              <Activity className="w-6 h-6 animate-pulse text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                  Live On-Site Execution
                </span>
                <span className="text-xs text-orange-100 font-medium">
                  {inProgressBookings.length} {inProgressBookings.length === 1 ? 'Job' : 'Jobs'} Active in Bhopal
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                {inProgressBookings[0].serviceName}
              </h3>
              <p className="text-xs text-white/85">
                Technician: <strong>{inProgressBookings[0].serviceManName || 'Verified Pro'}</strong> • Standard Duration: ~{getStandardDurationMinutes(inProgressBookings[0])} Mins
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <a
              href={`#booking-card-${inProgressBookings[0].id}`}
              className="px-4 py-2 rounded-xl bg-white hover:bg-orange-50 text-orange-950 font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-orange-600" />
              <span>View Live ETA & OTP</span>
            </a>
          </div>
        </div>
      )}
      {/* Offline Pending Synchronization Queue Section */}
      {pendingQueue.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    लंबित सिंक कतार (Pending Synchronization)
                  </span>
                  <span className="text-xs text-amber-950 font-bold">
                    {pendingQueue.length} ऑफ़लाइन {pendingQueue.length === 1 ? 'बुकिंग' : 'बुकिंग्स'}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  ये बुकिंग्स आपके डिवाइस के IndexedDB में सुरक्षित हैं। इंटरनेट सक्रिय होते ही स्वतः Firestore पर सिंक हो जाएंगी।
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={syncNow}
                disabled={isSyncing || !isOnline}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isSyncing ? 'सिंक हो रहा है...' : isOnline ? 'अभी सिंक करें (Push to Firestore)' : 'ऑफ़लाइन (इंटरनेट की प्रतीक्षा)'}
                </span>
              </button>
            </div>
          </div>

          {/* Cards for each offline booking in the queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-amber-200 p-3.5 shadow-xs flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                      {item.booking.serviceName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                      #{item.id}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      {item.booking.scheduledDate} {item.booking.scheduledTime && `(${item.booking.scheduledTime})`}
                    </span>
                    <span className="font-bold text-stone-800">
                      ₹{item.booking.amount || item.booking.totalAmount || 0}
                    </span>
                    <span className="text-stone-400">
                      {item.booking.paymentMethod === 'cash' ? 'Pay Cash on Service' : item.booking.paymentMethod}
                    </span>
                  </div>
                  {item.booking.address && (
                    <p className="text-[11px] text-stone-500 truncate mt-1">
                      {item.booking.address}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-[11px]">
                  <span className="text-stone-400 text-[10px]">
                    सहेजा गया: {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => deletePending(item.id)}
                      className="text-stone-400 hover:text-rose-600 transition"
                      title="हटाएं"
                    >
                      रद्द करें
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredBookings.length === 0 && pendingQueue.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 sm:p-14 text-center max-w-md mx-auto shadow-xs">
          {searchQuery ? (
            <>
              <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">
                No bookings match "{searchQuery}"
              </h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                Try searching with a different keyword or clear your active search query.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Clear Search Query
              </button>
            </>
          ) : isDateFiltered ? (
            <>
              <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">
                No bookings in {dateRangeResolved.shortLabel}
              </h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                No service jobs were scheduled or requested during {dateRangeResolved.label}.
                Try selecting a different date range or viewing your all-time booking history.
              </p>
              <button
                type="button"
                onClick={() => setDateFilter(DEFAULT_DATE_RANGE)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Show All Dates
              </button>
            </>
          ) : activeTab === 'in_progress' ? (
            <>
              <Activity className="w-12 h-12 text-orange-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">No In-Progress Bookings</h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                You don't have any service requests currently undergoing live work or with a technician on the way.
              </p>
              <button
                type="button"
                onClick={onOpenBookService}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 cursor-pointer"
              >
                Book a Service Now
              </button>
            </>
          ) : activeTab === 'pending' ? (
            <>
              <Clock className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">No Pending Bookings</h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                All your requested bookings have either been assigned, progressed, or resolved.
              </p>
              <button
                type="button"
                onClick={onOpenBookService}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Book a Service Now
              </button>
            </>
          ) : activeTab === 'completed' ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">No Completed Bookings Yet</h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                Once our verified professionals finish your requested jobs, your invoices, guarantees,
                and review forms will be accessible here.
              </p>
              <button
                type="button"
                onClick={onOpenBookService}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Explore Services
              </button>
            </>
          ) : activeTab === 'cancelled' ? (
            <>
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">No Cancelled Bookings</h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                Great news! You have zero cancelled services. All your orders are either progressing or
                successfully completed.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setStatusFilter('all');
                }}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                View All Bookings
              </button>
            </>
          ) : (
            <>
              <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-stone-800">No Bookings Found</h3>
              <p className="text-xs text-stone-500 mt-1 mb-5">
                No bookings match your current filter settings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                  setDateFilter(DEFAULT_DATE_RANGE);
                }}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                Reset All Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const isFinished = booking.status === 'completed';
            const isCancelled = booking.status === 'cancelled' || booking.status === 'rejected';
            const stepIdx = getStepIndex(booking.status);

            return (
              <div
                key={booking.id}
                id={`booking-card-${booking.id}`}
                className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200"
              >
                {/* Booking Header */}
                <div className="p-4 sm:p-5 bg-stone-50/80 border-b border-stone-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-500">
                        #{booking.id}
                      </span>
                      <span className="text-stone-300">•</span>
                      <h3 className="text-sm sm:text-base font-extrabold text-stone-900">
                        {booking.serviceName}
                      </h3>
                      <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                        {booking.categoryName}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" /> {booking.scheduledDate}
                        {booking.rescheduledAt && (
                          <span className="text-[10px] font-bold text-orange-700 bg-orange-100/80 px-1.5 py-0.5 rounded-md ml-1">
                            Rescheduled
                          </span>
                        )}
                      </span>
                      {booking.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => setRescheduleBooking(booking)}
                          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline flex items-center gap-0.5 cursor-pointer"
                          title="Change appointment date"
                        >
                          Change Date
                        </button>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" /> {booking.scheduledTime}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {booking.status === 'in_progress' && (
                      <ServiceEtaWidget booking={booking} compact />
                    )}
                    {getStatusBadge(booking.status, booking.isVerifiedDelivery)}
                    <span className="text-base font-black text-stone-900 ml-1 sm:ml-2">
                      ₹{isFinished ? (booking.finalBill?.finalAmount ?? booking.finalAmount ?? booking.amount) : booking.amount}
                    </span>
                  </div>
                </div>

                {/* Progress Status Bar for Active Bookings */}
                {!isCancelled && (
                  <div className="px-4 sm:px-6 py-3.5 bg-stone-50/40 border-b border-stone-100">
                    <div className="flex items-center justify-between text-[11px]">
                      {LIFECYCLE_STEPS.map((stepItem, idx) => {
                        const isDone = idx < stepIdx;
                        const isCurrent = idx === stepIdx;

                        return (
                          <div key={stepItem.key} className="flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isDone
                                  ? 'bg-orange-600 text-white'
                                  : isCurrent
                                  ? 'bg-orange-600 text-white ring-2 ring-orange-200 animate-pulse'
                                  : 'bg-stone-200 text-stone-500'
                              }`}
                            >
                              {isDone ? '✓' : idx + 1}
                            </span>
                            <span
                              className={`hidden sm:inline font-semibold ${
                                isCurrent
                                  ? 'text-orange-600 font-bold'
                                  : isDone
                                  ? 'text-stone-800'
                                  : 'text-stone-400'
                              }`}
                            >
                              {stepItem.shortLabel}
                            </span>
                            {idx < LIFECYCLE_STEPS.length - 1 && (
                              <span className="text-stone-300 mx-1 sm:mx-2">›</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Live ETA Countdown & Service Progress Widget (For In-Progress Jobs) */}
                {(booking.status === 'in_progress' || booking.status === 'on_the_way') && (
                  <div className="p-4 sm:p-5 pb-0">
                    <ServiceEtaWidget booking={booking} />
                  </div>
                )}

                {/* Live Tracking Map Card for Customer's Own Active Booking (Phase 3) */}
                {['accepted', 'assigned', 'on_the_way', 'arriving', 'arrived', 'otp_pending', 'in_progress', 'work_started'].includes(booking.status) && (
                  <div className="mx-4 sm:mx-6 mt-3">
                    <CustomerBookingLiveMapCard
                      booking={booking}
                      onOpenDetails={(b) => setTrackingBooking(b)}
                    />
                  </div>
                )}

                {/* Cancellation Banner if Cancelled */}
                {isCancelled && (
                  <div className="px-4 sm:px-6 py-2.5 bg-rose-50/80 border-b border-rose-100 text-xs text-rose-800 flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      Reason: "{booking.cancellationReason || 'Booking cancelled by customer or technician'}"
                    </span>
                    {booking.cancelledAt && (
                      <span className="text-[11px] text-rose-600">
                        {new Date(booking.cancelledAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Booking Content Details & Professional Info */}
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Professional Card */}
                  {(() => {
                    const previousProInfo = getPreviousProForBooking(booking, serviceMen);
                    return (
                      <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                              Assigned Professional
                            </span>
                            {isFinished && previousProInfo.pro && (
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                                  previousProInfo.isAvailable
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-stone-200 text-stone-600'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    previousProInfo.isAvailable ? 'bg-emerald-600' : 'bg-stone-400'
                                  }`}
                                />
                                {previousProInfo.isAvailable ? 'Available to Rebook' : 'Off Duty'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 font-bold flex items-center justify-center text-sm">
                              {booking.serviceManName?.charAt(0) || 'P'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-stone-900">
                                  {booking.serviceManName || 'Rajesh Sharma'}
                                </h4>
                                {previousProInfo.pro && (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1 py-0.2 rounded">
                                    ★ {previousProInfo.pro.rating || 4.9}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-stone-500">
                                {booking.serviceManPhone || '+91 98260 12345'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isCancelled && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-stone-200/80">
                            {booking.serviceManPhone && (
                              <a
                                href={`tel:${booking.serviceManPhone}`}
                                className="flex-1 min-w-[70px] py-1.5 px-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                Call
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveChatBooking(booking)}
                              className="flex-1 min-w-[70px] py-1.5 px-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat
                            </button>
                            <a
                              href={generateWhatsAppVideoCallUrl({
                                phone: booking.serviceManPhone || '+916267546945',
                                recipientName: booking.serviceManName || 'Service Pro',
                                roomCode: 'DBC-' + booking.id.slice(-6).toUpperCase(),
                                meetingUrl: `${window.location.origin}/#call-DBC-${booking.id.slice(-6).toUpperCase()}`,
                                hostName: booking.customerName || 'Customer',
                                purpose: `${booking.serviceName} लाइव वीडियो सहायता`,
                                bookingId: booking.id,
                              })}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 min-w-[120px] py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title="WhatsApp पर प्रो के साथ वीडियो कॉल शुरू करें"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>WhatsApp Video</span>
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Right: Service Location & Payment Info */}
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Service Location
                      </span>
                      <p className="font-semibold text-stone-800 leading-snug flex items-start gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <span>
                          {booking.address}, {booking.city} {booking.pincode}
                        </span>
                      </p>
                      {booking.notes && (
                        <p className="text-[11px] text-stone-500 italic mt-1 ml-4.5">
                          Notes: "{booking.notes}"
                        </p>
                      )}
                    </div>

                    {isFinished ? (
                      <div className="pt-2 border-t border-stone-100 bg-stone-50/80 -mx-1 px-3 py-2.5 rounded-xl border border-stone-200/70">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5 flex items-center justify-between">
                          <span>Final Service Charges</span>
                          <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Completed
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 block font-medium">Service Charge</span>
                            <span className="font-bold text-stone-900">
                              ₹{booking.finalBill?.baseAmount ?? booking.baseAmount ?? booking.amount}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block font-medium">Total Amount</span>
                            <span className="font-black text-stone-950">
                              ₹{booking.finalBill?.finalAmount ?? booking.finalAmount ?? booking.amount}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block font-medium">Payment Status</span>
                            <span
                              className={`font-extrabold uppercase text-[11px] ${
                                (booking.finalBill?.paymentStatus || booking.paymentStatus) === 'paid'
                                  ? 'text-emerald-600'
                                  : (booking.finalBill?.paymentStatus || booking.paymentStatus) === 'cod'
                                  ? 'text-blue-600'
                                  : 'text-amber-600'
                              }`}
                            >
                              {(booking.finalBill?.paymentStatus || booking.paymentStatus) === 'paid'
                                ? '● Paid'
                                : (booking.finalBill?.paymentStatus || booking.paymentStatus) === 'cod'
                                ? '● COD'
                                : '● Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Payment Mode
                          </span>
                          <span className="font-semibold text-stone-800 uppercase">
                            {booking.paymentMethod === 'cash'
                              ? 'Cash on Delivery'
                              : booking.paymentMethod}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Payment Status
                          </span>
                          <span
                            className={`font-bold ${
                              booking.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {booking.paymentStatus === 'paid' ? '● Paid' : '● Pay on Arrival'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secure Service Completion OTP Prompt */}
                {(booking.status === 'in_progress' ||
                  (booking.status === 'completed' && booking.isVerifiedDelivery)) && (
                  <div className="px-4 sm:px-5 pb-4">
                    <DeliveryOtpPrompt
                      booking={booking}
                      onVerified={() => {
                        if (onRefresh) onRefresh();
                      }}
                    />
                  </div>
                )}

                {/* Bottom Action Footer */}
                {(() => {
                  const previousProInfo = getPreviousProForBooking(booking, serviceMen);
                  return (
                    <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLifecycleBooking(booking)}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
                        >
                          <Activity className="w-3.5 h-3.5" /> Track Full Lifecycle
                        </button>

                        <button
                          type="button"
                          onClick={() => setInvoiceBooking(booking)}
                          className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" /> View Receipt
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Booking QR Code Button */}
                        {['accepted', 'assigned', 'on_the_way', 'arriving', 'arrived', 'otp_pending', 'in_progress', 'work_started'].includes(booking.status) && (
                          <button
                            id={`btn-show-qr-${booking.id}`}
                            type="button"
                            onClick={() => setQrModalBooking(booking)}
                            className="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Show booking QR code for technician to scan"
                          >
                            <QrCode className="w-3.5 h-3.5 text-orange-600" />
                            <span>Booking QR</span>
                          </button>
                        )}

                        {/* Live Service Tracking Button */}
                        {['accepted', 'on_the_way', 'arriving', 'arrived', 'otp_pending', 'in_progress', 'work_started'].includes(booking.status) && (
                          <button
                            id={`btn-live-track-${booking.id}`}
                            type="button"
                            onClick={() => setTrackingBooking(booking)}
                            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Open live tracking map and view arrival OTP"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Live Track</span>
                          </button>
                        )}

                        {/* Reschedule Button - Only if status is 'pending' */}
                        {booking.status === 'pending' && (
                          <button
                            id={`btn-reschedule-${booking.id}`}
                            type="button"
                            onClick={() => setRescheduleBooking(booking)}
                            className="px-3.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50/80 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Reschedule service date"
                          >
                            <Calendar className="w-3.5 h-3.5 text-orange-600" />
                            <span>Reschedule</span>
                          </button>
                        )}

                        {/* Active Cancellations */}
                        {['pending', 'accepted'].includes(booking.status) && (
                          <button
                            type="button"
                            onClick={() => setCancelBookingItem(booking)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Cancel Booking
                          </button>
                        )}

                        {/* Rate & Review Button */}
                        {isFinished && !booking.isReviewed && (
                          <button
                            type="button"
                            onClick={() => setReviewBooking(booking)}
                            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Star className="w-3.5 h-3.5 fill-white" /> Rate &amp; Review
                          </button>
                        )}

                        {/* Reviewed Badge */}
                        {isFinished && booking.isReviewed && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Reviewed ({booking.rating || 5}★)
                          </span>
                        )}

                        {/* GST Tax Invoice Button */}
                        {isFinished && (
                          <button
                            type="button"
                            onClick={async () => {
                              const doc = await createOrGetTaxInvoiceForBooking(booking);
                              setActiveFinancialDoc(doc);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="Download official GST Tax Invoice"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-200" />
                            <span>GST Tax Invoice</span>
                          </button>
                        )}

                        {/* Service Guarantee & Free Revisit Button */}
                        {isFinished && (
                          <button
                            type="button"
                            onClick={() => setGuaranteeBooking(booking)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                            title="सर्विस गारंटी प्रमाणपत्र एवं मुफ़्त रिविजिट दावा"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>सर्विस गारंटी (Guarantee)</span>
                          </button>
                        )}

                        {/* HARDINKAAM Service Bill Button */}
                        {isFinished && (
                          <button
                            type="button"
                            onClick={() => setTrackingBooking(booking)}
                            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="View official HARDINKAAM Service Bill with work timestamps and itemized charges"
                          >
                            <Receipt className="w-3.5 h-3.5 text-amber-400" />
                            <span>HARDINKAAM Bill</span>
                          </button>
                        )}

                        {/* Cash Payment Action for Completed Unpaid Bookings */}
                        {isFinished && booking.paymentStatus !== 'paid' && (
                          booking.cashPaymentStatus === 'pending_approval' ? (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" /> नकद सत्यापन लंबित
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setCashPaymentBooking(booking)}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                              title="नकद भुगतान अनुरोध भेजें"
                            >
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Pay Cash (नकद भुगतान)</span>
                            </button>
                          )
                        )}

                        {/* Quick Rebook Button for Completed bookings */}
                        {isFinished && (
                          <button
                            id={`btn-quick-rebook-${booking.id}`}
                            type="button"
                            onClick={() => handleInitiateQuickRebook(booking)}
                            className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:shadow-md hover:shadow-orange-600/20 active:scale-95"
                            title={
                              previousProInfo.pro && previousProInfo.isAvailable
                                ? `Quick Rebook with ${previousProInfo.pro.name} (Online)`
                                : 'Quick Rebook this service'
                            }
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Quick Rebook</span>
                            {previousProInfo.pro && previousProInfo.isAvailable && (
                              <span className="hidden sm:inline-flex items-center text-[10px] bg-orange-700 text-orange-100 px-1.5 py-0.2 rounded font-bold ml-0.5">
                                ★ {previousProInfo.pro.name.split(' ')[0]}
                              </span>
                            )}
                          </button>
                        )}

                        {/* Re-Book Button for Cancelled */}
                        {isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleInitiateQuickRebook(booking)}
                            className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Re-Book Service
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Chat Modal with MessageInterface */}
      <ChatModal
        isOpen={Boolean(activeChatBooking)}
        onClose={() => setActiveChatBooking(null)}
        booking={activeChatBooking}
      />

      {/* Dedicated Lifecycle State Machine Modal */}
      {lifecycleBooking && (
        <BookingModal
          isOpen={Boolean(lifecycleBooking)}
          onClose={() => setLifecycleBooking(null)}
          existingBooking={lifecycleBooking}
        />
      )}

      {/* Post-Service Feedback & Rating Modal */}
      {reviewBooking && (
        <PostServiceFeedbackModal
          isOpen={Boolean(reviewBooking)}
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => setReviewBooking(null)}
        />
      )}

      {/* Cancel Dialog Modal */}
      {cancelBookingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 border border-stone-200 shadow-2xl">
            <h3 className="text-base font-extrabold text-stone-900">
              Cancel Booking #{cancelBookingItem.id}
            </h3>
            <p className="text-xs text-stone-500">
              Please choose a reason for cancellation. If you made an online payment, refund will be
              processed within 24 hours.
            </p>
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">Reason</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
              >
                <option value="Plans changed / Not required">Plans changed / Not required</option>
                <option value="Booked another technician">Booked another technician</option>
                <option value="Scheduled time not suitable">Scheduled time not suitable</option>
                <option value="Pricing concern">Pricing concern</option>
                <option value="Other">Other reason</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCancelBookingItem(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-xs"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-base text-stone-900">HARDINKAAM Receipt</h3>
              </div>
              <button
                onClick={() => setInvoiceBooking(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-stone-800">
                  INV-{invoiceBooking.id}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Booking Reference:</span>
                <span className="font-bold text-stone-800">#{invoiceBooking.id}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Date of Service:</span>
                <span className="font-bold text-stone-800">{invoiceBooking.scheduledDate}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Customer:</span>
                <span className="font-bold text-stone-800">{invoiceBooking.customerName}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Technician:</span>
                <span className="font-bold text-stone-800">{invoiceBooking.serviceManName}</span>
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-700">{invoiceBooking.serviceName}</span>
                  <span className="font-bold text-stone-900">
                    ₹{Math.round(invoiceBooking.amount / 1.18)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>GST (18% Central + State)</span>
                  <span>
                    ₹{invoiceBooking.amount - Math.round(invoiceBooking.amount / 1.18)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Inspection / Visit</span>
                  <span>FREE</span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-black text-stone-900">
                  <span>Grand Total</span>
                  <span>₹{invoiceBooking.amount}</span>
                </div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl text-[11px] text-stone-600 text-center mt-4 space-y-1">
                <p className="font-semibold text-stone-800">
                  Thank you for choosing HARDINKAAM. For queries call +91 62675 46945.
                </p>
                <p className="text-[10px] text-stone-500">
                  Office: S-2, Ashirwad Complex, Zone-1, M.P. Nagar, Bhopal, MP - 462011
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                id="invoice-modal-download-pdf-btn"
                type="button"
                onClick={() => exportSingleInvoicePDF(invoiceBooking, customerInfo)}
                className="py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setInvoiceBooking(null)}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official GST Financial Document Modal */}
      {activeFinancialDoc && (
        <FinancialDocumentModal
          document={activeFinancialDoc}
          onClose={() => setActiveFinancialDoc(null)}
        />
      )}

      {/* Download Booking History Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    Download Booking History
                  </h3>
                  <p className="text-xs text-stone-500">
                    Export summary statement or spreadsheet records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Select Bookings Scope:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('all')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportScope === 'all'
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">All History</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                        {bookings.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      All time records
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('custom_period')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportScope === 'custom_period'
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">Specific Period</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-orange-200 text-orange-800">
                        {periodMatchingBookings.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Filter by date range
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('filtered')}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportScope === 'filtered'
                        ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">Current View</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                        {filteredBookings.length}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                      {activeTab !== 'all' ? `Tab: ${activeTab}` : 'Filtered list'}
                    </p>
                  </button>
                </div>
              </div>

              {/* Specific Period Date Picker Sub-Panel */}
              {exportScope === 'custom_period' && (
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-orange-600" />
                      Select Export Time Period
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      {periodMatchingBookings.length} bookings match
                    </span>
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'all', label: 'All Time' },
                      { id: 'today', label: 'Today' },
                      { id: 'last_7_days', label: 'Last 7 Days' },
                      { id: 'last_30_days', label: 'Last 30 Days' },
                      { id: 'this_month', label: 'This Month' },
                      { id: 'last_month', label: 'Last Month' },
                      { id: 'last_3_months', label: 'Last 3 Months' },
                      { id: 'this_year', label: 'This Year' },
                      { id: 'custom', label: 'Custom' },
                    ].map((preset) => {
                      const isSelected = modalDateFilter.preset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            if (preset.id === 'custom') {
                              setModalDateFilter((prev) => ({
                                ...prev,
                                preset: 'custom',
                              }));
                            } else {
                              const resolved = resolvePresetDates(preset.id as any);
                              setModalDateFilter((prev) => ({
                                ...prev,
                                preset: preset.id as any,
                                startDate: resolved.startDate,
                                endDate: resolved.endDate,
                              }));
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-orange-600 text-white shadow-xs'
                              : 'bg-white text-stone-700 hover:bg-stone-200/70 border border-stone-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Date Inputs */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        Start Date:
                      </label>
                      <input
                        type="date"
                        value={modalDateFilter.startDate}
                        onChange={(e) =>
                          setModalDateFilter((prev) => ({
                            ...prev,
                            preset: 'custom',
                            startDate: e.target.value,
                          }))
                        }
                        className="w-full text-xs px-2.5 py-1.5 bg-white rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium text-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-1">
                        End Date:
                      </label>
                      <input
                        type="date"
                        value={modalDateFilter.endDate}
                        onChange={(e) =>
                          setModalDateFilter((prev) => ({
                            ...prev,
                            preset: 'custom',
                            endDate: e.target.value,
                          }))
                        }
                        className="w-full text-xs px-2.5 py-1.5 bg-white rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-medium text-stone-800"
                      />
                    </div>
                  </div>

                  {/* Date Field Basis Toggle */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-stone-500 font-medium">Filter based on:</span>
                    <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5">
                      {[
                        { id: 'scheduled', label: 'Scheduled Date' },
                        { id: 'created', label: 'Booking Date' },
                        { id: 'both', label: 'Either' },
                      ].map((field) => (
                        <button
                          key={field.id}
                          type="button"
                          onClick={() =>
                            setModalDateFilter((prev) => ({
                              ...prev,
                              dateField: field.id as any,
                            }))
                          }
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            modalDateFilter.dateField === field.id
                              ? 'bg-orange-500 text-white'
                              : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200/60">
                    Selected period: <strong className="text-stone-800">{modalDateResolved.label}</strong>
                  </p>
                </div>
              )}

              {/* Format Options Cards */}
              <div className="space-y-3 pt-1">
                <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Choose Download Format:
                </label>

                {/* Option 1: PDF Summary Statement */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-orange-300 hover:shadow-xs transition-all space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900 text-sm">
                            Summary Statement (PDF)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-700">
                            Printable A4
                          </span>
                        </div>
                        <p className="text-stone-500 text-[11px] mt-0.5 leading-relaxed">
                          Official A4 statement with HARDINKAAM branding, tabular layout, order statuses, payment breakdowns, and support warranty info.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    id="export-modal-download-pdf-btn"
                    type="button"
                    onClick={() => handleDownloadPDF(exportScope, modalDateFilter)}
                    disabled={
                      (exportScope === 'all' && bookings.length === 0) ||
                      (exportScope === 'custom_period' && periodMatchingBookings.length === 0) ||
                      (exportScope === 'filtered' && filteredBookings.length === 0)
                    }
                    className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs shadow-orange-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Download Summary PDF (
                      {exportScope === 'all'
                        ? `${bookings.length} jobs • All Time`
                        : exportScope === 'custom_period'
                        ? `${periodMatchingBookings.length} jobs • ${modalDateResolved.shortLabel}`
                        : `${filteredBookings.length} jobs • Current View`}
                      )
                    </span>
                  </button>
                </div>

                {/* Option 2: CSV Data Spreadsheet */}
                <div className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900 text-sm">
                            Spreadsheet Dataset (CSV)
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                            Excel / Sheets
                          </span>
                        </div>
                        <p className="text-stone-500 text-[11px] mt-0.5 leading-relaxed">
                          Raw structured dataset including customer addresses, phone numbers, ratings, technician details, and timestamps formatted with UTF-8 BOM.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    id="export-modal-download-csv-btn"
                    type="button"
                    onClick={() => handleDownloadCSV(exportScope, modalDateFilter)}
                    disabled={
                      (exportScope === 'all' && bookings.length === 0) ||
                      (exportScope === 'custom_period' && periodMatchingBookings.length === 0) ||
                      (exportScope === 'filtered' && filteredBookings.length === 0)
                    }
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      Download CSV Spreadsheet (
                      {exportScope === 'all'
                        ? `${bookings.length} jobs • All Time`
                        : exportScope === 'custom_period'
                        ? `${periodMatchingBookings.length} jobs • ${modalDateResolved.shortLabel}`
                        : `${filteredBookings.length} jobs • Current View`}
                      )
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer details verification footer */}
              <div className="bg-stone-50 rounded-xl p-3 text-[11px] text-stone-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                <span>
                  Statement for: <strong className="text-stone-700">{customerInfo.name}</strong>
                  {customerInfo.phone ? ` (${customerInfo.phone})` : ''}
                </span>
                <span className="text-[10px] text-stone-400">HARDINKAAM Service Guarantee</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Success Toast Notification */}
      {exportToast && (
        <div
          id="export-success-toast"
          className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-stone-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-200 max-w-sm"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <p className="font-bold text-stone-100 truncate">{exportToast.message}</p>
            <p className="text-[10px] text-stone-400">File saved to your Downloads folder</p>
          </div>
          <button
            onClick={() => setExportToast(null)}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reschedule Date Picker Modal */}
      {rescheduleBooking && (
        <RescheduleModal
          isOpen={Boolean(rescheduleBooking)}
          onClose={() => setRescheduleBooking(null)}
          booking={rescheduleBooking}
          onRescheduleSuccess={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Quick Rebook Modal */}
      {quickRebookBooking && (
        <QuickRebookModal
          isOpen={Boolean(quickRebookBooking)}
          onClose={() => setQuickRebookBooking(null)}
          booking={quickRebookBooking}
          services={services}
          serviceMen={serviceMen}
          onConfirmRebook={handleConfirmQuickRebook}
        />
      )}

      {/* Live Service Tracking & Arrival Verification Modal */}
      {trackingBooking && (
        <LiveServiceTrackerModal
          booking={trackingBooking}
          serviceMen={serviceMen}
          onClose={() => setTrackingBooking(null)}
          onOpenChat={(b) => {
            setTrackingBooking(null);
            setActiveChatBooking(b);
          }}
        />
      )}

      {/* Customer Booking QR Modal */}
      {qrModalBooking && (
        <CustomerBookingQrModal
          isOpen={Boolean(qrModalBooking)}
          onClose={() => setQrModalBooking(null)}
          booking={qrModalBooking}
          arrivalOtp={qrModalBooking.arrivalOtp || qrModalBooking.otp}
        />
      )}

      {/* Cash Payment Request Modal */}
      <CashPaymentModal
        booking={cashPaymentBooking}
        isOpen={Boolean(cashPaymentBooking)}
        onClose={() => setCashPaymentBooking(null)}
        callerRole="CUSTOMER"
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Service Guarantee Modal */}
      {guaranteeBooking && (
        <ServiceGuaranteeModal
          isOpen={Boolean(guaranteeBooking)}
          onClose={() => setGuaranteeBooking(null)}
          booking={guaranteeBooking}
          onClaimSubmitted={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
};

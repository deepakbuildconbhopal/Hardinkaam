import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Download,
  Building2,
  MapPin,
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ShieldCheck,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { Booking, Service, ServiceMan, FranchisePartner } from '../../types';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import { logAuditEvent } from '../../services/auditService';
import { auth } from '../../firebase/config';

interface Props {
  bookings?: Booking[];
  services?: Service[];
  serviceMen?: ServiceMan[];
  franchisePartners?: FranchisePartner[];
  userRole?: 'admin' | 'franchise_admin';
  currentUserRole?: string;
  assignedDistrictId?: string;
  assignedDistrictName?: string;
}

export const AdminReportsManager: React.FC<Props> = ({
  bookings = [],
  services = [],
  serviceMen = [],
  franchisePartners = [],
  userRole = 'admin',
  assignedDistrictId,
  assignedDistrictName,
}) => {
  // If user is Franchise Admin, enforce strict territorial restriction
  const isFranchiseAdmin = userRole === 'franchise_admin';
  const effectiveDefaultDistrict = isFranchiseAdmin ? assignedDistrictName || assignedDistrictId || 'Gwalior' : 'all';

  // Filters State
  const [filterScope, setFilterScope] = useState<'all_india' | 'state' | 'district' | 'partner'>(
    isFranchiseAdmin ? 'district' : 'all_india'
  );
  const [selectedState, setSelectedState] = useState<string>(isFranchiseAdmin ? 'Madhya Pradesh' : 'all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(effectiveDefaultDistrict);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<'today' | 'this_week' | 'this_month' | 'last_30_days' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Derive districts list for state
  const currentStateDistricts = useMemo(() => {
    if (selectedState === 'all') {
      return ALL_INDIA_LOCATIONS.flatMap((s) => s.districts.map((d) => d.district));
    }
    const stateObj = ALL_INDIA_LOCATIONS.find((s) => s.state === selectedState);
    return stateObj ? stateObj.districts.map((d) => d.district) : [];
  }, [selectedState]);

  // Date range boundary calculation
  const dateRangeBounds = useMemo(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1); // Start of month
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (datePreset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (datePreset === 'this_week') {
      const day = now.getDay();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
    } else if (datePreset === 'last_30_days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (datePreset === 'custom' && customStartDate) {
      start = new Date(customStartDate + 'T00:00:00');
      if (customEndDate) {
        end = new Date(customEndDate + 'T23:59:59');
      }
    }

    return { start, end };
  }, [datePreset, customStartDate, customEndDate]);

  // Filter Bookings strictly based on role permissions and criteria
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // 1. Role-based district security enforcement
      if (isFranchiseAdmin) {
        const myDistLower = (assignedDistrictId || assignedDistrictName || '').toLowerCase();
        const bDistLower = (b.districtId || b.districtName || b.city || '').toLowerCase();
        if (bDistLower && !bDistLower.includes(myDistLower) && !myDistLower.includes(bDistLower)) {
          return false;
        }
      } else {
        // Super Admin district filter
        if (selectedDistrict !== 'all') {
          const selDistLower = selectedDistrict.toLowerCase();
          const bDistLower = (b.districtId || b.districtName || b.city || '').toLowerCase();
          if (bDistLower && !bDistLower.includes(selDistLower) && !selDistLower.includes(bDistLower)) {
            return false;
          }
        }
      }

      // 2. Partner filter
      if (selectedPartnerId !== 'all' && b.partnerId !== selectedPartnerId) {
        return false;
      }

      // 3. Date range filter
      if (b.createdAt) {
        const bDate = new Date(b.createdAt);
        if (bDate < dateRangeBounds.start || bDate > dateRangeBounds.end) {
          return false;
        }
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          b.id.toLowerCase().includes(q) ||
          b.serviceName.toLowerCase().includes(q) ||
          b.customerName?.toLowerCase().includes(q) ||
          b.customerPhone?.includes(q) ||
          b.serviceManName?.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [
    bookings,
    isFranchiseAdmin,
    assignedDistrictId,
    assignedDistrictName,
    selectedDistrict,
    selectedPartnerId,
    dateRangeBounds,
    searchQuery,
  ]);

  // Filter Service Pros
  const filteredPros = useMemo(() => {
    return serviceMen.filter((pro) => {
      if (isFranchiseAdmin) {
        const myDistLower = (assignedDistrictId || assignedDistrictName || '').toLowerCase();
        const pDistLower = (pro.districtId || pro.assignedDistrictName || pro.city || '').toLowerCase();
        return pDistLower.includes(myDistLower) || myDistLower.includes(pDistLower);
      }
      if (selectedDistrict !== 'all') {
        const selDistLower = selectedDistrict.toLowerCase();
        const pDistLower = (pro.districtId || pro.assignedDistrictName || pro.city || '').toLowerCase();
        return pDistLower.includes(selDistLower) || selDistLower.includes(pDistLower);
      }
      return true;
    });
  }, [serviceMen, isFranchiseAdmin, assignedDistrictId, assignedDistrictName, selectedDistrict]);

  // Derived Financial & Operational Metrics
  const reportMetrics = useMemo(() => {
    const totalBookingsCount = filteredBookings.length;
    const completedBookings = filteredBookings.filter((b) => b.status === 'completed');
    const cancelledBookings = filteredBookings.filter((b) => b.status === 'cancelled');
    const inProgressBookings = filteredBookings.filter((b) =>
      ['accepted', 'on_the_way', 'in_progress', 'pending'].includes(b.status)
    );

    const totalGMV = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const platformCommission = Math.round(totalGMV * 0.15); // 15% platform fee
    const partnerShare = Math.round(totalGMV * 0.85); // 85% partner/technician share
    const netProfit = Math.round(platformCommission * 0.65); // Net operating profit

    const settledPayments = completedBookings
      .filter((b) => b.paymentStatus === 'paid' || b.paymentMethod === 'online' || b.paymentMethod === 'wallet')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const cashOnDelivery = completedBookings
      .filter((b) => b.paymentMethod === 'cash')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const cancellationRate =
      totalBookingsCount > 0 ? ((cancelledBookings.length / totalBookingsCount) * 100).toFixed(1) : '0.0';

    // Unique customer phone/id set
    const uniqueCustomerCount = new Set(filteredBookings.map((b) => b.customerPhone || b.customerId)).size;

    return {
      totalBookingsCount,
      completedCount: completedBookings.length,
      cancelledCount: cancelledBookings.length,
      inProgressCount: inProgressBookings.length,
      totalGMV,
      platformCommission,
      partnerShare,
      netProfit,
      settledPayments,
      cashOnDelivery,
      cancellationRate,
      uniqueCustomerCount,
      totalProsCount: filteredPros.length,
      verifiedProsCount: filteredPros.filter((p) => p.isVerified).length,
    };
  }, [filteredBookings, filteredPros]);

  // CSV Export Handler
  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const scopeLabel = isFranchiseAdmin ? assignedDistrictName || assignedDistrictId : selectedDistrict;
      const dateLabel = datePreset.toUpperCase();
      const filename = `HardinKaam_Report_${scopeLabel}_${dateLabel}_${new Date().toISOString().split('T')[0]}.csv`;

      // Build CSV content
      const headers = [
        'Booking ID',
        'Date & Time',
        'District',
        'State',
        'Customer Name',
        'Customer Phone',
        'Service Name',
        'Assigned Technician',
        'Amount (INR)',
        'Payment Method',
        'Payment Status',
        'Booking Status',
        'Platform Commission (15%)',
        'Partner Share (85%)',
      ];

      const rows = filteredBookings.map((b) => [
        `"${b.id}"`,
        `"${b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN') : 'N/A'}"`,
        `"${b.districtName || b.city || (isFranchiseAdmin ? assignedDistrictName : 'Bhopal')}"`,
        `"${b.stateName || 'Madhya Pradesh'}"`,
        `"${(b.customerName || 'Customer').replace(/"/g, '""')}"`,
        `"${b.customerPhone || 'N/A'}"`,
        `"${(b.serviceName || 'Service').replace(/"/g, '""')}"`,
        `"${(b.serviceManName || 'Unassigned').replace(/"/g, '""')}"`,
        b.amount || 0,
        `"${b.paymentMethod || 'cash'}"`,
        `"${b.paymentStatus || 'pending'}"`,
        `"${b.status}"`,
        Math.round((b.amount || 0) * 0.15),
        Math.round((b.amount || 0) * 0.85),
      ]);

      // Add Summary Total Row at the bottom
      rows.push([
        '"TOTAL SUMMARY"',
        `"${new Date().toLocaleString('en-IN')}"`,
        `"${scopeLabel}"`,
        '""',
        `"Unique Customers: ${reportMetrics.uniqueCustomerCount}"`,
        '""',
        `"Total Bookings: ${reportMetrics.totalBookingsCount}"`,
        `"Pros: ${reportMetrics.totalProsCount}"`,
        reportMetrics.totalGMV,
        '""',
        `"Settled: ₹${reportMetrics.settledPayments}"`,
        `"Completed: ${reportMetrics.completedCount}"`,
        reportMetrics.platformCommission,
        reportMetrics.partnerShare,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Secure Audit Logging
      const currentUser = auth.currentUser;
      await logAuditEvent({
        action: 'REPORT_DOWNLOAD',
        actorId: currentUser?.uid || 'USER',
        actorEmail: currentUser?.email || 'admin@hardinkaam.in',
        actorRole: userRole,
        targetDistrictId: isFranchiseAdmin ? assignedDistrictId : selectedDistrict,
        targetDistrictName: isFranchiseAdmin ? assignedDistrictName : selectedDistrict,
        details: `Downloaded comprehensive operational report CSV (${filteredBookings.length} records) for ${scopeLabel}`,
        metadata: {
          scope: scopeLabel,
          datePreset,
          totalRecords: filteredBookings.length,
          totalGMV: reportMetrics.totalGMV,
        },
      });
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-bold mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                {isFranchiseAdmin
                  ? `🏢 जिला रिपोर्ट केंद्र (${assignedDistrictName || 'Gwalior'})`
                  : '🌐 अखिल भारतीय रिपोर्ट एवं वित्तीय एनालिटिक्स (All-India Master)'}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              {isFranchiseAdmin
                ? `${assignedDistrictName || 'Gwalior'} जिला प्रदर्शन रिपोर्ट`
                : 'HARDINKAAM बहुआयामी व्यापार व राजस्व रिपोर्ट'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              ग्राहक वृद्धि, सर्विसमैन दक्षता, कुल बुकिंग, राजस्व, कंपनी कमीशन व जिला फ्रेंचाइज़ी प्रॉफिट का लाइव विश्लेषण।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/20"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट / PDF प्रारूप</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={downloading}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'CSV डाउनलोड हो रहा है...' : 'CSV रिपोर्ट डाउनलोड करें'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-orange-600" />
          <span>रिपोर्ट फ़िल्टर एवं समयावधि (Report Dimension Filters)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Scope / State (Only editable for Super Admin) */}
          {!isFranchiseAdmin ? (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">राज्य (State)</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict('all');
                }}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              >
                <option value="all">🇮🇳 पूरा भारत (All States)</option>
                {ALL_INDIA_LOCATIONS.map((s) => (
                  <option key={s.state} value={s.state}>
                    {s.hindiState} ({s.state})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">आवंटित क्षेत्र (Territory)</label>
              <div className="bg-stone-100 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{assignedDistrictName || 'Gwalior District'}</span>
              </div>
            </div>
          )}

          {/* District Selector */}
          {!isFranchiseAdmin ? (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">जिला (District)</label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
              >
                <option value="all">सभी जिले (All Districts)</option>
                {currentStateDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Date Preset */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">समयावधि (Date Range)</label>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as any)}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
            >
              <option value="today">आज (Today)</option>
              <option value="this_week">इस सप्ताह (This Week)</option>
              <option value="this_month">इस महीने (This Month)</option>
              <option value="last_30_days">पिछले 30 दिन (Last 30 Days)</option>
              <option value="custom">कस्टम तिथि चयन (Custom Date Range)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">खोज (Search Customer / Pro)</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="बुकिंग ID, ग्राहक, फोन..."
                className="w-full bg-stone-50 border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Inputs if selected */}
        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">प्रारंभ तिथि (Start Date)</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">समाप्ति तिथि (End Date)</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total GMV Revenue */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">कुल राजस्व (GMV)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-stone-900">
              ₹{reportMetrics.totalGMV.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">पूर्ण बुकिंग्स से अर्जित</div>
          </div>
        </div>

        {/* Platform Commission */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">कंपनी रॉयल्टी (15%)</span>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-orange-600">
              ₹{reportMetrics.platformCommission.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-stone-500 font-bold mt-0.5">दीपक बिल्डकॉन हेडक्वाटर</div>
          </div>
        </div>

        {/* Partner Share / Profit */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">पार्टनर व टीम शेयर</span>
            <Briefcase className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-teal-700">
              ₹{reportMetrics.partnerShare.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-stone-500 font-bold mt-0.5">85% स्थानीय वितरण</div>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">कुल बुकिंग्स</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-stone-900">
              {reportMetrics.totalBookingsCount}
            </div>
            <div className="text-[11px] text-stone-500 font-bold mt-0.5">
              {reportMetrics.completedCount} पूर्ण • {reportMetrics.inProgressCount} प्रगति पर
            </div>
          </div>
        </div>

        {/* Active Service Pros */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">सर्विसमैन टीम</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-stone-900">
              {reportMetrics.totalProsCount}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
              {reportMetrics.verifiedProsCount} सत्यापित KYC
            </div>
          </div>
        </div>

        {/* Cancellation Rate */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">कैंसिलेशन दर</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-rose-600">
              {reportMetrics.cancellationRate}%
            </div>
            <div className="text-[11px] text-stone-500 font-bold mt-0.5">
              {reportMetrics.cancelledCount} निरस्त बुकिंग्स
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Ledger Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50">
          <div>
            <h3 className="font-black text-stone-900 text-sm sm:text-base">
              विस्तृत बुकिंग व लेन-देन विवरण (Detailed Booking & Financial Ledger)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              दिखाए जा रहे रिकॉर्ड्स: {filteredBookings.length}
            </p>
          </div>

          <div className="text-xs font-bold text-stone-600 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              ऑनलाइन/वॉलेट सेटल्ड: ₹{reportMetrics.settledPayments.toLocaleString('en-IN')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              कैश ऑन डिलीवरी: ₹{reportMetrics.cashOnDelivery.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">बुकिंग ID</th>
                <th className="py-3 px-4">दिनांक</th>
                <th className="py-3 px-4">स्थान (जिला)</th>
                <th className="py-3 px-4">ग्राहक विवरण</th>
                <th className="py-3 px-4">सेवा</th>
                <th className="py-3 px-4">सर्विसमैन</th>
                <th className="py-3 px-4 text-right">राशि (₹)</th>
                <th className="py-3 px-4 text-center">भुगतान स्थिति</th>
                <th className="py-3 px-4 text-center">बुकिंग स्थिति</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-stone-400 font-medium">
                    चयनित फ़िल्टर के अनुसार कोई रिकॉर्ड नहीं मिला।
                  </td>
                </tr>
              ) : (
                filteredBookings.slice(0, 50).map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-stone-900">
                      #{b.id.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 text-stone-500 whitespace-nowrap">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('hi-IN') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">
                      {b.districtName || b.city || (isFranchiseAdmin ? assignedDistrictName : 'Bhopal')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-stone-900">{b.customerName || 'Customer'}</div>
                      <div className="text-[11px] text-stone-500">{b.customerPhone}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-stone-800">{b.serviceName}</td>
                    <td className="py-3 px-4 text-stone-600">{b.serviceManName || 'असाइन नहीं'}</td>
                    <td className="py-3 px-4 text-right font-black text-stone-900">
                      ₹{b.amount?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.paymentStatus === 'paid' ? 'सफल' : 'लंबित'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {b.status === 'completed'
                          ? 'पूर्ण'
                          : b.status === 'cancelled'
                          ? 'निरस्त'
                          : 'प्रगति पर'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Filter,
  Download,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  User,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Eye,
  Copy,
  Check,
  FileSpreadsheet,
  FileText,
  Layers,
  ArrowUpRight,
  Lock,
  RefreshCw,
  Building2,
  Briefcase,
  Users,
  Award,
  CreditCard,
  Percent,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';
import {
  FinancialLedgerRecord,
  getAllFinancialLedgers,
  seedDemoFinancialTransactionsIfEmpty,
  processRefundAndReversalAtomic,
  LOCAL_FINANCIAL_LEDGER_KEY,
} from '../../services/registrationProfitCommissionService';

interface Props {
  onSelectTab?: (tab: string) => void;
}

export const AdminFinancialLedger: React.FC<Props> = ({ onSelectTab }) => {
  const [records, setRecords] = useState<FinancialLedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedRecord, setSelectedRecord] = useState<FinancialLedgerRecord | null>(null);
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Export State
  const [isExporting, setIsExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Reversal dialog state
  const [reversalModalRecord, setReversalModalRecord] = useState<FinancialLedgerRecord | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isProcessingReversal, setIsProcessingReversal] = useState(false);

  // Load records from Firestore & local storage (bounded & quota-guarded)
  useEffect(() => {
    let unsubscribe = () => {};
    const fetchLedger = async () => {
      if (isResourceExhausted()) {
        getAllFinancialLedgers().then((fallbackList) => {
          setRecords(fallbackList);
          setLoading(false);
        });
        return;
      }

      setLoading(true);
      try {
        // Realtime Firestore Listener on 'ledgers' collection (capped to 100)
        const q = query(collection(db, 'ledgers'), orderBy('createdAt', 'desc'), limit(100));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: FinancialLedgerRecord[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              if (data.transactionId || data.grossAmount !== undefined) {
                list.push({
                  id: docSnap.id,
                  transactionId: data.transactionId || docSnap.id,
                  userId: data.userId || 'USR-ANON',
                  userName: data.userName || data.customerName || 'User',
                  userPhone: data.userPhone || data.customerPhone || 'N/A',
                  userEmail: data.userEmail || '',
                  role: data.role || data.userRole || 'service_man',
                  transactionType: data.transactionType || 'service_man_registration',
                  referenceId: data.referenceId || docSnap.id,
                  paymentId: data.paymentId || 'PAY-INTERNAL',
                  orderId: data.orderId || '',
                  grossAmount: Number(data.grossAmount ?? data.grossBookingAmount ?? data.amount ?? 0),
                  commissionPool: Number(data.commissionPool ?? 21),
                  commissionDistributed: Number(data.commissionDistributed ?? data.commissionAmount ?? 0),
                  taxAmount: Number(data.taxAmount ?? data.gstAmount ?? 0),
                  gatewayFee: Number(data.gatewayFee ?? 0),
                  refundAmount: Number(data.refundAmount ?? 0),
                  otherDeductions: Number(data.otherDeductions ?? 0),
                  companyGrossAmount: Number(data.companyGrossAmount ?? data.companyShare ?? 100),
                  companyNetAmount: Number(data.companyNetAmount ?? data.netProfit ?? 100),
                  partnerId: data.partnerId,
                  partnerName: data.partnerName,
                  partnerRole: data.partnerRole,
                  commissionBreakdown: data.commissionBreakdown || [],
                  status: data.status ? (String(data.status).toUpperCase() as any) : 'APPROVED',
                  fraudScore: data.fraudScore || 0,
                  fraudReason: data.fraudReason,
                  source: data.source || 'system',
                  notes: data.notes || data.description || '',
                  createdAt: data.createdAt || new Date().toISOString(),
                  approvedAt: data.approvedAt,
                  paidAt: data.paidAt,
                  reversedAt: data.reversedAt,
                  isRefunded: data.isRefunded || false,
                });
              }
            });

            if (list.length > 0) {
              setRecords(list);
              setLoading(false);
            } else {
              // Fallback to local storage or demo benchmark
              getAllFinancialLedgers().then((fallbackList) => {
                setRecords(fallbackList);
                setLoading(false);
              });
            }
          },
          (err) => {
            console.warn('[AdminFinancialLedger] Firestore snapshot error, using local fallback:', err);
            checkAndHandleQuotaError(err);
            getAllFinancialLedgers().then((fallbackList) => {
              setRecords(fallbackList);
              setLoading(false);
            });
          }
        );
      } catch (err) {
        console.warn('[AdminFinancialLedger] Failed to init snapshot:', err);
        checkAndHandleQuotaError(err);
        getAllFinancialLedgers().then((fallbackList) => {
          setRecords(fallbackList);
          setLoading(false);
        });
      }
    };

    fetchLedger();
    return () => unsubscribe();
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTxn = r.transactionId.toLowerCase().includes(q);
        const matchesUser = (r.userName || '').toLowerCase().includes(q);
        const matchesPhone = (r.userPhone || '').toLowerCase().includes(q);
        const matchesPartner = (r.partnerName || '').toLowerCase().includes(q);
        const matchesRef = (r.referenceId || '').toLowerCase().includes(q);
        if (!matchesTxn && !matchesUser && !matchesPhone && !matchesPartner && !matchesRef) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== 'all' && r.role !== roleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'APPROVED' && r.status !== 'APPROVED' && r.status !== 'CLEARED' as any) return false;
        if (statusFilter === 'PENDING' && r.status !== 'PENDING' && r.status !== 'UNDER_REVIEW') return false;
        if (statusFilter === 'REVERSED' && r.status !== 'REVERSED' && !r.isRefunded) return false;
        if (statusFilter === 'PAID' && r.status !== 'PAID') return false;
      }

      // Transaction type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'service_man' && !r.transactionType.includes('service_man')) return false;
        if (typeFilter === 'customer' && !r.transactionType.includes('customer')) return false;
        if (typeFilter === 'partner' && !r.transactionType.includes('partner') && !r.transactionType.includes('promoter')) return false;
        if (typeFilter === 'service_booking' && !r.transactionType.includes('booking') && !r.transactionType.includes('service_commission')) return false;
        if (typeFilter === 'reversal' && !r.transactionType.includes('reversal') && r.status !== 'REVERSED') return false;
      }

      // Date quick filter
      if (dateFilter !== 'all') {
        const recordDate = new Date(r.createdAt);
        const now = new Date();
        if (dateFilter === 'today') {
          if (recordDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (recordDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          if (recordDate.getMonth() !== now.getMonth() || recordDate.getFullYear() !== now.getFullYear()) {
            return false;
          }
        }
      }

      return true;
    });
  }, [records, searchQuery, roleFilter, statusFilter, typeFilter, dateFilter]);

  // Aggregate stats from filtered records
  const stats = useMemo(() => {
    let grossCollection = 0;
    let commissionTotal = 0;
    let taxTotal = 0;
    let gatewayTotal = 0;
    let refundsTotal = 0;
    let companyGross = 0;
    let companyNet = 0;

    filteredRecords.forEach((r) => {
      grossCollection += r.grossAmount || 0;
      commissionTotal += r.commissionDistributed || 0;
      taxTotal += r.taxAmount || 0;
      gatewayTotal += r.gatewayFee || 0;
      refundsTotal += r.refundAmount || 0;
      companyGross += r.companyGrossAmount || 0;
      companyNet += r.companyNetAmount || 0;
    });

    return {
      count: filteredRecords.length,
      grossCollection,
      commissionTotal,
      taxTotal,
      gatewayTotal,
      refundsTotal,
      companyGross,
      companyNet,
    };
  }, [filteredRecords]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  // Copy Transaction ID to clipboard
  const handleCopyTxnId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedTxnId(id);
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  // Export to CSV / Excel (.xlsx) using existing 'xlsx' library
  const handleExport = async (format: 'csv' | 'xlsx' = 'xlsx') => {
    if (filteredRecords.length === 0) {
      alert('एक्सपोर्ट के लिए कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    setIsExporting(format);
    try {
      // Dynamically import xlsx library
      const XLSX = await import('xlsx');
      const dateStr = new Date().toISOString().slice(0, 10);
      const generatedAtStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

      // 1. Prepare Detailed Transactions Sheet Data
      const headers = [
        'Transaction ID',
        'Date & Time',
        'User Name',
        'User Phone',
        'User Role',
        'Transaction Type',
        'Gross Amount (INR)',
        'Commission Pool (INR)',
        'Commission Distributed (INR)',
        'Tax / GST (INR)',
        'Gateway Fee (INR)',
        'Refund Amount (INR)',
        'Company Gross Share (INR)',
        'Company Net Profit (INR)',
        'Status',
        'Partner Name',
        'Partner ID',
        'Reference ID',
        'Payment ID',
        'Source',
        'Notes / Description',
      ];

      const rows = filteredRecords.map((r) => [
        r.transactionId,
        new Date(r.createdAt).toLocaleString('en-IN'),
        r.userName || 'N/A',
        r.userPhone || 'N/A',
        r.role.toUpperCase(),
        r.transactionType,
        r.grossAmount,
        r.commissionPool,
        r.commissionDistributed,
        r.taxAmount,
        r.gatewayFee,
        r.refundAmount,
        r.companyGrossAmount,
        r.companyNetAmount,
        r.status,
        r.partnerName || 'N/A',
        r.partnerId || 'N/A',
        r.referenceId,
        r.paymentId || 'N/A',
        r.source || 'system',
        r.notes || '',
      ]);

      const transactionsSheetData = [headers, ...rows];

      // Create new workbook
      const wb = XLSX.utils.book_new();

      // Create worksheet for transactions
      const wsTransactions = XLSX.utils.aoa_to_sheet(transactionsSheetData);

      // Set optimal column widths for clean readability in Excel / Google Sheets
      wsTransactions['!cols'] = [
        { wch: 28 }, // Transaction ID
        { wch: 20 }, // Date & Time
        { wch: 22 }, // User Name
        { wch: 16 }, // User Phone
        { wch: 18 }, // Role
        { wch: 26 }, // Transaction Type
        { wch: 18 }, // Gross Amount
        { wch: 20 }, // Commission Pool
        { wch: 24 }, // Commission Distributed
        { wch: 16 }, // Tax / GST
        { wch: 16 }, // Gateway Fee
        { wch: 18 }, // Refund Amount
        { wch: 24 }, // Company Gross Share
        { wch: 24 }, // Company Net Profit
        { wch: 14 }, // Status
        { wch: 22 }, // Partner Name
        { wch: 20 }, // Partner ID
        { wch: 26 }, // Reference ID
        { wch: 22 }, // Payment ID
        { wch: 14 }, // Source
        { wch: 40 }, // Notes
      ];

      // Append Sheet 1: Transactions
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'Transaction_Ledger');

      // If format is xlsx, also append a comprehensive Executive Financial Summary Sheet
      if (format === 'xlsx') {
        const summarySheetData: (string | number)[][] = [
          ['HARDINKAAM FINANCIAL LEDGER & AUDIT REPORT'],
          ['Generated On', generatedAtStr],
          ['Role Filter', roleFilter.toUpperCase()],
          ['Status Filter', statusFilter.toUpperCase()],
          ['Type Filter', typeFilter.toUpperCase()],
          ['Date Filter', dateFilter.toUpperCase()],
          ['Search Query', searchQuery || 'None'],
          [],
          ['=== EXECUTIVE FINANCIAL REVENUE & PROFIT SUMMARY ===', ''],
          ['Metric', 'Value / Amount (INR)'],
          ['Total Filtered Transactions Count', stats.count],
          ['Total Gross Collection (Gross Revenue)', stats.grossCollection],
          ['Total Partner Commission Distributed (Capped Pool)', stats.commissionTotal],
          ['Total Taxes & GST Collected', stats.taxTotal],
          ['Total Payment Gateway Charges (2%)', stats.gatewayTotal],
          ['Total Refunds / Reversals', stats.refundsTotal],
          ['Company Gross Share (Collection - Commission)', stats.companyGross],
          ['Company Net Profit Contribution', stats.companyNet],
          [],
          ['=== REGISTRATION & COMMISSION MODEL RULES ===', ''],
          ['Rule 1: Fixed ServiceMan Registration Fee', '₹121 Total'],
          ['Rule 2: ServiceMan Referral Commission Pool', '₹21 Maximum Capped Pool'],
          ['Rule 3: Company Deterministic Gross Share', '₹100 per ServiceMan Registration'],
          ['Rule 4: Multi-level Distribution', 'Split from ₹21 Pool only (Company never goes negative)'],
          ['Rule 5: Audit Compliance', 'Immutable Ledger with Reversal Integrity'],
        ];

        const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
        wsSummary['!cols'] = [{ wch: 42 }, { wch: 32 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive_Summary');
      }

      // Generate clean file name
      const roleLabel = roleFilter === 'all' ? 'AllRoles' : roleFilter;
      const fileName = `HARDINKAAM_Financial_Ledger_${roleLabel}_${dateStr}.${format}`;

      // Write file using xlsx library
      XLSX.writeFile(wb, fileName, { bookType: format });

      setExportFeedback(`✓ सफलतापूर्वक ${format.toUpperCase()} फाइल डाउनलोड हो गई: "${fileName}"`);
      setTimeout(() => setExportFeedback(null), 4500);
    } catch (err: any) {
      console.error('Error exporting financial ledger with xlsx:', err);
      alert(`एक्सपोर्ट करने में त्रुटि: ${err.message || 'अज्ञात त्रुटि'}`);
    } finally {
      setIsExporting(null);
    }
  };

  // Handle transaction reversal
  const handleExecuteReversal = async () => {
    if (!reversalModalRecord) return;
    if (!reversalReason.trim()) {
      alert('कृपया रिवर्सल / रिफंड का वैध कारण दर्ज करें।');
      return;
    }

    setIsProcessingReversal(true);
    try {
      const res = await processRefundAndReversalAtomic(reversalModalRecord.transactionId, reversalReason.trim(), 'super_admin');
      if (res.success) {
        alert(`ट्रांजैक्शन ${reversalModalRecord.transactionId} का रिवर्सल लेज़र रिकॉर्ड सफलतापूर्वक दर्ज किया गया।`);
        setReversalModalRecord(null);
        setReversalReason('');
        // Refresh local view
        const updated = await getAllFinancialLedgers();
        setRecords(updated);
      } else {
        alert(`रिवर्सल विफल: ${res.error || 'अज्ञात त्रुटि'}`);
      }
    } catch (err: any) {
      alert(`त्रुटि: ${err.message || 'रिवर्सल पूरा नहीं हो सका'}`);
    } finally {
      setIsProcessingReversal(false);
    }
  };

  // Helper for role badge colors
  const getRoleBadge = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'service_man':
      case 'serviceman':
      case 'service_pro':
        return {
          label: 'ServiceMan (₹121)',
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: Briefcase,
        };
      case 'customer':
        return {
          label: 'Customer',
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: User,
        };
      case 'business_partner':
        return {
          label: 'Business Partner',
          bg: 'bg-purple-50 text-purple-800 border-purple-200',
          icon: Building2,
        };
      case 'brand_promoter':
        return {
          label: 'Brand Promoter',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: Award,
        };
      case 'franchise':
        return {
          label: 'Franchise Partner',
          bg: 'bg-orange-50 text-orange-800 border-orange-200',
          icon: Building2,
        };
      case 'admin':
        return {
          label: 'Admin',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: ShieldCheck,
        };
      default:
        return {
          label: role || 'User',
          bg: 'bg-stone-100 text-stone-700 border-stone-200',
          icon: User,
        };
    }
  };

  // Helper for status badge
  const getStatusBadge = (status: string, isRefunded?: boolean) => {
    if (isRefunded || status === 'REVERSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <RotateCcw className="w-3 h-3" /> REVERSED
        </span>
      );
    }
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'CLEARED':
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> APPROVED
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Check className="w-3 h-3 text-blue-600" /> PAID
          </span>
        );
      case 'UNDER_REVIEW':
      case 'HOLD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> UNDER REVIEW
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200">
            <Clock className="w-3 h-3 text-stone-500" /> PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                अपरिवर्तनीय वित्तीय बहीखाता (Immutable Audit Ledger)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold">
                100% Capped Pool Model
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-400 bg-emerald-950/80 p-1.5 rounded-2xl border border-emerald-400/30 shadow-inner" />
              Financial Transaction Ledger
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              HARDINKAAM के प्रत्येक वित्तीय लेनदेन का पूर्ण ऑडिट ट्रेल। TransactionID, User Role, Gross Amount, Partner Commission, Tax/GST, एवं Company Profit की पारदर्शी गणना।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onSelectTab && (
              <button
                type="button"
                onClick={() => onSelectTab('admin_financial_profit')}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/20 cursor-pointer shadow-sm"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                प्रॉफिट डैशबोर्ड (Overview)
              </button>
            )}

            <button
              type="button"
              id="export-to-csv-btn"
              disabled={isExporting !== null}
              onClick={() => handleExport('csv')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-emerald-300 text-xs font-bold transition-all flex items-center gap-2 shadow-md border border-emerald-500/40 cursor-pointer disabled:opacity-50 hover:scale-102"
              title="Download filtered Firestore transactions as standard CSV file using xlsx"
            >
              {isExporting === 'csv' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileText className="w-4 h-4 text-emerald-400" />
              )}
              <span>Export to CSV</span>
            </button>

            <button
              type="button"
              id="export-to-excel-btn"
              disabled={isExporting !== null}
              onClick={() => handleExport('xlsx')}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/40 border border-emerald-400 cursor-pointer hover:scale-102 disabled:opacity-50"
              title="Download formatted Excel (.xlsx) workbook using xlsx library"
            >
              {isExporting === 'xlsx' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              )}
              <span>Export to Excel</span>
            </button>
          </div>
        </div>

        {/* Live Export Feedback Toast */}
        {exportFeedback && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {exportFeedback}
            </span>
            <button
              type="button"
              onClick={() => setExportFeedback(null)}
              className="text-stone-300 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live Rule Banner */}
        <div className="mt-6 pt-5 border-t border-stone-700/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-300 bg-stone-800/60 p-2.5 rounded-2xl border border-stone-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>
              <strong className="text-emerald-300 font-bold">₹121 ServiceMan Model:</strong> ₹100 Company Share + ₹21 Single Commission Pool
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-300 bg-stone-800/60 p-2.5 rounded-2xl border border-stone-700/50">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            <span>
              <strong className="text-blue-300 font-bold">Company Gross Formula:</strong> Total Collection − Partner Commission
            </span>
          </div>
          <div className="flex items-center gap-2 text-stone-300 bg-stone-800/60 p-2.5 rounded-2xl border border-stone-700/50">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span>
              <strong className="text-amber-300 font-bold">Company Net Profit:</strong> Gross − (Commission + GST + Gateway Charges)
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>कुल लेनदेन (Count)</span>
            <Layers className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-black text-stone-900 tracking-tight">{stats.count}</p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">फ़िल्टर अनुसार रिकॉर्ड्स</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>कुल कलेक्शन (Amount)</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-700 tracking-tight">₹{stats.grossCollection.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">Gross Collection</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>कमीशन वितरित (Commission)</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-700 tracking-tight">₹{stats.commissionTotal.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-purple-600 font-bold mt-1">Capped Pool Disbursed</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-2">
            <span>टैक्स / GST (Tax)</span>
            <Building2 className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700 tracking-tight">₹{stats.taxTotal.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-stone-500 mt-1 font-medium">Applicable Taxes</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-300 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold mb-2">
            <span>कंपनी ग्रॉस शेयर</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">₹{stats.companyGross.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-emerald-700 font-bold mt-1">₹100/reg share</p>
        </div>

        <div className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-teal-400 bg-teal-50/50 shadow-sm">
          <div className="flex items-center justify-between text-teal-900 text-xs font-bold mb-2">
            <span>कंपनी शुद्ध लाभ (Net Profit)</span>
            <ShieldCheck className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-900 tracking-tight">₹{stats.companyNet.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-teal-700 font-bold mt-1">Net Margin Contribution</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Transaction ID, User Name, Phone, Reference ID या Partner Name से खोजें..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Date Filters */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-stone-100 border border-stone-200 w-full md:w-auto overflow-x-auto">
            {(['all', 'today', 'week', 'month'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDateFilter(d);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer whitespace-nowrap ${
                  dateFilter === d ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {d === 'all' ? 'All Time' : d === 'today' ? 'Today' : d === 'week' ? 'Last 7 Days' : 'This Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-stone-100">
          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">यूजर रोल (Role)</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">सभी रोल्स (All Roles)</option>
              <option value="service_man">ServiceMan (सर्विसमैन)</option>
              <option value="customer">Customer (ग्राहक)</option>
              <option value="business_partner">Business Partner (पार्टनर)</option>
              <option value="brand_promoter">Brand Promoter (प्रमोटर)</option>
              <option value="franchise">Franchise (फ्रेंचाइज़ी)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">लेनदेन प्रकार (Type)</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">सभी प्रकार (All Types)</option>
              <option value="service_man">सर्विसमैन रजिस्ट्रेशन (₹121)</option>
              <option value="customer">ग्राहक रजिस्ट्रेशन</option>
              <option value="partner">बिजनेस पार्टनर रजिस्ट्रेशन</option>
              <option value="service_booking">सर्विस बुकिंग कमीशन</option>
              <option value="reversal">रिवर्सल / रिफंड</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-500 mb-1">कमीशन स्थिति (Status)</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">सभी स्थितियां (All Status)</option>
              <option value="APPROVED">APPROVED (स्वीकृत)</option>
              <option value="PAID">PAID (भुगतान हुआ)</option>
              <option value="PENDING">PENDING (लंबित)</option>
              <option value="REVERSED">REVERSED (वापस)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('all');
                setTypeFilter('all');
                setStatusFilter('all');
                setDateFilter('all');
                setPage(1);
              }}
              className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> फ़िल्टर्स रीसेट करें
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Table Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
          <div>
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              वित्तीय लेनदेन लेज़र तालिका (Immutable Financial Ledger)
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              कुल {filteredRecords.length} रिकॉर्ड्स प्रदर्शित (पृष्ठ {page} / {totalPages})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium hidden sm:inline">
              प्रत्येक पेज: <strong>{pageSize}</strong>
            </span>
            <button
              type="button"
              disabled={isExporting !== null}
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Export to CSV format using xlsx"
            >
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>Export to CSV</span>
            </button>
            <button
              type="button"
              disabled={isExporting !== null}
              onClick={() => handleExport('xlsx')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              title="Export to Excel (.xlsx) format using xlsx"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100/80 text-stone-600 border-b border-stone-200 font-black uppercase text-[10.5px] tracking-wider">
                <th className="py-3.5 px-4">TransactionID</th>
                <th className="py-3.5 px-4">Role & User</th>
                <th className="py-3.5 px-4 text-right">Amount (Gross)</th>
                <th className="py-3.5 px-4 text-right">Commission</th>
                <th className="py-3.5 px-4 text-right">Tax / GST</th>
                <th className="py-3.5 px-4 text-right">Company Profit</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    <span className="font-bold">लेज़र डेटा लोड हो रहा है...</span>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-500">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-stone-800">कोई वित्तीय लेनदेन रिकॉर्ड नहीं मिला।</p>
                    <p className="text-xs text-stone-400 mt-1">फ़िल्टर बदलकर पुनः प्रयास करें।</p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => {
                  const roleMeta = getRoleBadge(record.role);
                  const isCopied = copiedTxnId === record.transactionId;
                  const isReversed = record.status === 'REVERSED' || record.isRefunded;

                  return (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className={`hover:bg-emerald-50/40 transition-colors cursor-pointer ${
                        isReversed ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* 1. TransactionID Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-stone-900">
                          <span>{record.transactionId}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyTxnId(record.transactionId, e)}
                            className="p-1 rounded-md hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors"
                            title="Copy Transaction ID"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-stone-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(record.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        {record.referenceId && (
                          <div className="text-[9.5px] text-stone-400 font-mono truncate max-w-[140px]" title={record.referenceId}>
                            Ref: {record.referenceId}
                          </div>
                        )}
                      </td>

                      {/* 2. Role & User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${roleMeta.bg}`}
                          >
                            <roleMeta.icon className="w-2.5 h-2.5" />
                            {roleMeta.label}
                          </span>
                        </div>
                        <div className="font-bold text-stone-900 truncate max-w-[130px]">{record.userName || 'User'}</div>
                        <div className="text-[10.5px] text-stone-500 font-mono">{record.userPhone || ''}</div>
                      </td>

                      {/* 3. Amount (Gross) Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className={`font-black text-sm ${isReversed ? 'text-rose-600 line-through' : 'text-stone-900'}`}>
                          ₹{record.grossAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {record.grossAmount === 121 ? 'Fixed Fee (₹121)' : 'Gross Collection'}
                        </div>
                      </td>

                      {/* 4. Commission Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-purple-700">
                          ₹{record.commissionDistributed.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-stone-400 font-medium">
                          Pool: ₹{record.commissionPool}
                          {record.partnerName && (
                            <span className="block truncate max-w-[100px] text-purple-600 font-bold ml-auto" title={record.partnerName}>
                              → {record.partnerName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Tax Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-xs text-amber-700">
                          ₹{(record.taxAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {record.gatewayFee > 0 ? `GW: ₹${record.gatewayFee}` : 'GST / Charge'}
                        </div>
                      </td>

                      {/* 6. Company Profit Column */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-black text-sm text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg inline-block border border-emerald-200">
                          ₹{record.companyGrossAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-teal-700 font-bold mt-0.5">
                          Net: ₹{record.companyNetAmount.toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* 7. Status Column */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(record.status, record.isRefunded)}
                      </td>

                      {/* 8. Action Column */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-emerald-100 text-stone-600 hover:text-emerald-800 transition-colors cursor-pointer"
                            title="पूर्ण विवरण देखें"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {!isReversed && (
                            <button
                              type="button"
                              onClick={() => {
                                setReversalModalRecord(record);
                                setReversalReason('');
                              }}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-600 hover:text-rose-700 transition-colors cursor-pointer"
                              title="रिवर्सल / रिफंड दर्ज करें"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50">
          <div className="text-xs text-stone-500 font-medium">
            कुल <strong className="text-stone-800">{filteredRecords.length}</strong> में से{' '}
            <strong className="text-stone-800">
              {filteredRecords.length > 0 ? (page - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(page * pageSize, filteredRecords.length)}
            </strong>{' '}
            रिकॉर्ड्स दिखाए जा रहे हैं
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> पिछला
            </button>
            <span className="text-xs font-bold text-stone-700 px-2">
              पेज {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-100 flex items-center gap-1 cursor-pointer"
            >
              अगला <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-stone-900 to-emerald-950 text-white p-5 sm:p-6 flex items-start justify-between relative">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Verified Immutable Ledger Record
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1 font-mono">
                  {selectedRecord.transactionId}
                </h3>
                <p className="text-xs text-stone-300 mt-0.5">
                  दर्ज तिथि: {new Date(selectedRecord.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-stone-700">
              {/* Status and User Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">User Name / Phone</span>
                  <p className="font-bold text-stone-900 text-sm">{selectedRecord.userName || 'N/A'}</p>
                  <p className="font-mono text-stone-500">{selectedRecord.userPhone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">User Role</span>
                  <div className="mt-1">{getRoleBadge(selectedRecord.role).label}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status, selectedRecord.isRefunded)}</div>
                </div>
              </div>

              {/* Exact Accounting Formula Breakdown */}
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <h4 className="font-black text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  लेखांकन व लाभ ब्रेकडाउन (Accounting Breakdown)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-stone-800">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold text-stone-400 block">Gross Amount</span>
                    <strong className="text-base font-black text-stone-900">₹{selectedRecord.grossAmount}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold text-purple-600 block">Commission Distributed</span>
                    <strong className="text-base font-black text-purple-700">₹{selectedRecord.commissionDistributed}</strong>
                    <span className="text-[9px] text-stone-400 block">Pool: ₹{selectedRecord.commissionPool}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-700 block">Company Gross Share</span>
                    <strong className="text-base font-black text-emerald-800">₹{selectedRecord.companyGrossAmount}</strong>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-[10px] font-bold text-teal-700 block">Company Net Profit</span>
                    <strong className="text-base font-black text-teal-900">₹{selectedRecord.companyNetAmount}</strong>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-stone-600 space-y-1">
                  <p>
                    • <strong>Gross Share Formula:</strong> ₹{selectedRecord.grossAmount} − ₹{selectedRecord.commissionDistributed} = <strong>₹{selectedRecord.companyGrossAmount}</strong>
                  </p>
                  <p>
                    • <strong>Net Profit Formula:</strong> ₹{selectedRecord.grossAmount} − (₹{selectedRecord.commissionDistributed} Comm + ₹{selectedRecord.taxAmount || 0} Tax + ₹{selectedRecord.gatewayFee || 0} GW) = <strong>₹{selectedRecord.companyNetAmount}</strong>
                  </p>
                </div>
              </div>

              {/* Partner Referral Info if available */}
              {selectedRecord.partnerId && (
                <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200">
                  <h4 className="font-bold text-purple-950 text-xs mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-600" />
                    रेफरल व पार्टनर कमीशन विवरण
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-stone-800">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Partner Name</span>
                      <strong className="font-bold">{selectedRecord.partnerName || 'Partner'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Partner ID</span>
                      <span className="font-mono text-stone-600">{selectedRecord.partnerId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Commission Amount</span>
                      <strong className="text-purple-700 font-black">₹{selectedRecord.commissionDistributed}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Audit & Technical Fields */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-stone-400">Reference ID:</span>
                  <span className="font-bold text-stone-800">{selectedRecord.referenceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Payment Gateway ID:</span>
                  <span className="font-bold text-stone-800">{selectedRecord.paymentId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Source:</span>
                  <span className="font-bold text-stone-800">{selectedRecord.source}</span>
                </div>
                {selectedRecord.notes && (
                  <div className="pt-2 border-t border-stone-200">
                    <span className="text-stone-400 block mb-1">टिप्पणी / Notes:</span>
                    <p className="font-sans text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200">
                      {selectedRecord.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleCopyTxnId(selectedRecord.transactionId, { stopPropagation: () => {} } as any);
                }}
                className="px-4 py-2 rounded-xl bg-white border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Transaction ID कॉपी करें
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversalModalRecord && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-stone-900">लेनदेन रिवर्सल / रिफंड दर्ज करें</h3>
                <p className="text-xs text-stone-500 font-mono">{reversalModalRecord.transactionId}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              इस कार्यवाही से ₹{reversalModalRecord.grossAmount} का विपरीत (Negative Reversal) लेज़र रिकॉर्ड निर्मित होगा जिससे कंपनी व पार्टनर के कमीशन बैलेंस से यह राशि स्वतः समायोजित (Deduct) हो जाएगी।
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                रिवर्सल का वैध कारण (Audit Reason) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="उदा. Fake Registration / Customer Requested Refund / Chargeback..."
                rows={3}
                className="w-full p-3 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                disabled={isProcessingReversal}
                onClick={() => {
                  setReversalModalRecord(null);
                  setReversalReason('');
                }}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-stone-700 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={isProcessingReversal}
                onClick={handleExecuteReversal}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/20 cursor-pointer flex items-center gap-1.5"
              >
                {isProcessingReversal ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> प्रोसेस हो रहा है...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" /> पुष्टि व रिवर्स करें
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

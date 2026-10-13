import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  XCircle,
  Calendar,
  Info,
  Building2,
  FileCheck2,
  Download,
  Filter,
  Check,
  ChevronDown,
  Bell,
  Sparkles,
  ExternalLink,
  Layers,
  Eye,
  UploadCloud,
  History,
} from 'lucide-react';
import {
  FranchisePartner,
  FranchiseAgreementRecord,
  KYCDocumentRecord,
} from '../../types';
import { generateFranchiseAgreementKycPDF } from '../../utils/franchiseReportExport';

export type FranchiseStatusFilter = 'All' | 'Active' | 'Draft' | 'Expired' | 'Pending';

interface Props {
  partner: FranchisePartner | null;
  latestAgreement?: FranchiseAgreementRecord | null;
  allAgreements?: FranchiseAgreementRecord[];
  kycDocs?: KYCDocumentRecord[];
}

export const FranchiseAgreementKycStatusDisplay: React.FC<Props> = ({
  partner,
  latestAgreement,
  allAgreements = [],
  kycDocs = [],
}) => {
  const [statusFilter, setStatusFilter] = useState<FranchiseStatusFilter>('All');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState(false);

  // Document Viewer Modal State
  const [isPreviewDocModalOpen, setIsPreviewDocModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [previewDocType, setPreviewDocType] = useState<string>('application/pdf');

  // Resolved agreement document metadata
  const agreementDoc = latestAgreement?.agreementDocument || partner?.agreementDocument;

  // Normalize Agreement Status
  // Required options: Draft | Sent | Accepted | Under Review | Approved/Active | Expired | Terminated
  const rawAgreementStatus = (
    latestAgreement?.status ||
    partner?.agreementStatus ||
    'APPROVED'
  ).toUpperCase();

  let activeAgreementKey:
    | 'Draft'
    | 'Sent'
    | 'Accepted'
    | 'Under Review'
    | 'Approved/Active'
    | 'Expired'
    | 'Terminated' = 'Approved/Active';

  if (rawAgreementStatus === 'DRAFT' || rawAgreementStatus === 'NOT_STARTED') {
    activeAgreementKey = 'Draft';
  } else if (rawAgreementStatus === 'SENT' || rawAgreementStatus === 'PENDING') {
    activeAgreementKey = 'Sent';
  } else if (rawAgreementStatus === 'ACCEPTED') {
    activeAgreementKey = 'Accepted';
  } else if (
    rawAgreementStatus === 'SUBMITTED' ||
    rawAgreementStatus === 'UNDER_REVIEW'
  ) {
    activeAgreementKey = 'Under Review';
  } else if (
    rawAgreementStatus === 'APPROVED' ||
    rawAgreementStatus === 'ACTIVE' ||
    rawAgreementStatus === 'COMPLETED'
  ) {
    activeAgreementKey = 'Approved/Active';
  } else if (rawAgreementStatus === 'EXPIRED') {
    activeAgreementKey = 'Expired';
  } else if (
    rawAgreementStatus === 'TERMINATED' ||
    rawAgreementStatus === 'TERMINATION_PENDING' ||
    rawAgreementStatus === 'CANCELLED' ||
    rawAgreementStatus === 'REJECTED'
  ) {
    activeAgreementKey = 'Terminated';
  }

  // Normalize KYC Status
  // Required options: Locked | Pending | Under Review | Verified | Rejected
  const rawKycStatus = (partner?.kycStatus || 'VERIFIED').toUpperCase();

  let activeKycKey: 'Locked' | 'Pending' | 'Under Review' | 'Verified' | 'Rejected' =
    'Verified';

  if (rawKycStatus === 'LOCKED') {
    activeKycKey = 'Locked';
  } else if (rawKycStatus === 'PENDING' || rawKycStatus === 'NOT_STARTED') {
    activeKycKey = 'Pending';
  } else if (
    rawKycStatus === 'UNDER_REVIEW' ||
    rawKycStatus === 'ACTION_REQUIRED'
  ) {
    activeKycKey = 'Under Review';
  } else if (rawKycStatus === 'VERIFIED' || rawKycStatus === 'APPROVED') {
    activeKycKey = 'Verified';
  } else if (rawKycStatus === 'REJECTED') {
    activeKycKey = 'Rejected';
  }

  // Format Dates
  const formatDate = (dateStr?: string, fallback: string = 'N/A') => {
    if (!dateStr) return fallback;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return fallback;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return fallback;
    }
  };

  // Determine Start Date, End Date, and Renewal Due Date
  const defaultStartDate = partner?.createdAt || '2026-04-01T00:00:00.000Z';
  const agreementStartDate =
    latestAgreement?.startDate || defaultStartDate;

  // If no end date in record, default to 1 year after start date
  let agreementEndDate = latestAgreement?.endDate;
  if (!agreementEndDate && agreementStartDate) {
    try {
      const start = new Date(agreementStartDate);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      agreementEndDate = end.toISOString();
    } catch {
      agreementEndDate = '2027-03-31T23:59:59.000Z';
    }
  }

  // Renewal Due Date: 30 days prior to agreement end date
  let renewalDueDate = '';
  if (agreementEndDate) {
    try {
      const end = new Date(agreementEndDate);
      const renewal = new Date(end);
      renewal.setDate(renewal.getDate() - 30);
      renewalDueDate = renewal.toISOString();
    } catch {
      renewalDueDate = agreementEndDate;
    }
  }

  // Calculate days until renewal due date
  const now = new Date();
  const renewalDateObj = renewalDueDate ? new Date(renewalDueDate) : null;

  let daysUntilRenewal = 999;
  let isRenewalAlertActive = false;

  if (renewalDateObj && !isNaN(renewalDateObj.getTime())) {
    const diffTime = renewalDateObj.getTime() - now.getTime();
    daysUntilRenewal = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Alert if within next 30 days (or already past renewal date)
    if (daysUntilRenewal <= 30) {
      isRenewalAlertActive = true;
    }
  }

  // Compute KYC Completion status
  const verifiedDocsCount = kycDocs.filter((d) => d.status === 'VERIFIED').length;
  const totalUploadedDocs = kycDocs.length;
  const kycCompletionSummary =
    activeKycKey === 'Verified'
      ? '100% (All Required KYC Documents Verified)'
      : totalUploadedDocs > 0
      ? `${verifiedDocsCount}/${totalUploadedDocs} Documents Verified (${Math.round(
          (verifiedDocsCount / Math.max(1, totalUploadedDocs)) * 100
        )}%)`
      : activeKycKey === 'Pending'
      ? '0% (Pending Initial Submission)'
      : 'Under Active Administrative Review';

  // Agreement Status Definitions with styling & color dots
  const agreementStatuses: Array<{
    key: typeof activeAgreementKey;
    label: string;
    sublabel: string;
    categoryGroup: 'Active' | 'Draft' | 'Expired' | 'Pending';
    dotColor: string;
    badgeBg: string;
    badgeText: string;
    description: string;
  }> = [
    {
      key: 'Approved/Active',
      label: 'Approved/Active',
      sublabel: 'अनुमोदित / सक्रिय',
      categoryGroup: 'Active',
      dotColor: 'bg-emerald-500 ring-emerald-300 ring-2 animate-pulse',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      description: 'Fully authorized and active franchise contract with verified credentials.',
    },
    {
      key: 'Under Review',
      label: 'Under Review',
      sublabel: 'समीक्षाधीन',
      categoryGroup: 'Pending',
      dotColor: 'bg-amber-500 ring-amber-200 animate-pulse',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      description: 'Super Admin and compliance desk are reviewing contract verification details.',
    },
    {
      key: 'Accepted',
      label: 'Accepted',
      sublabel: 'स्वीकृत',
      categoryGroup: 'Pending',
      dotColor: 'bg-teal-500 ring-teal-200',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-800',
      description: 'Franchise Partner has consented to terms, pending countersigning.',
    },
    {
      key: 'Sent',
      label: 'Sent',
      sublabel: 'प्रेषित',
      categoryGroup: 'Pending',
      dotColor: 'bg-sky-500 ring-sky-200',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
      description: 'Official franchise agreement copy has been sent for partner review.',
    },
    {
      key: 'Draft',
      label: 'Draft',
      sublabel: 'प्रारूप',
      categoryGroup: 'Draft',
      dotColor: 'bg-stone-400 ring-stone-200',
      badgeBg: 'bg-stone-100',
      badgeText: 'text-stone-700',
      description: 'The agreement terms are drafted and awaiting administrative dispatch.',
    },
    {
      key: 'Expired',
      label: 'Expired',
      sublabel: 'समाप्त',
      categoryGroup: 'Expired',
      dotColor: 'bg-orange-500 ring-orange-200',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-800',
      description: 'Contract validity period has concluded. Renewal required immediately.',
    },
    {
      key: 'Terminated',
      label: 'Terminated',
      sublabel: 'निरस्त',
      categoryGroup: 'Expired',
      dotColor: 'bg-rose-500 ring-rose-200',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      description: 'Contract has been formally cancelled or closed by administration.',
    },
  ];

  // KYC Status Definitions with styling & color dots
  const kycStatuses: Array<{
    key: typeof activeKycKey;
    label: string;
    sublabel: string;
    categoryGroup: 'Active' | 'Draft' | 'Expired' | 'Pending';
    dotColor: string;
    badgeBg: string;
    badgeText: string;
    description: string;
  }> = [
    {
      key: 'Verified',
      label: 'Verified',
      sublabel: 'सत्यापित',
      categoryGroup: 'Active',
      dotColor: 'bg-emerald-600 ring-emerald-300 ring-2 animate-pulse',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      description: 'All identity and regulatory documents verified by Super Admin.',
    },
    {
      key: 'Under Review',
      label: 'Under Review',
      sublabel: 'समीक्षाधीन',
      categoryGroup: 'Pending',
      dotColor: 'bg-amber-500 ring-amber-200 animate-pulse',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      description: 'Submitted documents are undergoing verification by the compliance cell.',
    },
    {
      key: 'Pending',
      label: 'Pending',
      sublabel: 'लंबित',
      categoryGroup: 'Pending',
      dotColor: 'bg-indigo-500 ring-indigo-200',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      description: 'Awaiting submission of mandatory identification and commercial documents.',
    },
    {
      key: 'Locked',
      label: 'Locked',
      sublabel: 'लॉक्ड',
      categoryGroup: 'Draft',
      dotColor: 'bg-stone-500 ring-stone-300',
      badgeBg: 'bg-stone-100',
      badgeText: 'text-stone-700',
      description: 'KYC portal locked pending preliminary partner onboarding steps.',
    },
    {
      key: 'Rejected',
      label: 'Rejected',
      sublabel: 'अस्वीकृत',
      categoryGroup: 'Expired',
      dotColor: 'bg-rose-500 ring-rose-200',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      description: 'Document discrepancy detected. Re-upload requested by admin.',
    },
  ];

  // Specific 5 options requested: 'All', 'Active', 'Draft', 'Expired', 'Pending'
  const filterOptions: Array<{
    value: FranchiseStatusFilter;
    label: string;
    hindiLabel: string;
    badgeColor: string;
    dotColor: string;
    count: number;
  }> = [
    {
      value: 'All',
      label: 'All States',
      hindiLabel: 'सभी स्थितियां',
      badgeColor: 'bg-stone-800 text-white',
      dotColor: 'bg-stone-400',
      count: agreementStatuses.length + kycStatuses.length,
    },
    {
      value: 'Active',
      label: 'Active',
      hindiLabel: 'सक्रिय / अनुमोदित',
      badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dotColor: 'bg-emerald-500',
      count:
        agreementStatuses.filter((s) => s.categoryGroup === 'Active').length +
        kycStatuses.filter((s) => s.categoryGroup === 'Active').length,
    },
    {
      value: 'Pending',
      label: 'Pending',
      hindiLabel: 'लंबित / समीक्षाधीन',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      dotColor: 'bg-amber-500',
      count:
        agreementStatuses.filter((s) => s.categoryGroup === 'Pending').length +
        kycStatuses.filter((s) => s.categoryGroup === 'Pending').length,
    },
    {
      value: 'Draft',
      label: 'Draft',
      hindiLabel: 'प्रारूप / लॉक्ड',
      badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
      dotColor: 'bg-stone-500',
      count:
        agreementStatuses.filter((s) => s.categoryGroup === 'Draft').length +
        kycStatuses.filter((s) => s.categoryGroup === 'Draft').length,
    },
    {
      value: 'Expired',
      label: 'Expired',
      hindiLabel: 'समाप्त / निरस्त',
      badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
      dotColor: 'bg-rose-500',
      count:
        agreementStatuses.filter((s) => s.categoryGroup === 'Expired').length +
        kycStatuses.filter((s) => s.categoryGroup === 'Expired').length,
    },
  ];

  // Filtered lists according to the selected 'All' | 'Active' | 'Draft' | 'Expired' | 'Pending' filter
  const displayedAgreementStatuses =
    statusFilter === 'All'
      ? agreementStatuses
      : agreementStatuses.filter((s) => s.categoryGroup === statusFilter);

  const displayedKycStatuses =
    statusFilter === 'All'
      ? kycStatuses
      : kycStatuses.filter((s) => s.categoryGroup === statusFilter);

  // Trigger PDF Generation
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      generateFranchiseAgreementKycPDF({
        partner,
        agreement: latestAgreement,
        kycDocs,
        activeAgreementStatus: activeAgreementKey,
        activeKycStatus: activeKycKey,
        startDate: agreementStartDate,
        endDate: agreementEndDate || '',
        renewalDueDate: renewalDueDate,
        daysUntilRenewal,
      });
      setDownloadSuccessToast(true);
      setTimeout(() => setDownloadSuccessToast(false), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-stone-200/90 shadow-sm overflow-hidden text-stone-800 space-y-0">
      {/* ================= 1. AUTOMATED RENEWAL ALERT BANNER (If within 30 days) ================= */}
      {isRenewalAlertActive && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-orange-600/30 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center shrink-0 text-white animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white text-orange-700 shadow-xs">
                  ⚠️ Renewal Due in {daysUntilRenewal > 0 ? `${daysUntilRenewal} Days` : 'Renewal Window Active'}
                </span>
                <span className="text-xs font-semibold text-amber-100">
                  अनुबंध नवीनीकरण चेतावनी
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-white/95 mt-1">
                Your annual franchise agreement is due for renewal on{' '}
                <strong className="underline decoration-amber-200 font-bold">
                  {formatDate(renewalDueDate)}
                </strong>{' '}
                (Expiry:{' '}
                <strong>{formatDate(agreementEndDate)}</strong>). Please submit timely renewal verification to maintain uninterrupted operations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs font-black shadow-sm transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Audit</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= 2. TOP HEADER WITH PDF DOWNLOAD & INFO ================= */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Franchise Partner Agreement &amp; KYC Status
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Official Record
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              District: <strong className="text-white">{partner?.assignedDistrictName || 'District'}</strong> • Code:{' '}
              <strong className="font-mono text-amber-300">{partner?.franchiseCode || 'HDK-001'}</strong> • State:{' '}
              <strong className="text-white">{partner?.stateName || 'Madhya Pradesh'}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls: PDF Report Button & Read-Only Badge */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
          {/* Download PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 text-xs font-black shadow-md transition transform active:scale-95 cursor-pointer disabled:opacity-50"
            title="Download Summary PDF Report for your official records"
          >
            <Download className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download Summary PDF Report'}</span>
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 text-stone-300 text-xs font-medium border border-white/10">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>View Only • Read-Only Mode</span>
          </div>
        </div>
      </div>

      {/* Download Success Banner / Toast */}
      {downloadSuccessToast && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-800 flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official Agreement &amp; KYC Summary PDF generated and downloaded successfully!</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
            Ready in Downloads
          </span>
        </div>
      )}

      {/* ================= 3. STATUS FILTER DROPDOWN & QUICK PILL TOGGLES ================= */}
      {/* Allows partners to toggle between 'All', 'Active', 'Draft', 'Expired', and 'Pending' states */}
      <div className="bg-stone-50 border-b border-stone-200/80 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
          <Filter className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="whitespace-nowrap">Status Filter (स्थिति फ़िल्टर):</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Dropdown */}
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FranchiseStatusFilter)}
              className="w-full sm:w-60 appearance-none bg-white border border-stone-300 hover:border-amber-500 rounded-xl px-3.5 py-2 pr-9 text-xs font-bold text-stone-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              aria-label="Filter status dropdown"
            >
              <option value="All">All States (सभी स्थितियां)</option>
              <option value="Active">Active (सक्रिय / अनुमोदित)</option>
              <option value="Draft">Draft (प्रारूप / लॉक्ड)</option>
              <option value="Expired">Expired (समाप्त / निरस्त)</option>
              <option value="Pending">Pending (लंबित / समीक्षाधीन)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-stone-500 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Quick Pill Buttons for Instant Toggle between 'All', 'Active', 'Draft', 'Expired', 'Pending' */}
          <div className="hidden sm:flex items-center gap-1.5 bg-stone-200/70 p-1 rounded-xl">
            {filterOptions.map((opt) => {
              const isSelected = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-700 hover:bg-stone-300/80'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                  <span>{opt.value}</span>
                </button>
              );
            })}
          </div>

          {statusFilter !== 'All' && (
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-stone-600 bg-stone-200 hover:bg-stone-300 transition cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ================= 4. MAIN DUAL GRID: AGREEMENT STATUS & KYC STATUS ================= */}
      <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ================= 4.1 AGREEMENT STATUS CARD ================= */}
        <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-stone-900 tracking-tight">
                  AGREEMENT STATUS (अनुबंध स्थिति)
                </h3>
              </div>

              {/* Current Active Agreement Badge with Visual Indicator Dot */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border shadow-2xs ${
                    activeAgreementKey === 'Approved/Active'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : activeAgreementKey === 'Under Review' || activeAgreementKey === 'Accepted'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : activeAgreementKey === 'Draft' || activeAgreementKey === 'Sent'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeAgreementKey === 'Approved/Active'
                        ? 'bg-emerald-500 animate-ping'
                        : activeAgreementKey === 'Under Review'
                        ? 'bg-amber-500'
                        : 'bg-stone-500'
                    }`}
                  />
                  <span>{activeAgreementKey}</span>
                </span>
              </div>
            </div>

            {/* List of Agreement Status Stages with Colored Dots & Visual Badges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <span>Agreement Lifecycle Stages:</span>
                {statusFilter !== 'All' && (
                  <span className="text-amber-700 font-bold normal-case">
                    Filtered by: <strong>{statusFilter}</strong> ({displayedAgreementStatuses.length} stages)
                  </span>
                )}
              </div>

              {displayedAgreementStatuses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {displayedAgreementStatuses.map((st) => {
                    const isCurrent = activeAgreementKey === st.key;
                    return (
                      <div
                        key={st.key}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                          isCurrent
                            ? 'bg-stone-900 text-white font-black shadow-sm border border-stone-900 ring-2 ring-amber-400/50'
                            : 'bg-white text-stone-700 border border-stone-200/80 hover:border-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {/* Visual Colored Status Dot */}
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dotColor}`}
                            title={`Status indicator: ${st.label}`}
                          />
                          <div className="truncate">
                            <div className="truncate font-bold flex items-center gap-1.5">
                              <span>{st.label}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400 text-stone-950 font-extrabold uppercase">
                                  Current
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[10px] ${
                                isCurrent ? 'text-amber-300 font-medium' : 'text-stone-500'
                              }`}
                            >
                              {st.sublabel}
                            </div>
                          </div>
                        </div>

                        {isCurrent ? (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 ml-1.5" />
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ml-1.5 ${st.badgeBg} ${st.badgeText}`}
                          >
                            Stage
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-stone-200 text-center text-xs text-stone-500">
                  No agreement states matching <strong>"{statusFilter}"</strong>.
                </div>
              )}

              {/* Status Explanation Banner if a specific filter is chosen */}
              {statusFilter !== 'All' && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900 mt-2 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">{statusFilter} State Focus:</strong> Showing agreement lifecycle milestones categorized under <strong>{statusFilter}</strong>.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Agreement Dates & Details with Highlight on Renewal */}
          <div className="pt-3 border-t border-stone-200/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-600 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                Agreement Start Date:
              </span>
              <strong className="text-stone-900 font-bold">{formatDate(agreementStartDate)}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-stone-600 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                Agreement End Date:
              </span>
              <strong className="text-stone-900 font-bold">{formatDate(agreementEndDate)}</strong>
            </div>

            {/* Renewal Due Date Row with Automated Alert Highlight */}
            <div
              className={`flex items-center justify-between p-2 rounded-xl transition ${
                isRenewalAlertActive
                  ? 'bg-amber-100/90 border border-amber-300 text-amber-950 font-bold'
                  : 'bg-stone-100/60'
              }`}
            >
              <span className="flex items-center gap-1.5 font-medium text-stone-700">
                <Clock className={`w-3.5 h-3.5 ${isRenewalAlertActive ? 'text-amber-700 animate-spin' : 'text-amber-600'}`} />
                <span>Renewal Due Date:</span>
                {isRenewalAlertActive && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-600 text-white">
                    {daysUntilRenewal > 0 ? `${daysUntilRenewal}d left` : 'Due'}
                  </span>
                )}
              </span>
              <strong className={isRenewalAlertActive ? 'text-amber-900 font-black' : 'text-amber-800 font-bold'}>
                {formatDate(renewalDueDate)}
              </strong>
            </div>

            {/* Franchise Agreement Acceptance Record */}
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-blue-950 font-bold flex items-center gap-1.5 text-xs">
                  <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  Acceptance Record:
                </span>
                {(latestAgreement?.acceptanceRecord || partner?.acceptanceRecord || latestAgreement?.status === 'ACCEPTED' || latestAgreement?.status === 'COMPLETED' || partner?.agreementStatus === 'COMPLETED' || partner?.agreementSignedAt) ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    ACCEPTED & SAVED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3 h-3 text-amber-600" />
                    PENDING ACCEPTANCE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-blue-100">
                <div>
                  <span className="text-stone-500 block text-[10px]">Agreement ID:</span>
                  <strong className="font-mono text-stone-900 truncate block">
                    {latestAgreement?.acceptanceRecord?.agreementId || partner?.acceptanceRecord?.agreementId || latestAgreement?.agreementId || `AGR-${partner?.franchiseCode || 'PARTNER'}`}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Version:</span>
                  <strong className="text-stone-900">
                    {latestAgreement?.acceptanceRecord?.agreementVersion || partner?.acceptanceRecord?.agreementVersion || latestAgreement?.agreementVersion || 'v1.0'}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Account ID:</span>
                  <strong className="font-mono text-stone-900 truncate block">
                    {latestAgreement?.acceptanceRecord?.partnerAccountId || partner?.acceptanceRecord?.partnerAccountId || partner?.loginUsername || partner?.id || 'N/A'}
                  </strong>
                </div>
                <div>
                  <span className="text-stone-500 block text-[10px]">Accepted On:</span>
                  <strong className="text-stone-900 truncate block">
                    {latestAgreement?.acceptanceRecord?.acceptanceDateTime
                      ? new Date(latestAgreement.acceptanceRecord.acceptanceDateTime).toLocaleDateString()
                      : partner?.acceptanceRecord?.acceptanceDateTime
                      ? new Date(partner.acceptanceRecord.acceptanceDateTime).toLocaleDateString()
                      : partner?.agreementSignedAt
                      ? new Date(partner.agreementSignedAt).toLocaleDateString()
                      : 'Pending'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Signed Agreement Document Vault Section */}
            <div className="p-3 bg-white rounded-xl border border-stone-200/80 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-stone-700 font-bold flex items-center gap-1.5 text-xs">
                  <FileText className="w-3.5 h-3.5 text-stone-600" />
                  Signed Agreement Document:
                </span>
                {agreementDoc?.fileUrl ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Document Uploaded
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    Not Uploaded
                  </span>
                )}
              </div>

              {agreementDoc?.fileUrl ? (
                <div className="space-y-2 pt-1 border-t border-stone-100">
                  <div className="flex items-center justify-between text-[11px] text-stone-600">
                    <span className="truncate max-w-[180px] font-semibold text-stone-800">
                      {agreementDoc.fileName}
                    </span>
                    <span>
                      Uploaded: <strong>{new Date(agreementDoc.uploadedAt).toLocaleDateString()}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDocUrl(agreementDoc.fileUrl);
                        setPreviewDocTitle(agreementDoc.fileName || 'Signed-Franchise-Agreement');
                        setPreviewDocType(agreementDoc.fileType || 'application/pdf');
                        setIsPreviewDocModalOpen(true);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Document</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const a = document.createElement('a');
                          a.href = agreementDoc.fileUrl;
                          a.download = agreementDoc.fileName || 'Franchise-Agreement-Document.pdf';
                          a.target = '_blank';
                          a.rel = 'noopener noreferrer';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        } catch (err) {
                          window.open(agreementDoc.fileUrl, '_blank');
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">
                  The final signed agreement document will be uploaded by Super Admin once verified.
                </p>
              )}
            </div>

            {/* Agreement Version History (Franchise Partner can view only versions belonging to their own agreement) */}
            {allAgreements && allAgreements.length > 0 && (
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-900 font-bold flex items-center gap-1.5 text-xs">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    Agreement Version History ({allAgreements.length}):
                  </span>
                  <span className="text-[10px] text-stone-500 font-semibold">All Versions Preserved</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {allAgreements.map((ver, idx) => (
                    <div key={ver.id || idx} className="p-2.5 bg-white rounded-lg border border-stone-200/60 text-[11px] space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                            {ver.agreementVersion || (ver.versionNumber ? `Version ${ver.versionNumber}` : `Version ${allAgreements.length - idx}`)}
                          </span>
                          <span className="font-mono text-stone-800 font-bold">{ver.agreementId}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ver.status === 'ACTIVE' || ver.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>
                          {ver.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] text-stone-600">
                        <div>Year: <strong className="text-stone-800">{ver.agreementYear || 'N/A'}</strong></div>
                        <div>Duration: <strong className="text-stone-800">{ver.startDate || 'N/A'} to {ver.endDate || 'N/A'}</strong></div>
                        <div>Charges: <strong className="text-stone-800">₹{ver.charges?.toLocaleString() || '50,000'}</strong></div>
                        <div>Share: <strong className="text-stone-800">C:{ver.commissionPercent || 10}% / P:{ver.profitPercentage || 20}%</strong></div>
                      </div>
                      {ver.createdAt && (
                        <div className="text-[9px] text-stone-400">Created: {new Date(ver.createdAt).toLocaleDateString()}</div>
                      )}
                      {ver.termsAndConditions && (
                        <p className="text-[10px] text-stone-500 italic line-clamp-1">📜 {ver.termsAndConditions}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================= 4.2 KYC STATUS CARD ================= */}
        <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-stone-900 tracking-tight">
                  KYC STATUS (केवाईसी सत्यापन स्थिति)
                </h3>
              </div>

              {/* Current KYC Active Badge with Visual Indicator Dot */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border shadow-2xs ${
                    activeKycKey === 'Verified'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : activeKycKey === 'Under Review'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : activeKycKey === 'Pending'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : activeKycKey === 'Locked'
                      ? 'bg-stone-200 text-stone-800 border-stone-300'
                      : 'bg-rose-100 text-rose-900 border-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeKycKey === 'Verified'
                        ? 'bg-emerald-600 animate-ping'
                        : activeKycKey === 'Under Review'
                        ? 'bg-amber-500'
                        : 'bg-stone-500'
                    }`}
                  />
                  <span>{activeKycKey}</span>
                </span>
              </div>
            </div>

            {/* List of KYC Status Stages with Colored Dots & Visual Badges */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                <span>KYC Verification Stages:</span>
                {statusFilter !== 'All' && (
                  <span className="text-amber-700 font-bold normal-case">
                    Filtered by: <strong>{statusFilter}</strong> ({displayedKycStatuses.length} stages)
                  </span>
                )}
              </div>

              {displayedKycStatuses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {displayedKycStatuses.map((st) => {
                    const isCurrent = activeKycKey === st.key;
                    return (
                      <div
                        key={st.key}
                        className={`p-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                          isCurrent
                            ? 'bg-stone-900 text-white font-black shadow-sm border border-stone-900 ring-2 ring-amber-400/50'
                            : 'bg-white text-stone-700 border border-stone-200/80 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {/* Visual Colored Status Dot */}
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dotColor}`}
                            title={`KYC indicator: ${st.label}`}
                          />
                          <div className="truncate">
                            <div className="truncate font-bold flex items-center gap-1.5">
                              <span>{st.label}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-400 text-stone-950 font-extrabold uppercase">
                                  Verified
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-[10px] ${
                                isCurrent ? 'text-amber-300 font-medium' : 'text-stone-500'
                              }`}
                            >
                              {st.sublabel}
                            </div>
                          </div>
                        </div>

                        {isCurrent ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-1.5" />
                        ) : (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ml-1.5 ${st.badgeBg} ${st.badgeText}`}
                          >
                            Step
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white border border-stone-200 text-center text-xs text-stone-500">
                  No KYC verification states matching <strong>"{statusFilter}"</strong>.
                </div>
              )}
            </div>
          </div>

          {/* KYC Completion Status Details */}
          <div className="pt-3 border-t border-stone-200/80 space-y-2 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-stone-600 font-medium">KYC Completion Status:</span>
                <strong className="text-stone-900 font-bold">{kycCompletionSummary}</strong>
              </div>
              <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeKycKey === 'Verified'
                      ? 'bg-emerald-500'
                      : activeKycKey === 'Under Review'
                      ? 'bg-amber-500'
                      : activeKycKey === 'Rejected'
                      ? 'bg-rose-500'
                      : 'bg-blue-500'
                  }`}
                  style={{
                    width:
                      activeKycKey === 'Verified'
                        ? '100%'
                        : activeKycKey === 'Under Review'
                        ? '65%'
                        : activeKycKey === 'Pending'
                        ? '25%'
                        : '10%',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-stone-600 font-medium">Verification Authority:</span>
              <strong className="text-stone-900">Deepak Buildcon Super Admin (Bhopal HQ)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 5. READ-ONLY NOTICE & COMPLIANCE FOOTER ================= */}
      <div className="bg-stone-50 border-t border-stone-200/80 px-5 py-3.5 text-[11px] text-stone-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          <span>
            Franchise Partner can <strong>VIEW</strong> these statuses. Verification, stage updates, and official legal approvals are controlled exclusively by Super Admin.
          </span>
        </div>

        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 font-bold text-xs shrink-0 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Save PDF Summary Report</span>
        </button>
      </div>

      {/* Franchise Partner Document Preview Modal */}
      {isPreviewDocModalOpen && previewDocUrl && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900 truncate max-w-xs sm:max-w-md">
                    {previewDocTitle}
                  </h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Official Signed Franchise Agreement Document
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      const a = document.createElement('a');
                      a.href = previewDocUrl;
                      a.download = previewDocTitle || 'Franchise-Agreement-Document.pdf';
                      a.target = '_blank';
                      a.rel = 'noopener noreferrer';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    } catch (err) {
                      window.open(previewDocUrl, '_blank');
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <a
                  href={previewDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewDocModalOpen(false);
                    setPreviewDocUrl(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 hover:bg-stone-300 flex items-center justify-center cursor-pointer text-sm font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-stone-100 p-3 sm:p-4 overflow-auto flex items-center justify-center">
              {previewDocType.includes('pdf') || previewDocUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={previewDocUrl}
                  className="w-full h-full rounded-2xl bg-white border border-stone-300 shadow-inner"
                  title="Agreement Document PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-900/10 rounded-2xl p-2 overflow-auto">
                  <img
                    src={previewDocUrl}
                    alt={previewDocTitle}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-2.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-[11px] text-stone-500">
              <span>Deepak Buildcon Private Limited • Legal Records</span>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewDocModalOpen(false);
                  setPreviewDocUrl(null);
                }}
                className="text-stone-700 hover:text-stone-950 font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

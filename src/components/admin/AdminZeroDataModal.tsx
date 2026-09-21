import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Trash2,
  X,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Database,
  RefreshCcw,
  Sliders,
  Wallet,
  UserCheck,
  Calendar,
  MessageSquare,
  Bell,
  Star,
  FileText,
  Building,
  Radio,
  KeyRound,
  History,
  Check,
  Sparkles,
  Info,
  Copy,
} from 'lucide-react';
import {
  executeAdvancedDataOperations,
  fetchDatabaseCollectionStats,
  DatabaseCollectionCounts,
  AdvancedDeleteOptions,
  AdvancedUpdateOptions,
  AdvancedOperationStats,
} from '../../services/dataZeroService';
import { useAuth } from '../../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  bookingsCount?: number;
  totalGMV?: number;
  onDataZeroed?: () => void;
  onZeroCompleted?: () => void;
}

type ActiveTab = 'delete' | 'update';
type PresetType = 'custom' | 'safe_reset' | 'clean_logs' | 'pros_wallets' | 'complete_wipe';

export const AdminZeroDataModal: React.FC<Props> = ({
  isOpen,
  onClose,
  bookingsCount = 0,
  totalGMV = 0,
  onDataZeroed,
  onZeroCompleted,
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('delete');
  const [activePreset, setActivePreset] = useState<PresetType>('custom');

  // Live collection statistics
  const [counts, setCounts] = useState<DatabaseCollectionCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // SECTION 1: DELETE OPTIONS (क्या मिटाना है)
  const [deleteOptions, setDeleteOptions] = useState<AdvancedDeleteOptions>({
    bookings: true,
    bookingsFilter: 'ALL',
    transactions: true,
    transactionsFilter: 'ALL',
    messages: true,
    whatsappLogs: true,
    notifications: true,
    reviews: true,
    kycDocuments: true,
    franchiseApplications: false,
    bulkCampaigns: false,
    passwordResetRequests: false,
    auditLogs: false,
  });

  // SECTION 2: UPDATE / RESET OPTIONS (क्या अपडेट / रीसेट करना है)
  const [updateOptions, setUpdateOptions] = useState<AdvancedUpdateOptions>({
    resetWallets: true,
    walletTargetBalance: 0,
    resetWalletPendingBalance: true,
    resetWalletLifetimeEarnings: true,

    resetTechnicians: true,
    techniciansSetOffline: true,
    techniciansResetJobsCounter: true,
    techniciansResetRatingToDefault: true,

    updateBookingsStatus: false,
    bookingsTargetStatus: 'CANCEL_PENDING',
    bookingsStatusNote: 'प्रशासनिक रीसेट: लंबित बुकिंग निरस्त की गई',

    resetPlatformSettings: false,
  });

  // Security confirmation controls
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [stats, setStats] = useState<AdvancedOperationStats | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Load counts when modal opens
  const loadCounts = async () => {
    setLoadingCounts(true);
    try {
      const liveStats = await fetchDatabaseCollectionStats();
      setCounts(liveStats);
    } catch (e) {
      console.warn('Failed to load database counts:', e);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCounts();
      setConfirmInput('');
      setPermissionGranted(false);
      setStats(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Apply Presets
  const applyPreset = (preset: PresetType) => {
    setActivePreset(preset);
    if (preset === 'safe_reset') {
      // Safe reset: Wipe bookings, transactions, reset wallets to 0; keep reviews, KYC, franchise leads
      setDeleteOptions({
        bookings: true,
        bookingsFilter: 'ALL',
        transactions: true,
        transactionsFilter: 'ALL',
        messages: true,
        whatsappLogs: true,
        notifications: true,
        reviews: false,
        kycDocuments: false,
        franchiseApplications: false,
        bulkCampaigns: false,
        passwordResetRequests: false,
        auditLogs: false,
      });
      setUpdateOptions({
        resetWallets: true,
        walletTargetBalance: 0,
        resetWalletPendingBalance: true,
        resetWalletLifetimeEarnings: true,
        resetTechnicians: true,
        techniciansSetOffline: true,
        techniciansResetJobsCounter: true,
        techniciansResetRatingToDefault: false,
        updateBookingsStatus: false,
        bookingsTargetStatus: 'CANCEL_PENDING',
        resetPlatformSettings: false,
      });
    } else if (preset === 'clean_logs') {
      // Clean logs only: chats, logs, notifications, campaigns; NO business data touched
      setDeleteOptions({
        bookings: false,
        bookingsFilter: 'ALL',
        transactions: false,
        transactionsFilter: 'ALL',
        messages: true,
        whatsappLogs: true,
        notifications: true,
        reviews: false,
        kycDocuments: false,
        franchiseApplications: false,
        bulkCampaigns: true,
        passwordResetRequests: true,
        auditLogs: true,
      });
      setUpdateOptions({
        resetWallets: false,
        walletTargetBalance: 0,
        resetWalletPendingBalance: false,
        resetWalletLifetimeEarnings: false,
        resetTechnicians: false,
        techniciansSetOffline: false,
        techniciansResetJobsCounter: false,
        techniciansResetRatingToDefault: false,
        updateBookingsStatus: false,
        bookingsTargetStatus: 'CANCEL_PENDING',
        resetPlatformSettings: false,
      });
      setActiveTab('delete');
    } else if (preset === 'pros_wallets') {
      // Technicians & Wallets only: NO deletions, just reset duties and balances
      setDeleteOptions({
        bookings: false,
        bookingsFilter: 'ALL',
        transactions: false,
        transactionsFilter: 'ALL',
        messages: false,
        whatsappLogs: false,
        notifications: false,
        reviews: false,
        kycDocuments: false,
        franchiseApplications: false,
        bulkCampaigns: false,
        passwordResetRequests: false,
        auditLogs: false,
      });
      setUpdateOptions({
        resetWallets: true,
        walletTargetBalance: 0,
        resetWalletPendingBalance: true,
        resetWalletLifetimeEarnings: true,
        resetTechnicians: true,
        techniciansSetOffline: true,
        techniciansResetJobsCounter: true,
        techniciansResetRatingToDefault: true,
        updateBookingsStatus: false,
        bookingsTargetStatus: 'CANCEL_PENDING',
        resetPlatformSettings: false,
      });
      setActiveTab('update');
    } else if (preset === 'complete_wipe') {
      // Wipe everything
      setDeleteOptions({
        bookings: true,
        bookingsFilter: 'ALL',
        transactions: true,
        transactionsFilter: 'ALL',
        messages: true,
        whatsappLogs: true,
        notifications: true,
        reviews: true,
        kycDocuments: true,
        franchiseApplications: true,
        bulkCampaigns: true,
        passwordResetRequests: true,
        auditLogs: true,
      });
      setUpdateOptions({
        resetWallets: true,
        walletTargetBalance: 0,
        resetWalletPendingBalance: true,
        resetWalletLifetimeEarnings: true,
        resetTechnicians: true,
        techniciansSetOffline: true,
        techniciansResetJobsCounter: true,
        techniciansResetRatingToDefault: true,
        updateBookingsStatus: false,
        bookingsTargetStatus: 'CANCEL_PENDING',
        resetPlatformSettings: true,
      });
    }
  };

  // Select all / deselect all for deletions
  const toggleAllDeletions = (enable: boolean) => {
    setActivePreset('custom');
    setDeleteOptions({
      bookings: enable,
      bookingsFilter: 'ALL',
      transactions: enable,
      transactionsFilter: 'ALL',
      messages: enable,
      whatsappLogs: enable,
      notifications: enable,
      reviews: enable,
      kycDocuments: enable,
      franchiseApplications: enable,
      bulkCampaigns: enable,
      passwordResetRequests: enable,
      auditLogs: enable,
    });
  };

  // Select all / deselect all for updates
  const toggleAllUpdates = (enable: boolean) => {
    setActivePreset('custom');
    setUpdateOptions({
      resetWallets: enable,
      walletTargetBalance: 0,
      resetWalletPendingBalance: enable,
      resetWalletLifetimeEarnings: enable,
      resetTechnicians: enable,
      techniciansSetOffline: enable,
      techniciansResetJobsCounter: enable,
      techniciansResetRatingToDefault: enable,
      updateBookingsStatus: enable,
      bookingsTargetStatus: 'CANCEL_PENDING',
      resetPlatformSettings: enable,
    });
  };

  // Calculated count of selected actions
  const selectedDeletionsCount = Object.values(deleteOptions).filter(
    (v) => typeof v === 'boolean' && v === true
  ).length;

  const selectedUpdatesCount = [
    updateOptions.resetWallets,
    updateOptions.resetTechnicians,
    updateOptions.updateBookingsStatus,
    updateOptions.resetPlatformSettings,
  ].filter(Boolean).length;

  const totalActionsCount = selectedDeletionsCount + selectedUpdatesCount;

  // Validation logic
  const normalizedKeyword = confirmInput.trim().toUpperCase();
  const isKeywordValid =
    normalizedKeyword === 'ZERO' ||
    normalizedKeyword === 'DELETE' ||
    normalizedKeyword === 'UPDATE' ||
    normalizedKeyword === 'CONFIRM' ||
    normalizedKeyword === '0';

  const isConfirmed = permissionGranted && isKeywordValid && totalActionsCount > 0;

  // Execute operations
  const handleExecuteOperations = async () => {
    if (!isConfirmed || isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setStats(null);

    try {
      const result = await executeAdvancedDataOperations({
        deleteOptions,
        updateOptions,
        adminEmail: currentUser?.email || 'deepakbuildconbhopal@gmail.com',
        adminUid: currentUser?.uid || 'admin_master',
        onProgress: (text, pct) => {
          setProgressText(text);
          setProgressPercent(pct);
        },
      });

      setStats(result);
      if (onDataZeroed) onDataZeroed();
      if (onZeroCompleted) onZeroCompleted();
      loadCounts();
    } catch (err: any) {
      console.error('Advanced data operation failed:', err);
      setErrorMessage(
        err.message || 'कार्रवाई निष्पादित करने में विफलता। कृपया व्यवस्थापक अनुमति की जांच करें।'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    onClose();
  };

  const copyAuditReport = () => {
    if (!stats) return;
    const report = `HARDINKAAM DATABASE ADVANCED RESET REPORT\nExecuted At: ${new Date(
      stats.executedAt
    ).toLocaleString('hi-IN')}\nAdmin: ${stats.adminEmail}\n\n[DELETIONS]\nTotal Deleted: ${
      stats.totalDeleted
    }\n- Bookings: ${stats.bookingsDeleted}\n- Financial Transactions: ${
      stats.transactionsDeleted + stats.walletTransactionsDeleted + stats.paymentsDeleted + stats.payoutsDeleted
    }\n- Chats & Messages: ${stats.messagesDeleted}\n- WhatsApp Logs: ${
      stats.whatsappLogsDeleted
    }\n- Reviews: ${stats.reviewsDeleted}\n- KYC Documents: ${stats.kycDocsDeleted}\n- Notifications: ${
      stats.notificationsDeleted
    }\n- Franchise Leads: ${stats.franchiseAppsDeleted}\n- Bulk SMS Campaigns: ${
      stats.bulkCampaignsDeleted
    }\n- Password Resets: ${stats.passwordResetsDeleted}\n- Historic Audit Logs: ${
      stats.auditLogsDeleted
    }\n\n[UPDATES & RESETS]\nTotal Updated: ${stats.totalUpdated}\n- Wallets Reset: ${
      stats.walletsReset
    }\n- Technicians Updated: ${stats.techniciansUpdated}\n- Bookings Status Updated: ${
      stats.bookingsUpdated
    }\n- Platform Settings Reset: ${stats.settingsReset ? 'Yes' : 'No'}`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        id="admin-advanced-zero-data-modal"
        className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
      >
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-red-700 via-stone-900 to-red-800 p-5 text-white relative shrink-0">
          {!isProcessing && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600/30 border border-red-400/40 text-red-200">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-red-950/60 px-2 py-0.5 rounded-md border border-red-500/30 text-red-200">
                  एडवांस डेटाबेस नियंत्रण • Danger Zone
                </span>
                <span className="text-[10px] font-bold text-emerald-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Firestore Live
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
                डेटा शून्यकरण व कस्टम रीसेट (Data Zero &amp; Selective Reset)
              </h2>
            </div>
          </div>
          <p className="text-xs text-stone-300 mt-2">
            प्रशासक चुन सकते हैं कि <strong>क्या मिटाना है</strong> (Delete / Wipe) और{' '}
            <strong>क्या अपडेट/रीसेट करना है</strong> (Update / Reset Fields) बिना पूरे सिस्टम को नुकसान पहुंचाए।
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 grow">
          {/* SUCCESS SCREEN */}
          {stats ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-black text-stone-900">
                  डेटा ऑपरेशन्स सफलतापूर्वक पूरे हुए!
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  All selected collections and attributes have been processed with complete audit
                  logging.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {/* Deletions Box */}
                <div className="bg-red-50/60 rounded-2xl p-4 border border-red-200 space-y-1.5 text-xs">
                  <div className="font-black text-red-900 flex items-center justify-between pb-1 border-b border-red-200">
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      मिटाए गए रिकॉर्ड्स (Deleted)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[11px]">
                      {stats.totalDeleted}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700 pt-1">
                    <span>Bookings:</span>
                    <span className="font-bold text-stone-900">{stats.bookingsDeleted}</span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Financial Ledger:</span>
                    <span className="font-bold text-stone-900">
                      {stats.transactionsDeleted +
                        stats.walletTransactionsDeleted +
                        stats.paymentsDeleted +
                        stats.payoutsDeleted}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Chats &amp; Messages:</span>
                    <span className="font-bold text-stone-900">{stats.messagesDeleted}</span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>WhatsApp &amp; Notifications:</span>
                    <span className="font-bold text-stone-900">
                      {stats.whatsappLogsDeleted + stats.notificationsDeleted}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Reviews &amp; KYC:</span>
                    <span className="font-bold text-stone-900">
                      {stats.reviewsDeleted + stats.kycDocsDeleted}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Campaigns &amp; Tickets:</span>
                    <span className="font-bold text-stone-900">
                      {stats.bulkCampaignsDeleted +
                        stats.franchiseAppsDeleted +
                        stats.passwordResetsDeleted +
                        stats.auditLogsDeleted}
                    </span>
                  </div>
                </div>

                {/* Updates Box */}
                <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-200 space-y-1.5 text-xs">
                  <div className="font-black text-blue-900 flex items-center justify-between pb-1 border-b border-blue-200">
                    <span className="flex items-center gap-1.5">
                      <RefreshCcw className="w-3.5 h-3.5 text-blue-600" />
                      अपडेट व रीसेट रिकॉर्ड्स (Updated)
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-black text-[11px]">
                      {stats.totalUpdated}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700 pt-1">
                    <span>Wallets Reset to Balance:</span>
                    <span className="font-bold text-emerald-700">{stats.walletsReset}</span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Technicians Status / Ratings:</span>
                    <span className="font-bold text-stone-900">{stats.techniciansUpdated}</span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Bookings Status Altered:</span>
                    <span className="font-bold text-stone-900">{stats.bookingsUpdated}</span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Platform Settings Reset:</span>
                    <span className="font-bold text-stone-900">
                      {stats.settingsReset ? 'हाँ (Yes, भोपाल मानक)' : 'नहीं'}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-700">
                    <span>Security Audit Log:</span>
                    <span className="font-bold text-emerald-700">सुरक्षित (Logged)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={copyAuditReport}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 font-bold text-xs flex items-center justify-center gap-1.5 text-stone-700 transition-colors cursor-pointer"
                >
                  {copiedReport ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">रिपोर्ट कॉपी हो गई!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-stone-500" />
                      <span>ऑडिट रिपोर्ट कॉपी करें</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-1/2 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  समाप्त / बंद करें (Done)
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Top Warning Banner with GMV Info */}
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-amber-950">
                      प्रशासनिक डेटा नियंत्रण केंद्र (Admin Database Control Center)
                    </p>
                    <button
                      type="button"
                      onClick={loadCounts}
                      disabled={loadingCounts}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                      title="Reload counts from Firestore"
                    >
                      <RefreshCcw className={`w-3 h-3 ${loadingCounts ? 'animate-spin' : ''}`} />
                      <span>{loadingCounts ? 'गिनती हो रही है...' : 'लाइव काउंट रिफ्रेश'}</span>
                    </button>
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                    यह टूल आपको <strong>मिटाने</strong> और <strong>अपडेट करने</strong> का स्वतंत्र
                    विकल्प देता है। कैटलॉग (Categories &amp; Services) व एडमिन खाते हमेशा सुरक्षित
                    रहते हैं।
                  </p>
                </div>
              </div>

              {/* Quick Action Presets */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-stone-500 block mb-1.5">
                  त्वरित प्रीसेट्स (Quick Action Presets):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => applyPreset('custom')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      activePreset === 'custom'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    कस्टम चयन
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('safe_reset')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      activePreset === 'safe_reset'
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    सुरक्षित रीसेट
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('clean_logs')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      activePreset === 'clean_logs'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    लॉग्स सफ़ाई
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('pros_wallets')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      activePreset === 'pros_wallets'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    वॉलेट व प्रो रीसेट
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('complete_wipe')}
                    className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      activePreset === 'complete_wipe'
                        ? 'bg-red-700 text-white border-red-700 shadow-xs'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    संपूर्ण शून्य
                  </button>
                </div>
              </div>

              {/* Segmented Tabs: Delete vs Update */}
              <div className="flex border-b border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('delete')}
                  className={`flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'delete'
                      ? 'border-red-600 text-red-700 bg-red-50/50'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>1. क्या मिटाना है? (Delete Data)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    {selectedDeletionsCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('update')}
                  className={`flex-1 py-2.5 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'update'
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <RefreshCcw className="w-4 h-4 text-blue-600" />
                  <span>2. क्या अपडेट / रीसेट करना है? (Update Fields)</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {selectedUpdatesCount}
                  </span>
                </button>
              </div>

              {/* TAB 1: DELETE OPTIONS (क्या मिटाना है) */}
              {activeTab === 'delete' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <span>स्थायी रूप से मिटाने के लिए संग्रह (Collections) चुनें:</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAllDeletions(true)}
                        className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
                      >
                        सभी चुनें
                      </button>
                      <span className="text-stone-300">|</span>
                      <button
                        type="button"
                        onClick={() => toggleAllDeletions(false)}
                        className="text-[11px] font-bold text-stone-500 hover:underline cursor-pointer"
                      >
                        सभी हटाएं
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs max-h-[38vh] overflow-y-auto pr-1">
                    {/* 1. Bookings */}
                    <div
                      className={`p-3 rounded-2xl border transition-all ${
                        deleteOptions.bookings
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <label
                          onClick={() => {
                            setActivePreset('custom');
                            setDeleteOptions({
                              ...deleteOptions,
                              bookings: !deleteOptions.bookings,
                            });
                          }}
                          className="flex items-start gap-2.5 cursor-pointer select-none grow"
                        >
                          {deleteOptions.bookings ? (
                            <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">
                                बुकिंग्स व ऑर्डर्स (Bookings &amp; Orders)
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                                {counts ? `${counts.bookingsTotal} रिकॉर्ड्स` : `${bookingsCount} रिकॉर्ड्स`}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              सक्रिय, लंबित और पूर्ण बुकिंग्स का संग्रह।
                            </p>
                          </div>
                        </label>
                      </div>

                      {deleteOptions.bookings && (
                        <div className="mt-2.5 pt-2 border-t border-red-200/60 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-red-900">फ़िल्टर:</span>
                          <select
                            value={deleteOptions.bookingsFilter}
                            onChange={(e) =>
                              setDeleteOptions({
                                ...deleteOptions,
                                bookingsFilter: e.target.value as any,
                              })
                            }
                            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-red-300 bg-white text-stone-800"
                          >
                            <option value="ALL">सभी बुकिंग्स मिटाएं (All Bookings)</option>
                            <option value="COMPLETED_CANCELLED_ONLY">
                              केवल पूर्ण व निरस्त बुकिंग्स मिटाएं ({counts?.bookingsCompletedOrCancelled || 0})
                            </option>
                            <option value="OLDER_THAN_30_DAYS">30 दिन से पुरानी बुकिंग्स मिटाएं</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 2. Transactions */}
                    <div
                      className={`p-3 rounded-2xl border transition-all ${
                        deleteOptions.transactions
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <label
                          onClick={() => {
                            setActivePreset('custom');
                            setDeleteOptions({
                              ...deleteOptions,
                              transactions: !deleteOptions.transactions,
                            });
                          }}
                          className="flex items-start gap-2.5 cursor-pointer select-none grow"
                        >
                          {deleteOptions.transactions ? (
                            <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-stone-900">
                                वित्तीय लेजर, भुगतान व पेआउट्स (Ledger &amp; Transactions)
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                                {counts
                                  ? `${
                                      counts.transactionsTotal +
                                      counts.walletTransactionsTotal +
                                      counts.paymentsTotal +
                                      counts.servicemanPayoutsTotal
                                    } प्रविष्टियां`
                                  : 'वित्तीय रिकॉर्ड'}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                              transactions, wallet_transactions, payments, serviceman_payouts संग्रह।
                            </p>
                          </div>
                        </label>
                      </div>

                      {deleteOptions.transactions && (
                        <div className="mt-2.5 pt-2 border-t border-red-200/60 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-red-900">दायरा:</span>
                          <select
                            value={deleteOptions.transactionsFilter}
                            onChange={(e) =>
                              setDeleteOptions({
                                ...deleteOptions,
                                transactionsFilter: e.target.value as any,
                              })
                            }
                            className="text-[11px] font-bold px-2 py-1 rounded-lg border border-red-300 bg-white text-stone-800"
                          >
                            <option value="ALL">सभी वित्तीय लेनदेन मिटाएं (All Ledger)</option>
                            <option value="OLDER_THAN_30_DAYS">30 दिन से पुराने लेनदेन मिटाएं</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 3. Messages & Chats */}
                    <label
                      onClick={() => {
                        setActivePreset('custom');
                        setDeleteOptions({
                          ...deleteOptions,
                          messages: !deleteOptions.messages,
                        });
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        deleteOptions.messages
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      {deleteOptions.messages ? (
                        <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            चैट संदेश व मीडिया (Messages &amp; In-App Chats)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                            {counts ? `${counts.messagesTotal} चैट्स` : 'चैट्स'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          ग्राहक व तकनीशियन के बीच बातचीत और संलग्न फोटो रिकॉर्ड्स।
                        </p>
                      </div>
                    </label>

                    {/* 4. WhatsApp Logs */}
                    <label
                      onClick={() => {
                        setActivePreset('custom');
                        setDeleteOptions({
                          ...deleteOptions,
                          whatsappLogs: !deleteOptions.whatsappLogs,
                        });
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        deleteOptions.whatsappLogs
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      {deleteOptions.whatsappLogs ? (
                        <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            व्हाट्सएप लॉग्स (WhatsApp Dispatches)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                            {counts ? `${counts.whatsappLogsTotal} लॉग्स` : 'लॉग्स'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          बुकिंग, ओटीपी और फ्रेंचाइजी सूचनाओं के स्वचालित व्हाट्सएप संदेश रिकॉर्ड्स।
                        </p>
                      </div>
                    </label>

                    {/* 5. Notifications */}
                    <label
                      onClick={() => {
                        setActivePreset('custom');
                        setDeleteOptions({
                          ...deleteOptions,
                          notifications: !deleteOptions.notifications,
                        });
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        deleteOptions.notifications
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      {deleteOptions.notifications ? (
                        <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            उपयोगकर्ता नोटिफिकेशन (In-App Notifications)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                            {counts ? `${counts.notificationsTotal} अलर्ट्स` : 'अलर्ट्स'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          ग्राहकों और तकनीशियनों के इन-ऐप सूचना बॉक्स।
                        </p>
                      </div>
                    </label>

                    {/* 6. Reviews */}
                    <label
                      onClick={() => {
                        setActivePreset('custom');
                        setDeleteOptions({
                          ...deleteOptions,
                          reviews: !deleteOptions.reviews,
                        });
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        deleteOptions.reviews
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      {deleteOptions.reviews ? (
                        <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            कस्टमर रिव्यू और रेटिंग्स (Reviews &amp; Ratings)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                            {counts ? `${counts.reviewsTotal} समीक्षाएं` : 'रिव्यूज'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          सेवा पूर्ण होने के बाद ग्राहकों द्वारा दिए गए 1-5 स्टार रेटिंग्स व फीडबैक।
                        </p>
                      </div>
                    </label>

                    {/* 7. KYC Documents */}
                    <label
                      onClick={() => {
                        setActivePreset('custom');
                        setDeleteOptions({
                          ...deleteOptions,
                          kycDocuments: !deleteOptions.kycDocuments,
                        });
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        deleteOptions.kycDocuments
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      {deleteOptions.kycDocuments ? (
                        <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            केवाईसी दस्तावेज (Uploaded KYC Proofs)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                            {counts ? `${counts.kycDocsTotal} दस्तावेज` : 'केवाईसी'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          तकनीशियनों द्वारा अपलोड किए गए आधार, पैन और पहचान पत्र रिकॉर्ड्स।
                        </p>
                      </div>
                    </label>

                    {/* 8. Franchise Applications */}
                    <label
                      onClick={() => {
                        setActivePreset('custom');
                        setDeleteOptions({
                          ...deleteOptions,
                          franchiseApplications: !deleteOptions.franchiseApplications,
                        });
                      }}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        deleteOptions.franchiseApplications
                          ? 'border-red-300 bg-red-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      {deleteOptions.franchiseApplications ? (
                        <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            फ्रेंचाइजी व पार्टनर लीड्स (Franchise Applications)
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200 text-stone-800">
                            {counts ? `${counts.franchiseAppsTotal} आवेदन` : 'आवेदन'}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          मध्य प्रदेश विभिन्न शहरों से प्राप्त फ्रेंचाइजी पूछताछ व पार्टनर आवेदन।
                        </p>
                      </div>
                    </label>

                    {/* 9. Bulk Campaigns & 10. Passwords & 11. Audit Logs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <label
                        onClick={() => {
                          setActivePreset('custom');
                          setDeleteOptions({
                            ...deleteOptions,
                            bulkCampaigns: !deleteOptions.bulkCampaigns,
                          });
                        }}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer select-none ${
                          deleteOptions.bulkCampaigns
                            ? 'border-red-300 bg-red-50/40'
                            : 'border-stone-200 bg-stone-50/50'
                        }`}
                      >
                        {deleteOptions.bulkCampaigns ? (
                          <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold text-stone-900 block text-[11px]">
                            बल्क SMS कैम्पेन ({counts?.bulkCampaignsTotal || 0})
                          </span>
                          <span className="text-[10px] text-stone-500">प्रचार अभियान रिकॉर्ड</span>
                        </div>
                      </label>

                      <label
                        onClick={() => {
                          setActivePreset('custom');
                          setDeleteOptions({
                            ...deleteOptions,
                            passwordResetRequests: !deleteOptions.passwordResetRequests,
                          });
                        }}
                        className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer select-none ${
                          deleteOptions.passwordResetRequests
                            ? 'border-red-300 bg-red-50/40'
                            : 'border-stone-200 bg-stone-50/50'
                        }`}
                      >
                        {deleteOptions.passwordResetRequests ? (
                          <CheckSquare className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-bold text-stone-900 block text-[11px]">
                            पासवर्ड रीसेट टिकट्स ({counts?.passwordResetsTotal || 0})
                          </span>
                          <span className="text-[10px] text-stone-500">लंबित/सुलझाए गए अनुरोध</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: UPDATE / RESET OPTIONS (क्या अपडेट / रीसेट करना है) */}
              {activeTab === 'update' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <span>डेटा डिलीट किए बिना फ़ील्ड्स रीसेट व अपडेट करें:</span>
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAllUpdates(true)}
                        className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        सभी चुनें
                      </button>
                      <span className="text-stone-300">|</span>
                      <button
                        type="button"
                        onClick={() => toggleAllUpdates(false)}
                        className="text-[11px] font-bold text-stone-500 hover:underline cursor-pointer"
                      >
                        सभी हटाएं
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs max-h-[38vh] overflow-y-auto pr-1">
                    {/* 1. Reset Wallets */}
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        updateOptions.resetWallets
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <label
                        onClick={() => {
                          setActivePreset('custom');
                          setUpdateOptions({
                            ...updateOptions,
                            resetWallets: !updateOptions.resetWallets,
                          });
                        }}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        {updateOptions.resetWallets ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">
                              वॉलेट बैलेंस रीसेट (Reset Wallet Balances)
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                              {counts ? `${counts.walletsTotal} खाते (${counts.walletsNonZero} सक्रिय)` : 'वॉलेट'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            सभी तकनीशियन व ग्राहक वॉलेट्स को निर्दिष्ट राशि पर सेट करें।
                          </p>
                        </div>
                      </label>

                      {updateOptions.resetWallets && (
                        <div className="mt-3 pt-2.5 border-t border-blue-200/70 space-y-2 pl-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-700 text-[11px]">
                              लक्षित बैलेंस (Target Balance):
                            </span>
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1.5 text-stone-500 font-bold">
                                ₹
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={updateOptions.walletTargetBalance}
                                onChange={(e) =>
                                  setUpdateOptions({
                                    ...updateOptions,
                                    walletTargetBalance: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-full pl-6 pr-2 py-1 rounded-lg border border-blue-300 bg-white font-black text-stone-900 text-xs focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <span className="text-[10px] text-stone-500">
                              (0 = पूरा बैलेंस शून्य)
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-4 text-[11px] text-stone-700">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={updateOptions.resetWalletPendingBalance}
                                onChange={(e) =>
                                  setUpdateOptions({
                                    ...updateOptions,
                                    resetWalletPendingBalance: e.target.checked,
                                  })
                                }
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span>पेंडिंग बैलेंस भी 0 करें</span>
                            </label>

                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={updateOptions.resetWalletLifetimeEarnings}
                                onChange={(e) =>
                                  setUpdateOptions({
                                    ...updateOptions,
                                    resetWalletLifetimeEarnings: e.target.checked,
                                  })
                                }
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                              <span>कुल कमाई व निकासी काउंटर शून्य करें</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Reset Technicians Status & Stats */}
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        updateOptions.resetTechnicians
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <label
                        onClick={() => {
                          setActivePreset('custom');
                          setUpdateOptions({
                            ...updateOptions,
                            resetTechnicians: !updateOptions.resetTechnicians,
                          });
                        }}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        {updateOptions.resetTechnicians ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">
                              तकनीशियन स्थिति व आंकड़े रीसेट (Reset Technician Status &amp; Stats)
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                              {counts ? `${counts.serviceMenTotal} तकनीशियन` : 'प्रोफेशनल्स'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            तकनीशियनों की ड्यूटी, पूरे किए गए काम और रेटिंग्स को ताज़ा स्थिति में लाएं।
                          </p>
                        </div>
                      </label>

                      {updateOptions.resetTechnicians && (
                        <div className="mt-3 pt-2.5 border-t border-blue-200/70 space-y-2 pl-6 text-[11px] text-stone-700">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={updateOptions.techniciansSetOffline}
                              onChange={(e) =>
                                setUpdateOptions({
                                  ...updateOptions,
                                  techniciansSetOffline: e.target.checked,
                                })
                              }
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>सभी तकनीशियनों को तत्काल OFFLINE / Inactive सेट करें</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={updateOptions.techniciansResetJobsCounter}
                              onChange={(e) =>
                                setUpdateOptions({
                                  ...updateOptions,
                                  techniciansResetJobsCounter: e.target.checked,
                                })
                              }
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>पूर्ण किए गए काम काउंटर (Jobs Completed) को 0 करें</span>
                          </label>

                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={updateOptions.techniciansResetRatingToDefault}
                              onChange={(e) =>
                                setUpdateOptions({
                                  ...updateOptions,
                                  techniciansResetRatingToDefault: e.target.checked,
                                })
                              }
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span>रेटिंग को वापस 5.0 ⭐ और रिव्यू काउंट 0 करें</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* 3. Update Bookings Status (without deleting) */}
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        updateOptions.updateBookingsStatus
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <label
                        onClick={() => {
                          setActivePreset('custom');
                          setUpdateOptions({
                            ...updateOptions,
                            updateBookingsStatus: !updateOptions.updateBookingsStatus,
                          });
                        }}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        {updateOptions.updateBookingsStatus ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">
                              बुकिंग्स स्थिति अपडेट करें (Update Status without Deleting)
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            बुकिंग्स डिलीट किए बिना उनकी स्थिति को निरस्त या आर्काइव में बदलें।
                          </p>
                        </div>
                      </label>

                      {updateOptions.updateBookingsStatus && (
                        <div className="mt-3 pt-2.5 border-t border-blue-200/70 space-y-2 pl-6 text-[11px] text-stone-700">
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer font-semibold">
                              <input
                                type="radio"
                                name="bookingStatusAction"
                                checked={updateOptions.bookingsTargetStatus === 'CANCEL_PENDING'}
                                onChange={() =>
                                  setUpdateOptions({
                                    ...updateOptions,
                                    bookingsTargetStatus: 'CANCEL_PENDING',
                                  })
                                }
                                className="text-blue-600"
                              />
                              <span>
                                सभी लंबित व इन-प्रोग्रेस बुकिंग्स को &apos;Cancelled&apos; मार्क करें
                              </span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer font-semibold">
                              <input
                                type="radio"
                                name="bookingStatusAction"
                                checked={updateOptions.bookingsTargetStatus === 'ARCHIVE_COMPLETED'}
                                onChange={() =>
                                  setUpdateOptions({
                                    ...updateOptions,
                                    bookingsTargetStatus: 'ARCHIVE_COMPLETED',
                                  })
                                }
                                className="text-blue-600"
                              />
                              <span>केवल पूर्ण हो चुकी बुकिंग्स को आर्काइव (Archive) करें</span>
                            </label>
                          </div>

                          <div className="pt-1">
                            <input
                              type="text"
                              value={updateOptions.bookingsStatusNote || ''}
                              onChange={(e) =>
                                setUpdateOptions({
                                  ...updateOptions,
                                  bookingsStatusNote: e.target.value,
                                })
                              }
                              placeholder="निरस्तीकरण का कारण / नोट लिखें..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-blue-300 text-xs bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Reset Platform Settings */}
                    <div
                      className={`p-3.5 rounded-2xl border transition-all ${
                        updateOptions.resetPlatformSettings
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-stone-200 bg-stone-50/50'
                      }`}
                    >
                      <label
                        onClick={() => {
                          setActivePreset('custom');
                          setUpdateOptions({
                            ...updateOptions,
                            resetPlatformSettings: !updateOptions.resetPlatformSettings,
                          });
                        }}
                        className="flex items-start gap-2.5 cursor-pointer select-none"
                      >
                        {updateOptions.resetPlatformSettings ? (
                          <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">
                              प्लेटफ़ॉर्म सेटिंग्स डिफ़ॉल्ट करें (Reset Platform Settings)
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            भोपाल मानक कमिशन (10%), न्यूनतम निकासी (₹200) और सुरक्षा शुल्क (₹49) पुनर्स्थापित करें।
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Explicit Admin Permission Check & Confirmation Input */}
              <div className="pt-2 border-t border-stone-200 space-y-3">
                {/* Selection Summary */}
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs flex items-center justify-between">
                  <span className="text-stone-700 font-medium">
                    चयनित कार्रवाई:{' '}
                    <strong className="text-red-600 font-black">
                      {selectedDeletionsCount} संग्रह मिटाए जाएंगे
                    </strong>
                    {' '}व{' '}
                    <strong className="text-blue-600 font-black">
                      {selectedUpdatesCount} फ़ील्ड्स अपडेट होंगी
                    </strong>
                    .
                  </span>
                  <span className="text-[11px] font-bold text-stone-500">
                    कुल {totalActionsCount} ऑपरेशन्स
                  </span>
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={permissionGranted}
                    onChange={(e) => setPermissionGranted(e.target.checked)}
                    disabled={isProcessing}
                    className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-950">
                    मैं पुष्टि करता/करती हूँ कि मैं अधिकृत व्यवस्थापक (Admin) हूँ और उपर्युक्त चयनित
                    डेटा को मिटाने / अपडेट करने की अनुमति देता/देती हूँ।
                  </span>
                </label>

                {/* Security Confirmation Keyword Input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    सुरक्षा पुष्टि के लिए नीचे{' '}
                    <strong className="text-red-600">ZERO</strong>,{' '}
                    <strong className="text-red-600">DELETE</strong>, या{' '}
                    <strong className="text-blue-600">UPDATE</strong> लिखें:
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    disabled={isProcessing}
                    placeholder="Type ZERO, DELETE or UPDATE to confirm"
                    className="w-full px-3.5 py-2 rounded-xl border-2 border-stone-300 focus:border-red-600 focus:outline-hidden text-xs font-bold uppercase tracking-wider text-stone-900"
                  />
                </div>
              </div>

              {/* In-Progress State */}
              {isProcessing && (
                <div className="p-4 rounded-2xl bg-stone-900 text-white space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      {progressText || 'Processing operations...'}
                    </span>
                    <span className="font-black text-red-400">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-600 via-rose-500 to-blue-500 h-2 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-100 text-red-800 text-xs font-semibold">
                  {errorMessage}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  रद्द करें / Cancel
                </button>

                <button
                  type="button"
                  id="confirm-zero-out-btn"
                  onClick={handleExecuteOperations}
                  disabled={!isConfirmed || isProcessing}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    isConfirmed && !isProcessing
                      ? selectedDeletionsCount > 0
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-600/30'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-600/30'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>प्रक्रिया जारी है ({progressPercent}%)...</span>
                    </>
                  ) : (
                    <>
                      {selectedDeletionsCount > 0 ? (
                        <Trash2 className="w-4 h-4" />
                      ) : (
                        <RefreshCcw className="w-4 h-4" />
                      )}
                      <span>
                        {totalActionsCount > 0
                          ? `स्वीकारें व ${totalActionsCount} ऑपरेशन्स निष्पादित करें`
                          : 'कोई विकल्प नहीं चुना'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Percent,
  Download,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Users,
  Building2,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldAlert,
  Wallet,
  Receipt,
  Search,
} from 'lucide-react';
import {
  FinancialConfig,
  FinancialLedgerRecord,
  AdminFinancialSummary,
  getFinancialConfig,
  updateFinancialConfig,
  getAllFinancialLedgers,
  getAdminFinancialProfitOverview,
  exportFinancialReportToCSV,
  processRefundAndReversalAtomic,
  seedDemoFinancialTransactionsIfEmpty,
  zeroAdminFinancialProfitData,
} from '../../services/registrationProfitCommissionService';

interface Props {
  onSelectTab?: (tab: string) => void;
}

export const AdminFinancialProfitDashboard: React.FC<Props> = ({ onSelectTab }) => {
  const [summary, setSummary] = useState<AdminFinancialSummary | null>(null);
  const [ledgers, setLedgers] = useState<FinancialLedgerRecord[]>([]);
  const [config, setConfig] = useState<FinancialConfig | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'monthly' | 'yearly' | 'custom'>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Config editing state
  const [editConfig, setEditConfig] = useState<FinancialConfig | null>(null);
  const [configSaveMsg, setConfigSaveMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [conf, sum, ledgerList] = await Promise.all([
        getFinancialConfig(),
        getAdminFinancialProfitOverview(timeFilter, customStart, customEnd),
        getAllFinancialLedgers(),
      ]);
      setConfig(conf);
      setEditConfig(conf);
      setSummary(sum);
      setLedgers(ledgerList);
    } catch (e: any) {
      console.warn('Error loading financial dashboard:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter, customStart, customEnd]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editConfig) return;
    setConfigSaveMsg(null);
    setErrorMsg(null);

    const res = await updateFinancialConfig(editConfig);
    if (!res.success) {
      setErrorMsg(res.error || 'कॉन्फ़िगरेशन सहेजने में त्रुटि।');
      return;
    }

    setConfig(res.config);
    setConfigSaveMsg('✓ वित्तीय नियम व कमीशन पूल सफलतापूर्वक अपडेट किए गए!');
    setTimeout(() => {
      setConfigSaveMsg(null);
      setIsConfigModalOpen(false);
    }, 2000);
    await loadData();
  };

  const handleRefund = async (txnId: string) => {
    if (!window.confirm(`क्या आप ट्रांजेक्शन ${txnId} का रिफंड और संबंधित पार्टनर कमीशन रिवर्स करना चाहते हैं?`)) {
      return;
    }
    const res = await processRefundAndReversalAtomic(txnId, 'Admin Initiated Refund and Commission Reversal');
    if (res.success) {
      setFeedbackMsg(`✓ ट्रांजेक्शन ${txnId} और कमीशन सफलतापूर्वक रिवर्स हो गया!`);
      setTimeout(() => setFeedbackMsg(null), 3500);
      await loadData();
    } else {
      setErrorMsg(res.error || 'रिफंड प्रक्रिया में त्रुटि।');
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  const handleZeroData = async () => {
    if (!window.confirm('क्या आप सुनिश्चित हैं कि आप सभी वित्तीय लाभ और लेज़र डेटा को शून्य (0) करना चाहते हैं?')) {
      return;
    }
    const res = await zeroAdminFinancialProfitData();
    if (res.success) {
      setFeedbackMsg(`✓ ${res.message}`);
      setTimeout(() => setFeedbackMsg(null), 3500);
      await loadData();
    } else {
      setErrorMsg('डेटा शून्य करने में त्रुटि।');
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  const handleExport = (
    reportType:
      | 'REGISTRATION'
      | 'SERVICEMAN'
      | 'CUSTOMER'
      | 'PARTNER'
      | 'COMMISSION'
      | 'REVENUE'
      | 'TAX'
      | 'GATEWAY_FEE'
      | 'REFUND'
      | 'WITHDRAWAL'
      | 'PROFIT_MARGIN'
      | 'FULL_LEDGER'
  ) => {
    if (!summary) return;
    exportFinancialReportToCSV(reportType, summary, ledgers);
    setFeedbackMsg(`✓ ${reportType.replace(/_/g, ' ')} रिपोर्ट डाउनलोड हो गई!`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const filteredLedgers = ledgers.filter((l) => {
    const matchSearch =
      (l.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.transactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.partnerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchType = filterType === 'ALL' || l.transactionType === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black tracking-wider uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>कंपनी वित्तीय व कमीशन लेजर</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
              ✓ ServiceMan ₹121 = ₹21 कमीशन + ₹100 कंपनी ग्रॉस
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-2 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            <span>कंपनी लाभ, कमीशन व वित्तीय ऑडिट इंजन</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            कस्टमर, सर्विसमैन व पार्टनर रजिस्ट्रेशन रेवेन्यू, सुरक्षित कमीशन पूल, रिफंड रिवर्सल, और वास्तविक लेजर आधारित शुद्ध कंपनी लाभ (Operating Profit)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>रिफ्रेश</span>
          </button>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_financial_ledger')}
              className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-200" />
              <span>विस्तृत लेज़र तालिका (Ledger Table)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>वित्तीय नियम व कमीशन दरें</span>
          </button>

          <button
            type="button"
            onClick={handleZeroData}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Zero out financial profit and ledger records"
          >
            <RefreshCw className="w-4 h-4" />
            <span>डेटा शून्य करें (0)</span>
          </button>

          <div className="relative group">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>12 रिपोर्ट्स डाउनलोड करें ▾</span>
            </button>
            <div className="absolute right-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 hidden group-hover:block z-30 space-y-1">
              <button
                type="button"
                onClick={() => handleExport('REGISTRATION')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 text-stone-800"
              >
                1. Registration Report (पंजीकरण रिपोर्ट)
              </button>
              <button
                type="button"
                onClick={() => handleExport('SERVICEMAN')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 text-stone-800"
              >
                2. ServiceMan ₹121 Report
              </button>
              <button
                type="button"
                onClick={() => handleExport('COMMISSION')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 text-stone-800"
              >
                3. Partner Commission Report
              </button>
              <button
                type="button"
                onClick={() => handleExport('PROFIT_MARGIN')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-100 text-stone-800"
              >
                4. Company Profit & Margin Report
              </button>
              <button
                type="button"
                onClick={() => handleExport('FULL_LEDGER')}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-50 text-emerald-800"
              >
                5. Complete Transaction Ledger (पूर्ण लेजर)
              </button>
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900 font-bold">✕</button>
        </div>
      )}

      {/* Benchmark Demonstration Card: 10 ServiceMen = ₹1,210 Collection, ₹210 Commission, ₹1,000 Company Gross */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-stone-950 via-emerald-950 to-stone-950 border border-emerald-800 text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>निश्चित सर्विसमैन रजिस्ट्रेशन मॉडल (Verified ₹121 Breakdown Engine)</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  ✓ Deterministic Share
                </span>
              </h3>
              <p className="text-[11px] text-stone-300 mt-0.5">
                सर्विसमैन भुगतान: <strong>₹121</strong> = पार्टनर कमीशन: <strong>₹21</strong> + कंपनी ग्रॉस शेयर: <strong>₹100</strong>
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="text-stone-400">कुल पंजीकृत सर्विसमैन: </span>
            <span className="font-black text-emerald-400 text-base">{summary?.servicemanRegistrationsCount || 0}</span>
          </div>
        </div>

        {/* Live Example Calculation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-stone-400 text-[11px]">कस्टमर / सर्विसमैन भुगतान</div>
            <div className="text-lg font-black text-white mt-1">₹121 <span className="text-[10px] text-stone-400 font-normal">/ रजिस्ट्रेशन</span></div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">10 सर्विसमैन = ₹1,210 कलेक्शन</div>
          </div>

          <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-stone-400 text-[11px]">पार्टनर कमीशन पूल (अधिकतम)</div>
            <div className="text-lg font-black text-orange-400 mt-1">₹21 <span className="text-[10px] text-stone-400 font-normal">/ रजिस्ट्रेशन</span></div>
            <div className="text-[10px] text-orange-300 font-bold mt-1">10 सर्विसमैन = ₹210 कमीशन</div>
          </div>

          <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-stone-400 text-[11px]">कंपनी ग्रॉस शेयर (Gross Margin)</div>
            <div className="text-lg font-black text-emerald-400 mt-1">₹100 <span className="text-[10px] text-stone-400 font-normal">/ रजिस्ट्रेशन</span></div>
            <div className="text-[10px] text-emerald-300 font-bold mt-1">10 सर्विसमैन = ₹1,000 कंपनी ग्रॉस</div>
          </div>

          <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800">
            <div className="text-stone-400 text-[11px]">सुरक्षा व नॉन-पिरामिड नियम</div>
            <div className="text-xs font-bold text-stone-200 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>कमीशन कभी ₹21 से अधिक नहीं होगा</span>
            </div>
            <div className="text-[10px] text-stone-400 mt-1">कंपनी बैलेंस कभी नेगेटिव नहीं होगा</div>
          </div>
        </div>
      </div>

      {/* Time Period Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-700">रिपोर्ट अवधि चुनें:</span>
          <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'today' ? 'bg-white shadow-xs text-stone-900 font-black' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              आज (Today)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'monthly' ? 'bg-white shadow-xs text-stone-900 font-black' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              इस महीने (Monthly)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'yearly' ? 'bg-white shadow-xs text-stone-900 font-black' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              इस वर्ष (Yearly)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('custom')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'custom' ? 'bg-white shadow-xs text-stone-900 font-black' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              कस्टम तारीख
            </button>
          </div>
        </div>

        {timeFilter === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 rounded-lg border border-stone-200 font-medium text-xs"
            />
            <span className="text-stone-400">से</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 rounded-lg border border-stone-200 font-medium text-xs"
            />
          </div>
        )}
      </div>

      {/* 7 Key Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-stone-500 text-[11px] font-bold">1. कुल कलेक्शन</div>
          <div className="text-xl font-black text-stone-900">₹{summary?.totalCollection?.toLocaleString('en-IN') || 0}</div>
          <div className="text-[10px] text-stone-400">Gross User Inflow</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-stone-500 text-[11px] font-bold">2. कुल कमीशन</div>
          <div className="text-xl font-black text-orange-600">₹{summary?.totalCommission?.toLocaleString('en-IN') || 0}</div>
          <div className="text-[10px] text-stone-400">Partner Earning Pool</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-stone-500 text-[11px] font-bold">3. कंपनी ग्रॉस शेयर</div>
          <div className="text-xl font-black text-emerald-700">₹{summary?.companyGrossShare?.toLocaleString('en-IN') || 0}</div>
          <div className="text-[10px] text-stone-400">Collection - Commission</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-stone-500 text-[11px] font-bold">4. टैक्स व गेटवे</div>
          <div className="text-xl font-black text-stone-700">₹{((summary?.totalTax || 0) + (summary?.totalGatewayCharges || 0)).toFixed(2)}</div>
          <div className="text-[10px] text-stone-400">GST + Gateway 2%</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-stone-500 text-[11px] font-bold">5. कंपनी नेट राशि</div>
          <div className="text-xl font-black text-blue-700">₹{summary?.companyNetAmount?.toLocaleString('en-IN') || 0}</div>
          <div className="text-[10px] text-stone-400">Net after Deductions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="text-stone-500 text-[11px] font-bold">6. ऑपरेटिंग खर्च</div>
          <div className="text-xl font-black text-stone-600">₹{summary?.operatingExpenses?.toLocaleString('en-IN') || 0}</div>
          <div className="text-[10px] text-stone-400">Rent, Salary, Tech</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-400 shadow-xs space-y-1 bg-gradient-to-b from-emerald-50/50 to-white">
          <div className="text-emerald-900 text-[11px] font-black">7. शुद्ध ऑपरेटिंग लाभ</div>
          <div className={`text-xl font-black ${(summary?.operatingProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            ₹{summary?.operatingProfit?.toLocaleString('en-IN') || 0}
          </div>
          <div className="text-[10px] text-emerald-800 font-bold">Net Operating Profit</div>
        </div>
      </div>

      {/* Main Ledger Table & Fraud Review Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="font-black text-base text-stone-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>वित्तीय लेजर व ट्रांजेक्शन ऑडिट लॉग्स (Immutable Transaction Ledger)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              प्रत्येक वित्तीय लेन-देन, कमीशन वितरण, रिफंड व रिवर्सल का संपूर्ण पारदर्शी रिकॉर्ड
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="नाम, ट्रांजेक्शन या पार्टनर खोजें..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium focus:outline-hidden focus:border-emerald-500 w-48"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold bg-white text-stone-700"
            >
              <option value="ALL">सभी ट्रांजेक्शन्स</option>
              <option value="SERVICEMAN_REGISTRATION">ServiceMan ₹121 रजिस्ट्रेशन</option>
              <option value="CUSTOMER_REGISTRATION">Customer रजिस्ट्रेशन</option>
              <option value="BUSINESS_PARTNER_REGISTRATION">Partner रजिस्ट्रेशन</option>
              <option value="REFUND_PROCESSED">रिफंड व रिवर्सल</option>
            </select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">ट्रांजेक्शन ID व समय</th>
                <th className="py-3 px-3">यूजर / विवरण</th>
                <th className="py-3 px-2 text-center">प्रकार</th>
                <th className="py-3 px-2 text-right">कुल भुगतान</th>
                <th className="py-3 px-2 text-right">कमीशन</th>
                <th className="py-3 px-2 text-right">कंपनी ग्रॉस</th>
                <th className="py-3 px-2 text-center">स्थिति</th>
                <th className="py-3 px-3 text-right">एक्शन</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-400 text-xs">
                    कोई ट्रांजेक्शन रिकॉर्ड नहीं मिला।
                  </td>
                </tr>
              ) : (
                filteredLedgers.map((l, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] font-black text-stone-900">{l.transactionId}</div>
                      <div className="text-[10px] text-stone-400">
                        {new Date(l.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{l.userName || l.userId}</div>
                      <div className="text-[10px] text-stone-500">
                        पार्टनर: <span className="font-semibold text-stone-700">{l.partnerName || l.partnerId || 'Direct HQ'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        l.transactionType === 'SERVICEMAN_REGISTRATION'
                          ? 'bg-blue-100 text-blue-800'
                          : l.transactionType === 'REFUND_PROCESSED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {l.transactionType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-2 text-right font-black text-stone-900">
                      ₹{l.grossAmount}
                    </td>

                    <td className="py-3 px-2 text-right font-bold text-orange-600">
                      ₹{l.commissionDistributed}
                    </td>

                    <td className="py-3 px-2 text-right font-black text-emerald-700">
                      ₹{l.companyGrossAmount}
                    </td>

                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'APPROVED' || l.status === 'AVAILABLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'UNDER_REVIEW' || l.status === 'HOLD'
                          ? 'bg-amber-100 text-amber-800'
                          : l.status === 'REVERSED' || l.status === 'CANCELLED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      {l.status !== 'REVERSED' && l.status !== 'CANCELLED' && l.transactionType !== 'REFUND_PROCESSED' ? (
                        <button
                          type="button"
                          onClick={() => handleRefund(l.transactionId)}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="इस ट्रांजेक्शन का रिफंड व कमीशन रिवर्स करें"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>रिफंड / रिवर्स</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-semibold">रिवर्स हो चुका</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config Modal */}
      {isConfigModalOpen && editConfig && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-orange-600" />
                <span>वित्तीय नियम, रजिस्ट्रेशन फीस व कमीशन दरें</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 font-black text-sm"
              >
                ✕
              </button>
            </div>

            {configSaveMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 text-xs font-bold">
                {configSaveMsg}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {/* ServiceMan Registration Configuration */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                <h4 className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>सर्विसमैन रजिस्ट्रेशन नियम (ServiceMan Registration)</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      सर्विसमैन रजिस्ट्रेशन फीस (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editConfig.servicemanRegistrationFee}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          servicemanRegistrationFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white"
                    />
                    <span className="text-[10px] text-stone-500">Default: ₹121</span>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      पार्टनर कमीशन पूल (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={editConfig.servicemanRegistrationFee}
                      value={editConfig.servicemanCommissionPool}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          servicemanCommissionPool: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white"
                    />
                    <span className="text-[10px] text-stone-500">
                      Default: ₹21 (कंपनी शेयर: ₹{editConfig.servicemanRegistrationFee - editConfig.servicemanCommissionPool})
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Partner Registration */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                <h4 className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>कस्टमर व बिजनेस पार्टनर रजिस्ट्रेशन नियम</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Customer Registration Fee (₹)</label>
                    <input
                      type="number"
                      value={editConfig.customerRegistrationFee}
                      onChange={(e) => setEditConfig({ ...editConfig, customerRegistrationFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Customer Commission Pool (₹)</label>
                    <input
                      type="number"
                      value={editConfig.customerCommissionPool}
                      onChange={(e) => setEditConfig({ ...editConfig, customerCommissionPool: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Business Partner Registration Fee (₹)</label>
                    <input
                      type="number"
                      value={editConfig.businessPartnerRegistrationFee}
                      onChange={(e) => setEditConfig({ ...editConfig, businessPartnerRegistrationFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Partner Commission Pool (₹)</label>
                    <input
                      type="number"
                      value={editConfig.businessPartnerCommissionPool}
                      onChange={(e) => setEditConfig({ ...editConfig, businessPartnerCommissionPool: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-stone-600" />
                  <span>मासिक ऑपरेटिंग खर्च (Operating Expenses Configuration)</span>
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <label className="block font-bold text-stone-600">Office Rent (₹)</label>
                    <input
                      type="number"
                      value={editConfig.operatingExpenses.officeRent}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          operatingExpenses: {
                            ...editConfig.operatingExpenses,
                            officeRent: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600">Salaries (₹)</label>
                    <input
                      type="number"
                      value={editConfig.operatingExpenses.salaries}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          operatingExpenses: {
                            ...editConfig.operatingExpenses,
                            salaries: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600">Technology & Hosting (₹)</label>
                    <input
                      type="number"
                      value={editConfig.operatingExpenses.technologyAndHosting}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          operatingExpenses: {
                            ...editConfig.operatingExpenses,
                            technologyAndHosting: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600">Marketing (₹)</label>
                    <input
                      type="number"
                      value={editConfig.operatingExpenses.marketing}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          operatingExpenses: {
                            ...editConfig.operatingExpenses,
                            marketing: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600">Support (₹)</label>
                    <input
                      type="number"
                      value={editConfig.operatingExpenses.customerSupport}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          operatingExpenses: {
                            ...editConfig.operatingExpenses,
                            customerSupport: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-600">Travel & Ops (₹)</label>
                    <input
                      type="number"
                      value={editConfig.operatingExpenses.travelAndOperations}
                      onChange={(e) =>
                        setEditConfig({
                          ...editConfig,
                          operatingExpenses: {
                            ...editConfig.operatingExpenses,
                            travelAndOperations: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-2 py-1 rounded-lg border border-stone-200 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 font-bold hover:bg-stone-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xs"
                >
                  सहेजें और लागू करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

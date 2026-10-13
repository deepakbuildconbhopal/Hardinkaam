import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  Percent,
  Calculator,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  DollarSign,
  Download,
  Info,
  Calendar,
  Lock,
  Layers,
  ArrowRight,
  ExternalLink,
  Receipt,
  UserCheck,
  Tag,
} from 'lucide-react';
import {
  AdminTaxConfiguration,
  SacTaxRule,
  TaxCalculationInput,
  TaxCalculationResult,
  TaxAuditRecord,
  CaReviewStatus,
  IndianState,
} from '../../types/tax';
import {
  INDIAN_STATES_MASTER,
  DEFAULT_TAX_CONFIG,
  DEFAULT_SAC_RULES,
  getAdminTaxConfiguration,
  saveAdminTaxConfiguration,
  calculateIndianGst,
  submitCaReviewSignOff,
  getRecentTaxLedgerRecords,
} from '../../services/indianTaxEngineService';

interface Props {
  onSelectTab?: (tab: string) => void;
}

type TabType = 'profile' | 'sac_rules' | 'tcs_tds' | 'simulator' | 'audit_ledger' | 'ca_signoff';

export const AdminTaxEngineManager: React.FC<Props> = ({ onSelectTab }) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Configuration state
  const [config, setConfig] = useState<AdminTaxConfiguration>(DEFAULT_TAX_CONFIG);
  const [rules, setRules] = useState<SacTaxRule[]>(DEFAULT_SAC_RULES);

  // Add / Edit Rule Modal State
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<SacTaxRule> | null>(null);

  // CA Sign-off Form State
  const [caName, setCaName] = useState('');
  const [caStatus, setCaStatus] = useState<CaReviewStatus>('APPROVED');
  const [caNotes, setCaNotes] = useState('');

  // Tax Simulator State
  const [simBasePrice, setSimBasePrice] = useState('1000');
  const [simCategory, setSimCategory] = useState('cat_electrician');
  const [simPosStateCode, setSimPosStateCode] = useState('23'); // MP default
  const [simDiscount, setSimDiscount] = useState('100');
  const [simRewardPoints, setSimRewardPoints] = useState('500'); // 500 pts = ₹50
  const [simPricingMode, setSimPricingMode] = useState<'exclusive' | 'inclusive'>('exclusive');

  // Ledger audit logs state
  const [ledgerRecords, setLedgerRecords] = useState<TaxAuditRecord[]>([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await getAdminTaxConfiguration();
      setConfig(data);
      setRules(data.taxRules || DEFAULT_SAC_RULES);
      setCaName(data.caReviewedBy || '');
      setCaStatus(data.caReviewStatus || 'APPROVED');
      setCaNotes(data.caReviewNotes || '');

      // Load recent tax ledger records
      const logs = await getRecentTaxLedgerRecords(30);
      setLedgerRecords(logs);
    } catch (err) {
      console.error('Failed to load tax configuration:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (updatedFields?: Partial<AdminTaxConfiguration>) => {
    setSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    try {
      const payload: Partial<AdminTaxConfiguration> = {
        ...config,
        ...(updatedFields || {}),
        taxRules: rules,
      };
      const result = await saveAdminTaxConfiguration(payload, 'admin_deepak');
      setConfig(result);
      setRules(result.taxRules);
      setSaveSuccessMsg('Tax Configuration successfully saved and synchronized!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Error saving tax configuration.');
      setTimeout(() => setSaveErrorMsg(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCaSignOffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await submitCaReviewSignOff(caStatus, caName, caNotes, 'admin_ca_reviewer');
      setConfig(updated);
      setSaveSuccessMsg('CA Review status and notes successfully recorded!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'Error submitting CA sign-off.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.sacCode || !editingRule.ruleName) return;

    const gstRate = Number(editingRule.gstRatePercent) || 18;
    const cgst = Math.round((gstRate / 2) * 100) / 100;
    const sgst = Math.round((gstRate / 2) * 100) / 100;
    const igst = gstRate;

    const finalizedRule: SacTaxRule = {
      id: editingRule.id || `sac_rule_${Date.now()}`,
      sacCode: editingRule.sacCode.trim(),
      hsnCode: editingRule.hsnCode?.trim(),
      serviceCategoryId: editingRule.serviceCategoryId || 'other',
      serviceCategoryName: editingRule.serviceCategoryName || 'Custom Service',
      ruleName: editingRule.ruleName.trim(),
      description: editingRule.description || '',
      gstRatePercent: gstRate,
      cgstPercent: cgst,
      sgstPercent: sgst,
      igstPercent: igst,
      cessPercent: Number(editingRule.cessPercent) || 0,
      isTaxInclusive: editingRule.isTaxInclusive ?? false,
      effectiveFrom: editingRule.effectiveFrom || '2024-04-01',
      effectiveUntil: editingRule.effectiveUntil || undefined,
      section9_5Applicable: editingRule.section9_5Applicable ?? true,
      rcmApplicable: editingRule.rcmApplicable ?? false,
      version: editingRule.version || config.taxRuleVersion || 'v2026.1',
      isActive: editingRule.isActive ?? true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin_user',
    };

    let updatedRules: SacTaxRule[];
    if (editingRule.id && rules.some((r) => r.id === editingRule.id)) {
      updatedRules = rules.map((r) => (r.id === editingRule.id ? finalizedRule : r));
    } else {
      updatedRules = [...rules, finalizedRule];
    }

    setRules(updatedRules);
    setIsRuleModalOpen(false);
    setEditingRule(null);
    handleSaveConfig({ taxRules: updatedRules });
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to remove this SAC tax rule?')) {
      const updated = rules.filter((r) => r.id !== id);
      setRules(updated);
      handleSaveConfig({ taxRules: updated });
    }
  };

  const handleToggleRuleStatus = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    setRules(updated);
    handleSaveConfig({ taxRules: updated });
  };

  // Live Simulation Calculation
  const simulationResult = useMemo<TaxCalculationResult>(() => {
    const base = parseFloat(simBasePrice) || 0;
    const disc = parseFloat(simDiscount) || 0;
    const pts = parseFloat(simRewardPoints) || 0;
    const rewardRupees = pts / 10; // 10 pts = ₹1

    // create temporary config with selected pricing mode
    const tempConfig: AdminTaxConfiguration = {
      ...config,
      defaultPricingMode: simPricingMode,
      taxRules: rules,
    };

    return calculateIndianGst(
      {
        basePrice: base,
        serviceCategoryId: simCategory,
        customerStateCode: simPosStateCode,
        standardDiscount: disc,
        rewardPointsDiscount: rewardRupees,
      },
      tempConfig
    );
  }, [simBasePrice, simCategory, simPosStateCode, simDiscount, simRewardPoints, simPricingMode, config, rules]);

  // Export Ledger to CSV
  const handleExportLedgerCsv = () => {
    if (ledgerRecords.length === 0) {
      alert('No ledger records to export.');
      return;
    }

    const headers = [
      'Record ID',
      'Booking ID',
      'Invoice No',
      'Date',
      'SAC Code',
      'POS State Code',
      'Supply Type',
      'Taxable Value (₹)',
      'GST %',
      'CGST (₹)',
      'SGST (₹)',
      'IGST (₹)',
      'Cess (₹)',
      'Total Tax (₹)',
      'Gross Invoice Total (₹)',
    ];

    const rows = ledgerRecords.map((r) => [
      r.id,
      r.bookingId || 'N/A',
      r.invoiceNumber || 'N/A',
      r.timestamp,
      r.sacCode,
      r.placeOfSupplyCode,
      r.calculation.taxType,
      r.calculation.taxableAmount,
      r.calculation.gstRatePercent,
      r.calculation.cgstAmount,
      r.calculation.sgstAmount,
      r.calculation.igstAmount,
      r.calculation.cessAmount,
      r.calculation.totalTaxAmount,
      r.calculation.finalTotalAmount,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GSTR_Summary_${config.financialYear}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-sm">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h3 className="text-lg font-bold text-stone-800">कराधान इंजन लोड हो रहा है...</h3>
        <p className="text-xs text-stone-500 mt-1">Loading Indian Tax Engine &amp; SAC Configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-stone-700/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-3 border border-amber-500/30">
              <ShieldCheck className="w-3.5 h-3.5" /> भारतीय कराधान व जीएसटी अनुपालन (Indian Tax Engine)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {config.legalBusinessName || 'DEEPAK BUILDCON & HOME SERVICES'}
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Configurable GSTIN &amp; SAC rates, intra/inter-state place of supply resolution, statutory tax segregation, and CA review controls under CGST Act Section 9(5).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">GSTIN</span>
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider">{config.gstin}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">FY &amp; Version</span>
              <span className="text-xs sm:text-sm font-bold">
                {config.financialYear} ({config.taxRuleVersion})
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">CA Review Status</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                  config.caReviewStatus === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {config.caReviewStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 bg-stone-200/80 rounded-2xl border border-stone-300">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Building2 className="w-4 h-4 text-orange-600" />
          <span>1. Business &amp; GSTIN Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('sac_rules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'sac_rules'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Percent className="w-4 h-4 text-emerald-600" />
          <span>2. SAC Codes &amp; GST Rates ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tcs_tds')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'tcs_tds'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>3. TCS u/s 52 &amp; TDS u/s 194-O</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Calculator className="w-4 h-4 text-amber-600" />
          <span>4. Live Tax Calculator &amp; Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'audit_ledger'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-teal-600" />
          <span>5. Tax Ledger &amp; GSTR Records</span>
        </button>

        <button
          onClick={() => setActiveTab('ca_signoff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'ca_signoff'
              ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-300/50'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-rose-600" />
          <span>6. CA Review &amp; Sign-Off</span>
        </button>
      </div>

      {/* ================= TAB 1: BUSINESS & GSTIN PROFILE ================= */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Legal Business &amp; GSTIN Registration Configuration</h2>
              <p className="text-xs text-stone-500">
                Official entity details printed on customer tax invoices, commission notes, and GSTR reporting.
              </p>
            </div>
            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'सहेज रहे हैं...' : 'Save Business Profile'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Legal Entity Name (Registered)</label>
              <input
                type="text"
                value={config.legalBusinessName}
                onChange={(e) => setConfig({ ...config, legalBusinessName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. DEEPAK BUILDCON & HOME SERVICES PVT LTD"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Trade Name / Brand</label>
              <input
                type="text"
                value={config.tradeName}
                onChange={(e) => setConfig({ ...config, tradeName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. HARDINKAAM"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={config.pan}
                onChange={(e) => setConfig({ ...config, pan: e.target.value.toUpperCase() })}
                maxLength={10}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="AABCD1234E"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">15-Digit GSTIN</label>
              <input
                type="text"
                value={config.gstin}
                onChange={(e) => setConfig({ ...config, gstin: e.target.value.toUpperCase() })}
                maxLength={15}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="23AABCD1234E1Z5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Registered State &amp; State Code</label>
              <select
                value={config.registeredStateCode}
                onChange={(e) => {
                  const selectedCode = e.target.value;
                  const st = INDIAN_STATES_MASTER.find((s) => s.code === selectedCode);
                  setConfig({
                    ...config,
                    registeredStateCode: selectedCode,
                    registeredState: st ? st.name : config.registeredState,
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                {INDIAN_STATES_MASTER.map((s) => (
                  <option key={s.code} value={s.code}>
                    [{s.code}] {s.name} {s.isUnionTerritory ? '(UT)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Financial Year</label>
              <select
                value={config.financialYear}
                onChange={(e) => setConfig({ ...config, financialYear: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="2024-25">FY 2024-25</option>
                <option value="2025-26">FY 2025-26</option>
                <option value="2026-27">FY 2026-27</option>
                <option value="2027-28">FY 2027-28</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Tax Rule Engine Version</label>
              <input
                type="text"
                value={config.taxRuleVersion}
                onChange={(e) => setConfig({ ...config, taxRuleVersion: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="v2026.1"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Default Pricing Display Mode</label>
              <select
                value={config.defaultPricingMode}
                onChange={(e) => setConfig({ ...config, defaultPricingMode: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="exclusive">Tax Exclusive (Base Price + GST added at checkout)</option>
                <option value="inclusive">Tax Inclusive (Displayed price includes GST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Default Fallback SAC Code</label>
              <input
                type="text"
                value={config.defaultSacCode}
                onChange={(e) => setConfig({ ...config, defaultSacCode: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="998714"
              />
            </div>
          </div>

          {/* Business Address */}
          <div className="pt-4 border-t border-stone-100">
            <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-stone-600" />
              Registered Principal Place of Business Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Building / Premises</label>
                <input
                  type="text"
                  value={config.businessAddress.street}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      businessAddress: { ...config.businessAddress, street: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Area / Locality</label>
                <input
                  type="text"
                  value={config.businessAddress.locality}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      businessAddress: { ...config.businessAddress, locality: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">City &amp; District</label>
                <input
                  type="text"
                  value={config.businessAddress.city}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      businessAddress: {
                        ...config.businessAddress,
                        city: e.target.value,
                        district: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">Pincode</label>
                <input
                  type="text"
                  value={config.businessAddress.pincode}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      businessAddress: { ...config.businessAddress, pincode: e.target.value },
                    })
                  }
                  maxLength={6}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Legal flags & Disclaimers */}
          <div className="pt-4 border-t border-stone-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-800">E-Commerce Operator (Sec 9(5) CGST Act)</span>
                <input
                  type="checkbox"
                  checked={config.isEcommerceOperator}
                  onChange={(e) => setConfig({ ...config, isEcommerceOperator: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded"
                />
              </div>
              <p className="text-[11px] text-stone-500">
                HARDINKAAM acts as an Electronic Commerce Operator (ECO) facilitating domestic housekeeping and repair services.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs font-bold text-amber-900">Statutory Notice &amp; Disclaimer</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                {config.statutoryDisclaimer}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SAC CODES & GST RATES MASTER ================= */}
      {activeTab === 'sac_rules' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">SAC / HSN Codes &amp; Dynamic GST Tax Rules</h2>
              <p className="text-xs text-stone-500">
                Configure category-specific SAC codes, GST rates, CGST/SGST/IGST splits, and effective dates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingRule({
                    sacCode: '9987',
                    gstRatePercent: 18,
                    cgstPercent: 9,
                    sgstPercent: 9,
                    igstPercent: 18,
                    cessPercent: 0,
                    isTaxInclusive: false,
                    effectiveFrom: '2024-04-01',
                    section9_5Applicable: true,
                    rcmApplicable: false,
                    isActive: true,
                    version: config.taxRuleVersion || 'v2026.1',
                  });
                  setIsRuleModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New SAC Rule
              </button>

              <button
                onClick={() => handleSaveConfig()}
                disabled={saving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'सहेज रहे हैं...' : 'Save Rules'}
              </button>
            </div>
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">SAC Code</th>
                  <th className="py-3 px-3">Category / Service</th>
                  <th className="py-3 px-3">Rule Name</th>
                  <th className="py-3 px-3 text-center">GST Rate</th>
                  <th className="py-3 px-3 text-center">Intra (CGST+SGST)</th>
                  <th className="py-3 px-3 text-center">Inter (IGST)</th>
                  <th className="py-3 px-3 text-center">Pricing</th>
                  <th className="py-3 px-3 text-center">Sec 9(5)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-orange-600">{r.sacCode}</td>
                    <td className="py-3 px-3 font-semibold text-stone-800">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-mono">
                        {r.serviceCategoryId || 'all'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-stone-900">{r.ruleName}</div>
                      <div className="text-[10px] text-stone-500 line-clamp-1">{r.description}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{r.gstRatePercent}%</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-stone-600">
                      {r.cgstPercent}% + {r.sgstPercent}%
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-stone-600">{r.igstPercent}%</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.isTaxInclusive ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {r.isTaxInclusive ? 'Inclusive' : 'Exclusive'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {r.section9_5Applicable ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Yes
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400">No</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleRuleStatus(r.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          r.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingRule({ ...r });
                            setIsRuleModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: TCS & TDS COMPLIANCE ENGINE ================= */}
      {activeTab === 'tcs_tds' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">TCS u/s 52 &amp; TDS / Withholding Configuration</h2>
              <p className="text-xs text-stone-500">
                Future-proof configuration for Tax Collected at Source (TCS) and Tax Deducted at Source (TDS) on e-commerce payouts.
              </p>
            </div>
            <button
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'सहेज रहे हैं...' : 'Save Withholding Config'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TCS Section */}
            <div className="p-6 rounded-3xl bg-indigo-50/40 border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    TCS under Section 52 (CGST Act)
                  </h3>
                  <span className="text-[11px] text-indigo-700">Tax Collected at Source by E-Commerce Operator</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.tcsTdsConfig.tcsEnabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tcsTdsConfig: { ...config.tcsTdsConfig, tcsEnabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-indigo-600 rounded"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">TCS Rate (% on Net Taxable Supplies)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={config.tcsTdsConfig.tcsRatePercent}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        tcsTdsConfig: { ...config.tcsTdsConfig, tcsRatePercent: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold bg-white"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Standard: 1.0% (0.5% CGST + 0.5% SGST for intra-state, or 1.0% IGST for inter-state)
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Effective From Date</label>
                  <input
                    type="date"
                    value={config.tcsTdsConfig.tcsEffectiveFrom}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        tcsTdsConfig: { ...config.tcsTdsConfig, tcsEffectiveFrom: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Statutory Section Description</label>
                  <input
                    type="text"
                    value={config.tcsTdsConfig.tcsSection}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        tcsTdsConfig: { ...config.tcsTdsConfig, tcsSection: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* TDS Section */}
            <div className="p-6 rounded-3xl bg-amber-50/40 border border-amber-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-600" />
                    TDS under Section 194-O (Income Tax)
                  </h3>
                  <span className="text-[11px] text-amber-700">Withholding on E-Commerce Participant Payouts</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.tcsTdsConfig.tdsEnabled}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      tcsTdsConfig: { ...config.tcsTdsConfig, tdsEnabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5 text-amber-600 rounded"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">With PAN Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.tcsTdsConfig.tdsRateWithPanPercent}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tcsTdsConfig: {
                            ...config.tcsTdsConfig,
                            tdsRateWithPanPercent: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">Without PAN Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={config.tcsTdsConfig.tdsRateWithoutPanPercent}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          tcsTdsConfig: {
                            ...config.tcsTdsConfig,
                            tdsRateWithoutPanPercent: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Annual Threshold Limit (₹)</label>
                  <input
                    type="number"
                    value={config.tcsTdsConfig.tdsThresholdAnnual}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        tcsTdsConfig: {
                          ...config.tcsTdsConfig,
                          tdsThresholdAnnual: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-bold bg-white"
                  />
                  <span className="text-[10px] text-stone-500 mt-1 block">Exemption threshold: ₹5,00,000 for individual service pros.</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200">
                  <span className="text-xs font-bold text-stone-800">Auto-deduct TDS from ServiceMan payout</span>
                  <input
                    type="checkbox"
                    checked={config.tcsTdsConfig.tdsDeductAtSource}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        tcsTdsConfig: {
                          ...config.tcsTdsConfig,
                          tdsDeductAtSource: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: INTERACTIVE TAX SIMULATOR & CALCULATOR ================= */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-600" />
              Live GST / SAC Tax Calculation Simulator
            </h2>
            <p className="text-xs text-stone-500">
              Test dynamic SAC resolution, intra-state vs inter-state logic, discounts, and reward redemption deductions.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Base Service Amount (₹)</label>
                <input
                  type="number"
                  value={simBasePrice}
                  onChange={(e) => setSimBasePrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Service Category / SAC Code</label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                >
                  <option value="cat_electrician">Electrician &amp; Wiring (SAC 998714 - 18%)</option>
                  <option value="cat_plumber">Plumber &amp; Sanitary (SAC 998721 - 18%)</option>
                  <option value="cat_ac_appliance">AC &amp; Appliance Repair (SAC 998715 - 18%)</option>
                  <option value="cat_cleaning">Home Cleaning &amp; Sanitization (SAC 998719 - 18%)</option>
                  <option value="cat_painting">Painting &amp; Waterproofing (SAC 998722 - 18%)</option>
                  <option value="cat_carpentry">Carpentry &amp; Woodwork (SAC 998729 - 18%)</option>
                  <option value="cat_ro_water">RO Water Purifier (SAC 996331 - 18%)</option>
                  <option value="cat_pest_control">Pest Control (SAC 998533 - 18%)</option>
                  <option value="platform_charge">Platform Convenience Fee (SAC 998313 - 18%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Place of Supply (Customer State)</label>
                <select
                  value={simPosStateCode}
                  onChange={(e) => setSimPosStateCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold bg-white"
                >
                  {INDIAN_STATES_MASTER.map((s) => (
                    <option key={s.code} value={s.code}>
                      [{s.code}] {s.name} {s.code === '23' ? '(Intra-State MP)' : '(Inter-State IGST)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Promo Discount (₹)</label>
                  <input
                    type="number"
                    value={simDiscount}
                    onChange={(e) => setSimDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Reward Points Used</label>
                  <input
                    type="number"
                    value={simRewardPoints}
                    onChange={(e) => setSimRewardPoints(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                  />
                  <span className="text-[10px] text-amber-700 mt-0.5 block">
                    = ₹{(parseFloat(simRewardPoints) || 0) / 10} discount
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Pricing Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimPricingMode('exclusive')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      simPricingMode === 'exclusive'
                        ? 'bg-orange-50 border-orange-400 text-orange-800'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    Tax Exclusive (Base + GST)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimPricingMode('inclusive')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors ${
                      simPricingMode === 'inclusive'
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    Tax Inclusive (Embedded GST)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Invoice & Tax Breakdown Preview */}
          <div className="lg:col-span-7 bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400 block">
                    TAX CALCULATION BREAKDOWN
                  </span>
                  <h3 className="text-lg font-black text-white">{simulationResult.ruleName}</h3>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    simulationResult.isInterState ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {simulationResult.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST + SGST)'}
                </span>
              </div>

              {/* Supply Details */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4 text-xs border-b border-stone-800/80">
                <div>
                  <span className="text-stone-400 block text-[10px]">SAC Code:</span>
                  <span className="font-mono font-bold text-amber-400">{simulationResult.sacCode}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Supplier State:</span>
                  <span className="font-semibold text-stone-200">
                    {simulationResult.supplierState} ({simulationResult.supplierStateCode})
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Place of Supply:</span>
                  <span className="font-semibold text-stone-200">
                    {simulationResult.placeOfSupplyState} ({simulationResult.placeOfSupplyStateCode})
                  </span>
                </div>
              </div>

              {/* Line Items Breakdown */}
              <div className="space-y-2.5 py-4 text-xs">
                <div className="flex justify-between text-stone-300">
                  <span>Gross Base Service Value:</span>
                  <span className="font-mono font-bold">₹{simulationResult.baseGrossAmount.toFixed(2)}</span>
                </div>

                {simulationResult.totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>
                      Total Discounts (Promo ₹{simulationResult.standardDiscount} + Reward ₹
                      {simulationResult.rewardPointsDiscount}):
                    </span>
                    <span className="font-mono font-bold">- ₹{simulationResult.totalDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-amber-300 font-bold border-t border-dashed border-stone-800 pt-2">
                  <span>Net Taxable Value (Tax Base):</span>
                  <span className="font-mono">₹{simulationResult.taxableAmount.toFixed(2)}</span>
                </div>

                {simulationResult.isInterState ? (
                  <div className="flex justify-between text-stone-300 pl-3 border-l-2 border-amber-500">
                    <span>IGST ({simulationResult.igstPercent}%):</span>
                    <span className="font-mono font-bold text-emerald-400">
                      + ₹{simulationResult.igstAmount.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-stone-300 pl-3 border-l-2 border-emerald-500">
                      <span>CGST ({simulationResult.cgstPercent}%):</span>
                      <span className="font-mono font-bold text-emerald-400">
                        + ₹{simulationResult.cgstAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-300 pl-3 border-l-2 border-emerald-500">
                      <span>SGST / UTGST ({simulationResult.sgstPercent}%):</span>
                      <span className="font-mono font-bold text-emerald-400">
                        + ₹{simulationResult.sgstAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {simulationResult.cessAmount > 0 && (
                  <div className="flex justify-between text-stone-300 pl-3 border-l-2 border-stone-500">
                    <span>Cess ({simulationResult.cessPercent}%):</span>
                    <span className="font-mono font-bold">+ ₹{simulationResult.cessAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-white border-t border-stone-700 pt-3">
                  <span>Customer Total Invoice Amount:</span>
                  <span className="font-mono text-xl text-amber-400">
                    ₹{simulationResult.finalTotalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Statutory Segregation Callout */}
              <div className="p-3.5 rounded-2xl bg-stone-800/80 border border-stone-700 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  Statutory Tax Segregation (Not Company Profit):
                </div>
                <div className="flex justify-between text-[11px] text-stone-300">
                  <span>Government Tax Liability (GST Collected):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{simulationResult.statutoryTaxLiability.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-300">
                  <span>Operating Platform &amp; Serviceman Base:</span>
                  <span className="font-mono font-bold text-stone-100">
                    ₹{simulationResult.netOperationalRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-stone-400 font-mono border-t border-stone-800 pt-3">
              Calculated by HARDINKAAM Indian Tax Engine {simulationResult.taxEngineVersion} | CA Verified:{' '}
              {simulationResult.caReviewed ? 'YES' : 'NO'}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: TAX LEDGER & GSTR RECORDS ================= */}
      {activeTab === 'audit_ledger' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Statutory Tax Ledger &amp; GSTR Records</h2>
              <p className="text-xs text-stone-500">
                Itemized tax breakdown records stored with each transaction for GSTR-1, GSTR-3B, and GSTR-8 e-commerce reporting.
              </p>
            </div>
            <button
              onClick={handleExportLedgerCsv}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              Export GSTR CSV
            </button>
          </div>

          {ledgerRecords.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <FileSpreadsheet className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-700">No Tax Transactions Recorded Yet</h4>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                As bookings and invoices are completed, their complete SAC code, CGST, SGST, and IGST breakdowns will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-3">Date &amp; Invoice</th>
                    <th className="py-3 px-3">Booking ID</th>
                    <th className="py-3 px-3">SAC</th>
                    <th className="py-3 px-3">POS State</th>
                    <th className="py-3 px-3 text-right">Taxable Base</th>
                    <th className="py-3 px-3 text-right">CGST</th>
                    <th className="py-3 px-3 text-right">SGST</th>
                    <th className="py-3 px-3 text-right">IGST</th>
                    <th className="py-3 px-3 text-right">Total Tax</th>
                    <th className="py-3 px-3 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {ledgerRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-stone-50 transition-colors font-mono">
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{rec.invoiceNumber}</div>
                        <div className="text-[10px] text-stone-400 font-sans">
                          {new Date(rec.timestamp).toLocaleDateString('en-IN')}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-700">{rec.bookingId || 'N/A'}</td>
                      <td className="py-3 px-3 font-bold text-orange-600">{rec.sacCode}</td>
                      <td className="py-3 px-3 font-sans font-semibold">
                        State {rec.placeOfSupplyCode} ({rec.calculation.placeOfSupplyState})
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900">
                        ₹{rec.calculation.taxableAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">
                        ₹{rec.calculation.cgstAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-700">
                        ₹{rec.calculation.sgstAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-700">
                        ₹{rec.calculation.igstAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-800">
                        ₹{rec.calculation.totalTaxAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900">
                        ₹{rec.calculation.finalTotalAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 6: CA REVIEW & SIGN-OFF ================= */}
      {activeTab === 'ca_signoff' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Chartered Accountant (CA) Review &amp; Statutory Approval
            </h2>
            <p className="text-xs text-stone-500">
              Record CA review notes, verify SAC code classifications under Section 9(5), and sign-off on tax engine parameters.
            </p>
          </div>

          <form onSubmit={handleCaSignOffSubmit} className="space-y-5 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  CA Name &amp; Registration Number
                </label>
                <input
                  type="text"
                  required
                  value={caName}
                  onChange={(e) => setCaName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. CA Rajesh Verma (FCA, Reg #074829)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Review / Approval Status</label>
                <select
                  value={caStatus}
                  onChange={(e) => setCaStatus(e.target.value as CaReviewStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold bg-white focus:ring-2 focus:ring-orange-500"
                >
                  <option value="APPROVED">APPROVED (स्वीकृत - All SAC Rules Compliant)</option>
                  <option value="PENDING_REVIEW">PENDING REVIEW (समीक्षाधीन)</option>
                  <option value="REJECTED">REJECTED (परिवर्तन आवश्यक - Requires Correction)</option>
                  <option value="DRAFT">DRAFT (प्रारूप)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                CA Review Observations &amp; Statutory Compliance Notes
              </label>
              <textarea
                rows={5}
                required
                value={caNotes}
                onChange={(e) => setCaNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono focus:ring-2 focus:ring-orange-500"
                placeholder="Enter formal observations regarding SAC codes, Section 9(5) applicability, and statutory return reconciliation."
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold mb-0.5">Statutory Declaration:</div>
                I confirm that I have reviewed the tax engine settings, SAC codes, and applicable GST rates for HARDINKAAM. The rates and place of supply logic comply with the CGST Act 2017.
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'दर्ज कर रहे हैं...' : 'Submit Official CA Sign-Off'}
            </button>
          </form>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT SAC RULE ================= */}
      {isRuleModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  {editingRule.id ? 'Edit SAC Tax Rule' : 'Create New SAC Tax Rule'}
                </h3>
                <span className="text-xs text-stone-500">Configure SAC Code, Category Mapping &amp; Rates</span>
              </div>
              <button
                onClick={() => {
                  setIsRuleModalOpen(false);
                  setEditingRule(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">SAC Code (6-digit)</label>
                  <input
                    type="text"
                    required
                    value={editingRule.sacCode || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, sacCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono font-bold text-xs"
                    placeholder="e.g. 998714"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Service Category ID</label>
                  <input
                    type="text"
                    required
                    value={editingRule.serviceCategoryId || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, serviceCategoryId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-xs"
                    placeholder="e.g. cat_electrician"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Rule Display Name</label>
                <input
                  type="text"
                  required
                  value={editingRule.ruleName || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, ruleName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                  placeholder="e.g. Electrical Maintenance & Repair (SAC 998714)"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Total GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editingRule.gstRatePercent ?? 18}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        gstRatePercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Cess (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingRule.cessPercent ?? 0}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        cessPercent: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">Effective From</label>
                  <input
                    type="date"
                    required
                    value={editingRule.effectiveFrom || '2024-04-01'}
                    onChange={(e) => setEditingRule({ ...editingRule, effectiveFrom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingRule.description || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs"
                  placeholder="Description of the service under GST classification..."
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.section9_5Applicable ?? true}
                    onChange={(e) => setEditingRule({ ...editingRule, section9_5Applicable: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  Section 9(5) E-Commerce Operator Applicable
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.isTaxInclusive ?? false}
                    onChange={(e) => setEditingRule({ ...editingRule, isTaxInclusive: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  Tax Inclusive Pricing
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingRule.isActive ?? true}
                    onChange={(e) => setEditingRule({ ...editingRule, isActive: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  Active Rule
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsRuleModalOpen(false);
                    setEditingRule(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold"
                >
                  Save SAC Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

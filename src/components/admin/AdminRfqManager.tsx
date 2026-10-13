import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  Save,
  CheckCircle2,
  FileText,
  Building2,
  ShieldCheck,
  Percent,
  Calculator,
} from 'lucide-react';
import { RfqFeeSettings } from '../../types/rfq';
import { getRfqFeeSettings, saveRfqFeeSettings } from '../../services/rfqService';

export const AdminRfqManager: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [settings, setSettings] = useState<RfqFeeSettings>({
    leadFee: 99,
    platformFee: 199,
    projectCommissionPercent: 10,
    transactionFeePercent: 2.0,
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await getRfqFeeSettings();
      setSettings(s);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const updated = await saveRfqFeeSettings(settings);
      setSettings(updated);
      setSuccessMsg('RFQ fee settings successfully updated!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-stone-500">Loading RFQ &amp; Fee configuration...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs font-semibold mb-3">
            <Users className="w-3.5 h-3.5" /> मल्टी-कोट व लीड फीस नियंत्रण (Admin RFQ Fee Controls)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Large Project RFQ &amp; Fee Management</h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
            Configure lead fees for professionals, platform facilitation fees, project commissions, and payment gateway transaction fees.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs max-w-3xl">
        <form onSubmit={handleSave} className="space-y-5">
          <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-orange-600" />
            Configurable Fee Structure for Large Projects
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Lead Fee for Professionals (₹)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.leadFee}
                  onChange={(e) => setSettings({ ...settings, leadFee: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-bold text-sm bg-white"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">Fee paid by professional to unlock RFQ lead contact.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Platform Facilitation Fee (₹)</label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="0"
                  required
                  value={settings.platformFee}
                  onChange={(e) => setSettings({ ...settings, platformFee: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-bold text-sm bg-white"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">Standard convenience &amp; verification fee per project.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Project Commission (%)</label>
              <div className="relative">
                <Percent className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="30"
                  required
                  value={settings.projectCommissionPercent}
                  onChange={(e) => setSettings({ ...settings, projectCommissionPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-bold text-sm bg-white"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">Commission charged on total project quotation value.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Transaction Fee (%)</label>
              <div className="relative">
                <Percent className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  required
                  value={settings.transactionFeePercent}
                  onChange={(e) => setSettings({ ...settings, transactionFeePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-bold text-sm bg-white"
                />
              </div>
              <span className="text-[10px] text-stone-500 mt-1 block">Payment gateway &amp; escrow processing fee.</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save RFQ Fee Settings'}
          </button>
        </form>
      </div>
    </div>
  );
};

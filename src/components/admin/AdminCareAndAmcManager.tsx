import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Calculator,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
  Building2,
  Wrench,
} from 'lucide-react';
import { HardinkaamCarePolicy, HardinkaamMembershipPlan, AmcPlan } from '../../types/care';
import {
  getCarePolicies,
  saveCarePolicy,
  getMembershipPlans,
  saveMembershipPlan,
  getAmcPlans,
  saveAmcPlan,
  calculateAmcExpectedCost,
} from '../../services/hardinkaamCareService';

export const AdminCareAndAmcManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'care' | 'memberships' | 'amc'>('care');
  const [loading, setLoading] = useState<boolean>(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [carePolicies, setCarePolicies] = useState<HardinkaamCarePolicy[]>([]);
  const [memberships, setMemberships] = useState<HardinkaamMembershipPlan[]>([]);
  const [amcPlans, setAmcPlans] = useState<AmcPlan[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const p = await getCarePolicies();
      const m = await getMembershipPlans();
      const a = await getAmcPlans();
      setCarePolicies(p);
      setMemberships(m);
      setAmcPlans(a);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (policy: HardinkaamCarePolicy) => {
    await saveCarePolicy(policy);
    setSuccessMsg(`Care policy for ${policy.categoryName} successfully saved!`);
    loadData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveMembership = async (plan: HardinkaamMembershipPlan) => {
    await saveMembershipPlan(plan);
    setSuccessMsg(`Membership plan ${plan.name} successfully saved!`);
    loadData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveAmc = async (plan: AmcPlan) => {
    await saveAmcPlan(plan);
    setSuccessMsg(`AMC plan ${plan.name} successfully saved!`);
    loadData();
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  if (loading) {
    return <div className="p-12 text-center text-stone-500">Loading CARE &amp; AMC management...</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> ग्राहक संरक्षण, मेंबरशिप व AMC नियंत्रण (HARDINKAAM CARE &amp; AMC Admin)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Retention &amp; Protection Products</h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
            Configure HARDINKAAM CARE warranties, monthly/yearly memberships, and Annual Maintenance Contracts (AMC) with cost verification.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-stone-200/80 rounded-2xl border border-stone-300">
        <button
          onClick={() => setActiveTab('care')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'care' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          HARDINKAAM CARE Policies
        </button>
        <button
          onClick={() => setActiveTab('memberships')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'memberships' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          Care Memberships
        </button>
        <button
          onClick={() => setActiveTab('amc')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'amc' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          AMC Plans &amp; Cost Verification
        </button>
      </div>

      {/* TAB 1: CARE POLICIES */}
      {activeTab === 'care' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Configure Care Warranty &amp; Revisit Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {carePolicies.map((p, idx) => (
              <div key={p.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="font-bold text-stone-900 text-sm border-b border-stone-100 pb-2 flex justify-between">
                  <span>{p.categoryName}</span>
                  <input
                    type="checkbox"
                    checked={p.isEnabled}
                    onChange={(e) => {
                      const updated = [...carePolicies];
                      updated[idx].isEnabled = e.target.checked;
                      setCarePolicies(updated);
                    }}
                    className="accent-teal-600 w-4 h-4"
                  />
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Warranty Duration (Months)</label>
                    <input
                      type="number"
                      value={p.warrantyDurationMonths}
                      onChange={(e) => {
                        const updated = [...carePolicies];
                        updated[idx].warrantyDurationMonths = parseInt(e.target.value) || 0;
                        setCarePolicies(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Maximum Liability (₹)</label>
                    <input
                      type="number"
                      value={p.maxLiabilityRupees}
                      onChange={(e) => {
                        const updated = [...carePolicies];
                        updated[idx].maxLiabilityRupees = parseFloat(e.target.value) || 0;
                        setCarePolicies(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Revisit Limit</label>
                    <input
                      type="number"
                      value={p.revisitLimit}
                      onChange={(e) => {
                        const updated = [...carePolicies];
                        updated[idx].revisitLimit = parseInt(e.target.value) || 0;
                        setCarePolicies(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>

                  <button
                    onClick={() => handleSavePolicy(p)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Policy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERSHIPS */}
      {activeTab === 'memberships' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Configure Care Memberships (Monthly / Yearly)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {memberships.map((m, idx) => (
              <div key={m.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="font-bold text-stone-900 text-base border-b border-stone-100 pb-2 flex justify-between">
                  <span>{m.name}</span>
                  <span className="text-xs uppercase font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    {m.billingCycle}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Price (₹)</label>
                    <input
                      type="number"
                      value={m.priceRupees}
                      onChange={(e) => {
                        const updated = [...memberships];
                        updated[idx].priceRupees = parseFloat(e.target.value) || 0;
                        setMemberships(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">Free Visits Allowed</label>
                    <input
                      type="number"
                      value={m.freeVisitsAllowed}
                      onChange={(e) => {
                        const updated = [...memberships];
                        updated[idx].freeVisitsAllowed = parseInt(e.target.value) || 0;
                        setMemberships(updated);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>

                  <button
                    onClick={() => handleSaveMembership(m)}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Membership Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: AMC & COST CALCULATION */}
      {activeTab === 'amc' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-stone-800 uppercase tracking-wider">Annual Maintenance Contracts (AMC) &amp; Cost Verification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {amcPlans.map((a, idx) => {
              const calc = calculateAmcExpectedCost(a);
              return (
                <div key={a.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                  <div className="font-bold text-stone-900 text-base border-b border-stone-100 pb-2">
                    {a.name}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">Base Price (₹)</label>
                      <input
                        type="number"
                        value={a.basePriceRupees}
                        onChange={(e) => {
                          const updated = [...amcPlans];
                          updated[idx].basePriceRupees = parseFloat(e.target.value) || 0;
                          setAmcPlans(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1 font-mono text-[11px]">
                      <div>Estimated Servicing Cost: ₹{calc.totalEstimatedServicingCost}</div>
                      <div>Net Expected Cost: ₹{calc.netExpectedCost}</div>
                      <div className="text-amber-700 font-bold">Projected Margin: ₹{calc.projectedAdminMargin}</div>
                    </div>

                    <button
                      onClick={() => handleSaveAmc(a)}
                      className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-4 h-4" /> Save AMC Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

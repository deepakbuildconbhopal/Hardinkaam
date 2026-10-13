import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Calendar,
  Sparkles,
  ArrowRight,
  X,
  Award,
  DollarSign,
  Check,
} from 'lucide-react';
import { HardinkaamMembershipPlan, AmcPlan, AmcCalculationResult } from '../../types/care';
import {
  getMembershipPlans,
  getAmcPlans,
  calculateAmcExpectedCost,
} from '../../services/hardinkaamCareService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AmcCatalogModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'memberships' | 'amc'>('amc');
  const [memberships, setMemberships] = useState<HardinkaamMembershipPlan[]>([]);
  const [amcPlans, setAmcPlans] = useState<AmcPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Calculation Modal State for selected AMC
  const [selectedAmcForCalc, setSelectedAmcForCalc] = useState<AmcPlan | null>(null);
  const [calcResult, setCalcResult] = useState<AmcCalculationResult | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const m = await getMembershipPlans();
      const a = await getAmcPlans();
      setMemberships(m);
      setAmcPlans(a);
      if (a.length > 0) {
        setSelectedAmcForCalc(a[0]);
        setCalcResult(calculateAmcExpectedCost(a[0]));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAmc = (plan: AmcPlan) => {
    setSelectedAmcForCalc(plan);
    setCalcResult(calculateAmcExpectedCost(plan));
  };

  const handleActivatePlan = (name: string) => {
    setSuccessMsg(`Successfully subscribed to ${name}! HARDINKAAM Protection & AMC active.`);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2">
              <Award className="w-3.5 h-3.5" /> वार्षिक रखरखाव अनुबंध (AMC) व मेंबरशिप प्लान्स
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              HARDINKAAM AMC &amp; Care Memberships
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 gap-6">
          <button
            onClick={() => setActiveTab('amc')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'amc' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-600'
            }`}
          >
            Annual Maintenance Contracts (AMC)
          </button>
          <button
            onClick={() => setActiveTab('memberships')}
            className={`pb-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'memberships' ? 'border-amber-600 text-amber-600' : 'border-transparent text-stone-600'
            }`}
          >
            Care Memberships (Monthly / Yearly)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'amc' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* AMC Plans List */}
              <div className="lg:col-span-6 space-y-3">
                <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Select AMC Plan</h3>
                {amcPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectAmc(plan)}
                    className={`p-4 rounded-3xl border cursor-pointer transition-all ${
                      selectedAmcForCalc?.id === plan.id
                        ? 'border-amber-600 bg-amber-50/70 shadow-sm ring-2 ring-amber-500/20'
                        : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono font-bold text-amber-700 uppercase">
                        {plan.categoryType} AMC
                      </span>
                      <span className="font-mono font-black text-stone-900 text-base">₹{plan.basePriceRupees}</span>
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm">{plan.name}</h4>
                    <div className="text-[11px] text-stone-500 mt-1">
                      {plan.scheduledVisitsCount} Scheduled Visits Included
                    </div>
                  </div>
                ))}
              </div>

              {/* AMC Expected Cost Verification Panel */}
              <div className="lg:col-span-6 bg-stone-50 p-6 rounded-3xl border border-stone-200 space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <h3 className="text-xs font-bold text-stone-900 uppercase">Expected Cost &amp; Viability Engine</h3>
                </div>

                {calcResult && (
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-600">Plan Name:</span>
                      <strong className="text-stone-900">{calcResult.planName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Scheduled Visits:</span>
                      <strong className="text-stone-900">{calcResult.scheduledVisitsCount} Visits</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Estimated Servicing Cost:</span>
                      <strong className="text-stone-900 font-mono">₹{calcResult.totalEstimatedServicingCost}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Net Expected Cost (Labor + Ops):</span>
                      <strong className="text-stone-900 font-mono">₹{calcResult.netExpectedCost}</strong>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-stone-200 font-bold">
                      <span>Base Retail Price:</span>
                      <span className="font-mono text-amber-700 text-sm">₹{calcResult.basePrice}</span>
                    </div>

                    <div
                      className={`p-3 rounded-xl border text-[11px] leading-snug ${
                        calcResult.isApprovedForActivation
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      {calcResult.calculationNotes}
                    </div>

                    <button
                      type="button"
                      disabled={!calcResult.isApprovedForActivation}
                      onClick={() => handleActivatePlan(calcResult.planName)}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Activate AMC Contract
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {memberships.map((m) => (
                <div key={m.id} className="p-6 rounded-3xl border border-stone-200 bg-white shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 uppercase">
                        {m.billingCycle} membership
                      </span>
                      <span className="font-mono font-black text-2xl text-stone-900">
                        ₹{m.priceRupees}
                      </span>
                    </div>

                    <h3 className="font-black text-stone-900 text-base">{m.name}</h3>

                    <ul className="space-y-2 text-xs text-stone-700">
                      {m.benefits.map((b, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => handleActivatePlan(m.name)}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Subscribe to {m.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Percent,
  DollarSign,
  Phone,
  Mail,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Save,
  Building2,
  RefreshCw,
  Bell,
  Volume2,
} from 'lucide-react';
import { DistrictSettings } from '../../types';
import { getDistrictConfig, updateDistrictConfig } from '../../services/franchisePartnerService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  districtId: string;
  districtName: string;
  stateName?: string;
  onSaved?: () => void;
}

export const DistrictSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  districtId,
  districtName,
  stateName = 'Madhya Pradesh',
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [profitPercentage, setProfitPercentage] = useState<number>(20);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(15);
  const [franchiseCommissionPercent, setFranchiseCommissionPercent] = useState<number>(15);
  const [businessPartnerCommissionPercent, setBusinessPartnerCommissionPercent] = useState<number>(15);
  const [serviceProfessionalSharePercent, setServiceProfessionalSharePercent] = useState<number>(85);
  const [bookingFee, setBookingFee] = useState<number>(0);
  const [cancellationFee, setCancellationFee] = useState<number>(50);
  const [minOrderValue, setMinOrderValue] = useState<number>(199);
  const [supportPhone, setSupportPhone] = useState<string>('');
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [operatingHours, setOperatingHours] = useState<string>('08:00 AM - 08:00 PM');
  const [customNotice, setCustomNotice] = useState<string>('');

  // District-specific booking alert controls
  const [districtAlarmEnabled, setDistrictAlarmEnabled] = useState<boolean>(true);
  const [districtOfferExpirySeconds, setDistrictOfferExpirySeconds] = useState<number>(60);
  const [districtMaxAlertAttempts, setDistrictMaxAlertAttempts] = useState<number>(3);
  const [districtAlertCustomNotice, setDistrictAlertCustomNotice] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !districtId) return;

    let mounted = true;
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    getDistrictConfig(districtId)
      .then((cfg) => {
        if (!mounted) return;
        setProfitPercentage(cfg.profitPercentage ?? (districtId.toLowerCase() === 'gwalior' ? 15 : 20));
        setPlatformFeePercent(cfg.platformFeePercent ?? 15);
        setFranchiseCommissionPercent(cfg.franchiseCommissionPercent ?? 10);
        setBusinessPartnerCommissionPercent(cfg.businessPartnerCommissionPercent ?? 15);
        setServiceProfessionalSharePercent(cfg.serviceProfessionalSharePercent ?? 85);
        setBookingFee(cfg.bookingFee ?? 0);
        setCancellationFee(cfg.cancellationFee ?? 50);
        setMinOrderValue(cfg.minOrderValue ?? 199);
        setSupportPhone(cfg.supportPhone ?? '');
        setSupportEmail(cfg.supportEmail ?? '');
        setOperatingHours(cfg.operatingHours ?? '08:00 AM - 08:00 PM');
        setCustomNotice(cfg.customNotice ?? '');

        // District alert controls
        setDistrictAlarmEnabled(cfg.districtAlarmEnabled ?? true);
        setDistrictOfferExpirySeconds(cfg.districtOfferExpirySeconds ?? 60);
        setDistrictMaxAlertAttempts(cfg.districtMaxAlertAttempts ?? 3);
        setDistrictAlertCustomNotice(cfg.districtAlertCustomNotice ?? '');
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to load district config:', err);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, districtId]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const newSettings: DistrictSettings = {
      profitPercentage: Number(profitPercentage) || 0,
      platformFeePercent: Number(platformFeePercent) || 0,
      franchiseCommissionPercent: Number(franchiseCommissionPercent) || 0,
      businessPartnerCommissionPercent: Number(businessPartnerCommissionPercent) || 0,
      serviceProfessionalSharePercent: Number(serviceProfessionalSharePercent) || 0,
      bookingFee: Number(bookingFee) || 0,
      cancellationFee: Number(cancellationFee) || 0,
      minOrderValue: Number(minOrderValue) || 0,
      supportPhone: supportPhone.trim(),
      supportEmail: supportEmail.trim(),
      operatingHours: operatingHours.trim(),
      customNotice: customNotice.trim(),
      districtAlarmEnabled,
      districtOfferExpirySeconds: Number(districtOfferExpirySeconds) || 60,
      districtMaxAlertAttempts: Number(districtMaxAlertAttempts) || 3,
      districtAlertCustomNotice: districtAlertCustomNotice.trim(),
    };

    const res = await updateDistrictConfig(districtId, newSettings, districtName);
    setSaving(false);

    if (res.success) {
      setSuccessMsg(`✓ जिला ${districtName} की व्यावसायिक सेटिंग्स और दरें सफलतापूर्वक सुरक्षित कर दी गईं।`);
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'सेटिंग्स सुरक्षित करने में विफल।');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 my-8">
        {/* Header */}
        <div className="bg-stone-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg sm:text-xl">
                  {districtName} जिला व्यावसायिक नियम व कमीशन
                </h3>
                {districtId.toLowerCase() === 'bhopal' && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black">
                    HQ
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                District-Specific Business & Commission Rules ({stateName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center text-stone-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-600" />
            <p className="font-bold text-sm">{districtName} की सेटिंग्स लोड हो रही हैं...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-6">
            {/* Context Note */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">स्वतंत्र जिला कॉन्फ़िगरेशन (Independent District Rules):</span>{' '}
                {districtName} की दरों में किया गया कोई भी बदलाव केवल इसी जिले पर लागू होगा। अन्य जिलों
                (जैसे भोपाल, ग्वालियर, इंदौर) की दरों पर इसका कोई प्रभाव नहीं पड़ेगा।
              </div>
            </div>

            {/* District Booking Alert Controls */}
            <div className="bg-orange-50/60 p-4 rounded-2xl border border-orange-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-950">
                  <Bell className="w-4 h-4 text-orange-600" />
                  <span className="font-black text-xs uppercase tracking-wider">
                    {districtName} जिला बुकिंग अलर्ट सेटिंग्स (District Alert Controls)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={districtAlarmEnabled}
                    onChange={(e) => setDistrictAlarmEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600" />
                  <span className="ml-2 text-xs font-bold text-stone-700">
                    {districtAlarmEnabled ? 'अलर्ट चालू' : 'म्यूट'}
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    ऑफ़र प्रतिक्रिया समय (Response Countdown)
                  </label>
                  <select
                    value={districtOfferExpirySeconds}
                    onChange={(e) => setDistrictOfferExpirySeconds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-stone-900 font-bold text-xs"
                  >
                    <option value="30">30 सेकंड (Fast Dispatch)</option>
                    <option value="45">45 सेकंड</option>
                    <option value="60">60 सेकंड (अनुशंसित)</option>
                    <option value="90">90 सेकंड</option>
                    <option value="120">120 सेकंड</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    अधिकतम अलर्ट प्रयास (Max Attempts)
                  </label>
                  <select
                    value={districtMaxAlertAttempts}
                    onChange={(e) => setDistrictMaxAlertAttempts(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-stone-900 font-bold text-xs"
                  >
                    <option value="1">1 प्रयास</option>
                    <option value="2">2 प्रयास</option>
                    <option value="3">3 प्रयास (मानक)</option>
                    <option value="5">5 प्रयास</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  जिला अलर्ट कस्टम नोटिस (District Alert Notice Prefix)
                </label>
                <input
                  type="text"
                  placeholder={`e.g. ${districtName} स्पेशल: तुरंत सेवा दें और इंसेंटिव प्राप्त करें`}
                  value={districtAlertCustomNotice}
                  onChange={(e) => setDistrictAlertCustomNotice(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-orange-200 rounded-xl text-stone-900 text-xs"
                />
              </div>
            </div>

            {/* Financial Commission & Rates Grid */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-orange-600" />
                <span>लाभ एवं कमीशन संरचना (Profit & Commissions)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Profit Percentage */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    दीपक बिल्डकॉन लाभ मार्जिन (Profit %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={profitPercentage}
                      onChange={(e) => setProfitPercentage(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-stone-500 text-xs font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    {districtId.toLowerCase() === 'bhopal' ? 'भोपाल मानक: 20%' : districtId.toLowerCase() === 'gwalior' ? 'ग्वालियर मानक: 15%' : 'डिफ़ॉल्ट: 20%'}
                  </p>
                </div>

                {/* Platform Fee */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    प्लेटफ़ॉर्म शुल्क (Platform Fee %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={platformFeePercent}
                      onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-stone-500 text-xs font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">ग्राहक बिलिंग पर प्लेटफ़ॉर्म लेवी</p>
                </div>

                {/* Franchise Partner Commission */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    फ्रेंचाइज़ी कमीशन (हार्डिनकाम को देय %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={franchiseCommissionPercent}
                      onChange={(e) => setFranchiseCommissionPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-stone-500 text-xs font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    डिफ़ॉल्ट 15% — हार्डिनकाम को देय कमीशन (फ्रेंचाइज़ी आय नहीं)।
                  </p>
                </div>

                {/* Service Pro Share */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    सर्विसमैन भुगतान हिस्सा (Pro Share %)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="50"
                      max="100"
                      step="0.5"
                      value={serviceProfessionalSharePercent}
                      onChange={(e) => setServiceProfessionalSharePercent(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-stone-500 text-xs font-bold">%</span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">काम पूरा होने पर तकनीशियन का हिस्सा</p>
                </div>
              </div>
            </div>

            {/* Ancillary Fees Grid */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                <span>अतिरिक्त शुल्क व न्यूनतम सीमा (Configurable Charges)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    बुकिंग शुल्क (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bookingFee}
                    onChange={(e) => setBookingFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    कैंसिलेशन शुल्क (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={cancellationFee}
                    onChange={(e) => setCancellationFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    न्यूनतम ऑर्डर मूल्य (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-stone-900 font-bold text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact & District Notice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-500" />
                  <span>जिला हेल्पलाइन फोन (District Helpline)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98270 XXXXX"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>कार्यकारी समय (Operating Hours)</span>
                </label>
                <input
                  type="text"
                  placeholder="08:00 AM - 08:00 PM"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Custom District Announcement / Notice */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                जिला विशेष सूचना / बैनर संदेश (Custom District Notice)
              </label>
              <textarea
                rows={2}
                placeholder={`${districtName} जिले के ग्राहकों के लिए कोई विशेष सूचना या ऑफर...`}
                value={customNotice}
                onChange={(e) => setCustomNotice(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-colors cursor-pointer"
              >
                रद्द करें (Cancel)
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-950/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>सहेज रहे हैं...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{districtName} सेटिंग्स सुरक्षित करें</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

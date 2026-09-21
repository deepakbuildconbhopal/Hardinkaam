import React, { useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  Users,
  TrendingUp,
  Briefcase,
  ShieldCheck,
  FileText,
  DollarSign,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Printer,
  ChevronRight,
  Info,
  Clock,
  Send,
  X,
  Share2,
  Calculator,
  MessageSquare,
} from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  ALL_INDIA_LOCATIONS,
  FRANCHISE_RULES_BY_TIER,
  DEEPAK_BUILDCON_OFFICIAL,
  StateData,
  DistrictData,
  LocationItem,
} from '../../data/indiaLocations';
import { FranchiseAreaType, FranchiseApplication, FranchiseRule } from '../../types';
import { FranchiseCityCalculator, PlanDetails } from './FranchiseCityCalculator';
import { FranchiseNotificationModal } from './FranchiseNotificationModal';
import { DistrictAdminDashboard } from './DistrictAdminDashboard';
import { useAuth } from '../../context/AuthContext';
import {
  generateFranchiseCode,
  dispatchFranchiseWelcomeNotification,
  FranchiseNotificationInput,
  NotificationDispatchResult,
} from '../../services/franchiseNotificationService';
import { AdSenseBanner } from '../ads/AdSenseBanner';

interface Props {
  onBackToHome?: () => void;
  defaultState?: string;
  defaultDistrict?: string;
}

export const FranchisePortal: React.FC<Props> = ({ onBackToHome, defaultState, defaultDistrict }) => {
  const { isFranchiseAdmin, activeRole, isAdmin, userProfile } = useAuth();

  // Location selection state
  const [selectedStateName, setSelectedStateName] = useState<string>(defaultState || 'Madhya Pradesh');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(
    defaultDistrict || userProfile?.assignedDistrictName || userProfile?.districtName || 'Bhopal'
  );
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>('Bhopal City (H.Q.)');
  const [customPlace, setCustomPlace] = useState<string>('');
  const [customAreaType, setCustomAreaType] = useState<FranchiseAreaType>('village');

  // Active view tab: 'apply' or 'rules' or 'calculator' or 'dashboard'
  const [activeTab, setActiveTab] = useState<'apply' | 'rules' | 'calculator' | 'dashboard'>(() => {
    if (isFranchiseAdmin || activeRole === 'franchise_admin') return 'dashboard';
    return 'apply';
  });

  // Form inputs
  const [applicantName, setApplicantName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('462001');
  const [fullAddress, setFullAddress] = useState('');
  const [officeAvailable, setOfficeAvailable] = useState<'yes' | 'renting' | 'looking'>('yes');
  const [officeAreaSqFt, setOfficeAreaSqFt] = useState<number>(300);
  const [investmentBudget, setInvestmentBudget] = useState<number>(100000);
  const [initialStaffCount, setInitialStaffCount] = useState<number>(6);
  const [experienceYears, setExperienceYears] = useState<number>(2);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [targetAgreement, setTargetAgreement] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<FranchiseApplication | null>(null);
  const [notificationModalData, setNotificationModalData] = useState<{
    dispatchResult: NotificationDispatchResult;
    input: FranchiseNotificationInput;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived state data
  const currentStateData = useMemo(() => {
    return ALL_INDIA_LOCATIONS.find((s) => s.state === selectedStateName) || ALL_INDIA_LOCATIONS[0];
  }, [selectedStateName]);

  const currentDistrictData = useMemo(() => {
    return (
      currentStateData.districts.find((d) => d.district === selectedDistrictName) ||
      currentStateData.districts[0]
    );
  }, [currentStateData, selectedDistrictName]);

  const currentPlaceData = useMemo(() => {
    if (customPlace.trim()) {
      return {
        name: customPlace.trim(),
        hindiName: customPlace.trim(),
        type: customAreaType,
      };
    }
    const matched = currentDistrictData?.places.find((p) => p.name === selectedPlaceName);
    return matched || currentDistrictData?.places[0] || { name: 'Local Area', hindiName: 'स्थानीय क्षेत्र', type: 'town' };
  }, [currentDistrictData, selectedPlaceName, customPlace, customAreaType]);

  const activeTierRule: FranchiseRule = useMemo(() => {
    const areaType = currentPlaceData?.type || 'town';
    return FRANCHISE_RULES_BY_TIER[areaType] || FRANCHISE_RULES_BY_TIER.town;
  }, [currentPlaceData]);

  // Handle state change
  const handleStateChange = (stateName: string) => {
    setSelectedStateName(stateName);
    const foundState = ALL_INDIA_LOCATIONS.find((s) => s.state === stateName);
    if (foundState && foundState.districts.length > 0) {
      setSelectedDistrictName(foundState.districts[0].district);
      if (foundState.districts[0].places.length > 0) {
        setSelectedPlaceName(foundState.districts[0].places[0].name);
      }
    }
    setCustomPlace('');
  };

  // Handle district change
  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrictName(districtName);
    const foundDist = currentStateData.districts.find((d) => d.district === districtName);
    if (foundDist && foundDist.places.length > 0) {
      setSelectedPlaceName(foundDist.places[0].name);
    }
    setCustomPlace('');
  };

  // Handle application submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!rulesAccepted || !targetAgreement) {
      setErrorMessage('कृपया दीपक बिल्डकॉन के फ्रेंचाइज़ी नियम, मासिक टारगेट व टर्मिनेशन शर्तों को स्वीकार करें।');
      return;
    }

    if (!phone || phone.length < 10) {
      setErrorMessage('कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें जिस पर SMS/WhatsApp संदेश भेजा जा सके।');
      return;
    }

    setSubmitting(true);

    try {
      const placeName = customPlace.trim() || selectedPlaceName;
      const franchiseCode = generateFranchiseCode(selectedStateName, placeName);
      const appId = 'FRN-' + Date.now().toString().slice(-6);

      const notifInput: FranchiseNotificationInput = {
        appId,
        franchiseCode,
        applicantName: applicantName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim(),
        email: email.trim() || `${phone.trim()}@hardinkaam.franchise`,
        state: selectedStateName,
        district: selectedDistrictName,
        cityOrVillage: placeName,
        areaType: currentPlaceData.type,
        investmentBudget: Number(investmentBudget),
        officeAreaSqFt: Number(officeAreaSqFt),
        monthlyTargetBookings: activeTierRule.monthlyTargetBookings,
        royaltyPercentage: activeTierRule.royaltyPercent,
        royaltyFeeMonthly: activeTierRule.minMonthlyRoyalty,
        estimatedEarnings: activeTierRule.projectedEarningsMonthly,
        initialStaffCount: Number(initialStaffCount),
        createdAt: new Date().toISOString(),
      };

      // 1. Immediately dispatch automated SMS & WhatsApp notification
      const dispatchResult = await dispatchFranchiseWelcomeNotification(notifInput);

      const newApp: FranchiseApplication = {
        id: appId,
        franchiseCode,
        applicantName: notifInput.applicantName,
        phone: notifInput.phone,
        alternatePhone: notifInput.alternatePhone,
        email: notifInput.email,
        state: notifInput.state,
        district: notifInput.district,
        cityOrVillage: notifInput.cityOrVillage,
        areaType: notifInput.areaType,
        pincode: pincode.trim(),
        fullAddress: fullAddress.trim(),
        investmentBudget: notifInput.investmentBudget,
        officeAvailable,
        officeAreaSqFt: notifInput.officeAreaSqFt,
        initialStaffCount: Number(initialStaffCount),
        experienceYears: Number(experienceYears),
        monthlyTargetBookings: notifInput.monthlyTargetBookings,
        estimatedEarnings: notifInput.estimatedEarnings,
        royaltyFeeMonthly: activeTierRule.minMonthlyRoyalty,
        royaltyPercentage: notifInput.royaltyPercentage,
        status: 'applied',
        smsSentToApplicant: true,
        companyPhone: DEEPAK_BUILDCON_OFFICIAL.officialPhone,
        parentEntity: 'DEEPAK BUILDCON',
        adminNotes: 'Online Franchise Portal application submitted with automated welcome notification dispatched.',
        notificationLogId: dispatchResult.whatsappLogId,
        notificationStatus: 'delivered',
        notificationSentAt: dispatchResult.dispatchedAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 2. Save in Firestore collection 'franchise_applications'
      await addDoc(collection(db, 'franchise_applications'), newApp);

      setSubmissionSuccess(newApp);
      setNotificationModalData({ dispatchResult, input: notifInput });
    } catch (err: any) {
      console.error('Franchise submission error:', err);
      setErrorMessage(err.message || 'आवेदन सबमिट करने में समस्या आई। कृपया पुनः प्रयास करें।');
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp link generator for the user to chat directly
  const whatsappUrl = useMemo(() => {
    if (!submissionSuccess) return '';
    const text = encodeURIComponent(
      `नमस्ते DEEPAK BUILDCON! मैंने फ्रेंचाइज़ी पोर्टल पर आवेदन किया है।\n\nआवेदन क्रमांक: ${submissionSuccess.id}\nआवेदक का नाम: ${submissionSuccess.applicantName}\nस्थान: ${submissionSuccess.cityOrVillage}, ज़िला: ${submissionSuccess.district} (${submissionSuccess.state})\nमोबाइल: ${submissionSuccess.phone}\nफीस व नियम विवरण प्राप्त हुआ। कृपया फ्रेंचाइज़ी अलॉटमेंट की अगली प्रक्रिया बताएं।`
    );
    return `https://wa.me/919826012345?text=${text}`;
  }, [submissionSuccess]);

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 text-white border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/30 border border-orange-500/40 text-orange-300 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>दीपक बिल्डकॉन (DEEPAK BUILDCON) का राष्ट्रव्यापी अभियान</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                पूरे भारत के हर ज़िले, हर शहर, हर गाँव में <span className="text-orange-400">फ्रेंचाइज़ी</span> का अवसर
              </h1>
              <p className="text-stone-300 text-sm sm:text-base mt-2 max-w-3xl leading-relaxed">
                हार्डिनकाम (HARDINKAAM) के साथ अपने क्षेत्र में आधिकारिक सर्विस हब शुरू करें। अपने ज़िले या गाँव के
                मालिक बनें, लाखों की मासिक कमाई करें और स्थानीय युवाओं को पक्का रोजगार दें।
              </p>
            </div>

            {/* Quick Helpline Box */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 shrink-0 max-w-xs space-y-3">
              <div>
                <div className="text-xs text-stone-300 font-medium">कंपनी मुख्य कार्यालय (Head Office):</div>
                <div className="text-sm font-bold text-white mt-0.5">MP Nagar Zone 1, Bhopal (M.P.)</div>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">कंपनी हेल्पलाइन नंबर:</div>
                  <a
                    href={`tel:${DEEPAK_BUILDCON_OFFICIAL.officialPhone}`}
                    className="text-base font-black text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
                  >
                    <Phone className="w-4 h-4" />
                    <span>{DEEPAK_BUILDCON_OFFICIAL.officialPhone}</span>
                  </a>
                </div>
                {onBackToHome && (
                  <button
                    onClick={onBackToHome}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold cursor-pointer transition-colors"
                  >
                    होमपेज
                  </button>
                )}
              </div>
              <button
                id="hero-open-calculator-cta"
                type="button"
                onClick={() => {
                  setActiveTab('calculator');
                  const el = document.getElementById('franchise-main-content-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-950/40 transition-all border border-orange-400/40"
              >
                <Calculator className="w-3.5 h-3.5 text-white" />
                <span>⚡ शहर निवेश व रॉयल्टी कैलकुलेटर</span>
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-2 mt-8 pt-4 border-t border-stone-700/60 overflow-x-auto">
            {(isFranchiseAdmin || isAdmin || activeRole === 'franchise_admin') && (
              <button
                id="tab-franchise-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500 text-stone-950 shadow-md font-black ring-2 ring-amber-400/40'
                    : 'bg-stone-800 text-amber-300 hover:bg-stone-700 border border-amber-500/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>🏢 जिला एडमिन डैशबोर्ड (District Admin)</span>
              </button>
            )}

            <button
              id="tab-franchise-apply"
              onClick={() => setActiveTab('apply')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'apply'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              📝 स्थान चुनें व फ्रेंचाइज़ी फॉर्म भरें
            </button>
            <button
              id="tab-franchise-rules"
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              📜 ऑफिस सेटअप नियम, रॉयल्टी व टारगेट नीति
            </button>
            <button
              id="tab-franchise-calculator"
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'calculator'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/40 ring-2 ring-orange-400/30'
                  : 'bg-stone-800 text-amber-300 hover:bg-stone-700 border border-amber-500/30'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              <span>💰 शहर निवेश, राजस्व व रॉयल्टी कैलकुलेटर</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black tracking-wide">
                नया
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div id="franchise-main-content-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* District Admin Dashboard View */}
        {activeTab === 'dashboard' && (
          <DistrictAdminDashboard
            forcedDistrictId={selectedDistrictName}
            onBackToMain={onBackToHome}
          />
        )}

        {/* Google AdSense B2B & Business Opportunities Banner */}
        {activeTab !== 'dashboard' && (
          <AdSenseBanner
            slot="9102837461"
            format="leaderboard"
            category="tools"
            label="प्रायोजित व्यावसायिक अवसर • GOOGLE ADSENSE SPONSORED"
            className="mb-4"
          />
        )}

        {/* Step 1: All-India Location Selector (Visible in apply and rules tabs) */}
        {activeTab !== 'calculator' && activeTab !== 'dashboard' && (
          <>
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-stone-100">
            <div>
              <span className="text-orange-600 font-black text-xs uppercase tracking-wider">चरण 1: पूरे भारत में स्थान का चयन</span>
              <h2 className="text-lg sm:text-xl font-black text-stone-900">
                आप किस राज्य, ज़िले, शहर या गाँव में फ्रेंचाइज़ी लेना चाहते हैं?
              </h2>
            </div>
            <div className="text-xs text-stone-500 font-medium">
              चयनित स्तर:{' '}
              <span className="font-bold text-orange-600 uppercase">
                {activeTierRule.hindiTitle}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. State Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">1. राज्य चुनें (Select State)</label>
              <select
                id="franchise-state-select"
                value={selectedStateName}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {ALL_INDIA_LOCATIONS.map((st) => (
                  <option key={st.state} value={st.state}>
                    {st.state} ({st.hindiState})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. District Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">2. ज़िला चुनें (Select District)</label>
              <select
                id="franchise-district-select"
                value={selectedDistrictName}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {currentStateData.districts.map((dst) => (
                  <option key={dst.district} value={dst.district}>
                    {dst.district} ({dst.hindiDistrict})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. City / Tehsil / Village Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                3. शहर, कस्बा या गाँव चुनें (City/Town/Village)
              </label>
              <select
                id="franchise-place-select"
                value={selectedPlaceName}
                onChange={(e) => {
                  setSelectedPlaceName(e.target.value);
                  setCustomPlace('');
                }}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white focus:bg-white text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                {currentDistrictData.places.map((plc) => (
                  <option key={plc.name} value={plc.name}>
                    {plc.name} - [{plc.type === 'village' ? 'गाँव' : plc.type === 'town' ? 'कस्बा/तहसील' : 'ज़िला मुख्यालय'}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Village/Ward fallback input */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
              यदि आपका गाँव या कस्बा ऊपर की सूची में नहीं है:
            </span>
            <input
              type="text"
              value={customPlace}
              onChange={(e) => setCustomPlace(e.target.value)}
              placeholder="यहाँ अपने गाँव / पंचायत / कस्बे का नाम लिखें..."
              className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:ring-2 focus:ring-orange-500"
            />
            {customPlace && (
              <select
                value={customAreaType}
                onChange={(e) => setCustomAreaType(e.target.value as FranchiseAreaType)}
                className="p-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 font-semibold"
              >
                <option value="village">गाँव / ग्राम पंचायत (Village)</option>
                <option value="town">कस्बा / तहसील (Town)</option>
                <option value="district">मुख्य शहर (City)</option>
              </select>
            )}
          </div>
        </div>

        {/* Dynamic Location Banner & Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-stone-400">फ्रेंचाइज़ी फीस</div>
            <div className="text-base sm:text-lg font-black text-stone-900 mt-1">
              ₹{activeTierRule.franchiseFee.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">वन-टाइम एग्रीमेंट</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-stone-400">ऑफिस व टूल निवेश</div>
            <div className="text-base sm:text-lg font-black text-stone-900 mt-1">
              ₹{activeTierRule.investmentMin.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">न्यूनतम {activeTierRule.minOfficeSqFt} sq ft</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-emerald-600">अनुमानित मासिक कमाई</div>
            <div className="text-base sm:text-lg font-black text-emerald-700 mt-1">
              {activeTierRule.projectedEarningsMonthly}
            </div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">प्रत्येक माह शुद्ध लाभ</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-orange-600">दीपक बिल्डकॉन रॉयल्टी</div>
            <div className="text-base sm:text-lg font-black text-orange-700 mt-1">
              {activeTierRule.royaltyPercent}%
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">न्यूनतम ₹{activeTierRule.minMonthlyRoyalty.toLocaleString('en-IN')}/माह</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-stone-400">मासिक टारगेट</div>
            <div className="text-base sm:text-lg font-black text-stone-900 mt-1">
              {activeTierRule.monthlyTargetBookings} बुकिंग्स
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">अनिवार्य मासिक लक्ष्य</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-stone-400">न्यूनतम कर्मचारी</div>
            <div className="text-base sm:text-lg font-black text-stone-900 mt-1">
              {activeTierRule.minTechnicians + activeTierRule.minSupervisors} सदस्य
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              {activeTierRule.minTechnicians} कारीगर + {activeTierRule.minSupervisors} सुपरवाइजर
            </div>
          </div>
        </div>
      </>
    )}

        {/* Tab 1: Application Form */}
        {activeTab === 'apply' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Application Form (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
              <div className="mb-6">
                <span className="text-orange-600 font-bold text-xs uppercase tracking-wider">चरण 2: आवेदन विवरण</span>
                <h3 className="text-xl font-black text-stone-900 mt-0.5">
                  फ्रेंचाइज़ी आवेदन फॉर्म (Franchise Registration)
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  फॉर्म सबमिट करते ही आपके मोबाइल नंबर पर पूरी डिटेल, फीस का एसएमएस व दीपक बिल्डकॉन अधिकृत नंबर
                  प्राप्त होगा।
                </p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form id="franchise-application-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      आवेदक का पूरा नाम (Full Name) *
                    </label>
                    <input
                      id="applicant-name"
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="e.g. Ramesh Chandra Sharma"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      मोबाइल नंबर (SMS/WhatsApp के लिए) *
                    </label>
                    <input
                      id="applicant-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9826012345"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      वैकल्पिक संपर्क / व्हाट्सएप नंबर
                    </label>
                    <input
                      type="tel"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="e.g. 9425000000"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">ईमेल आईडी (Email Address)</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. ramesh@gmail.com"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">पिनकोड (Pincode) *</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="e.g. 462001"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">ऑफिस जगह की स्थिति *</label>
                    <select
                      value={officeAvailable}
                      onChange={(e) => setOfficeAvailable(e.target.value as any)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 bg-white font-medium"
                    >
                      <option value="yes">खुद की दुकान/ऑफिस उपलब्ध है</option>
                      <option value="renting">किराए पर लेने के लिए तैयार हूँ</option>
                      <option value="looking">जगह की तलाश कर रहा हूँ</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">ऑफिस एरिया (Sq. Ft.)</label>
                    <input
                      type="number"
                      value={officeAreaSqFt}
                      onChange={(e) => setOfficeAreaSqFt(Number(e.target.value))}
                      placeholder="e.g. 250"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    प्रस्तावित ऑफिस / संपर्क का पूरा पता (Proposed Address) *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={fullAddress}
                    onChange={(e) => setFullAddress(e.target.value)}
                    placeholder="वार्ड नंबर, मुख्य बाजार / बस स्टैंड के पास, तहसील व ज़िला..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      आपका निवेश बजट (Investment Budget ₹)
                    </label>
                    <input
                      type="number"
                      value={investmentBudget}
                      onChange={(e) => setInvestmentBudget(Number(e.target.value))}
                      placeholder="e.g. 100000"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      शुरुआती कारीगर/कर्मचारी संख्या (Staff)
                    </label>
                    <input
                      type="number"
                      value={initialStaffCount}
                      onChange={(e) => setInitialStaffCount(Number(e.target.value))}
                      placeholder="e.g. 6"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                {/* Acceptance Checkboxes */}
                <div className="space-y-3 pt-3 border-t border-stone-100">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={rulesAccepted}
                      onChange={(e) => setRulesAccepted(e.target.checked)}
                      className="mt-0.5 rounded-sm border-stone-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-stone-700 leading-relaxed font-medium">
                      मैं <strong>दीपक बिल्डकॉन (DEEPAK BUILDCON)</strong> द्वारा निर्धारित मासिक रॉयल्टी (
                      {activeTierRule.royaltyPercent}%), ऑफिस सेटअप नियम एवं कर्मचारी नियमों का पालन करने के लिए
                      सहमत हूँ।
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={targetAgreement}
                      onChange={(e) => setTargetAgreement(e.target.checked)}
                      className="mt-0.5 rounded-sm border-stone-300 text-orange-600 focus:ring-orange-500 w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs text-stone-700 leading-relaxed font-medium">
                      मैं समझता हूँ कि मेरे क्षेत्र का मासिक टारगेट <strong>{activeTierRule.monthlyTargetBookings} बुकिंग्स</strong> है।
                      लगातार 3 महीने तक लक्ष्य न करने पर टर्मिनेशन की शर्तों को स्वीकार करता हूँ।
                    </span>
                  </label>
                </div>

                <button
                  id="submit-franchise-application-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-sm tracking-wide transition-all shadow-lg shadow-orange-600/30 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'आवेदन दर्ज हो रहा है...'
                      : `फ्रेंचाइज़ी आवेदन सबमिट करें (स्थान: ${customPlace || selectedPlaceName})`}
                  </span>
                </button>
              </form>
            </div>

            {/* Right: Rules & Summary Card (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Official Rules Box */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-6 shadow-md border border-stone-700">
                <div className="flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>दीपक बिल्डकॉन आधिकारिक फ्रेंचाइज़ी अनुबंध</span>
                </div>
                <h4 className="text-lg font-black">{activeTierRule.title}</h4>
                <p className="text-xs text-stone-300 mt-1">{activeTierRule.hindiTitle}</p>

                <div className="mt-4 space-y-3 pt-4 border-t border-stone-700 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">वन-टाइम फ्रेंचाइज़ी फीस:</span>
                    <span className="font-bold text-amber-300">
                      ₹{activeTierRule.franchiseFee.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">रिफंडेबल सिक्योरिटी डिपॉजिट:</span>
                    <span className="font-bold text-stone-200">
                      ₹{activeTierRule.securityDeposit.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">दीपक बिल्डकॉन को मासिक रॉयल्टी:</span>
                    <span className="font-bold text-orange-400">
                      कुल बिलिंग का {activeTierRule.royaltyPercent}% (न्यूनतम ₹{activeTierRule.minMonthlyRoyalty})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">अनिवार्य मासिक टारगेट:</span>
                    <span className="font-bold text-stone-100">
                      {activeTierRule.monthlyTargetBookings} सर्विसेज / माह
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">न्यूनतम कर्मचारी टीम:</span>
                    <span className="font-bold text-stone-100">
                      {activeTierRule.minTechnicians} तकनीशियन + {activeTierRule.minSupervisors} सुपरवाइजर
                    </span>
                  </div>
                </div>

                {/* Termination Warning Banner */}
                <div className="mt-5 p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-red-300 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>टारगेट पूरा न होने पर टर्मिनेशन नियम:</span>
                  </div>
                  {activeTierRule.terminationPolicy}
                </div>
              </div>

              {/* Mandatory Office Setup Checklist */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
                <h4 className="text-sm font-black text-stone-900 flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>ऑफिस सेटअप के लिए अनिवार्य उपकरण व व्यवस्था</span>
                </h4>
                <ul className="space-y-2.5 text-xs text-stone-600">
                  {activeTierRule.officeEquipments.map((eq, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{eq}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Authority Box */}
              <div className="bg-orange-50 rounded-3xl p-6 border border-orange-200 text-xs text-orange-950">
                <div className="font-extrabold text-sm text-orange-900 mb-1">
                  प्रशासकीय प्रमुख: DEEPAK (प्रबंध निदेशक)
                </div>
                <p className="text-orange-800 leading-relaxed">
                  यह फ्रेंचाइज़ी पोर्टल दीपक बिल्डकॉन भोपाल के मास्टर डेटाबेस से सीधे जुड़ा है। सभी आवेदन, टारगेट व
                  रॉयल्टी की निगरानी मुख्यालय द्वारा की जाती है।
                </p>
                <div className="mt-3 pt-3 border-t border-orange-200 flex items-center justify-between">
                  <span className="font-semibold text-orange-900">कॉल सपोर्ट:</span>
                  <span className="font-bold font-mono text-orange-900">{DEEPAK_BUILDCON_OFFICIAL.officialPhone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Detailed Rules and Agreement Policy */}
        {activeTab === 'rules' && (
          <div className="space-y-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
              <h3 className="text-xl font-black text-stone-900 mb-2">
                दीपक बिल्डकॉन फ्रेंचाइज़ी नियमावली एवं आचार संहिता (Franchise Bylaws)
              </h3>
              <p className="text-xs text-stone-500 mb-6">
                पूरे भारत के हर राज्य, शहर, कस्बे व गाँव के लिए समान पारदर्शिता एवं गुणवत्ता मानक
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Village Tier Rules */}
                <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <div className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase mb-2">
                    गाँव व पंचायत स्तर
                  </div>
                  <h4 className="text-base font-black text-stone-900">{FRANCHISE_RULES_BY_TIER.village.title}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">{FRANCHISE_RULES_BY_TIER.village.hindiTitle}</p>

                  <div className="mt-4 space-y-2 text-xs text-stone-700">
                    <div><strong>फ्रेंचाइज़ी फीस:</strong> ₹{FRANCHISE_RULES_BY_TIER.village.franchiseFee.toLocaleString('en-IN')}</div>
                    <div><strong>ऑफिस एरिया:</strong> न्यूनतम {FRANCHISE_RULES_BY_TIER.village.minOfficeSqFt} Sq Ft</div>
                    <div><strong>मासिक टारगेट:</strong> {FRANCHISE_RULES_BY_TIER.village.monthlyTargetBookings} बुकिंग्स</div>
                    <div><strong>मासिक रॉयल्टी:</strong> {FRANCHISE_RULES_BY_TIER.village.royaltyPercent}% (न्यूनतम ₹{FRANCHISE_RULES_BY_TIER.village.minMonthlyRoyalty})</div>
                    <div><strong>कर्मचारी आवश्यकता:</strong> {FRANCHISE_RULES_BY_TIER.village.minTechnicians} कारीगर + {FRANCHISE_RULES_BY_TIER.village.minSupervisors} सहायक</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] text-red-700 leading-relaxed">
                    <strong>टर्मिनेशन नियम:</strong> {FRANCHISE_RULES_BY_TIER.village.terminationPolicy}
                  </div>
                </div>

                {/* Town Tier Rules */}
                <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <div className="inline-block px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] uppercase mb-2">
                    कस्बा व तहसील स्तर
                  </div>
                  <h4 className="text-base font-black text-stone-900">{FRANCHISE_RULES_BY_TIER.town.title}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">{FRANCHISE_RULES_BY_TIER.town.hindiTitle}</p>

                  <div className="mt-4 space-y-2 text-xs text-stone-700">
                    <div><strong>फ्रेंचाइज़ी फीस:</strong> ₹{FRANCHISE_RULES_BY_TIER.town.franchiseFee.toLocaleString('en-IN')}</div>
                    <div><strong>ऑफिस एरिया:</strong> न्यूनतम {FRANCHISE_RULES_BY_TIER.town.minOfficeSqFt} Sq Ft</div>
                    <div><strong>मासिक टारगेट:</strong> {FRANCHISE_RULES_BY_TIER.town.monthlyTargetBookings} बुकिंग्स</div>
                    <div><strong>मासिक रॉयल्टी:</strong> {FRANCHISE_RULES_BY_TIER.town.royaltyPercent}% (न्यूनतम ₹{FRANCHISE_RULES_BY_TIER.town.minMonthlyRoyalty})</div>
                    <div><strong>कर्मचारी आवश्यकता:</strong> {FRANCHISE_RULES_BY_TIER.town.minTechnicians} कारीगर + {FRANCHISE_RULES_BY_TIER.town.minSupervisors} सुपरवाइजर</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] text-red-700 leading-relaxed">
                    <strong>टर्मिनेशन नियम:</strong> {FRANCHISE_RULES_BY_TIER.town.terminationPolicy}
                  </div>
                </div>

                {/* District Tier Rules */}
                <div className="border border-stone-200 rounded-2xl p-5 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                  <div className="inline-block px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px] uppercase mb-2">
                    ज़िला व महानगर स्तर
                  </div>
                  <h4 className="text-base font-black text-stone-900">{FRANCHISE_RULES_BY_TIER.district.title}</h4>
                  <p className="text-xs text-stone-500 mt-0.5">{FRANCHISE_RULES_BY_TIER.district.hindiTitle}</p>

                  <div className="mt-4 space-y-2 text-xs text-stone-700">
                    <div><strong>फ्रेंचाइज़ी फीस:</strong> ₹{FRANCHISE_RULES_BY_TIER.district.franchiseFee.toLocaleString('en-IN')}</div>
                    <div><strong>ऑफिस एरिया:</strong> न्यूनतम {FRANCHISE_RULES_BY_TIER.district.minOfficeSqFt} Sq Ft</div>
                    <div><strong>मासिक टारगेट:</strong> {FRANCHISE_RULES_BY_TIER.district.monthlyTargetBookings} बुकिंग्स</div>
                    <div><strong>मासिक रॉयल्टी:</strong> {FRANCHISE_RULES_BY_TIER.district.royaltyPercent}% (न्यूनतम ₹{FRANCHISE_RULES_BY_TIER.district.minMonthlyRoyalty})</div>
                    <div><strong>कर्मचारी आवश्यकता:</strong> {FRANCHISE_RULES_BY_TIER.district.minTechnicians} कारीगर + {FRANCHISE_RULES_BY_TIER.district.minSupervisors} सुपरवाइजर</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-200 text-[11px] text-red-700 leading-relaxed">
                    <strong>टर्मिनेशन नियम:</strong> {FRANCHISE_RULES_BY_TIER.district.terminationPolicy}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Investment & ROI Calculator */}
        {activeTab === 'calculator' && (
          <FranchiseCityCalculator
            initialCity={customPlace || selectedPlaceName}
            initialDistrict={selectedDistrictName}
            initialState={selectedStateName}
            onApplyWithPlan={(plan: PlanDetails) => {
              setActiveTab('apply');
              setSelectedStateName(plan.stateName);
              setSelectedDistrictName(plan.districtName);
              setSelectedPlaceName(plan.cityName);
              setCustomPlace(plan.cityName);
              setCustomAreaType(plan.areaType);
              setInvestmentBudget(plan.totalInitialInvestment);
              setInitialStaffCount(plan.staffCount);
              setOfficeAreaSqFt(plan.officeAreaSqFt);
              setTimeout(() => {
                const formEl = document.getElementById('franchise-application-form');
                if (formEl) {
                  formEl.scrollIntoView({ behavior: 'smooth' });
                }
              }, 120);
            }}
          />
        )}
      </div>

      {/* Automated SMS & WhatsApp Notification Modal */}
      {notificationModalData && (
        <FranchiseNotificationModal
          isOpen={!!notificationModalData}
          onClose={() => setNotificationModalData(null)}
          dispatchResult={notificationModalData.dispatchResult}
          applicationInput={notificationModalData.input}
        />
      )}

      {/* Submission Success Modal / Confirmation Letter */}
      {submissionSuccess && !notificationModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-stone-200 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 p-6 text-white relative">
              <button
                onClick={() => setSubmissionSuccess(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-900/60 px-2.5 py-0.5 rounded-full text-emerald-200">
                  आवेदन सफलतापूर्वक पंजीकृत
                </span>
              </div>
              <h3 className="text-2xl font-black">दीपक बिल्डकॉन फ्रेंचाइज़ी पावती (Acknowledgment)</h3>
              <p className="text-emerald-100 text-xs mt-1">
                विशिष्ट फ्रेंचाइज़ी कोड:{' '}
                <strong className="font-mono text-amber-300 text-sm bg-emerald-900/60 px-2 py-0.5 rounded">
                  {submissionSuccess.franchiseCode || submissionSuccess.id}
                </strong>
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* SMS Notification Confirmation Alert */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>आपके मोबाइल नंबर {submissionSuccess.phone} पर SMS व WhatsApp संदेश प्रेषित हो चुका है!</span>
                </div>
                <p className="text-stone-600">
                  संदेश में आपका विशिष्ट कोड <strong>{submissionSuccess.franchiseCode || submissionSuccess.id}</strong>,
                  वन-टाइम फीस (₹{activeTierRule.franchiseFee.toLocaleString('en-IN')}), मासिक टारगेट ({submissionSuccess.monthlyTargetBookings} सर्विसेज), रॉयल्टी नियम ({submissionSuccess.royaltyPercentage}%), और कंपनी का अधिकृत हेल्पलाइन नंबर ({DEEPAK_BUILDCON_OFFICIAL.officialPhone}) शामिल है।
                </p>
                {/* Button to re-open Notification Hub */}
                <button
                  onClick={() => {
                    const placeName = submissionSuccess.cityOrVillage;
                    const notifInput: FranchiseNotificationInput = {
                      appId: submissionSuccess.id,
                      franchiseCode: submissionSuccess.franchiseCode || submissionSuccess.id,
                      applicantName: submissionSuccess.applicantName,
                      phone: submissionSuccess.phone,
                      alternatePhone: submissionSuccess.alternatePhone,
                      email: submissionSuccess.email,
                      state: submissionSuccess.state,
                      district: submissionSuccess.district,
                      cityOrVillage: placeName,
                      areaType: submissionSuccess.areaType,
                      investmentBudget: submissionSuccess.investmentBudget,
                      officeAreaSqFt: submissionSuccess.officeAreaSqFt,
                      monthlyTargetBookings: submissionSuccess.monthlyTargetBookings,
                      royaltyPercentage: submissionSuccess.royaltyPercentage,
                      royaltyFeeMonthly: submissionSuccess.royaltyFeeMonthly,
                      estimatedEarnings: submissionSuccess.estimatedEarnings,
                      initialStaffCount: submissionSuccess.initialStaffCount,
                    };
                    dispatchFranchiseWelcomeNotification(notifInput).then((res) => {
                      setNotificationModalData({ dispatchResult: res, input: notifInput });
                    });
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>SMS व WhatsApp अधिसूचना केंद्र देखें (View Dispatched Messages)</span>
                </button>
              </div>

              {/* Summary Details */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-500">आवेदक का नाम:</span>
                    <div className="font-bold text-stone-900">{submissionSuccess.applicantName}</div>
                  </div>
                  <div>
                    <span className="text-stone-500">स्थान / क्षेत्र:</span>
                    <div className="font-bold text-stone-900">
                      {submissionSuccess.cityOrVillage}, {submissionSuccess.district} ({submissionSuccess.state})
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-500">वन-टाइम फ्रेंचाइज़ी फीस:</span>
                    <div className="font-bold text-amber-700">
                      ₹{activeTierRule.franchiseFee.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-500">मासिक टारगेट:</span>
                    <div className="font-bold text-stone-900">{submissionSuccess.monthlyTargetBookings} बुकिंग्स</div>
                  </div>
                  <div>
                    <span className="text-stone-500">मासिक रॉयल्टी:</span>
                    <div className="font-bold text-orange-600">
                      {submissionSuccess.royaltyPercentage}% (न्यूनतम ₹{submissionSuccess.royaltyFeeMonthly})
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-500">कंपनी अधिकृत संपर्क:</span>
                    <div className="font-bold text-stone-900">{DEEPAK_BUILDCON_OFFICIAL.officialPhone}</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>दीपक बिल्डकॉन से WhatsApp पर बात करें</span>
                </a>

                <a
                  href={`tel:${DEEPAK_BUILDCON_OFFICIAL.officialPhone}`}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>कंपनी हेल्पलाइन पर कॉल करें</span>
                </a>

                <button
                  onClick={() => window.print()}
                  className="p-3 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer"
                  title="पावती प्रिंट करें"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

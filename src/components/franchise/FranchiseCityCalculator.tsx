import React, { useState, useMemo } from 'react';
import {
  Building2,
  Calculator,
  TrendingUp,
  DollarSign,
  Coins,
  ShieldCheck,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Share2,
  Printer,
  Sparkles,
  ChevronRight,
  Info,
  Calendar,
  Percent,
  RotateCcw,
  Sliders,
  Search,
  Building,
  PhoneCall,
  Check,
  Award,
  Wallet,
  Briefcase,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  Cell
} from 'recharts';
import {
  ALL_INDIA_LOCATIONS,
  FRANCHISE_RULES_BY_TIER,
  DEEPAK_BUILDCON_OFFICIAL,
  LocationItem,
  DistrictData
} from '../../data/indiaLocations';
import { FranchiseAreaType, FranchiseRule } from '../../types';

export interface PlanDetails {
  cityName: string;
  stateName: string;
  districtName: string;
  areaType: FranchiseAreaType;
  totalInitialInvestment: number;
  monthlyTargetBookings: number;
  expectedAov: number;
  projectedMonthlyGmv: number;
  mandatoryDeepakBuildconShare: number;
  partnerNetMonthlyProfit: number;
  staffCount: number;
  officeAreaSqFt: number;
}

interface Props {
  onApplyWithPlan?: (plan: PlanDetails) => void;
  initialCity?: string;
  initialDistrict?: string;
  initialState?: string;
}

export const FranchiseCityCalculator: React.FC<Props> = ({
  onApplyWithPlan,
  initialCity = 'Bhopal',
  initialDistrict = 'Bhopal',
  initialState = 'Madhya Pradesh',
}) => {
  // City search & selection state
  const [cityInput, setCityInput] = useState<string>(initialCity);
  const [selectedState, setSelectedState] = useState<string>(initialState);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [selectedTier, setSelectedTier] = useState<FranchiseAreaType>('district');
  const [isCustomCity, setIsCustomCity] = useState<boolean>(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState<boolean>(false);

  // Scenario preset: 'conservative' (80% bookings) | 'realistic' (100% target) | 'growth' (150% target)
  const [scenario, setScenario] = useState<'conservative' | 'realistic' | 'growth'>('realistic');

  // Interactive slider parameters
  const [customBookings, setCustomBookings] = useState<number | null>(null);
  const [averageOrderValue, setAverageOrderValue] = useState<number>(650);
  const [customTechnicians, setCustomTechnicians] = useState<number | null>(null);
  const [officeArea, setOfficeArea] = useState<number>(450);

  // Print quotation view state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Top featured cities for quick one-click selection
  const FEATURED_CITIES = [
    { name: 'Bhopal', state: 'Madhya Pradesh', district: 'Bhopal', tier: 'district' as FranchiseAreaType, label: '🏛️ भोपाल (H.Q.)' },
    { name: 'Indore', state: 'Madhya Pradesh', district: 'Indore', tier: 'district' as FranchiseAreaType, label: '🌆 इंदौर (Metro)' },
    { name: 'Jabalpur', state: 'Madhya Pradesh', district: 'Jabalpur', tier: 'district' as FranchiseAreaType, label: '🏭 जबलपुर' },
    { name: 'Gwalior', state: 'Madhya Pradesh', district: 'Gwalior', tier: 'district' as FranchiseAreaType, label: '🏰 ग्वालियर' },
    { name: 'Ujjain', state: 'Madhya Pradesh', district: 'Ujjain', tier: 'district' as FranchiseAreaType, label: '🕉️ उज्जैन' },
    { name: 'Sagar', state: 'Madhya Pradesh', district: 'Sagar', tier: 'town' as FranchiseAreaType, label: '🏙️ सागर' },
    { name: 'Rewa', state: 'Madhya Pradesh', district: 'Rewa', tier: 'town' as FranchiseAreaType, label: '🌿 रीवा' },
    { name: 'Sehore', state: 'Madhya Pradesh', district: 'Sehore', tier: 'town' as FranchiseAreaType, label: '🌾 सीहोर' },
    { name: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', tier: 'district' as FranchiseAreaType, label: '🏢 जयपुर' },
    { name: 'Lucknow', state: 'Uttar Pradesh', district: 'Lucknow', tier: 'district' as FranchiseAreaType, label: '🕌 लखनऊ' },
    { name: 'Delhi NCR', state: 'Delhi NCR', district: 'Central & South Delhi', tier: 'district' as FranchiseAreaType, label: '🌐 दिल्ली NCR' },
  ];

  // Search suggestions across all India locations
  const matchingSuggestions = useMemo(() => {
    if (!cityInput.trim() || cityInput.length < 2) return [];
    const query = cityInput.toLowerCase().trim();
    const list: Array<{
      cityName: string;
      hindiName: string;
      district: string;
      state: string;
      tier: FranchiseAreaType;
    }> = [];

    for (const st of ALL_INDIA_LOCATIONS) {
      for (const dst of st.districts) {
        if (dst.district.toLowerCase().includes(query)) {
          list.push({
            cityName: dst.district,
            hindiName: dst.hindiDistrict,
            district: dst.district,
            state: st.state,
            tier: 'district',
          });
        }
        for (const plc of dst.places) {
          if (plc.name.toLowerCase().includes(query) || plc.hindiName.includes(query)) {
            list.push({
              cityName: plc.name,
              hindiName: plc.hindiName,
              district: dst.district,
              state: st.state,
              tier: plc.type,
            });
          }
        }
      }
    }
    // Deduplicate by cityName + state
    const seen = new Set<string>();
    return list.filter((item) => {
      const key = `${item.cityName}-${item.state}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [cityInput]);

  // Select city from suggestion or featured list
  const handleSelectCity = (city: {
    name: string;
    state: string;
    district: string;
    tier: FranchiseAreaType;
  }) => {
    setCityInput(city.name);
    setSelectedState(city.state);
    setSelectedDistrict(city.district);
    setSelectedTier(city.tier);
    setIsCustomCity(false);
    setShowCitySuggestions(false);

    // Reset custom overrides to match new tier defaults
    const tierRule = FRANCHISE_RULES_BY_TIER[city.tier];
    setCustomBookings(tierRule.monthlyTargetBookings);
    setCustomTechnicians(tierRule.minTechnicians);
    setOfficeArea(tierRule.minOfficeSqFt);
  };

  // Base tier rule
  const tierRule: FranchiseRule = useMemo(() => {
    return FRANCHISE_RULES_BY_TIER[selectedTier];
  }, [selectedTier]);

  // Derived bookings count with scenario multiplier
  const effectiveBookings = useMemo(() => {
    const base = customBookings !== null ? customBookings : tierRule.monthlyTargetBookings;
    if (scenario === 'conservative') return Math.max(20, Math.round(base * 0.8));
    if (scenario === 'growth') return Math.round(base * 1.5);
    return base;
  }, [customBookings, tierRule, scenario]);

  // Effective technicians
  const effectiveTechnicians = useMemo(() => {
    if (customTechnicians !== null) return customTechnicians;
    return tierRule.minTechnicians;
  }, [customTechnicians, tierRule]);

  // 1. Initial Investment Calculations
  const initialInvestment = useMemo(() => {
    const franchiseFee = tierRule.franchiseFee;
    const securityDeposit = tierRule.securityDeposit;

    // Office Setup & Glow-sign branding (sq ft rate + board)
    const interiorRate = selectedTier === 'village' ? 80 : selectedTier === 'town' ? 120 : 160;
    const brandingSignBoard = selectedTier === 'village' ? 8000 : selectedTier === 'town' ? 15000 : 25000;
    const officeSetup = Math.round(officeArea * interiorRate) + brandingSignBoard;

    // IT, POS & Hardware Setup
    const itHardware = selectedTier === 'village' ? 15000 : selectedTier === 'town' ? 28000 : 45000;

    // Uniform, Starter Toolkit, ID cards per technician
    const kitPerTech = 1800;
    const technicianKits = effectiveTechnicians * kitPerTech;

    // Local Launch & Promotion Campaign
    const localPromotion = selectedTier === 'village' ? 5000 : selectedTier === 'town' ? 12000 : 25000;

    const total = franchiseFee + securityDeposit + officeSetup + itHardware + technicianKits + localPromotion;

    return {
      franchiseFee,
      securityDeposit,
      officeSetup,
      itHardware,
      technicianKits,
      localPromotion,
      total,
    };
  }, [tierRule, selectedTier, officeArea, effectiveTechnicians]);

  // 2. Monthly Revenue Projections
  const revenueProjections = useMemo(() => {
    const grossRevenue = effectiveBookings * averageOrderValue;

    // Technician payouts: 65% direct labor share
    const technicianPayouts = Math.round(grossRevenue * 0.65);

    // Mandatory Deepak Buildcon Royalty
    const baseRoyalty = Math.round(grossRevenue * (tierRule.royaltyPercent / 100));
    const mandatoryDeepakBuildconShare = Math.max(baseRoyalty, tierRule.minMonthlyRoyalty);

    // Operating expenses (Rent, Electricity, Local Ads, Supervisor)
    const rentEstimate = selectedTier === 'village' ? 3500 : selectedTier === 'town' ? 8000 : 18000;
    const utilitiesAndWifi = selectedTier === 'village' ? 1200 : selectedTier === 'town' ? 2500 : 4500;
    const marketingMonthly = selectedTier === 'village' ? 1500 : selectedTier === 'town' ? 4000 : 8000;
    const supervisorSalary = selectedTier === 'village' ? 0 : selectedTier === 'town' ? 9000 : 18000;
    const totalOpEx = rentEstimate + utilitiesAndWifi + marketingMonthly + supervisorSalary;

    // Partner Net Monthly Profit
    const partnerNetProfit = Math.max(
      0,
      grossRevenue - technicianPayouts - mandatoryDeepakBuildconShare - totalOpEx
    );

    const annualizedProfit = partnerNetProfit * 12;
    const roiMonths = (initialInvestment.total / Math.max(partnerNetProfit, 1000)).toFixed(1);

    return {
      grossRevenue,
      technicianPayouts,
      mandatoryDeepakBuildconShare,
      baseRoyalty,
      royaltyPercent: tierRule.royaltyPercent,
      minMonthlyRoyalty: tierRule.minMonthlyRoyalty,
      isFloorApplied: baseRoyalty < tierRule.minMonthlyRoyalty,
      totalOpEx,
      rentEstimate,
      utilitiesAndWifi,
      marketingMonthly,
      supervisorSalary,
      partnerNetProfit,
      annualizedProfit,
      roiMonths,
    };
  }, [effectiveBookings, averageOrderValue, tierRule, selectedTier, initialInvestment.total]);

  // 3. Chart Data: Monthly Cash Flow Distribution
  const breakdownChartData = useMemo(() => {
    return [
      {
        name: 'कारीगर भुगतान (65%)',
        amount: revenueProjections.technicianPayouts,
        color: '#3b82f6',
        share: '65%',
      },
      {
        name: 'दीपक बिल्डकॉन रॉयल्टी',
        amount: revenueProjections.mandatoryDeepakBuildconShare,
        color: '#ea580c',
        share: `${((revenueProjections.mandatoryDeepakBuildconShare / revenueProjections.grossRevenue) * 100).toFixed(1)}%`,
      },
      {
        name: 'ऑफिस व संचालन खर्च',
        amount: revenueProjections.totalOpEx,
        color: '#64748b',
        share: `${((revenueProjections.totalOpEx / revenueProjections.grossRevenue) * 100).toFixed(1)}%`,
      },
      {
        name: 'पार्टनर का शुद्ध लाभ',
        amount: revenueProjections.partnerNetProfit,
        color: '#10b981',
        share: `${((revenueProjections.partnerNetProfit / revenueProjections.grossRevenue) * 100).toFixed(1)}%`,
      },
    ];
  }, [revenueProjections]);

  // 4. Chart Data: 6-Month Ramp-up & Growth Trajectory
  const sixMonthTrajectoryData = useMemo(() => {
    const rampFactors = [0.5, 0.75, 1.0, 1.15, 1.3, 1.45];
    const months = ['माह 1 (लॉन्च)', 'माह 2', 'माह 3', 'माह 4', 'माह 5', 'माह 6'];

    return rampFactors.map((factor, i) => {
      const gmv = Math.round(revenueProjections.grossRevenue * factor);
      const deepakShare = Math.max(
        Math.round(gmv * (tierRule.royaltyPercent / 100)),
        tierRule.minMonthlyRoyalty
      );
      const techPayout = Math.round(gmv * 0.65);
      const opex = Math.round(revenueProjections.totalOpEx * (0.8 + factor * 0.2));
      const partnerProfit = Math.max(0, gmv - techPayout - deepakShare - opex);

      return {
        month: months[i],
        'सकल राजस्व (GMV)': gmv,
        'पार्टनर शुद्ध लाभ': partnerProfit,
        'दीपक बिल्डकॉन शेयर': deepakShare,
      };
    });
  }, [revenueProjections, tierRule]);

  // Construct Plan Details for Application handover
  const planDetails: PlanDetails = useMemo(() => {
    return {
      cityName: cityInput || 'Selected City',
      stateName: selectedState,
      districtName: selectedDistrict,
      areaType: selectedTier,
      totalInitialInvestment: initialInvestment.total,
      monthlyTargetBookings: effectiveBookings,
      expectedAov: averageOrderValue,
      projectedMonthlyGmv: revenueProjections.grossRevenue,
      mandatoryDeepakBuildconShare: revenueProjections.mandatoryDeepakBuildconShare,
      partnerNetMonthlyProfit: revenueProjections.partnerNetProfit,
      staffCount: effectiveTechnicians,
      officeAreaSqFt: officeArea,
    };
  }, [
    cityInput,
    selectedState,
    selectedDistrict,
    selectedTier,
    initialInvestment.total,
    effectiveBookings,
    averageOrderValue,
    revenueProjections,
    effectiveTechnicians,
    officeArea,
  ]);

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    const text = `*दीपक बिल्डकॉन (DEEPAK BUILDCON) फ्रेंचाइज़ी प्रस्ताव - ${planDetails.cityName}*
📍 शहर / क्षेत्र: ${planDetails.cityName} (${planDetails.districtName}, ${planDetails.stateName})
📊 स्तर: ${tierRule.hindiTitle}
💰 अनुमानित कुल प्रारंभिक निवेश: ₹${initialInvestment.total.toLocaleString('en-IN')}
• वन-टाइम फ्रेंचाइज़ी फीस: ₹${initialInvestment.franchiseFee.toLocaleString('en-IN')}
• रिफंडेबल सिक्योरिटी डिपॉजिट: ₹${initialInvestment.securityDeposit.toLocaleString('en-IN')}
• ऑफिस सेटअप व बोर्ड: ₹${initialInvestment.officeSetup.toLocaleString('en-IN')}
• आईटी उपकरण व किट: ₹${(initialInvestment.itHardware + initialInvestment.technicianKits).toLocaleString('en-IN')}

📈 मासिक राजस्व एवं लाभ अनुमान:
• लक्षित मासिक बुकिंग्स: ${effectiveBookings} जॉब्स/माह
• औसत टिकट साइज (AOV): ₹${averageOrderValue}
• अनुमानित मासिक सकल बिलिंग (GMV): ₹${revenueProjections.grossRevenue.toLocaleString('en-IN')}
• कारीगर भुगतान (65%): ₹${revenueProjections.technicianPayouts.toLocaleString('en-IN')}
• पार्टनर का शुद्ध मासिक लाभ: ₹${revenueProjections.partnerNetProfit.toLocaleString('en-IN')}

🏢 दीपक बिल्डकॉन को देय अनिवार्य मासिक हिस्सा:
• मासिक रॉयल्टी दर: ${tierRule.royaltyPercent}%
• न्यूनतम अनिवार्य गारंटी: ₹${tierRule.minMonthlyRoyalty.toLocaleString('en-IN')}
• कुल देय मासिक रॉयल्टी: ₹${revenueProjections.mandatoryDeepakBuildconShare.toLocaleString('en-IN')}
• देय तिथि: प्रत्येक माह की 5 तारीख

मैं इस शहर के लिए हार्डिनकाम फ्रेंचाइज़ी अनुबंध पर आगे चर्चा करना चाहता हूँ। कृपया मुझे विस्तृत मार्गदर्शन प्रदान करें।`;

    const encoded = encodeURIComponent(text);
    const url = `https://wa.me/916267546945?text=${encoded}`;
    window.open(url, '_blank');
  };

  // Copy Plan Link / Summary
  const handleCopySummary = () => {
    const summary = `HARDINKAAM by DEEPAK BUILDCON - Franchise Estimation for ${planDetails.cityName}:
Total Initial Investment: ₹${initialInvestment.total.toLocaleString('en-IN')}
Projected Monthly GMV: ₹${revenueProjections.grossRevenue.toLocaleString('en-IN')}
Mandatory Deepak Buildcon Monthly Share: ₹${revenueProjections.mandatoryDeepakBuildconShare.toLocaleString('en-IN')} (${tierRule.royaltyPercent}% / min ₹${tierRule.minMonthlyRoyalty.toLocaleString('en-IN')})
Partner Estimated Net Monthly Profit: ₹${revenueProjections.partnerNetProfit.toLocaleString('en-IN')}
Target Bookings: ${effectiveBookings}/month
Contact Head Office: ${DEEPAK_BUILDCON_OFFICIAL.officialPhone} | ${DEEPAK_BUILDCON_OFFICIAL.officialEmail}`;

    navigator.clipboard.writeText(summary);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div id="franchise-city-calculator-root" className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold border border-orange-500/30">
              <Calculator className="w-3.5 h-3.5 text-orange-400" />
              <span>दीपक बिल्डकॉन आधिकारिक फ्रेंचाइज़ी निवेश एवं लाभ कैलकुलेटर</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              अपने शहर के लिए फ्रेंचाइज़ी लागत व कमाई जानें
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              किसी भी शहर, ज़िले या गाँव का नाम दर्ज करें। हमारा एल्गोरिद्म आपके स्थान के अनुसार{' '}
              <strong>प्रारंभिक निवेश लागत</strong>, <strong>मासिक राजस्व</strong> और{' '}
              <strong>दीपक बिल्डकॉन को देय अनिवार्य मासिक हिस्सा</strong> तुरंत पारदर्शी रूप से कैलकुलेट करता है।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="calc-share-whatsapp-btn"
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-400/40"
              title="WhatsApp पर दीपक बिल्डकॉन हेड ऑफिस को प्रस्ताव भेजें"
            >
              <Share2 className="w-4 h-4" />
              <span>WhatsApp पर प्रस्ताव भेजें</span>
            </button>

            <button
              id="calc-open-print-btn"
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer"
              title="औपचारिक कोटेशन शीट प्रिंट करें"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट / PDF कोटेशन</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 0: City Input & Quick Select Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-wider mb-1">
              <MapPin className="w-4 h-4" />
              <span>चरण 1: अपने शहर का चयन करें (City Selection)</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-stone-900">
              आप किस शहर, कस्बे या गाँव में फ्रेंचाइज़ी स्थापित करना चाहते हैं?
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium">चयनित स्तर:</span>
            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
              {tierRule.hindiTitle}
            </span>
          </div>
        </div>

        {/* City Autocomplete Input Field */}
        <div className="relative">
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            शहर, ज़िला या गाँव का नाम टाइप करें (Type City Name):
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="franchise-calc-city-input"
              type="text"
              value={cityInput}
              onChange={(e) => {
                setCityInput(e.target.value);
                setShowCitySuggestions(true);
                setIsCustomCity(true);
              }}
              onFocus={() => setShowCitySuggestions(true)}
              placeholder="e.g. Bhopal, Indore, Jabalpur, Gwalior, Ujjain, Jaipur, Lucknow, Patna..."
              className="w-full pl-10 pr-24 py-3 rounded-2xl border border-stone-300 bg-stone-50/50 hover:bg-white focus:bg-white text-stone-900 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500 transition-all shadow-inner"
            />
            {cityInput && (
              <button
                type="button"
                onClick={() => {
                  setCityInput('');
                  setShowCitySuggestions(false);
                }}
                className="absolute right-3 top-2.5 px-2.5 py-1 text-xs text-stone-400 hover:text-stone-600 bg-stone-100 rounded-lg"
              >
                हटाएं
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {showCitySuggestions && matchingSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-stone-200 shadow-xl z-30 overflow-hidden divide-y divide-stone-100">
              <div className="p-2 bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center justify-between">
                <span>उपलब्ध शहर एवं क्षेत्र ({matchingSuggestions.length})</span>
                <span className="text-stone-400">चुनने के लिए क्लिक करें</span>
              </div>
              {matchingSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    handleSelectCity({
                      name: sug.cityName,
                      state: sug.state,
                      district: sug.district,
                      tier: sug.tier,
                    })
                  }
                  className="w-full px-4 py-2.5 text-left hover:bg-orange-50/60 flex items-center justify-between text-xs transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <div>
                      <span className="font-bold text-stone-900">{sug.cityName}</span>
                      <span className="text-stone-500 text-[11px] ml-1.5">
                        ({sug.hindiName}) • {sug.district}, {sug.state}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-semibold uppercase">
                    {sug.tier === 'village' ? 'गाँव' : sug.tier === 'town' ? 'कस्बा' : 'ज़िला / महानगर'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick-Select Popular Cities Pills */}
        <div>
          <div className="text-xs font-bold text-stone-500 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>लोकप्रिय शहर (तुरंत लोड करने के लिए क्लिक करें):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FEATURED_CITIES.map((fc) => (
              <button
                key={fc.name}
                type="button"
                onClick={() => handleSelectCity(fc)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  cityInput.toLowerCase() === fc.name.toLowerCase()
                    ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 hover:bg-stone-100 border-stone-200'
                }`}
              >
                {fc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tier Selector Override */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold text-stone-700">
            क्षेत्र की प्रशासनिक श्रेणी (Area Classification Tier):
          </span>
          <div className="inline-flex rounded-xl bg-stone-100 p-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setSelectedTier('district')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTier === 'district'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🏛️ ज़िला मुख्यालय / महानगर
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier('town')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTier === 'town'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🏙️ कस्बा / तहसील
            </button>
            <button
              type="button"
              onClick={() => setSelectedTier('village')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedTier === 'village'
                  ? 'bg-white text-stone-900 shadow-xs font-black'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              🌾 गाँव / ब्लॉक क्लस्टर
            </button>
          </div>
        </div>
      </div>

      {/* Scenario & Interactive Sliders */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4" />
              <span>मासिक लक्ष्य व कार्यबल सिमुलेटर (Scenario Simulation)</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              अपनी क्षमता व बाजार के अनुसार लक्ष्य समायोजित करें
            </h3>
          </div>

          {/* Scenario Toggle Pills */}
          <div className="inline-flex rounded-2xl bg-stone-800 p-1 border border-stone-700">
            <button
              type="button"
              onClick={() => setScenario('conservative')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'conservative'
                  ? 'bg-stone-700 text-amber-300 shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              रुढ़िवादी (80% बेस)
            </button>
            <button
              type="button"
              onClick={() => setScenario('realistic')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'realistic'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              अपेक्षित (100% टारगेट)
            </button>
            <button
              type="button"
              onClick={() => setScenario('growth')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                scenario === 'growth'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              उच्च विकास (150% टर्बो)
            </button>
          </div>
        </div>

        {/* 4 Interactive Simulation Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Monthly Bookings */}
          <div className="bg-stone-800/80 rounded-2xl p-4 border border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">अपेक्षित मासिक ऑर्डर्स:</span>
              <span className="font-mono font-black text-orange-400 text-sm">
                {effectiveBookings} जॉब्स
              </span>
            </div>
            <input
              id="slider-bookings"
              type="range"
              min={selectedTier === 'village' ? 20 : selectedTier === 'town' ? 50 : 100}
              max={selectedTier === 'village' ? 200 : selectedTier === 'town' ? 500 : 1200}
              step={10}
              value={effectiveBookings}
              onChange={(e) => setCustomBookings(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>न्यूनतम टारगेट: {tierRule.monthlyTargetBookings}</span>
              <span>अधिकतम: {selectedTier === 'district' ? '1200' : '500'}</span>
            </div>
          </div>

          {/* 2. Average Order Value */}
          <div className="bg-stone-800/80 rounded-2xl p-4 border border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">औसत बिलिंग (AOV):</span>
              <span className="font-mono font-black text-amber-300 text-sm">
                ₹{averageOrderValue} / सर्विस
              </span>
            </div>
            <input
              id="slider-aov"
              type="range"
              min={350}
              max={1500}
              step={25}
              value={averageOrderValue}
              onChange={(e) => setAverageOrderValue(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>सामान्य रिपेयर: ₹350</span>
              <span>कंप्रिहेंसिव: ₹1500+</span>
            </div>
          </div>

          {/* 3. Field Technicians */}
          <div className="bg-stone-800/80 rounded-2xl p-4 border border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">कारीगर / सर्विस टीम:</span>
              <span className="font-mono font-black text-blue-300 text-sm">
                {effectiveTechnicians} प्रोफेशनल्स
              </span>
            </div>
            <input
              id="slider-technicians"
              type="range"
              min={tierRule.minTechnicians}
              max={selectedTier === 'district' ? 50 : 25}
              step={1}
              value={effectiveTechnicians}
              onChange={(e) => setCustomTechnicians(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>अनिवार्य न्यूनतम: {tierRule.minTechnicians}</span>
              <span>अधिकतम: {selectedTier === 'district' ? '50' : '25'}</span>
            </div>
          </div>

          {/* 4. Office Area */}
          <div className="bg-stone-800/80 rounded-2xl p-4 border border-stone-700/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">ऑफिस स्पेस (Sq. Ft.):</span>
              <span className="font-mono font-black text-emerald-300 text-sm">
                {officeArea} वर्ग फीट
              </span>
            </div>
            <input
              id="slider-office-area"
              type="range"
              min={tierRule.minOfficeSqFt}
              max={selectedTier === 'district' ? 1000 : 500}
              step={25}
              value={officeArea}
              onChange={(e) => setOfficeArea(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>न्यूनतम आवश्यक: {tierRule.minOfficeSqFt} sq ft</span>
              <span>बड़ा सेंटर: 1000 sq ft</span>
            </div>
          </div>
        </div>
      </div>

      {/* THREE PILLAR CARDS: The Core Requirement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PILLAR 1: Estimated Initial Investment Costs */}
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                स्तंभ 1 (Pillar 1)
              </span>
              <Coins className="w-5 h-5 text-amber-200" />
            </div>
            <h4 className="text-base font-black">प्रारंभिक निवेश लागत (Initial Investment)</h4>
            <p className="text-xs text-amber-100 mt-0.5">
              {planDetails.cityName} में फ्रेंचाइज़ी शुरू करने हेतु कुल पूंजी
            </p>
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3 text-xs divide-y divide-stone-100">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-stone-800">ब्रांड लाइसेंस व फ्रेंचाइज़ी फीस</div>
                  <div className="text-[10px] text-stone-400">एकमुश्त, आजीवन पार्टनरशिप</div>
                </div>
                <span className="font-mono font-bold text-stone-900">
                  ₹{initialInvestment.franchiseFee.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">सिक्योरिटी डिपॉजिट (रिफंडेबल)</div>
                  <div className="text-[10px] text-emerald-600 font-medium">100% सुरक्षित एवं वापसी योग्य</div>
                </div>
                <span className="font-mono font-bold text-stone-900">
                  ₹{initialInvestment.securityDeposit.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">ऑफिस इंटीरियर व ग्लो-साइन बोर्ड</div>
                  <div className="text-[10px] text-stone-400">{officeArea} Sq Ft + LED साइन बोर्ड</div>
                </div>
                <span className="font-mono font-bold text-stone-900">
                  ₹{initialInvestment.officeSetup.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">आईटी हार्डवेयर व बिलिंग प्रिंटर</div>
                  <div className="text-[10px] text-stone-400">वर्कस्टेशन, थर्मल प्रिंटर, बायोमेट्रिक</div>
                </div>
                <span className="font-mono font-bold text-stone-900">
                  ₹{initialInvestment.itHardware.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">कारीगर किट, वर्दी व आई-कार्ड्स</div>
                  <div className="text-[10px] text-stone-400">{effectiveTechnicians} तकनीशियनों हेतु कंपनी किट</div>
                </div>
                <span className="font-mono font-bold text-stone-900">
                  ₹{initialInvestment.technicianKits.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">स्थानीय लॉन्च व प्रचार अभियान</div>
                  <div className="text-[10px] text-stone-400">पम्फलेट्स, बैनर व स्थानीय सोशल मीडिया</div>
                </div>
                <span className="font-mono font-bold text-stone-900">
                  ₹{initialInvestment.localPromotion.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <div className="flex items-center justify-between text-xs text-amber-900 mb-1">
                <span className="font-bold">कुल प्रारंभिक अनुमानित पूंजी:</span>
                <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-full font-bold">
                  All-Inclusive
                </span>
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono">
                ₹{initialInvestment.total.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-amber-800 mt-1">
                (सुरक्षित रिफंडेबल डिपॉजिट ₹{initialInvestment.securityDeposit.toLocaleString('en-IN')} शामिल)
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 2: Monthly Revenue Projections */}
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                स्तंभ 2 (Pillar 2)
              </span>
              <TrendingUp className="w-5 h-5 text-emerald-200" />
            </div>
            <h4 className="text-base font-black">मासिक राजस्व एवं लाभ अनुमान (Revenue &amp; Profit)</h4>
            <p className="text-xs text-emerald-100 mt-0.5">
              मासिक बिलिंग, कारीगर शेयर एवं पार्टनर का शुद्ध लाभ
            </p>
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3 text-xs divide-y divide-stone-100">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-stone-800">अनुमानित मासिक सकल बिलिंग (GMV)</div>
                  <div className="text-[10px] text-stone-400">
                    {effectiveBookings} बुकिंग्स × ₹{averageOrderValue} AOV
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  ₹{revenueProjections.grossRevenue.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">कारीगरों का भुगतान (Direct Labor 65%)</div>
                  <div className="text-[10px] text-stone-400">फील्ड तकनीशियनों का पारिश्रमिक</div>
                </div>
                <span className="font-mono font-bold text-blue-700">
                  -₹{revenueProjections.technicianPayouts.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">दीपक बिल्डकॉन मासिक रॉयल्टी ({tierRule.royaltyPercent}%)</div>
                  <div className="text-[10px] text-stone-400">कंपनी सॉफ्टवेयर, ब्रांड व 24x7 सपोर्ट</div>
                </div>
                <span className="font-mono font-bold text-orange-600">
                  -₹{revenueProjections.mandatoryDeepakBuildconShare.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">ऑफिस किराया, बिजली व संचालन खर्च</div>
                  <div className="text-[10px] text-stone-400">किराया, वाईफाई, सुपरवाइजर मानदेय</div>
                </div>
                <span className="font-mono font-bold text-stone-600">
                  -₹{revenueProjections.totalOpEx.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">निवेश वापसी समयावधि (Payback / ROI)</div>
                  <div className="text-[10px] text-stone-400">पूंजी रिकवरी का अनुमानित समय</div>
                </div>
                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  लगभग {revenueProjections.roiMonths} माह
                </span>
              </div>
            </div>

            {/* Net Partner Profit Highlight */}
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between text-xs text-emerald-900 mb-1">
                <span className="font-bold">पार्टनर का शुद्ध मासिक लाभ (Net Monthly Take-Home):</span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                  टैक्स पूर्व लाभ
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-950 font-mono">
                ₹{revenueProjections.partnerNetProfit.toLocaleString('en-IN')}
                <span className="text-xs font-semibold text-emerald-700 ml-1.5">/ माह</span>
              </div>
              <div className="text-[11px] text-emerald-800 mt-1 font-medium">
                वार्षिक अनुमानित लाभ: <strong>₹{revenueProjections.annualizedProfit.toLocaleString('en-IN')} / वर्ष</strong>
              </div>
            </div>
          </div>
        </div>

        {/* PILLAR 3: Mandatory Monthly Share Payable to Deepak Buildcon */}
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm flex flex-col">
          <div className="bg-gradient-to-r from-orange-600 to-amber-700 p-5 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                स्तंभ 3 (Pillar 3)
              </span>
              <ShieldCheck className="w-5 h-5 text-orange-200" />
            </div>
            <h4 className="text-base font-black">दीपक बिल्डकॉन को देय अनिवार्य मासिक हिस्सा</h4>
            <p className="text-xs text-orange-100 mt-0.5">
              Mandatory Monthly Share Payable to Deepak Buildcon
            </p>
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-3 text-xs divide-y divide-stone-100">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-stone-800">अनुबंधित रॉयल्टी दर</div>
                  <div className="text-[10px] text-stone-400">स्थान के स्तर अनुसार तय प्रतिशत</div>
                </div>
                <span className="font-mono font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">
                  {tierRule.royaltyPercent}% of GMV
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">मासिक टर्नओवर पर सामान्य रॉयल्टी</div>
                  <div className="text-[10px] text-stone-400">
                    ₹{revenueProjections.grossRevenue.toLocaleString('en-IN')} का {tierRule.royaltyPercent}%
                  </div>
                </div>
                <span className="font-mono font-bold text-stone-800">
                  ₹{revenueProjections.baseRoyalty.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">न्यूनतम अनिवार्य मासिक गारंटी (Floor)</div>
                  <div className="text-[10px] text-stone-400">कम टर्नओवर होने पर भी अनिवार्य</div>
                </div>
                <span className="font-mono font-bold text-stone-800">
                  ₹{tierRule.minMonthlyRoyalty.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">क्लाउड ERP व सॉफ्टवेयर यूजर फीस</div>
                  <div className="text-[10px] text-emerald-600 font-medium">कंपनी द्वारा पूर्णतया माफ (Included)</div>
                </div>
                <span className="font-mono font-bold text-emerald-700">₹0 (फ्री)</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">रॉयल्टी भुगतान देय तिथि (Due Date)</div>
                  <div className="text-[10px] text-stone-400">हर महीने के पहले सप्ताह में</div>
                </div>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  प्रत्येक माह की 5 तारीख
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-bold text-stone-800">हेड ऑफिस गवर्नेंस प्राधिकरण</div>
                  <div className="text-[10px] text-stone-400">दीपक बिल्डकॉन कॉर्पोरेट हब, भोपाल</div>
                </div>
                <span className="font-bold text-stone-700">DEEPAK (MD)</span>
              </div>
            </div>

            {/* Mandatory Payable Amount Box */}
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-300">
              <div className="flex items-center justify-between text-xs text-orange-950 mb-1">
                <span className="font-bold">दीपक बिल्डकॉन को देय अनिवार्य मासिक हिस्सा:</span>
                <span className="text-[10px] bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-black">
                  {revenueProjections.isFloorApplied ? 'न्यूनतम गारंटी लागू' : 'प्रतिशत आधारित'}
                </span>
              </div>
              <div className="text-2xl font-black text-orange-950 font-mono">
                ₹{revenueProjections.mandatoryDeepakBuildconShare.toLocaleString('en-IN')}
                <span className="text-xs font-semibold text-orange-800 ml-1.5">/ माह</span>
              </div>
              <div className="text-[11px] text-orange-800 mt-1 leading-tight">
                (सकल बिलिंग का {tierRule.royaltyPercent}% या न्यूनतम ₹{tierRule.minMonthlyRoyalty.toLocaleString('en-IN')}, जो भी अधिक हो)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION: Visualizing Breakdown & 6-Month Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Revenue Distribution Bar Chart */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">राजस्व विभाजन</span>
              <h4 className="text-sm font-black text-stone-900">मासिक कुल बिलिंग का वितरण (Share Breakdown)</h4>
            </div>
            <span className="text-xs font-mono font-bold text-stone-500">
              कुल: ₹{revenueProjections.grossRevenue.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdownChartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#334155' }}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-stone-900/95 backdrop-blur-md text-white p-3 rounded-xl border border-stone-700 shadow-xl text-xs space-y-1">
                          <div className="font-bold">{item.name}</div>
                          <div className="text-amber-300 font-mono text-sm font-black">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-stone-300 text-[11px]">कुल GMV का: {item.share}</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                  {breakdownChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-[11px]">
            <div className="flex items-center gap-1.5 text-stone-600">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>कारीगर: 65%</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-600">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-600" />
              <span>दीपक बिल्डकॉन: {tierRule.royaltyPercent}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-600">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>ऑफिस खर्च</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-600">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>पार्टनर शुद्ध लाभ</span>
            </div>
          </div>
        </div>

        {/* 6-Month Projected Growth Trajectory Area Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">विकास प्रक्षेपवक्र</span>
              <h4 className="text-sm font-black text-stone-900">
                {planDetails.cityName} फ्रेंचाइज़ी 6-माह विकास अनुमान (Ramp-up Trajectory)
              </h4>
            </div>
            <span className="text-xs text-stone-500 font-medium bg-stone-100 px-2.5 py-1 rounded-lg">
              माह 1 से माह 6 तक स्थिर वृद्धि
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sixMonthTrajectoryData}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis
                  tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-stone-900/95 backdrop-blur-md text-white p-3.5 rounded-xl border border-stone-700 shadow-xl text-xs space-y-1.5">
                          <div className="font-bold text-amber-300">{label}</div>
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4">
                              <span className="text-stone-300">{p.name}:</span>
                              <span className="font-mono font-bold" style={{ color: p.color }}>
                                ₹{p.value.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area
                  type="monotone"
                  dataKey="सकल राजस्व (GMV)"
                  stroke="#ea580c"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gmvGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="पार्टनर शुद्ध लाभ"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[11px] text-stone-500 pt-1">
            *नोट: यह अनुमान प्रारंभिक प्रचार, सेवा गुणवत्ता और ग्राहक समीक्षाओं के आधार पर परिकल्पित है।
            वास्तविक परिणाम कार्यबल की कार्यक्षमता पर निर्भर करेंगे।
          </p>
        </div>
      </div>

      {/* Official Settlement & Compliance Note */}
      <div className="bg-amber-50/80 rounded-3xl p-6 border border-amber-200 text-xs text-amber-950 space-y-3">
        <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
          <ShieldCheck className="w-5 h-5 text-amber-700" />
          <span>दीपक बिल्डकॉन रॉयल्टी भुगतान एवं अनुबंध नियम (Compliance Guidelines)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-stone-700">
          <div className="bg-white/70 p-3.5 rounded-xl border border-amber-200/60">
            <div className="font-bold text-stone-900 mb-1">1. मासिक रिपोर्टिंग व ऑडिट</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              प्रत्येक माह की 1 तारीख को हेड ऑफिस डैशबोर्ड द्वारा ऑटोमेटेड बिलिंग स्टेटमेंट जारी किया जाता है।
            </p>
          </div>
          <div className="bg-white/70 p-3.5 rounded-xl border border-amber-200/60">
            <div className="font-bold text-stone-900 mb-1">2. अनिवार्य 5 तारीख की समयसीमा</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              दीपक बिल्डकॉन को देय अनिवार्य हिस्सा (₹{revenueProjections.mandatoryDeepakBuildconShare.toLocaleString('en-IN')}) माह की 5 तारीख तक RTGS/NEFT द्वारा हस्तांतरित करना अनिवार्य है।
            </p>
          </div>
          <div className="bg-white/70 p-3.5 rounded-xl border border-amber-200/60">
            <div className="font-bold text-stone-900 mb-1">3. एक्सक्लूसिव टेरिटरी संरक्षण</div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              टारगेट पूरा रहने तक आपके शहर / ज़िले में किसी अन्य फ्रेंचाइज़ी को कार्यक्षेत्र नहीं सौंपा जाएगा।
            </p>
          </div>
        </div>
      </div>

      {/* Action CTA Bar: Apply with Plan or Share */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="text-orange-400 font-bold text-xs uppercase tracking-wider mb-1">
            तैयार हैं? अगला कदम उठाएं (Next Action)
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            {planDetails.cityName} में अपनी फ्रेंचाइज़ी यात्रा शुरू करें
          </h3>
          <p className="text-xs text-stone-300 mt-1 max-w-xl">
            कैलकुलेटर द्वारा तैयार इस अनुमान के साथ आवेदन फॉर्म भरें। सभी आंकड़े (निवेश बजट ₹
            {initialInvestment.total.toLocaleString('en-IN')}, स्टाफ {effectiveTechnicians}, ऑफिस {officeArea} sq ft)
            स्वतः फॉर्म में ट्रांसफर हो जाएंगे।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {onApplyWithPlan && (
            <button
              id="calc-apply-with-plan-btn"
              type="button"
              onClick={() => onApplyWithPlan(planDetails)}
              className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-950/50 transition-all cursor-pointer hover:scale-102"
            >
              <span>इस अनुमान के साथ आवेदन करें</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCopySummary}
            className="px-4 py-3.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-2 border border-stone-700 transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>{copiedLink ? 'कॉपी हो गया!' : 'समरी कॉपी करें'}</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE QUOTATION MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-stone-200 my-8 space-y-6 text-stone-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-stone-200">
              <div>
                <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                  DEEPAK BUILDCON OFFICIAL FRANCHISE QUOTATION
                </div>
                <h3 className="text-2xl font-black text-stone-950 mt-1">
                  हार्डिनकाम फ्रेंचाइज़ी वित्तीय आंकलन पत्र
                </h3>
                <p className="text-xs text-stone-500">
                  प्रस्तावित स्थान: <strong>{planDetails.cityName}</strong> ({planDetails.districtName}, {planDetails.stateName}) • दिनांक: {new Date().toLocaleDateString('hi-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-2 rounded-full hover:bg-stone-100 text-stone-500"
              >
                ✕
              </button>
            </div>

            {/* Quotation Body */}
            <div className="space-y-6 text-xs">
              {/* Company Info */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-black text-stone-900">{DEEPAK_BUILDCON_OFFICIAL.companyName}</div>
                  <div className="text-stone-500">{DEEPAK_BUILDCON_OFFICIAL.headOffice}</div>
                </div>
                <div className="text-right text-stone-600">
                  <div>फोन: {DEEPAK_BUILDCON_OFFICIAL.officialPhone}</div>
                  <div>ईमेल: {DEEPAK_BUILDCON_OFFICIAL.officialEmail}</div>
                </div>
              </div>

              {/* Table 1: Initial Investment */}
              <div>
                <h5 className="font-bold text-stone-900 text-sm mb-2">1. प्रारंभिक पूंजी निवेश ब्रेकडाउन:</h5>
                <table className="w-full text-left border border-stone-200 rounded-xl overflow-hidden">
                  <thead className="bg-stone-100 text-stone-600 text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5">मद (Item Description)</th>
                      <th className="p-2.5">प्रकार</th>
                      <th className="p-2.5 text-right">रकम (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="p-2.5 font-medium">फ्रेंचाइज़ी ब्रांड लाइसेंस फीस</td>
                      <td className="p-2.5 text-stone-500">एकमुश्त (Non-Refundable)</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{initialInvestment.franchiseFee.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">सिक्योरिटी डिपॉजिट</td>
                      <td className="p-2.5 text-emerald-600 font-semibold">100% रिफंडेबल</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{initialInvestment.securityDeposit.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">ऑफिस सेटअप, ग्लो-साइन बोर्ड ({officeArea} sq ft)</td>
                      <td className="p-2.5 text-stone-500">इंटीरियर व ब्रांडिंग</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{initialInvestment.officeSetup.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">आईटी उपकरण, पीओएस व थर्मल प्रिंटर</td>
                      <td className="p-2.5 text-stone-500">हार्डवेयर</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{initialInvestment.itHardware.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">कारीगर किट्स व वर्दी ({effectiveTechnicians} सदस्य)</td>
                      <td className="p-2.5 text-stone-500">कंपनी वर्दी व बैग</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{initialInvestment.technicianKits.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">स्थानीय शुभारंभ एवं प्रचार</td>
                      <td className="p-2.5 text-stone-500">मार्केटिंग</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{initialInvestment.localPromotion.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-amber-50/60 font-black">
                      <td colSpan={2} className="p-2.5 text-amber-950">कुल प्रारंभिक निवेश (Grand Total Initial Investment)</td>
                      <td className="p-2.5 text-right font-mono text-amber-900 text-sm">₹{initialInvestment.total.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Table 2: Monthly Projections & Deepak Buildcon Share */}
              <div>
                <h5 className="font-bold text-stone-900 text-sm mb-2">2. मासिक राजस्व, खर्च एवं दीपक बिल्डकॉन अनिवार्य हिस्सा:</h5>
                <table className="w-full text-left border border-stone-200 rounded-xl overflow-hidden">
                  <thead className="bg-stone-100 text-stone-600 text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5">विवरण</th>
                      <th className="p-2.5 text-right">रकम (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="p-2.5 font-medium">मासिक सकल बिलिंग (GMV) [{effectiveBookings} बुकिंग्स @ ₹{averageOrderValue}]</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-700">₹{revenueProjections.grossRevenue.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">कारीगरों का पारिश्रमिक (65%)</td>
                      <td className="p-2.5 text-right font-mono font-bold text-blue-700">-₹{revenueProjections.technicianPayouts.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-orange-50 font-bold">
                      <td className="p-2.5 text-orange-950">
                        दीपक बिल्डकॉन को देय अनिवार्य मासिक हिस्सा ({tierRule.royaltyPercent}% / न्यूनतम ₹{tierRule.minMonthlyRoyalty.toLocaleString('en-IN')})
                      </td>
                      <td className="p-2.5 text-right font-mono text-orange-900 text-sm">-₹{revenueProjections.mandatoryDeepakBuildconShare.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">ऑफिस किराया, बिजली, वाईफाई व संचालन खर्च</td>
                      <td className="p-2.5 text-right font-mono font-bold text-stone-600">-₹{revenueProjections.totalOpEx.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr className="bg-emerald-50 font-black">
                      <td className="p-2.5 text-emerald-950">पार्टनर का शुद्ध अनुमानित मासिक लाभ (Net Monthly Profit)</td>
                      <td className="p-2.5 text-right font-mono text-emerald-900 text-base">₹{revenueProjections.partnerNetProfit.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Official Bank Account for Royalty Settlement */}
              <div className="bg-stone-100 p-4 rounded-2xl border border-stone-300 space-y-1 text-[11px]">
                <div className="font-bold text-stone-900">दीपक बिल्डकॉन आधिकारिक बैंक खाता (रॉयल्टी हस्तांतरण हेतु):</div>
                <div className="text-stone-700">
                  खाता नाम: <strong>DEEPAK BUILDCON INFRA &amp; SERVICES</strong> • बैंक: <strong>State Bank of India</strong>, MP Nagar Bhopal
                </div>
                <div className="text-stone-700">
                  खाता संख्या: <strong>3984002100054812</strong> • IFSC कोड: <strong>SBIN0003820</strong> • UPI: <strong>deepakbuildcon@sbi</strong>
                </div>
                <div className="text-stone-500 pt-1">
                  देय तिथि: प्रत्येक माह की 5 तारीख | गवर्नेंस: DEEPAK (प्रबंध निदेशक)
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium text-xs"
              >
                बंद करें
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>अभी प्रिंट करें (Print Quotation)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

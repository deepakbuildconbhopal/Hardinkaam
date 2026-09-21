import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  TrendingUp,
  DollarSign,
  MapPin,
  Calendar,
  ArrowUpRight,
  ArrowRight,
  Layers,
  Sparkles,
  Award,
  RefreshCw,
  BarChart3,
  LineChart as LineChartIcon,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FranchiseApplication, FranchiseCityReport } from '../../types';

interface Props {
  onSelectTab: (tab: string) => void;
}

// Key city definitions with brand colors for distinct chart lines
export const FRANCHISE_CITIES_CONFIG = [
  { id: 'bhopal', name: 'भोपाल (Bhopal H.Q.)', shortName: 'Bhopal', color: '#ea580c', tier: 'district', feePerUnit: 100000, royaltyRate: '15%' },
  { id: 'indore', name: 'इंदौर (Indore Metro)', shortName: 'Indore', color: '#0284c7', tier: 'district', feePerUnit: 100000, royaltyRate: '15%' },
  { id: 'jabalpur', name: 'जबलपुर (Jabalpur)', shortName: 'Jabalpur', color: '#059669', tier: 'district', feePerUnit: 100000, royaltyRate: '15%' },
  { id: 'gwalior', name: 'ग्वालियर (Gwalior)', shortName: 'Gwalior', color: '#7c3aed', tier: 'district', feePerUnit: 100000, royaltyRate: '15%' },
  { id: 'lucknow', name: 'लखनऊ (Lucknow Hub)', shortName: 'Lucknow', color: '#e11d48', tier: 'district', feePerUnit: 100000, royaltyRate: '15%' },
  { id: 'raipur', name: 'रायपुर (Raipur Hub)', shortName: 'Raipur', color: '#d97706', tier: 'district', feePerUnit: 100000, royaltyRate: '15%' },
  { id: 'townClusters', name: 'तहसील व कस्बे (Town Clusters)', shortName: 'Towns', color: '#0891b2', tier: 'town', feePerUnit: 40000, royaltyRate: '12%' },
  { id: 'villageClusters', name: 'ग्राम पंचायत (Rural Clusters)', shortName: 'Villages', color: '#475569', tier: 'village', feePerUnit: 15000, royaltyRate: '10%' },
];

// Baseline multi-month historical franchise revenue data (past 8 months)
// Reflecting upfront onboarding fees when new centers were allocated + recurring monthly royalties
export const SEED_MONTHLY_FRANCHISE_REVENUE = [
  {
    monthKey: '2024-03',
    monthLabel: 'मार्च (Mar)',
    bhopal: 142750, // 100k fee + 42.75k royalty
    indore: 100000, // New district fee
    jabalpur: 39000, // Monthly royalty
    gwalior: 100000, // New district onboarding fee
    lucknow: 46500, // Monthly royalty
    raipur: 15000, // Base royalty
    townClusters: 53800, // 40k new fee + 13.8k royalty
    villageClusters: 18800, // 15k fee + 3.8k royalty
    totalFranchiseFees: 255000,
    totalRoyalties: 160850,
    grandTotal: 415850,
  },
  {
    monthKey: '2024-04',
    monthLabel: 'अप्रैल (Apr)',
    bhopal: 148500,
    indore: 151750, // 100k additional center expansion + 51.75k royalty
    jabalpur: 42000,
    gwalior: 22500,
    lucknow: 49200,
    raipur: 18000,
    townClusters: 58000,
    villageClusters: 19500,
    totalFranchiseFees: 140000,
    totalRoyalties: 369450,
    grandTotal: 509450,
  },
  {
    monthKey: '2024-05',
    monthLabel: 'मई (May)',
    bhopal: 155000,
    indore: 162000,
    jabalpur: 146000, // 100k sub-hub fee + 46k royalty
    gwalior: 28000,
    lucknow: 154000, // 100k East Lucknow fee + 54k royalty
    raipur: 118000, // 100k New Raipur District Center + 18k royalty
    townClusters: 64500,
    villageClusters: 22000,
    totalFranchiseFees: 340000,
    totalRoyalties: 409500,
    grandTotal: 749500,
  },
  {
    monthKey: '2024-06',
    monthLabel: 'जून (Jun)',
    bhopal: 164000,
    indore: 178000,
    jabalpur: 52000,
    gwalior: 34500,
    lucknow: 62000,
    raipur: 26000,
    townClusters: 108000, // 80k two new town centers + 28k royalties
    villageClusters: 37500, // 30k two new villages + 7.5k royalties
    totalFranchiseFees: 210000,
    totalRoyalties: 452000,
    grandTotal: 662000,
  },
  {
    monthKey: '2024-07',
    monthLabel: 'जुलाई (Jul)',
    bhopal: 172000,
    indore: 194000,
    jabalpur: 58000,
    gwalior: 139000, // 100k Morar center + 39k royalty
    lucknow: 71000,
    raipur: 32000,
    townClusters: 76000,
    villageClusters: 27000,
    totalFranchiseFees: 155000,
    totalRoyalties: 614000,
    grandTotal: 769000,
  },
  {
    monthKey: '2024-08',
    monthLabel: 'अगस्त (Aug)',
    bhopal: 181000,
    indore: 215000,
    jabalpur: 64000,
    gwalior: 46000,
    lucknow: 182000, // 100k Gomti Nagar Hub + 82k royalty
    raipur: 39000,
    townClusters: 86000,
    villageClusters: 31000,
    totalFranchiseFees: 195000,
    totalRoyalties: 649000,
    grandTotal: 844000,
  },
  {
    monthKey: '2024-09',
    monthLabel: 'सितंबर (Sep)',
    bhopal: 192000,
    indore: 238000,
    jabalpur: 71000,
    gwalior: 52000,
    lucknow: 95000,
    raipur: 148000, // 100k Bhilai-Durg Twin Hub + 48k royalty
    townClusters: 96000,
    villageClusters: 36000,
    totalFranchiseFees: 180000,
    totalRoyalties: 748000,
    grandTotal: 928000,
  },
  {
    monthKey: '2024-10',
    monthLabel: 'अक्टूबर (Current Oct)',
    bhopal: 205000,
    indore: 265000,
    jabalpur: 79000,
    gwalior: 59000,
    lucknow: 108000,
    raipur: 56000,
    townClusters: 108000,
    villageClusters: 42000,
    totalFranchiseFees: 200000,
    totalRoyalties: 722000,
    grandTotal: 922000,
  },
];

export const AdminFranchiseRevenueSummary: React.FC<Props> = ({ onSelectTab }) => {
  const [viewMode, setViewMode] = useState<'city_trends' | 'revenue_streams' | 'city_bars'>('city_trends');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'6m' | 'all'>('all');
  const [liveApplications, setLiveApplications] = useState<FranchiseApplication[]>([]);
  const [liveCities, setLiveCities] = useState<FranchiseCityReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Fetch live applications & cities from Firestore
  useEffect(() => {
    let isMounted = true;
    const loadFranchiseData = async () => {
      setLoading(true);
      try {
        const appsSnap = await getDocs(collection(db, 'franchise_applications'));
        if (isMounted && !appsSnap.empty) {
          const apps: FranchiseApplication[] = [];
          appsSnap.forEach((doc) => {
            apps.push({ id: doc.id, ...doc.data() } as FranchiseApplication);
          });
          setLiveApplications(apps);
        }

        const citiesSnap = await getDocs(collection(db, 'franchise_cities'));
        if (isMounted && !citiesSnap.empty) {
          const cities: FranchiseCityReport[] = [];
          citiesSnap.forEach((doc) => {
            cities.push(doc.data() as FranchiseCityReport);
          });
          setLiveCities(cities);
        }
      } catch (err) {
        console.warn('Franchise revenue Firestore sync notice:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadFranchiseData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter time range and enrich each month with MoM percentage growth trends
  const chartData = useMemo(() => {
    const raw = timeRange === '6m' ? SEED_MONTHLY_FRANCHISE_REVENUE.slice(-6) : SEED_MONTHLY_FRANCHISE_REVENUE;

    return raw.map((item) => {
      // Find previous month in original dataset to calculate accurate MoM even for sliced start
      const fullIdx = SEED_MONTHLY_FRANCHISE_REVENUE.findIndex((m) => m.monthKey === item.monthKey);
      const prev = fullIdx > 0 ? SEED_MONTHLY_FRANCHISE_REVENUE[fullIdx - 1] : null;

      const grandTotalDiff = prev ? item.grandTotal - prev.grandTotal : 0;
      const grandTotalGrowth =
        prev && prev.grandTotal > 0
          ? Number(((grandTotalDiff / prev.grandTotal) * 100).toFixed(1))
          : null;

      const feesDiff = prev ? item.totalFranchiseFees - prev.totalFranchiseFees : 0;
      const feesGrowth =
        prev && prev.totalFranchiseFees > 0
          ? Number(((feesDiff / prev.totalFranchiseFees) * 100).toFixed(1))
          : null;

      const royaltiesDiff = prev ? item.totalRoyalties - prev.totalRoyalties : 0;
      const royaltiesGrowth =
        prev && prev.totalRoyalties > 0
          ? Number(((royaltiesDiff / prev.totalRoyalties) * 100).toFixed(1))
          : null;

      // City-by-city figures and growth rates
      const cityMetrics: Record<
        string,
        { current: number; prev: number; diff: number; growth: number | null }
      > = {};

      FRANCHISE_CITIES_CONFIG.forEach((city) => {
        const cur = (item as any)[city.id] || 0;
        const p = prev ? ((prev as any)[city.id] || 0) : 0;
        const d = cur - p;
        const g = p > 0 ? Number(((d / p) * 100).toFixed(1)) : null;
        cityMetrics[city.id] = { current: cur, prev: p, diff: d, growth: g };
      });

      return {
        ...item,
        prevGrandTotal: prev ? prev.grandTotal : 0,
        grandTotalDiff,
        grandTotalGrowth,
        prevFranchiseFees: prev ? prev.totalFranchiseFees : 0,
        feesDiff,
        feesGrowth,
        prevRoyalties: prev ? prev.totalRoyalties : 0,
        royaltiesDiff,
        royaltiesGrowth,
        cityMetrics,
      };
    });
  }, [timeRange]);

  // Aggregate high-level stats
  const stats = useMemo(() => {
    const allMonths = SEED_MONTHLY_FRANCHISE_REVENUE;
    const latestMonth = allMonths[allMonths.length - 1];
    const previousMonth = allMonths[allMonths.length - 2];

    const allTimeTotal = allMonths.reduce((acc, curr) => acc + curr.grandTotal, 0);
    const allTimeFees = allMonths.reduce((acc, curr) => acc + curr.totalFranchiseFees, 0);
    const allTimeRoyalties = allMonths.reduce((acc, curr) => acc + curr.totalRoyalties, 0);

    // MoM Growth calculation for total
    const momGrowthPercent = previousMonth
      ? (((latestMonth.grandTotal - previousMonth.grandTotal) / previousMonth.grandTotal) * 100).toFixed(1)
      : '0.0';

    // City-wise performance rankings in latest month
    const cityPerformances = FRANCHISE_CITIES_CONFIG.map((city) => {
      const currentVal = (latestMonth as any)[city.id] || 0;
      const prevVal = (previousMonth as any)[city.id] || 1;
      const growth = (((currentVal - prevVal) / prevVal) * 100).toFixed(1);
      return {
        ...city,
        currentRevenue: currentVal,
        previousRevenue: prevVal,
        growth: Number(growth),
      };
    }).sort((a, b) => b.currentRevenue - a.currentRevenue);

    const topCity = cityPerformances[0] || { id: 'bhopal', name: 'भोपाल (Bhopal)', shortName: 'भोपाल', currentRevenue: 0, growth: 0, tier: 'district' };
    const fastestGrowing = [...cityPerformances].sort((a, b) => b.growth - a.growth)[0] || topCity;

    return {
      allTimeTotal: allTimeTotal || 0,
      allTimeFees: allTimeFees || 0,
      allTimeRoyalties: allTimeRoyalties || 0,
      thisMonthTotal: latestMonth?.grandTotal || 0,
      thisMonthFees: latestMonth?.totalFranchiseFees || 0,
      thisMonthRoyalties: latestMonth?.totalRoyalties || 0,
      momGrowthPercent,
      cityPerformances,
      topCity,
      fastestGrowing,
      activeUnitsCount: 8 + liveApplications.filter((a) => a.status === 'approved' || a.status === 'active').length,
    };
  }, [liveApplications, liveCities]);

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 sm:p-7 space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-stone-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-2">
            <Building2 className="w-3.5 h-3.5 text-orange-600" />
            <span>दीपकत बिल्डकॉन (DEEPAK BUILDCON) आल-इंडिया नेटवर्क</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <span>फ्रेंचाइज़ी फीस व रॉयल्टी मासिक राजस्व रिपोर्ट</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
              +{stats.momGrowthPercent}% MoM
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
            प्रत्येक शहर से अर्जित ऑनबोर्डिंग फ्रेंचाइज़ी लाइसेंस फीस (₹15,000 – ₹1,00,000) तथा मासिक 10%–15% रॉयल्टी का रीचार्ज विज़ुअल एनालिसिस।
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Time range selector */}
          <div className="inline-flex p-1 rounded-2xl bg-stone-100 border border-stone-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeRange === '6m' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              पिछले 6 माह
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeRange === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              सम्पूर्ण अवधि (8 माह)
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('admin_franchise')}
            className="px-4 py-2 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer hover:shadow-orange-900/20"
          >
            <span>विस्तृत शहर रिपोर्ट</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Franchise Revenue */}
        <div className="bg-gradient-to-br from-orange-50/80 to-amber-50/60 p-4 sm:p-5 rounded-2xl border border-orange-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-orange-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">कुल फ्रेंचाइज़ी राजस्व</span>
            <DollarSign className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">
            ₹{(stats.allTimeTotal || 0).toLocaleString('en-IN')}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-800 font-semibold">
            <span className="inline-flex items-center text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md font-bold text-[10px]">
              +{stats.momGrowthPercent}% ▲
            </span>
            <span>इस माह: ₹{(stats.thisMonthTotal || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Card 2: One-time Franchise Licensing Fees */}
        <div className="bg-gradient-to-br from-blue-50/80 to-sky-50/60 p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-xs">
          <div className="flex items-center justify-between text-blue-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">लाइसेंस ऑनबोर्डिंग फीस</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">
            ₹{(stats.allTimeFees || 0).toLocaleString('en-IN')}
          </p>
          <div className="mt-2 text-xs text-blue-800 font-semibold flex items-center justify-between">
            <span>इस माह: ₹{(stats.thisMonthFees || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-blue-600">₹15k–₹1L / यूनिट</span>
          </div>
        </div>

        {/* Card 3: Monthly Recurring Royalties */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">मासिक रॉयल्टी शेयरिंग</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-stone-900">
            ₹{(stats.allTimeRoyalties || 0).toLocaleString('en-IN')}
          </p>
          <div className="mt-2 text-xs text-emerald-800 font-semibold flex items-center justify-between">
            <span>इस माह: ₹{(stats.thisMonthRoyalties || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-emerald-700">10%–15% निरंतर शेयर</span>
          </div>
        </div>

        {/* Card 4: Top Performing City */}
        <div className="bg-gradient-to-br from-purple-50/80 to-stone-50 p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">सर्वाधिक राजस्व शहर</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-stone-900 truncate">
            {stats.topCity?.shortName || 'Bhopal'}
          </p>
          <div className="mt-2 text-xs text-purple-900 font-semibold flex items-center justify-between">
            <span>₹{(stats.topCity?.currentRevenue || 0).toLocaleString('en-IN')}/माह</span>
            <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md text-[10px] font-bold">
              +{stats.topCity?.growth || 0}% ▲
            </span>
          </div>
        </div>
      </div>

      {/* 3. Recharts Chart Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Mode Selector */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-stone-100 border border-stone-200 text-xs font-bold self-start md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('city_trends')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'city_trends'
                ? 'bg-white text-orange-700 shadow-xs font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LineChartIcon className="w-3.5 h-3.5" />
            <span>शहरवार विकास दर (City Trends)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('revenue_streams')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'revenue_streams'
                ? 'bg-white text-orange-700 shadow-xs font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>फीस बनाम रॉयल्टी (Streams)</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('city_bars')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'city_bars'
                ? 'bg-white text-orange-700 shadow-xs font-black'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>शहर तुलना बार (Comparison)</span>
          </button>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedCityFilter('all')}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCityFilter === 'all'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            सभी शहर ({FRANCHISE_CITIES_CONFIG.length})
          </button>
          {FRANCHISE_CITIES_CONFIG.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => setSelectedCityFilter(city.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                selectedCityFilter === city.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: selectedCityFilter === city.id ? '#ffffff' : city.color }}
              />
              <span>{city.shortName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Recharts Visualization Stage */}
      <div className="h-72 sm:h-80 w-full pt-3">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'city_trends' ? (
            /* VIEW 1: Multi-City Growth Trends Line Chart */
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    const isTotalPos = (row.grandTotalGrowth ?? 0) >= 0;

                    // If a single city is filtered, show dedicated deep-dive card
                    const isSingleCity = selectedCityFilter !== 'all';
                    const activeCityConfig = isSingleCity
                      ? FRANCHISE_CITIES_CONFIG.find((c) => c.id === selectedCityFilter)
                      : null;
                    const activeCityMetric = isSingleCity && activeCityConfig
                      ? row.cityMetrics?.[activeCityConfig.id]
                      : null;

                    return (
                      <div className="bg-stone-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-stone-800 text-xs min-w-72 max-w-sm space-y-3">
                        {/* Month Header & Grand Total with Growth Pill */}
                        <div className="flex items-start justify-between border-b border-stone-800/80 pb-2 gap-2">
                          <div>
                            <span className="font-extrabold text-stone-100 text-sm block">{label}</span>
                            <span className="text-[10px] text-stone-400">फ्रेंचाइज़ी मासिक वित्तीय रिकॉर्ड</span>
                          </div>
                          {row.grandTotalGrowth !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                isTotalPos
                                  ? 'bg-emerald-950/90 text-emerald-400 border-emerald-700/60'
                                  : 'bg-rose-950/90 text-rose-400 border-rose-700/60'
                              }`}
                            >
                              {isTotalPos ? '+' : ''}{row.grandTotalGrowth}% {isTotalPos ? '▲' : '▼'} MoM
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold">
                              आधार माह (Base)
                            </span>
                          )}
                        </div>

                        {/* Grand Total Revenue Box */}
                        <div className="bg-stone-900/90 rounded-xl p-2.5 border border-stone-800 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-stone-400 block font-medium">मासिक कुल फ्रेंचाइज़ी आय:</span>
                            <span className="text-[10px] text-stone-500">
                              {Number(row?.prevGrandTotal || 0) > 0
                                ? `पिछला: ₹${(row?.prevGrandTotal || 0).toLocaleString('en-IN')} (${Number(row?.grandTotalDiff || 0) >= 0 ? '+' : ''}₹${(row?.grandTotalDiff || 0).toLocaleString('en-IN')})`
                                : 'प्रारंभिक रिपोर्टिंग माह'}
                            </span>
                          </div>
                          <span className="text-base font-black text-amber-400">
                            ₹{(row?.grandTotal || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Single City Focused View */}
                        {isSingleCity && activeCityConfig && activeCityMetric && (
                          <div className="p-2.5 rounded-xl bg-stone-900/60 border border-stone-800/70 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-stone-200 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeCityConfig.color }} />
                                <span>{activeCityConfig.name}</span>
                              </span>
                              {activeCityMetric.growth !== null ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    activeCityMetric.growth >= 0
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                  }`}
                                >
                                  {activeCityMetric.growth >= 0 ? '+' : ''}{activeCityMetric.growth}% {activeCityMetric.growth >= 0 ? '▲' : '▼'}
                                </span>
                              ) : (
                                <span className="text-[10px] text-stone-400">बेसलाइन</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-stone-300">
                              <span className="text-[11px]">शहर से कुल राजस्व:</span>
                              <span className="font-extrabold text-white text-sm">
                                ₹{(activeCityMetric.current || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            {Number(activeCityMetric.prev || 0) > 0 && (
                              <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-800/60">
                                <span>मासिक शुद्ध अंतर:</span>
                                <span className={Number(activeCityMetric.diff || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {Number(activeCityMetric.diff || 0) >= 0 ? '+' : ''}₹{(activeCityMetric.diff || 0).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* All Cities Breakdown List with Exact Figures and Growth % */}
                        {!isSingleCity && (
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                            <div className="text-[10px] font-semibold text-stone-400 px-1 uppercase tracking-wider mb-1">
                              शहरवार राजस्व व वृद्धि दर (MoM Trend)
                            </div>
                            {FRANCHISE_CITIES_CONFIG.map((city) => {
                              const metric = row?.cityMetrics?.[city.id] || {
                                current: row?.[city.id] || 0,
                                prev: 0,
                                diff: 0,
                                growth: null,
                              };
                              const isCityPos = (metric.growth ?? 0) >= 0;

                              return (
                                <div
                                  key={city.id}
                                  className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-stone-900/60 transition-colors"
                                >
                                  <span className="flex items-center gap-1.5 text-stone-300 truncate">
                                    <span
                                      className="w-2 h-2 rounded-full shrink-0"
                                      style={{ backgroundColor: city.color }}
                                    />
                                    <span className="truncate">{city.shortName}:</span>
                                  </span>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-white">
                                      ₹{(metric.current || 0).toLocaleString('en-IN')}
                                    </span>
                                    {metric.growth !== null ? (
                                      <span
                                        className={`text-[10px] font-black px-1.5 py-0.2 rounded inline-flex items-center ${
                                          isCityPos
                                            ? 'text-emerald-400 bg-emerald-950/80'
                                            : 'text-rose-400 bg-rose-950/80'
                                        }`}
                                      >
                                        {isCityPos ? '+' : ''}{metric.growth}%
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-stone-500">बेस</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Stream breakdown footer */}
                        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[10px] text-stone-400">
                          <span>
                            फीस: <strong className="text-sky-400">₹{(row?.totalFranchiseFees || 0).toLocaleString('en-IN')}</strong>
                          </span>
                          <span>
                            रॉयल्टी: <strong className="text-orange-400">₹{(row?.totalRoyalties || 0).toLocaleString('en-IN')}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                iconType="circle"
              />

              {FRANCHISE_CITIES_CONFIG.filter(
                (c) => selectedCityFilter === 'all' || selectedCityFilter === c.id
              ).map((city) => (
                <Line
                  key={city.id}
                  type="monotone"
                  dataKey={city.id}
                  name={city.shortName}
                  stroke={city.color}
                  strokeWidth={selectedCityFilter === city.id ? 3.5 : 2.5}
                  dot={{ r: 3, fill: city.color }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          ) : viewMode === 'revenue_streams' ? (
            /* VIEW 2: Stacked Revenue Stream (Upfront Licensing Fees vs Recurring Royalties) */
            <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorFranchiseFees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorRoyalties" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    const isTotalPos = (row.grandTotalGrowth ?? 0) >= 0;
                    const isFeesPos = (row.feesGrowth ?? 0) >= 0;
                    const isRoyaltiesPos = (row.royaltiesGrowth ?? 0) >= 0;
                    const feesShare = ((row.totalFranchiseFees / (row.grandTotal || 1)) * 100).toFixed(1);
                    const royaltiesShare = ((row.totalRoyalties / (row.grandTotal || 1)) * 100).toFixed(1);

                    return (
                      <div className="bg-stone-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-stone-800 text-xs space-y-3 min-w-72 max-w-sm">
                        {/* Month Header & Total with MoM Trend */}
                        <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                          <div>
                            <p className="font-extrabold text-stone-100 text-sm">{label}</p>
                            <span className="text-[10px] text-stone-400">राजस्व स्रोत विभाजन (Revenue Streams)</span>
                          </div>
                          {row.grandTotalGrowth !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                isTotalPos
                                  ? 'bg-emerald-950/90 text-emerald-400 border-emerald-700/60'
                                  : 'bg-rose-950/90 text-rose-400 border-rose-700/60'
                              }`}
                            >
                              {isTotalPos ? '+' : ''}{row.grandTotalGrowth}% {isTotalPos ? '▲' : '▼'} MoM
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold">
                              आधार माह
                            </span>
                          )}
                        </div>

                        {/* Grand Total */}
                        <div className="bg-stone-900/90 rounded-xl p-2.5 border border-stone-800 flex items-center justify-between">
                          <span className="text-stone-300 font-medium text-[11px]">मासिक कुल फ्रेंचाइज़ी संग्रह:</span>
                          <span className="text-base font-black text-amber-400">
                            ₹{(row?.grandTotal || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Stream 1: Onboarding License Fees */}
                        <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sky-300 font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              <span>ऑनबोर्डिंग लाइसेंस फीस:</span>
                            </span>
                            {row?.feesGrowth !== null && row?.feesGrowth !== undefined ? (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isFeesPos
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                }`}
                              >
                                {isFeesPos ? '+' : ''}{row.feesGrowth}% {isFeesPos ? '▲' : '▼'}
                              </span>
                            ) : (
                              <span className="text-[9px] text-stone-400">बेस</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-stone-200">
                            <span className="text-[10px] text-stone-400">योगदान शेयर: {feesShare}%</span>
                            <span className="font-extrabold text-white text-sm">
                              ₹{(row?.totalFranchiseFees || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {Number(row?.prevFranchiseFees || 0) > 0 && (
                            <div className="text-[10px] text-stone-400 pt-0.5 border-t border-sky-900/40 flex justify-between">
                              <span>पिछला माह: ₹{(row?.prevFranchiseFees || 0).toLocaleString('en-IN')}</span>
                              <span className={Number(row?.feesDiff || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {Number(row?.feesDiff || 0) >= 0 ? '+' : ''}₹{(row?.feesDiff || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Stream 2: Monthly Recurring Royalties */}
                        <div className="p-2.5 rounded-xl bg-orange-950/30 border border-orange-800/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-orange-300 font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-orange-400" />
                              <span>मासिक 10-15% रॉयल्टी:</span>
                            </span>
                            {row?.royaltiesGrowth !== null && row?.royaltiesGrowth !== undefined ? (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  isRoyaltiesPos
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                    : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                }`}
                              >
                                {isRoyaltiesPos ? '+' : ''}{row.royaltiesGrowth}% {isRoyaltiesPos ? '▲' : '▼'}
                              </span>
                            ) : (
                              <span className="text-[9px] text-stone-400">बेस</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-stone-200">
                            <span className="text-[10px] text-stone-400">योगदान शेयर: {royaltiesShare}%</span>
                            <span className="font-extrabold text-white text-sm">
                              ₹{(row?.totalRoyalties || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          {Number(row?.prevRoyalties || 0) > 0 && (
                            <div className="text-[10px] text-stone-400 pt-0.5 border-t border-orange-900/40 flex justify-between">
                              <span>पिछला माह: ₹{(row?.prevRoyalties || 0).toLocaleString('en-IN')}</span>
                              <span className={Number(row?.royaltiesDiff || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {Number(row?.royaltiesDiff || 0) >= 0 ? '+' : ''}₹{(row?.royaltiesDiff || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="totalFranchiseFees"
                name="ऑनबोर्डिंग लाइसेंस फीस (License Fees)"
                stroke="#0284c7"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorFranchiseFees)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="totalRoyalties"
                name="मासिक संचालन रॉयल्टी (Monthly Royalties)"
                stroke="#ea580c"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorRoyalties)"
                stackId="1"
              />
            </AreaChart>
          ) : (
            /* VIEW 3: Grouped / Stacked City Comparison Bar Chart */
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="monthLabel" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const row = payload[0].payload;
                    const isTotalPos = (row.grandTotalGrowth ?? 0) >= 0;

                    return (
                      <div className="bg-stone-950/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-stone-800 text-xs min-w-72 max-w-sm space-y-2.5">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                          <div>
                            <p className="font-extrabold text-stone-100 text-sm">{label}</p>
                            <span className="text-[10px] text-stone-400">शहर तुलना व विकास दर</span>
                          </div>
                          {row.grandTotalGrowth !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                isTotalPos
                                  ? 'bg-emerald-950/90 text-emerald-400 border-emerald-700/60'
                                  : 'bg-rose-950/90 text-rose-400 border-rose-700/60'
                              }`}
                            >
                              {isTotalPos ? '+' : ''}{row.grandTotalGrowth}% {isTotalPos ? '▲' : '▼'} MoM
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold">
                              आधार माह
                            </span>
                          )}
                        </div>

                        {/* Grand Total Revenue */}
                        <div className="bg-stone-900/90 rounded-xl p-2.5 border border-stone-800 flex items-center justify-between">
                          <span className="text-stone-300 text-[11px] font-medium">माह का कुल संग्रह:</span>
                          <span className="text-base font-black text-amber-400">
                            ₹{(row?.grandTotal || 0).toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* City Breakdown with exact figure & percentage growth */}
                        <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                          {payload.map((entry) => {
                            const cityKey = entry.dataKey as string;
                            const metric = row.cityMetrics?.[cityKey];
                            const growth = metric?.growth;
                            const isPos = (growth ?? 0) >= 0;
                            const currentVal = Number(entry.value) || 0;
                            const share = ((currentVal / (row.grandTotal || 1)) * 100).toFixed(1);

                            return (
                              <div
                                key={entry.name}
                                className="flex items-center justify-between gap-2 px-1.5 py-1 rounded-lg hover:bg-stone-900/60 transition-colors"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                  <span className="text-stone-200 truncate">{entry.name}:</span>
                                  <span className="text-[10px] text-stone-500">({share}%)</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-bold text-white">
                                    ₹{currentVal.toLocaleString('en-IN')}
                                  </span>
                                  {growth !== null && growth !== undefined ? (
                                    <span
                                      className={`text-[10px] font-black px-1.5 py-0.2 rounded inline-flex items-center ${
                                        isPos
                                          ? 'text-emerald-400 bg-emerald-950/80'
                                          : 'text-rose-400 bg-rose-950/80'
                                      }`}
                                    >
                                      {isPos ? '+' : ''}{growth}%
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-stone-500">बेस</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }} />
              {FRANCHISE_CITIES_CONFIG.filter(
                (c) => selectedCityFilter === 'all' || selectedCityFilter === c.id
              ).map((city) => (
                <Bar
                  key={city.id}
                  dataKey={city.id}
                  name={city.shortName}
                  fill={city.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* 5. City Growth Ranking & Detailed Breakdown Matrix */}
      <div className="pt-2 border-t border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            <h3 className="text-xs sm:text-sm font-extrabold text-stone-900 tracking-tight">
              शहरवार मासिक राजस्व व विकास मैट्रिक्स (City-wise Growth Matrix)
            </h3>
          </div>
          <span className="text-[11px] text-stone-400 font-medium">
            दीपकत बिल्डकॉन अधिकृत फ्रेंचाइज़ी हब
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.cityPerformances.map((city, idx) => (
            <div
              key={city.id}
              onClick={() => setSelectedCityFilter(city.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedCityFilter === city.id
                  ? 'border-orange-500 bg-orange-50/50 shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/40 hover:bg-stone-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: city.color }} />
                  <span className="text-xs font-bold text-stone-900 truncate" title={city.name}>
                    {city.shortName}
                  </span>
                </div>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-stone-200/80 text-stone-700 uppercase">
                  {city.tier}
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-sm font-black text-stone-900">
                  ₹{(city?.currentRevenue || 0).toLocaleString('en-IN')}
                </span>
                <span
                  className={`text-[11px] font-extrabold inline-flex items-center ${
                    city.growth >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {city.growth >= 0 ? `+${city.growth}% ▲` : `${city.growth}% ▼`}
                </span>
              </div>

              <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] text-stone-500">
                <span>लाइसेंस: ₹{(city.feePerUnit / 1000).toFixed(0)}k</span>
                <span className="font-semibold text-orange-700">रॉयल्टी: {city.royaltyRate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

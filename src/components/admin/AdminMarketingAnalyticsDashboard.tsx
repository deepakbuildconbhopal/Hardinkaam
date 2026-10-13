import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Smartphone,
  Laptop,
  Users,
  MousePointerClick,
  PhoneCall,
  MessageCircle,
  Download,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Filter,
  ArrowRight,
  ExternalLink,
  Plus,
  Eye,
  Activity,
  Globe2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import {
  getMarketingAnalyticsSummary,
  exportMarketingReportToCSV,
  exportMarketingReportToExcel,
  trackActionClick,
  trackVisitorSession,
  MarketingAnalyticsSummary,
  CityMetric,
} from '../../services/marketingAnalyticsService';

interface Props {
  onSelectTab?: (tab: string) => void;
  onNavigateToCampaignWithCity?: (city: string, state: string, trade?: string) => void;
}

export const AdminMarketingAnalyticsDashboard: React.FC<Props> = ({
  onSelectTab,
  onNavigateToCampaignWithCity,
}) => {
  const [summary, setSummary] = useState<MarketingAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days'>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'ads' | 'leads'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await getMarketingAnalyticsSummary();
      setSummary(data);
    } catch (e) {
      console.warn('Analytics loading error:', e);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCSV = () => {
    if (!summary) return;
    exportMarketingReportToCSV(summary);
    setFeedbackMsg('✓ CSV रिपोर्ट सफलतापूर्वक डाउनलोड हो गई!');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleExportExcel = async () => {
    if (!summary) return;
    try {
      await exportMarketingReportToExcel(summary);
      setFeedbackMsg('✓ विस्तृत Excel (.xlsx) वर्कबुक सफलतापूर्वक डाउनलोड हो गई!');
    } catch (e: any) {
      alert(`एक्सेल एक्सपोर्ट त्रुटि: ${e.message || 'अज्ञात'}`);
    }
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleSimulateTestVisit = async () => {
    await trackVisitorSession('/');
    await trackActionClick({
      eventType: 'admob_banner_click',
      creativeTitle: 'दीपक बिल्डकॉन होम अपग्रेड - 20% छूट',
      category: 'इलेक्ट्रीशियन',
    });
    setFeedbackMsg('✓ टेस्ट विज़िटर और AdMob क्लिक इवेंट सफलतापूर्वक लॉग किया गया!');
    await loadData();
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleCreateAdForCity = (city: CityMetric) => {
    if (onNavigateToCampaignWithCity) {
      onNavigateToCampaignWithCity(city.city, city.state, city.topTrade);
    } else if (onSelectTab) {
      onSelectTab('admin_marketing_agent');
    }
  };

  if (loading && !summary) {
    return (
      <div className="p-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-stone-600">
          विजिटर व AdMob रिपोर्ट लोड हो रही है...
        </p>
      </div>
    );
  }

  // Filtered recent logs
  const filteredClicks = (summary?.recentClicks || []).filter((c) => {
    if (eventFilter === 'ads') return c.eventType === 'admob_banner_click' || c.eventType === 'adsense_click';
    if (eventFilter === 'leads') return c.eventType === 'whatsapp_enquiry_click' || c.eventType === 'helpline_call_click';
    return true;
  });

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black tracking-wider uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>लाइव मार्केटिंग एनालिटिक्स</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              ✓ AdMob व विज़िटर ट्रैकिंग चालू
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight mt-2 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-blue-600" />
            <span>विजिटर व AdMob क्लिक रिपोर्ट (Marketing Intelligence)</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            ऐप कहाँ-कहाँ से खुली, किन शहरों से यूज़र्स आए, किसने किस AdMob विज्ञापन व सर्विस पर क्लिक किया — सटीक डेटा आधारित मार्केटिंग रिपोर्ट
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

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer border border-emerald-500/30"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>CSV एक्सपोर्ट</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer hover:scale-102"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Excel (.xlsx) एक्सपोर्ट</span>
          </button>

          {onSelectTab && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_marketing_agent')}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>AI विज्ञापन व वीडियो बनाएं</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* AdMob Diagnostics & Zero-Secret Explanation Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-950 via-stone-950 to-blue-950 border border-blue-800 text-white space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>Google AdMob विज्ञापन स्थिति व स्पष्टीकरण</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                  🟢 100% एक्टिव
                </span>
              </h3>
              <p className="text-[11px] text-stone-300 mt-0.5">
                App ID: <code className="text-amber-300 font-mono">ca-app-pub-1925778784615690~8429442285</code> | Unit: <code className="text-amber-300 font-mono">5576223249</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSimulateTestVisit}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>टेस्ट क्लिक सिम्युलेट करें</span>
            </button>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs text-stone-300 space-y-1.5">
          <p className="leading-relaxed">
            💡 <strong>AdMob विज्ञापन वेब ब्राउज़र vs मोबाइल ऐप:</strong> Google AdMob एक नेटिव मोबाइल विज्ञापन SDK है जो केवल <strong>Android APK और iOS मोबाइल ऐप</strong> में सीधे विज्ञापन प्रदर्शित करता है। वेब ब्राउज़र (Chrome, Safari, PC) में Google AdSense या प्रमाणित प्रायोजित बैनर प्रदर्शित होते हैं।
          </p>
          <p className="leading-relaxed text-emerald-300">
            ✓ <strong>आपकी ट्रैकिंग पूरी तरह काम कर रही है:</strong> चाहे यूजर Android से ऐप खोले या वेब से, उसके शहर, डिवाइस, और प्रत्येक विज्ञापन व सेवा क्लिक की पूरी जानकारी नीचे रिपोर्ट में दर्ज हो रही है।
          </p>
        </div>
      </div>

      {/* 6 Key Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold">कुल विज़िट्स</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{summary?.totalVisits || 0}</div>
          <div className="text-[10px] text-emerald-600 font-bold">
            आज: +{summary?.todayVisits || 0} नए
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold">यूनिक यूज़र्स</span>
            <Smartphone className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{summary?.uniqueVisitors || 0}</div>
          <div className="text-[10px] text-stone-400">अलग-अलग डिवाइसेस</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold">AdMob क्लिक्स</span>
            <MousePointerClick className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-black text-orange-600">{summary?.totalAdClicks || 0}</div>
          <div className="text-[10px] text-stone-500 font-semibold">
            CTR: <span className="font-bold text-stone-900">{summary?.adCtrPercent || 0}%</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold">WhatsApp लीड्स</span>
            <MessageCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{summary?.whatsappLeads || 0}</div>
          <div className="text-[10px] text-stone-400">चैट पूछताछ</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold">हेल्पलाइन कॉल्स</span>
            <PhoneCall className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600">{summary?.callLeads || 0}</div>
          <div className="text-[10px] text-stone-400">डायरेक्ट कॉल्स</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500 text-xs">
            <span className="font-bold">सर्विस बुकिंग्स</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{summary?.serviceBookingClicks || 0}</div>
          <div className="text-[10px] text-stone-400">कन्वर्ज़न इरादा</div>
        </div>
      </div>

      {/* Main Grid: City Breakdown Table & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* City Breakdown Table (2 columns on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
            <div>
              <h2 className="font-black text-base text-stone-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                <span>शहर व ज़िलावार संपूर्ण रिपोर्ट (City-wise Marketing Intelligence)</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                किस शहर से कितने लोगों ने ऐप खोली, विज्ञापनों पर क्लिक किया और क्या काम मांगा
              </p>
            </div>
            <div className="text-xs font-bold text-stone-500 bg-stone-100 px-3 py-1 rounded-xl self-start sm:self-auto">
              कुल शहर: {summary?.cityBreakdown?.length || 0}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3">शहर / ज़िला</th>
                  <th className="py-3 px-2 text-center">विज़िटर्स</th>
                  <th className="py-3 px-2 text-center">AdMob क्लिक</th>
                  <th className="py-3 px-2 text-center">लीड्स (WA/Call)</th>
                  <th className="py-3 px-3">मुख्य रुचि (Trade)</th>
                  <th className="py-3 px-2 text-right">मार्केटिंग एक्शन</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {summary?.cityBreakdown?.map((city, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-black text-stone-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        <span>{city.city}</span>
                      </div>
                      <div className="text-[10px] text-stone-400 pl-3.5">{city.state}</div>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-stone-800">
                      {city.count}
                    </td>
                    <td className="py-3 px-2 text-center font-black text-orange-600">
                      {city.adClicks}
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-emerald-600">
                      {city.leads}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-bold">
                        {city.topTrade}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleCreateAdForCity(city)}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[10px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="इस शहर के लिए सीधा AI विज्ञापन बनाएं"
                      >
                        <Sparkles className="w-3 h-3 text-orange-600" />
                        <span>विज्ञापन बनाएं</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Traffic Sources & Device Platforms */}
        <div className="space-y-6">
          {/* Traffic Sources */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-blue-600" />
              <span>ट्रैफिक स्रोत (Traffic Sources)</span>
            </h3>
            <p className="text-[11px] text-stone-500">लोग ऐप पर कहाँ से आ रहे हैं</p>

            <div className="space-y-2.5">
              {summary?.referrerBreakdown?.map((ref, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-800">{ref.referrer}</span>
                    <span className="text-stone-500">{ref.count} ({ref.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: `${Math.min(ref.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Platforms */}
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-3">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>डिवाइस प्रकार (Device Breakdown)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <Smartphone className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-black text-stone-900">
                  {summary?.deviceBreakdown?.mobile || 0}
                </div>
                <div className="text-[10px] font-bold text-stone-500">Android / Mobile</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                <Laptop className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                <div className="text-lg font-black text-stone-900">
                  {summary?.deviceBreakdown?.desktop || 0}
                </div>
                <div className="text-[10px] font-bold text-stone-500">Desktop / PC</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Event Stream / Activity Logs */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="font-black text-base text-stone-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <span>लाइव विज़िटर व क्लिक गतिविधि लॉग्स (Live Realtime Activity Feed)</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              प्रत्येक विज़िटर का समय, शहर, डिवाइस और क्लिक की गई सामग्री का लाइव रिकॉर्ड
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setEventFilter('all')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  eventFilter === 'all' ? 'bg-white shadow-xs text-stone-900 font-black' : 'text-stone-500'
                }`}
              >
                सभी
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('ads')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  eventFilter === 'ads' ? 'bg-white shadow-xs text-orange-600 font-black' : 'text-stone-500'
                }`}
              >
                AdMob केवल
              </button>
              <button
                type="button"
                onClick={() => setEventFilter('leads')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  eventFilter === 'leads' ? 'bg-white shadow-xs text-emerald-600 font-black' : 'text-stone-500'
                }`}
              >
                लीड्स केवल
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {filteredClicks.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              कोई क्लिक गतिविधि नहीं मिली। ऊपर दिए बटन से टेस्ट क्लिक सिम्युलेट करें।
            </div>
          ) : (
            filteredClicks.map((click, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100/80 transition-colors border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    click.eventType === 'admob_banner_click' || click.eventType === 'adsense_click'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {click.eventType === 'admob_banner_click' || click.eventType === 'adsense_click' ? (
                      <MousePointerClick className="w-4 h-4" />
                    ) : (
                      <MessageCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-black text-stone-900 flex items-center gap-2 flex-wrap">
                      <span>{click.creativeTitle}</span>
                      <span className={`px-2 py-0.2 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                        click.eventType === 'admob_banner_click'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {click.eventType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-stone-700">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>{click.city}, {click.state}</span>
                      </span>
                      <span>•</span>
                      <span>डिवाइस: {click.deviceType}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-stone-400">Unit: #{click.adUnitId.slice(-6)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-stone-400 shrink-0 self-end sm:self-center font-mono">
                  {new Date(click.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

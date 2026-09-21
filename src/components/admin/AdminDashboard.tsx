import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  LayoutGrid,
  Calendar,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  ShieldCheck,
  DollarSign,
  Clock,
  ArrowRight,
  PieChart as PieChartIcon,
  Activity,
  BarChart3,
  Trash2,
  Building2,
  MapPin,
  KeyRound,
  Palette,
  Database,
  Upload,
  Video,
  Radio,
  Globe,
  Server,
  FileArchive,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Navigation,
  Megaphone,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Booking, Service, Category, ServiceMan } from '../../types';
import { AdminFranchiseRevenueSummary } from './AdminFranchiseRevenueSummary';
import { AdminDataVisualization } from './AdminDataVisualization';
import { DistrictZipUploadModal } from './DistrictZipUploadModal';
import { DistrictActivationModal } from './DistrictActivationModal';
import { AdminRealtimeNotificationCenter } from './AdminRealtimeNotificationCenter';
import { AdminLiveBookingsMap } from './AdminLiveBookingsMap';

interface Props {
  bookings: Booking[];
  services: Service[];
  categories: Category[];
  serviceMen: ServiceMan[];
  onSelectTab: (tab: string) => void;
  onOpenZeroDataModal?: () => void;
}

export const AdminDashboard: React.FC<Props> = ({
  bookings,
  services,
  categories,
  serviceMen,
  onSelectTab,
  onOpenZeroDataModal,
}) => {
  const { activeTheme } = useTheme();
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);

  const totalGMV = useMemo(
    () => bookings.reduce((acc, curr) => acc + (curr.amount || 0), 0),
    [bookings]
  );
  const platformRevenue = Math.round(totalGMV * 0.15);
  const pendingKYCCount = serviceMen.filter((s) => !s.isVerified).length;
  const activeBookings = bookings.filter((b) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Real-time Administrative Notification Center & Ticker */}
      <AdminRealtimeNotificationCenter
        onNavigateToTab={(tab, subView) => {
          onSelectTab(tab);
        }}
      />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
              <ShieldAlert className="w-3.5 h-3.5" /> Platform Governance Console
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              HARDINKAAM Central Administration
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl">
              Live operations monitor across Bhopal, Indore &amp; regional clusters. Oversee services, dispatches,
              KYC compliance, and financial transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              id="admin-top-super-dashboard-btn"
              onClick={() => onSelectTab('admin_super_dashboard')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/40 border border-amber-300 hover:scale-102"
              title="अखिल भारतीय सुपर एडमिन मास्टर कंट्रोल व 500+ जिला नेटवर्क"
            >
              <Building2 className="w-4 h-4 text-stone-950" />
              <span>👑 सुपर एडमिन मास्टर (Super Admin)</span>
            </button>

            <button
              type="button"
              id="admin-top-district-zip-btn"
              onClick={() => setIsZipModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-orange-400 hover:scale-102"
              title="सुरक्षित जिला ZIP पैकेज अपलोड (Zero Code Execution Sandbox)"
            >
              <FileArchive className="w-4 h-4 text-white" />
              <span>📦 जिला ZIP अपलोड</span>
            </button>

            <button
              type="button"
              id="admin-top-district-activate-btn"
              onClick={() => setIsActivationModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 border border-emerald-400 hover:scale-102"
              title="नया जिला सक्रियण विजार्ड (District Activation Wizard)"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>🚀 नया जिला सक्रिय करें</span>
            </button>

            <button
              type="button"
              id="admin-top-live-tracking-btn"
              onClick={() => onSelectTab('admin_live_tracking')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-amber-300 hover:scale-102 ring-2 ring-amber-400/40"
              title="सर्विसमैन लाइव लोकेशन, GPS ट्रैकिंग मैप व 12-पॉइंट सिस्टम टेस्ट"
            >
              <Navigation className="w-4 h-4 text-white animate-pulse" />
              <span>📡 सर्विसमैन लाइव ट्रैकिंग (Live Map)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-reports-manager-btn"
              onClick={() => onSelectTab('admin_reports_manager')}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-950/40 border border-teal-400 hover:scale-102"
              title="अखिल भारतीय व जिलावार राजस्व रिपोर्ट व CSV एक्सपोर्ट"
            >
              <FileSpreadsheet className="w-4 h-4 text-white" />
              <span>📊 राजस्व व व्यापार रिपोर्ट</span>
            </button>

            <button
              type="button"
              id="admin-top-payouts-btn"
              onClick={() => onSelectTab('admin_payouts')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/40 border border-amber-400 hover:scale-102"
              title="सर्विसमैन पेआउट, कंपनी कमीशन व Razorpay सेटलमेंट"
            >
              <DollarSign className="w-4 h-4 text-white" />
              <span>💰 सर्विसमैन पेआउट</span>
            </button>

            <button
              type="button"
              id="admin-top-audit-logs-btn"
              onClick={() => onSelectTab('admin_audit_logs')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-stone-950/40 border border-amber-500/40 hover:scale-102"
              title="सुरक्षा ऑडिट ट्रेल व एडमिन क्रियाएं"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>📜 ऑडिट लॉग्स</span>
            </button>

            <button
              type="button"
              id="admin-top-deploy-btn"
              onClick={() => onSelectTab('admin_website_updates')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-orange-300 hover:scale-102"
              title="Google AI Studio ZIP अपलोड व सुरक्षित Firebase Hosting डिप्लॉयमेंट"
            >
              <Server className="w-4 h-4 text-white" />
              <span>🚀 वेबसाइट अपडेट (Deploy ZIP)</span>
            </button>

            <button
              type="button"
              id="admin-top-bulk-sms-btn"
              onClick={() => onSelectTab('admin_bulk_sms')}
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-950/40 border border-teal-400 hover:scale-102"
              title="बल्क SMS व लाइव वीडियो कॉल प्रसारण केंद्र"
            >
              <Radio className="w-4 h-4 text-white" />
              <span>📢 बल्क SMS &amp; वीडियो कॉल</span>
            </button>

            <button
              type="button"
              id="admin-top-data-import-btn"
              onClick={() => onSelectTab('admin_import')}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 border border-emerald-400 hover:scale-102"
              title="Excel (.xlsx/.xls) या सिंगल फॉर्म से नई सर्विस अपलोड करें"
            >
              <Upload className="w-4 h-4 text-white" />
              <span>📤 नई सर्विस / Excel अपलोड</span>
            </button>

            <button
              type="button"
              id="admin-top-franchise-revenue-btn"
              onClick={() => {
                const el = document.getElementById('admin-franchise-revenue-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-orange-400 hover:scale-102"
              title="फ्रेंचाइज़ी फीस व मासिक राजस्व विज़ुअल समरी / Franchise Revenue Trends"
            >
              <Building2 className="w-4 h-4" />
              <span>फ्रेंचाइज़ी राजस्व रिपोर्ट</span>
            </button>

            <button
              type="button"
              id="admin-top-broadcast-manager-btn"
              onClick={() => onSelectTab('admin_broadcast')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-amber-400 hover:scale-102"
              title="त्योहार बधाई व प्रशासनिक संदेश ब्रॉडकास्टर (सर्विसमैन, ग्राहक, फ्रेंचाइजी व प्रमोटर ऐप्स)"
            >
              <Megaphone className="w-4 h-4 text-amber-200" />
              <span>🪔 त्योहार व नोटिस ब्रॉडकास्ट</span>
            </button>

            <button
              type="button"
              id="admin-top-users-passwords-btn"
              onClick={() => onSelectTab('admin_users')}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/40 border border-amber-300 hover:scale-102"
              title="उपयोगकर्ता एवं पासवर्ड प्रबंधन / Users & Passwords Manager"
            >
              <KeyRound className="w-4 h-4 text-stone-950" />
              <span>यूजर व पासवर्ड प्रबंधन</span>
            </button>

            <button
              type="button"
              id="admin-top-domain-settings-btn"
              onClick={() => onSelectTab('admin_settings')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-orange-400 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-stone-950/40 border border-orange-500/50 hover:scale-102"
              title="कस्टम डोमेन edusuper.in DNS सेटअप व सेटिंग्स"
            >
              <Globe className="w-4 h-4 text-orange-400" />
              <span>🌐 डोमेन edusuper.in</span>
            </button>

            <button
              type="button"
              id="admin-top-data-explorer-btn"
              onClick={() => onSelectTab('admin_data_explorer')}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-950/40 border border-indigo-400 hover:scale-102"
              title="Firestore डेटा एक्सप्लोरर: किसी भी कलेक्शन के रिकॉर्ड देखें व चुनिंदा डिलीट करें"
            >
              <Database className="w-4 h-4 text-white" />
              <span>डेटा एक्सप्लोरर (Explorer)</span>
            </button>

            {onOpenZeroDataModal && (
              <button
                type="button"
                id="admin-top-zero-data-btn"
                onClick={onOpenZeroDataModal}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/40 border border-red-400/80 hover:scale-102"
                title="एडवांस डेटाबेस नियंत्रण: चुनें क्या मिटाना है (Delete) और क्या अपडेट/रीसेट करना है (Selective Update)"
              >
                <Trash2 className="w-4 h-4" />
                <span>एडवांस डेटा रीसेट (Zero &amp; Update)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deployment & Production Live Status Strip */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-stone-900">
                HARDINKAAM Website Live Deployment System
              </h4>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>hardinkaam-5cc6a.web.app</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Google AI Studio से नई ZIP अपलोड करके एक क्लिक में सुरक्षित रूप से उत्पादन वेबसाइट अपडेट करें।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onSelectTab('admin_website_updates')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Server className="w-3.5 h-3.5" />
            <span>नई ZIP अपलोड व डिप्लॉय करें</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div
          id="admin-kpi-bookings"
          onClick={() => onSelectTab('admin_bookings')}
          className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
            <Calendar className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">{bookings.length}</p>
          <span className="text-[11px] text-emerald-600 font-medium">
            {activeBookings.length} currently active
          </span>
        </div>

        <div
          id="admin-kpi-catalog"
          onClick={() => onSelectTab('admin_catalog')}
          className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Live Catalog</span>
            <LayoutGrid className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">{services.length}</p>
          <span className="text-[11px] text-blue-600 font-medium">
            Across {categories.length} categories
          </span>
        </div>

        <div
          id="admin-kpi-pros"
          onClick={() => onSelectTab('admin_users')}
          className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs hover:border-emerald-300 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Service Pros</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">{serviceMen.length}</p>
          <span className="text-[11px] text-purple-600 font-medium">
            {serviceMen.filter((s) => s.isAvailable).length} available right now
          </span>
        </div>

        <div id="admin-kpi-revenue" className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Take (15%)</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">₹{(platformRevenue || 0).toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-stone-500">Gross GMV: ₹{(totalGMV || 0).toLocaleString('en-IN')}</span>
        </div>

        <div
          id="admin-kpi-franchise-revenue"
          onClick={() => {
            const el = document.getElementById('admin-franchise-revenue-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white p-5 rounded-3xl border border-orange-200 shadow-xs hover:border-orange-400 cursor-pointer transition-all bg-gradient-to-b from-white to-orange-50/25"
        >
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-800">Franchise Fees</span>
            <Building2 className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-3xl font-black text-stone-900">₹9.22L</p>
          <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <span>+21.4% MoM</span> • <span>8 प्रमुख शहर</span>
          </span>
        </div>
      </div>

      {/* Phase 6: Admin Central Live Operations Map (Active Dispatched Bookings) */}
      <div id="admin-live-tracking-section" className="scroll-mt-6">
        <AdminLiveBookingsMap bookings={bookings} />
      </div>

      {/* Visual Analytics with Recharts */}
      <AdminDataVisualization
        bookings={bookings}
        serviceMen={serviceMen}
        categories={categories}
        services={services}
      />

      {/* Franchise Fees & Royalties Monthly Revenue & City Growth Trends Section */}
      <div id="admin-franchise-revenue-section">
        <AdminFranchiseRevenueSummary onSelectTab={onSelectTab} />
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div
          id="admin-quick-live-tracking-card"
          onClick={() => onSelectTab('admin_live_tracking')}
          className="bg-white rounded-3xl border border-orange-300 p-5 shadow-xs hover:shadow-md hover:border-orange-500 cursor-pointer transition-all group bg-gradient-to-b from-white to-orange-50/40"
        >
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Navigation className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">सर्विसमैन लाइव ट्रैकिंग</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            ऑन-ड्यूटी सर्विसमैन की लाइव लोकेशन, GPS रूट, दूरी, ETA व 12-पॉइंट सिस्टम परीक्षण लाइव देखें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-orange-600">
            लाइव ट्रैकिंग खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-payouts-card"
          onClick={() => onSelectTab('admin_payouts')}
          className="bg-white rounded-3xl border border-amber-300 p-5 shadow-xs hover:shadow-md hover:border-amber-500 cursor-pointer transition-all group bg-gradient-to-b from-white to-amber-50/40"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">सर्विसमैन पेआउट व सेटलमेंट</h3>
          <p className="text-xs text-stone-500 mt-1">
            कंपनी द्वारा 15% सर्विस चार्ज व 5% टैक्स काटकर शेष राशि Razorpay से सर्विसमैन को ट्रांसफर करें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-amber-700">
            पेआउट हब खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-theme-manager-card"
          onClick={() => onSelectTab('admin_theme')}
          className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-md hover:border-purple-400 cursor-pointer transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Palette className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">Theme Manager (थीम मैनेजर)</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {activeTheme.greetingIcon} {activeTheme.nameHindi.split(' ')[0]}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            पूरे प्लेटफ़ॉर्म की सक्रिय थीम बदलें (Default, Holi, Ganesh Chaturthi, Navratri, Diwali, Christmas)।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-600">
            थीम सेटिंग्स खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('admin_franchise')}
          className="bg-white rounded-3xl border border-orange-300 p-5 shadow-xs hover:shadow-md hover:border-orange-500 cursor-pointer transition-all group bg-gradient-to-b from-white to-orange-50/40"
        >
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">शहरवार फ्रेंचाइज़ी रिपोर्ट</h3>
          <p className="text-xs text-stone-500 mt-1">
            पूरे भारत के हर शहर, कस्बे व गाँव की बुकिंग्स, रॉयल्टी, टारगेट व कर्मचारी रिपोर्ट।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-orange-600">
            रिपोर्ट देखें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('admin_catalog')}
          className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">Manage Catalog &amp; Pricing</h3>
          <p className="text-xs text-stone-500 mt-1">
            Create new service categories, set base prices, warranties, and durations.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-orange-600">
            Open Catalog <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('admin_kyc')}
          className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">KYC Verification Queue</h3>
          <p className="text-xs text-stone-500 mt-1">
            Audit Aadhaar, PAN, and technical certificates submitted by applicant technicians.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600">
            Audit Queue ({pendingKYCCount}) <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('admin_whatsapp')}
          className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all group"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-stone-900">WhatsApp Notification Logs</h3>
          <p className="text-xs text-stone-500 mt-1">
            Review automated transactional WhatsApp dispatches, booking confirmations, and alerts.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600">
            View Dispatch Logs <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-data-import-card"
          onClick={() => onSelectTab('admin_import')}
          className="bg-white rounded-3xl border border-emerald-200 p-5 shadow-xs hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all group bg-gradient-to-b from-white to-emerald-50/30"
        >
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-emerald-950">डेटा अपलोड व आयात (Data Importer)</h3>
          <p className="text-xs text-stone-500 mt-1">
            CSV, TSV, JSON से सीधे Firestore में डेटा अपलोड करें। RO सहित सभी सेवाएं अपलोड होंगी व 'justdial' कॉलम ड्रॉप होगा।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-emerald-700">
            डेटा अपलोड करें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-bulk-sms-card"
          onClick={() => onSelectTab('admin_bulk_sms')}
          className="bg-white rounded-3xl border border-teal-200 p-5 shadow-xs hover:shadow-md hover:border-teal-400 cursor-pointer transition-all group bg-gradient-to-b from-white to-teal-50/30"
        >
          <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-teal-950">बल्क SMS &amp; वीडियो कॉल</h3>
          <p className="text-xs text-stone-500 mt-1">
            ग्राहकों, टेक्नीशियन्स व फ्रेंचाइज़ी को DLT बल्क संदेश भेजें तथा लाइव वीडियो कॉल रूम आयोजित करें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-teal-700">
            कमांड सेंटर खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-zero-data-card"
          onClick={() => onOpenZeroDataModal && onOpenZeroDataModal()}
          className="bg-white rounded-3xl border border-red-200 p-5 shadow-xs hover:shadow-md hover:border-red-400 cursor-pointer transition-all group bg-gradient-to-b from-white to-red-50/30"
        >
          <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-red-950">पूरा डेटा 0 करें (डेटा रीसेट)</h3>
          <p className="text-xs text-stone-500 mt-1">
            सभी बुकिंग्स, वित्तीय लेनदेन, लॉग्स व वॉलेट को प्रशासनिक अनुमति के साथ 0 करें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-red-600">
            डेटा 0 करें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-data-explorer-card"
          onClick={() => onSelectTab('admin_data_explorer')}
          className="bg-white rounded-3xl border border-indigo-200 p-5 shadow-xs hover:shadow-md hover:border-indigo-400 cursor-pointer transition-all group bg-gradient-to-b from-white to-indigo-50/30"
        >
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Database className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-indigo-950">डेटा एक्सप्लोरर (Data Explorer)</h3>
          <p className="text-xs text-stone-500 mt-1">
            किसी भी Firestore कलेक्शन के सभी डॉक्युमेंट्स तालिका में देखें और हर प्रविष्टि के आगे 'Delete' बटन से चुनिंदा डिलीट करें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-indigo-700">
            एक्सप्लोरर खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-super-dashboard-card"
          onClick={() => onSelectTab('admin_super_dashboard')}
          className="bg-white rounded-3xl border border-amber-300 p-5 shadow-xs hover:shadow-md hover:border-amber-500 cursor-pointer transition-all group bg-gradient-to-b from-white to-amber-50/40"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-950">सुपर एडमिन मास्टर (Super Admin)</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              500+ जिले
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            अखिल भारतीय जिला नेटवर्क, सक्रियण स्थिति, फ्रेंचाइज़ी पार्टनर व सकल लाभ का केंद्रीय नियंत्रण।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-amber-800">
            मास्टर पैनल खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-reports-manager-card"
          onClick={() => onSelectTab('admin_reports_manager')}
          className="bg-white rounded-3xl border border-teal-200 p-5 shadow-xs hover:shadow-md hover:border-teal-400 cursor-pointer transition-all group bg-gradient-to-b from-white to-teal-50/30"
        >
          <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-teal-950">बहुआयामी राजस्व रिपोर्ट</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
              CSV / PDF
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            अखिल भारतीय / राज्य / जिलावार वित्तीय रिपोर्ट, सेटलमेंट और कमीशन का विस्तृत बहीखाता व CSV एक्सपोर्ट।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-teal-700">
            रिपोर्ट केंद्र खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-audit-logs-card"
          onClick={() => onSelectTab('admin_audit_logs')}
          className="bg-white rounded-3xl border border-stone-300 p-5 shadow-xs hover:shadow-md hover:border-stone-500 cursor-pointer transition-all group bg-gradient-to-b from-white to-stone-100"
        >
          <div className="w-11 h-11 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-950">सुरक्षा ऑडिट ट्रेल</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-200 text-stone-800">
              Live Logs
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            जिला सक्रियण, ZIP आयात, पार्टनर बदलाव व रिपोर्ट डाउनलोड्स का अपरिवर्तनीय ऑडिट रिकॉर्ड।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-stone-900">
            ऑडिट लॉग्स देखें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-broadcast-studio-card"
          onClick={() => onSelectTab('admin_broadcast')}
          className="bg-white rounded-3xl border border-amber-300 p-5 shadow-xs hover:shadow-md hover:border-amber-500 cursor-pointer transition-all group bg-gradient-to-b from-white to-amber-50/40"
        >
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">त्योहार व प्रशासनिक ब्रॉडकास्ट</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
              4 Apps
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            सर्विसमैन, कस्टमर, फ्रेंचाइजी व प्रमोटर ऐप्स पर सीधे दीपावली/होली के वेलकम संदेश व नोटिस प्रसारित करें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-amber-700">
            ब्रॉडकास्ट स्टूडियो खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-domain-settings-card"
          onClick={() => onSelectTab('admin_settings')}
          className="bg-white rounded-3xl border border-orange-200 p-5 shadow-xs hover:shadow-md hover:border-orange-400 cursor-pointer transition-all group bg-gradient-to-b from-white to-orange-50/30"
        >
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <Globe className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">कस्टम डोमेन (edusuper.in)</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
              DNS गाइड
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            अपने GoDaddy या Hostinger डोमेन को इस ऐप से जोड़ने के लिए A-Record व CNAME देखें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-orange-600">
            DNS सेटअप देखें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* District Modals */}
      <DistrictZipUploadModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        defaultDistrictId="gwalior"
        defaultDistrictName="Gwalior"
      />

      <DistrictActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        preselectedDistrict="Gwalior"
        preselectedState="Madhya Pradesh"
      />
    </div>
  );
};

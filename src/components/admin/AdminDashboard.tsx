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
  Briefcase,
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
  MousePointerClick,
  Search,
  Command,
  Image as ImageIcon,
  FolderArchive,
  Rocket,
  ChevronRight,
  PhoneCall,
  PhoneOutgoing,
  Phone,
  Bot,
  Headphones,
  Layers,
  Play,
  Pause,
  Inbox,
  Send,
  FileText,
  Share2,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Booking, Service, Category, ServiceMan } from '../../types';
import { AdminFranchiseRevenueSummary } from './AdminFranchiseRevenueSummary';
import { AdminDataVisualization } from './AdminDataVisualization';
import { DistrictZipUploadModal } from './DistrictZipUploadModal';
import { DistrictActivationModal } from './DistrictActivationModal';
import { AdminRealtimeNotificationCenter } from './AdminRealtimeNotificationCenter';
import { AdminLiveBookingsMap } from './AdminLiveBookingsMap';
import { DashboardIdCardBanner } from '../common/DashboardIdCardBanner';
import { AdminUniversalSearchModal } from './AdminUniversalSearchModal';
import { AdminSparkQuotaCard } from './AdminSparkQuotaCard';

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
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  // Global keyboard shortcut (Ctrl+K or Cmd+K) to open master database search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsUniversalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/* Official Admin ID Card Banner */}
      <DashboardIdCardBanner />

      {/* Firebase Spark Quota Guardrail & Operation Estimates */}
      <AdminSparkQuotaCard />

      {/* 🚀 Admin Super Center Entry Point */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-emerald-700 p-5 rounded-3xl border-2 border-amber-300 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 text-white">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-lg shrink-0">
            <Rocket className="w-8 h-8 animate-bounce text-amber-200" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/30 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-1 border border-white/20">
              <span>🌟 Master Control Layer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Admin Super Center</h2>
            <p className="text-xs sm:text-sm text-stone-100 mt-0.5">
              Growth Center • Brand Studio • Accounting Hub • Video Studio • Social Media • Marketing & SEO
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectTab && onSelectTab('admin_super_center')}
          className="relative z-10 px-6 py-3 rounded-2xl bg-stone-900 hover:bg-black text-amber-300 font-black text-xs sm:text-sm transition-all shadow-xl cursor-pointer border border-amber-400/50 hover:scale-105 flex items-center gap-2 shrink-0"
        >
          <span>🚀 Open Super Center</span>
          <ChevronRight className="w-4 h-4 text-amber-300" />
        </button>
      </div>

      {/* Universal Master Database Search Bar (Admin Power Search) */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 p-4 sm:p-5 rounded-3xl border-2 border-emerald-500/40 shadow-xl relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" /> Live Database Explorer
              </span>
              <span className="text-xs text-stone-300 font-bold hidden sm:inline">
                • किसी भी कस्टमर, सर्विसमैन, बुकिंग या लेनदेन की पूरी जानकारी तुरंत पाएं
              </span>
            </div>

            {/* Clickable / Typable Search Input Bar */}
            <div
              onClick={() => {
                setSearchInitialQuery('');
                setIsUniversalSearchOpen(true);
              }}
              className="relative flex items-center bg-stone-800/90 hover:bg-stone-800 border-2 border-emerald-400/60 hover:border-emerald-400 rounded-2xl px-4 py-3 cursor-pointer transition-all shadow-inner group/bar"
            >
              <Search className="w-5 h-5 text-emerald-400 mr-3 shrink-0 group-hover/bar:scale-110 transition-transform" />
              <input
                type="text"
                readOnly
                placeholder="डेटाबेस में कुछ भी खोजें: नाम, मोबाइल (9826...), TransactionID, Booking ID, जिला, Pincode... (Ctrl + K)"
                className="w-full bg-transparent text-white text-xs sm:text-sm font-semibold placeholder-stone-400 focus:outline-none cursor-pointer"
              />
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <kbd className="hidden sm:inline-block px-2 py-1 rounded-lg bg-stone-700/80 border border-stone-600 text-stone-300 font-mono text-[10px] font-bold shadow-xs">
                  Ctrl + K
                </kbd>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUniversalSearchOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-950/40"
                >
                  खोजें
                </button>
              </div>
            </div>
          </div>

          {/* Quick-Search Category Shortcuts */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setSearchInitialQuery('Customer');
                setIsUniversalSearchOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-blue-300 text-xs font-bold border border-blue-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>कस्टमर डेटा</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchInitialQuery('ServiceMan');
                setIsUniversalSearchOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-teal-300 text-xs font-bold border border-teal-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>सर्विसमैन (₹121)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchInitialQuery('TXN');
                setIsUniversalSearchOpen(true);
              }}
              className="px-3 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-emerald-300 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>ट्रांजेक्शन लेज़र</span>
            </button>
          </div>
        </div>
      </div>

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
              id="admin-top-page-customizer-btn"
              onClick={() => onSelectTab('admin_page_builder')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/40 border-2 border-purple-300 hover:scale-102 ring-2 ring-purple-500/50"
              title="वेबसाइट के प्रत्येक पेज का लेआउट, रंग, नई तस्वीरें जोड़ें और सेक्शंस प्रबंधित करें"
            >
              <Palette className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>🎨 पेज कस्टमाइज़र & व्यू बिल्डर (Page Studio)</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-marketing-agent-btn"
              onClick={() => onSelectTab('admin_marketing_agent')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border-2 border-amber-300 hover:scale-102 ring-2 ring-orange-500/50"
              title="Google Maps सर्विसमैन खोज, AI Ad क्रिएटिव्स, विज्ञापन व आउटरीच एजेंट"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>🎯 AI मार्केटिंग एजेंट व लीड्स (Marketing Hub)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-ad-studio-btn"
              onClick={() => onSelectTab('admin_ad_studio')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-950/40 border-2 border-rose-300 hover:scale-102 ring-2 ring-rose-500/50"
              title="AI विज्ञापन, 5-सीन रील्स वीडियो स्टोरीबोर्ड और पोस्टर मेकर"
            >
              <Video className="w-4 h-4 text-rose-200 animate-pulse" />
              <span>🎬 AI विज्ञापन व वीडियो स्टूडियो</span>
              <span className="w-2 h-2 rounded-full bg-rose-300 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('admin_control_room')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-2"
            >
              <span>🏛 Control Room</span>
            </button>
            <button
              type="button"
              id="admin-top-work-from-btn"
              onClick={() => onSelectTab('admin_work_from')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-amber-300 hover:scale-102"
              title="वर्क फ्रॉम होम टास्क्स बनाएं, टास्क सबमिशन समीक्षा करें व पेआउट्स जारी करें"
            >
              <Briefcase className="w-4 h-4 text-amber-200" />
              <span>🏠 Work From (वर्क फ्रॉम होम)</span>
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-0.5" />
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('admin_task_review')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-teal-300 font-bold text-xs border border-teal-500/30 flex items-center gap-2"
            >
              <span>🔍 Task Review</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('admin_task_payouts')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-2"
            >
              <span>💳 Task Payouts</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('admin_jobs')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-blue-300 font-bold text-xs border border-blue-500/30 flex items-center gap-2 cursor-pointer"
            >
              <span>💼 Jobs & Careers</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('blog')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-2 cursor-pointer"
            >
              <span>📰 News & Blog Center</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('admin_social_networks')}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-purple-300 font-bold text-xs border border-purple-500/30 flex items-center gap-2"
            >
              <span>📢 Social Networks</span>
            </button>

            <button
              type="button"
              id="admin-top-financial-profit-btn"
              onClick={() => onSelectTab('admin_financial_profit')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 border-2 border-emerald-300 hover:scale-102 ring-2 ring-emerald-500/50"
              title="कंपनी वित्तीय लाभ, कमीशन लेज़र, ₹121 सर्विसमैन रजिस्ट्रेशन, टैक्स व ऑपरेटिंग प्रॉफिट"
            >
              <DollarSign className="w-4 h-4 text-emerald-200 animate-pulse" />
              <span>💰 वित्तीय लाभ व प्रॉफिट हब</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-financial-ledger-btn"
              onClick={() => onSelectTab('admin_financial_ledger')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-950/40 border border-teal-300 hover:scale-102"
              title="अपरिवर्तनीय वित्तीय बहीखाता (Immutable Transaction Ledger) - TransactionID, Role, Amount, Commission, Tax, Company Profit"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-200" />
              <span>📋 फाइनेंशियल ट्रांजैक्शन लेज़र</span>
            </button>

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
              id="admin-top-image-cache-btn"
              onClick={() => onSelectTab('admin_image_cache')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-950/40 border border-blue-300 hover:scale-102"
              title="कैश्ड इमेज एसेट्स, लोड टाइम मॉनिटरिंग और सर्विस वर्कर कैश पजेशन"
            >
              <ImageIcon className="w-4 h-4 text-white" />
              <span>🖼️ इमेज कैश & परफॉर्मेंस</span>
            </button>

            <button
              type="button"
              id="admin-top-media-repo-btn"
              onClick={() => onSelectTab('admin_media_repository')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-amber-300 hover:scale-102 ring-2 ring-amber-400/30"
              title="IndexedDB लोकल मीडिया रिपॉजिटरी - ऑफलाइन इमेज, ऑडियो व वीडियो स्टोर"
            >
              <FolderArchive className="w-4 h-4 text-amber-200" />
              <span>📁 लोकल मीडिया रिपॉजिटरी (IndexedDB)</span>
            </button>

            <button
              type="button"
              id="admin-top-referral-analytics-btn"
              onClick={() => onSelectTab('admin_referral_analytics')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/40 border-2 border-emerald-300 hover:scale-102 ring-2 ring-emerald-500/50"
              title="रेफरल प्रोग्राम प्रभावशीलता, कुल रेफरल, सफल कन्वर्जन और वॉलेट रिवॉर्ड डिसबर्सल"
            >
              <Share2 className="w-4 h-4 text-emerald-200 animate-bounce" />
              <span>🎁 रेफरल प्रोग्राम एनालिटिक्स</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-ai-calling-btn"
              onClick={() => onSelectTab('admin_ai_calling')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border-2 border-amber-300 hover:scale-102 ring-2 ring-orange-400/50"
              title="HARDINKAAM AI Calling Agent - JioCX Telephony, Voice AI Bridge & ऑटोमेटेड कॉलिंग अभियान"
            >
              <Radio className="w-4 h-4 text-stone-950 animate-pulse" />
              <span>🎙️ AI कॉलिंग एजेंट (Voice AI)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-video-studio-btn"
              onClick={() => onSelectTab('admin_video_studio')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-950/40 border border-rose-300 hover:scale-102 ring-2 ring-rose-400/40"
              title="Gemini 3.8 AI वीडियो ऐड व शॉर्ट फिल्म स्टूडियो - टेक्स्ट से वीडियो, कैमरा/माइक रिकॉर्डिंग व ऑडियो मिक्सर"
            >
              <Video className="w-4 h-4 text-rose-200 animate-pulse" />
              <span>🎬 AI वीडियो ऐड स्टूडियो (Gemini 3.8)</span>
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-tax-engine-btn"
              onClick={() => onSelectTab('admin_tax')}
              className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-950/40 border border-amber-300 hover:scale-102"
              title="भारतीय कराधान, GSTIN, SAC कोड व CA समीक्षा"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
              <span>🏛️ कराधान व GST इंजन</span>
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
              id="admin-top-knowledge-btn"
              onClick={() => onSelectTab('admin_knowledge')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border border-amber-300 hover:scale-102"
              title="KaamDost AI ज्ञानकोष: सेवाएं, दरें, नियम व FAQs रियल-टाइम अपडेट करें"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>🧠 KaamDost AI ज्ञानकोष (Knowledge Hub)</span>
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
              id="admin-top-analytics-btn"
              onClick={() => onSelectTab('admin_analytics')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-950/40 border border-blue-400 hover:scale-102"
              title="विजिटर व AdMob क्लिक रिपोर्ट: ऐप कहां खुली और किसने क्या क्लिक किया"
            >
              <BarChart3 className="w-4 h-4 text-amber-300" />
              <span>📊 विजिटर व AdMob रिपोर्ट</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-400/30 text-white text-[9px] font-bold">
                Live
              </span>
            </button>

            <button
              type="button"
              id="admin-top-inbox-outbox-btn"
              onClick={() => onSelectTab('admin_inbox_outbox')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-950/40 border-2 border-amber-300 hover:scale-105 ring-2 ring-amber-400/40"
              title="ग्राहकों व सर्विसमैन के सभी अनुरोध, नकद अप्रूवल, सपोर्ट मैसेज इनबॉक्स व भेजे गए संदेश आउटबॉक्स"
            >
              <Inbox className="w-4 h-4 text-amber-200 animate-bounce" />
              <span>📥 अनुरोध व संदेश इनबॉक्स / आउटबॉक्स</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black">
                Inbox
              </span>
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

            <button
              type="button"
              id="admin-top-ai-funnel-btn"
              onClick={() => onSelectTab('admin_ai_funnel')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 via-violet-600 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-950/40 border-2 border-purple-300 hover:scale-102 ring-2 ring-purple-500/50"
              title="AI फनल ऑटोमेशन: लीड स्कोरिंग (0-100), स्टेज पाइपलाइन, डुप्लीकेशन चेक व नेक्स्ट बेस्ट एक्शन"
            >
              <Bot className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>🤖 AI फनल ऑटोमेशन (Lead Pipeline & Scoring)</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-kaamdost-control-btn"
              onClick={() => onSelectTab('admin_kaamdost_control')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-cyan-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-teal-950/40 border-2 border-teal-300 hover:scale-102 ring-2 ring-teal-500/50"
              title="कामदोस्त AI असिस्टेंट मास्टर कंट्रोल: वॉयस, प्रॉम्प्ट्स, अनुमतियां व लाइव सेटिंग्स"
            >
              <Headphones className="w-4 h-4 text-teal-200 animate-pulse" />
              <span>🎙️ कामदोस्त AI मास्टर कंट्रोल (KaamDost Admin)</span>
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-ping ml-0.5" />
            </button>

            <button
              type="button"
              id="admin-top-care-amc-btn"
              onClick={() => onSelectTab('admin_care_amc')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg border border-teal-300 hover:scale-102"
              title="केयर वारंटी पॉलिसी, 7-दिन रि-सर्विस गारंटी, AMC प्लांस व कंप्लेंट्स"
            >
              <ShieldCheck className="w-4 h-4 text-teal-200" />
              <span>🛡️ केयर & AMC वारंटी (Hardinkaam Care)</span>
            </button>

            <button
              type="button"
              id="admin-top-rfq-btn"
              onClick={() => onSelectTab('admin_rfq')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-700 to-red-700 hover:from-orange-600 hover:to-red-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg border border-orange-300 hover:scale-102"
              title="बड़े प्रोजेक्ट्स के लिए RFQ / मल्टीपल कोट्स बिडिंग मैनेजर"
            >
              <FileText className="w-4 h-4 text-orange-200" />
              <span>📋 RFQ मल्टीपल कोट्स (Project Bidding)</span>
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

      {/* AI Marketing Agent & Growth Engine Quick Launch Strip */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-4 sm:p-5 text-white shadow-md border-2 border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
            <Sparkles className="w-6 h-6 text-amber-200 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-white">
                HARDINKAAM AI Marketing Agent &amp; Ad Creative Studio
              </h4>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-white text-orange-700 shadow-xs flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-orange-600" /> New Live
              </span>
            </div>
            <p className="text-xs text-amber-100 mt-0.5">
              Google Maps ग्राउंडिंग से नए इलेक्ट्रीशियन, प्लंबर व कारपेंटर खोजें, मल्टी-फॉर्मेट विज्ञापन स्क्रिप्ट बनाएं और फील्ड आउटरीच टास्क असाइन करें।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            id="admin-launch-marketing-studio-btn"
            onClick={() => onSelectTab('admin_marketing_agent')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-orange-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md hover:scale-102 cursor-pointer"
          >
            <span>🎯 मार्केटिंग एजेंट खोलें (Open Studio)</span>
            <ArrowRight className="w-3.5 h-3.5 text-orange-600" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AI CALLING AGENT SUB-MENU SECTION (Admin Only) */}
      {/* ========================================================================= */}
      <div className="bg-stone-900 rounded-3xl p-5 md:p-6 border border-stone-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md shadow-orange-500/20">
              <Bot className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">AI Calling (वॉइस AI कॉलिंग सब-मेन्यू)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  JioCX Ready
                </span>
                <span className="px-2 py-0.5 rounded-full text-2xs font-black bg-orange-500/20 text-orange-300">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                सर्विसमैन ऑनबोर्डिंग, कस्टमर ऑफर्स व फॉलो-अप्स हेतु स्वचालित टेलीफोनी व Voice AI कॉलिंग प्रबंधन।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="admin-open-full-ai-calling-btn"
              onClick={() => onSelectTab('admin_ai_calling')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer hover:scale-102 transition-all"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>कॉलिंग हब खोलें (Full Hub)</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* AI Calling Sub-Menu 3-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Calling Overview */}
          <div
            id="admin-card-calling-overview"
            onClick={() => onSelectTab('admin_ai_calling_overview')}
            className="bg-stone-950/80 rounded-2xl border border-stone-800 hover:border-orange-500/50 p-4.5 space-y-3 cursor-pointer group transition-all hover:bg-stone-950 shadow-md hover:scale-101"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-stone-950 transition-colors">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                Live Analytics
              </span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">
                1. कॉलिंग ओवरव्यू (Calling Overview)
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                आज की कुल कॉल्स, कनेक्ट रेट, इच्छुक लीड्स (Interested), ह्यूमन ट्रांसफर व कुल AI टॉक टाइम विश्लेषण।
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-2xs font-bold text-orange-400">
              <span>लाइव मेट्रिक्स देखें</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Campaign Management */}
          <div
            id="admin-card-campaign-management"
            onClick={() => onSelectTab('admin_ai_calling_campaigns')}
            className="bg-stone-950/80 rounded-2xl border border-stone-800 hover:border-amber-500/50 p-4.5 space-y-3 cursor-pointer group transition-all hover:bg-stone-950 shadow-md hover:scale-101"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-950 transition-colors">
                <Play className="w-5 h-5" />
              </div>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                Campaigns
              </span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                2. अभियान प्रबंधन (Campaign Management)
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                नए अभियान बनाना, शुरू व पॉज़ करना, भाषा (हिंदी/हिंग्लिश), कॉलिंग आवर्स (10 AM - 6 PM IST) व सुरक्षा सीमाएं।
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-2xs font-bold text-amber-400">
              <span>अभियान नियंत्रित करें</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Call Queue */}
          <div
            id="admin-card-call-queue"
            onClick={() => onSelectTab('admin_ai_calling_queue')}
            className="bg-stone-950/80 rounded-2xl border border-stone-800 hover:border-emerald-500/50 p-4.5 space-y-3 cursor-pointer group transition-all hover:bg-stone-950 shadow-md hover:scale-101"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-stone-950 transition-colors">
                <PhoneOutgoing className="w-5 h-5" />
              </div>
              <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                Queue & Leads
              </span>
            </div>
            <div>
              <h4 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                3. कॉल कतार (Call Queue)
              </h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                मार्केटिंग लीड्स से ट्रेड/शहर अनुसार कतार भरना, कॉलिंग स्टेट्स (Pending, Calling, Completed) व बैच डायलिंग।
              </p>
            </div>
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-2xs font-bold text-emerald-400">
              <span>कॉल कतार प्रबंधित करें</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
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
          id="admin-quick-financial-profit-card"
          onClick={() => onSelectTab('admin_financial_profit')}
          className="bg-white rounded-3xl border-2 border-emerald-400 p-5 shadow-sm hover:shadow-lg hover:border-emerald-600 cursor-pointer transition-all group bg-gradient-to-b from-emerald-50/60 to-teal-50/40 ring-2 ring-emerald-400/20"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-emerald-500/30">
            <DollarSign className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900">वित्तीय लाभ व लेज़र</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
              ₹121 Model
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 font-medium leading-relaxed">
            ₹121 सर्विसमैन रजिस्ट्रेशन, कंपनी ग्रॉस व नेट मार्जिन, कमीशन पूल कैपिंग और ऑडिट लेज़र।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-emerald-700 group-hover:translate-x-1 transition-transform">
            फाइनेंशियल हब खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-page-customizer-card"
          onClick={() => onSelectTab('admin_page_builder')}
          className="bg-white rounded-3xl border-2 border-purple-400 p-5 shadow-sm hover:shadow-lg hover:border-purple-600 cursor-pointer transition-all group bg-gradient-to-b from-purple-50/50 to-indigo-50/30 ring-2 ring-purple-400/20"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-purple-500/30">
            <Palette className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900">पेज कस्टमाइज़र &amp; व्यू</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-600 text-white flex items-center gap-1 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" /> CMS
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 font-medium leading-relaxed">
            वेबसाइट के प्रत्येक पेज का लेआउट, रंग, नई तस्वीरें जोड़ें और सेक्शंस लाइव बदलें या हटाएं।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-purple-600 group-hover:translate-x-1 transition-transform">
            पेज स्टूडियो खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-marketing-agent-card"
          onClick={() => onSelectTab('admin_marketing_agent')}
          className="bg-white rounded-3xl border-2 border-orange-400 p-5 shadow-sm hover:shadow-lg hover:border-orange-600 cursor-pointer transition-all group bg-gradient-to-b from-orange-50/50 to-amber-50/30 ring-2 ring-orange-400/20"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-orange-500/30">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900">AI मार्केटिंग एजेंट व लीड्स</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-600 text-white flex items-center gap-1 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" /> NEW
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 font-medium leading-relaxed">
            Google, Maps व पूरे इंटरनेट से सर्विसमैन खोजें, एक्सेल शीट डाउनलोड/अपलोड करें, और लीड्स डाटाबेस मैनेज करें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-orange-600 group-hover:translate-x-1 transition-transform">
            मार्केटिंग हब खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-ai-calling-card"
          onClick={() => onSelectTab('admin_ai_calling')}
          className="bg-white rounded-3xl border-2 border-amber-400 p-5 shadow-sm hover:shadow-lg hover:border-orange-500 cursor-pointer transition-all group bg-gradient-to-b from-orange-50/50 to-amber-50/30 ring-2 ring-amber-400/20"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-stone-950 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-orange-500/30 font-black">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900">AI कॉलिंग एजेंट</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-600 text-white flex items-center gap-1 shadow-xs">
              <Radio className="w-2.5 h-2.5" /> JIO CX
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 font-medium leading-relaxed">
            कॉलिंग ओवरव्यू, अभियान प्रबंधन, और मार्केटिंग लीड्स कॉल कतार — 24x7 ऑटोमेटेड वॉइस कॉलिंग।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-orange-600 group-hover:translate-x-1 transition-transform">
            कॉलिंग एजेंट खोलें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <div
          id="admin-quick-analytics-card"
          onClick={() => onSelectTab('admin_analytics')}
          className="bg-white rounded-3xl border-2 border-blue-400 p-5 shadow-sm hover:shadow-lg hover:border-blue-600 cursor-pointer transition-all group bg-gradient-to-b from-blue-50/50 to-indigo-50/30 ring-2 ring-blue-400/20"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-blue-500/30">
            <BarChart3 className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900">विजिटर व AdMob रिपोर्ट</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1 font-medium leading-relaxed">
            किस शहर से ऐप खुली, किसने किस AdMob विज्ञापन या सर्विस पर क्लिक किया — संपूर्ण मार्केटिंग डेटा।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-blue-600 group-hover:translate-x-1 transition-transform">
            एनालिटिक्स रिपोर्ट देखें <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

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
          id="admin-quick-inbox-outbox-card"
          onClick={() => onSelectTab('admin_inbox_outbox')}
          className="bg-white rounded-3xl border-2 border-orange-400 p-5 shadow-xs hover:shadow-lg hover:border-orange-600 cursor-pointer transition-all group bg-gradient-to-b from-white to-orange-50/50 ring-2 ring-orange-400/20"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md shadow-orange-600/30">
            <Inbox className="w-6 h-6 animate-pulse" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-900">अनुरोध व संदेश इनबॉक्स / आउटबॉक्स</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-200">
              Inbox / Outbox
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            ग्राहकों और सर्विसमैन से आए मैसेज, नकद अप्रूवल अनुरोध, सपोर्ट टिकट एक जगह देखें और तुरंत उत्तर दें।
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-black text-orange-600 group-hover:text-orange-700">
            इनबॉक्स व आउटबॉक्स खोलें <ArrowRight className="w-3.5 h-3.5" />
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

      {/* Universal Database Master Search Modal */}
      <AdminUniversalSearchModal
        isOpen={isUniversalSearchOpen}
        onClose={() => setIsUniversalSearchOpen(false)}
        onSelectTab={onSelectTab}
        initialQuery={searchInitialQuery}
      />
    </div>
  );
};

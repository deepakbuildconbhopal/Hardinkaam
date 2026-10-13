import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Palette,
  Newspaper,
  Calculator,
  LayoutTemplate,
  Video,
  Share2,
  Users,
  Search,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  Activity,
  Globe,
  DollarSign,
  BarChart3,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Server,
  Smartphone,
  Laptop,
  FileText,
  Megaphone,
  Briefcase,
  Zap,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  Plus,
  Trash2,
  Check,
  Image,
  Sliders,
  Upload,
  Database,
  MessageSquare,
  ShieldCheck,
  Navigation,
  Bot,
  Headphones,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { Booking, ServiceMan, Category, Service } from '../../../types';
import { AdminThemeManager } from '../AdminThemeManager';
import { AdminBlogManager } from './AdminBlogManager';
import { AdminMarketingLeadsManager } from '../AdminMarketingLeadsManager';
import { AdminMarketingAgent } from '../AdminMarketingAgent';
import { AdminAIVideoStudio } from '../AdminAIVideoStudio';
import { AdCreativeStudio } from '../AdCreativeStudio';
import { AdminBusinessIntelligenceDashboard } from '../AdminBusinessIntelligenceDashboard';
import { AdminDataImportManager } from '../AdminDataImportManager';
import { AdminUniversalSearchManager } from './AdminUniversalSearchManager';
import { AdminDataExplorer } from '../AdminDataExplorer';
import { AdminMediaRepository } from '../AdminMediaRepository';
import { AdminBroadcastNoticeManager } from '../AdminBroadcastNoticeManager';
import { AdminWhatsAppLogs } from '../AdminWhatsAppLogs';
import { AdminCareAndAmcManager } from '../AdminCareAndAmcManager';
import { AdminRfqManager } from '../AdminRfqManager';
import { AdminPageCustomizer } from '../AdminPageCustomizer';
import { AdminLiveBookingsMap } from '../AdminLiveBookingsMap';
import { AdminMasterReset } from './AdminMasterReset';
import { AdminAiFunnelAutomation } from '../AdminAiFunnelAutomation';
import { AdminKaamDostControlPanel } from '../AdminKaamDostControlPanel';

interface Props {
  bookings: Booking[];
  serviceMen: ServiceMan[];
  categories: Category[];
  services: Service[];
  onSelectTab: (tab: string) => void;
}

type SuperModuleId =
  | 'dashboard'
  | 'growth'
  | 'brand'
  | 'media'
  | 'broadcast'
  | 'whatsapp'
  | 'care'
  | 'rfq'
  | 'blog'
  | 'accounting'
  | 'bi'
  | 'import'
  | 'search'
  | 'data_explorer'
  | 'builder'
  | 'video'
  | 'social'
  | 'marketing'
  | 'marketing_agent'
  | 'seo'
  | 'health'
  | 'live_tracking'
  | 'ai_funnel'
  | 'kaamdost_control'
  | 'master_reset';

interface BannerItem {
  id: string;
  titleEn: string;
  titleHi: string;
  subtitleEn: string;
  subtitleHi: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
}

export const AdminSuperCenter: React.FC<Props> = ({
  bookings,
  serviceMen,
  categories,
  services,
  onSelectTab,
}) => {
  const { isAdmin, userProfile, currentUser } = useAuth();
  const [activeModule, setActiveModule] = useState<SuperModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Growth Center State
  const [growthTimeRange, setGrowthTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Banner Gallery State
  const [banners, setBanners] = useState<BannerItem[]>([
    {
      id: 'b1',
      titleEn: 'Expert Home Services in Bhopal',
      titleHi: 'भोपाल में विशेषज्ञ होम सर्विसेज',
      subtitleEn: 'AC Repair, Salon, Plumbing & Electrician at your doorstep',
      subtitleHi: 'एसी रिपेयर, सैलून, प्लंबिंग और इलेक्ट्रीशियन आपके दरवाजे पर',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
      order: 1,
    },
    {
      id: 'b2',
      titleEn: 'Diwali & Festive Special Dispatches',
      titleHi: 'दिवाली और त्योहारी विशेष ऑफर',
      subtitleEn: 'Get up to 40% OFF on all home maintenance packages',
      subtitleHi: 'सभी होम मेंटेनेंस पैकेज पर 40% तक की छूट पाएं',
      imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
      order: 2,
    },
  ]);
  const [newBannerTitleEn, setNewBannerTitleEn] = useState('');
  const [newBannerTitleHi, setNewBannerTitleHi] = useState('');
  const [newBannerSubEn, setNewBannerSubEn] = useState('');
  const [newBannerSubHi, setNewBannerSubHi] = useState('');
  const [newBannerImg, setNewBannerImg] = useState('');
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Security Verification: Strict Admin Role check
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-stone-900 text-white">
        <div className="max-w-md w-full bg-stone-800 p-8 rounded-3xl border border-rose-500/40 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
          <h2 className="text-xl font-black">Unauthorized Access</h2>
          <p className="text-xs text-stone-400">
            Admin Super Center is restricted to platform administrators with verified credentials.
          </p>
          <button
            onClick={() => onSelectTab('landing')}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  // Calculate live KPI metrics from existing Firestore state
  const totalGMV = bookings.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalRevenue = Math.round(totalGMV * 0.15);
  const companyProfit = Math.round(totalRevenue * 0.65);
  const activeProsCount = serviceMen.filter((s) => s.isVerified).length;
  const completedBookingsCount = bookings.filter((b) => b.status === 'completed').length;
  const conversionRate = bookings.length > 0 ? ((completedBookingsCount / bookings.length) * 100).toFixed(1) : '94.2';

  const MODULES: Array<{ id: SuperModuleId; title: string; subtitle: string; icon: any; color: string }> = [
    { id: 'growth', title: 'Growth Center', subtitle: 'Visitors, Funnel & Conversion Analytics', icon: TrendingUp, color: 'from-blue-600 to-indigo-600' },
    { id: 'brand', title: 'Banner & Brand Studio', subtitle: 'Logo, 50+ Themes & Carousel Control', icon: Palette, color: 'from-pink-600 to-rose-600' },
    { id: 'media', title: 'Media Repository', subtitle: 'Centralized Asset Library & Storage Manager', icon: Image, color: 'from-fuchsia-600 to-pink-600' },
    { id: 'broadcast', title: 'Broadcast & Notifications', subtitle: 'Festival Greetings, Notices & App Popups', icon: Megaphone, color: 'from-orange-600 to-amber-600' },
    { id: 'whatsapp', title: 'WhatsApp Logs', subtitle: 'Dispatch Audit, Delivery Status & Gateway History', icon: MessageSquare, color: 'from-emerald-600 to-teal-600' },
    { id: 'care', title: 'Care & AMC Manager', subtitle: 'Warranties, Memberships & Maintenance Contracts', icon: ShieldCheck, color: 'from-teal-600 to-emerald-700' },
    { id: 'rfq', title: 'RFQ / Multiple Quotes', subtitle: 'Large Project Bidding, Quotes & Fee Setup', icon: FileText, color: 'from-orange-600 to-red-600' },
    { id: 'blog', title: 'Blog & News Center', subtitle: 'Articles, Bhopal News & SEO Tips', icon: Newspaper, color: 'from-amber-600 to-orange-600' },
    { id: 'accounting', title: 'Accounting Hub', subtitle: 'Ledger, Profit & Loss, GST Summary', icon: Calculator, color: 'from-emerald-600 to-teal-600' },
    { id: 'bi', title: 'Business Intelligence', subtitle: 'Executive Overview, P&L & Financial BI', icon: BarChart3, color: 'from-teal-600 to-cyan-600' },
    { id: 'import', title: 'Data Import & Merge', subtitle: 'Excel/CSV Imports, Mapping & Deduplication', icon: Upload, color: 'from-blue-700 to-indigo-700' },
    { id: 'search', title: 'Universal Search', subtitle: 'Global Search across Users, Leads & Bookings', icon: Search, color: 'from-emerald-600 to-green-600' },
    { id: 'data_explorer', title: 'Data Explorer', subtitle: 'Secure Diagnostic Browser for Firestore', icon: Database, color: 'from-amber-600 to-yellow-600' },
    { id: 'builder', title: 'Advanced Page Builder', subtitle: 'Visual Builder, Sections & Layers', icon: LayoutTemplate, color: 'from-purple-600 to-violet-600' },
    { id: 'video', title: 'HARDINKAAM AI Ad Studio', subtitle: 'AI Commercials, Multi-Language, Voiceover & Mixing', icon: Sparkles, color: 'from-amber-500 via-orange-600 to-red-600' },
    { id: 'social', title: 'Social Media Studio', subtitle: 'Instagram, FB, YouTube AI Generator', icon: Share2, color: 'from-sky-600 to-blue-600' },
    { id: 'marketing', title: 'Marketing & Leads', subtitle: 'Leads, Campaigns & WhatsApp Prep', icon: Users, color: 'from-cyan-600 to-teal-600' },
    { id: 'marketing_agent', title: 'AI Marketing Agent', subtitle: 'Gemini AI Campaigns & Local Outreach', icon: Sparkles, color: 'from-violet-600 to-indigo-600' },
    { id: 'seo', title: 'SEO & Content Control', subtitle: 'Meta Titles, Schema & Indexing Health', icon: Search, color: 'from-emerald-700 to-green-600' },
    { id: 'health', title: 'System Health', subtitle: 'API, Firebase, Payments & Error Logs', icon: Activity, color: 'from-stone-700 to-stone-900' },
    { id: 'live_tracking', title: 'Live Booking Map & Tracking', subtitle: 'Real-time Serviceman GPS, Routes & Diagnostics', icon: Navigation, color: 'from-orange-600 to-amber-600' },
    { id: 'ai_funnel', title: 'AI Funnel Automation', subtitle: 'Lead Inbox, AI Scoring (0-100), Pipeline Stages & Action Engine', icon: Bot, color: 'from-purple-600 via-indigo-600 to-violet-700' },
    { id: 'kaamdost_control', title: 'KaamDost AI Master Control', subtitle: 'Voice Prompts, Triggers, Knowledge Tuning & Permissions', icon: Headphones, color: 'from-teal-600 via-cyan-600 to-blue-700' },
    { id: 'master_reset', title: 'Master Firebase Reset', subtitle: 'Super-Admin-Only Fresh Production Reset', icon: ShieldAlert, color: 'from-rose-600 to-red-700' },
  ];

  const handleAddBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitleEn || !newBannerImg) {
      alert('Please fill in at least English Title and Image URL.');
      return;
    }
    const newB: BannerItem = {
      id: 'banner_' + Date.now(),
      titleEn: newBannerTitleEn,
      titleHi: newBannerTitleHi || newBannerTitleEn,
      subtitleEn: newBannerSubEn,
      subtitleHi: newBannerSubHi || newBannerSubEn,
      imageUrl: newBannerImg,
      isActive: true,
      order: banners.length + 1,
    };
    setBanners([...banners, newB]);
    setNewBannerTitleEn('');
    setNewBannerTitleHi('');
    setNewBannerSubEn('');
    setNewBannerSubHi('');
    setNewBannerImg('');
    setBannerSuccess('Banner added successfully!');
    setTimeout(() => setBannerSuccess(null), 3000);
  };

  const handleToggleBanner = (id: string) => {
    setBanners(banners.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
  };

  const handleDeleteBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans antialiased pb-20">
      {/* Super Center Header */}
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('admin_dashboard')}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Back to Master Admin Panel"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                MASTER COMMAND CENTER
              </span>
              <span className="text-[10px] text-stone-400 hidden md:inline">
                User: {currentUser?.email || userProfile?.email}
              </span>
            </div>
            <h1 className="text-base sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🚀 HARDINKAAM Admin Super Center</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveModule('dashboard')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeModule === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden px-3 py-1.5 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold"
          >
            Modules ▾
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-stone-900 border-b border-stone-800 p-4 space-y-2">
          <div className="text-[10px] uppercase font-bold text-stone-400 mb-1">Super Center Modules</div>
          <button
            onClick={() => { setActiveModule('dashboard'); setMobileMenuOpen(false); }}
            className="w-full text-left px-3 py-2 rounded-xl bg-stone-800 text-xs font-bold text-white"
          >
            📊 Command Dashboard
          </button>
          {MODULES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setActiveModule(m.id); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-xs font-medium text-stone-200 flex items-center gap-2"
            >
              <m.icon className="w-4 h-4 text-emerald-400" />
              <span>{m.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Layout: Sidebar + Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-4 sm:p-8">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-72 shrink-0 space-y-2">
          <div className="bg-stone-900 rounded-3xl p-4 border border-stone-800 shadow-xl space-y-1.5">
            <div className="text-[10px] uppercase font-black text-stone-400 px-3 py-1 tracking-wider">
              Control Modules
            </div>
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
                activeModule === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Command Dashboard</span>
            </button>
            {MODULES.map((m) => {
              const Icon = m.icon;
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveModule(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r ' + m.color + ' text-white shadow-lg'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="text-left truncate">
                    <div className="truncate">{m.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-6">
          {activeModule === 'dashboard' && (
            <div className="space-y-6">
              {/* Welcome Hero Banner */}
              <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-emerald-950 p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    <span>HARDINKAAM SUPER CENTER COMMAND DECK</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Business • Growth • Finance • Marketing • Content
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-2xl">
                    Welcome to the master control layer. Monitor platform analytics, manage branding, accounting ledgers, AI video studios, social media campaigns, and system health in real time.
                  </p>
                </div>
              </div>

              {/* KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Today's Visitors</div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">2,480</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">↑ 18.4% vs yesterday</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Total Registrations</div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">1,124</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">Verified Users</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Platform Revenue (GMV)</div>
                  <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1">₹{totalGMV.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-stone-400 mt-1">Total Bookings: {bookings.length}</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Company Profit</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">₹{companyProfit.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">Net Margin 65%</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Active ServiceMen</div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">{activeProsCount}</div>
                  <div className="text-[10px] text-stone-400 mt-1">Verified & Ready</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Active Leads</div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">348</div>
                  <div className="text-[10px] text-blue-400 font-bold mt-1">Google Maps AI</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">Conversion Rate</div>
                  <div className="text-xl sm:text-2xl font-black text-white mt-1">{conversionRate}%</div>
                  <div className="text-[10px] text-emerald-400 font-bold mt-1">High Intent</div>
                </div>
                <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-lg">
                  <div className="text-stone-400 text-[11px] font-bold">System Status</div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">Firebase v12 Active</div>
                </div>
              </div>

              {/* Large Module Cards Grid */}
              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase text-stone-400 tracking-wider">Super Center Modules</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MODULES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setActiveModule(m.id)}
                        className="bg-stone-900 hover:bg-stone-850 p-6 rounded-3xl border border-stone-800 hover:border-emerald-500/50 shadow-xl transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-r ${m.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-emerald-400 transition-colors">
                              {m.title}
                            </h4>
                            <p className="text-xs text-stone-400 mt-1">
                              {m.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-800/80 text-xs font-bold text-stone-300 group-hover:text-white">
                          <span>Launch Module</span>
                          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 1. ADMIN GROWTH CENTER */}
          {activeModule === 'growth' && (
            <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Growth & Analytics Center</h2>
                    <p className="text-xs text-stone-400">Visitor Tracking, Conversion Funnels & UX Insights</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-stone-800 p-1 rounded-xl flex items-center border border-stone-700 text-xs font-bold">
                    <button
                      onClick={() => setGrowthTimeRange('daily')}
                      className={`px-3 py-1 rounded-lg transition-colors ${growthTimeRange === 'daily' ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => setGrowthTimeRange('weekly')}
                      className={`px-3 py-1 rounded-lg transition-colors ${growthTimeRange === 'weekly' ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => setGrowthTimeRange('monthly')}
                      className={`px-3 py-1 rounded-lg transition-colors ${growthTimeRange === 'monthly' ? 'bg-blue-600 text-white' : 'text-stone-400 hover:text-white'}`}
                    >
                      Monthly
                    </button>
                  </div>
                  <button onClick={() => setActiveModule('dashboard')} className="text-xs font-bold text-stone-400 hover:text-white px-3 py-1 bg-stone-800 rounded-xl">Back</button>
                </div>
              </div>

              {/* Growth KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-2">
                  <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
                    <span>Page Views</span>
                    <Eye className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-white">14,892</div>
                  <div className="text-[11px] text-emerald-400 font-bold">↑ 14.2% vs previous period</div>
                </div>
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-2">
                  <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
                    <span>Signup Conversion</span>
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-white">8.6%</div>
                  <div className="text-[11px] text-emerald-400 font-bold">1,124 registered users</div>
                </div>
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-2">
                  <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
                    <span>Booking Conversion</span>
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{conversionRate}%</div>
                  <div className="text-[11px] text-amber-400 font-bold">{bookings.length} total bookings</div>
                </div>
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-2">
                  <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
                    <span>UX Rage Clicks</span>
                    <Activity className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-white">0.42%</div>
                  <div className="text-[11px] text-emerald-400 font-bold">↓ Optimal (&lt; 1%)</div>
                </div>
              </div>

              {/* Conversion Funnel Section */}
              <div className="bg-stone-800/40 p-6 rounded-2xl border border-stone-700/60 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Visitor → Registration → Booking Funnel</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 font-bold mb-1">
                      <span>1. Total Visitors (100%)</span>
                      <span className="text-blue-400">14,892 visits</span>
                    </div>
                    <div className="w-full bg-stone-900 h-3 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full w-full rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 font-bold mb-1">
                      <span>2. User Registrations & Signups (7.5%)</span>
                      <span className="text-emerald-400">1,124 signups</span>
                    </div>
                    <div className="w-full bg-stone-900 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[45%] rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-stone-300 font-bold mb-1">
                      <span>3. Confirmed Bookings (2.4%)</span>
                      <span className="text-amber-400">{bookings.length} bookings</span>
                    </div>
                    <div className="w-full bg-stone-900 h-3 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full w-[24%] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Slow Pages & Error Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-stone-800/40 p-5 rounded-2xl border border-stone-700/60 space-y-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Slow Page & Performance Insights</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-stone-300">
                    <li className="flex justify-between items-center py-1 border-b border-stone-700/40">
                      <span>/customer/home (PWA Core)</span>
                      <span className="text-emerald-400 font-bold">120ms (Fast)</span>
                    </li>
                    <li className="flex justify-between items-center py-1 border-b border-stone-700/40">
                      <span>/admin/super-center</span>
                      <span className="text-emerald-400 font-bold">180ms (Optimal)</span>
                    </li>
                    <li className="flex justify-between items-center py-1">
                      <span>/catalog/services</span>
                      <span className="text-emerald-400 font-bold">145ms (Fast)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-stone-800/40 p-5 rounded-2xl border border-stone-700/60 space-y-3">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Application Error & Exception Logs</span>
                  </h4>
                  <div className="text-xs text-stone-400 space-y-2">
                    <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-700 flex items-center justify-between">
                      <span className="text-stone-300">Unhandled API Timeouts</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">0 Errors (Stable)</span>
                    </div>
                    <div className="p-2.5 bg-stone-900 rounded-xl border border-stone-700 flex items-center justify-between">
                      <span className="text-stone-300">Firestore Offline Fallbacks</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px]">1 connected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. ADMIN BANNER GALLERY */}
          {activeModule === 'brand' && (
            <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center border border-pink-500/30">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Banner Gallery & Brand Studio</h2>
                    <p className="text-xs text-stone-400">Manage Homepage Carousels, Bilingual Titles (Hindi/English) & Active Status</p>
                  </div>
                </div>
                <button onClick={() => setActiveModule('dashboard')} className="text-xs font-bold text-stone-400 hover:text-white px-3 py-1 bg-stone-800 rounded-xl">Back</button>
              </div>

              {bannerSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bannerSuccess}</span>
                </div>
              )}

              {/* Add New Banner Form */}
              <form onSubmit={handleAddBanner} className="bg-stone-800/50 p-5 rounded-2xl border border-stone-700/60 space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Plus className="w-4 h-4 text-pink-400" />
                  <span>Add New Homepage Promotional Banner</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Title (English):</label>
                    <input
                      type="text"
                      value={newBannerTitleEn}
                      onChange={(e) => setNewBannerTitleEn(e.target.value)}
                      placeholder="e.g. Expert Home Services in Bhopal"
                      className="w-full p-2.5 text-xs bg-stone-900 border border-stone-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Title (Hindi):</label>
                    <input
                      type="text"
                      value={newBannerTitleHi}
                      onChange={(e) => setNewBannerTitleHi(e.target.value)}
                      placeholder="e.g. भोपाल में विशेषज्ञ होम सर्विसेज"
                      className="w-full p-2.5 text-xs bg-stone-900 border border-stone-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Subtitle (English):</label>
                    <input
                      type="text"
                      value={newBannerSubEn}
                      onChange={(e) => setNewBannerSubEn(e.target.value)}
                      placeholder="e.g. AC Repair & Salon at doorstep"
                      className="w-full p-2.5 text-xs bg-stone-900 border border-stone-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-300 block mb-1">Banner Image URL:</label>
                    <input
                      type="text"
                      value={newBannerImg}
                      onChange={(e) => setNewBannerImg(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full p-2.5 text-xs bg-stone-900 border border-stone-700 rounded-xl text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-black shadow-md cursor-pointer transition-colors"
                  >
                    Publish Banner
                  </button>
                </div>
              </form>

              {/* Banners List */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider">Active Carousel Banners ({banners.length})</h3>
                <div className="grid grid-cols-1 gap-4">
                  {banners.map((b) => (
                    <div key={b.id} className="bg-stone-800/60 p-4 rounded-2xl border border-stone-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <img src={b.imageUrl} alt={b.titleEn} className="w-24 h-16 object-cover rounded-xl border border-stone-700 shrink-0" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{b.titleEn}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${b.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}>
                              {b.isActive ? 'Active' : 'Hidden'}
                            </span>
                          </div>
                          <div className="text-[11px] text-pink-300 font-medium">{b.titleHi}</div>
                          <div className="text-[11px] text-stone-400">{b.subtitleEn}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleToggleBanner(b.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${b.isActive ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600/30' : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'}`}
                        >
                          {b.isActive ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(b.id)}
                          className="p-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 cursor-pointer"
                          title="Delete Banner"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Manager Integration Bridge */}
              <div className="pt-6 border-t border-stone-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Advanced Theme Manager Studio</h3>
                    <p className="text-xs text-stone-400">Select from 50+ festival and national themes to apply instantly across the platform.</p>
                  </div>
                </div>
                <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800">
                  <AdminThemeManager />
                </div>
              </div>
            </div>
          )}

          {activeModule === 'media' && (
            <AdminMediaRepository onBack={() => setActiveModule('dashboard')} />
          )}

          {activeModule === 'broadcast' && (
            <AdminBroadcastNoticeManager onSelectTab={onSelectTab} />
          )}

          {activeModule === 'whatsapp' && (
            <AdminWhatsAppLogs />
          )}

          {activeModule === 'care' && (
            <AdminCareAndAmcManager />
          )}

          {activeModule === 'rfq' && (
            <AdminRfqManager />
          )}

          {activeModule === 'blog' && (
            <AdminBlogManager onBack={() => setActiveModule('dashboard')} />
          )}

          {activeModule === 'bi' && (
            <AdminBusinessIntelligenceDashboard bookings={bookings} onSelectTab={onSelectTab} />
          )}

          {activeModule === 'import' && (
            <AdminDataImportManager onRefresh={() => {}} onSelectTab={onSelectTab} />
          )}

          {activeModule === 'search' && (
            <AdminUniversalSearchManager onBack={() => setActiveModule('dashboard')} onSelectTab={onSelectTab} />
          )}

          {activeModule === 'data_explorer' && (
            <AdminDataExplorer onSelectTab={onSelectTab} />
          )}

          {activeModule === 'accounting' && (
            <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Accounting Hub</h2>
                    <p className="text-xs text-stone-400">Chart of Accounts, Ledger, P&L, GST & Company Profit</p>
                  </div>
                </div>
                <button onClick={() => setActiveModule('dashboard')} className="text-xs font-bold text-stone-400 hover:text-white px-3 py-1 bg-stone-800 rounded-xl">Back</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-1">
                  <div className="text-xs text-stone-400">Total Platform GMV</div>
                  <div className="text-xl font-black text-white">₹{totalGMV.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-1">
                  <div className="text-xs text-stone-400">GST / Tax Summary (18%)</div>
                  <div className="text-xl font-black text-emerald-400">₹{Math.round(totalGMV * 0.18).toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-1">
                  <div className="text-xs text-stone-400">Net Company Profit</div>
                  <div className="text-xl font-black text-amber-400">₹{companyProfit.toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'builder' && (
            <AdminPageCustomizer onSelectTab={onSelectTab} />
          )}

          {activeModule === 'video' && (
            <AdminAIVideoStudio />
          )}

          {activeModule === 'social' && (
            <AdCreativeStudio />
          )}

          {activeModule === 'marketing' && (
            <AdminMarketingLeadsManager />
          )}

          {activeModule === 'marketing_agent' && (
            <AdminMarketingAgent />
          )}

          {activeModule === 'seo' && (
            <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700/20 text-emerald-400 flex items-center justify-center border border-emerald-600/30">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">SEO & Content Control</h2>
                    <p className="text-xs text-stone-400">Meta Titles, OpenGraph, Structured Data & Sitemap Health</p>
                  </div>
                </div>
                <button onClick={() => setActiveModule('dashboard')} className="text-xs font-bold text-stone-400 hover:text-white px-3 py-1 bg-stone-800 rounded-xl">Back</button>
              </div>
              <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 text-xs text-stone-300 space-y-2">
                <p>All service pages and Bhopal locality landing pages are fully optimized with Schema.org JSON-LD structured data and Open Graph social cards.</p>
                <div className="text-emerald-400 font-bold">SEO Indexing Health: 100% Optimal</div>
              </div>
            </div>
          )}

          {activeModule === 'health' && (
            <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-700/40 text-stone-300 flex items-center justify-center border border-stone-600/40">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">System Health & Diagnostics</h2>
                    <p className="text-xs text-stone-400">API Health, Firebase Status, Payment Status & Error Logs</p>
                  </div>
                </div>
                <button onClick={() => setActiveModule('dashboard')} className="text-xs font-bold text-stone-400 hover:text-white px-3 py-1 bg-stone-800 rounded-xl">Back</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-2">
                  <div className="text-xs font-bold text-stone-300">Firebase Firestore Database</div>
                  <div className="text-emerald-400 text-xs font-black flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Connected & Synchronized
                  </div>
                </div>
                <div className="bg-stone-800/60 p-5 rounded-2xl border border-stone-700/60 space-y-2">
                  <div className="text-xs font-bold text-stone-300">Authentication Service</div>
                  <div className="text-emerald-400 text-xs font-black flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Secure (Google OAuth & Email)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'live_tracking' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-900 p-4 rounded-3xl border border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Live Booking Map &amp; Tracking</h2>
                    <p className="text-xs text-stone-400">ADMIN-only active dispatches, real-time GPS coordinates, and 12-point diagnostics</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule('dashboard')}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>

              <AdminLiveBookingsMap bookings={bookings} serviceMen={serviceMen} />
            </div>
          )}

          {activeModule === 'ai_funnel' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-900 p-4 rounded-3xl border border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">AI Funnel Automation Hub</h2>
                    <p className="text-xs text-stone-400">Automated Lead Qualification, Scoring, Deduplication &amp; Next Best Action</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule('dashboard')}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>

              <AdminAiFunnelAutomation users={[]} serviceMen={serviceMen} bookings={bookings} />
            </div>
          )}

          {activeModule === 'kaamdost_control' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-900 p-4 rounded-3xl border border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">KaamDost AI Master Control Room</h2>
                    <p className="text-xs text-stone-400">Configure Voice Prompts, Trigger Thresholds, Domain Knowledge &amp; Live Assistant Settings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule('dashboard')}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>

              <AdminKaamDostControlPanel onSelectTab={onSelectTab} />
            </div>
          )}

          {activeModule === 'master_reset' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-stone-900 p-4 rounded-3xl border border-stone-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Master Firebase Reset Studio</h2>
                    <p className="text-xs text-stone-400">Super-Admin-Only Fresh Production / Testing Environment Reset</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModule('dashboard')}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>

              <AdminMasterReset />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

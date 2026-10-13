import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Phone,
  Calendar,
  Wallet,
  Shield,
  Wrench,
  Briefcase,
  Newspaper,
  HelpCircle,
  Clock,
  Globe,
  ShoppingBag,
  Sparkles,
  Inbox,
  Building2,
  ShieldAlert,
  Users,
  KeyRound,
  Palette,
  Database,
  Upload,
  Radio,
  Video,
  BarChart3,
  DollarSign,
  Smartphone,
  Server,
  FileArchive,
  Navigation,
  Receipt,
  Calculator,
  ShieldCheck,
  LayoutDashboard,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationsDropdown } from './NotificationsDropdown';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../utils/translations';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface Props {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  onOpenLocalityModal?: () => void;
  onOpenHelp?: () => void;
  onOpenPlayStoreApk?: () => void;
  onOpenCare?: () => void;
  onOpenRfq?: () => void;
  onOpenAmc?: () => void;
}

export const Navbar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  selectedCity,
  onSelectCity,
  onOpenLocalityModal,
  onOpenHelp,
  onOpenPlayStoreApk,
  onOpenCare,
  onOpenRfq,
  onOpenAmc,
}) => {
  const { currentUser, userProfile, activeRole, logout, isAdmin, setActiveRole } = useAuth();
  const { unreadCount } = useNotifications();
  const { language, setLanguage, t } = useLanguage();
  const { totalItemsCount, setIsCartOpen } = useCart();
  const { effectiveTheme } = useTheme();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const getRoleBadge = () => {
    switch (activeRole) {
      case 'service_man':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
            PRO
          </span>
        );
      case 'business_partner':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
            PARTNER
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            ADMIN
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      {/* Top micro-notification & location strip for Bhopal with dynamic festival theme */}
      <div
        className="text-white text-[11px] font-semibold py-1 px-4 sm:px-8 flex items-center justify-between transition-all duration-300"
        style={{ background: effectiveTheme.colors.bannerGradient }}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="px-1.5 py-0.2 rounded bg-white/20 text-[10px] font-black uppercase tracking-wider">
            Bhopal Live
          </span>
          <span className="truncate">
            {t('bhopalCityBadge', 'Bhopal • 60-Minute Fast Arrival • 7-Day Warranty')}
          </span>
          {effectiveTheme.category === 'festival' && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/20 backdrop-blur-xs text-[10px] font-bold border border-white/20 ml-2">
              <span>{effectiveTheme.greetingIcon}</span>
              <span className="truncate">{effectiveTheme.greetingHindi}</span>
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 text-[11px]">
          <button
            type="button"
            onClick={onOpenLocalityModal}
            className="flex items-center gap-1 hover:underline cursor-pointer"
          >
            <MapPin className="w-3 h-3 text-orange-200" />
            <span>{selectedCity}</span>
          </button>
          <span>•</span>
          <a href="tel:+916267546945" className="hover:underline flex items-center gap-1">
            <Phone className="w-3 h-3 text-orange-200" />
            <span>+91 62675 46945</span>
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Location */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => onSelectTab(activeRole === 'customer' ? 'landing' : 'home')}
              className="flex items-center gap-3 text-left group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 p-0.5 shadow-lg shadow-orange-600/30 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-stone-900 rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img
                    src="create-one-updated-combination-logo-for-the-brand-hardinkaa.png.webp"
                    alt="Hardinkaam Logo"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xl tracking-tight bg-gradient-to-r from-stone-900 via-orange-950 to-orange-600 bg-clip-text text-transparent leading-none">
                    HARDIN<span className="text-orange-600">KAAM</span>
                  </span>
                  {getRoleBadge()}
                </div>
                <span className="text-[10px] font-bold text-orange-600 tracking-wider block truncate max-w-[130px] sm:max-w-none uppercase">
                  ✨ New Gen Services • Bhopal
                </span>
              </div>
            </button>

            {/* Location Selector: आप कहाँ सेवा चाहते हैं? */}
            <div className="relative hidden md:block">
              <button
                type="button"
                onClick={onOpenLocalityModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-orange-50 hover:text-orange-700 text-xs font-semibold text-stone-700 transition-colors border border-stone-200/80 cursor-pointer"
                title="Select locality in Bhopal"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                <div className="text-left">
                  <span className="text-[10px] text-stone-400 block font-normal leading-none">
                    {t('whereDoYouNeedService', 'Where?')}
                  </span>
                  <span className="truncate max-w-[130px] block font-bold leading-tight">
                    {selectedCity}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-stone-400 ml-1" />
              </button>
            </div>
          </div>

          {/* Search bar (customer view) */}
          {activeRole === 'customer' && (
            <div className="flex-1 max-w-md mx-2 hidden sm:block">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  id="nav-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      try {
                        const trimmed = searchQuery.trim();
                        const stored = localStorage.getItem('hardinkaam_recent_searches_v2');
                        const prev = stored ? JSON.parse(stored) : [];
                        const updated = [trimmed, ...prev.filter((i: string) => i.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
                        localStorage.setItem('hardinkaam_recent_searches_v2', JSON.stringify(updated));
                      } catch {
                        // ignore
                      }
                      if (currentTab !== 'home') onSelectTab('home');
                    }
                  }}
                  placeholder={t('searchServicePlaceholder', 'Search electrician, plumber, AC repair, cleaning...')}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-full bg-stone-100 border border-transparent focus:bg-white focus:border-orange-500 focus:outline-hidden focus:ring-3 focus:ring-orange-100 transition-all placeholder:text-stone-400 text-stone-800"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Links based on role */}
          <div className="hidden lg:flex items-center gap-1">
            {activeRole === 'customer' && (
              <>
                <button
                  onClick={() => onSelectTab('landing')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentTab === 'landing' ? 'text-orange-600 font-bold bg-orange-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  होम (Intro)
                </button>
                {(currentUser || userProfile) && (
                  <button
                    onClick={() => onSelectTab('customer_dashboard')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTab === 'customer_dashboard'
                        ? 'text-white bg-orange-600 shadow-sm'
                        : 'text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-orange-600" />
                    <span>डैशबोर्ड</span>
                  </button>
                )}
                <button
                  onClick={() => onSelectTab('home')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentTab === 'home' ? 'text-orange-600 font-bold bg-orange-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t('showAllCategories', 'All Services')}
                </button>
                <button
                  onClick={() => onSelectTab('bookings')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentTab === 'bookings' ? 'text-orange-600 font-bold bg-orange-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t('myBookings', 'My Bookings')}
                </button>
                <button
                  onClick={() => onSelectTab('wallet')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    currentTab === 'wallet' ? 'text-orange-600 font-bold bg-orange-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Wallet
                </button>
                <button
                  onClick={() => (onOpenCare ? onOpenCare() : onSelectTab('care'))}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    currentTab === 'care'
                      ? 'text-white bg-teal-600'
                      : 'text-teal-700 hover:text-teal-800 bg-teal-50/80 border border-teal-200 hover:bg-teal-100'
                  }`}
                  title="7-दिन वारंटी, प्रोटेक्शन व संतुष्टि गारंटी"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>7-Day Care</span>
                </button>
                <button
                  onClick={() => (onOpenRfq ? onOpenRfq() : onSelectTab('rfq'))}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    currentTab === 'rfq'
                      ? 'text-white bg-orange-600'
                      : 'text-orange-700 hover:text-orange-800 bg-orange-50/80 border border-orange-200 hover:bg-orange-100'
                  }`}
                  title="बड़े कामों (पेंटिंग, सिविल, रिनोवेशन) के लिए कई कोटेशन मंगाएं"
                >
                  <FileText className="w-3.5 h-3.5 text-orange-600" />
                  <span>RFQ कोट्स</span>
                </button>
                <button
                  onClick={() => (onOpenAmc ? onOpenAmc() : onSelectTab('amc'))}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    currentTab === 'amc'
                      ? 'text-white bg-indigo-600'
                      : 'text-indigo-700 hover:text-indigo-800 bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                  title="वार्षिक मेंटेनेंस कॉन्ट्रैक्ट (AC, RO, Home AMC) व VIP मेंबरशिप"
                >
                  <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                  <span>AMC प्लांस</span>
                </button>
                <button
                  onClick={() => onSelectTab('work_from_home')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    currentTab === 'work_from_home'
                      ? 'text-white bg-amber-600'
                      : 'text-amber-800 hover:text-amber-900 bg-amber-50/80 border border-amber-200 hover:bg-amber-100'
                  }`}
                  title="घर बैठे ऑनलाइन टास्क पूरा करें और दैनिक पैसे कमाएं"
                >
                  <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                  <span>Work From</span>
                </button>
                <button
                  onClick={() => onSelectTab('jobs')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                    currentTab === 'jobs'
                      ? 'text-white bg-blue-600'
                      : 'text-blue-700 hover:text-blue-800 bg-blue-50/80 border border-blue-200 hover:bg-blue-100'
                  }`}
                  title="कारीगर, इलेक्ट्रीशियन, प्लंबर व एसी टेक्नीशियन भर्ती पोर्टल"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Jobs भर्ती</span>
                </button>
                <button
                  onClick={() => onSelectTab('franchise')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    currentTab === 'franchise'
                      ? 'text-white bg-orange-600'
                      : 'text-orange-700 hover:text-orange-800 bg-orange-50/80 border border-orange-200 hover:bg-orange-100'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>फ्रेंचाइज़ी लें</span>
                </button>
              </>
            )}

            {activeRole === 'service_man' && (
              <>
                <button
                  onClick={() => onSelectTab('pro_dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'pro_dashboard' ? 'text-blue-600 font-bold bg-blue-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onSelectTab('pro_jobs')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'pro_jobs' ? 'text-blue-600 font-bold bg-blue-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Jobs Manager
                </button>
                <button
                  onClick={() => onSelectTab('pro_wallet')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'pro_wallet' ? 'text-blue-600 font-bold bg-blue-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Earnings
                </button>
                <button
                  onClick={() => onSelectTab('pro_kyc')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'pro_kyc' ? 'text-blue-600 font-bold bg-blue-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  KYC Audit
                </button>
              </>
            )}

            {activeRole === 'business_partner' && (
              <>
                <button
                  onClick={() => onSelectTab('partner_dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'partner_dashboard' ? 'text-purple-600 font-bold bg-purple-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Fleet Overview
                </button>
                <button
                  onClick={() => onSelectTab('partner_wallet')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'partner_wallet' ? 'text-purple-600 font-bold bg-purple-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Settlements
                </button>
              </>
            )}

            {activeRole === 'admin' && isAdmin && (
              <>
                <button
                  onClick={() => onSelectTab('admin_dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'admin_dashboard' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Admin Hub
                </button>
                <button
                  onClick={() => onSelectTab('admin_inbox_outbox')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'admin_inbox_outbox' || currentTab === 'admin_inbox' || currentTab === 'admin_outbox'
                      ? 'text-white bg-orange-600 shadow-sm'
                      : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
                  }`}
                  title="सभी अनुरोध, नकद अप्रूवल व संदेश इनबॉक्स / आउटबॉक्स"
                >
                  <Inbox className="w-3.5 h-3.5 text-orange-600" />
                  <span>📥 इनबॉक्स / आउटबॉक्स</span>
                </button>
                <button
                  id="nav-admin-page-customizer-btn-prominent"
                  onClick={() => onSelectTab('admin_page_builder')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    currentTab === 'admin_page_builder' || currentTab === 'admin_page_customizer'
                      ? 'text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 shadow-sm ring-2 ring-purple-400/40'
                      : 'text-purple-950 font-black bg-gradient-to-r from-purple-100 via-indigo-100 to-purple-200 hover:from-purple-200 hover:to-indigo-200 ring-2 ring-purple-400 shadow-xs'
                  }`}
                  title="वेबसाइट के प्रत्येक पेज का लेआउट, रंग, नई तस्वीरें जोड़ें और सेक्शंस प्रबंधित करें"
                >
                  <Palette className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                  <span>🎨 पेज कस्टमाइज़र</span>
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-ping ml-0.5" />
                </button>
                <button
                  id="nav-admin-marketing-agent-btn-prominent"
                  onClick={() => onSelectTab('admin_marketing_agent')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    currentTab === 'admin_marketing_agent' || currentTab === 'admin_marketing'
                      ? 'text-white bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 shadow-sm ring-2 ring-orange-400/40'
                      : 'text-orange-950 font-black bg-gradient-to-r from-amber-100 via-orange-100 to-amber-200 hover:from-amber-200 hover:to-orange-200 ring-2 ring-orange-400 shadow-xs'
                  }`}
                  title="Google Maps सर्विसमैन खोज, AI विज्ञापन निर्माण व आउटरीच एजेंट"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                  <span>🎯 AI मार्केटिंग एजेंट</span>
                  <span className="w-2 h-2 rounded-full bg-orange-600 animate-ping ml-0.5" />
                </button>
                <button
                  id="nav-admin-ad-studio-btn-prominent"
                  onClick={() => onSelectTab('admin_ad_studio')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    currentTab === 'admin_ad_studio'
                      ? 'text-white bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 shadow-sm ring-2 ring-rose-400/40'
                      : 'text-rose-950 font-black bg-gradient-to-r from-rose-100 via-pink-100 to-rose-200 hover:from-rose-200 hover:to-pink-200 ring-2 ring-rose-400 shadow-xs'
                  }`}
                  title="AI विज्ञापन, 5-सीन रील्स वीडियो स्टोरीबोर्ड और पोस्टर मेकर"
                >
                  <Video className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                  <span>🎬 AI विज्ञापन व वीडियो</span>
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping ml-0.5" />
                </button>
                <button
                  id="nav-admin-live-tracking-btn"
                  onClick={() => onSelectTab('admin_live_tracking')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    currentTab === 'admin_live_tracking' || currentTab === 'admin_tracking'
                      ? 'text-white bg-gradient-to-r from-orange-600 to-amber-600 shadow-sm ring-2 ring-orange-400/40'
                      : 'text-orange-800 font-bold bg-orange-50 hover:bg-orange-100 ring-1 ring-orange-300'
                  }`}
                  title="ऑन-ड्यूटी सर्विसमैन लाइव GPS ट्रैकिंग मैप"
                >
                  <Navigation className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
                  <span>📡 सर्विसमैन ट्रैकिंग (Live)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
                </button>
                <button
                  id="nav-admin-payouts-btn"
                  onClick={() => onSelectTab('admin_payouts')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_payouts' ? 'text-amber-700 font-bold bg-amber-50 border border-amber-300' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                  <span>पेआउट्स (Payouts)</span>
                </button>

                <button
                  id="nav-admin-analytics-btn"
                  onClick={() => onSelectTab('admin_analytics')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    currentTab === 'admin_analytics' || currentTab === 'admin_visitor_report'
                      ? 'text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 shadow-sm ring-2 ring-blue-400/40'
                      : 'text-blue-950 font-black bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-200 hover:from-blue-200 hover:to-indigo-200 ring-2 ring-blue-400 shadow-xs'
                  }`}
                  title="ऐप कहां-कहां खुली, किसने किस AdMob विज्ञापन व सेवा पर क्लिक किया — संपूर्ण मार्केटिंग रिपोर्ट"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>📊 विजिटर व AdMob रिपोर्ट</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping ml-0.5" />
                </button>
                <button
                  onClick={() => onSelectTab('admin_catalog')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'admin_catalog' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Catalog
                </button>
                <button
                  onClick={() => onSelectTab('admin_bookings')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'admin_bookings' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Bookings
                </button>
                <button
                  id="nav-admin-users-btn"
                  onClick={() => onSelectTab('admin_users')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_users' ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                  <span>Users &amp; Passwords</span>
                </button>
                <button
                  id="nav-admin-bulk-sms-btn"
                  onClick={() => onSelectTab('admin_bulk_sms')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_bulk_sms'
                      ? 'text-teal-700 font-bold bg-teal-50 ring-1 ring-teal-200'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-teal-600" />
                  <span>बल्क SMS &amp; वीडियो</span>
                </button>
                <button
                  onClick={() => onSelectTab('admin_whatsapp')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    currentTab === 'admin_whatsapp' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => onSelectTab('admin_franchise')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                    currentTab === 'admin_franchise' ? 'text-emerald-600 font-bold bg-emerald-50' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Franchise</span>
                </button>
                <button
                  id="nav-admin-import-btn"
                  onClick={() => onSelectTab('admin_import')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_import' ? 'text-emerald-700 font-bold bg-emerald-50 ring-1 ring-emerald-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span>डेटाबेस मर्ज &amp; क्लिनर</span>
                </button>
                <button
                  id="nav-admin-data-explorer-btn"
                  onClick={() => onSelectTab('admin_data_explorer')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_data_explorer' ? 'text-indigo-700 font-bold bg-indigo-50 ring-1 ring-indigo-300' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Firestore संग्रह व रिकॉर्ड्स एक्सप्लोरर (View & Delete Records)"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  <span>डेटा एक्सप्लोरर</span>
                </button>
                <button
                  id="nav-admin-theme-btn"
                  onClick={() => onSelectTab('admin_theme')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_theme' ? 'text-emerald-700 font-bold bg-emerald-50 ring-1 ring-emerald-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 text-orange-500" />
                  <span>Theme Manager</span>
                </button>
                <button
                  id="nav-admin-deploy-btn"
                  onClick={() => onSelectTab('admin_website_updates')}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_website_updates' || currentTab === 'admin_deployments'
                      ? 'text-white bg-gradient-to-r from-orange-600 to-amber-600 shadow-xs'
                      : 'text-orange-800 font-bold bg-orange-50 hover:bg-orange-100 ring-1 ring-orange-200'
                  }`}
                  title="Google AI Studio ZIP अपलोड व स्वचालित Firebase Hosting डिप्लॉयमेंट"
                >
                  <Server className="w-3.5 h-3.5 text-orange-600" />
                  <span>वेबसाइट अपडेट (Deploy ZIP)</span>
                </button>
                <button
                  id="nav-admin-tax-btn"
                  onClick={() => onSelectTab('admin_tax')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_tax'
                      ? 'text-amber-800 font-bold bg-amber-50 ring-1 ring-amber-300'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="भारतीय कराधान व GST / SAC अनुपालन (Indian Tax Engine)"
                >
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>कराधान व GST इंजन</span>
                </button>
                <button
                  id="nav-admin-documents-btn"
                  onClick={() => onSelectTab('admin_documents')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_documents' || currentTab === 'admin_refunds'
                      ? 'text-teal-800 font-bold bg-teal-50 ring-1 ring-teal-300'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="टैक्स इनवॉइस, क्रेडिट नोट व रिफंड प्रबंधन"
                >
                  <FileArchive className="w-3.5 h-3.5 text-teal-600" />
                  <span>इनवॉइस व रिफंड</span>
                </button>
                <button
                  id="nav-admin-rfq-btn"
                  onClick={() => onSelectTab('admin_rfq')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_rfq'
                      ? 'text-orange-800 font-bold bg-orange-50 ring-1 ring-orange-300'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="बड़े प्रोजेक्ट्स मल्टी-कोट्स RFQ फीस सेटिंग्स"
                >
                  <Users className="w-3.5 h-3.5 text-orange-600" />
                  <span>मल्टी-कोट्स RFQ</span>
                </button>
                <button
                  id="nav-admin-care-amc-btn"
                  onClick={() => onSelectTab('admin_care_amc')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_care_amc'
                      ? 'text-teal-800 font-bold bg-teal-50 ring-1 ring-teal-300'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="HARDINKAAM CARE, मेंबरशिप व AMC कॉन्ट्रैक्ट्स"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>CARE व AMC</span>
                </button>
                <button
                  id="nav-admin-bi-btn"
                  onClick={() => onSelectTab('admin_bi')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_bi'
                      ? 'text-indigo-800 font-bold bg-indigo-50 ring-1 ring-indigo-300'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="एडमिन बिज़नेस इंटेलिजेंस व यूनिट इकोनॉमिक्स"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>बिज़नेस इंटेलिजेंस</span>
                </button>
                <button
                  id="nav-admin-marketing-agent-btn"
                  onClick={() => onSelectTab('admin_marketing_agent')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_marketing_agent' || currentTab === 'admin_marketing'
                      ? 'text-orange-900 font-bold bg-orange-100 ring-2 ring-orange-300 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="Google Maps सर्विसमैन खोज, AI विज्ञापन निर्माण व आउटरीच एजेंट"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>मार्केटिंग एजेंट &amp; लीड्स</span>
                </button>
                <button
                  id="nav-admin-settings-btn"
                  onClick={() => onSelectTab('admin_settings')}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                    currentTab === 'admin_settings' ? 'text-orange-700 font-bold bg-orange-50 ring-1 ring-orange-200' : 'text-stone-600 hover:text-stone-900'
                  }`}
                  title="डोमेन edusuper.in एवं प्लेटफ़ॉर्म सेटिंग्स"
                >
                  <Globe className="w-3.5 h-3.5 text-orange-600" />
                  <span>डोमेन &amp; सेटिंग्स</span>
                </button>
              </>
            )}

            {/* Admin Quick Jump: visible whenever the user has Admin rights, even if previewing customer/pro */}
            {isAdmin && activeRole !== 'admin' && (
              <button
                id="nav-quick-admin-jump-btn"
                type="button"
                onClick={() => {
                  setActiveRole('admin');
                  onSelectTab('admin_dashboard');
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                title="अधिकृत एडमिन डैशबोर्ड खोलें"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                <span>एडमिन डैशबोर्ड</span>
              </button>
            )}

            {/* Universal Jobs & Blog Links visible across all dashboards */}
            <button
              onClick={() => onSelectTab('jobs')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'jobs' || currentTab === 'job_portal' || currentTab === 'wfh' || currentTab === 'pro_jobs'
                  ? 'text-white bg-blue-600 shadow-sm'
                  : 'text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200'
              }`}
              title="करियर भर्ती, जॉब्स व वर्क फ्रॉम होम ऑनलाइन टास्क"
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>💼 जॉब्स व करियर</span>
            </button>

            <button
              onClick={() => onSelectTab('blog')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                currentTab === 'blog' || currentTab === 'news'
                  ? 'text-white bg-amber-600 shadow-sm'
                  : 'text-amber-800 hover:text-amber-900 bg-amber-50/80 hover:bg-amber-100 border border-amber-200'
              }`}
              title="लाइव राज्य समाचार RSS व कंपनी ब्लॉग"
            >
              <Newspaper className="w-3.5 h-3.5 text-amber-600" />
              <span>📰 समाचार व ब्लॉग</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Prominent Language Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-orange-50 hover:text-orange-700 text-xs font-bold text-stone-700 border border-stone-200/80 transition-colors cursor-pointer"
                title="Change language"
              >
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                <span className="text-xs font-extrabold">{currentLangObj.nativeName}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {isLangDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    भाषा चुनें / Select Language
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setLanguage(lang.code);
                            setIsLangDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-orange-50 hover:text-orange-600 cursor-pointer ${
                            isSelected ? 'font-black text-orange-600 bg-orange-50/70' : 'text-stone-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span>{lang.nativeName}</span>
                          </span>
                          <span className="text-[11px] text-stone-400 font-normal">({lang.name})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Single Unified Download App Button (PWA & APK) */}
            <PWAInstallButton
              onOpenModal={onOpenPlayStoreApk}
              className="hidden sm:flex"
            />

            {/* Cart Button with badge */}
            <button
              id="navbar-cart-btn"
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 transition-colors relative cursor-pointer"
              title={t('cart', 'Cart')}
            >
              <ShoppingBag className="w-4 h-4" />
              {totalItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* Support / Help Icon */}
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="hidden sm:flex p-2 rounded-xl bg-stone-100 hover:bg-stone-200/70 text-stone-700 transition-colors cursor-pointer"
                title={t('customerHelp', 'Help & Support')}
              >
                <HelpCircle className="w-4 h-4 text-orange-600" />
              </button>
            )}

            {/* Notification Bell */}
            <div className="relative">
              <button
                id="notification-bell-btn"
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200/70 text-stone-700 transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationsDropdown
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
                onSelectBooking={(_bId) => {
                  if (activeRole === 'customer') onSelectTab('bookings');
                  else if (activeRole === 'service_man') onSelectTab('pro_jobs');
                  else if (activeRole === 'admin') onSelectTab('admin_bookings');
                }}
              />
            </div>

            {/* Auth / Profile */}
            {(currentUser || userProfile) ? (
              <div className="relative">
                <button
                  id="user-profile-menu-btn"
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  {userProfile?.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-orange-500/20"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isAdmin ? 'bg-emerald-100 text-emerald-700 font-black ring-1 ring-emerald-500' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {userProfile?.name?.charAt(0) || currentUser?.email?.charAt(0) || 'A'}
                    </div>
                  )}
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold text-stone-800 max-w-[100px] truncate">
                      {userProfile?.name || currentUser?.displayName || 'User'}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] font-black text-emerald-600 tracking-wider">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <ChevronDown className="w-3 h-3 text-stone-400 hidden sm:inline" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-bold text-stone-900 truncate">{userProfile?.name || 'Authorized User'}</p>
                      <p className="text-[11px] text-stone-500 truncate">
                        {userProfile?.email && !userProfile.email.endsWith('@phone.hardinkaam.in')
                          ? userProfile.email
                          : (userProfile?.phone || (currentUser?.email && !currentUser.email.endsWith('@phone.hardinkaam.in') ? currentUser.email : 'deepakbuildconbhopal@gmail.com'))}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {activeRole.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Admin Hub entry for admins */}
                    {isAdmin && (
                      <div className="p-2 border-b border-stone-100 bg-emerald-50/50 space-y-1.5">
                        <button
                          id="nav-dropdown-admin-hub-btn"
                          onClick={() => {
                            setActiveRole('admin');
                            onSelectTab('admin_dashboard');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <ShieldAlert className="w-4 h-4 text-emerald-700" />
                          <span>एडमिन डैशबोर्ड (Admin Hub)</span>
                        </button>
                        <button
                          id="nav-dropdown-admin-inbox-outbox-btn"
                          onClick={() => {
                            setActiveRole('admin');
                            onSelectTab('admin_inbox_outbox');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-black text-orange-950 bg-gradient-to-r from-orange-200 via-amber-200 to-orange-300 hover:from-orange-300 hover:to-amber-300 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs border border-orange-400"
                        >
                          <Inbox className="w-4 h-4 text-orange-700" />
                          <span>📥 अनुरोध व संदेश इनबॉक्स / आउटबॉक्स</span>
                        </button>
                        <button
                          id="nav-dropdown-admin-page-customizer-btn"
                          onClick={() => {
                            setActiveRole('admin');
                            onSelectTab('admin_page_builder');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-black text-purple-950 bg-gradient-to-r from-purple-200 via-indigo-200 to-purple-300 hover:from-purple-300 hover:to-indigo-300 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs border border-purple-400"
                        >
                          <Palette className="w-4 h-4 text-purple-700 animate-pulse" />
                          <span>🎨 पेज कस्टमाइज़र &amp; व्यू स्टूडियो</span>
                        </button>
                        <button
                          id="nav-dropdown-admin-marketing-btn"
                          onClick={() => {
                            setActiveRole('admin');
                            onSelectTab('admin_marketing_agent');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-black text-orange-950 bg-gradient-to-r from-orange-300 via-amber-300 to-orange-400 hover:from-orange-400 hover:to-amber-400 rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs border border-orange-400"
                        >
                          <Sparkles className="w-4 h-4 text-stone-950 animate-pulse" />
                          <span>🎯 AI मार्केटिंग एजेंट व लीड्स (Marketing Hub)</span>
                        </button>
                        <button
                          id="nav-dropdown-admin-import-btn"
                          onClick={() => {
                            setActiveRole('admin');
                            onSelectTab('admin_import');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-950 bg-emerald-500 hover:bg-emerald-400 rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <Upload className="w-4 h-4 text-emerald-950" />
                          <span>🔄 डेटाबेस मर्ज &amp; डुप्लीकेट क्लिनर</span>
                        </button>
                        <button
                          id="nav-dropdown-admin-domain-btn"
                          onClick={() => {
                            setActiveRole('admin');
                            onSelectTab('admin_settings');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-orange-950 bg-orange-200 hover:bg-orange-300 rounded-xl flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                        >
                          <Globe className="w-4 h-4 text-orange-700" />
                          <span>🌐 कस्टम डोमेन: edusuper.in</span>
                        </button>
                      </div>
                    )}

                    <div className="py-1">
                      <button
                        onClick={() => {
                          if (isAdmin) onSelectTab('admin_dashboard');
                          else if (activeRole === 'service_man') onSelectTab('pro_dashboard');
                          else if (activeRole === 'business_partner') onSelectTab('partner_dashboard');
                          else if (activeRole === 'franchise_admin') onSelectTab('franchise');
                          else onSelectTab('customer_dashboard');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-black text-orange-600 hover:bg-orange-50 flex items-center gap-2 cursor-pointer border-b border-stone-100"
                      >
                        <LayoutDashboard className="w-4 h-4 text-orange-600" />
                        <span>My Dashboard (डैशबोर्ड)</span>
                      </button>
                      <button
                        onClick={() => {
                          onSelectTab('profile');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5" />
                        My Profile &amp; Settings
                      </button>
                      <button
                        onClick={() => {
                          if (activeRole === 'customer') onSelectTab('wallet');
                          else if (activeRole === 'service_man') onSelectTab('pro_wallet');
                          else onSelectTab('partner_wallet');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        Wallet &amp; Transactions
                      </button>
                    </div>

                    <div className="pt-1 border-t border-stone-100">
                      <button
                        id="logout-btn"
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="sign-in-nav-btn"
                type="button"
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer whitespace-nowrap"
              >
                {t('loginRegister', 'Login / Profile')}
              </button>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-stone-600 hover:bg-stone-100 cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Search input bar */}
        {activeRole === 'customer' && (
          <div className="pb-3 pt-1 sm:hidden">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t('searchServicePlaceholder', 'Search services in Bhopal...')}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-full bg-stone-100 border-none focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        )}

        {/* Mobile dropdown menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-stone-100 space-y-2">
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <span className="font-bold text-stone-500">Locality: {selectedCity}</span>
              <button
                onClick={() => {
                  if (onOpenLocalityModal) onOpenLocalityModal();
                  setIsMobileMenuOpen(false);
                }}
                className="text-orange-600 font-bold underline"
              >
                Change
              </button>
            </div>

            {/* Admin Hub quick link for mobile */}
            {isAdmin && (
              <div className="p-1 space-y-1.5">
                <button
                  id="mobile-admin-quick-hub-btn"
                  onClick={() => {
                    setActiveRole('admin');
                    onSelectTab('admin_dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-300" />
                    <span>एडमिन डैशबोर्ड (Admin Dashboard)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-md font-bold">OPEN</span>
                </button>
                <button
                  id="mobile-admin-quick-page-customizer-btn"
                  onClick={() => {
                    setActiveRole('admin');
                    onSelectTab('admin_page_builder');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-between shadow-xs cursor-pointer border border-purple-300"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-200 animate-pulse" />
                    <span>🎨 पेज कस्टमाइज़र &amp; व्यू बिल्डर</span>
                  </div>
                  <span className="text-[10px] bg-white text-purple-950 px-2 py-0.5 rounded-md font-black">CMS</span>
                </button>
                <button
                  id="mobile-admin-quick-marketing-btn"
                  onClick={() => {
                    setActiveRole('admin');
                    onSelectTab('admin_marketing_agent');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white flex items-center justify-between shadow-xs cursor-pointer border border-amber-300"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                    <span>🎯 AI मार्केटिंग एजेंट व लीड्स (Marketing Hub)</span>
                  </div>
                  <span className="text-[10px] bg-white text-orange-950 px-2 py-0.5 rounded-md font-black">NEW</span>
                </button>
                <button
                  id="mobile-admin-quick-import-btn"
                  onClick={() => {
                    setActiveRole('admin');
                    onSelectTab('admin_import');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 flex items-center justify-between shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-stone-950" />
                    <span>📤 Excel डेटा अपलोड (Data Importer)</span>
                  </div>
                  <span className="text-[10px] bg-stone-950 text-emerald-300 px-2 py-0.5 rounded-md font-bold">UPLOAD</span>
                </button>
              </div>
            )}

            {activeRole === 'customer' && (
              <>
                <button
                  onClick={() => {
                    onSelectTab('landing');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-stone-50 text-orange-600 font-bold"
                >
                  🏠 होम (Intro Landing Page)
                </button>
                <button
                  onClick={() => {
                    onSelectTab('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-stone-50"
                >
                  {t('showAllCategories', 'All Services & Categories')}
                </button>
                <button
                  onClick={() => {
                    onSelectTab('bookings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-stone-50"
                >
                  {t('myBookings', 'My Bookings')}
                </button>
                <button
                  onClick={() => {
                    onSelectTab('wallet');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-stone-50"
                >
                  My Wallet
                </button>
                <button
                  onClick={() => {
                    if (onOpenCare) onOpenCare();
                    else onSelectTab('care');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 flex items-center gap-1.5 text-teal-800 border border-teal-200/80"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>🛡️ 7-दिन केयर वारंटी (Hardinkaam Care)</span>
                </button>
                <button
                  onClick={() => {
                    if (onOpenRfq) onOpenRfq();
                    else onSelectTab('rfq');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center gap-1.5 text-orange-900 border border-orange-200/80"
                >
                  <FileText className="w-4 h-4 text-orange-600" />
                  <span>📋 बड़े कामों के कोट्स (RFQ Bidding)</span>
                </button>
                <button
                  onClick={() => {
                    if (onOpenAmc) onOpenAmc();
                    else onSelectTab('amc');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1.5 text-indigo-900 border border-indigo-200/80"
                >
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  <span>🛠️ AMC मेंटेनेंस प्लांस & VIP मेंबरशिप</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('work_from_home');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center gap-1.5 text-amber-900 border border-amber-200/80"
                >
                  <Briefcase className="w-4 h-4 text-amber-600" />
                  <span>🏠 Work From Home (टास्क & कमाई)</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('jobs');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 text-blue-900 border border-blue-200/80"
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>💼 Jobs & Careers (कारीगर भर्ती)</span>
                </button>
                <button
                  onClick={() => {
                    if (onOpenHelp) onOpenHelp();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-stone-50 flex items-center gap-1.5 text-orange-700"
                >
                  <HelpCircle className="w-4 h-4 text-orange-600" />
                  {t('customerHelp', 'Help & 24x7 Support')}
                </button>
                <button
                  onClick={() => {
                    onSelectTab('franchise');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-orange-50 hover:bg-orange-100 flex items-center gap-1.5 text-orange-900 border border-orange-200/80"
                >
                  <Building2 className="w-4 h-4 text-orange-600" />
                  <span>🤝 पूरे भारत में फ्रेंचाइज़ी लें (Franchise Opportunity)</span>
                </button>
              </>
            )}

            {activeRole === 'service_man' && (
              <>
                <button
                  onClick={() => {
                    onSelectTab('pro_dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-blue-50 text-blue-700"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => {
                    onSelectTab('pro_jobs');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-blue-50 text-blue-700"
                >
                  My Jobs
                </button>
                <button
                  onClick={() => {
                    onSelectTab('pro_wallet');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-blue-50 text-blue-700"
                >
                  Earnings
                </button>
                <button
                  onClick={() => {
                    onSelectTab('pro_kyc');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-blue-50 text-blue-700"
                >
                  KYC Audit
                </button>
              </>
            )}

            {activeRole === 'admin' && isAdmin && (
              <>
                <button
                  onClick={() => {
                    onSelectTab('admin_dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700"
                >
                  Admin Hub
                </button>
                <button
                  id="mobile-nav-admin-inbox-outbox-btn"
                  onClick={() => {
                    onSelectTab('admin_inbox_outbox');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 flex items-center justify-between border border-orange-200 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Inbox className="w-4 h-4 text-orange-600 animate-bounce" />
                    <span>📥 अनुरोध व संदेश इनबॉक्स / आउटबॉक्स</span>
                  </div>
                  <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
                    Inbox
                  </span>
                </button>
                <button
                  id="mobile-nav-admin-live-tracking-btn"
                  onClick={() => {
                    onSelectTab('admin_live_tracking');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 flex items-center justify-between border border-orange-200 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-orange-600 animate-pulse" />
                    <span>📡 सर्विसमैन लाइव ट्रैकिंग (Live GPS Map)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    LIVE
                  </span>
                </button>
                <button
                  id="mobile-nav-admin-marketing-agent-btn"
                  onClick={() => {
                    onSelectTab('admin_marketing_agent');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 hover:bg-orange-100 text-orange-950 flex items-center justify-between border border-orange-300 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600 animate-pulse" />
                    <span>🎯 AI मार्केटिंग एजेंट व Google Maps लीड्स</span>
                  </div>
                  <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
                    NEW
                  </span>
                </button>
                <button
                  id="mobile-nav-admin-analytics-btn"
                  onClick={() => {
                    onSelectTab('admin_analytics');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs font-black rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 flex items-center justify-between border border-blue-200 shadow-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span>📊 विजिटर व AdMob रिपोर्ट</span>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                    LIVE
                  </span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('admin_catalog');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700"
                >
                  Catalog
                </button>
                <button
                  onClick={() => {
                    onSelectTab('admin_bookings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700"
                >
                  Bookings
                </button>
                <button
                  id="mobile-nav-admin-users-btn"
                  onClick={() => {
                    onSelectTab('admin_users');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                  <span>Users &amp; Passwords (यूजर व पासवर्ड)</span>
                </button>
                <button
                  id="mobile-nav-admin-bulk-sms-btn"
                  onClick={() => {
                    onSelectTab('admin_bulk_sms');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-teal-50 text-teal-800 flex items-center gap-1.5"
                >
                  <Radio className="w-3.5 h-3.5 text-teal-600" />
                  <span>बल्क SMS &amp; वीडियो कॉल (Bulk SMS &amp; Video)</span>
                </button>
                <button
                  onClick={() => {
                    onSelectTab('admin_settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700"
                >
                  Settings
                </button>
                <button
                  onClick={() => {
                    onSelectTab('admin_franchise');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>शहरवार फ्रेंचाइज़ी रिपोर्ट (Franchise Reports)</span>
                </button>
                <button
                  id="mobile-nav-admin-import-btn"
                  onClick={() => {
                    onSelectTab('admin_import');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center gap-1.5"
                >
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>डेटा अपलोड व आयात (Data Importer)</span>
                </button>
                <button
                  id="mobile-nav-admin-data-explorer-btn"
                  onClick={() => {
                    onSelectTab('admin_data_explorer');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-indigo-50 text-indigo-700 flex items-center gap-1.5"
                >
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>डेटा एक्सप्लोरर (Firestore Explorer &amp; Delete)</span>
                </button>
                <button
                  id="mobile-nav-admin-theme-btn"
                  onClick={() => {
                    onSelectTab('admin_theme');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center gap-1.5"
                >
                  <Palette className="w-4 h-4 text-orange-500" />
                  <span>Theme Manager (थीम मैनेजर)</span>
                </button>
                <button
                  id="mobile-nav-admin-deploy-btn"
                  onClick={() => {
                    onSelectTab('admin_website_updates');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-black rounded-lg bg-orange-100 text-orange-950 flex items-center gap-1.5 border border-orange-300"
                >
                  <Server className="w-4 h-4 text-orange-600" />
                  <span>🚀 वेबसाइट अपडेट व डिप्लॉयमेंट (Deploy ZIP)</span>
                </button>
              </>
            )}

            {/* Universal Jobs & Blog Links in Mobile Menu */}
            <div className="pt-2 border-t border-stone-200 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onSelectTab('jobs');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 flex items-center gap-1.5 border border-blue-200 cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>💼 जॉब्स भर्ती</span>
              </button>

              <button
                onClick={() => {
                  onSelectTab('blog');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-bold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1.5 border border-amber-200 cursor-pointer"
              >
                <Newspaper className="w-4 h-4 text-amber-600" />
                <span>📰 न्यूज़ व ब्लॉग</span>
              </button>
            </div>

            {/* Mobile PWA Install Button */}
            <div className="pt-2 border-t border-stone-200 px-1">
              <PWAInstallButton
                onOpenModal={() => {
                  if (onOpenPlayStoreApk) onOpenPlayStoreApk();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-center py-2.5 text-xs font-bold shadow-sm"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

import React, { useState, useId, useRef, useEffect } from 'react';
import {
  Zap,
  Wrench,
  AirVent,
  Sparkles,
  Hammer,
  Paintbrush,
  ShieldAlert,
  Scissors,
  Star,
  Clock,
  ShieldCheck,
  ChevronRight,
  PhoneCall,
  CheckCircle,
  Tag,
  ArrowRight,
  ArrowUp,
  Search,
  History,
  TrendingUp,
  X,
  MapPin,
  Heart,
  ShoppingCart,
  Eye,
  Percent,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Droplets,
  Award,
  Users,
  Building2,
  HardHat,
  Home,
  Flame,
  Shield,
  Factory,
  Truck,
  Package,
  Layers,
  Construction,
  Smartphone,
  Check,
  HelpCircle,
} from 'lucide-react';
import { Category, Service, ServiceMan } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { useFavourites } from '../../context/FavouritesContext';
import { useTheme } from '../../context/ThemeContext';
import { POPULAR_PACKAGES, ServicePackage } from '../../data/packagesData';
import { TradeImage } from '../common/TradeImage';
import { LazyImage } from '../common/LazyImage';
import { TRADE_IMAGE_LIST, TRADE_IMAGES } from '../../utils/tradeImages';
import { WhyHardinkaam } from './WhyHardinkaam';
import { CustomerTestimonials } from './CustomerTestimonials';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import { AdSenseNativeCard } from '../ads/AdSenseNativeCard';
import { useValidatedCategoryImages } from '../../hooks/useValidatedCategoryImages';

interface Props {
  categories: Category[];
  services: Service[];
  serviceMen: ServiceMan[];
  selectedCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  searchQuery: string;
  onSearchChange?: (query: string) => void;
  onBookService: (service: Service, preferredPro?: ServiceMan) => void;
  onViewProProfile: (pro: ServiceMan) => void;
  onOpenServiceDetail: (service: Service) => void;
  onOpenLocalityModal: () => void;
  selectedLocality: string;
  onOpenHelp: () => void;
  onOpenFranchise?: () => void;
  onSelectTab?: (tab: string) => void;
  onOpenAuth?: (role?: 'customer' | 'service_man' | 'business_partner') => void;
  onOpenPlayStoreApk?: () => void;
}

const RECENT_SEARCHES_STORAGE_KEY = 'hardinkaam_recent_searches_v2';
const DEFAULT_INITIAL_SEARCHES = [
  'Ceiling Fan Repair',
  'Split AC Jet Wash',
  'Bathroom Deep Cleaning',
  'Water Tap Leakage',
  'Electrician Wiring',
];

export const CustomerHome: React.FC<Props> = ({
  categories,
  services,
  serviceMen,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onBookService,
  onViewProProfile,
  onOpenServiceDetail,
  onOpenLocalityModal,
  selectedLocality,
  onOpenHelp,
  onOpenFranchise,
  onSelectTab,
  onOpenAuth,
  onOpenPlayStoreApk,
}) => {
  const { t, translateCategory, language } = useLanguage();
  const { addItem, addPackageItem, isItemInCart, getItemQuantity } = useCart();
  const { isFavouriteService, toggleFavouriteService } = useFavourites();
  const { effectiveTheme } = useTheme();

  // Strict Category Image Visibility: Only show categories on Home page that have a verified valid, non-broken picture
  const {
    visibleCategories,
    isValidating: isValidatingCategories,
    handleCategoryMediaError,
  } = useValidatedCategoryImages(categories);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showAllCategoriesExpanded, setShowAllCategoriesExpanded] = useState(false);
  const [activePackageTab, setActivePackageTab] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Recent searches state - max 5 user queries stored in localStorage
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 5);
        }
      }
    } catch (e) {
      console.warn('Recent searches load notice:', e);
    }
    return DEFAULT_INITIAL_SEARCHES.slice(0, 5);
  });

  const saveToRecentSearches = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setRecentSearches((prev) => {
      const updated = [trimmed, ...prev.filter((i) => i.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Recent searches save notice:', e);
      }
      return updated;
    });
  };

  const handleRemoveRecent = (termToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((i) => i.toLowerCase() !== termToRemove.toLowerCase());
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.warn('Recent search remove notice:', err);
      }
      return updated;
    });
  };

  const handleSelectRecent = (term: string) => {
    if (onSearchChange) onSearchChange(term);
    saveToRecentSearches(term);
    setIsSearchFocused(false);
    const srvSection = document.getElementById('services-list-section');
    if (srvSection) {
      srvSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleClearHistory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch (err) {
      console.warn('Clear history notice:', err);
    }
  };

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'Wrench':
        return <Wrench className="w-5 h-5 text-blue-500" />;
      case 'AirVent':
        return <AirVent className="w-5 h-5 text-cyan-500" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'Hammer':
        return <Hammer className="w-5 h-5 text-orange-500" />;
      case 'Paintbrush':
        return <Paintbrush className="w-5 h-5 text-rose-500" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-emerald-500" />;
      case 'Scissors':
        return <Scissors className="w-5 h-5 text-pink-500" />;
      case 'HardHat':
        return <HardHat className="w-5 h-5 text-amber-600" />;
      case 'Building2':
      case 'Construction':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'Home':
        return <Home className="w-5 h-5 text-emerald-600" />;
      case 'Flame':
        return <Flame className="w-5 h-5 text-orange-600" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-indigo-600" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-600" />;
      case 'Factory':
        return <Factory className="w-5 h-5 text-stone-700" />;
      case 'Truck':
        return <Truck className="w-5 h-5 text-yellow-600" />;
      case 'Package':
      case 'Layers':
        return <Package className="w-5 h-5 text-teal-600" />;
      default:
        return <Wrench className="w-5 h-5 text-orange-500" />;
    }
  };

  const getTradeKeyForCategory = (catId?: string, name?: string): 'carpenter' | 'handicraft' | 'electrician' | 'painting' | 'plumber' | 'mechanic' | 'security' | undefined => {
    if (catId) {
      if (catId.includes('carpenter')) return 'carpenter';
      if (catId.includes('handicraft')) return 'handicraft';
      if (catId.includes('electrician')) return 'electrician';
      if (catId.includes('painting')) return 'painting';
      if (catId.includes('plumber')) return 'plumber';
      if (catId.includes('ac') || catId.includes('appliance')) return 'mechanic';
      if (catId.includes('security') || catId.includes('guard')) return 'security';
    }
    if (name) {
      const lower = name.toLowerCase();
      if (lower.includes('carpenter') || lower.includes('furniture') || lower.includes('door') || lower.includes('लकड़ी') || lower.includes('बढ़ई')) return 'carpenter';
      if (lower.includes('electric') || lower.includes('wiring') || lower.includes('fan') || lower.includes('बिजली')) return 'electrician';
      if (lower.includes('plumb') || lower.includes('pipe') || lower.includes('leak') || lower.includes('नल') || lower.includes('प्लंबर')) return 'plumber';
      if (lower.includes('paint') || lower.includes('wall') || lower.includes('रंग')) return 'painting';
      if (lower.includes('ac') || lower.includes('machine') || lower.includes('motor') || lower.includes('मैकेनिक')) return 'mechanic';
      if (lower.includes('craft') || lower.includes('print') || lower.includes('हस्तशिल्प')) return 'handicraft';
      if (lower.includes('guard') || lower.includes('cctv') || lower.includes('security') || lower.includes('सुरक्षा')) return 'security';
    }
    return undefined;
  };

  // Check if selected location is outside active service zones (Bhopal & Gwalior are active)
  const isInactiveDistrict = React.useMemo(() => {
    if (!selectedLocality) return false;
    const lower = selectedLocality.toLowerCase();
    if (lower.includes('bhopal') || lower.includes('gwalior') || lower.includes('mp nagar') || lower.includes('arera') || lower.includes('kolar') || lower.includes('hoshangabad') || lower.includes('ayodhya') || lower.includes('bairagarh') || lower.includes('katara') || lower.includes('karond') || lower.includes('lalghati') || lower.includes('indrapuri') || lower.includes('saket') || lower.includes('shahpura') || lower.includes('bagsewaniya') || lower.includes('chuna bhatti') || lower.includes('nehru nagar') || lower.includes('kotra') || lower.includes('taron') || lower.includes('awadhpuri') || lower.includes('misrod') || lower.includes('raisen') || lower.includes('bhadbhada') || lower.includes('bhel') || lower.includes('govindpura') || lower.includes('ashoka garden') || lower.includes('subhash nagar') || lower.includes('habibganj') || lower.includes('gulmohar') || lower.includes('trilanga') || lower.includes('bawadiya') || lower.includes('salaiya') || lower.includes('jahangirabad') || lower.includes('moti masjid') || lower.includes('royal market') || lower.includes('kohefiza') || lower.includes('airport') || lower.includes('gandhi nagar') || lower.includes('manit') || lower.includes('barkatullah')) {
      return false;
    }
    // If it contains a state or district marker that is not live
    return true;
  }, [selectedLocality]);

  // Filter services
  const filteredServices = services.filter((srv) => {
    const matchesCategory = !selectedCategory || srv.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorite = !favoritesOnly || isFavouriteService(srv.id);

    return matchesCategory && matchesSearch && matchesFavorite;
  });

  // Top 6 most booked services
  const mostBookedServices = services
    .slice()
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 6);

  // Focus search input
  const handleHeroSearchFocus = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="space-y-12 pb-20">
      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-900 via-stone-950 to-orange-950 text-white shadow-2xl border border-stone-800">
        {/* Subtle decorative glow & grid */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:20px_20px]"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-orange-600/20 blur-3xl pointer-events-none"></div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-14 max-w-4xl mx-auto text-center space-y-6">
          {/* Active Festival Theme Badge */}
          {effectiveTheme.category === 'festival' && (
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black shadow-md border animate-in fade-in transition-all"
              style={{
                backgroundColor: effectiveTheme.colors.badgeBg,
                color: effectiveTheme.colors.badgeText,
                borderColor: effectiveTheme.colors.headerBorder,
              }}
            >
              <span className="text-base">{effectiveTheme.greetingIcon}</span>
              <span>{effectiveTheme.nameHindi}: {effectiveTheme.greetingHindi}</span>
            </div>
          )}

          {/* Bhopal Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/25 border border-orange-500/40 text-orange-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>{t('heroBadge', "Bhopal's Premier Home Services Network")}</span>
          </div>

          {/* Main Headline (Default Hindi) */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight sm:leading-snug text-white">
            {t('heroHeadline', 'घर का हर काम,\nअब HARDINKAAM के साथ आसान')}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-300 mt-2 text-xl sm:text-3xl md:text-4xl font-extrabold">
              {t('heroSubheadline', 'Verified professionals को खोजें, service book करें और अपने घर का काम भरोसे के साथ करवाएं।')}
            </span>
          </h1>

          {/* Interactive Large Search Box & Quick CTAs */}
          <div ref={searchContainerRef} className="max-w-2xl mx-auto pt-2 space-y-3 relative z-30">
            <div className="relative bg-white rounded-2xl p-2 sm:p-2.5 shadow-2xl border-2 border-orange-500/80 flex flex-col sm:flex-row items-center gap-2 text-stone-900">
              <div className="flex items-center gap-2 px-3 py-1.5 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-stone-200">
                <button
                  type="button"
                  onClick={onOpenLocalityModal}
                  className="flex items-center gap-1.5 text-stone-700 hover:text-orange-600 text-xs font-bold whitespace-nowrap cursor-pointer"
                  title="अपनी लोकेशन चुनें"
                >
                  <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="truncate max-w-[130px]">
                    {selectedLocality ? selectedLocality.split('(')[0] : 'भोपाल (क्षेत्र चुनें)'}
                  </span>
                </button>
              </div>

              <div className="relative flex-1 w-full flex items-center">
                <Search className="w-5 h-5 text-stone-400 ml-2 mr-2 shrink-0" />
                <input
                  ref={searchInputRef}
                  id="hero-service-search-input"
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onClick={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    if (onSearchChange) onSearchChange(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (searchQuery.trim()) {
                        saveToRecentSearches(searchQuery);
                      }
                      setIsSearchFocused(false);
                      const srvSection = document.getElementById('services-list-section');
                      if (srvSection) srvSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  placeholder={t('searchHeroPlaceholder', 'आपको कौन-सी service चाहिए?')}
                  className="w-full py-2 pr-3 text-xs sm:text-sm font-semibold bg-transparent focus:outline-hidden text-stone-900 placeholder:text-stone-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onSearchChange) onSearchChange('');
                    }}
                    className="p-1 text-stone-400 hover:text-stone-600 cursor-pointer mr-1"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (searchQuery.trim()) saveToRecentSearches(searchQuery);
                  setIsSearchFocused(false);
                  const srvSection = document.getElementById('services-list-section');
                  if (srvSection) srvSection.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{ background: effectiveTheme.colors.bannerGradient }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <span>{t('heroCtaFindService', 'Service खोजें')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-CTA Button: Become a Pro */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onOpenAuth) {
                    onOpenAuth('service_man');
                  } else if (onSelectTab) {
                    onSelectTab('pro_dashboard');
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-orange-200 hover:text-white border border-white/20 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <HardHat className="w-4 h-4 text-amber-400" />
                <span>{t('heroCtaBecomePro', 'Service Provider बनें')}</span>
                <ChevronRight className="w-3.5 h-3.5 text-orange-300" />
              </button>
            </div>

            {/* Search Suggestions, Recent Searches & Trending Categories Dropdown */}
            {isSearchFocused && (
              <div
                id="recent-searches-dropdown"
                className="absolute left-0 right-0 top-full mt-2 bg-white text-stone-800 rounded-3xl p-4 sm:p-5 shadow-2xl border border-stone-200 text-left space-y-4 animate-in fade-in zoom-in-95 duration-150 z-50 max-h-[75vh] overflow-y-auto"
              >
                {/* 1. Recent Searches Header & Pills (Last 5 queries) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-500" />
                      <span>Recent Searches (अंतिम 5 खोजें)</span>
                    </span>
                    {recentSearches.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="text-[11px] font-bold text-stone-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
                        title="Clear all recent searches"
                      >
                        <span>साफ़ करें</span>
                      </button>
                    )}
                  </div>

                  {recentSearches.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {recentSearches.slice(0, 5).map((term) => (
                        <div
                          key={term}
                          className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-stone-50 hover:bg-orange-50 hover:border-orange-300 border border-stone-200 text-xs font-semibold text-stone-700 transition-all cursor-pointer shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectRecent(term)}
                            className="flex items-center gap-1.5 text-left text-stone-800 group-hover:text-orange-700 cursor-pointer"
                          >
                            <History className="w-3 h-3 text-stone-400 group-hover:text-orange-500 shrink-0" />
                            <span>{term}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecent(term, e)}
                            className="p-1 rounded-full text-stone-400 hover:text-rose-600 hover:bg-stone-200/60 transition-colors cursor-pointer ml-1"
                            title={`'${term}' हटाएं`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-1 text-xs text-stone-400 font-medium">
                      कोई हालिया खोज नहीं है। नीचे दी गई ट्रेंडिंग कैटेगरी या लोकप्रिय सेवाएँ चुनें।
                    </div>
                  )}
                </div>

                {/* 2. Trending Service Categories (Instant Access) */}
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
                      <span>Trending Service Categories (ट्रेंडिंग सेवा श्रेणियां)</span>
                    </span>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                      Popular
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {visibleCategories.slice(0, 6).map((cat) => {
                      const serviceCount = services.filter((s) => s.categoryId === cat.id).length;
                      const translatedName = translateCategory(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            onSelectCategory(cat.id);
                            if (onSearchChange) onSearchChange('');
                            saveToRecentSearches(translatedName);
                            setIsSearchFocused(false);
                            const target = document.getElementById('services-list-section');
                            if (target) target.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 hover:bg-orange-50 hover:border-orange-300 border border-stone-200/80 transition-all text-left cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white shadow-2xs flex items-center justify-center text-stone-700 group-hover:scale-105 transition-transform overflow-hidden shrink-0 border border-stone-100">
                            <LazyImage
                              src={cat.imageUrl!}
                              alt={cat.name}
                              className="w-full h-full object-cover"
                              onError={() => handleCategoryMediaError(cat.id, cat.imageUrl)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-stone-800 group-hover:text-orange-700 truncate leading-tight">
                              {translatedName}
                            </p>
                            <p className="text-[10px] text-stone-400 font-medium truncate">
                              {serviceCount} {t('services', 'सेवाएँ')}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-orange-500 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Instant Access: Popular Services with direct booking/view */}
                {services.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Instant Access: Popular Services (लोकप्रिय सेवाएँ)</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {mostBookedServices.slice(0, 3).map((srv) => (
                        <div
                          key={srv.id}
                          onClick={() => {
                            onOpenServiceDetail(srv);
                            saveToRecentSearches(srv.name);
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 hover:bg-orange-50/80 border border-stone-200/70 hover:border-orange-200 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-orange-100/70 text-orange-600 flex items-center justify-center shrink-0 font-black text-xs">
                              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-stone-900 group-hover:text-orange-700 truncate leading-tight">
                                {srv.name}
                              </p>
                              <p className="text-[10px] text-stone-500 font-medium truncate">
                                {srv.categoryName} • <span className="text-amber-600 font-bold">★ {srv.rating}</span> ({srv.ratingCount})
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className="text-xs font-black text-emerald-700 block leading-tight">
                              ₹{srv.price}
                            </span>
                            <span className="text-[10px] font-bold text-orange-600 group-hover:underline">
                              बुक करें →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Stats Pills */}
          <div className="grid grid-cols-3 gap-3 pt-6 max-w-xl mx-auto border-t border-white/10">
            <div className="p-2 rounded-2xl bg-white/5 backdrop-blur-xs">
              <p className="text-xl sm:text-2xl font-black text-amber-400">4.8★</p>
              <p className="text-[11px] text-stone-300 font-medium">{t('statFamilies', '10,000+ खुशहाल परिवार')}</p>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 backdrop-blur-xs">
              <p className="text-xl sm:text-2xl font-black text-white">60 मिनट</p>
              <p className="text-[11px] text-stone-300 font-medium">{t('statArrival', 'त्वरित आगमन')}</p>
            </div>
            <div className="p-2 rounded-2xl bg-white/5 backdrop-blur-xs">
              <p className="text-xl sm:text-2xl font-black text-emerald-400">100%</p>
              <p className="text-[11px] text-stone-300 font-medium">{t('statPricing', 'पारदर्शी व निश्चित दरें')}</p>
            </div>
          </div>

          {/* 7 Core Authentic Trades Preview Ribbon */}
          <div className="pt-6 border-t border-white/10 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400 shrink-0" />
                दीपक बिल्डकॉन व हार्डिनकाम के 7 प्रमुख हुनरमंद ट्रेड्स
              </span>
              <span className="text-[10px] text-stone-300 font-medium">
                किसी भी ट्रेड पर क्लिक करके सेवाएँ देखें
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
              {TRADE_IMAGE_LIST.map((trade) => {
                return (
                  <button
                    key={trade.key}
                    type="button"
                    onClick={() => {
                      if (trade.categoryId) {
                        onSelectCategory(trade.categoryId);
                      }
                      const target = document.getElementById('craftsmen-showcase-section');
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="group flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/10 hover:bg-orange-600/30 border border-white/15 hover:border-orange-400/60 transition-all cursor-pointer text-center"
                    title={`${trade.hindiName} - ${trade.name}`}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden ring-2 ring-white/20 group-hover:ring-amber-400 group-hover:scale-105 transition-all shadow-md bg-stone-800 shrink-0">
                      <TradeImage
                        tradeKey={trade.key as any}
                        alt={trade.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-black text-stone-100 group-hover:text-amber-300 truncate max-w-full leading-tight">
                      {trade.hindiName.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= GOOGLE ADSENSE LEADERBOARD MONETIZATION UNIT ================= */}
      <section id="adsense-hero-leaderboard" className="w-full">
        <AdSenseBanner
          slot="3948201948"
          format="leaderboard"
          category="home"
          label="विज्ञापन • GOOGLE ADSENSE SPONSORED PARTNER"
          className="my-0"
        />
      </section>

      {/* Inactive District Alert Banner if selected area is not live yet */}
      {isInactiveDistrict && (
        <section id="inactive-district-notice" className="w-full">
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-300 shadow-lg text-stone-900 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-950 leading-snug">
                  Service is not present in your area, soon we will provide you service.
                </h3>
                <p className="text-xs font-bold text-amber-900/90 mt-0.5">
                  आपके क्षेत्र (<span className="font-black text-amber-950">{selectedLocality}</span>) में सेवा वर्तमान में उपलब्ध नहीं है, शीघ्र ही हम आपको सेवा प्रदान करेंगे।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenLocalityModal}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-colors shrink-0 shadow-xs cursor-pointer text-center"
            >
              स्थान बदलें (Change Locality)
            </button>
          </div>
        </section>
      )}

      {/* ================= 2. QUICK SERVICE CATEGORIES ================= */}
      <section id="quick-categories-section">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {t('quickCategoriesTitle', 'आपको किस काम की जरूरत है?')}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
              {t('quickCategoriesSubtitle', 'अपनी जरूरत के अनुसार अनुभवी कारीगर चुनें')}
            </p>
          </div>

          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(null)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-200 cursor-pointer"
            >
              {t('showAllCategories', 'सभी सेवाएँ देखें')}
            </button>
          )}
        </div>

        {/* Categories Grid with hover micro-animations */}
        {visibleCategories.length === 0 && isValidatingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={`cat-skeleton-${idx}`}
                className="p-4 rounded-3xl bg-white border border-stone-100 flex flex-col items-center text-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-stone-100" />
                <div className="h-3.5 w-16 bg-stone-100 rounded-full" />
                <div className="h-2.5 w-10 bg-stone-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
            <p className="text-xs font-bold">
              {t('noCategoriesWithImages', 'वर्तमान में कोई सेवा श्रेणी उपलब्ध नहीं है।')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {visibleCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const translatedName = translateCategory(cat.id);
              const serviceCount = services.filter((s) => s.categoryId === cat.id).length;

              return (
                <button
                  key={cat.id}
                  id={`category-card-${cat.id}`}
                  onClick={() => {
                    onSelectCategory(isSelected ? null : cat.id);
                    const target = document.getElementById('services-list-section');
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`group p-4 rounded-3xl flex flex-col items-center text-center transition-all duration-200 cursor-pointer border relative overflow-hidden ${
                    isSelected
                      ? 'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/25 scale-102 ring-2 ring-orange-500'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110 overflow-hidden ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-stone-50 border border-stone-100'
                    }`}
                  >
                    <LazyImage
                      src={cat.imageUrl!}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      onError={() => handleCategoryMediaError(cat.id, cat.imageUrl)}
                    />
                  </div>

                  <span className="text-xs sm:text-sm font-extrabold leading-tight line-clamp-1">
                    {translatedName}
                  </span>

                  <span
                    className={`text-[10px] mt-1 font-semibold ${
                      isSelected ? 'text-orange-100' : 'text-stone-400'
                    }`}
                  >
                    {serviceCount} {t('allOptions', 'विकल्प')}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= 2.1 CUSTOMER & SERVICE PRO DUAL ENTRY SECTION ================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Entry Card */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-6 sm:p-7 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              <span>{t('customerCardBadge', 'ग्राहक के लिए')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black leading-tight">
              {t('customerCardTitle', 'घर की service चाहिए?')}
            </h3>
            <p className="text-xs sm:text-sm text-orange-100 font-medium leading-relaxed">
              {t('customerCardSubtitle', 'Verified प्रोफेशनल्स को तुरंत खोजें, पारदर्शी दरों पर सेवा बुक करें।')}
            </p>
          </div>
          <div className="pt-5">
            <button
              type="button"
              onClick={() => {
                const srvSection = document.getElementById('services-list-section');
                if (srvSection) srvSection.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-xl bg-white text-orange-700 font-black text-xs sm:text-sm shadow-md hover:bg-orange-50 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>{t('customerCardCta', 'Service Book करें')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Service Pro Entry Card */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-950 text-white p-6 sm:p-7 rounded-3xl shadow-lg border border-stone-800 relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600/30 text-orange-400 border border-orange-500/30 text-xs font-bold">
              <HardHat className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('proCardBadge', 'प्रोफेशनल और कारीगरों के लिए')}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black leading-tight">
              {t('proCardTitle', 'अपने काम को ज्यादा customers तक पहुंचाएं')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 font-medium leading-relaxed">
              {t('proCardSubtitle', 'HARDINKAAM पार्टनर नेटवर्क से जुड़ें और घर बैठे नियमित बुकिंग व कमाई पाएं।')}
            </p>
          </div>
          <div className="pt-5">
            <button
              type="button"
              onClick={() => {
                if (onOpenAuth) {
                  onOpenAuth('service_man');
                } else if (onSelectTab) {
                  onSelectTab('pro_dashboard');
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <span>{t('proCardCta', 'Service Pro बनें')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= 2.2 WHY HARDINKAAM (CORE VALUE PROPOSITIONS & TRUST PILLARS) ================= */}
      <WhyHardinkaam id="why-hardinkaam-section" variant="dark" />

      {/* ================= 2.5 AUTHENTIC CRAFTSMEN & TRADES GALLERY ================= */}
      <section id="craftsmen-showcase-section" className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-black tracking-wide uppercase mb-2">
              <Award className="w-3.5 h-3.5" />
              दीपक बिल्डकॉन • फील्ड-वेरीफाइड मास्टर कारीगर
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              हमारे हुनरमंद कारीगर एवं प्रमाणित सेवाएँ
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-medium mt-1 max-w-2xl">
              100% पुलिस वेरीफाइड, प्रशिक्षित व आधुनिक टूल्स से लैस हमारे कुशल तकनीशियन — पारदर्शी दरों पर आपके घर पर उपलब्ध।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3.5 py-1.5 rounded-xl border border-stone-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              7 प्रमुख ट्रेड्स • 100% वेरीफाइड
            </span>
          </div>
        </div>

        {/* 7 Trade Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {TRADE_IMAGE_LIST.map((trade) => {
            const isTradeCategoryActive = selectedCategory === trade.categoryId;
            return (
              <div
                key={trade.key}
                id={`trade-card-${trade.key}`}
                className={`bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group ${
                  isTradeCategoryActive ? 'border-orange-500 ring-2 ring-orange-400' : 'border-stone-200'
                }`}
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100">
                    <TradeImage
                      tradeKey={trade.key as any}
                      alt={trade.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-stone-950/80 backdrop-blur-xs text-white text-[11px] font-black tracking-wide flex items-center gap-1 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
                      {trade.badge}
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-stone-800 text-[11px] font-black shadow-sm border border-stone-200">
                      {trade.experience}
                    </div>

                    {/* Bottom Rating Pill */}
                    <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-xl bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1 shadow-md">
                      <Star className="w-3.5 h-3.5 fill-stone-950" />
                      <span>{trade.rating}</span>
                      <span className="text-[10px] opacity-85 font-bold">({trade.reviewCount})</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-5 space-y-2.5">
                    <div>
                      <h3 className="text-base font-black text-stone-900 group-hover:text-orange-600 transition-colors">
                        {trade.hindiName}
                      </h3>
                      <p className="text-xs font-bold text-stone-500">{trade.name}</p>
                    </div>

                    <p className="text-xs text-stone-600 font-medium line-clamp-2 leading-relaxed">
                      {trade.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 60-मिनट अराइवल
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-100">
                        निश्चित दरें
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action */}
                <div className="p-4 sm:p-5 pt-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (trade.categoryId) {
                        onSelectCategory(trade.categoryId);
                      }
                      const srvSection = document.getElementById('services-list-section');
                      if (srvSection) {
                        srvSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-stone-900 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm group-hover:bg-orange-600"
                  >
                    <span>सेवा देखें व बुक करें</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 3. SPOTLIGHT & PROMOTIONAL BANNERS ================= */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Banner 1: Bhopal Welcome Offer */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider inline-block">
              भोपाल स्पेशल ऑफर
            </span>
            <h3 className="text-lg font-black leading-snug">प्रथम बुकिंग पर 50% की भारी छूट</h3>
            <p className="text-xs text-amber-100 font-medium">कूपन कोड FIRST50 का प्रयोग करें।</p>
          </div>
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs font-mono font-black bg-black/20 px-2.5 py-1 rounded-lg">
              FIRST50
            </span>
            <button
              onClick={handleHeroSearchFocus}
              className="text-xs font-extrabold text-white flex items-center gap-1 hover:underline cursor-pointer"
            >
              अभी बुक करें <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Banner 2: 60-Minute Fast Arrival Guarantee */}
        <div className="p-5 rounded-3xl bg-stone-900 text-white shadow-md relative overflow-hidden flex flex-col justify-between border border-stone-800">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-600/30 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider inline-block">
              Express Bhopal Service
            </span>
            <h3 className="text-lg font-black leading-snug">60 मिनट में आपातकालीन तकनीशियन</h3>
            <p className="text-xs text-stone-400 font-medium">
              शॉर्ट सर्किट, वाटर लीकेज या एसी खराबी पर तुरंत सहायता।
            </p>
          </div>
          <div className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
              <Clock className="w-4 h-4" /> 60-Min Arrival
            </div>
            <button
              onClick={handleHeroSearchFocus}
              className="text-xs font-extrabold text-orange-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              सेवा चुनें <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Banner 3: ₹100 Flat Bhopal Offer */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-900 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider inline-block">
              मानसून व फेस्टिव बचत
            </span>
            <h3 className="text-lg font-black leading-snug">फ्लैट ₹100 की सीधी छूट</h3>
            <p className="text-xs text-blue-100 font-medium">₹499 से अधिक के ऑर्डर पर कोड BHOPAL100।</p>
          </div>
          <div className="pt-4 flex items-center justify-between">
            <span className="text-xs font-mono font-black bg-black/20 px-2.5 py-1 rounded-lg">
              BHOPAL100
            </span>
            <button
              onClick={handleHeroSearchFocus}
              className="text-xs font-extrabold text-white flex items-center gap-1 hover:underline cursor-pointer"
            >
              ऑफर पाएँ <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ================= ALL-INDIA FRANCHISE SHOWCASE BANNER (DEEPAK BUILDCON) ================= */}
      <section
        id="franchise-hero-banner"
        className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white p-6 sm:p-8 border border-amber-500/30 shadow-xl relative overflow-hidden"
      >
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>DEEPAK BUILDCON • भारतव्यापी बिज़नेस पार्टनरशिप प्रोग्राम</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              अपने शहर, गाँव या ज़िले में{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                दीपक बिल्डकॉन फ्रेंचाइज़ी
              </span>{' '}
              शुरू करें
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              पूरे भारत के हर राज्य, ज़िले, कस्बे व गाँव में हार्डिनकाम और दीपक बिल्डकॉन की आधिकारिक फ्रेंचाइज़ी दी जा रही है। न्यूनतम निवेश पर ₹30,000 से ₹3.5 लाख+ मासिक कमाई का सुनहरा अवसर।
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-stone-300">
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>गाँव/कस्बा/ज़िला स्तर पर उपलब्ध</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>मोबाइल पर तुरंत पुष्टि व फीस SMS</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>हेड ऑफिस 24x7 ट्रेनिंग व सपोर्ट</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:w-auto shrink-0">
            {onOpenFranchise && (
              <button
                type="button"
                onClick={onOpenFranchise}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-stone-950 font-black text-sm shadow-lg shadow-orange-900/30 transition-all cursor-pointer flex items-center justify-center gap-2 hover:scale-102"
              >
                <span>फ्रेंचाइज़ी फॉर्म भरें व नियम देखें</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <div className="text-center lg:text-right text-[11px] text-stone-400">
              हेल्पलाइन: <strong className="text-amber-300">+91 98260 12345</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 4. VALUE COMBO PACKAGES ================= */}
      <section className="bg-stone-50 rounded-3xl p-5 sm:p-7 border border-stone-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {t('spotlightTitle', 'विशेष कॉम्बो व बचत ऑफर्स')}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
              {t('spotlightSubtitle', 'एक साथ दो सेवाएँ बुक करें और पाएं 30% तक की छूट')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POPULAR_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="relative h-36 w-full bg-stone-100 overflow-hidden">
                  <LazyImage
                    src={pkg.imageUrl}
                    alt={pkg.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase">
                    {pkg.tag}
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-stone-950/80 backdrop-blur-xs text-white text-[11px] font-bold">
                    बचत {pkg.discountPercent}%
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h4 className="text-sm font-extrabold text-stone-900 leading-snug line-clamp-1">
                    {pkg.title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {pkg.subtitle}
                  </p>

                  <ul className="pt-2 space-y-1 border-t border-stone-100">
                    {pkg.includedServices.slice(0, 2).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1.5 text-[11px] text-stone-600 truncate">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                        <span className="truncate">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-black text-stone-900">₹{pkg.packagePrice}</span>
                    <span className="text-xs text-stone-400 line-through">₹{pkg.originalPrice}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold block">
                    Save ₹{pkg.originalPrice - pkg.packagePrice}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => addPackageItem(pkg)}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{t('bookCombo', 'कॉम्बो बुक करें')}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Google AdSense Native Card Slot in Combo Grid */}
          <AdSenseNativeCard
            title="दीपक बिल्डकॉन भोपाल • कंस्ट्रक्शन व रेनोवेशन स्पेशल"
            subtitle="फुल होम पेंटिंग, मॉड्यूलर किचन व टाइल फिटिंग पर विशेष छूट। निःशुल्क साइट विजिट हेतु आज ही संपर्क करें।"
            badge="प्रायोजित विज्ञापन • Featured Partner"
            ctaText="फ्री साइट विजिट"
            ctaLink="tel:+919826012345"
          />
        </div>
      </section>

      {/* ================= 5. MOST BOOKED / POPULAR SERVICES ================= */}
      <section id="services-list-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {t('mostBookedTitle', 'भोपाल में सबसे ज्यादा बुक की जाने वाली सेवाएँ')}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
              {t('mostBookedSubtitle', 'सत्यापित प्रोफेशनल्स द्वारा 7-दिन की वारंटी के साथ')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                favoritesOnly
                  ? 'bg-rose-50 border-rose-300 text-rose-700'
                  : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-rose-600 text-rose-600' : ''}`} />
              <span>पसंदीदा / Favourites</span>
            </button>
          </div>
        </div>

        {/* Services Grid */}
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-2">
            <Wrench className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-stone-800">
              {t('noServicesFound', 'कोई सेवा नहीं मिली')}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {t('tryDifferentSearch', 'कृपया दूसरा शब्द खोजें या सभी श्रेणियाँ देखें।')}
            </p>
            <button
              type="button"
              onClick={() => {
                onSelectCategory(null);
                setFavoritesOnly(false);
                if (onSearchChange) onSearchChange('');
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 cursor-pointer"
            >
              सभी सेवाएँ रीसेट करें
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredServices.map((service) => {
              const isFav = isFavouriteService(service.id);
              const inCart = isItemInCart(service.id);
              const qty = getItemQuantity(service.id);
              const matchedTrade = getTradeKeyForCategory(service.categoryId, service.name);

              return (
                <div
                  key={service.id}
                  id={`service-card-${service.id}`}
                  className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Image with Tag & Heart */}
                    <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                      {matchedTrade ? (
                        <TradeImage
                          tradeKey={matchedTrade}
                          alt={service.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <LazyImage
                          src={
                            service.imageUrl ||
                            'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=80'
                          }
                          alt={service.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-xs text-white text-[11px] font-bold">
                        {service.categoryName}
                      </div>

                      {/* Favourite Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavouriteService(service.id);
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                          isFav ? 'bg-rose-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'
                        }`}
                        title="Toggle favourite"
                      >
                        <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
                      </button>

                      {/* Rating pill */}
                      <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-stone-900 text-xs font-black flex items-center gap-1 shadow-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{service.rating}</span>
                        <span className="text-stone-400 font-normal">({service.ratingCount})</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 space-y-2">
                      <h3 className="text-base font-extrabold text-stone-900 leading-snug group-hover:text-orange-600 transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-stone-500 font-medium pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-400" /> {service.durationMinutes}{' '}
                          {t('mins', 'mins')}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" /> 7-Day Warranty
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Buttons */}
                  <div className="p-4 sm:p-5 pt-0 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
                    <div>
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">
                        {t('startingAt', 'Starts from')}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-stone-900">₹{service.basePrice}</span>
                        <span className="text-[11px] text-stone-400">/ {service.priceUnit}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Detail Modal Trigger */}
                      <button
                        type="button"
                        onClick={() => onOpenServiceDetail(service)}
                        className="p-2 rounded-xl border border-stone-200 text-stone-500 hover:text-orange-600 hover:border-orange-300 transition-colors cursor-pointer"
                        title="View full details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Add to Cart / Quantity */}
                      <button
                        type="button"
                        onClick={() => addItem(service, 1)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          inCart
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'border-stone-200 hover:border-orange-500 text-stone-700 hover:text-orange-600'
                        }`}
                        title={inCart ? `${qty} in cart` : 'Add to cart'}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{inCart ? `${qty}` : '+ Cart'}</span>
                      </button>

                      {/* Direct Instant Booking */}
                      <button
                        type="button"
                        id={`book-now-btn-${service.id}`}
                        onClick={() => {
                          saveToRecentSearches(service.name);
                          onBookService(service);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1"
                      >
                        <span>{t('bookNow', 'बुक करें')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= 6. HOW HARDINKAAM WORKS (काम कैसे होता है?) ================= */}
      <section id="how-it-works-section" className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-xs">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-200">
            <Clock className="w-3.5 h-3.5" />
            <span>{t('howItWorksBadge', 'सरल व त्वरित प्रक्रिया')}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
            {t('howItWorksTitle', 'काम कैसे होता है?')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            {t('howItWorksSubtitle', 'मात्र 4 आसान चरणों में अपने घर का काम भरोसे के साथ करवाएँ')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 relative space-y-3 hover:border-orange-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-orange-600/20">
              1
            </div>
            <h4 className="text-base font-extrabold text-stone-900">
              {t('step1Title', '1. अपनी जरूरत बताएं')}
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              {t('step1Desc', 'सर्च बार या कैटेगरी में से अपनी आवश्यकता वाली सर्विस चुनें।')}
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 relative space-y-3 hover:border-amber-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-lg flex items-center justify-center shadow-md shadow-amber-500/20">
              2
            </div>
            <h4 className="text-base font-extrabold text-stone-900">
              {t('step2Title', '2. सही Service चुनें')}
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              {t('step2Desc', 'पारदर्शी कीमतें, रेटिंग व समय स्लॉट देखकर सर्विस कन्फर्म करें।')}
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 relative space-y-3 hover:border-blue-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-600/20">
              3
            </div>
            <h4 className="text-base font-extrabold text-stone-900">
              {t('step3Title', '3. Verified Pro आएगा')}
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              {t('step3Desc', 'अनुभवी एवं वेरिफाइड कारीगर तय समय पर आपके पते पर पहुँचेगा।')}
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-stone-50/80 border border-stone-200/80 relative space-y-3 hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-emerald-600/20">
              4
            </div>
            <h4 className="text-base font-extrabold text-stone-900">
              {t('step4Title', '4. सुरक्षित काम & भुगतान')}
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              {t('step4Desc', 'OTP प्रमाणीकरण, गुणवत्तापूर्ण काम के बाद ही सुरक्षित भुगतान।')}
            </p>
          </div>
        </div>
      </section>

      {/* ================= 8. TOP VERIFIED SERVICE PROFESSIONALS ================= */}
      <section id="verified-pros-section">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              {t('topProsTitle', 'शीर्ष सत्यापित प्रोफेशनल्स')}
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-medium mt-0.5">
              {t('topProsSubtitle', 'पुलिस वेरिफिकेशन एवं अनुभव-प्रमाणित तकनीशियन')}
            </p>
          </div>
          <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
            {serviceMen.length} {t('activePros', 'सत्यापित प्रो')}
          </span>
        </div>

        {serviceMen.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-500">
            <HardHat className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold">{t('noProsFound', 'वर्तमान में कोई सेवा प्रदाता सक्रिय नहीं है।')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {serviceMen.map((pro) => {
              const proTradeKey = pro.categoryIds
                ? pro.categoryIds.map((cid) => getTradeKeyForCategory(cid)).find(Boolean)
                : undefined;

              return (
                <div
                  key={pro.id}
                  className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden ring-2 ring-stone-100 shrink-0 bg-stone-100">
                        {proTradeKey ? (
                          <TradeImage
                            tradeKey={proTradeKey}
                            alt={pro.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <LazyImage
                            src={
                              pro.photoUrl ||
                              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80'
                            }
                            alt={pro.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h3 className="text-sm font-extrabold text-stone-900 truncate">{pro.name}</h3>
                          {pro.isVerified && (
                            <ShieldCheck
                              className="w-4 h-4 text-blue-600 fill-blue-50 shrink-0"
                              title="KYC Verified Pro"
                            />
                          )}
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              pro.isAvailable !== false ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            title={pro.isAvailable !== false ? 'Active (Online)' : 'Busy (On Break)'}
                          />
                        </div>
                        <p className="text-xs text-orange-600 font-semibold truncate">
                          {pro.categoryNames.join(', ')}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                          <span className="flex items-center text-amber-500 font-black">
                            <Star className="w-3 h-3 fill-amber-400 inline mr-0.5" /> {pro.rating}
                          </span>
                          <span>•</span>
                          <span>{pro.totalJobs} jobs</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-stone-500 mb-3 bg-stone-50 p-3 rounded-2xl">
                      <div className="flex justify-between">
                        <span className="text-stone-400">{t('experienceYears', 'अनुभव')}:</span>
                        <span className="font-bold text-stone-800">{pro.experienceYears}+ years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">{t('serviceAreaLabel', 'क्षेत्र')}:</span>
                        <span className="font-bold text-stone-800 truncate max-w-[130px]">
                          {pro.serviceArea}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-400">Status:</span>
                        <span
                          className={`font-extrabold ${
                            pro.isAvailable ? 'text-emerald-600' : 'text-stone-400'
                          }`}
                        >
                          {pro.isAvailable ? `● ${t('availableToday', 'Available Today')}` : t('offline', 'Offline')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => onViewProProfile(pro)}
                      className="py-2 px-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-700 transition-colors cursor-pointer text-center"
                    >
                      {t('viewProfile', 'प्रोफ़ाइल देखें')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const matchService =
                          services.find((s) => pro.categoryIds.includes(s.categoryId)) || services[0];
                        if (matchService) onBookService(matchService, pro);
                      }}
                      className="py-2 px-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors cursor-pointer text-center"
                    >
                      {t('bookPro', 'इन्हें बुक करें')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= 9. BHOPAL CUSTOMER REVIEWS & TESTIMONIALS (REAL-TIME FIRESTORE) ================= */}
      <CustomerTestimonials id="customer-testimonials-section" />

      {/* ================= 10. APP DOWNLOAD & INSTANT CONVENIENCE BANNER ================= */}
      <section className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white p-6 sm:p-10 border border-stone-800 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 text-xs font-bold border border-orange-500/30">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t('appBadge', 'मोबाइल पर सबसे आसान अनुभव')}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black leading-tight">
              {t('appTitle', 'अपने फोन से कभी भी सर्विस बुक करें')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 font-medium leading-relaxed">
              {t('appSubtitle', 'HARDINKAAM आपके मोबाइल ब्राउज़र और PWA ऐप पर 100% अनुकूलित है। बिना झंझट तुरंत बुकिंग, लाइव स्टेटस ट्रैकिंग और सीधे प्रो से बात करें।')}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {onOpenPlayStoreApk && (
                <button
                  type="button"
                  onClick={onOpenPlayStoreApk}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-900/40 transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                >
                  <Smartphone className="w-4 h-4 text-amber-300" />
                  <span>📲 Download App (PWA / APK)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleHeroSearchFocus}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <span>{t('bookOnWeb', 'अभी ऑनलाइन बुक करें')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://wa.me/919826012345"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all inline-flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp बुकिंग</span>
              </a>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-xs text-stone-300 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>HARDINKAAM Service Guarantee</span>
            </div>
            <ul className="space-y-2 text-stone-400">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>OTP प्रमाणीकरण के साथ सुरक्षित सर्विस डिलीवरी</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>7 दिनों की सर्विस वारंटी (चुनिंदा सेवाओं पर)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>सीधे कारीगर या हेल्पडेस्क से WhatsApp सहायता</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================= GOOGLE ADSENSE IN-FEED MONETIZATION UNIT ================= */}
      <section id="adsense-mid-feed" className="w-full">
        <AdSenseBanner
          slot="4829104829"
          format="responsive"
          category="tools"
          label="विज्ञापन • GOOGLE ADSENSE SPONSORED OFFERS"
        />
      </section>

      {/* ================= 11. FAQ ACCORDION SECTION ================= */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-orange-600" />
            <span>{t('faqBadge', 'मदद एवं जानकारी')}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {t('faqTitle', 'अक्सर पूछे जाने वाले सवाल')}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 font-medium">
            {t('faqSubtitle', 'HARDINKAAM सर्विस बुकिंग से जुड़े प्रमुख सवालों के जवाब')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
            <h4 className="text-sm font-bold text-stone-900">
              प्र. क्या HARDINKAAM के प्रोफेशनल्स वेरिफाइड होते हैं?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              हाँ, हमारे सभी कारीगर और टेक्नीशियन आधार प्रमाणीकरण, पुलिस बैकग्राउंड वेरिफिकेशन और उनके ट्रेड अनुभव की गहन जांच के बाद ही प्लेटफॉर्म से जोड़े जाते हैं।
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
            <h4 className="text-sm font-bold text-stone-900">
              प्र. क्या सर्विस बुक करने से पहले कीमत तय होती है?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              जी बिल्कुल। हमारी सभी सेवाओं के बेस रेट्स और विजिटिंग चार्ज पारदर्शी तरीके से दिखाए जाते हैं, जिससे काम के बाद कोई छुपा हुआ शुल्क नहीं लगता।
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
            <h4 className="text-sm font-bold text-stone-900">
              प्र. भोपाल के किन-किन क्षेत्रों में सर्विस उपलब्ध है?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              हम पूरे भोपाल में उपलब्ध हैं—अरेरा कॉलोनी, एमपी नगर, शाहपुरा, कोलार, होशंगाबाद रोड, अवधपुरी, बैरागढ़, कटारा हिल्स सहित लगभग सभी कॉलोनियों में।
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5">
            <h4 className="text-sm font-bold text-stone-900">
              प्र. सर्विसमैन बनने के लिए रजिस्ट्रेशन कैसे करें?
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              होमपेज पर दिए गए 'Service Provider बनें' बटन पर क्लिक करके या +91 98260 12345 पर कॉल करके आप अपने आधार व अनुभव के साथ सीधे जुड़ सकते हैं।
            </p>
          </div>
        </div>
      </section>

      {/* ================= GOOGLE ADSENSE PRE-CTA BANNER ================= */}
      <section id="adsense-pre-cta" className="w-full">
        <AdSenseBanner
          slot="5930219482"
          format="responsive"
          category="services"
          label="विज्ञापन • GOOGLE ADSENSE SPONSORED PARTNER"
        />
      </section>

      {/* ================= 12. FINAL CALL TO ACTION (CTA) ================= */}
      <section className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-8 sm:p-12 text-white text-center space-y-5 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            {t('finalCtaTitle', 'आज ही अपनी सेवा बुक करें')}
          </h2>
          <p className="text-xs sm:text-sm text-orange-100 font-medium">
            {t(
              'finalCtaSubtitle',
              'अनुभवी और भरोसेमंद तकनीशियन कुछ ही पलों में आपके घर पर।'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleHeroSearchFocus}
            className="px-6 py-3.5 rounded-2xl bg-white text-orange-700 font-black text-xs sm:text-sm shadow-lg hover:bg-orange-50 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>{t('finalCtaButton', 'सेवा खोजें')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenAuth) {
                onOpenAuth('service_man');
              } else if (onSelectTab) {
                onSelectTab('pro_dashboard');
              }
            }}
            className="px-5 py-3.5 rounded-2xl bg-stone-900/40 hover:bg-stone-900/60 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <HardHat className="w-4 h-4 text-amber-300" />
            <span>{t('finalCtaProButton', 'Service Provider बनें')}</span>
          </button>

          <a
            href="tel:+919826012345"
            className="px-5 py-3.5 rounded-2xl bg-black/25 hover:bg-black/35 text-white font-bold text-xs sm:text-sm border border-white/20 transition-all flex items-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            <span>+91 98260 12345</span>
          </a>

          <a
            href="https://wa.me/919826012345"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3.5 rounded-2xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm border border-emerald-500/40 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </section>

      {/* ================= 13. FLOATING SCROLL-TO-TOP BUTTON ================= */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40 p-3.5 rounded-full bg-orange-600 text-white shadow-2xl hover:bg-orange-700 border-2 border-white transition-all cursor-pointer animate-in fade-in zoom-in-75"
          title="Scroll to Top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ================= 14. MOBILE BOTTOM STICKY QUICK ACTION BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-stone-900/95 backdrop-blur-md border-t border-stone-800 p-2.5 px-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          <a
            href="tel:+919826012345"
            className="p-2.5 rounded-xl bg-stone-800 text-orange-400 border border-stone-700"
            title="Call Support"
          >
            <PhoneCall className="w-4 h-4" />
          </a>
          <a
            href="https://wa.me/919826012345"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 rounded-xl bg-emerald-900/60 text-emerald-400 border border-emerald-700/60"
            title="WhatsApp Support"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        </div>

        <button
          type="button"
          onClick={handleHeroSearchFocus}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{t('mobileStickyBook', 'Service खोजें / बुक करें')}</span>
        </button>
      </div>
    </div>
  );
};


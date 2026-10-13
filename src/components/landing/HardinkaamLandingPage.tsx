import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import './landing.css';
import { LandingRole as UserRole, ServiceCategory } from '../../types/landing';
import { LANDING_SERVICES_DATA as SERVICES_DATA } from '../../data/landingServicesData';
import { LandingPWAInstallButton as PWAInstallButton } from '../pwa/LandingPWAInstallButton';
import { Search, X, ChevronRight, ShieldCheck, FileText, Wrench, Briefcase, Users, Building2, Sparkles, Star } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { isResourceExhausted } from '../../utils/sparkQuotaGuard';
import { AdSenseBanner } from '../ads/AdSenseBanner';

interface Props {
  onEnterApp: (role?: UserRole, tab?: string) => void;
  onOpenBooking: (serviceId: string) => void;
  onOpenDashboard: (tab?: string) => void;
  onOpenAuth: (role: string, mode?: 'in' | 'reg') => void;
  onOpenFranchise: () => void;
  onOpenCare?: () => void;
  onOpenRfq?: () => void;
  onOpenAmc?: () => void;
  onOpenWfh?: () => void;
  onOpenJobs?: () => void;
}

export const HardinkaamLandingPage: React.FC<Props> = ({
  onEnterApp,
  onOpenBooking,
  onOpenDashboard,
  onOpenAuth,
  onOpenFranchise,
  onOpenCare,
  onOpenRfq,
  onOpenAmc,
  onOpenWfh,
  onOpenJobs,
}) => {
  const { userProfile, isAdmin, logout } = useAuth();
  const APP_TO_LANDING: Record<string, UserRole> = {
    customer: 'customer', service_man: 'professional', business_partner: 'partner',
    brand_promoter: 'promoter', franchise_admin: 'franchise', admin: 'admin'
  };
  const user = userProfile
    ? { name: userProfile.name || 'User', role: (isAdmin ? 'admin' : (APP_TO_LANDING[userProfile.role as string] || 'customer')) as UserRole }
    : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'franchise' | 'promoter' | 'partner'>('customer');
  const [heroSlide, setHeroSlide] = useState(0);

  // CMS Dynamic State from Firestore with defaults as fallback
  const [cmsHeroTitle, setCmsHeroTitle] = useState<string>('Ghar ka har kaam, ek expert ke haath mein');
  const [cmsHeroSubtitle, setCmsHeroSubtitle] = useState<string>("AC, RO, electrician, painting, cleaning, salon aur 15+ services — verified professionals, Rohan's Kit ke saath, aapke darwaze par.");
  const [cmsBannerAlert, setCmsBannerAlert] = useState<string>('');

  // Consolidated single Firestore listener for CMS theme and global config
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const THEMES: Record<string, { primary: string; secondary: string }> = {
      orange: { primary: '#ff7a00', secondary: '#2a4bd7' },
      crimson: { primary: '#e11d48', secondary: '#7c3aed' },
      emerald: { primary: '#10b981', secondary: '#0284c7' }
    };

    // Try loading initial state from session cache to prevent flash of content
    try {
      const cached = sessionStorage.getItem('hdk_cms_global_cache');
      if (cached) {
        const data = JSON.parse(cached);
        if (data.heroTitle) setCmsHeroTitle(data.heroTitle);
        if (data.heroSubtitle) setCmsHeroSubtitle(data.heroSubtitle);
        if (data.bannerAlert !== undefined) setCmsBannerAlert(data.bannerAlert);
        if (rootRef.current && data.theme) {
          const palette = THEMES[data.theme] || THEMES.orange;
          rootRef.current.style.setProperty('--o', palette.primary);
          rootRef.current.style.setProperty('--b', palette.secondary);
        }
      }
    } catch (_) {}

    if (isResourceExhausted()) return;

    let isMounted = true;
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'cms_configs', 'cms_global');
        const docSnap = await getDoc(docRef);
        if (!isMounted || !docSnap.exists()) return;
        const data = docSnap.data();
        try {
          sessionStorage.setItem('hdk_cms_global_cache', JSON.stringify(data));
        } catch (_) {}

        // 1. Theme application
        const el = rootRef.current;
        if (el) {
          const palette = THEMES[data.theme as string] || THEMES.orange;
          el.style.setProperty('--o', palette.primary);
          el.style.setProperty('--b', palette.secondary);
          el.style.setProperty('--glow-opacity', data.glowBackgrounds === false ? '0' : '0.35');
        }

        // 2. CMS Copy
        if (data.heroTitle) setCmsHeroTitle(data.heroTitle);
        if (data.heroSubtitle) setCmsHeroSubtitle(data.heroSubtitle);
        if (data.bannerAlert !== undefined) setCmsBannerAlert(data.bannerAlert);
      } catch (error) {
        console.warn('Firestore CMS fetch notice (using cached/default content):', error);
      }
    };

    fetchCms();
    return () => {
      isMounted = false;
    };
  }, []);

  // Utility to render Hero Title with correct gradient styling highlights
  const renderHeroTitle = (title: string) => {
    if (title.includes('ek expert')) {
      const parts = title.split('ek expert');
      return (
        <>
          {parts[0]}
          <span className="grad">ek expert</span>
          {parts[1]}
        </>
      );
    }
    if (title.includes('100% Police Verified')) {
      const parts = title.split('100% Police Verified');
      return (
        <>
          {parts[0]}
          <span className="grad">100% Police Verified</span>
          {parts[1]}
        </>
      );
    }
    return title;
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Consistent scroll-to-id helper for all navigation items (#home, #video, #services, #join, #contact)
  // Accounts for dynamic sticky header height and closes mobile menu upon navigation
  const scrollToId = (sectionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setMenuOpen(false);

    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.pushState(null, '', '#home');
      return;
    }

    const elem = document.getElementById(sectionId);
    if (elem) {
      const navElem = document.querySelector<HTMLElement>('.hdk-landing nav.hdk-nav');
      const navHeight = navElem ? navElem.getBoundingClientRect().height : 76;
      const elementTop = elem.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = Math.max(0, elementTop - navHeight - 8);

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      window.history.pushState(null, '', '#' + sectionId);
    }
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle hash on initial mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => {
        scrollToId(hash);
      }, 250);
    }
  }, []);

  // Filter services based on query
  const filteredServices = searchQuery.trim()
    ? SERVICES_DATA.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.nameHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.subCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Hero slideshow
  const heroImages = [
    { src: '/images/ac.webp', alt: 'AC installation' },
    { src: '/images/fan.webp', alt: 'Fan installation' },
    { src: '/images/ro.webp', alt: 'RO training' },
    { src: '/images/painting.webp', alt: 'Painting' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % heroImages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Stats counter animation
  const [counts, setCounts] = useState({ categories: 0, customers: 0, partners: 0, years: 0 });
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const targets = { categories: 15, customers: 5000, partners: 500, years: 4 };
    let started = false;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          started = true;
          const duration = 1500;
          const steps = 40;
          const stepTime = duration / steps;
          let step = 0;

          const interval = setInterval(() => {
            step++;
            const progress = step / steps;
            setCounts({
              categories: Math.min(targets.categories, Math.round(targets.categories * progress)),
              customers: Math.min(targets.customers, Math.round(targets.customers * progress)),
              partners: Math.min(targets.partners, Math.round(targets.partners * progress)),
              years: Math.min(targets.years, Math.round(targets.years * progress))
            });

            if (step >= steps) {
              clearInterval(interval);
            }
          }, stepTime);
        }
      },
      { threshold: 0.15 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Role mapping: landing role -> app role used by the main AuthModal
  const ROLE_TO_APP: Record<UserRole, string> = {
    customer: 'customer', professional: 'service_man', partner: 'business_partner',
    promoter: 'business_partner', franchise: 'franchise_admin', admin: 'admin'
  };

  // Landing buttons now open the app's real AuthModal (registration fee, KYC, OTP etc. stay intact)
  const openAuth = (mode: 'in' | 'reg', role?: UserRole, _clearPending: boolean = true) => {
    setMenuOpen(false);
    if (role === 'franchise') {
      onOpenFranchise();
      return;
    }
    onOpenAuth(ROLE_TO_APP[role || 'customer'], mode);
  };

  // Services are browsable by guests; login is requested at booking time by the app itself
  const handleServiceSelect = (serviceId: string) => {
    onOpenBooking(serviceId);
  };

  const handleAdminDirectLogin = () => {
    if (user?.role === 'admin') onOpenDashboard('overview');
    else onOpenAuth('admin', 'in');
  };

  const handleFranchiseDirectLogin = () => {
    onOpenFranchise();
  };

  // 3D Tilt on Service Cards
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(700px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.03)`;
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = '';
  };

  const roles = {
    customer: {
      n: 'Customer',
      img: 'housekeeping',
      h: 'Ghar ke kaam, bina tension',
      l: [
        'Verified & trained professionals',
        'Fixed, transparent pricing',
        'Service warranty & support',
        'Same-day booking'
      ],
      b: 'Customer Registration (ग्राहक पंजीकरण)',
      role: 'customer' as UserRole
    },
    franchise: {
      n: 'Franchise',
      img: 'construction',
      h: 'Apne shehar mein Hardinkaam chalayein',
      l: [
        'Established brand & app support',
        "Training & Rohan's Kit",
        'Exclusive area rights',
        'Multiple income streams'
      ],
      b: 'Franchise Enquiry',
      role: 'franchise' as UserRole
    },
    promoter: {
      n: 'Brand Promoter',
      img: 'salon',
      h: 'Promote karein, kamayein',
      l: [
        'Referral commission on every booking',
        'Marketing material & creatives',
        'Live dashboard & payouts',
        'Work from anywhere'
      ],
      b: 'Promoter Bane',
      role: 'promoter' as UserRole
    },
    partner: {
      n: 'Business Partner',
      img: 'business',
      h: 'Saath mein badhein',
      l: [
        'Onboard as service provider or vendor',
        'Steady jobs & leads',
        'Brand association & badges',
        'Grow with Hardinkaam network'
      ],
      b: 'Partner Bane',
      role: 'partner' as UserRole
    }
  };

  return (
    <div className="hdk-landing" ref={rootRef}>
      {/* Ambient background glow blobs */}
      <div className="blob b1" />
      <div className="blob b2" />

      {/* Alert Banner / Urgent Notification Bar */}
      {cmsBannerAlert && (
        <div className="fixed top-0 left-0 right-0 h-9 bg-gradient-to-r from-[#ff7a00] to-[#ff3d00] text-white text-xs flex items-center justify-center px-4 font-bold tracking-wider z-[60] shadow-md">
          {cmsBannerAlert}
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="hdk-nav" style={{ top: cmsBannerAlert ? '36px' : '0' }}>
        <a href="#home" onClick={(e) => scrollToId('home', e)}>
          <img className="logo" src="/images/logo.webp" width="168" height="42" alt="Hardinkaam" />
        </a>

        {/* Live Service Search Bar in Nav */}
        <div ref={searchContainerRef} className="relative hidden sm:block max-w-[260px] lg:max-w-[320px] w-full mx-2 z-50">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-[#ffb066] pointer-events-none" />
            <input
              type="text"
              placeholder="Search 16+ services (AC, RO, Maid...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              className="w-full pl-9 pr-8 py-2 bg-[#0a1030]/90 hover:bg-[#0a1030] focus:bg-[#070b22] border border-white/20 focus:border-[#ff7a00] rounded-full text-xs text-white placeholder:text-[#9aa5d6]/70 outline-none transition shadow-inner font-['Poppins',sans-serif]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-slate-400 hover:text-white p-0.5 rounded-full"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f1638] border border-white/20 rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-[#ffb066] border-b border-white/10 flex items-center justify-between">
                <span>Matching Services ({filteredServices.length})</span>
                <span className="text-[10px] text-slate-400">Click to book</span>
              </div>

              {filteredServices.length > 0 ? (
                <div className="space-y-1 mt-1">
                  {filteredServices.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        handleServiceSelect(s.id);
                        setIsSearchFocused(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 cursor-pointer transition group"
                    >
                      <img
                        src={s.image}
                        alt={s.name}
                        className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h5 className="text-xs font-bold text-white group-hover:text-[#ffb066] truncate">
                            {s.name}
                          </h5>
                          <span className="text-xs font-extrabold text-emerald-400 shrink-0">
                            ₹{s.startingPrice}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#9aa5d6]">
                          <span>{s.subCategory}</span>
                          <span>•</span>
                          <span className="flex items-center text-amber-400">
                            ⭐ {s.rating}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#ff7a00] group-hover:translate-x-0.5 transition shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-[#9aa5d6]">
                  Koi service nahi mili "{searchQuery}" ke liye.
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`menu ${menuOpen ? 'open' : ''}`} id="menu">
          <a href="#home" onClick={(e) => scrollToId('home', e)}>
            Home
          </a>
          <a href="#features" onClick={(e) => scrollToId('features', e)}>
            Special Features
          </a>
          <a href="#video" onClick={(e) => scrollToId('video', e)}>
            Video
          </a>
          <a href="#services" onClick={(e) => scrollToId('services', e)}>
            Services
          </a>
          <a href="#join" onClick={(e) => scrollToId('join', e)}>
            Join Us
          </a>
          <a href="#contact" onClick={(e) => scrollToId('contact', e)}>
            Contact
          </a>

          {/* Quick Service Direct Trigger Pills in Nav */}
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenCare?.();
            }}
            className="text-xs font-bold px-2.5 py-1 rounded-lg text-teal-300 hover:text-teal-200 bg-teal-500/15 border border-teal-500/30 flex items-center gap-1 cursor-pointer"
            title="7-दिन फ्री री-सर्विस व संतुष्टि गारंटी"
          >
            <ShieldCheck className="w-3 h-3 text-teal-400" />
            <span>7-Day Care</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenRfq?.();
            }}
            className="text-xs font-bold px-2.5 py-1 rounded-lg text-orange-300 hover:text-orange-200 bg-orange-500/15 border border-orange-500/30 flex items-center gap-1 cursor-pointer"
            title="बड़े प्रोजेक्ट्स के लिए कई कोट्स मंगाएं"
          >
            <FileText className="w-3 h-3 text-orange-400" />
            <span>RFQ Quotes</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onOpenAmc?.();
            }}
            className="text-xs font-bold px-2.5 py-1 rounded-lg text-indigo-300 hover:text-indigo-200 bg-indigo-500/15 border border-indigo-500/30 flex items-center gap-1 cursor-pointer"
            title="वार्षिक मेंटेनेंस कॉन्ट्रैक्ट व VIP मेंबरशिप"
          >
            <Wrench className="w-3 h-3 text-indigo-400" />
            <span>AMC Plans</span>
          </button>

          {/* Mobile drawer specific links & mobile search */}
          {menuOpen && (
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2 sm:hidden">
              {/* Mobile Search Input */}
              <div className="relative my-1 w-full">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-[#ffb066] pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search 16+ services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-[#0a1030] border border-white/20 focus:border-[#ff7a00] rounded-xl text-xs text-white placeholder:text-[#9aa5d6]/70 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 text-slate-400 hover:text-white p-0.5 rounded-full"
                      type="button"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Mobile Search Results */}
                {searchQuery.trim().length > 0 && (
                  <div className="mt-1 bg-[#0f1638] border border-white/20 rounded-xl p-1.5 max-h-52 overflow-y-auto">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            handleServiceSelect(s.id);
                            setSearchQuery('');
                            setMenuOpen(false);
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                        >
                          <img src={s.image} alt={s.name} className="w-8 h-8 rounded object-cover" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{s.name}</div>
                            <div className="text-[10px] text-emerald-400">₹{s.startingPrice}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-center text-xs text-slate-400">
                        Koi service nahi mili
                      </div>
                    )}
                  </div>
                )}
              </div>
              {user ? (
                <>
                  <button
                    className="text-left text-sm font-semibold text-white py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDashboard('overview');
                    }}
                  >
                    👤 My Dashboard ({user.name})
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-white py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDashboard('bookings');
                    }}
                  >
                    My Bookings
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-white py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDashboard('rewards');
                    }}
                  >
                    Rewards & Referral Points
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-red-400 py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="text-left text-sm font-semibold text-[#ffb066] py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => openAuth('in')}
                  >
                    Sign In
                  </button>
                  <button
                    className="text-left text-sm font-bold text-[#ff7a00] py-2 px-3 rounded-lg hover:bg-white/10 flex items-center gap-2 border border-[#ff7a00]/30 bg-[#ff7a00]/10"
                    onClick={() => openAuth('reg', 'customer')}
                  >
                    <span>👤</span>
                    <span>Customer Registration (ग्राहक पंजीकरण)</span>
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-slate-300 py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => openAuth('reg', 'professional')}
                  >
                    Become a Service Professional (Karigar)
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-slate-300 py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => openAuth('reg', 'partner')}
                  >
                    Become a Business Partner
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-slate-300 py-1.5 px-3 rounded-lg hover:bg-white/10"
                    onClick={() => openAuth('reg', 'franchise')}
                  >
                    Franchise Enquiry
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-teal-300 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenCare?.();
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>🛡️ 7-Day Care &amp; Free Re-Service</span>
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-orange-300 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenRfq?.();
                    }}
                  >
                    <FileText className="w-4 h-4 text-orange-400" />
                    <span>📋 RFQ / Multiple Quotes Bidding</span>
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-indigo-300 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenAmc?.();
                    }}
                  >
                    <Wrench className="w-4 h-4 text-indigo-400" />
                    <span>⭐ Annual AMC &amp; VIP Membership</span>
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-amber-300 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenWfh?.();
                    }}
                  >
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    <span>💼 Work From Home Hub (Daily Tasks)</span>
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-blue-300 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenJobs?.();
                    }}
                  >
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>👷 Karigar &amp; Technician Jobs Portal</span>
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-amber-400 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-1.5"
                    onClick={() => {
                      setMenuOpen(false);
                      handleAdminDirectLogin();
                    }}
                  >
                    🛡️ Admin Login (Direct)
                  </button>
                  <button
                    className="text-left text-sm font-semibold text-emerald-400 py-1.5 px-3 rounded-lg hover:bg-white/10 flex items-center gap-1.5"
                    onClick={() => {
                      setMenuOpen(false);
                      handleFranchiseDirectLogin();
                    }}
                  >
                    🏢 Franchise Login (Direct)
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div id="authbox" className="flex items-center gap-2">
          <PWAInstallButton />
          {user ? (
            <>
              <span id="hello">Namaste, {user.name.split(' ')[0]}</span>
              <button className="btn" onClick={() => onOpenDashboard('overview')}>
                {user.role === 'admin' ? '🛡️ Admin Dashboard' : (user.role as string) === 'franchise' ? '🏢 Franchise Dashboard' : (user.role as string) === 'professional' || (user.role as string) === 'service_man' ? '⚡ Pro Dashboard' : '👤 My Dashboard'}
              </button>
              <button className="btn alt" onClick={logout}>
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button className="btn ghost" id="bIn" onClick={() => openAuth('in')}>
                Sign In
              </button>
              <button
                className="btn"
                id="bReg"
                style={{
                  background: 'linear-gradient(90deg, #ff7a00, #ff3d00)',
                  boxShadow: '0 4px 15px rgba(255, 122, 0, 0.45)',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: '700'
                }}
                onClick={() => openAuth('reg', 'customer')}
                title="Create a new Customer Account"
              >
                👤 Customer Registration
              </button>
              <button
                className="btn alt"
                style={{
                  padding: '9px 16px',
                  fontSize: '13px',
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                }}
                onClick={handleFranchiseDirectLogin}
                title="Direct Franchise Dashboard Access"
              >
                🏢 Franchise Login
              </button>
              <button
                className="btn alt"
                style={{
                  padding: '9px 16px',
                  fontSize: '13px',
                  background: 'linear-gradient(90deg, #d97706, #dc2626)',
                  boxShadow: '0 4px 15px rgba(217, 119, 6, 0.4)'
                }}
                onClick={handleAdminDirectLogin}
                title="Direct Super Admin Command Center Access"
              >
                ⚡ Super Admin Command Center
              </button>
            </>
          )}
        </div>

        <button
          className="burger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
      </nav>

      {/* Hero Section */}
      <section id="home" style={{ scrollMarginTop: '80px' }}>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="tag">🔧 Har Din Kaam • Since 2022</span>
            <button
              type="button"
              onClick={() => openAuth('reg', 'customer')}
              className="px-3.5 py-1 bg-gradient-to-r from-orange-500/30 to-amber-500/30 hover:from-orange-500/50 hover:to-amber-500/50 border border-orange-500/50 rounded-full text-xs font-bold text-orange-200 transition shadow-lg flex items-center gap-1 cursor-pointer"
            >
              👤 Customer Registration (ग्राहक रजिस्ट्रेशन) →
            </button>
            <button
              type="button"
              onClick={handleAdminDirectLogin}
              className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 rounded-full text-xs font-bold text-red-200 transition shadow-lg flex items-center gap-1 cursor-pointer"
            >
              ⚡ Super Admin Command Center →
            </button>
          </div>
          <h1>
            {renderHeroTitle(cmsHeroTitle)}
          </h1>
          <p>
            {cmsHeroSubtitle}
          </p>
          <div className="cta">
            <button
              className="btn"
              type="button"
              style={{
                background: 'linear-gradient(90deg, #ff7a00, #ff3d00)',
                boxShadow: '0 6px 24px rgba(255, 122, 0, 0.6)',
                border: '1px solid rgba(255, 180, 100, 0.4)'
              }}
              onClick={() => {
                if (!user) {
                  openAuth('reg', 'customer');
                } else {
                  onOpenDashboard('overview');
                }
              }}
            >
              👤 Customer Registration (ग्राहक पंजीकरण)
            </button>
            <button
              className="btn"
              type="button"
              onClick={(e) => {
                if (!user) {
                  openAuth('reg', 'customer');
                } else {
                  scrollToId('services', e);
                }
              }}
            >
              Service Book Karein
            </button>
            <button
              className="btn alt"
              type="button"
              onClick={() => {
                if (user) {
                  onOpenDashboard('overview');
                } else {
                  openAuth('reg', 'partner');
                }
              }}
            >
              Partner Bane
            </button>
            <button
              className="btn"
              type="button"
              style={{
                background: 'linear-gradient(90deg, #dc2626, #991b1b)',
                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.5)',
                border: '1px solid rgba(248, 113, 113, 0.4)'
              }}
              onClick={handleAdminDirectLogin}
            >
              ⚡ Super Admin Command Center
            </button>
            <a className="btn ghost" href="tel:6267546945">
              📞 6267546945
            </a>
          </div>
        </div>

        <div className="hero-art">
          <div className="glow" />
          {heroImages.map((img, idx) => (
            <img
              key={img.src}
              className={`main ${heroSlide === idx ? 'on' : ''}`}
              src={img.src}
              alt={img.alt}
            />
          ))}
          <span className="chip c1">✅ Verified Experts</span>
          <span className="chip c2">⚡ Same Day Service</span>
        </div>
      </section>

      {/* Stats Counter Section */}
      <div className="stats" ref={statsRef}>
        <div className="stat">
          <b className="grad">{counts.categories}+</b>
          <small>Service Categories</small>
        </div>
        <div className="stat">
          <b className="grad">{counts.customers.toLocaleString()}+</b>
          <small>Happy Customers</small>
        </div>
        <div className="stat">
          <b className="grad">{counts.partners}+</b>
          <small>Skilled Partners</small>
        </div>
        <div className="stat">
          <b className="grad">{counts.years}+</b>
          <small>Years of Trust</small>
        </div>
      </div>

      {/* Featured Enterprise Offerings: Care, RFQ, AMC, WFH, Jobs */}
      <section id="features" className="hdk-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="hdk-h2">
          Exclusive <span>Services &amp; Guarantee</span>
        </h2>
        <p className="sub">
          Warranty, large project bidding, annual maintenance contracts aur daily earning ke verified vikalp.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto px-4 mt-6">
          {/* Card 1: 7-Day Care & Warranty */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1538] to-[#14235c] border border-teal-500/30 hover:border-teal-400 transition-all shadow-xl flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                  100% Satisfaction Guarantee
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">
                  7-Day Care &amp; Free Re-Service
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                काम में कोई भी असंतोष? 7 दिनों के भीतर बिना किसी सवाल के फ्री री-सर्विस या तुरंत शिकायत निवारण पाएं।
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenCare}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>7-दिन केयर टिकट खोलें</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 2: RFQ Bidding / Get Multiple Quotes */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1538] to-[#14235c] border border-orange-500/30 hover:border-orange-400 transition-all shadow-xl flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full border border-orange-400/20">
                  Competitive Contractor Bidding
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">
                  RFQ / Multiple Quotes Bidding
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                पेंटिंग, सिविल निर्माण या घर के रिनोवेशन जैसे बड़े प्रोजेक्ट्स के लिए 5+ वेरिफाइड कांट्रैक्टर्स से बेस्ट कोट्स मंगाएं।
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenRfq}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>प्रोजेक्ट कोट्स मंगाएं</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 3: AMC Annual Maintenance Contracts */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1538] to-[#14235c] border border-indigo-500/30 hover:border-indigo-400 transition-all shadow-xl flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2.5 py-0.5 rounded-full border border-indigo-400/20">
                  Year-Round Protection
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">
                  Annual AMC &amp; VIP Membership
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                पूरे 365 दिन AC, RO, प्लंबिंग और इलेक्ट्रिकल मेंटेनेंस पर 0 विजिट चार्ज और 40% तक की भारी बचत पाएं।
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAmc}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>AMC प्लांस व VIP पैकेज देखें</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 4: Work From Home Hub */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1538] to-[#14235c] border border-amber-500/30 hover:border-amber-400 transition-all shadow-xl flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Earn Daily from Home
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">
                  Work From Home Hub &amp; Tasks
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                डिजिटल मार्केटिंग, फील्ड वेरिफिकेशन और सोशल प्रमोशन टास्क पूरे करें और सीधे अपने वॉलेट में दैनिक पेआउट पाएं।
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenWfh}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>टास्क शुरू करें व कमाएं</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 5: Jobs Recruitment Portal */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1538] to-[#14235c] border border-blue-500/30 hover:border-blue-400 transition-all shadow-xl flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2.5 py-0.5 rounded-full border border-blue-400/20">
                  Direct Hiring Across MP
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">
                  Karigar &amp; Technician Jobs
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                इलेक्ट्रीशियन, प्लंबर, कारपेंटर, एसी मैकेनिक और कंस्ट्रक्शन सुपरवाइजर पदों के लिए सीधे आवेदन करें।
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenJobs}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>जॉब्स देखें व आवेदन करें</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Card 6: Franchise Expansion */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c1538] to-[#14235c] border border-emerald-500/30 hover:border-emerald-400 transition-all shadow-xl flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                  District Franchise
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">
                  District &amp; City Franchise
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                अपने जिले या तहसील में HARDINKAAM की अधिकृत फ्रेंचाइज़ी शुरू करें और 20% तक हर सर्विस बुकिंग पर कमीशन अर्जित करें।
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenFranchise}
              className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <span>फ्रेंचाइज़ी पोर्टल खोलें</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Google AdSense Intact Monetization Banner */}
      <div className="max-w-6xl mx-auto px-4 my-6">
        <AdSenseBanner
          slot="1029384756"
          format="leaderboard"
          category="general"
          label="गूगल एडसेंस • HARDINKAAM SPONSOR"
        />
      </div>

      {/* Video Ad Section */}
      <section id="video" className="hdk-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="hdk-h2">
          Hardinkaam <span>Video Ad</span>
        </h2>
        <p className="sub">Dekhiye kaise Hardinkaam aapka kaam aasaan banata hai.</p>

        <div className="vrow">
          <div className="vcard">
            <img src="/images/hdk.webp" width="72" height="72" loading="lazy" decoding="async" alt="Hardinkaam logo" />
            <h3>
              Har Din Kaam, <span className="grad">Har Kaam Expert</span>
            </h3>
            <p>Video dekhiye aur aaj hi Hardinkaam se judiye.</p>
            <div className="cta" style={{ justifyContent: 'center' }}>
              {user ? (
                <button className="btn" onClick={() => onOpenDashboard('overview')}>
                  My Account Kholein
                </button>
              ) : (
                <button className="btn" onClick={() => openAuth('reg', 'customer')}>
                  Register Karein
                </button>
              )}
              <a
                className="btn alt"
                href="https://youtube.com/shorts/HbhWJ8tASZI"
                target="_blank"
                rel="noopener noreferrer"
              >
                ▶ YouTube par dekhein
              </a>
            </div>
          </div>

          <div className="vwrap">
            <iframe
              src="https://www.youtube.com/embed/HbhWJ8tASZI?rel=0&playsinline=1"
              title="Hardinkaam Video Ad"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Services Grid Section */}
      <section id="services" className="hdk-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="hdk-h2">
          Hamari <span>Services</span>
        </h2>
        <p className="sub">Ghar se lekar khet aur business tak — sab ek jagah. Tap card to book instantly.</p>

        <div className="grid" id="sgrid">
          {SERVICES_DATA.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className="sv"
              onClick={() => handleServiceSelect(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleServiceSelect(s.id);
                }
              }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              aria-label={`Book ${s.name}`}
            >
              <img loading="lazy" src={s.image} alt={s.name} />
              <div>
                <small>{s.subCategory}</small>
                <b>{s.name}</b>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Mid-page Google AdSense Ad */}
      <div className="max-w-6xl mx-auto px-4 my-8">
        <AdSenseBanner
          slot="2839401756"
          format="responsive"
          category="tools"
          label="गूगल एडसेंस पार्टनर • HARDINKAAM CONTRACTOR PRO"
        />
      </div>

      {/* Join Us Role Tabs Section */}
      <section id="join" className="hdk-section" style={{ scrollMarginTop: '80px' }}>
        <h2 className="hdk-h2">
          Hardinkaam se <span>Judiye</span>
        </h2>
        <p className="sub">Apna role chuniye aur aaj hi register kariye.</p>

        <div className="tabs" id="tabs">
          {(Object.keys(roles) as Array<keyof typeof roles>).map((k) => (
            <button
              key={k}
              className={`tab ${activeTab === k ? 'on' : ''}`}
              onClick={() => setActiveTab(k)}
              type="button"
            >
              {roles[k].n}
            </button>
          ))}
        </div>

        <div id="panes">
          {(Object.keys(roles) as Array<keyof typeof roles>).map((k) => {
            const r = roles[k];
            const isActive = activeTab === k;
            return (
              <div
                key={k}
                className={`pane ${isActive ? 'on' : ''}`}
                id={`p-${k}`}
                style={{ display: isActive ? 'grid' : 'none' }}
              >
                <img src={`/images/${r.img}.webp`} loading="lazy" decoding="async" alt={r.n} />
                <div>
                  <h3>{r.h}</h3>
                  <ul>
                    {r.l.map((x, idx) => (
                      <li key={idx}>{x}</li>
                    ))}
                  </ul>

                  {user ? (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => onOpenDashboard('overview')}
                    >
                      My Account Kholein
                    </button>
                  ) : (
                    <button
                      className="btn"
                      type="button"
                      onClick={() => openAuth('reg', r.role)}
                    >
                      {r.b}
                    </button>
                  )}

                  {k === 'franchise' && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleFranchiseDirectLogin}
                        style={{
                          fontSize: '13px',
                          color: '#10b981',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        🏢 Pehle se Franchise Partner hain? Franchise Login karein →
                      </button>
                      <a
                        href="https://wa.me/916267546945?text=Namaste%20Hardinkaam,%20mujhe%20Franchise%20ke%20bare%20mein%20jaankari%20chahiye"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '13px',
                          color: '#ffb066',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        💬 WhatsApp par puchhein
                      </a>
                    </div>
                  )}

                  {k === 'partner' && (
                    <div style={{ marginTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (user) {
                            onOpenDashboard('overview');
                          } else {
                            openAuth('reg', 'professional');
                          }
                        }}
                        style={{
                          fontSize: '13px',
                          color: '#ffb066',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textDecoration: 'underline',
                          cursor: 'pointer'
                        }}
                      >
                        🔧 Karigar / Service Professional ke roop mein judein →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="hdk-footer" style={{ scrollMarginTop: '80px' }}>
        <a href="#home" onClick={(e) => scrollToId('home', e)} style={{ display: 'inline-block' }}>
          <img src="/images/logo.webp" width="168" height="42" loading="lazy" decoding="async" alt="Hardinkaam" />
        </a>
        <p>
          <b>www.hardinkaam.online</b> • 📞{' '}
          <a style={{ color: 'var(--o)', textDecoration: 'none' }} href="tel:6267546945">
            6267546945
          </a>
        </p>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>
          © 2026 Hardinkaam. Har Din Kaam. All rights reserved.
        </p>
      </footer>

      {/* Floating WhatsApp Action Button */}
      <a
        className="wa"
        href="https://wa.me/916267546945"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with Hardinkaam on WhatsApp"
      >
        💬
      </a>
    </div>
  );
};

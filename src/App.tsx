import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from './firebase/config';
import { ensureDatabaseSeeded } from './firebase/seed';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { FavouritesProvider } from './context/FavouritesContext';
import { Category, Service, ServiceMan, Booking, UserRole } from './types';

// Common Components
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { UserProfileView } from './components/common/UserProfileView';
import { MarketplaceFooter } from './components/common/MarketplaceFooter';
import { AuthModal } from './components/auth/AuthModal';

// Customer Components
import { CustomerHome } from './components/customer/CustomerHome';
import { WhyHardinkaam } from './components/customer/WhyHardinkaam';
import { BookingModal } from './components/customer/BookingModal';
import { ProfessionalProfileModal } from './components/customer/ProfessionalProfileModal';
import { ServiceDetailModal } from './components/customer/ServiceDetailModal';
import { CartDrawer } from './components/customer/CartDrawer';
import { CustomerHelpModal } from './components/customer/CustomerHelpModal';
import { BhopalLocalityModal } from './components/customer/BhopalLocalityModal';
import { MyBookings } from './components/customer/MyBookings';
import { CustomerWallet } from './components/customer/CustomerWallet';

// Professional Components
import { ProDashboard } from './components/professional/ProDashboard';
import { ProWallet } from './components/professional/ProWallet';
import { ProKYC } from './components/professional/ProKYC';

// Partner Components
import { PartnerDashboard } from './components/partner/PartnerDashboard';

// Admin Components
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminCatalogManager } from './components/admin/AdminCatalogManager';
import { AdminUsersManager } from './components/admin/AdminUsersManager';
import { AdminBookingsManager } from './components/admin/AdminBookingsManager';
import { AdminKYCAudit } from './components/admin/AdminKYCAudit';
import { AdminWhatsAppLogs } from './components/admin/AdminWhatsAppLogs';
import { AdminPlatformSettings } from './components/admin/AdminPlatformSettings';
import { AdminZeroDataModal } from './components/admin/AdminZeroDataModal';
import { AdminFranchiseReports } from './components/admin/AdminFranchiseReports';
import { AdminThemeManager } from './components/admin/AdminThemeManager';
import { AdminDataImportManager } from './components/admin/AdminDataImportManager';
import { AdminBulkSmsManager } from './components/admin/AdminBulkSmsManager';
import { AdminPayoutsManager } from './components/admin/AdminPayoutsManager';
import { AdminDeploymentManager } from './components/admin/AdminDeploymentManager';
import { AdminDataExplorer } from './components/admin/AdminDataExplorer';
import { AdminSuperDashboard } from './components/admin/AdminSuperDashboard';
import { AdminReportsManager } from './components/admin/AdminReportsManager';
import { AdminAuditLogsViewer } from './components/admin/AdminAuditLogsViewer';
import { AdminLiveBookingsMap } from './components/admin/AdminLiveBookingsMap';
import { VideoCallModal } from './components/video/VideoCallModal';
import { VideoCallSession } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { updateDocumentSEO, getContextualSEO } from './utils/seo';

// Franchise Components
import { FranchisePortal } from './components/franchise/FranchisePortal';

// Google AdSense Monetization Anchor
import { StickyAdSenseAnchor } from './components/ads/StickyAdSenseAnchor';

// PWA Components
import { OfflineNotice } from './components/pwa/OfflineNotice';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';
import { PlayStoreApkModal } from './components/pwa/PlayStoreApkModal';
import { SplashScreen } from './components/common/SplashScreen';

// Broadcast & Festive Welcomes (Customer, Pro, Franchise, Partner)
import { BroadcastWelcomeModal } from './components/common/BroadcastWelcomeModal';
import { BroadcastAnnouncementBanner } from './components/common/BroadcastAnnouncementBanner';
import { AdminBroadcastNoticeManager } from './components/admin/AdminBroadcastNoticeManager';
import { adminBroadcastService } from './services/adminBroadcastService';
import { AdminBroadcastMessage, BroadcastAudience } from './types/broadcast';

function MainAppContent() {
  const { activeRole, setActiveRole, currentUser, userProfile, isAdmin, loading } = useAuth();
  const { unreadCount } = useNotifications();
  const { addToast, setOnOpenBookingHandler } = useToast();

  // Navigation State - initialized from hash, pending auth redirect, or saved tab
  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && !hash.startsWith('call-')) {
        return hash;
      }
      const pendingRedirect = sessionStorage.getItem('hardinkaam_auth_redirect_target');
      if (pendingRedirect) return pendingRedirect;
      const saved = localStorage.getItem('hardinkaam_current_tab');
      if (saved) return saved;
    } catch (_) {}
    return 'home';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Bhopal, MP');
  const [selectedLocality, setSelectedLocality] = useState('MP Nagar (Zone 1 & 2)');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Status tracking refs for real-time customer toasts
  const prevBookingStatusesRef = React.useRef<Map<string, string>>(new Map());
  const isInitialBookingsLoadRef = React.useRef<boolean>(true);

  // Modals State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole>('customer');
  const [isZeroDataModalOpen, setIsZeroDataModalOpen] = useState(false);
  const [isPlayStoreApkModalOpen, setIsPlayStoreApkModalOpen] = useState(false);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookingPreferredPro, setBookingPreferredPro] = useState<ServiceMan | null>(null);
  const [selectedProForProfile, setSelectedProForProfile] = useState<ServiceMan | null>(null);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);
  const [isLocalityModalOpen, setIsLocalityModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState<VideoCallSession | null>(null);

  // Administrative & Festival Broadcast Announcements
  const [activeBroadcasts, setActiveBroadcasts] = useState<AdminBroadcastMessage[]>([]);
  const [activeBroadcastModalMsg, setActiveBroadcastModalMsg] = useState<AdminBroadcastMessage | null>(null);

  // Map active app role or tab to broadcast audience segment
  const broadcastAudience: BroadcastAudience = useMemo(() => {
    if (
      currentTab === 'franchise' ||
      currentTab === 'district_admin' ||
      currentTab === 'franchise_portal' ||
      activeRole === 'franchise_admin'
    ) {
      return 'franchise';
    }
    if (activeRole === 'service_man') {
      return 'service_man';
    }
    if (activeRole === 'business_partner') {
      return 'brand_promoter';
    }
    return 'customer';
  }, [currentTab, activeRole]);

  // Real-time listener for broadcasts targeted to this audience or 'all'
  useEffect(() => {
    const unsub = adminBroadcastService.listenActiveBroadcasts(broadcastAudience, (msgs) => {
      setActiveBroadcasts(msgs);

      // Find first un-dismissed popup announcement
      const popup = msgs.find(
        (m) =>
          (m.displayMode === 'popup_and_banner' || m.displayMode === 'popup_only') &&
          !adminBroadcastService.isDismissed(m.id)
      );
      if (popup) {
        setActiveBroadcastModalMsg(popup);
      }
    });

    return () => unsub();
  }, [broadcastAudience]);

  // Top banner message if active and not dismissed
  const topBannerBroadcast = useMemo(() => {
    return activeBroadcasts.find(
      (m) =>
        (m.displayMode === 'popup_and_banner' || m.displayMode === 'banner_only') &&
        !adminBroadcastService.isDismissed(m.id)
    ) || null;
  }, [activeBroadcasts]);

  // Auto-connect to video call if URL hash has #call-ROOM_CODE
  useEffect(() => {
    const handleUrlHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#call-')) {
        const roomCode = hash.replace('#call-', '').trim();
        if (roomCode) {
          setActiveVideoCall((prev) => {
            if (prev && prev.roomCode === roomCode) return prev;
            return {
              id: 'call_' + Math.random().toString(36).substring(2, 9),
              roomCode,
              title: `Live Video Session (${roomCode})`,
              hostRole: isAdmin ? 'admin' : 'customer',
              hostName: userProfile?.name || (isAdmin ? 'Admin Deepak Buildcon' : 'Client Participant'),
              hostId: currentUser?.uid || 'guest_user',
              status: 'active',
              purpose: 'technical_inspection',
              createdAt: new Date().toISOString(),
            };
          });
        }
      }
    };

    handleUrlHash();
    window.addEventListener('hashchange', handleUrlHash);
    return () => window.removeEventListener('hashchange', handleUrlHash);
  }, [isAdmin, userProfile, currentUser]);

  const handleOpenAuth = (preferredRole: UserRole = 'customer') => {
    setAuthModalRole(preferredRole);
    setIsAuthOpen(true);
  };

  // Enforce strict role isolation across tabs while saving intended redirect target
  const handleSelectTab = (tab: string) => {
    // 1. Admin tabs require verified admin privileges
    if (tab.startsWith('admin_')) {
      if (!isAdmin) {
        sessionStorage.setItem('hardinkaam_auth_redirect_target', tab);
        handleOpenAuth('admin');
        return;
      }
      setActiveRole('admin');
      setCurrentTab(tab);
      window.location.hash = '#' + tab;
      localStorage.setItem('hardinkaam_current_tab', tab);
      return;
    }
    // 2. Service pro tabs require authenticated service pro
    if (tab.startsWith('pro_')) {
      if (!currentUser && !userProfile) {
        sessionStorage.setItem('hardinkaam_auth_redirect_target', tab);
        handleOpenAuth('service_man');
        return;
      }
      if (userProfile?.role !== 'service_man' && !isAdmin) {
        setCurrentTab('home');
        return;
      }
      setActiveRole('service_man');
      setCurrentTab(tab);
      window.location.hash = '#' + tab;
      localStorage.setItem('hardinkaam_current_tab', tab);
      return;
    }
    // 3. Partner tabs require authenticated partner
    if (tab.startsWith('partner_')) {
      if (!currentUser && !userProfile) {
        sessionStorage.setItem('hardinkaam_auth_redirect_target', tab);
        handleOpenAuth('business_partner');
        return;
      }
      if (userProfile?.role !== 'business_partner' && !isAdmin) {
        setCurrentTab('home');
        return;
      }
      setActiveRole('business_partner');
      setCurrentTab(tab);
      window.location.hash = '#' + tab;
      localStorage.setItem('hardinkaam_current_tab', tab);
      return;
    }
    // 4. Customer private views require login
    if ((tab === 'bookings' || tab === 'wallet' || tab === 'profile') && !currentUser && !userProfile) {
      sessionStorage.setItem('hardinkaam_auth_redirect_target', tab);
      handleOpenAuth('customer');
      return;
    }
    setCurrentTab(tab);
    window.location.hash = '#' + tab;
    localStorage.setItem('hardinkaam_current_tab', tab);
  };

  useEffect(() => {
    setOnOpenBookingHandler(() => {
      setActiveRole('customer');
      setCurrentTab('bookings');
      window.location.hash = '#bookings';
      localStorage.setItem('hardinkaam_current_tab', 'bookings');
    });
  }, [setOnOpenBookingHandler, setActiveRole]);

  // Reset booking transition baseline on user or role change
  useEffect(() => {
    isInitialBookingsLoadRef.current = true;
    prevBookingStatusesRef.current.clear();
  }, [currentUser?.uid, activeRole]);

  // Keep view aligned with role & handle post-auth redirects without premature home drops
  useEffect(() => {
    if (loading) return; // Never navigate or redirect prematurely while Firebase Auth is resolving

    const isUserLoggedIn = Boolean(currentUser || userProfile || localStorage.getItem('hardinkaam_admin_active') === 'true');
    const pendingRedirect = sessionStorage.getItem('hardinkaam_auth_redirect_target');

    if (isUserLoggedIn) {
      // 1. Handle pending post-authentication redirect
      if (pendingRedirect) {
        const canAccessAdmin = isAdmin && pendingRedirect.startsWith('admin_');
        const canAccessPro = (isAdmin || userProfile?.role === 'service_man') && pendingRedirect.startsWith('pro_');
        const canAccessPartner = (isAdmin || userProfile?.role === 'business_partner') && pendingRedirect.startsWith('partner_');
        const canAccessCustomer = ['bookings', 'wallet', 'profile', 'home', 'categories', 'franchise'].includes(pendingRedirect);

        if (canAccessAdmin || canAccessPro || canAccessPartner || canAccessCustomer) {
          sessionStorage.removeItem('hardinkaam_auth_redirect_target');
          setCurrentTab(pendingRedirect);
          window.location.hash = '#' + pendingRedirect;
          localStorage.setItem('hardinkaam_current_tab', pendingRedirect);
          return;
        }
      }

      // 2. Preserve valid user views or apply role landing
      if (isAdmin) {
        if (currentTab.startsWith('admin_') || currentTab.startsWith('pro_') || currentTab.startsWith('partner_') || ['bookings', 'wallet', 'profile', 'home', 'categories', 'franchise'].includes(currentTab)) {
          // Valid view for admin
          localStorage.setItem('hardinkaam_current_tab', currentTab);
        } else {
          setCurrentTab('admin_dashboard');
          window.location.hash = '#admin_dashboard';
          localStorage.setItem('hardinkaam_current_tab', 'admin_dashboard');
        }
      } else if (userProfile?.role === 'service_man') {
        if (currentTab.startsWith('pro_') || currentTab === 'profile') {
          // Maintain active sub-tab (e.g. pro_wallet, pro_kyc, pro_dashboard)
          localStorage.setItem('hardinkaam_current_tab', currentTab);
        } else {
          setCurrentTab('pro_dashboard');
          window.location.hash = '#pro_dashboard';
          localStorage.setItem('hardinkaam_current_tab', 'pro_dashboard');
        }
      } else if (userProfile?.role === 'business_partner') {
        if (currentTab.startsWith('partner_') || currentTab === 'profile') {
          localStorage.setItem('hardinkaam_current_tab', currentTab);
        } else {
          setCurrentTab('partner_dashboard');
          window.location.hash = '#partner_dashboard';
          localStorage.setItem('hardinkaam_current_tab', 'partner_dashboard');
        }
      } else if (userProfile?.role === 'customer') {
        if (currentTab.startsWith('admin_') || currentTab.startsWith('pro_') || currentTab.startsWith('partner_')) {
          setCurrentTab('home');
          window.location.hash = '#home';
          localStorage.setItem('hardinkaam_current_tab', 'home');
        }
      }
    } else {
      // Unauthenticated state
      if (currentTab.startsWith('admin_') || currentTab.startsWith('pro_') || currentTab.startsWith('partner_') || ['bookings', 'wallet', 'profile'].includes(currentTab)) {
        sessionStorage.setItem('hardinkaam_auth_redirect_target', currentTab);
        setCurrentTab('home');
        window.location.hash = '#home';
        localStorage.setItem('hardinkaam_current_tab', 'home');
      }
    }
  }, [currentUser, userProfile?.role, isAdmin, currentTab, loading]);

  // Firestore Data Collections
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceMen, setServiceMen] = useState<ServiceMan[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // Initial Seed & Listeners
  useEffect(() => {
    // 1. Ensure Firestore has initial categories, services & pros
    ensureDatabaseSeeded().catch((err) => console.warn('Seed sync notice:', err));

    // 2. Real-time Categories listener
    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: Category[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Category));
        list.sort((a, b) => a.order - b.order);
        if (list.length > 0) setCategories(list);
      },
      (err) => console.warn('Categories listener notice:', err)
    );

    // 3. Real-time Services listener
    const unsubServices = onSnapshot(
      collection(db, 'services'),
      (snap) => {
        const list: Service[] = [];
        snap.forEach((doc) => {
          const raw = doc.data() as any;
          const rating =
            typeof raw.rating === 'number' && !isNaN(raw.rating)
              ? raw.rating
              : 4.8;
          const ratingCount =
            typeof raw.ratingCount === 'number' && !isNaN(raw.ratingCount)
              ? raw.ratingCount
              : typeof raw.reviewCount === 'number' && !isNaN(raw.reviewCount)
              ? raw.reviewCount
              : 12;

          list.push({
            ...raw,
            id: doc.id,
            rating,
            ratingCount,
          } as Service);
        });
        if (list.length > 0) setServices(list);
      },
      (err) => console.warn('Services listener notice:', err)
    );

    // 4. Real-time Service Men listener
    const unsubPros = onSnapshot(
      collection(db, 'service_men'),
      (snap) => {
        const list: ServiceMan[] = [];
        snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as ServiceMan));
        if (list.length > 0) setServiceMen(list);
      },
      (err) => console.warn('Service pros listener notice:', err)
    );

    return () => {
      unsubCats();
      unsubServices();
      unsubPros();
    };
  }, []);

  // 5. Role-Scoped Real-time Bookings listener (adhering strictly to Firestore rules)
  useEffect(() => {
    let q: any;

    if (activeRole === 'admin') {
      // Spark Quota Optimization: Cap admin listener to latest 150 bookings instead of scanning entire collection
      q = query(collection(db, 'bookings'), limit(150));
    } else if (currentUser) {
      if (activeRole === 'service_man') {
        q = query(collection(db, 'bookings'), where('serviceManId', '==', currentUser.uid), limit(100));
      } else if (activeRole === 'business_partner') {
        q = query(collection(db, 'bookings'), where('partnerId', '==', currentUser.uid), limit(100));
      } else {
        q = query(collection(db, 'bookings'), where('customerId', '==', currentUser.uid), limit(100));
      }
    } else {
      // Not logged in: no authenticated query attempted
      setBookings([]);
      return;
    }

    const unsubBookings = onSnapshot(
      q,
      (snap: any) => {
        const list: Booking[] = [];
        snap.forEach((doc: any) => list.push({ id: doc.id, ...doc.data() } as Booking));
        list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Real-time booking status change detection for customers
        if (activeRole === 'customer' && !isInitialBookingsLoadRef.current) {
          list.forEach((b) => {
            const oldStatus = prevBookingStatusesRef.current.get(b.id)?.toLowerCase();
            const newStatus = b.status?.toLowerCase();

            if (oldStatus && oldStatus !== newStatus) {
              // Trigger when booking status changes from 'pending' to 'accepted'
              if (oldStatus === 'pending' && newStatus === 'accepted') {
                addToast({
                  type: 'accepted',
                  title: `Booking Accepted!`,
                  description: `Your booking for ${b.serviceName} has been accepted by ${b.serviceManName || 'our technician'}. Scheduled for ${b.scheduledDate || 'today'}.`,
                  bookingId: b.id,
                  serviceName: b.serviceName,
                  proName: b.serviceManName,
                });
              }
              // Trigger when booking status changes to 'in_progress'
              else if (newStatus === 'in_progress') {
                addToast({
                  type: 'in_progress',
                  title: `Service In Progress!`,
                  description: `${b.serviceManName || 'Technician'} has commenced work on ${b.serviceName}. Check service quality before sharing OTP.`,
                  bookingId: b.id,
                  serviceName: b.serviceName,
                  proName: b.serviceManName,
                });
              }
            }
          });
        }

        // Update tracking map
        list.forEach((b) => prevBookingStatusesRef.current.set(b.id, b.status));
        isInitialBookingsLoadRef.current = false;

        setBookings(list);
      },
      (err: any) => console.warn('Bookings listener notice:', err.message)
    );

    return () => unsubBookings();
  }, [currentUser, activeRole]);

  // Set default tab when switching roles
  useEffect(() => {
    if (activeRole === 'customer') {
      if (currentTab.startsWith('pro_') || currentTab.startsWith('partner_') || currentTab.startsWith('admin_')) {
        setCurrentTab('home');
      }
    } else if (activeRole === 'service_man') {
      if (!currentTab.startsWith('pro_') && currentTab !== 'profile') {
        setCurrentTab('pro_dashboard');
      }
    } else if (activeRole === 'business_partner') {
      if (!currentTab.startsWith('partner_') && currentTab !== 'profile') {
        setCurrentTab('partner_dashboard');
      }
    } else if (activeRole === 'admin') {
      if (!currentTab.startsWith('admin_') && currentTab !== 'profile') {
        setCurrentTab('admin_dashboard');
      }
    }
  }, [activeRole]);

  // Dynamically update document title, meta description, and Open Graph tags based on navigation state
  useEffect(() => {
    if (bookingService) {
      updateDocumentSEO({
        title: `HARDINKAAM - Book ${bookingService.name}`,
        description: `Book ${bookingService.name} in Bhopal starting at ₹${bookingService.price}. Transparent pricing, 100% verified technician guarantee by Deepak Buildcon.`,
        ogTitle: `HARDINKAAM - Book ${bookingService.name}`,
        ogDescription: `Book ${bookingService.name} in Bhopal. Verified professional, upfront rates, 60-min arrival.`,
      });
      return;
    }

    if (selectedServiceForDetail) {
      updateDocumentSEO({
        title: `HARDINKAAM - ${selectedServiceForDetail.name}`,
        description: `View pricing, inclusions, and verified technicians for ${selectedServiceForDetail.name} in Bhopal on HARDINKAAM.`,
        ogTitle: `HARDINKAAM - ${selectedServiceForDetail.name}`,
        ogDescription: `View details & book ${selectedServiceForDetail.name} with verified professionals in Bhopal.`,
      });
      return;
    }

    if (selectedProForProfile) {
      updateDocumentSEO({
        title: `HARDINKAAM - ${selectedProForProfile.name} (${selectedProForProfile.trade || 'Verified Pro'})`,
        description: `View profile, verified credentials, ratings (${selectedProForProfile.rating}★), and service areas for ${selectedProForProfile.name} in Bhopal.`,
        ogTitle: `HARDINKAAM - ${selectedProForProfile.name}`,
        ogDescription: `Verified technician profile: ${selectedProForProfile.name} on HARDINKAAM Bhopal.`,
      });
      return;
    }

    const seoData = getContextualSEO({
      currentTab,
      selectedCategory,
      categories,
      searchQuery,
      selectedLocality,
    });

    updateDocumentSEO(seoData);
  }, [
    currentTab,
    selectedCategory,
    categories,
    searchQuery,
    selectedLocality,
    bookingService,
    selectedServiceForDetail,
    selectedProForProfile,
  ]);

  const handleManualSeed = async () => {
    setIsSeeding(true);
    try {
      await ensureDatabaseSeeded();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleBookService = (service: Service, preferredPro?: ServiceMan) => {
    setBookingService(service);
    setBookingPreferredPro(preferredPro || null);
  };

  const handleBookingSuccess = () => {
    setBookingService(null);
    setBookingPreferredPro(null);
    setCurrentTab('bookings');
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Role Switcher (Admin-only supervisor bar) */}
      <RoleSwitcherBanner
        onRefreshSeed={handleManualSeed}
        onOpenZeroDataModal={() => setIsZeroDataModalOpen(true)}
        onSelectTab={handleSelectTab}
      />

      {/* Top Administrative & Festival Announcement Banner */}
      <BroadcastAnnouncementBanner
        message={topBannerBroadcast}
        onOpenDetails={(msg) => setActiveBroadcastModalMsg(msg)}
      />

      {/* Main Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenAuth={() => handleOpenAuth('customer')}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCity={selectedLocality.split('(')[0].trim() || selectedCity}
        onSelectCity={setSelectedCity}
        onOpenLocalityModal={() => setIsLocalityModalOpen(true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onOpenPlayStoreApk={() => setIsPlayStoreApkModalOpen(true)}
      />

      {/* Main Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* ================= ALL-INDIA FRANCHISE PORTAL VIEW ================= */}
        {(currentTab === 'franchise' || currentTab === 'district_admin' || currentTab === 'franchise_portal' || activeRole === 'franchise_admin') && (
          <FranchisePortal onBackToHome={() => setCurrentTab('home')} />
        )}

        {/* ================= CUSTOMER VIEWS ================= */}
        {currentTab !== 'franchise' && currentTab !== 'district_admin' && currentTab !== 'franchise_portal' && activeRole !== 'franchise_admin' && !currentTab.startsWith('admin_') && !currentTab.startsWith('pro_') && !currentTab.startsWith('partner_') && activeRole === 'customer' && (
          <>
            {(currentTab === 'home' || currentTab === 'categories') && (
              <CustomerHome
                categories={categories}
                services={services}
                serviceMen={serviceMen}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onBookService={handleBookService}
                onViewProProfile={(pro) => setSelectedProForProfile(pro)}
                onOpenServiceDetail={(srv) => setSelectedServiceForDetail(srv)}
                onOpenLocalityModal={() => setIsLocalityModalOpen(true)}
                selectedLocality={selectedLocality}
                onOpenHelp={() => setIsHelpModalOpen(true)}
                onOpenFranchise={() => setCurrentTab('franchise')}
                onSelectTab={handleSelectTab}
                onOpenAuth={(role) => handleOpenAuth(role || 'service_man')}
                onOpenPlayStoreApk={() => setIsPlayStoreApkModalOpen(true)}
              />
            )}

            {currentTab === 'bookings' && (
              <MyBookings
                bookings={bookings}
                services={services}
                serviceMen={serviceMen}
                onOpenBookService={() => setCurrentTab('home')}
                onRebook={(service, preferredPro) => handleBookService(service, preferredPro)}
                onRefresh={() => {}}
              />
            )}

            {currentTab === 'wallet' && <CustomerWallet />}

            {currentTab === 'profile' && <UserProfileView onOpenAdminHub={() => handleSelectTab('admin_dashboard')} />}
          </>
        )}

        {/* ================= SERVICE PRO VIEWS ================= */}
        {activeRole === 'service_man' && !currentTab.startsWith('admin_') && (
          <>
            {(currentTab === 'pro_dashboard' || currentTab === 'pro_jobs') && (
              <ProDashboard
                bookings={bookings}
                onOpenKYC={() => setCurrentTab('pro_kyc')}
                onOpenWallet={() => setCurrentTab('pro_wallet')}
              />
            )}

            {currentTab === 'pro_wallet' && <ProWallet />}

            {currentTab === 'pro_kyc' && <ProKYC />}

            {currentTab === 'profile' && <UserProfileView onOpenAdminHub={() => handleSelectTab('admin_dashboard')} />}
          </>
        )}

        {/* ================= BUSINESS PARTNER VIEWS ================= */}
        {activeRole === 'business_partner' && !currentTab.startsWith('admin_') && (
          <>
            {(currentTab === 'partner_dashboard' ||
              currentTab === 'partner_fleet' ||
              currentTab === 'partner_bookings') && (
              <PartnerDashboard
                bookings={bookings}
                serviceMen={serviceMen}
                onOpenBookings={() => setCurrentTab('partner_bookings')}
                onOpenWallet={() => setCurrentTab('partner_wallet')}
              />
            )}

            {currentTab === 'partner_wallet' && <ProWallet />}

            {currentTab === 'profile' && <UserProfileView onOpenAdminHub={() => handleSelectTab('admin_dashboard')} />}
          </>
        )}

        {/* ================= ADMIN VIEWS ================= */}
        {(activeRole === 'admin' || currentTab.startsWith('admin_')) && isAdmin && (
          <>
            {(currentTab === 'admin_dashboard' || currentTab === 'admin_analytics') && (
              <AdminDashboard
                bookings={bookings}
                services={services}
                categories={categories}
                serviceMen={serviceMen}
                onSelectTab={handleSelectTab}
                onOpenZeroDataModal={() => setIsZeroDataModalOpen(true)}
              />
            )}

            {currentTab === 'admin_catalog' && (
              <AdminCatalogManager
                categories={categories}
                services={services}
                serviceMen={serviceMen}
                onRefresh={() => {}}
                onSelectTab={handleSelectTab}
              />
            )}

            {currentTab === 'admin_users' && <AdminUsersManager />}

            {currentTab === 'admin_bulk_sms' && (
              <AdminBulkSmsManager
                serviceMen={serviceMen}
                onLaunchVideoCall={(session) => setActiveVideoCall(session)}
              />
            )}

            {currentTab === 'admin_bookings' && (
              <AdminBookingsManager
                bookings={bookings}
                serviceMen={serviceMen}
                onRefresh={() => {}}
                onSelectTab={handleSelectTab}
                onStartVideoCall={(b) => {
                  const roomCode = 'DBC-' + Math.floor(100000 + Math.random() * 900000);
                  setActiveVideoCall({
                    id: 'call_' + Math.random().toString(36).substring(2, 9),
                    roomCode,
                    title: `लाइव वीडियो निरीक्षण: Booking #${b.id}`,
                    hostRole: 'admin',
                    hostName: 'Admin Deepak Buildcon',
                    hostId: 'admin_root',
                    participantPhone: b.customerPhone,
                    participantName: b.customerName,
                    status: 'active',
                    purpose: 'technical_inspection',
                    createdAt: new Date().toISOString(),
                  });
                }}
              />
            )}

            {currentTab === 'admin_kyc' && (
              <AdminKYCAudit
                serviceMen={serviceMen}
                onRefresh={() => {}}
                onStartVideoCall={(pro) => {
                  const roomCode = 'KYC-' + Math.floor(100000 + Math.random() * 900000);
                  setActiveVideoCall({
                    id: 'call_' + Math.random().toString(36).substring(2, 9),
                    roomCode,
                    title: `लाइव वीडियो KYC: ${pro.name}`,
                    hostRole: 'admin',
                    hostName: 'Admin Deepak Buildcon',
                    hostId: 'admin_root',
                    participantPhone: pro.phone,
                    participantName: pro.name,
                    status: 'active',
                    purpose: 'kyc_verification',
                    createdAt: new Date().toISOString(),
                  });
                }}
              />
            )}

            {currentTab === 'admin_whatsapp' && <AdminWhatsAppLogs />}

            {currentTab === 'admin_settings' && (
              <AdminPlatformSettings
                onOpenZeroDataModal={() => setIsZeroDataModalOpen(true)}
                onSelectTab={handleSelectTab}
              />
            )}

            {(currentTab === 'admin_broadcast' || currentTab === 'admin_announcements') && (
              <AdminBroadcastNoticeManager onSelectTab={handleSelectTab} />
            )}

            {currentTab === 'admin_payouts' && (
              <AdminPayoutsManager
                bookings={bookings}
                serviceMen={serviceMen}
                onRefresh={() => {}}
              />
            )}

            {currentTab === 'admin_franchise' && <AdminFranchiseReports />}

            {(currentTab === 'admin_super_dashboard' || currentTab === 'admin_super') && (
              <AdminSuperDashboard
                onSelectTab={handleSelectTab}
                bookings={bookings}
              />
            )}

            {(currentTab === 'admin_reports_manager' || currentTab === 'admin_reports') && (
              <AdminReportsManager
                currentUserRole={isAdmin ? 'super_admin' : 'franchise_admin'}
              />
            )}

            {currentTab === 'admin_audit_logs' && (
              <AdminAuditLogsViewer />
            )}

            {currentTab === 'admin_import' && (
              <AdminDataImportManager
                onRefresh={() => {}}
                onSelectTab={handleSelectTab}
              />
            )}

            {currentTab === 'admin_theme' && <AdminThemeManager />}

            {currentTab === 'admin_data_explorer' && (
              <AdminDataExplorer
                onSelectTab={handleSelectTab}
                onOpenZeroDataModal={() => setIsZeroDataModalOpen(true)}
              />
            )}

            {(currentTab === 'admin_website_updates' || currentTab === 'admin_deployments') && (
              <AdminDeploymentManager />
            )}

            {(currentTab === 'admin_live_tracking' || currentTab === 'admin_tracking') && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-amber-300">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE RADAR
                      </span>
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        सर्विसमैन लाइव लोकेशन व GPS ट्रैकिंग हब
                      </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-2xl">
                      भोपाल और सभी कार्यक्षेत्रों में ऑन-ड्यूटी सर्विसमैन की लाइव लोकेशन, रीयल-टाइम रोड रूट, दूरी, ETA और 12-पॉइंट सिस्टम डायग्नोस्टिक्स।
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectTab('admin_dashboard')}
                      className="px-4 py-2 rounded-xl bg-black/20 hover:bg-black/30 text-white font-bold text-xs transition-all border border-white/20 cursor-pointer"
                    >
                      डैशबोर्ड पर वापस जाएं
                    </button>
                  </div>
                </div>

                <AdminLiveBookingsMap
                  bookings={bookings}
                  serviceMen={serviceMen}
                />
              </div>
            )}

            {currentTab === 'profile' && <UserProfileView />}
          </>
        )}
      </main>

      {/* Footer for Customers */}
      {activeRole === 'customer' && (
        <MarketplaceFooter
          onSelectTab={handleSelectTab}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenPlayStoreApk={() => setIsPlayStoreApkModalOpen(true)}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        unreadCount={unreadCount}
      />

      {/* Google AdSense Persistent Anchor (Sticky Bottom Monetization) */}
      <StickyAdSenseAnchor currentTab={currentTab} />

      {/* Cart Sliding Drawer */}
      <CartDrawer
        onProceedToCheckout={() => {
          if (!currentUser) {
            handleOpenAuth('customer');
            return;
          }
          if (services.length > 0) {
            handleBookService(services[0]);
          }
        }}
      />

      {/* Service Detail Modal */}
      <ServiceDetailModal
        service={selectedServiceForDetail}
        onClose={() => setSelectedServiceForDetail(null)}
        onBookDirect={(srv) => {
          setSelectedServiceForDetail(null);
          handleBookService(srv);
        }}
      />

      {/* Bhopal Locality Modal */}
      <BhopalLocalityModal
        isOpen={isLocalityModalOpen}
        onClose={() => setIsLocalityModalOpen(false)}
        selectedLocality={selectedLocality}
        onSelectLocality={(loc) => setSelectedLocality(loc)}
      />

      {/* Customer 24x7 Help Modal */}
      <CustomerHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      {/* Google Play Store & Android APK Builder Modal */}
      <PlayStoreApkModal
        isOpen={isPlayStoreApkModalOpen}
        onClose={() => setIsPlayStoreApkModalOpen(false)}
      />

      {/* Booking Flow Modal */}
      <BookingModal
        isOpen={Boolean(bookingService)}
        onClose={() => {
          setBookingService(null);
          setBookingPreferredPro(null);
        }}
        service={bookingService}
        initialPro={bookingPreferredPro}
        serviceMen={serviceMen}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Professional Profile Modal */}
      <ProfessionalProfileModal
        pro={selectedProForProfile}
        onClose={() => setSelectedProForProfile(null)}
        services={services}
        onBookPro={(srv, pro) => handleBookService(srv, pro)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={authModalRole}
      />

      {/* Admin Zero Dynamic Data Modal */}
      <AdminZeroDataModal
        isOpen={isZeroDataModalOpen}
        onClose={() => setIsZeroDataModalOpen(false)}
        onZeroCompleted={() => {
          setBookings([]);
          addToast('सभी डायनेमिक रिकॉर्ड्स (बुकिंग, लेनदेन, चैट्स) सफलतापूर्वक 0 कर दिए गए हैं।', 'success');
        }}
      />

      {/* Live 1080p Video Call Session Modal */}
      {activeVideoCall && (
        <VideoCallModal
          session={activeVideoCall}
          onClose={() => {
            setActiveVideoCall(null);
            if (window.location.hash.startsWith('#call-')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
          onSendSmsInvite={(phone, link) => {
            addToast(`SMS आमंत्रण भेजा गया: ${phone} (लिंक: ${link})`, 'info');
          }}
          onSendWhatsAppInvite={(phone) => {
            addToast(`WhatsApp वीडियो आमंत्रण खोला गया: ${phone}`, 'success');
          }}
        />
      )}

      {/* Administrative & Festival Welcome Modal */}
      {activeBroadcastModalMsg && (
        <BroadcastWelcomeModal
          message={activeBroadcastModalMsg}
          onClose={() => setActiveBroadcastModalMsg(null)}
          onAction={(target) => {
            setActiveBroadcastModalMsg(null);
            if (target) handleSelectTab(target);
          }}
        />
      )}

      {/* PWA Capabilities: Offline Fallback, Install Prompt, and Version Update Alert */}
      <OfflineNotice />
      <PWAInstallBanner onOpenModal={() => setIsPlayStoreApkModalOpen(true)} />
      <PWAUpdatePrompt />
      <SplashScreen />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <LanguageProvider>
              <CartProvider>
                <FavouritesProvider>
                  <MainAppContent />
                </FavouritesProvider>
              </CartProvider>
            </LanguageProvider>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, limit, doc, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { ensureDatabaseSeeded } from './firebase/seed';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { FavouritesProvider } from './context/FavouritesContext';
import { Category, Service, ServiceMan, Booking, UserRole, RewardTransaction } from './types';

// Common & Shell Components (Eagerly loaded for fast first screen)
import { RoleSwitcherBanner } from './components/common/RoleSwitcherBanner';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { MarketplaceFooter } from './components/common/MarketplaceFooter';
import { PagePaginationBar } from './components/common/PagePaginationBar';
import { AuthModal } from './components/auth/AuthModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SupportFloatingButton } from './components/common/SupportFloatingButton';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';
import { PendingSyncBanner } from './components/common/PendingSyncBanner';
import { SparkQuotaExhaustedBanner } from './components/common/SparkQuotaExhaustedBanner';
import { checkAndHandleQuotaError, isResourceExhausted } from './utils/sparkQuotaGuard';
import { offlineBookingSyncService } from './services/offlineBookingSyncService';
import {
  RewardAnimationType,
  isRewardAlreadyAnimated,
  markRewardAsAnimated,
} from './components/common/RewardEarnAnimation';
import { INITIAL_CATEGORIES, INITIAL_SERVICES, INITIAL_SERVICE_MEN } from './firebase/seed';

// Core Landing & Home Components
import { HardinkaamLandingPage } from './components/landing/HardinkaamLandingPage';
import { CustomerHome } from './components/customer/CustomerHome';
import { CartDrawer } from './components/customer/CartDrawer';
import { feedbackService } from './services/feedbackService';
import { checkAndRewardReferralOnBookingCompletion } from './services/rewardService';
import { VideoCallSession } from './types';
import { ThemeProvider } from './context/ThemeContext';
import { updateDocumentSEO, getContextualSEO } from './utils/seo';

// PWA Shell Components
import { OfflineNotice } from './components/pwa/OfflineNotice';
import { PWAInstallBanner } from './components/pwa/PWAInstallBanner';
import { PWAUpdatePrompt } from './components/pwa/PWAUpdatePrompt';
import { SplashScreen } from './components/common/SplashScreen';
import { BroadcastAnnouncementBanner } from './components/common/BroadcastAnnouncementBanner';
import { adminBroadcastService } from './services/adminBroadcastService';
import { AdminBroadcastMessage, BroadcastAudience } from './types/broadcast';
import { trackVisitorSession } from './services/marketingAnalyticsService';

// Lazy Loaded Customer Sub-pages & Modals (Loaded on demand)
const UserProfileView = React.lazy(() => import('./components/common/UserProfileView').then(m => ({ default: m.UserProfileView })));
const RewardEarnAnimation = React.lazy(() => import('./components/common/RewardEarnAnimation').then(m => ({ default: m.RewardEarnAnimation })));
const PublicBlogView = React.lazy(() => import('./components/blog/PublicBlogView').then(m => ({ default: m.PublicBlogView })));
const CustomerDashboard = React.lazy(() => import('./components/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const BookingModal = React.lazy(() => import('./components/customer/BookingModal').then(m => ({ default: m.BookingModal })));
const ProfessionalProfileModal = React.lazy(() => import('./components/customer/ProfessionalProfileModal').then(m => ({ default: m.ProfessionalProfileModal })));
const ServiceDetailModal = React.lazy(() => import('./components/customer/ServiceDetailModal').then(m => ({ default: m.ServiceDetailModal })));
const CustomerHelpModal = React.lazy(() => import('./components/customer/CustomerHelpModal').then(m => ({ default: m.CustomerHelpModal })));
const BhopalLocalityModal = React.lazy(() => import('./components/customer/BhopalLocalityModal').then(m => ({ default: m.BhopalLocalityModal })));
const MyBookings = React.lazy(() => import('./components/customer/MyBookings').then(m => ({ default: m.MyBookings })));
const CustomerWallet = React.lazy(() => import('./components/customer/CustomerWallet').then(m => ({ default: m.CustomerWallet })));
const PostServiceFeedbackModal = React.lazy(() => import('./components/customer/PostServiceFeedbackModal').then(m => ({ default: m.PostServiceFeedbackModal })));
const HardinkaamCareDashboard = React.lazy(() => import('./components/customer/HardinkaamCareDashboard').then(m => ({ default: m.HardinkaamCareDashboard })));
const GetMultipleQuotesModal = React.lazy(() => import('./components/customer/GetMultipleQuotesModal').then(m => ({ default: m.GetMultipleQuotesModal })));
const AmcCatalogModal = React.lazy(() => import('./components/customer/AmcCatalogModal').then(m => ({ default: m.AmcCatalogModal })));
const HomePassportView = React.lazy(() => import('./components/customer/HomePassportView').then(m => ({ default: m.HomePassportView })));
const FamilyCareView = React.lazy(() => import('./components/customer/FamilyCareView').then(m => ({ default: m.FamilyCareView })));
const BusinessCarePortal = React.lazy(() => import('./components/customer/BusinessCarePortal').then(m => ({ default: m.BusinessCarePortal })));
const SkillAcademyView = React.lazy(() => import('./components/professional/SkillAcademyView').then(m => ({ default: m.SkillAcademyView })));
const WorkFromHomeHub = React.lazy(() => import('./components/customer/WorkFromHomeHub').then(m => ({ default: m.WorkFromHomeHub })));
const JobPortalView = React.lazy(() => import('./components/customer/JobPortalView').then(m => ({ default: m.JobPortalView })));
const PasswordResetPage = React.lazy(() => import('./components/auth/PasswordResetPage').then(m => ({ default: m.PasswordResetPage })));
const PlayStoreApkModal = React.lazy(() => import('./components/pwa/PlayStoreApkModal').then(m => ({ default: m.PlayStoreApkModal })));
const VideoCallModal = React.lazy(() => import('./components/video/VideoCallModal').then(m => ({ default: m.VideoCallModal })));
const BroadcastWelcomeModal = React.lazy(() => import('./components/common/BroadcastWelcomeModal').then(m => ({ default: m.BroadcastWelcomeModal })));

// Professional Components (Lazy)
const ProDashboard = React.lazy(() => import('./components/professional/ProDashboard').then(m => ({ default: m.ProDashboard })));
const ProWallet = React.lazy(() => import('./components/professional/ProWallet').then(m => ({ default: m.ProWallet })));
const ProKYC = React.lazy(() => import('./components/professional/ProKYC').then(m => ({ default: m.ProKYC })));

// Partner & Franchise Components (Lazy)
const PartnerDashboard = React.lazy(() => import('./components/partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })));
const BrandPromoterDashboard = React.lazy(() => import('./components/partner/BrandPromoterDashboard').then(m => ({ default: m.BrandPromoterDashboard })));
const FranchisePortal = React.lazy(() => import('./components/franchise/FranchisePortal').then(m => ({ default: m.FranchisePortal })));

// KaamDost AI Conversational Assistant (Lazy)
const KaamDostAssistant = React.lazy(() => import('./components/assistant/KaamDostAssistant').then(m => ({ default: m.KaamDostAssistant })));

// Admin Components (Lazy - Loaded only when authorized admin accesses tab)
const AdminDashboard = React.lazy(() => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminCatalogManager = React.lazy(() => import('./components/admin/AdminCatalogManager').then(m => ({ default: m.AdminCatalogManager })));
const AdminUsersManager = React.lazy(() => import('./components/admin/AdminUsersManager').then(m => ({ default: m.AdminUsersManager })));
const AdminBookingsManager = React.lazy(() => import('./components/admin/AdminBookingsManager').then(m => ({ default: m.AdminBookingsManager })));
const AdminKYCAudit = React.lazy(() => import('./components/admin/AdminKYCAudit').then(m => ({ default: m.AdminKYCAudit })));
const AdminWhatsAppLogs = React.lazy(() => import('./components/admin/AdminWhatsAppLogs').then(m => ({ default: m.AdminWhatsAppLogs })));
const AdminPlatformSettings = React.lazy(() => import('./components/admin/AdminPlatformSettings').then(m => ({ default: m.AdminPlatformSettings })));
const AdminZeroDataModal = React.lazy(() => import('./components/admin/AdminZeroDataModal').then(m => ({ default: m.AdminZeroDataModal })));
const AdminFranchiseReports = React.lazy(() => import('./components/admin/AdminFranchiseReports').then(m => ({ default: m.AdminFranchiseReports })));
const AdminThemeManager = React.lazy(() => import('./components/admin/AdminThemeManager').then(m => ({ default: m.AdminThemeManager })));
const AdminDataImportManager = React.lazy(() => import('./components/admin/AdminDataImportManager').then(m => ({ default: m.AdminDataImportManager })));
const AdminBulkSmsManager = React.lazy(() => import('./components/admin/AdminBulkSmsManager').then(m => ({ default: m.AdminBulkSmsManager })));
const AdminPayoutsManager = React.lazy(() => import('./components/admin/AdminPayoutsManager').then(m => ({ default: m.AdminPayoutsManager })));
const AdminDeploymentManager = React.lazy(() => import('./components/admin/AdminDeploymentManager').then(m => ({ default: m.AdminDeploymentManager })));
const AdminDataExplorer = React.lazy(() => import('./components/admin/AdminDataExplorer').then(m => ({ default: m.AdminDataExplorer })));
const AdminSuperDashboard = React.lazy(() => import('./components/admin/AdminSuperDashboard').then(m => ({ default: m.AdminSuperDashboard })));
const AdminReportsManager = React.lazy(() => import('./components/admin/AdminReportsManager').then(m => ({ default: m.AdminReportsManager })));
const AdminAuditLogsViewer = React.lazy(() => import('./components/admin/AdminAuditLogsViewer').then(m => ({ default: m.AdminAuditLogsViewer })));
const AdminTaxEngineManager = React.lazy(() => import('./components/admin/AdminTaxEngineManager').then(m => ({ default: m.AdminTaxEngineManager })));
const AdminDocumentsAndRefunds = React.lazy(() => import('./components/admin/AdminDocumentsAndRefunds').then(m => ({ default: m.AdminDocumentsAndRefunds })));
const AdminRfqManager = React.lazy(() => import('./components/admin/AdminRfqManager').then(m => ({ default: m.AdminRfqManager })));
const AdminCareAndAmcManager = React.lazy(() => import('./components/admin/AdminCareAndAmcManager').then(m => ({ default: m.AdminCareAndAmcManager })));
const AdminBusinessIntelligenceDashboard = React.lazy(() => import('./components/admin/AdminBusinessIntelligenceDashboard').then(m => ({ default: m.AdminBusinessIntelligenceDashboard })));
const AdminLiveBookingsMap = React.lazy(() => import('./components/admin/AdminLiveBookingsMap').then(m => ({ default: m.AdminLiveBookingsMap })));
const AdminKnowledgeManager = React.lazy(() => import('./components/admin/AdminKnowledgeManager').then(m => ({ default: m.AdminKnowledgeManager })));
const AdminMarketingAgent = React.lazy(() => import('./components/admin/AdminMarketingAgent').then(m => ({ default: m.AdminMarketingAgent })));
const AdminMarketingLeadsManager = React.lazy(() => import('./components/admin/AdminMarketingLeadsManager').then(m => ({ default: m.AdminMarketingLeadsManager })));
const AdminAICallingAgent = React.lazy(() => import('./components/admin/AdminAICallingAgent').then(m => ({ default: m.AdminAICallingAgent })));
const AdminMarketingAnalyticsDashboard = React.lazy(() => import('./components/admin/AdminMarketingAnalyticsDashboard').then(m => ({ default: m.AdminMarketingAnalyticsDashboard })));
const AdminFinancialProfitDashboard = React.lazy(() => import('./components/admin/AdminFinancialProfitDashboard').then(m => ({ default: m.AdminFinancialProfitDashboard })));
const AdminFinancialLedger = React.lazy(() => import('./components/admin/AdminFinancialLedger').then(m => ({ default: m.AdminFinancialLedger })));
const AdminImageCacheManager = React.lazy(() => import('./components/admin/AdminImageCacheManager').then(m => ({ default: m.AdminImageCacheManager })));
const AdminMediaRepository = React.lazy(() => import('./components/admin/AdminMediaRepository').then(m => ({ default: m.AdminMediaRepository })));
const AdminAIVideoStudio = React.lazy(() => import('./components/admin/AdminAIVideoStudio').then(m => ({ default: m.AdminAIVideoStudio })));
const AdminReferralAnalytics = React.lazy(() => import('./components/admin/AdminReferralAnalytics').then(m => ({ default: m.AdminReferralAnalytics })));
const AdminPageCustomizer = React.lazy(() => import('./components/admin/AdminPageCustomizer').then(m => ({ default: m.AdminPageCustomizer })));
const AdminSuperCenter = React.lazy(() => import('./components/admin/super/AdminSuperCenter').then(m => ({ default: m.AdminSuperCenter })));
const AdminAiFunnelAutomation = React.lazy(() => import('./components/admin/AdminAiFunnelAutomation').then(m => ({ default: m.AdminAiFunnelAutomation })));
const AdminKaamDostControlPanel = React.lazy(() => import('./components/admin/AdminKaamDostControlPanel').then(m => ({ default: m.AdminKaamDostControlPanel })));
const AdminServiceExperienceCenter = React.lazy(() => import('./components/admin/AdminServiceExperienceCenter').then(m => ({ default: m.AdminServiceExperienceCenter })));
const AdminBroadcastNoticeManager = React.lazy(() => import('./components/admin/AdminBroadcastNoticeManager').then(m => ({ default: m.AdminBroadcastNoticeManager })));
const AdminRequestsInboxOutbox = React.lazy(() => import('./components/admin/AdminRequestsInboxOutbox').then(m => ({ default: m.AdminRequestsInboxOutbox })));
const AdminWorkFromManager = React.lazy(() => import('./components/admin/AdminWorkFromManager').then(m => ({ default: m.AdminWorkFromManager })));
const AdminTaskReviewCenter = React.lazy(() => import('./components/admin/AdminTaskReviewCenter').then(m => ({ default: m.AdminTaskReviewCenter })));
const AdminTaskPayoutsManager = React.lazy(() => import('./components/admin/AdminTaskPayoutsManager').then(m => ({ default: m.AdminTaskPayoutsManager })));
const AdminJobManager = React.lazy(() => import('./components/admin/AdminJobManager').then(m => ({ default: m.AdminJobManager })));
const AdminSocialNetworksManager = React.lazy(() => import('./components/admin/AdminSocialNetworksManager').then(m => ({ default: m.AdminSocialNetworksManager })));
const AdminHardinkaamControlRoom = React.lazy(() => import('./components/admin/AdminHardinkaamControlRoom').then(m => ({ default: m.AdminHardinkaamControlRoom })));
const AdminRazorpayTestPanel = React.lazy(() => import('./components/admin/AdminRazorpayTestPanel').then(m => ({ default: m.AdminRazorpayTestPanel })));

// Route-based pre-fetching strategy for instant navigation on slow or fast connections
const PREFETCH_MAP: Record<string, () => Promise<any>> = {
  landing: () => import('./components/landing/HardinkaamLandingPage').then(m => ({ default: m.HardinkaamLandingPage })),
  home: () => import('./components/customer/CustomerHome').then(m => ({ default: m.CustomerHome })),
  customer_dashboard: () => import('./components/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })),
  my_bookings: () => import('./components/customer/MyBookings').then(m => ({ default: m.MyBookings })),
  bookings: () => import('./components/customer/MyBookings').then(m => ({ default: m.MyBookings })),
  wallet: () => import('./components/customer/CustomerWallet').then(m => ({ default: m.CustomerWallet })),
  profile: () => import('./components/common/UserProfileView').then(m => ({ default: m.UserProfileView })),
  blog: () => import('./components/blog/PublicBlogView').then(m => ({ default: m.PublicBlogView })),
  news: () => import('./components/blog/PublicBlogView').then(m => ({ default: m.PublicBlogView })),
  care: () => import('./components/customer/HardinkaamCareDashboard').then(m => ({ default: m.HardinkaamCareDashboard })),
  skills: () => import('./components/professional/SkillAcademyView').then(m => ({ default: m.SkillAcademyView })),
  jobs: () => import('./components/customer/JobPortalView').then(m => ({ default: m.JobPortalView })),
  work_from_home: () => import('./components/customer/WorkFromHomeHub').then(m => ({ default: m.WorkFromHomeHub })),
  passport: () => import('./components/customer/HomePassportView').then(m => ({ default: m.HomePassportView })),
  family: () => import('./components/customer/FamilyCareView').then(m => ({ default: m.FamilyCareView })),
  business: () => import('./components/customer/BusinessCarePortal').then(m => ({ default: m.BusinessCarePortal })),
  pro_dashboard: () => import('./components/professional/ProDashboard').then(m => ({ default: m.ProDashboard })),
  pro_wallet: () => import('./components/professional/ProWallet').then(m => ({ default: m.ProWallet })),
  partner_dashboard: () => import('./components/partner/PartnerDashboard').then(m => ({ default: m.PartnerDashboard })),
  franchise: () => import('./components/franchise/FranchisePortal').then(m => ({ default: m.FranchisePortal })),
  admin_dashboard: () => import('./components/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })),
  admin_catalog: () => import('./components/admin/AdminCatalogManager').then(m => ({ default: m.AdminCatalogManager })),
  admin_users: () => import('./components/admin/AdminUsersManager').then(m => ({ default: m.AdminUsersManager })),
  admin_bookings: () => import('./components/admin/AdminBookingsManager').then(m => ({ default: m.AdminBookingsManager })),
  admin_payouts: () => import('./components/admin/AdminPayoutsManager').then(m => ({ default: m.AdminPayoutsManager })),
  admin_analytics: () => import('./components/admin/AdminMarketingAnalyticsDashboard').then(m => ({ default: m.AdminMarketingAnalyticsDashboard })),
};

export const prefetchRouteComponent = (tab: string) => {
  const loader = PREFETCH_MAP[tab];
  if (loader) {
    loader().catch(() => {});
  }
};

// Lightweight Loading Skeleton Fallback for Lazy Transitions
const LazyFallback: React.FC<{ title?: string }> = ({ title = 'लोड हो रहा है...' }) => (
  <div className="w-full min-h-[320px] flex flex-col items-center justify-center p-8 bg-stone-50/70 rounded-3xl border border-stone-200/70 shadow-xs animate-pulse">
    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 mb-3">
      <svg className="w-5 h-5 animate-spin text-orange-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
    <div className="h-3.5 w-32 bg-stone-200/80 rounded-full mb-2"></div>
    <div className="h-2.5 w-48 bg-stone-100 rounded-full"></div>
    <span className="sr-only">{title}</span>
  </div>
);

function MainAppContent() {
  const {
    activeRole,
    setActiveRole,
    currentUser,
    userProfile,
    isAdmin,
    loading,
    registerConversationalCustomer,
  } = useAuth();
  const { unreadCount } = useNotifications();
  const { addToast, setOnOpenBookingHandler } = useToast();

  // Navigation State - initialized from hash, pending auth redirect, or saved tab
  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const hash = window.location.hash.replace('#', '').trim();
      const search = window.location.search || '';
      // Check if user opened Firebase action code link like /?mode=resetPassword&oobCode=XYZ or #reset-password
      if (
        hash.startsWith('reset-password') ||
        hash.startsWith('resetPassword') ||
        search.includes('resetPassword') ||
        search.includes('oobCode')
      ) {
        return 'reset_password';
      }
      if (hash && hash !== 'home' && !hash.startsWith('call-')) {
        return hash;
      }
      const pendingRedirect = sessionStorage.getItem('hardinkaam_auth_redirect_target');
      if (pendingRedirect) return pendingRedirect;
      // const saved = localStorage.getItem('hardinkaam_current_tab');
      // if (saved && saved !== 'home' && saved !== 'landing') return saved;
    } catch (_) {}
    return 'landing';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Bhopal, MP');
  const [selectedLocality, setSelectedLocality] = useState('MP Nagar (Zone 1 & 2)');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Route-based pre-fetching strategy: prefetch key routes on idle after mount & when tab changes
  useEffect(() => {
    const prefetchKeyRoutes = () => {
      const popularRoutes = ['home', 'customer_dashboard', 'wallet', 'my_bookings', 'profile', 'care', 'blog', 'franchise'];
      popularRoutes.forEach((route) => prefetchRouteComponent(route));
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(prefetchKeyRoutes, { timeout: 1500 });
    } else {
      setTimeout(prefetchKeyRoutes, 1000);
    }
  }, []);

  useEffect(() => {
    prefetchRouteComponent(currentTab);
  }, [currentTab]);

  // Status tracking refs for real-time customer toasts
  const prevBookingStatusesRef = React.useRef<Map<string, string>>(new Map());
  const isInitialBookingsLoadRef = React.useRef<boolean>(true);

  // Modals State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole>('customer');
  const [authModalMode, setAuthModalMode] = useState<'in' | 'reg' | undefined>(undefined);
  const [isZeroDataModalOpen, setIsZeroDataModalOpen] = useState(false);
  const [isPlayStoreApkModalOpen, setIsPlayStoreApkModalOpen] = useState(false);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookingPreferredPro, setBookingPreferredPro] = useState<ServiceMan | null>(null);
  const [selectedProForProfile, setSelectedProForProfile] = useState<ServiceMan | null>(null);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<Service | null>(null);
  const [isLocalityModalOpen, setIsLocalityModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [activeVideoCall, setActiveVideoCall] = useState<VideoCallSession | null>(null);
  const [feedbackBooking, setFeedbackBooking] = useState<Booking | null>(null);
  const [isCareDashboardOpen, setIsCareDashboardOpen] = useState(false);
  const [isRfqModalOpen, setIsRfqModalOpen] = useState(false);
  const [isAmcModalOpen, setIsAmcModalOpen] = useState(false);
  const [careTargetBookingId, setCareTargetBookingId] = useState<string | undefined>(undefined);

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
    if (activeRole === 'business_partner' || activeRole === 'brand_promoter') {
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
      const search = window.location.search || '';

      if (
        hash.startsWith('#reset-password') ||
        hash.startsWith('#resetPassword') ||
        search.includes('resetPassword') ||
        search.includes('oobCode')
      ) {
        setCurrentTab('reset_password');
        return;
      }

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
  }, [isAdmin, userProfile?.name, currentUser?.uid]);

  // Track visitor geo session on initial launch and route changes
  useEffect(() => {
    trackVisitorSession(window.location.pathname || `/${currentTab}`);
  }, [currentTab]);

  const handleOpenAuth = (preferredRole: UserRole = 'customer', mode?: 'in' | 'reg') => {
    setAuthModalRole(preferredRole);
    setAuthModalMode(mode);
    setIsAuthOpen(true);
  };

  // ---- New landing page integration helpers ----
  // Landing service id -> existing catalog category (matched by name so it survives Firestore edits)
  const LANDING_SERVICE_MATCHERS: Record<string, RegExp> = {
    ac: /\bac\b|appliance/i,
    fan: /electric/i,
    ro: /\bro\b|purifier|appliance/i,
    deepclean: /clean/i,
    painting: /paint/i,
    salon: /salon|groom/i,
    housekeeping: /clean|house/i,
    electrician: /electric/i,
    carpenter: /carpent/i,
    tailor: /tailor/i,
    tractor: /tractor|agri/i,
    agri: /agri/i,
    business: /business/i,
    construction: /construction|civil|mistri|building/i,
    blockprint: /print/i,
    art: /\bart\b|craft/i,
  };

  const handleLandingOpenBooking = (landingServiceId: string) => {
    const matcher = LANDING_SERVICE_MATCHERS[landingServiceId];
    const cat = matcher ? categories.find((c) => matcher.test(c.name || '') || matcher.test(c.id || '')) : undefined;
    setSelectedCategory(cat ? cat.id : null);
    handleSelectTab('home');
  };

  const handleLandingDashboard = (tab?: string) => {
    if (!currentUser && !userProfile) {
      handleOpenAuth('customer', 'in');
      return;
    }
    if (isAdmin) return handleSelectTab('admin_dashboard');
    if (userProfile?.role === 'service_man') return handleSelectTab('pro_dashboard');
    if (userProfile?.role === 'business_partner') return handleSelectTab('partner_dashboard');
    if (userProfile?.role === 'franchise_admin') return setCurrentTab('franchise');
    if (tab === 'bookings') return handleSelectTab('bookings');
    if (tab === 'rewards') return handleSelectTab('wallet');
    return handleSelectTab('customer_dashboard');
  };

  const handleOpenCare = (bookingId?: string) => {
    setCareTargetBookingId(bookingId);
    setIsCareDashboardOpen(true);
  };

  const handleOpenRfq = () => {
    setIsRfqModalOpen(true);
  };

  const handleOpenAmc = () => {
    setIsAmcModalOpen(true);
  };

  // Customer Reward Points Earned Live Celebration Animation
  const [rewardEarnModal, setRewardEarnModal] = useState<{
    isOpen: boolean;
    points: number;
    type: RewardAnimationType;
    message?: string;
    transactionId?: string;
    prevBalance?: number;
    newBalance?: number;
  } | null>(null);

  // Real-time listener for verified customer reward transactions
  useEffect(() => {
    if (!auth.currentUser || !currentUser?.uid || currentUser.uid === 'admin_deepak_root' || activeRole !== 'customer') return;

    const walletRef = doc(db, 'reward_wallets', currentUser.uid);
    let isFirstLoad = true;
    let previousPoints = -1;

    const unsub = onSnapshot(
      walletRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        const currentPoints =
          data.pointsBalance !== undefined ? Number(data.pointsBalance) : Number(data.availablePoints || 0);
        const transactions: RewardTransaction[] = Array.isArray(data.transactions) ? data.transactions : [];

        if (isFirstLoad) {
          isFirstLoad = false;
          previousPoints = currentPoints;
          // Mark already existing historical transactions as processed in storage so they don't pop up retrospectively
          transactions.forEach((tx) => {
            const id = tx.transactionId || tx.id;
            if (id && !isRewardAlreadyAnimated(id)) {
              markRewardAsAnimated(id);
            }
          });
          return;
        }

        // Check if new transaction arrived with points > 0
        if (transactions.length > 0) {
          const latestTx = transactions[0];
          const txId = latestTx.transactionId || latestTx.id;
          const pts = Number(latestTx.points ?? latestTx.amountPoints ?? 0);

          if (
            txId &&
            pts > 0 &&
            latestTx.type !== 'REDEMPTION' &&
            latestTx.type !== 'REVERSAL' &&
            !isRewardAlreadyAnimated(txId)
          ) {
            const prevBal = previousPoints >= 0 ? previousPoints : Math.max(0, currentPoints - pts);
            setRewardEarnModal({
              isOpen: true,
              points: pts,
              type: (latestTx.type as RewardAnimationType) || 'BOOKING',
              transactionId: txId,
              prevBalance: prevBal,
              newBalance: currentPoints,
              message: latestTx.description,
            });
          }
        }
        previousPoints = currentPoints;
      },
      (err) => {
        console.warn('Reward wallet snapshot notice:', err);
      }
    );

    return () => unsub();
  }, [currentUser?.uid, activeRole]);

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
    // 4. Special direct tool modals
    if (tab === 'care' || tab === 'warranty') {
      handleOpenCare();
      return;
    }
    if (tab === 'rfq' || tab === 'quotes') {
      handleOpenRfq();
      return;
    }
    if (tab === 'amc' || tab === 'memberships') {
      handleOpenAmc();
      return;
    }
    // 5. Customer private views require login
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

    const isUserLoggedIn = Boolean(currentUser || userProfile);
    const pendingRedirect = sessionStorage.getItem('hardinkaam_auth_redirect_target');

    if (isUserLoggedIn) {
      // 1. Handle pending post-authentication redirect
      if (pendingRedirect) {
        const canAccessAdmin = isAdmin && pendingRedirect.startsWith('admin_');
        const canAccessPro = (isAdmin || userProfile?.role === 'service_man') && pendingRedirect.startsWith('pro_');
        const canAccessPartner = (isAdmin || userProfile?.role === 'business_partner') && pendingRedirect.startsWith('partner_');
        const canAccessCustomer = ['landing', 'bookings', 'wallet', 'profile', 'home', 'categories', 'franchise'].includes(pendingRedirect);

        if (canAccessAdmin || canAccessPro || canAccessPartner || canAccessCustomer) {
          sessionStorage.removeItem('hardinkaam_auth_redirect_target');
          if (currentTab !== pendingRedirect) {
            setCurrentTab(pendingRedirect);
            window.location.hash = '#' + pendingRedirect;
            localStorage.setItem('hardinkaam_current_tab', pendingRedirect);
          }
          return;
        }
      }

      // 2. Preserve valid user views or apply role landing
      if (isAdmin) {
        if (currentTab.startsWith('admin_') || currentTab.startsWith('pro_') || currentTab.startsWith('partner_') || ['landing', 'bookings', 'wallet', 'profile', 'home', 'categories', 'franchise'].includes(currentTab)) {
          // Valid view for admin
          localStorage.setItem('hardinkaam_current_tab', currentTab);
        } else {
          if (currentTab !== 'admin_dashboard') {
            setCurrentTab('admin_dashboard');
            window.location.hash = '#admin_dashboard';
            localStorage.setItem('hardinkaam_current_tab', 'admin_dashboard');
          }
        }
      } else if (userProfile?.role === 'service_man') {
        if (currentTab.startsWith('pro_') || currentTab === 'profile') {
          // Maintain active sub-tab (e.g. pro_wallet, pro_kyc, pro_dashboard)
          localStorage.setItem('hardinkaam_current_tab', currentTab);
        } else {
          if (currentTab !== 'pro_dashboard') {
            setCurrentTab('pro_dashboard');
            window.location.hash = '#pro_dashboard';
            localStorage.setItem('hardinkaam_current_tab', 'pro_dashboard');
          }
        }
      } else if (userProfile?.role === 'business_partner') {
        if (currentTab.startsWith('partner_') || currentTab === 'profile') {
          localStorage.setItem('hardinkaam_current_tab', currentTab);
        } else {
          if (currentTab !== 'partner_dashboard') {
            setCurrentTab('partner_dashboard');
            window.location.hash = '#partner_dashboard';
            localStorage.setItem('hardinkaam_current_tab', 'partner_dashboard');
          }
        }
      } else if (userProfile?.role === 'customer') {
        if (currentTab.startsWith('admin_') || currentTab.startsWith('pro_') || currentTab.startsWith('partner_')) {
          if (currentTab !== 'landing') {
            setCurrentTab('landing');
            window.location.hash = '#landing';
            localStorage.setItem('hardinkaam_current_tab', 'landing');
          }
        }
      }
    } else {
      // Unauthenticated state
      if (currentTab.startsWith('admin_') || currentTab.startsWith('pro_') || currentTab.startsWith('partner_') || ['bookings', 'wallet', 'profile'].includes(currentTab)) {
        sessionStorage.setItem('hardinkaam_auth_redirect_target', currentTab);
        if (currentTab !== 'landing') {
          setCurrentTab('landing');
          window.location.hash = '#landing';
          localStorage.setItem('hardinkaam_current_tab', 'landing');
        }
      }
    }
  }, [currentUser, userProfile?.role, isAdmin, currentTab, loading]);

  // Firestore Data Collections with instant local cache hydration
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const cached = localStorage.getItem('hdk_cached_categories');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_CATEGORIES;
  });

  const [services, setServices] = useState<Service[]>(() => {
    try {
      const cached = localStorage.getItem('hdk_cached_services');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_SERVICES;
  });

  const [serviceMen, setServiceMen] = useState<ServiceMan[]>(() => {
    try {
      const cached = localStorage.getItem('hdk_cached_pros');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return INITIAL_SERVICE_MEN;
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // Initial Seed & Listeners
  useEffect(() => {
    // 0. Initialize Offline Booking Synchronization queue & navigator.onLine event listeners
    const cleanupOffline = offlineBookingSyncService.initOfflineSyncListeners();

    if (isResourceExhausted()) {
      return () => cleanupOffline();
    }

    // 1. Ensure Firestore has initial categories, services & pros (debounced & safe for Super Admin only)
    if (auth.currentUser && isAdmin) {
      ensureDatabaseSeeded().catch((err) => {
        console.warn('Seed sync notice:', err);
        checkAndHandleQuotaError(err);
      });
    }

    // 2. One-time bounded Categories fetch with local cache (eliminates continuous read drain)
    const loadCategories = async () => {
      if (isResourceExhausted()) return;
      try {
        const snap = await getDocs(query(collection(db, 'categories'), limit(100)));
        const list: Category[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Category));
        list.sort((a, b) => a.order - b.order);
        if (list.length > 0) {
          setCategories(list);
          try { localStorage.setItem('hdk_cached_categories', JSON.stringify(list)); } catch (_) {}
        }
      } catch (err) {
        console.warn('Categories load notice:', err);
        checkAndHandleQuotaError(err);
      }
    };

    // 3. One-time bounded Services fetch with local cache
    const loadServices = async () => {
      if (isResourceExhausted()) return;
      try {
        const snap = await getDocs(query(collection(db, 'services'), limit(100)));
        const list: Service[] = [];
        snap.forEach((d) => {
          const raw = d.data() as any;
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
            id: d.id,
            rating,
            ratingCount,
          } as Service);
        });
        if (list.length > 0) {
          setServices(list);
          try { localStorage.setItem('hdk_cached_services', JSON.stringify(list)); } catch (_) {}
        }
      } catch (err) {
        console.warn('Services load notice:', err);
        checkAndHandleQuotaError(err);
      }
    };

    // 4. One-time bounded Service Men fetch with local cache and privacy protection
    const loadPros = async () => {
      if (isResourceExhausted()) return;
      try {
        const snap = await getDocs(query(collection(db, 'service_men'), limit(50)));
        const list: ServiceMan[] = [];
        snap.forEach((d) => {
          const raw = d.data() as any;
          // Protect privacy in public technician catalog: omit private phone, email, KYC, and financial info
          list.push({
            id: d.id,
            name: raw.name || 'HARDINKAAM Professional',
            photoUrl: raw.photoUrl || raw.avatar || '/1788786363389.png',
            categoryIds: Array.isArray(raw.categoryIds) ? raw.categoryIds : ['cat_electrician'],
            categoryNames: Array.isArray(raw.categoryNames) ? raw.categoryNames : ['Electrician'],
            experienceYears: typeof raw.experienceYears === 'number' ? raw.experienceYears : 2,
            hourlyRate: typeof raw.hourlyRate === 'number' ? raw.hourlyRate : 250,
            rating: typeof raw.rating === 'number' ? raw.rating : 4.9,
            totalJobs: typeof raw.totalJobs === 'number' ? raw.totalJobs : 12,
            isAvailable: raw.isAvailable !== false,
            isVerified: Boolean(raw.isVerified),
            serviceArea: raw.serviceArea || 'Bhopal City',
            city: raw.city || 'Bhopal',
          } as ServiceMan);
        });
        if (list.length > 0) {
          setServiceMen(list);
          try { localStorage.setItem('hdk_cached_pros', JSON.stringify(list)); } catch (_) {}
        }
      } catch (err) {
        console.warn('Service pros load notice:', err);
        checkAndHandleQuotaError(err);
      }
    };

    loadCategories();
    loadServices();
    loadPros();

    return () => {
      cleanupOffline();
    };
  }, [isAdmin]);

  // 5. Role-Scoped Real-time Bookings listener (adhering strictly to Firestore rules)
  useEffect(() => {
    if (isResourceExhausted()) {
      setBookings([]);
      return;
    }

    let q: any;

    if (activeRole === 'admin') {
      if (!auth.currentUser || !currentUser || !isAdmin) {
        setBookings([]);
        return;
      }
      // Spark Quota Optimization: Cap admin listener to latest 100 bookings instead of scanning entire collection
      q = query(collection(db, 'bookings'), limit(100));
    } else if (currentUser && auth.currentUser) {
      if (activeRole === 'service_man') {
        q = query(collection(db, 'bookings'), where('serviceManId', '==', currentUser.uid), limit(50));
      } else if (activeRole === 'business_partner') {
        q = query(collection(db, 'bookings'), where('partnerId', '==', currentUser.uid), limit(50));
      } else {
        q = query(collection(db, 'bookings'), where('customerId', '==', currentUser.uid), limit(50));
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
              // Trigger when booking status changes to 'completed' or 'work_completed'
              else if ((newStatus === 'completed' || newStatus === 'work_completed') && !b.isReviewed) {
                // Check if customer already submitted or dismissed prompt
                if (!feedbackService.hasHandledFeedback(b.id)) {
                  // Brief 700ms delay for smooth post-service celebration UI
                  setTimeout(() => {
                    setFeedbackBooking(b);
                  }, 700);

                  addToast({
                    type: 'success',
                    title: `Service Completed! 🎉`,
                    description: `Your ${b.serviceName} service is finished. Please take a moment to rate your experience and leave comments.`,
                    bookingId: b.id,
                    serviceName: b.serviceName,
                    proName: b.serviceManName,
                  });
                }
              }
            }
          });
        }

        // Update tracking map
        list.forEach((b) => prevBookingStatusesRef.current.set(b.id, b.status));
        isInitialBookingsLoadRef.current = false;

        setBookings(list);
      },
      (err: any) => {
        console.warn('Bookings listener notice:', err.message);
        checkAndHandleQuotaError(err);
      }
    );

    return () => unsubBookings();
  }, [currentUser, activeRole]);

  // Set default tab when switching roles or logging in
  useEffect(() => {
    if (activeRole === 'customer') {
      if (currentTab.startsWith('pro_') || currentTab.startsWith('partner_') || currentTab.startsWith('admin_')) {
        setCurrentTab('customer_dashboard');
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

  // Automatic dashboard redirection when user logs in
  const prevLoggedInRef = React.useRef<boolean>(Boolean(currentUser || userProfile));
  useEffect(() => {
    const isNowLoggedIn = Boolean(currentUser || userProfile);
    if (isNowLoggedIn && !prevLoggedInRef.current) {
      if (currentTab === 'landing' || currentTab === 'home') {
        if (isAdmin || activeRole === 'admin') {
          handleSelectTab('admin_dashboard');
        } else if (activeRole === 'service_man') {
          handleSelectTab('pro_dashboard');
        } else if (activeRole === 'business_partner') {
          handleSelectTab('partner_dashboard');
        } else if (activeRole === 'franchise_admin') {
          setCurrentTab('franchise');
        } else {
          handleSelectTab('customer_dashboard');
        }
      }
    }
    prevLoggedInRef.current = isNowLoggedIn;
  }, [currentUser, userProfile, activeRole, isAdmin]);

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

      {/* Firestore Quota Exceeded Safety Banner */}
      <SparkQuotaExhaustedBanner />

      {/* Pending Synchronization Queue Offline Banner & Modal */}
      <PendingSyncBanner />

      {/* Main Navigation Bar */}
      {currentTab !== 'landing' && (
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
          onOpenCare={handleOpenCare}
          onOpenRfq={handleOpenRfq}
          onOpenAmc={handleOpenAmc}
        />
      )}

      {/* Main Page Content */}
      <main className={`flex-1 w-full ${currentTab === 'landing' ? 'p-0 m-0' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-28 md:pb-16'} animate-entry`}>
        <React.Suspense fallback={<LazyFallback />}>
          {/* ================= PASSWORD RESET PAGE (OFFICIAL FIREBASE AUTH ACTION HANDLER) ================= */}
        {currentTab === 'reset_password' && (
          <PasswordResetPage
            onNavigateToLogin={() => {
              setCurrentTab('landing');
              handleOpenAuth('customer', 'in');
            }}
          />
        )}

        {/* ================= PUBLIC BLOG & NEWS VIEW ================= */}
        {currentTab !== 'reset_password' && (currentTab === 'blog' || currentTab === 'news') && (
          <PublicBlogView onBackToHome={() => setCurrentTab('home')} />
        )}

        {/* ================= ALL-INDIA FRANCHISE PORTAL VIEW ================= */}
        {currentTab !== 'reset_password' && (currentTab === 'franchise' || currentTab === 'district_admin' || currentTab === 'franchise_portal' || activeRole === 'franchise_admin') && (
          <FranchisePortal onBackToHome={() => setCurrentTab('home')} />
        )}

        {/* ================= CUSTOMER VIEWS ================= */}
        {currentTab !== 'reset_password' && currentTab !== 'franchise' && currentTab !== 'district_admin' && currentTab !== 'franchise_portal' && activeRole !== 'franchise_admin' && !currentTab.startsWith('admin_') && !currentTab.startsWith('pro_') && !currentTab.startsWith('partner_') && activeRole === 'customer' && (
          <>
            {currentTab === 'landing' && (
              <HardinkaamLandingPage
                onEnterApp={() => handleSelectTab('home')}
                onOpenBooking={handleLandingOpenBooking}
                onOpenDashboard={handleLandingDashboard}
                onOpenAuth={(role, mode) => handleOpenAuth(role as UserRole, mode)}
                onOpenFranchise={() => setCurrentTab('franchise')}
                onOpenCare={handleOpenCare}
                onOpenRfq={handleOpenRfq}
                onOpenAmc={handleOpenAmc}
                onOpenWfh={() => handleSelectTab('work_from_home')}
                onOpenJobs={() => handleSelectTab('jobs')}
              />
            )}

            {currentTab === 'customer_dashboard' && (
              <CustomerDashboard
                bookings={bookings}
                services={services}
                categories={categories}
                onSelectTab={handleSelectTab}
                onBookService={handleBookService}
                onOpenHelp={() => setIsHelpModalOpen(true)}
                onOpenCare={handleOpenCare}
                onOpenRfq={handleOpenRfq}
                onOpenAmc={handleOpenAmc}
              />
            )}

            {(currentTab === 'home' || currentTab === 'categories') && (
              <CustomerHome
                categories={categories}
                services={services}
                serviceMen={serviceMen}
                bookings={bookings}
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
                onOpenCare={handleOpenCare}
                onOpenRfq={handleOpenRfq}
                onOpenAmc={handleOpenAmc}
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

            {currentTab === 'work_from_home' && (
              <WorkFromHomeHub onOpenAuth={handleOpenAuth} onSelectTab={handleSelectTab} />
            )}

            {currentTab === 'jobs' && (
              <JobPortalView onOpenAuth={handleOpenAuth} onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'passport' || currentTab === 'home_passport') && (
              <HomePassportView
                onOpenBookService={(cat) => {
                  const matched = services.find((s) => s.categoryName === cat || s.name === cat) || services[0];
                  if (matched) handleBookService(matched);
                }}
              />
            )}

            {(currentTab === 'family' || currentTab === 'family_care') && (
              <FamilyCareView
                onBookForHousehold={() => {
                  if (services.length > 0) handleBookService(services[0]);
                }}
              />
            )}

            {(currentTab === 'business' || currentTab === 'business_care' || currentTab === 'society') && (
              <BusinessCarePortal />
            )}
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

            {(currentTab === 'pro_academy' || currentTab === 'skill_academy') && (
              <SkillAcademyView />
            )}

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

        {/* ================= BRAND PROMOTER VIEWS ================= */}
        {activeRole === 'brand_promoter' && !currentTab.startsWith('admin_') && (
          <>
            <BrandPromoterDashboard onOpenWallet={() => {}} />
          </>
        )}

        {/* ================= ADMIN VIEWS (STRICT ZERO-LEAK ACCESS GUARD) ================= */}
        {(activeRole === 'admin' || currentTab.startsWith('admin_')) && (
          <AdminRouteGuard
            onBackToHome={() => handleSelectTab('landing')}
            onOpenAdminLogin={() => handleOpenAuth('admin')}
          >
            {currentTab === 'admin_dashboard' && (
              <AdminDashboard
                bookings={bookings}
                services={services}
                categories={categories}
                serviceMen={serviceMen}
                onSelectTab={handleSelectTab}
                onOpenZeroDataModal={() => setIsZeroDataModalOpen(true)}
              />
            )}

            {currentTab === 'admin_super_center' && (
              <AdminSuperCenter
                bookings={bookings}
                serviceMen={serviceMen}
                categories={categories}
                services={services}
                onSelectTab={handleSelectTab}
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

            {(currentTab === 'admin_payment_test' || currentTab === 'admin_razorpay_audit' || currentTab === 'admin_payment_audit') && (
              <AdminRazorpayTestPanel />
            )}

            {currentTab === 'admin_tax' && (
              <AdminTaxEngineManager onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'admin_financial_profit' || currentTab === 'admin_profit' || currentTab === 'admin_commissions' || currentTab === 'admin_accounting') && (
              <AdminFinancialProfitDashboard onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'admin_financial_ledger' || currentTab === 'admin_ledger' || currentTab === 'admin_transactions') && (
              <AdminFinancialLedger onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'admin_documents' || currentTab === 'admin_refunds') && (
              <AdminDocumentsAndRefunds bookings={bookings} onSelectTab={handleSelectTab} />
            )}

            {currentTab === 'admin_rfq' && <AdminRfqManager />}

            {currentTab === 'admin_care_amc' && <AdminCareAndAmcManager />}

            {(currentTab === 'admin_experience_growth' ||
              currentTab === 'admin_growth' ||
              currentTab === 'admin_service_experience' ||
              currentTab === 'admin_guarantees') && (
              <AdminServiceExperienceCenter />
            )}

            {currentTab === 'admin_bi' && <AdminBusinessIntelligenceDashboard bookings={bookings} onSelectTab={handleSelectTab} />}

            {(currentTab === 'admin_marketing_agent' || currentTab === 'admin_marketing') && (
              <AdminMarketingAgent onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'admin_marketing_leads' || currentTab === 'admin_leads') && (
              <AdminMarketingLeadsManager onNavigateToPros={() => handleSelectTab('admin_service_men')} />
            )}

            {(currentTab === 'admin_ai_calling' ||
              currentTab === 'admin_calling' ||
              currentTab === 'admin_voice_agent' ||
              currentTab === 'admin_ai_calling_overview' ||
              currentTab === 'admin_ai_calling_campaigns' ||
              currentTab === 'admin_ai_calling_queue' ||
              currentTab === 'admin_ai_calling_scripts' ||
              currentTab === 'admin_ai_calling_logs') && (
              <AdminAICallingAgent
                initialSubTab={
                  currentTab === 'admin_ai_calling_campaigns'
                    ? 'campaigns'
                    : currentTab === 'admin_ai_calling_queue'
                    ? 'queue'
                    : currentTab === 'admin_ai_calling_scripts'
                    ? 'scripts'
                    : currentTab === 'admin_ai_calling_logs'
                    ? 'logs'
                    : 'overview'
                }
                onSelectTab={handleSelectTab}
                onNavigateToLeads={() => handleSelectTab('admin_marketing_leads')}
              />
            )}

            {currentTab === 'admin_ad_studio' && (
              <AdminMarketingAgent onSelectTab={handleSelectTab} initialView="campaign" />
            )}

            {(currentTab === 'admin_analytics' || currentTab === 'admin_visitor_report' || currentTab === 'admin_admob_report') && (
              <AdminMarketingAnalyticsDashboard
                onSelectTab={handleSelectTab}
                onNavigateToCampaignWithCity={() => {
                  handleSelectTab('admin_ad_studio');
                }}
              />
            )}

            {(currentTab === 'admin_page_builder' || currentTab === 'admin_page_customizer' || currentTab === 'admin_cms') && (
              <AdminPageCustomizer onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'admin_broadcast' || currentTab === 'admin_announcements') && (
              <AdminBroadcastNoticeManager onSelectTab={handleSelectTab} />
            )}

            {(currentTab === 'admin_inbox_outbox' || currentTab === 'admin_inbox' || currentTab === 'admin_outbox' || currentTab === 'admin_requests') && (
              <AdminRequestsInboxOutbox onSelectTab={handleSelectTab} />
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

            {currentTab === 'admin_image_cache' && (
              <AdminImageCacheManager />
            )}

            {currentTab === 'admin_media_repository' && (
              <AdminMediaRepository />
            )}

            {currentTab === 'admin_video_studio' && (
              <AdminAIVideoStudio />
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

            {(currentTab === 'admin_knowledge' || currentTab === 'admin_knowledge_manager') && (
              <AdminKnowledgeManager />
            )}

            {(currentTab === 'admin_referral_analytics' || currentTab === 'admin_referrals') && (
              <AdminReferralAnalytics onSelectTab={handleSelectTab} />
            )}
            {(currentTab === 'admin_work_from' || currentTab === 'admin_wfh') && (
              <AdminWorkFromManager onBack={() => handleSelectTab('admin_dashboard')} />
            )}
            {currentTab === 'admin_task_review' && <AdminTaskReviewCenter />}
            {currentTab === 'admin_task_payouts' && <AdminTaskPayoutsManager />}
            {currentTab === 'admin_jobs' && (
              <AdminJobManager onBack={() => handleSelectTab('admin_dashboard')} />
            )}
            {currentTab === 'admin_social_networks' && <AdminSocialNetworksManager />}
            {currentTab === 'admin_control_room' && (
              <AdminHardinkaamControlRoom
                bookings={bookings}
                serviceMen={serviceMen}
                services={services}
                categories={categories}
                onSelectTab={handleSelectTab}
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

            {(currentTab === 'admin_ai_funnel' || currentTab === 'admin_funnel') && (
              <AdminAiFunnelAutomation
                users={[]}
                serviceMen={serviceMen}
                bookings={bookings}
              />
            )}

            {(currentTab === 'admin_kaamdost_control' || currentTab === 'admin_kaamdost') && (
              <AdminKaamDostControlPanel onSelectTab={handleSelectTab} />
            )}

            {currentTab === 'profile' && <UserProfileView />}
          </AdminRouteGuard>
        )}
        </React.Suspense>

        <PagePaginationBar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isAdmin={isAdmin}
          activeRole={activeRole}
        />
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

      {/* Lazy Modals, KaamDost Assistant, and Sub-flows */}
      <React.Suspense fallback={null}>
        {/* Service Detail Modal */}
        {selectedServiceForDetail && (
          <ServiceDetailModal
            service={selectedServiceForDetail}
            onClose={() => setSelectedServiceForDetail(null)}
            onBookDirect={(srv) => {
              setSelectedServiceForDetail(null);
              handleBookService(srv);
            }}
          />
        )}

        {/* Bhopal Locality Modal */}
        {isLocalityModalOpen && (
          <BhopalLocalityModal
            isOpen={isLocalityModalOpen}
            onClose={() => setIsLocalityModalOpen(false)}
            selectedLocality={selectedLocality}
            onSelectLocality={(loc) => setSelectedLocality(loc)}
          />
        )}

        {/* Customer 24x7 Help Modal */}
        {isHelpModalOpen && (
          <CustomerHelpModal
            isOpen={isHelpModalOpen}
            onClose={() => setIsHelpModalOpen(false)}
          />
        )}

        {/* Persistent 24x7 Support Floating Action Button (6267546945 Dialer & WhatsApp) */}
        <SupportFloatingButton />

        {/* KaamDost AI Conversational Assistant */}
        <KaamDostAssistant
          onSelectTab={handleSelectTab}
          onBookService={(srv) => handleBookService(srv)}
          onOpenAuth={(role) => handleOpenAuth(role || 'customer')}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          services={services}
          categories={categories}
          serviceMen={serviceMen}
          bookings={bookings}
          isLoggedIn={Boolean(currentUser || userProfile)}
          userName={userProfile?.name || currentUser?.displayName || undefined}
          userProfile={userProfile}
          userId={currentUser?.uid}
          onRegisterCustomer={registerConversationalCustomer}
        />

        {/* Google Play Store & Android APK Builder Modal */}
        {isPlayStoreApkModalOpen && (
          <PlayStoreApkModal
            isOpen={isPlayStoreApkModalOpen}
            onClose={() => setIsPlayStoreApkModalOpen(false)}
          />
        )}

        {/* Booking Flow Modal */}
        {Boolean(bookingService) && (
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
        )}

        {/* Professional Profile Modal */}
        {selectedProForProfile && (
          <ProfessionalProfileModal
            pro={selectedProForProfile}
            onClose={() => setSelectedProForProfile(null)}
            services={services}
            onBookPro={(srv, pro) => handleBookService(srv, pro)}
          />
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(resolvedRole) => {
            setIsAuthOpen(false);
            if (resolvedRole === 'admin' || isAdmin) {
              handleSelectTab('admin_dashboard');
            } else if (resolvedRole === 'service_man') {
              handleSelectTab('pro_dashboard');
            } else if (resolvedRole === 'business_partner') {
              handleSelectTab('partner_dashboard');
            } else if (resolvedRole === 'franchise_admin') {
              handleSelectTab('franchise');
            } else {
              handleSelectTab('customer_dashboard');
            }
          }}
          defaultRole={authModalRole}
          defaultMode={authModalMode}
        />

        {/* Admin Zero Dynamic Data Modal */}
        {isZeroDataModalOpen && (
          <AdminZeroDataModal
            isOpen={isZeroDataModalOpen}
            onClose={() => setIsZeroDataModalOpen(false)}
            onZeroCompleted={() => {
              setBookings([]);
              addToast('सभी डायनेमिक रिकॉर्ड्स (बुकिंग, लेनदेन, चैट्स) सफलतापूर्वक 0 कर दिए गए हैं।', 'success');
            }}
          />
        )}

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

        {/* Post-Service Feedback Collection Modal */}
        {feedbackBooking && (
          <PostServiceFeedbackModal
            isOpen={Boolean(feedbackBooking)}
            booking={feedbackBooking}
            onClose={() => setFeedbackBooking(null)}
            onSubmitted={() => {
              setFeedbackBooking(null);
              addToast({
                type: 'success',
                title: 'Feedback Submitted!',
                description: 'Thank you for your rating and review. It helps our professionals improve!',
              });
            }}
          />
        )}

        {/* Customer Live Reward Points Earned Animation Modal */}
        {rewardEarnModal && (
          <RewardEarnAnimation
            isOpen={rewardEarnModal.isOpen}
            points={rewardEarnModal.points}
            type={rewardEarnModal.type}
            transactionId={rewardEarnModal.transactionId}
            prevBalance={rewardEarnModal.prevBalance}
            newBalance={rewardEarnModal.newBalance}
            message={rewardEarnModal.message}
            onComplete={() => setRewardEarnModal(null)}
          />
        )}

        {/* Hardinkaam 7-Day Care, Protection Policies & Grievance Tickets */}
        {isCareDashboardOpen && (
          <HardinkaamCareDashboard
            isOpen={isCareDashboardOpen}
            bookingId={careTargetBookingId}
            onClose={() => {
              setIsCareDashboardOpen(false);
              setCareTargetBookingId(undefined);
            }}
          />
        )}

        {/* RFQ / Multiple Professional Quotes Bidding Modal */}
        {isRfqModalOpen && (
          <GetMultipleQuotesModal
            isOpen={isRfqModalOpen}
            onClose={() => setIsRfqModalOpen(false)}
          />
        )}

        {/* Annual Maintenance Contracts (AMC) & VIP Membership Catalog Modal */}
        {isAmcModalOpen && (
          <AmcCatalogModal
            isOpen={isAmcModalOpen}
            onClose={() => setIsAmcModalOpen(false)}
          />
        )}
      </React.Suspense>

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}

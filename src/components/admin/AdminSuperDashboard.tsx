import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  FileArchive,
  ShieldCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  ArrowUpRight,
  MapPin,
  RefreshCw,
  Sparkles,
  Sliders,
  Eye,
  Lock,
  PauseCircle,
  PlayCircle,
  XCircle,
  FileText,
  Clock,
  Ban,
  Palette,
} from 'lucide-react';
import { Booking, Service, ServiceMan, FranchisePartner, FranchiseAgreementRecord } from '../../types';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import {
  subscribeAllFranchisePartners,
  updateFranchiseStatus,
} from '../../services/franchisePartnerService';
import { subscribeAllFranchiseAgreements } from '../../services/franchiseKycService';
import { DistrictZipUploadModal } from './DistrictZipUploadModal';
import { DistrictActivationModal } from './DistrictActivationModal';
import { DistrictSettingsModal } from './DistrictSettingsModal';
import { AdminFranchiseKYCSettingsModal } from './AdminFranchiseKYCSettingsModal';
import { AdminFranchiseKYCVerification } from './AdminFranchiseKYCVerification';
import { AdminAgreementHistory } from './AdminAgreementHistory';
import { AdminRealtimeNotificationCenter } from './AdminRealtimeNotificationCenter';
import { AdminUniversalSearchModal } from './AdminUniversalSearchModal';
import { logAuditEvent } from '../../services/auditService';
import { auth, db } from '../../firebase/config';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, limit } from 'firebase/firestore';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';

interface Props {
  bookings?: Booking[];
  services?: Service[];
  serviceMen?: ServiceMan[];
  onNavigateTab?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
}

export const AdminSuperDashboard: React.FC<Props> = ({
  bookings = [],
  services = [],
  serviceMen = [],
  onNavigateTab,
  onSelectTab,
}) => {
  const handleNav = (tab: string) => {
    if (onSelectTab) onSelectTab(tab);
    else if (onNavigateTab) onNavigateTab(tab);
  };
  const [activeSubView, setActiveSubView] = useState<'overview' | 'kyc_verification' | 'agreement_history'>('overview');
  const [partners, setPartners] = useState<FranchisePartner[]>([]);
  const [agreements, setAgreements] = useState<FranchiseAgreementRecord[]>([]);
  const [agreementFilterToOpen, setAgreementFilterToOpen] = useState<string>('ALL');
  const [cityRecords, setCityRecords] = useState<Record<string, any>>({});
  const [searchDistrict, setSearchDistrict] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [filterState, setFilterState] = useState<string>('all');

  // Modals state
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isKycSettingsModalOpen, setIsKycSettingsModalOpen] = useState(false);
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [targetDistrictForSettings, setTargetDistrictForSettings] = useState({ id: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh' });
  const [targetDistrictForZip, setTargetDistrictForZip] = useState({ id: 'gwalior', name: 'Gwalior' });
  const [preselectedDistrictForActivation, setPreselectedDistrictForActivation] = useState({
    district: 'Gwalior',
    state: 'Madhya Pradesh',
  });

  // Real-time Partners & Cities subscription (bounded & quota-guarded)
  useEffect(() => {
    if (isResourceExhausted()) return;

    const unsubPartners = subscribeAllFranchisePartners((list) => {
      setPartners(list);
    });

    // Subscribe to franchise_cities (bounded)
    const unsubCities = onSnapshot(
      query(collection(db, 'franchise_cities'), limit(50)),
      (snap) => {
        const map: Record<string, any> = {};
        snap.forEach((d) => {
          map[d.id.toLowerCase()] = d.data();
        });
        setCityRecords(map);
      },
      (err) => {
        console.warn('Franchise cities listener notice:', err.message);
        checkAndHandleQuotaError(err);
      }
    );

    // Subscribe to franchise_agreements (bounded)
    const unsubAgreements = subscribeAllFranchiseAgreements((list) => {
      setAgreements(list);
    });

    return () => {
      unsubPartners();
      unsubCities();
      unsubAgreements();
    };
  }, []);

  // Computed summary counts for Franchise Agreements for Super Admin
  const agreementSummaryCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: FranchiseAgreementRecord[] = [...agreements];
    const existingPartnerIds = new Set(list.map((a) => a.franchisePartnerId));
    partners.forEach((p) => {
      if (!existingPartnerIds.has(p.id)) {
        list.push({
          id: `partner_agr_${p.id}`,
          franchisePartnerId: p.id,
          franchiseCode: p.franchiseCode,
          districtId: p.assignedDistrictId,
          districtName: p.assignedDistrictName,
          status: p.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
          termsAccepted: true,
          approvedAt: p.createdAt || new Date().toISOString(),
          createdAt: p.createdAt || new Date().toISOString(),
        } as FranchiseAgreementRecord);
      }
    });

    let total = 0;
    let active = 0;
    let pendingApproval = 0;
    let renewalDue = 0;
    let expired = 0;
    let terminated = 0;
    let rejected = 0;

    list.forEach((agr) => {
      total++;
      const endDate = agr.endDate ? new Date(agr.endDate) : null;
      if (endDate) endDate.setHours(0, 0, 0, 0);
      const diffDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      const isApproved = agr.status === 'APPROVED' || agr.status === 'ACTIVE' || Boolean(agr.approvedAt);

      if (
        agr.status === 'TERMINATED' ||
        agr.status === 'NOTICE_ISSUED' ||
        agr.status === 'TERMINATION_PENDING'
      ) {
        terminated++;
      } else if (agr.status === 'REJECTED') {
        rejected++;
      } else if (agr.status === 'EXPIRED' || (endDate && diffDays < 0)) {
        expired++;
      } else if (
        diffDays >= 0 &&
        diffDays <= 30 &&
        (agr.status === 'ACTIVE' || agr.status === 'COMPLETED' || isApproved)
      ) {
        renewalDue++;
        if (agr.status === 'ACTIVE' || agr.status === 'COMPLETED') {
          active++;
        }
      } else if (agr.status === 'ACTIVE' || (agr.status === 'COMPLETED' && diffDays >= 0)) {
        active++;
      } else if (
        agr.status === 'PENDING' ||
        agr.status === 'SUBMITTED' ||
        agr.status === 'ACCEPTED' ||
        (!agr.approvedAt && agr.status !== 'CANCELLED')
      ) {
        pendingApproval++;
      }
    });

    return {
      total,
      active,
      pendingApproval,
      renewalDue,
      expired,
      terminated,
      rejected,
    };
  }, [agreements, partners]);

  const handleOpenAgreementHistoryWithFilter = (statusKey: string) => {
    setAgreementFilterToOpen(statusKey);
    setActiveSubView('agreement_history');
  };

  // Compile full districts inventory across India
  const allDistrictsInventory = useMemo(() => {
    const list: Array<{
      district: string;
      hindiDistrict: string;
      state: string;
      hindiState: string;
      status: 'active' | 'inactive' | 'suspended';
      assignedPartner?: FranchisePartner;
      lastAssetImport?: string;
    }> = [];

    ALL_INDIA_LOCATIONS.forEach((s) => {
      s.districts.forEach((d) => {
        const dLower = d.district.toLowerCase();
        const cityData = cityRecords[dLower];
        const partner = partners.find(
          (p) => p.assignedDistrictId.toLowerCase() === dLower || p.assignedDistrictName.toLowerCase() === dLower
        );

        let status: 'active' | 'inactive' | 'suspended' = 'inactive';
        if (dLower === 'bhopal') {
          status = 'active'; // Bhopal is permanent headquarters
        } else if (partner) {
          if (partner.status === 'ACTIVE') status = 'active';
          else if (partner.status === 'SUSPENDED') status = 'suspended';
          else status = 'inactive';
        } else if (cityData?.status) {
          status = cityData.status;
        }

        list.push({
          district: d.district,
          hindiDistrict: d.hindiDistrict,
          state: s.state,
          hindiState: s.hindiState,
          status,
          assignedPartner: partner,
          lastAssetImport: cityData?.lastAssetImport,
        });
      });
    });

    return list;
  }, [partners, cityRecords]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalDistricts = allDistrictsInventory.length;
    const activeDistricts = allDistrictsInventory.filter((d) => d.status === 'active').length;
    const inactiveDistricts = allDistrictsInventory.filter((d) => d.status === 'inactive').length;
    const suspendedDistricts = allDistrictsInventory.filter((d) => d.status === 'suspended').length;

    const totalPartners = partners.length;
    const activePartners = partners.filter((p) => p.status === 'ACTIVE').length;

    const totalPros = serviceMen.length;
    const verifiedPros = serviceMen.filter((s) => s.isVerified).length;

    // Unique customers calculation
    const totalCustomers = new Set(bookings.map((b) => b.customerPhone || b.customerId)).size || 142;

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === 'completed');

    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.amount || 0), 0) || 48500;
    const platformCommission = Math.round(totalRevenue * 0.15);
    const franchiseProfit = Math.round(totalRevenue * 0.85);

    return {
      totalDistricts,
      activeDistricts,
      inactiveDistricts,
      suspendedDistricts,
      totalPartners,
      activePartners,
      totalPros,
      verifiedPros,
      totalCustomers,
      totalBookings,
      totalRevenue,
      platformCommission,
      franchiseProfit,
    };
  }, [allDistrictsInventory, partners, serviceMen, bookings]);

  // Filtered districts for table
  const filteredDistricts = useMemo(() => {
    return allDistrictsInventory.filter((item) => {
      if (filterState !== 'all' && item.state !== filterState) return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (searchDistrict.trim()) {
        const q = searchDistrict.toLowerCase();
        const match =
          item.district.toLowerCase().includes(q) ||
          item.hindiDistrict.toLowerCase().includes(q) ||
          item.state.toLowerCase().includes(q) ||
          item.assignedPartner?.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allDistrictsInventory, filterState, filterStatus, searchDistrict]);

  const handleToggleDistrictStatus = async (district: string, currentStatus: string) => {
    const dLower = district.toLowerCase();
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const partner = partners.find(
      (p) => p.assignedDistrictId.toLowerCase() === dLower || p.assignedDistrictName.toLowerCase() === dLower
    );

    try {
      if (partner) {
        await updateFranchiseStatus(partner.franchisePartnerId, newStatus === 'active' ? 'ACTIVE' : 'SUSPENDED');
      }

      await setDoc(
        doc(db, 'franchise_cities', dLower),
        {
          district,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const currentUser = auth.currentUser;
      await logAuditEvent({
        action: newStatus === 'active' ? 'DISTRICT_ACTIVATION' : 'DISTRICT_DEACTIVATION',
        actorId: currentUser?.uid || 'SUPER_ADMIN',
        actorEmail: currentUser?.email || 'admin@hardinkaam.in',
        targetDistrictId: dLower,
        targetDistrictName: district,
        details: `Changed status of district ${district} to ${newStatus.toUpperCase()}`,
      });
    } catch (err) {
      console.error('Failed to toggle district status:', err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Real-time Administrative Notification Center & Ticker */}
      <AdminRealtimeNotificationCenter
        onNavigateToTab={(tab, subView) => {
          if (subView === 'agreement_history') {
            setActiveSubView('agreement_history');
          } else if (subView === 'kyc_verification') {
            setActiveSubView('kyc_verification');
          } else {
            setActiveSubView('overview');
          }
        }}
      />

      {/* Super Admin Command Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
              <ShieldCheck className="w-4 h-4" />
              <span>दीपक बिल्डकॉन हेडक्वाटर • सुपर एडमिन मास्टर कंट्रोल (Deepak Buildcon HQ)</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              HARDINKAAM अखिल भारतीय सुपर एडमिन डैशबोर्ड
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1.5 max-w-2xl">
              पूरे भारत के 500+ जिलों का लाइव नेटवर्क नियंत्रण: जिला सक्रियण, सुरक्षित ZIP एसेट आयात, फ्रेंचाइज़ी रॉयल्टी और बहुआयामी वित्तीय रिपोर्ट।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setPreselectedDistrictForActivation({ district: 'Gwalior', state: 'Madhya Pradesh' });
                setIsActivationModalOpen(true);
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ नया जिला सक्रिय करें</span>
            </button>

            <button
              onClick={() => onNavigateTab('admin_page_builder')}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer border border-purple-400"
            >
              <Palette className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>🎨 पेज कस्टमाइज़र</span>
            </button>

            <button
              onClick={() => onNavigateTab('admin_marketing_agent')}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI मार्केटिंग &amp; Maps लीड्स</span>
            </button>

            <button
              onClick={() => setIsKycSettingsModalOpen(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/20"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>KYC सेटिंग्स</span>
            </button>

            <button
              onClick={() => setActiveSubView((prev) => (prev === 'kyc_verification' ? 'overview' : 'kyc_verification'))}
              className={`px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                activeSubView === 'kyc_verification'
                  ? 'bg-amber-500 text-stone-900 border-amber-400 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>{activeSubView === 'kyc_verification' ? '← नेटवर्क डैशबोर्ड' : 'KYC सत्यापन'}</span>
            </button>

            <button
              onClick={() => setActiveSubView((prev) => (prev === 'agreement_history' ? 'overview' : 'agreement_history'))}
              className={`px-4 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer border ${
                activeSubView === 'agreement_history'
                  ? 'bg-amber-500 text-stone-900 border-amber-400 shadow-lg'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{activeSubView === 'agreement_history' ? '← नेटवर्क डैशबोर्ड' : 'Agreement History'}</span>
            </button>

            <button
              onClick={() => {
                setTargetDistrictForZip({ id: 'gwalior', name: 'Gwalior' });
                setIsZipModalOpen(true);
              }}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer border border-white/20"
            >
              <FileArchive className="w-4 h-4 text-orange-400" />
              <span>जिला ZIP</span>
            </button>
          </div>
        </div>
      </div>

      {activeSubView === 'kyc_verification' ? (
        <AdminFranchiseKYCVerification adminName="Super Admin DEEPAK" />
      ) : activeSubView === 'agreement_history' ? (
        <AdminAgreementHistory
          adminName="Super Admin DEEPAK"
          initialStatusFilter={agreementFilterToOpen}
        />
      ) : (
        <>
      {/* Franchise Agreement Summary Section for Super Admin */}
      <div id="superadmin-agreement-summary-hub" className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-stone-950 flex items-center justify-center font-black shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-stone-900 tracking-tight">
                  Franchise Agreement Summary (फ्रेंचाइज़ी अनुबंध सारांश)
                </h3>
                <span className="text-[9px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Super Admin → Franchise Management
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                Click any count below to open the corresponding filtered Agreement History
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAgreementHistoryWithFilter('ALL')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-colors cursor-pointer border border-orange-200 self-start sm:self-auto"
          >
            <span>सभी अनुबंध देखें (View All Agreements)</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-orange-700" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Total Agreements */}
          <button
            type="button"
            id="super-dash-total-agreements"
            onClick={() => handleOpenAgreementHistoryWithFilter('ALL')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-stone-50/70 hover:bg-stone-100/90 border-stone-200 hover:border-stone-400 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 truncate">
                Total Agreements
              </span>
              <FileText className="w-3.5 h-3.5 text-stone-700 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-stone-900">
                {agreementSummaryCounts.total}
              </div>
              <div className="text-[10px] font-semibold text-stone-500 mt-0.5 truncate flex items-center gap-1">
                <span>Open all</span> <ArrowUpRight className="w-2.5 h-2.5 text-stone-400" />
              </div>
            </div>
          </button>

          {/* 2. Active Agreements */}
          <button
            type="button"
            id="super-dash-active-agreements"
            onClick={() => handleOpenAgreementHistoryWithFilter('ACTIVE')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-emerald-50/40 hover:bg-emerald-50/90 border-emerald-200/80 hover:border-emerald-400 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">
                Active Agreements
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-700">
                {agreementSummaryCounts.active}
              </div>
              <div className="text-[10px] font-semibold text-emerald-600 mt-0.5 truncate flex items-center gap-1">
                <span>Filter Active</span> <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" />
              </div>
            </div>
          </button>

          {/* 3. Pending Approval */}
          <button
            type="button"
            id="super-dash-pending-approval"
            onClick={() => handleOpenAgreementHistoryWithFilter('PENDING_APPROVAL')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-amber-50/40 hover:bg-amber-50/90 border-amber-200/80 hover:border-amber-400 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 truncate">
                Pending Approval
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-amber-700">
                {agreementSummaryCounts.pendingApproval}
              </div>
              <div className="text-[10px] font-semibold text-amber-600 mt-0.5 truncate flex items-center gap-1">
                <span>Filter Pending</span> <ArrowUpRight className="w-2.5 h-2.5 text-amber-500" />
              </div>
            </div>
          </button>

          {/* 4. Renewal Due */}
          <button
            type="button"
            id="super-dash-renewal-due"
            onClick={() => handleOpenAgreementHistoryWithFilter('RENEWAL_DUE')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-orange-50/40 hover:bg-orange-50/90 border-orange-200/80 hover:border-orange-400 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 truncate">
                Renewal Due
              </span>
              <RefreshCw className="w-3.5 h-3.5 text-orange-600 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-orange-700">
                {agreementSummaryCounts.renewalDue}
              </div>
              <div className="text-[10px] font-semibold text-orange-600 mt-0.5 truncate flex items-center gap-1">
                <span>Filter Renewal</span> <ArrowUpRight className="w-2.5 h-2.5 text-orange-500" />
              </div>
            </div>
          </button>

          {/* 5. Expired */}
          <button
            type="button"
            id="super-dash-expired"
            onClick={() => handleOpenAgreementHistoryWithFilter('EXPIRED')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-red-50/40 hover:bg-red-50/90 border-red-200/80 hover:border-red-400 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 truncate">
                Expired
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-red-700">
                {agreementSummaryCounts.expired}
              </div>
              <div className="text-[10px] font-semibold text-red-600 mt-0.5 truncate flex items-center gap-1">
                <span>Filter Expired</span> <ArrowUpRight className="w-2.5 h-2.5 text-red-500" />
              </div>
            </div>
          </button>

          {/* 6. Terminated */}
          <button
            type="button"
            id="super-dash-terminated"
            onClick={() => handleOpenAgreementHistoryWithFilter('TERMINATED')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-stone-100/70 hover:bg-stone-200/80 border-stone-300/80 hover:border-stone-500 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 truncate">
                Terminated
              </span>
              <XCircle className="w-3.5 h-3.5 text-stone-700 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-stone-800">
                {agreementSummaryCounts.terminated}
              </div>
              <div className="text-[10px] font-semibold text-stone-600 mt-0.5 truncate flex items-center gap-1">
                <span>Filter Terminated</span> <ArrowUpRight className="w-2.5 h-2.5 text-stone-500" />
              </div>
            </div>
          </button>

          {/* 7. Rejected */}
          <button
            type="button"
            id="super-dash-rejected"
            onClick={() => handleOpenAgreementHistoryWithFilter('REJECTED')}
            className="p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between bg-rose-50/40 hover:bg-rose-50/90 border-rose-200/80 hover:border-rose-400 group hover:shadow-xs"
          >
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 truncate">
                Rejected
              </span>
              <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="text-2xl font-black text-rose-700">
                {agreementSummaryCounts.rejected}
              </div>
              <div className="text-[10px] font-semibold text-rose-600 mt-0.5 truncate flex items-center gap-1">
                <span>Filter Rejected</span> <ArrowUpRight className="w-2.5 h-2.5 text-rose-500" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Districts */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">अखिल भारतीय जिले</span>
            <Building2 className="w-4 h-4 text-stone-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {metrics.totalDistricts}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
              {metrics.activeDistricts} सक्रिय • {metrics.suspendedDistricts} निलंबित
            </div>
          </div>
        </div>

        {/* Franchise Partners */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">फ्रेंचाइज़ी पार्टनर</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {metrics.totalPartners}
            </div>
            <div className="text-[11px] font-bold text-amber-700 mt-0.5">
              {metrics.activePartners} लाइव कार्यरत
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">पंजीकृत ग्राहक</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {metrics.totalCustomers}
            </div>
            <div className="text-[11px] font-bold text-stone-500 mt-0.5">अखिल भारतीय यूज़र्स</div>
          </div>
        </div>

        {/* Service Pros */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">सर्विसमैन टीम</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-stone-900">
              {metrics.totalPros}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
              {metrics.verifiedPros} KYC सत्यापित
            </div>
          </div>
        </div>

        {/* Total GMV Revenue */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">कुल सकल राजस्व (GMV)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              ₹{metrics.totalRevenue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-bold text-stone-500 mt-0.5">
              {metrics.totalBookings} बुकिंग्स से
            </div>
          </div>
        </div>

        {/* Platform Royalty & Commission */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-stone-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">कंपनी रॉयल्टी (15%)</span>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-orange-600">
              ₹{metrics.platformCommission.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-bold text-teal-700 mt-0.5">
              पार्टनर शेयर: ₹{metrics.franchiseProfit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Super Admin Management Shortcuts */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4">
          सुपर एडमिन संपूर्ण नियंत्रण केंद्र (Master Super Admin Control Hub)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-3">
          <button
            onClick={() => setIsUniversalSearchOpen(true)}
            className="p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white flex flex-col items-center text-center gap-2 transition-all cursor-pointer group shadow-md shadow-emerald-950/30 ring-2 ring-emerald-400/40"
            title="डेटाबेस मास्टर सर्च बार - किसी भी ग्राहक, सर्विसमैन या बुकिंग का पूरा विवरण खोजें"
          >
            <Search className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform animate-pulse" />
            <span className="text-xs font-black text-white">मास्टर सर्च</span>
          </button>

          <button
            onClick={() => handleNav('admin_financial_profit')}
            className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 border border-emerald-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
            title="₹121 रजिस्ट्रेशन, कंपनी ग्रॉस/नेट मार्जिन, कमीशन पूल कैपिंग और ऑडिट लेज़र"
          >
            <DollarSign className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform animate-pulse" />
            <span className="text-xs font-black text-emerald-900">वित्तीय लाभ & लेज़र</span>
          </button>

          <button
            onClick={() => handleNav('admin_franchise')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <Building2 className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">जिले व पार्टनर</span>
          </button>

          <button
            onClick={() => setIsZipModalOpen(true)}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <FileArchive className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">ZIP एसेट्स</span>
          </button>

          <button
            onClick={() => handleNav('admin_reports_manager')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">राजस्व रिपोर्ट</span>
          </button>

          <button
            onClick={() => handleNav('admin_bookings')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <TrendingUp className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">बुकिंग्स & डिस्पैच</span>
          </button>

          <button
            onClick={() => handleNav('admin_users')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <Users className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">यूज़र्स & रोल्स</span>
          </button>

          <button
            onClick={() => handleNav('admin_catalog')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <Sliders className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">सेवा कैटलॉग</span>
          </button>

          <button
            onClick={() => handleNav('admin_settings')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-amber-50 hover:border-amber-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <Settings className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">सिस्टम व AdMob</span>
          </button>

          <button
            onClick={() => handleNav('admin_marketing_agent')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-orange-50 hover:border-orange-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <Sparkles className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">AI मार्केटिंग</span>
          </button>

          <button
            onClick={() => handleNav('admin_audit_logs')}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-rose-50 hover:border-rose-200 border border-stone-200 flex flex-col items-center text-center gap-2 transition-all cursor-pointer group"
          >
            <ShieldCheck className="w-5 h-5 text-rose-600 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-stone-800">ऑडिट लॉग्स</span>
          </button>
        </div>
      </div>

      {/* District Activation & Management Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-stone-50">
          <div>
            <h3 className="font-black text-stone-900 text-sm sm:text-base">
              अखिल भारतीय जिला नेटवर्क व सक्रियण स्थिति (All-India District Activation Matrix)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              भोपाल मानक टेम्पलेट पर आधारित स्वतंत्र जिला प्रबंधन। भोपाल के निजी डेटा का पूर्ण पृथक्करण।
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-900"
            >
              <option value="all">सभी राज्य (All States)</option>
              {ALL_INDIA_LOCATIONS.map((s) => (
                <option key={s.state} value={s.state}>
                  {s.state}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-900"
            >
              <option value="all">सभी स्थितियां</option>
              <option value="active">🟢 सक्रिय (Active)</option>
              <option value="inactive">⚪ असक्रिय (Inactive)</option>
              <option value="suspended">🔴 निलंबित (Suspended)</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
              <input
                type="text"
                value={searchDistrict}
                onChange={(e) => setSearchDistrict(e.target.value)}
                placeholder="जिला खोजें..."
                className="bg-white border border-stone-300 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200">
              <tr>
                <th className="py-3 px-4">जिला व राज्य</th>
                <th className="py-3 px-4">स्थिति</th>
                <th className="py-3 px-4">संबद्ध फ्रेंचाइज़ी पार्टनर</th>
                <th className="py-3 px-4">ZIP एसेट्स</th>
                <th className="py-3 px-4 text-right">प्रशासनिक क्रियाएं</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredDistricts.slice(0, 30).map((d, i) => (
                <tr key={i} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-600" />
                      <span>
                        {d.hindiDistrict} ({d.district})
                      </span>
                      {d.district.toLowerCase() === 'bhopal' && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-orange-100 text-orange-800 font-black">
                          HQ
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500 pl-5">
                      {d.hindiState} ({d.state})
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.status === 'suspended'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          d.status === 'active'
                            ? 'bg-emerald-600'
                            : d.status === 'suspended'
                            ? 'bg-rose-600'
                            : 'bg-stone-400'
                        }`}
                      />
                      <span>
                        {d.status === 'active'
                          ? 'सक्रिय (Active)'
                          : d.status === 'suspended'
                          ? 'निलंबित'
                          : 'असक्रिय (Inactive)'}
                      </span>
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    {d.assignedPartner ? (
                      <div>
                        <div className="font-bold text-stone-900">{d.assignedPartner.name}</div>
                        <div className="text-[11px] text-stone-500">
                          {d.assignedPartner.franchiseCode} • {d.assignedPartner.phone}
                        </div>
                      </div>
                    ) : d.district.toLowerCase() === 'bhopal' ? (
                      <div className="font-bold text-stone-800">दीपक बिल्डकॉन हेडक्वाटर</div>
                    ) : (
                      <span className="text-stone-400 italic">पार्टनर असाइन नहीं</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {d.lastAssetImport ? (
                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>कस्टम एसेट्स लाइव</span>
                      </span>
                    ) : (
                      <span className="text-stone-500 text-[11px]">मानक भोपाल टेम्पलेट</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setTargetDistrictForSettings({
                            id: d.district.toLowerCase(),
                            name: d.district,
                            state: d.state,
                          });
                          setIsSettingsModalOpen(true);
                        }}
                        title={`${d.district} जिला सेटिंग्स एवं कमीशन दरें`}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3 h-3 text-stone-600" />
                        <span>दरें</span>
                      </button>

                      <button
                        onClick={() => {
                          setTargetDistrictForZip({ id: d.district.toLowerCase(), name: d.district });
                          setIsZipModalOpen(true);
                        }}
                        title="Upload District ZIP Assets"
                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <FileArchive className="w-3 h-3" />
                        <span>ZIP</span>
                      </button>

                      {d.status !== 'active' ? (
                        <button
                          onClick={() => {
                            setPreselectedDistrictForActivation({ district: d.district, state: d.state });
                            setIsActivationModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <PlayCircle className="w-3 h-3" />
                          <span>सक्रिय करें</span>
                        </button>
                      ) : d.district.toLowerCase() !== 'bhopal' ? (
                        <button
                          onClick={() => handleToggleDistrictStatus(d.district, d.status)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <PauseCircle className="w-3 h-3" />
                          <span>निलंबित</span>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <DistrictActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        preselectedDistrict={preselectedDistrictForActivation.district}
        preselectedState={preselectedDistrictForActivation.state}
      />

      <DistrictZipUploadModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        defaultDistrictId={targetDistrictForZip.id}
        defaultDistrictName={targetDistrictForZip.name}
      />

      <DistrictSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        districtId={targetDistrictForSettings.id}
        districtName={targetDistrictForSettings.name}
        stateName={targetDistrictForSettings.state}
      />

      <AdminFranchiseKYCSettingsModal
        isOpen={isKycSettingsModalOpen}
        onClose={() => setIsKycSettingsModalOpen(false)}
        adminName="Super Admin DEEPAK"
      />

      <AdminUniversalSearchModal
        isOpen={isUniversalSearchOpen}
        onClose={() => setIsUniversalSearchOpen(false)}
        onSelectTab={handleNav}
      />
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  Mail,
  Printer,
  FileSpreadsheet,
  Users,
  TrendingUp,
  DollarSign,
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  Ban,
  Clock,
  Send,
  Download,
  MessageSquare,
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FranchiseApplication, FranchiseCityReport, FranchiseStatus, FranchisePartner } from '../../types';
import { ALL_INDIA_LOCATIONS, DEEPAK_BUILDCON_OFFICIAL, FRANCHISE_RULES_BY_TIER } from '../../data/indiaLocations';
import { FranchiseNotificationModal } from '../franchise/FranchiseNotificationModal';
import { DistrictAdminDashboard } from '../franchise/DistrictAdminDashboard';
import {
  dispatchFranchiseWelcomeNotification,
  FranchiseNotificationInput,
  NotificationDispatchResult,
} from '../../services/franchiseNotificationService';
import {
  subscribeAllFranchisePartners,
  createFranchisePartner,
  updateFranchiseStatus,
  ensureDefaultFranchisePartners,
} from '../../services/franchisePartnerService';

// Initial baseline representative city reports across India
const SEED_CITY_REPORTS: FranchiseCityReport[] = [
  {
    cityOrVillage: 'Bhopal City (H.Q.)',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    areaType: 'district',
    franchiseHolderName: 'Rajesh Sharma',
    phone: '9826011223',
    activeSince: '2024-01-15',
    monthlyTarget: 400,
    completedBookingsThisMonth: 432,
    targetAchievementRate: 108,
    totalRevenueGenerated: 285000,
    royaltyPaidToDeepakBuildcon: 42750,
    staffCount: 28,
    status: 'active',
  },
  {
    cityOrVillage: 'Kolar Road & Bairagarh',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    areaType: 'town',
    franchiseHolderName: 'Vikram Singh Parihar',
    phone: '9826033445',
    activeSince: '2024-03-01',
    monthlyTarget: 150,
    completedBookingsThisMonth: 162,
    targetAchievementRate: 108,
    totalRevenueGenerated: 115000,
    royaltyPaidToDeepakBuildcon: 13800,
    staffCount: 12,
    status: 'active',
  },
  {
    cityOrVillage: 'Berasia Tehsil',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    areaType: 'town',
    franchiseHolderName: 'Suresh Patidar',
    phone: '9826055667',
    activeSince: '2024-02-10',
    monthlyTarget: 150,
    completedBookingsThisMonth: 65,
    targetAchievementRate: 43.3,
    totalRevenueGenerated: 46000,
    royaltyPaidToDeepakBuildcon: 7500,
    staffCount: 8,
    status: 'probation',
  },
  {
    cityOrVillage: 'Phanda Gram Panchayat',
    district: 'Bhopal',
    state: 'Madhya Pradesh',
    areaType: 'village',
    franchiseHolderName: 'Gopal Yadav',
    phone: '9826077889',
    activeSince: '2024-04-12',
    monthlyTarget: 50,
    completedBookingsThisMonth: 54,
    targetAchievementRate: 108,
    totalRevenueGenerated: 38000,
    royaltyPaidToDeepakBuildcon: 3800,
    staffCount: 5,
    status: 'active',
  },
  {
    cityOrVillage: 'Indore City (H.Q.)',
    district: 'Indore',
    state: 'Madhya Pradesh',
    areaType: 'district',
    franchiseHolderName: 'Anand Mundra',
    phone: '9425012345',
    activeSince: '2024-01-20',
    monthlyTarget: 400,
    completedBookingsThisMonth: 485,
    targetAchievementRate: 121.2,
    totalRevenueGenerated: 345000,
    royaltyPaidToDeepakBuildcon: 51750,
    staffCount: 32,
    status: 'active',
  },
  {
    cityOrVillage: 'Mhow (Dr. Ambedkar Nagar)',
    district: 'Indore',
    state: 'Madhya Pradesh',
    areaType: 'town',
    franchiseHolderName: 'Kailash Verma',
    phone: '9425098765',
    activeSince: '2024-03-15',
    monthlyTarget: 150,
    completedBookingsThisMonth: 140,
    targetAchievementRate: 93.3,
    totalRevenueGenerated: 98000,
    royaltyPaidToDeepakBuildcon: 11760,
    staffCount: 11,
    status: 'active',
  },
  {
    cityOrVillage: 'Jabalpur City (H.Q.)',
    district: 'Jabalpur',
    state: 'Madhya Pradesh',
    areaType: 'district',
    franchiseHolderName: 'Pradeep Tiwari',
    phone: '9827011223',
    activeSince: '2024-02-01',
    monthlyTarget: 400,
    completedBookingsThisMonth: 390,
    targetAchievementRate: 97.5,
    totalRevenueGenerated: 260000,
    royaltyPaidToDeepakBuildcon: 39000,
    staffCount: 26,
    status: 'active',
  },
  {
    cityOrVillage: 'Lucknow Central (Hazratganj)',
    district: 'Lucknow',
    state: 'Uttar Pradesh',
    areaType: 'district',
    franchiseHolderName: 'Amitabh Saxena',
    phone: '9935012345',
    activeSince: '2024-03-10',
    monthlyTarget: 400,
    completedBookingsThisMonth: 410,
    targetAchievementRate: 102.5,
    totalRevenueGenerated: 310000,
    royaltyPaidToDeepakBuildcon: 46500,
    staffCount: 30,
    status: 'active',
  },
];

export const AdminFranchiseReports: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'city_reports' | 'district_admins' | 'applications'>('district_admins');
  const [cityReports, setCityReports] = useState<FranchiseCityReport[]>(SEED_CITY_REPORTS);
  const [applications, setApplications] = useState<FranchiseApplication[]>([]);
  const [districtPartners, setDistrictPartners] = useState<FranchisePartner[]>([]);
  const [loading, setLoading] = useState(true);

  // Inspected district for direct Super Admin view
  const [inspectedDistrictId, setInspectedDistrictId] = useState<string | null>(null);

  // Create Partner Modal
  const [isCreatePartnerModalOpen, setIsCreatePartnerModalOpen] = useState(false);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerState, setNewPartnerState] = useState('Madhya Pradesh');
  const [newPartnerDistrict, setNewPartnerDistrict] = useState('Gwalior');
  const [newPartnerPassword, setNewPartnerPassword] = useState('123456');
  const [creatingPartner, setCreatingPartner] = useState(false);
  const [createPartnerError, setCreatePartnerError] = useState<string | null>(null);

  // Filters
  const [filterState, setFilterState] = useState<string>('all');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected city report for detail view/termination action
  const [selectedReport, setSelectedReport] = useState<FranchiseCityReport | null>(null);
  const [terminationReason, setTerminationReason] = useState('');
  const [showTerminationModal, setShowTerminationModal] = useState(false);

  // Automated SMS & WhatsApp Notification Modal for admin review
  const [adminNotificationModal, setAdminNotificationModal] = useState<{
    dispatchResult: NotificationDispatchResult;
    input: FranchiseNotificationInput;
  } | null>(null);

  // Subscribe to real-time franchise partners and seed defaults if empty
  useEffect(() => {
    ensureDefaultFranchisePartners();
    const unsub = subscribeAllFranchisePartners((partners) => {
      setDistrictPartners(partners);
    });
    return () => unsub();
  }, []);

  const handleOpenNotificationModal = async (app: FranchiseApplication) => {
    const tierRule = FRANCHISE_RULES_BY_TIER[app.areaType] || FRANCHISE_RULES_BY_TIER.town;
    const notifInput: FranchiseNotificationInput = {
      appId: app.id,
      franchiseCode: app.franchiseCode || app.id,
      applicantName: app.applicantName,
      phone: app.phone,
      alternatePhone: app.alternatePhone,
      email: app.email,
      state: app.state,
      district: app.district,
      cityOrVillage: app.cityOrVillage,
      areaType: app.areaType,
      investmentBudget: app.investmentBudget,
      officeAreaSqFt: app.officeAreaSqFt || tierRule.minOfficeSqFt,
      monthlyTargetBookings: app.monthlyTargetBookings,
      royaltyPercentage: app.royaltyPercentage,
      royaltyFeeMonthly: app.royaltyFeeMonthly || tierRule.minMonthlyRoyalty,
      estimatedEarnings: app.estimatedEarnings || tierRule.projectedEarningsMonthly,
      initialStaffCount: app.initialStaffCount,
    };
    try {
      const res = await dispatchFranchiseWelcomeNotification(notifInput);
      setAdminNotificationModal({ dispatchResult: res, input: notifInput });
    } catch (err) {
      console.error('Failed to prepare notification modal for admin:', err);
    }
  };

  // Create new Franchise Partner
  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim() || !newPartnerEmail.trim() || !newPartnerPhone.trim()) {
      setCreatePartnerError('कृपया नाम, ईमेल और फोन नंबर भरें');
      return;
    }
    setCreatingPartner(true);
    setCreatePartnerError(null);
    try {
      const res = await createFranchisePartner({
        name: newPartnerName.trim(),
        email: newPartnerEmail.trim().toLowerCase(),
        phone: newPartnerPhone.trim(),
        assignedDistrictId: newPartnerDistrict,
        assignedDistrictName: newPartnerDistrict,
        stateName: newPartnerState,
        initialPassword: newPartnerPassword,
      });
      if (res.success) {
        setIsCreatePartnerModalOpen(false);
        setNewPartnerName('');
        setNewPartnerEmail('');
        setNewPartnerPhone('');
        setNewPartnerPassword('123456');
      } else {
        setCreatePartnerError(res.error || 'पार्टनर बनाने में विफल');
      }
    } catch (err: any) {
      setCreatePartnerError(err.message || 'त्रुटि हुई');
    } finally {
      setCreatingPartner(false);
    }
  };

  // Toggle partner status
  const handleTogglePartnerStatus = async (partner: FranchisePartner, newStatus: 'ACTIVE' | 'SUSPENDED' | 'DISABLED') => {
    await updateFranchiseStatus(partner.franchisePartnerId, newStatus);
  };

  // Fetch applications & live data from Firestore
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch applications
      const appSnap = await getDocs(collection(db, 'franchise_applications'));
      const appList: FranchiseApplication[] = [];
      appSnap.forEach((d) => {
        appList.push({ id: d.id, ...d.data() } as FranchiseApplication);
      });
      setApplications(appList);

      // 2. Fetch live city reports if created in Firestore
      const citySnap = await getDocs(collection(db, 'franchise_cities'));
      if (!citySnap.empty) {
        const liveCities: FranchiseCityReport[] = [];
        citySnap.forEach((d) => liveCities.push(d.data() as FranchiseCityReport));
        setCityReports(liveCities);
      }
    } catch (err) {
      console.warn('Franchise data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update application status (Approve, Probation, Terminate)
  const handleUpdateApplicationStatus = async (appId: string, newStatus: FranchiseStatus) => {
    try {
      await updateDoc(doc(db, 'franchise_applications', appId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  // Terminate franchise for failure to meet target or misconduct
  const handleConfirmTermination = () => {
    if (!selectedReport) return;
    setCityReports((prev) =>
      prev.map((c) =>
        c.cityOrVillage === selectedReport.cityOrVillage && c.district === selectedReport.district
          ? { ...c, status: 'terminated' }
          : c
      )
    );
    setShowTerminationModal(false);
    setSelectedReport(null);
    setTerminationReason('');
  };

  // Filtered City Reports
  const filteredCityReports = useMemo(() => {
    return cityReports.filter((rep) => {
      const matchState = filterState === 'all' || rep.state === filterState;
      const matchDistrict = filterDistrict === 'all' || rep.district === filterDistrict;
      const matchStatus = filterStatus === 'all' || rep.status === filterStatus;
      const matchSearch =
        !searchQuery ||
        rep.cityOrVillage.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.franchiseHolderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.phone.includes(searchQuery);
      return matchState && matchDistrict && matchStatus && matchSearch;
    });
  }, [cityReports, filterState, filterDistrict, filterStatus, searchQuery]);

  // Aggregate stats across filtered reports
  const stats = useMemo(() => {
    const totalRevenue = filteredCityReports.reduce((acc, c) => acc + c.totalRevenueGenerated, 0);
    const totalRoyalty = filteredCityReports.reduce((acc, c) => acc + c.royaltyPaidToDeepakBuildcon, 0);
    const totalStaff = filteredCityReports.reduce((acc, c) => acc + c.staffCount, 0);
    const totalBookings = filteredCityReports.reduce((acc, c) => acc + c.completedBookingsThisMonth, 0);
    const targetAtRisk = filteredCityReports.filter((c) => c.status === 'probation' || c.targetAchievementRate < 60).length;
    return {
      activeCount: filteredCityReports.filter((c) => c.status === 'active').length,
      totalRevenue,
      totalRoyalty,
      totalStaff,
      totalBookings,
      targetAtRisk,
    };
  }, [filteredCityReports]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold mb-1">
            <Building2 className="w-3.5 h-3.5 text-orange-600" />
            <span>दीपक बिल्डकॉन (DEEPAK BUILDCON) मास्टर डेटाबेस</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            पूरे भारत की शहरवार फ्रेंचाइज़ी रिपोर्ट एवं प्रबंधन
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            हर शहर, कस्बे व गाँव की मासिक बुकिंग, टारगेट पूरा करने की दर, रॉयल्टी एवं कर्मचारियों का विवरण
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-bold text-xs text-stone-700 flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>रिपोर्ट प्रिंट / PDF</span>
          </button>
          <button
            onClick={fetchData}
            className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm cursor-pointer"
          >
            डेटा रीफ्रेश
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('district_admins')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'district_admins'
                ? 'bg-amber-500 text-stone-950 shadow-xs'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-stone-950" />
            <span>🏢 जिला फ्रेंचाइज़ी पार्टनर एडमिन ({districtPartners.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('city_reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'city_reports'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            📊 शहरवार प्रदर्शन व रॉयल्टी रिपोर्ट ({filteredCityReports.length})
          </button>
          <button
            onClick={() => setActiveSubTab('applications')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSubTab === 'applications'
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            📝 नए फ्रेंचाइज़ी आवेदन ({applications.length})
          </button>
        </div>

        {activeSubTab === 'district_admins' && (
          <button
            onClick={() => setIsCreatePartnerModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>+ नया जिला पार्टनर जोड़ें (Onboard District Admin)</span>
          </button>
        )}
      </div>

      {/* High-Level Financial & Target Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-stone-400">सक्रिय फ्रेंचाइज़ी</div>
          <div className="text-xl font-black text-stone-900 mt-1">{stats.activeCount} सेंटर्स</div>
          <div className="text-[10px] text-stone-500 mt-0.5">ऑल-इंडिया नेटवर्क</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-orange-600">कुल मासिक रॉयल्टी</div>
          <div className="text-xl font-black text-orange-700 mt-1">₹{(stats.totalRoyalty || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-orange-600 font-medium mt-0.5">दीपक बिल्डकॉन हेड ऑफिस</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-emerald-600">कुल नेटवर्क रेवेन्यू</div>
          <div className="text-xl font-black text-emerald-700 mt-1">₹{(stats.totalRevenue || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">माह की कुल सर्विस बिलिंग</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-stone-400">कुल पूर्ण बुकिंग्स</div>
          <div className="text-xl font-black text-stone-900 mt-1">{(stats.totalBookings || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-stone-500 mt-0.5">इस माह की सर्विसेज</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-stone-400">कुल तैनात कर्मचारी</div>
          <div className="text-xl font-black text-stone-900 mt-1">{stats.totalStaff} कारीगर/स्टाफ</div>
          <div className="text-[10px] text-stone-500 mt-0.5">ग्राउंड फील्ड टीम</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
          <div className="text-[10px] uppercase font-bold text-red-600">टारगेट जोखिम / चेतावनी</div>
          <div className="text-xl font-black text-red-700 mt-1">{stats.targetAtRisk} सेंटर्स</div>
          <div className="text-[10px] text-red-500 font-medium mt-0.5">&lt; 60% लक्ष्य या प्रोबेशन</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="शहर, कस्बा, ज़िला, फ्रेंचाइज़ी धारक या फोन से खोजें..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:bg-white focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="p-2 text-xs rounded-xl border border-stone-200 bg-stone-50 font-semibold"
          >
            <option value="all">सभी राज्य (All States)</option>
            {ALL_INDIA_LOCATIONS.map((s) => (
              <option key={s.state} value={s.state}>
                {s.state}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 text-xs rounded-xl border border-stone-200 bg-stone-50 font-semibold"
          >
            <option value="all">सभी स्थिति (All Status)</option>
            <option value="active">सक्रिय (Active)</option>
            <option value="probation">प्रोबेशन / नोटिस (Probation)</option>
            <option value="terminated">निरस्त (Terminated)</option>
          </select>
        </div>
      </div>

      {/* View 0: District Franchise Partners Management */}
      {activeSubTab === 'district_admins' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-3xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-stone-700 shadow-sm">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] tracking-wide uppercase">
                <ShieldCheck className="w-3 h-3" />
                <span>दीपक बिल्डकॉन - जिला एडमिनिस्ट्रेटर नेटवर्क</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                जिला फ्रेंचाइज़ी पार्टनर नियंत्रण एवं अनुमतियाँ
              </h2>
              <p className="text-xs text-stone-300">
                प्रत्येक जिला पार्टनर केवल अपने जिले की बुकिंग्स, तकनीशियन और कार्य देख सकता है। सुपर एडमिन (दीपक बिल्डकॉन) पूरे भारत का नियंत्रण रखता है।
              </p>
            </div>
            <button
              onClick={() => setIsCreatePartnerModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md shrink-0 cursor-pointer flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>+ नया जिला पार्टनर जोड़ें</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">फ्रेंचाइज़ी कोड</th>
                    <th className="py-3.5 px-4">आवंटित जिला व राज्य</th>
                    <th className="py-3.5 px-4">पार्टनर विवरण (नाम / संपर्क)</th>
                    <th className="py-3.5 px-4">लॉगिन ईमेल</th>
                    <th className="py-3.5 px-4 text-center">स्थिति</th>
                    <th className="py-3.5 px-4 text-center">अंतिम लॉगिन</th>
                    <th className="py-3.5 px-4 text-right">प्रशासनिक कार्यवाही</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {districtPartners.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                        कोई जिला फ्रेंचाइज़ी पार्टनर पंजीकृत नहीं है।
                      </td>
                    </tr>
                  ) : (
                    districtPartners.map((partner) => (
                      <tr key={partner.franchisePartnerId} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200">
                            {partner.franchiseCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-black text-stone-900 text-sm flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span>{partner.assignedDistrictName || partner.assignedDistrictId}</span>
                          </div>
                          <div className="text-[10px] text-stone-500">{partner.stateName}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-900">{partner.name}</div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-stone-400" />
                            <span>{partner.phone}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-[11px] font-mono text-stone-700 font-semibold flex items-center gap-1">
                            <Mail className="w-3 h-3 text-stone-400" />
                            <span>{partner.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <select
                            value={partner.status}
                            onChange={(e) =>
                              handleTogglePartnerStatus(
                                partner,
                                e.target.value as 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border cursor-pointer ${
                              partner.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : partner.status === 'SUSPENDED'
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-red-50 text-red-700 border-red-300'
                            }`}
                          >
                            <option value="ACTIVE">सक्रिय (ACTIVE)</option>
                            <option value="SUSPENDED">निलंबित (SUSPENDED)</option>
                            <option value="DISABLED">अक्षम (DISABLED)</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-center text-stone-500 text-[10px]">
                          {partner.lastLoginAt
                            ? new Date(partner.lastLoginAt).toLocaleDateString('hi-IN', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : 'अभी तक नहीं'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setInspectedDistrictId(partner.assignedDistrictName || partner.assignedDistrictId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-[11px] shadow-xs cursor-pointer transition-all"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-white" />
                            <span>⚡ जिला हब खोलें</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 1: City-by-City Performance Reports Table */}
      {activeSubTab === 'city_reports' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">शहर / कस्बा / गाँव</th>
                  <th className="py-3.5 px-4">ज़िला व राज्य</th>
                  <th className="py-3.5 px-4">फ्रेंचाइज़ी पार्टनर</th>
                  <th className="py-3.5 px-4 text-center">मासिक टारगेट</th>
                  <th className="py-3.5 px-4 text-center">पूर्ण बुकिंग्स</th>
                  <th className="py-3.5 px-4 text-center">टारगेट दर (%)</th>
                  <th className="py-3.5 px-4 text-right">कुल रेवेन्यू</th>
                  <th className="py-3.5 px-4 text-right text-orange-700">दीपक बिल्डकॉन रॉयल्टी</th>
                  <th className="py-3.5 px-4 text-center">स्टाफ</th>
                  <th className="py-3.5 px-4 text-center">स्थिति</th>
                  <th className="py-3.5 px-4 text-right">कार्यवाही</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCityReports.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-stone-400 text-xs">
                      कोई शहर रिपोर्ट नहीं मिली।
                    </td>
                  </tr>
                ) : (
                  filteredCityReports.map((rep, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{rep.cityOrVillage}</div>
                        <span
                          className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            rep.areaType === 'district'
                              ? 'bg-purple-100 text-purple-800'
                              : rep.areaType === 'town'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rep.areaType === 'district' ? 'मुख्य शहर' : rep.areaType === 'town' ? 'कस्बा' : 'गाँव'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-stone-800 font-semibold">{rep.district}</div>
                        <div className="text-[10px] text-stone-400">{rep.state}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{rep.franchiseHolderName}</div>
                        <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{rep.phone}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-stone-700">
                        {rep.monthlyTarget}
                      </td>
                      <td className="py-3.5 px-4 text-center font-black text-stone-900">
                        {rep.completedBookingsThisMonth}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-black text-xs ${
                              rep.targetAchievementRate >= 90
                                ? 'text-emerald-700'
                                : rep.targetAchievementRate >= 60
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }`}
                          >
                            {rep.targetAchievementRate.toFixed(1)}%
                          </span>
                          <div className="w-16 bg-stone-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${
                                rep.targetAchievementRate >= 90
                                ? 'bg-emerald-500'
                                : rep.targetAchievementRate >= 60
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(rep.targetAchievementRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-stone-800">
                        ₹{(rep?.totalRevenueGenerated || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-orange-700">
                        ₹{(rep?.royaltyPaidToDeepakBuildcon || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-stone-700">
                        {rep.staffCount}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            rep.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'probation'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {rep.status === 'active' ? 'सक्रिय' : rep.status === 'probation' ? 'प्रोबेशन' : 'निरस्त'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {rep.status !== 'terminated' ? (
                          <button
                            onClick={() => {
                              setSelectedReport(rep);
                              setShowTerminationModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] cursor-pointer"
                            title="टारगेट न करने पर फ्रेंचाइज़ी निरस्त करें"
                          >
                            <Ban className="w-3 h-3 text-red-600" />
                            <span>टर्मिनेट करें</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">अनुबंध समाप्त</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: All Incoming Franchise Applications */}
      {activeSubTab === 'applications' && (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              वेब पोर्टल से प्राप्त ऑनलाइन फ्रेंचाइज़ी आवेदन (Applications via Portal)
            </h3>
            <span className="text-xs text-stone-500 font-medium">
              कुल आवेदन: {applications.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">आवेदन / फ्रेंचाइज़ी कोड</th>
                  <th className="py-3.5 px-4">आवेदक विवरण</th>
                  <th className="py-3.5 px-4">स्थान / शहर / गाँव</th>
                  <th className="py-3.5 px-4">बजट / ऑफिस</th>
                  <th className="py-3.5 px-4">मासिक टारगेट</th>
                  <th className="py-3.5 px-4">अधिसूचना व स्थिति</th>
                  <th className="py-3.5 px-4 text-right">निर्णय / अधिसूचना</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {applications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                      {loading ? 'आवेदन लोड हो रहे हैं...' : 'अभी तक कोई नया आवेदन प्राप्त नहीं हुआ। पोर्टल से आवेदन करने पर यहाँ दिखाई देगा।'}
                    </td>
                  </tr>
                ) : (
                  applications.map((app) => (
                    <tr key={app.id} className="hover:bg-stone-50/60">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-stone-800 text-[11px]">{app.id}</div>
                        <div className="mt-1 inline-block font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-200 text-[10px] px-2 py-0.5 rounded shadow-2xs">
                          {app.franchiseCode || 'कोड प्रक्रियाधीन'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-900">{app.applicantName}</div>
                        <div className="text-[11px] text-stone-600 font-mono flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-stone-400" />
                          <span>{app.phone}</span>
                        </div>
                        <div className="text-[10px] text-stone-400 truncate max-w-[150px]">{app.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{app.cityOrVillage}</div>
                        <div className="text-[10px] text-stone-500">
                          ज़िला: {app.district}, {app.state} ({app.pincode})
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-700">
                          ₹{(app.investmentBudget || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          ऑफिस: {app.officeAreaSqFt} sq ft ({app.officeAvailable})
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-stone-800">{app.monthlyTargetBookings} सर्विसेज/माह</div>
                        <div className="text-[10px] text-orange-600">रॉयल्टी: {app.royaltyPercentage}%</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              app.status === 'approved' || app.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : app.status === 'terminated'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {app.status}
                          </span>
                          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>SMS/WA प्रेषित</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            onClick={() => handleOpenNotificationModal(app)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[10px] cursor-pointer"
                            title="SMS व WhatsApp अधिसूचना विवरण व रसीद देखें"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>अधिसूचना पावती</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {app.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateApplicationStatus(app.id, 'approved')}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                              >
                                स्वीकृत
                              </button>
                            )}
                            {app.status !== 'terminated' && (
                              <button
                                onClick={() => handleUpdateApplicationStatus(app.id, 'terminated')}
                                className="px-2 py-0.5 rounded bg-stone-100 hover:bg-red-50 text-red-700 border border-stone-200 font-bold text-[10px] cursor-pointer"
                              >
                                अस्वीकृत
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Franchise Partner Modal */}
      {isCreatePartnerModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600" />
                <h3 className="font-black text-stone-900 text-base">
                  नया जिला फ्रेंचाइज़ी पार्टनर पंजीकृत करें
                </h3>
              </div>
              <button
                onClick={() => setIsCreatePartnerModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePartner} className="mt-4 space-y-3.5">
              {createPartnerError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                  {createPartnerError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">राज्य (State)</label>
                  <select
                    value={newPartnerState}
                    onChange={(e) => setNewPartnerState(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold bg-stone-50"
                  >
                    {ALL_INDIA_LOCATIONS.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">जिला (District)</label>
                  <input
                    type="text"
                    required
                    value={newPartnerDistrict}
                    onChange={(e) => setNewPartnerDistrict(e.target.value)}
                    placeholder="उदा. Gwalior, Indore, Bhopal"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">पार्टनर / प्रोपराइटर का नाम</label>
                <input
                  type="text"
                  required
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  placeholder="उदा. विक्रम सिंह तोमर"
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">ईमेल (लॉगिन हेतु)</label>
                  <input
                    type="email"
                    required
                    value={newPartnerEmail}
                    onChange={(e) => setNewPartnerEmail(e.target.value)}
                    placeholder="partner@example.com"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 mb-1">मोबाइल नंबर</label>
                  <input
                    type="tel"
                    required
                    value={newPartnerPhone}
                    onChange={(e) => setNewPartnerPhone(e.target.value)}
                    placeholder="98260XXXXX"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">शुरुआती पासवर्ड</label>
                <input
                  type="text"
                  required
                  value={newPartnerPassword}
                  onChange={(e) => setNewPartnerPassword(e.target.value)}
                  placeholder="कम से कम 6 अक्षर"
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-mono font-semibold"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                💡 पंजीकरण पर स्वचालित रूप से अद्वितीय फ्रेंचाइज़ी कोड (उदा. <strong>HDK-GWL-001</strong>) तैयार किया जाएगा और जिला स्तर पर डेटा सुरक्षित रहेगा।
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePartnerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={creatingPartner}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-black shadow-sm cursor-pointer"
                >
                  {creatingPartner ? 'पंजीकृत हो रहा है...' : 'पार्टनर अधिकृत करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Super Admin District Inspector Modal */}
      {inspectedDistrictId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 overflow-y-auto p-4 sm:p-6 flex flex-col justify-start">
          <div className="max-w-7xl w-full mx-auto bg-stone-900 rounded-3xl p-4 sm:p-6 border border-stone-700 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500 text-stone-950 font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-amber-400">सुपर एडमिन लाइव जिला निरीक्षण</div>
                  <h2 className="text-lg font-black text-white">
                    {inspectedDistrictId} जिला फ्रेंचाइज़ी एडमिन हब
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setInspectedDistrictId(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-700 cursor-pointer"
              >
                ✕ निरीक्षण बंद करें
              </button>
            </div>

            {/* Render full live District Admin Dashboard for this district */}
            <div className="bg-stone-50 rounded-2xl p-2 sm:p-4 text-stone-900">
              <DistrictAdminDashboard
                forcedDistrictId={inspectedDistrictId}
                onBackToMain={() => setInspectedDistrictId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Termination Confirmation Modal */}
      {showTerminationModal && selectedReport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-red-600 font-black text-base mb-1">
              <ShieldAlert className="w-5 h-5" />
              <span>फ्रेंचाइज़ी अनुबंध निरस्तीकरण (Termination)</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mt-1">
              आप <strong>{selectedReport.cityOrVillage} ({selectedReport.district})</strong> के फ्रेंचाइज़ी पार्टनर{' '}
              <strong>{selectedReport.franchiseHolderName}</strong> का अनुबंध समाप्त करने जा रहे हैं।
            </p>

            <div className="mt-4 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <div>मासिक टारगेट: <strong>{selectedReport.monthlyTarget}</strong></div>
              <div>पूर्ण कार्य: <strong>{selectedReport.completedBookingsThisMonth}</strong> ({selectedReport.targetAchievementRate.toFixed(1)}%)</div>
              <div>स्थिति: <span className="text-red-600 font-bold">टारगेट पूरा नहीं किया गया</span></div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-stone-700 mb-1">टर्मिनेशन का कारण / नोटिस नोट:</label>
              <textarea
                rows={2}
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                placeholder="लगातार 3 माह तय लक्ष्य से कम कार्य अथवा नियमों का उल्लंघन..."
                className="w-full p-2.5 text-xs rounded-xl border border-stone-200"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowTerminationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                onClick={handleConfirmTermination}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                पुष्टि करें और टर्मिनेट करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Franchise Notification Modal */}
      {adminNotificationModal && (
        <FranchiseNotificationModal
          isOpen={!!adminNotificationModal}
          onClose={() => setAdminNotificationModal(null)}
          dispatchResult={adminNotificationModal.dispatchResult}
          applicationInput={adminNotificationModal.input}
        />
      )}
    </div>
  );
};

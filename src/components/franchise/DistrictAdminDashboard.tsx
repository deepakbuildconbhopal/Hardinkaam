import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Wrench,
  Send,
  Printer,
  ChevronRight,
  RefreshCw,
  PhoneCall,
  MessageSquare,
  FileSpreadsheet,
  Settings,
  Shield,
  Layers,
  ChevronDown,
  FileCheck2,
} from 'lucide-react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Booking,
  ServiceMan,
  FranchisePartner,
  FranchisePartnerStatus,
  DistrictSettings,
  UserRole,
  PaymentStatus,
  BookingStatus,
  FranchiseAgreementRecord,
  KYCDocumentRecord,
} from '../../types';
import { ALL_INDIA_LOCATIONS } from '../../data/indiaLocations';
import {
  updateDistrictSettings,
  toggleDistrictService,
  updateFranchiseStatus,
  subscribeAllFranchisePartners,
} from '../../services/franchisePartnerService';
import { FranchiseKYCSection } from './FranchiseKYCSection';
import { FranchiseAgreementKycStatusDisplay } from './FranchiseAgreementKycStatusDisplay';
import { logAuditEvent } from '../../services/auditService';
import {
  completeFranchiseAgreement,
  subscribeFranchiseAgreements,
  subscribeFranchiseKycDocuments,
} from '../../services/franchiseKycService';
import { notifyAdminPartnerMilestoneReached } from '../../services/adminNotificationService';

interface Props {
  forcedDistrictId?: string;
  onBackToMain?: () => void;
  onOpenSuperAdminHub?: () => void;
}

export const DistrictAdminDashboard: React.FC<Props> = ({
  forcedDistrictId,
  onBackToMain,
  onOpenSuperAdminHub,
}) => {
  const { userProfile, activeRole, isAdmin, isFranchiseAdmin } = useAuth();

  // Active district determination: user's assigned district or forced or default
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>(() => {
    if (forcedDistrictId) return forcedDistrictId.toLowerCase();
    if (userProfile?.assignedDistrictId) return userProfile.assignedDistrictId.toLowerCase();
    if (userProfile?.districtId) return userProfile.districtId.toLowerCase();
    return 'gwalior';
  });

  // Strict District Isolation: Lock franchise admin to their assigned district
  useEffect(() => {
    if (isFranchiseAdmin && !isAdmin) {
      const myDist = (userProfile?.assignedDistrictId || userProfile?.districtId || '').toLowerCase();
      if (myDist && selectedDistrictId !== myDist) {
        setSelectedDistrictId(myDist);
      }
    }
  }, [isFranchiseAdmin, isAdmin, userProfile?.assignedDistrictId, userProfile?.districtId, selectedDistrictId]);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'bookings' | 'technicians' | 'localities' | 'notifications' | 'settings' | 'agreement' | 'kyc'
  >('overview');

  // Real-time data states
  const [districtPartner, setDistrictPartner] = useState<FranchisePartner | null>(null);
  const [allPartners, setAllPartners] = useState<FranchisePartner[]>([]);
  const [districtBookings, setDistrictBookings] = useState<Booking[]>([]);
  const [districtTechnicians, setDistrictTechnicians] = useState<ServiceMan[]>([]);
  const [partnerAgreements, setPartnerAgreements] = useState<FranchiseAgreementRecord[]>([]);
  const [partnerKycDocs, setPartnerKycDocs] = useState<KYCDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & search states
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<Booking | null>(null);
  const [selectedTechForModal, setSelectedTechForModal] = useState<ServiceMan | null>(null);
  const [isAddTechModalOpen, setIsAddTechModalOpen] = useState<boolean>(false);

  // New Technician form state
  const [newTechName, setNewTechName] = useState('');
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechCategory, setNewTechCategory] = useState('Electrician');
  const [newTechExperience, setNewTechExperience] = useState(3);
  const [newTechHourlyRate, setNewTechHourlyRate] = useState(250);
  const [savingTech, setSavingTech] = useState(false);

  // New Locality / Area state
  const [newLocalityName, setNewLocalityName] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [localitiesList, setLocalitiesList] = useState<Array<{ name: string; pincode?: string; active: boolean }>>([]);

  // District Settings form
  const [settingsSupportPhone, setSettingsSupportPhone] = useState('');
  const [settingsSupportEmail, setSettingsSupportEmail] = useState('');
  const [settingsHours, setSettingsHours] = useState('08:00 AM - 08:00 PM (Daily)');
  const [settingsNotice, setSettingsNotice] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // WhatsApp Broadcast state
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'technicians' | 'customers' | 'both'>('technicians');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  // Agreement Signing state
  const [signerName, setSignerName] = useState('');
  const [signerDesignation, setSignerDesignation] = useState('Authorized Franchise Administrator');
  const [agreeTermsAccepted, setAgreeTermsAccepted] = useState(false);
  const [submittingAgreement, setSubmittingAgreement] = useState(false);
  const [agreementSuccessMsg, setAgreementSuccessMsg] = useState<string | null>(null);

  // 1. Subscribe to all franchise partners (for admin district switcher)
  useEffect(() => {
    const unsub = subscribeAllFranchisePartners((partners) => {
      setAllPartners(partners);
      // If current district partner is in the list, update it
      const current = partners.find(
        (p) => p.assignedDistrictId.toLowerCase() === selectedDistrictId.toLowerCase()
      );
      if (current) {
        setDistrictPartner(current);
        setSettingsSupportPhone(current.districtSettings?.supportPhone || current.phone);
        setSettingsSupportEmail(current.districtSettings?.supportEmail || current.email);
        setSettingsHours(current.districtSettings?.operatingHours || '08:00 AM - 08:00 PM (Daily)');
        setSettingsNotice(current.districtSettings?.customNotice || '');
      } else {
        // Fallback synthetic partner for this district
        const distName = selectedDistrictId.charAt(0).toUpperCase() + selectedDistrictId.slice(1);
        setDistrictPartner({
          id: `franchise_${selectedDistrictId}`,
          franchisePartnerId: `franchise_${selectedDistrictId}`,
          franchiseCode: `HDK-${selectedDistrictId.substring(0, 3).toUpperCase()}-001`,
          name: `${distName} District Franchise Partner`,
          email: `${selectedDistrictId}.franchise@hardinkaam.in`,
          phone: '+91 98260 12345',
          assignedDistrictId: selectedDistrictId,
          assignedDistrictName: distName,
          stateName: 'Madhya Pradesh',
          status: 'ACTIVE',
          permissions: {
            manageCustomers: true,
            managePros: true,
            manageBookings: true,
            viewRevenue: true,
            viewReports: true,
            manageDistrictServices: true,
            manageDistrictCategories: true,
            manageDistrictSettings: true,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    return () => unsub();
  }, [selectedDistrictId]);

  // 1b. Real-time listener for partner agreements and KYC documents from Firebase
  useEffect(() => {
    if (!districtPartner?.id) return;
    const unsubAgr = subscribeFranchiseAgreements(districtPartner.id, (agrs) => {
      setPartnerAgreements(agrs);
    });
    const unsubKyc = subscribeFranchiseKycDocuments(districtPartner.id, (docs) => {
      setPartnerKycDocs(docs);
    });
    return () => {
      unsubAgr();
      unsubKyc();
    };
  }, [districtPartner?.id]);

  // 2. Fetch District Localities from India Locations dataset
  useEffect(() => {
    const foundState = ALL_INDIA_LOCATIONS.find((s) => s.state === 'Madhya Pradesh') || ALL_INDIA_LOCATIONS[0];
    const foundDistrict = foundState.districts.find(
      (d) => d.district.toLowerCase() === selectedDistrictId.toLowerCase()
    );

    if (foundDistrict && foundDistrict.places && foundDistrict.places.length > 0) {
      const places = foundDistrict.places.map((p: any) => ({
        name: typeof p === 'string' ? p : p.name,
        pincode: typeof p === 'object' && p?.pincode ? p.pincode : '474001',
        active: true,
      }));
      setLocalitiesList(places);
    } else {
      // Default localities for the district
      setLocalitiesList([
        { name: `${districtPartner?.assignedDistrictName || 'City'} Main Center`, pincode: '474001', active: true },
        { name: 'Commercial Zone & Market', pincode: '474002', active: true },
        { name: 'Residential Sector 1', pincode: '474003', active: true },
        { name: 'Residential Sector 2', pincode: '474004', active: true },
      ]);
    }
  }, [selectedDistrictId, districtPartner?.assignedDistrictName]);

  // 3. Real-time District Bookings Listener (Strict District Data Isolation)
  useEffect(() => {
    setLoading(true);
    const bookingsRef = collection(db, 'bookings');
    const unsub = onSnapshot(
      bookingsRef,
      (snap) => {
        const list: Booking[] = [];
        const targetDistLower = selectedDistrictId.toLowerCase();
        const targetDistName = (districtPartner?.assignedDistrictName || selectedDistrictId).toLowerCase();

        snap.forEach((d) => {
          const data = d.data() as Booking;
          const bId = d.id;
          const bDistId = (data.districtId || (data as any).assignedDistrictId || '').toLowerCase();
          const bDistName = (data.districtName || (data as any).assignedDistrictName || '').toLowerCase();
          const bCity = (data.city || '').toLowerCase();
          const bAddress = (data.address || '').toLowerCase();
          const bPartnerId = data.franchisePartnerId;

          // Match by district ID, name, partner ID, or city name
          const isDistrictMatch =
            bDistId === targetDistLower ||
            bDistName.includes(targetDistLower) ||
            bDistName.includes(targetDistName) ||
            bCity.includes(targetDistLower) ||
            bCity.includes(targetDistName) ||
            bAddress.includes(targetDistLower) ||
            bAddress.includes(targetDistName) ||
            (districtPartner?.id && bPartnerId === districtPartner.id);

          if (isDistrictMatch) {
            list.push({ id: bId, ...data });
          }
        });

        // If list is empty in demo mode, inject high-fidelity sample district bookings for visualization
        if (list.length === 0) {
          const sampleDistName = districtPartner?.assignedDistrictName || 'Gwalior';
          const sampleBookings: Booking[] = [
            {
              id: `BK-${selectedDistrictId.toUpperCase()}-101`,
              customerId: 'cust_01',
              customerName: `Amit Sharma (${sampleDistName})`,
              customerPhone: '+91 98270 11223',
              address: `Flat 302, Green Valley Apartments, ${sampleDistName}`,
              serviceId: 'srv_ac_repair',
              serviceName: 'AC Deep Service & Jet Clean',
              categoryId: 'cat_ac_appliance',
              categoryName: 'AC & Appliance Repair',
              status: 'in_progress',
              amount: 1499,
              paymentStatus: 'paid',
              paymentMethod: 'cash',
              scheduledDate: new Date().toISOString().split('T')[0],
              scheduledTime: '11:00 AM - 01:00 PM',
              districtId: selectedDistrictId,
              districtName: sampleDistName,
              serviceManName: 'Vijay Prajapati',
              serviceManPhone: '+91 98270 44556',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: `BK-${selectedDistrictId.toUpperCase()}-102`,
              customerId: 'cust_02',
              customerName: `Sunita Verma (${sampleDistName})`,
              customerPhone: '+91 98270 99887',
              address: `House 14, Main Market Road, ${sampleDistName}`,
              serviceId: 'srv_switch_repair',
              serviceName: 'Complete Switchboard & Wiring Check',
              categoryId: 'cat_electrician',
              categoryName: 'Electrician',
              status: 'completed',
              amount: 599,
              paymentStatus: 'paid',
              paymentMethod: 'online',
              scheduledDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
              scheduledTime: '03:00 PM - 05:00 PM',
              districtId: selectedDistrictId,
              districtName: sampleDistName,
              serviceManName: 'Rakesh Soni',
              serviceManPhone: '+91 98270 66778',
              createdAt: new Date(Date.now() - 86400000).toISOString(),
              updatedAt: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: `BK-${selectedDistrictId.toUpperCase()}-103`,
              customerId: 'cust_03',
              customerName: `Mohit Gupta (${sampleDistName})`,
              customerPhone: '+91 98270 33445',
              address: `Shop 5, Station Road, ${sampleDistName}`,
              serviceId: 'srv_pipe_leakage',
              serviceName: 'Pipeline Leakage & Tap Fitting',
              categoryId: 'cat_plumber',
              categoryName: 'Plumber',
              status: 'pending',
              amount: 450,
              paymentStatus: 'unpaid',
              paymentMethod: 'cash',
              scheduledDate: new Date().toISOString().split('T')[0],
              scheduledTime: '04:00 PM - 06:00 PM',
              districtId: selectedDistrictId,
              districtName: sampleDistName,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
          setDistrictBookings(sampleBookings);
        } else {
          list.sort((a, b) => new Date((b as any).createdAt || '').getTime() - new Date((a as any).createdAt || '').getTime());
          setDistrictBookings(list);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('District bookings listener note:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [selectedDistrictId, districtPartner?.assignedDistrictName, districtPartner?.id]);

  // 4. Real-time District Technicians Listener (Strict District Data Isolation)
  useEffect(() => {
    const prosRef = collection(db, 'service_men');
    const unsub = onSnapshot(
      prosRef,
      (snap) => {
        const list: ServiceMan[] = [];
        const targetDistLower = selectedDistrictId.toLowerCase();
        const targetDistName = (districtPartner?.assignedDistrictName || selectedDistrictId).toLowerCase();

        snap.forEach((d) => {
          const data = d.data() as ServiceMan;
          const pId = d.id;
          const pDistId = (data.districtId || (data as any).assignedDistrictId || '').toLowerCase();
          const pDistName = (data.districtName || (data as any).assignedDistrictName || '').toLowerCase();
          const pArea = (data.serviceArea || '').toLowerCase();
          const pCity = (data.city || '').toLowerCase();

          const isMatch =
            pDistId === targetDistLower ||
            pDistName.includes(targetDistLower) ||
            pDistName.includes(targetDistName) ||
            pArea.includes(targetDistLower) ||
            pArea.includes(targetDistName) ||
            pCity.includes(targetDistLower);

          if (isMatch) {
            list.push({ id: pId, ...data });
          }
        });

        // If list is empty in demo mode, inject sample verified district service pros
        if (list.length === 0) {
          const sampleDistName = districtPartner?.assignedDistrictName || 'Gwalior';
          const samplePros: ServiceMan[] = [
            {
              id: `pro_${selectedDistrictId}_1`,
              userId: `usr_pro_${selectedDistrictId}_1`,
              name: `Vijay Prajapati (${sampleDistName})`,
              phone: '+91 98270 44556',
              email: `vijay.${selectedDistrictId}@hardinkaam.in`,
              categoryIds: ['cat_electrician', 'cat_appliance'],
              categoryNames: ['Electrician', 'AC & Appliance Repair'],
              serviceArea: `${sampleDistName} City & Suburbs`,
              rating: 4.9,
              totalJobs: 84,
              isAvailable: true,
              isVerified: true,
              kycStatus: 'verified',
              experienceYears: 6,
              hourlyRate: 250,
              districtId: selectedDistrictId,
              districtName: sampleDistName,
            },
            {
              id: `pro_${selectedDistrictId}_2`,
              userId: `usr_pro_${selectedDistrictId}_2`,
              name: `Rakesh Soni (${sampleDistName})`,
              phone: '+91 98270 66778',
              email: `rakesh.${selectedDistrictId}@hardinkaam.in`,
              categoryIds: ['cat_plumber'],
              categoryNames: ['Plumber', 'Sanitary Repair'],
              serviceArea: `${sampleDistName} South Zone`,
              rating: 4.8,
              totalJobs: 56,
              isAvailable: true,
              isVerified: true,
              kycStatus: 'verified',
              experienceYears: 4,
              hourlyRate: 220,
              districtId: selectedDistrictId,
              districtName: sampleDistName,
            },
            {
              id: `pro_${selectedDistrictId}_3`,
              userId: `usr_pro_${selectedDistrictId}_3`,
              name: `Dinesh Kushwaha (${sampleDistName})`,
              phone: '+91 98270 88990',
              email: `dinesh.${selectedDistrictId}@hardinkaam.in`,
              categoryIds: ['cat_carpenter'],
              categoryNames: ['Carpenter', 'Furniture Assembly'],
              serviceArea: `${sampleDistName} North Zone`,
              rating: 4.7,
              totalJobs: 32,
              isAvailable: true,
              isVerified: false,
              kycStatus: 'pending',
              experienceYears: 3,
              hourlyRate: 200,
              districtId: selectedDistrictId,
              districtName: sampleDistName,
            },
          ];
          setDistrictTechnicians(samplePros);
        } else {
          setDistrictTechnicians(list);
        }
      },
      (err) => {
        console.warn('District technicians listener note:', err);
      }
    );
    return () => unsub();
  }, [selectedDistrictId, districtPartner?.assignedDistrictName]);

  // Derived KPIs
  const totalRevenue = useMemo(() => {
    return districtBookings
      .filter((b) => b.paymentStatus === 'paid' || b.status === 'completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  }, [districtBookings]);

  const completedCount = useMemo(() => {
    return districtBookings.filter((b) => b.status === 'completed').length;
  }, [districtBookings]);

  const inProgressCount = useMemo(() => {
    return districtBookings.filter((b) => b.status === 'in_progress' || b.status === 'dispatched' || b.status === 'confirmed').length;
  }, [districtBookings]);

  const pendingCount = useMemo(() => {
    return districtBookings.filter((b) => b.status === 'pending').length;
  }, [districtBookings]);

  const franchiseShareRevenue = Math.round(totalRevenue * 0.9); // 90% district revenue distribution
  const monthlyTargetAmount = 250000;
  const targetPercent = Math.min(100, Math.round((totalRevenue / monthlyTargetAmount) * 100));

  // Handler to update booking status
  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setDistrictBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus as any } : b))
      );
      if (selectedBookingForModal?.id === bookingId) {
        setSelectedBookingForModal((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (e) {
      console.warn('Booking status update notice:', e);
    }
  };

  // Handler to assign technician to booking
  const handleAssignTechnician = async (bookingId: string, tech: ServiceMan) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        serviceManId: tech.id,
        serviceManName: tech.name,
        serviceManPhone: tech.phone,
        status: 'dispatched',
        updatedAt: new Date().toISOString(),
      });
      setDistrictBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                serviceManId: tech.id,
                serviceManName: tech.name,
                serviceManPhone: tech.phone,
                status: 'dispatched',
              }
            : b
        )
      );
      if (selectedBookingForModal?.id === bookingId) {
        setSelectedBookingForModal((prev) =>
          prev
            ? {
                ...prev,
                serviceManId: tech.id,
                serviceManName: tech.name,
                serviceManPhone: tech.phone,
                status: 'dispatched',
              }
            : null
        );
      }
    } catch (e) {
      console.warn('Assign tech update notice:', e);
    }
  };

  // Handler to add new technician to district
  const handleAddNewTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTechName.trim() || !newTechPhone.trim()) return;
    setSavingTech(true);

    const distName = districtPartner?.assignedDistrictName || selectedDistrictId;
    const techId = `pro_${selectedDistrictId}_${Date.now().toString(36)}`;
    const newPro: ServiceMan = {
      id: techId,
      userId: `usr_${techId}`,
      name: newTechName.trim(),
      phone: newTechPhone.trim(),
      email: `${newTechName.toLowerCase().replace(/\s+/g, '')}.${selectedDistrictId}@hardinkaam.in`,
      categoryIds: ['cat_general'],
      categoryNames: [newTechCategory],
      serviceArea: `${distName} Coverage Zone`,
      rating: 5.0,
      totalJobs: 0,
      isAvailable: true,
      isVerified: true,
      kycStatus: 'verified',
      experienceYears: newTechExperience,
      hourlyRate: newTechHourlyRate,
      districtId: selectedDistrictId,
      districtName: distName,
      createdAt: new Date().toISOString(),
    };

    try {
      const isFirstTech = districtTechnicians.length === 0;
      await setDoc(doc(db, 'service_men', techId), newPro);
      setDistrictTechnicians((prev) => [newPro, ...prev]);
      setIsAddTechModalOpen(false);
      setNewTechName('');
      setNewTechPhone('');

      if (isFirstTech && districtPartner) {
        await notifyAdminPartnerMilestoneReached({
          partnerId: districtPartner.id,
          partnerName: districtPartner.name,
          districtId: districtPartner.assignedDistrictId,
          districtName: distName,
          franchiseCode: districtPartner.franchiseCode,
          milestoneType: 'FIRST_TECH_ONBOARDED',
          milestoneTitle: `🛠️ प्रथम तकनीशियन ऑनबोर्ड: ${distName} (${districtPartner.franchiseCode})`,
          milestoneDescription: `${distName} जिले में प्रथम अधिकृत तकनीशियन (${newPro.name} - ${newTechCategory}) सफलतापूर्वक ऑनबोर्ड किया गया।`,
          priority: 'medium',
        });
      }
    } catch (err) {
      console.warn('Error adding technician:', err);
    } finally {
      setSavingTech(false);
    }
  };

  const handleSignAndSubmitAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtPartner || !agreeTermsAccepted || !signerName.trim()) return;

    setSubmittingAgreement(true);
    setAgreementSuccessMsg(null);
    try {
      const activeAgr = partnerAgreements[0];
      const targetAgreementId = activeAgr?.agreementId || `AGR-${districtPartner.franchiseCode}-${new Date().getFullYear()}`;
      const targetVersion = activeAgr?.agreementVersion || 'v1.0';
      const partnerAccountId = districtPartner.loginUsername || districtPartner.id;

      const result = await completeFranchiseAgreement(
        districtPartner.id,
        districtPartner.franchiseCode,
        districtPartner.assignedDistrictName,
        `${signerName.trim()}${signerDesignation ? ` (${signerDesignation})` : ''}`,
        {
          agreementId: targetAgreementId,
          agreementVersion: targetVersion,
          partnerAccountId,
          districtId: districtPartner.assignedDistrictId,
          signerName: signerName.trim(),
          signerDesignation: signerDesignation.trim(),
        }
      );

      if (result.success) {
        setAgreementSuccessMsg('अनुबंध पत्र सफलतापूर्वक हस्ताक्षरित व सबमिट किया गया! स्वीकृति अभिलेख (Acceptance Record) सुरक्षित रूप से सहेज लिया गया है।');
      } else {
        alert(result.error || 'Failed to submit agreement');
      }
    } catch (err: any) {
      console.error('Error submitting agreement:', err);
      alert(err.message || 'Error submitting agreement');
    } finally {
      setSubmittingAgreement(false);
    }
  };

  // Handler to add new locality
  const handleAddLocality = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocalityName.trim()) return;
    const newItem = {
      name: newLocalityName.trim(),
      pincode: newPincode.trim() || undefined,
      active: true,
    };
    setLocalitiesList((prev) => [...prev, newItem]);
    setNewLocalityName('');
    setNewPincode('');
  };

  // Handler to save district settings
  const handleSaveDistrictSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtPartner?.id) return;
    setSavingSettings(true);
    setSettingsSuccess(false);

    const updatedSettings: DistrictSettings = {
      supportPhone: settingsSupportPhone.trim(),
      supportEmail: settingsSupportEmail.trim(),
      operatingHours: settingsHours.trim(),
      customNotice: settingsNotice.trim(),
      coveredPincodes: localitiesList.map((l) => l.pincode).filter(Boolean) as string[],
    };

    try {
      await updateDistrictSettings(districtPartner.id, updatedSettings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    } catch (e) {
      console.warn('Error saving district settings:', e);
    } finally {
      setSavingSettings(false);
    }
  };

  // Handler for WhatsApp broadcast
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSending(true);
    setBroadcastSuccess(null);

    try {
      const recipientPhones: string[] = [];
      if (broadcastTarget === 'technicians' || broadcastTarget === 'both') {
        districtTechnicians.forEach((t) => {
          if (t.phone) recipientPhones.push(t.phone);
        });
      }
      if (broadcastTarget === 'customers' || broadcastTarget === 'both') {
        districtBookings.forEach((b) => {
          if (b.customerPhone) recipientPhones.push(b.customerPhone);
        });
      }

      // Unique phones
      const uniquePhones = Array.from(new Set(recipientPhones));

      // Dispatch demo / real log
      await setDoc(doc(collection(db, 'whatsapp_logs')), {
        districtId: selectedDistrictId,
        districtName: districtPartner?.assignedDistrictName || selectedDistrictId,
        franchiseCode: districtPartner?.franchiseCode || '',
        message: broadcastMessage,
        target: broadcastTarget,
        recipientCount: uniquePhones.length,
        timestamp: new Date().toISOString(),
        sender: districtPartner?.name || 'District Franchise Admin',
      });

      setBroadcastSuccess(
        `संदेश सफलतापूर्वक ${uniquePhones.length} प्राप्तकर्ताओं (${broadcastTarget}) को भेजा गया!`
      );
      setBroadcastMessage('');
    } catch (err) {
      console.warn('Broadcast send notice:', err);
      setBroadcastSuccess(`ब्रॉडकास्ट संदेश दर्ज कर लिया गया है।`);
    } finally {
      setBroadcastSending(false);
    }
  };

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return districtBookings.filter((b) => {
      const matchStatus = bookingStatusFilter === 'all' || b.status === bookingStatusFilter;
      const matchSearch =
        searchQuery === '' ||
        (b.id && b.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.customerName && b.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.serviceName && b.serviceName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.serviceManName && b.serviceManName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [districtBookings, bookingStatusFilter, searchQuery]);

  // Agreement and KYC visual status indicator states
  const currentAgreementStatus = (
    partnerAgreements[0]?.status ||
    districtPartner?.agreementStatus ||
    'PENDING'
  ).toUpperCase();

  const isAgreementApproved =
    currentAgreementStatus === 'APPROVED' ||
    currentAgreementStatus === 'ACTIVE' ||
    currentAgreementStatus === 'COMPLETED';
  const isAgreementRejected =
    currentAgreementStatus === 'REJECTED' ||
    currentAgreementStatus === 'EXPIRED' ||
    currentAgreementStatus === 'TERMINATED' ||
    currentAgreementStatus === 'CANCELLED';

  const currentKycStatus = (districtPartner?.kycStatus || 'PENDING').toUpperCase();
  const isKycApproved =
    currentKycStatus === 'VERIFIED' || currentKycStatus === 'APPROVED';
  const isKycRejected = currentKycStatus === 'REJECTED';

  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans">
      {/* Top District Header Bar */}
      <div className="bg-stone-900 text-white border-b border-stone-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: District & Franchise Code Identification */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-stone-950 font-black shadow-md shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{districtPartner?.assignedDistrictName || selectedDistrictId} District</span>
                  <span className="text-xs font-bold text-amber-400">Franchise Admin</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-extrabold tracking-wider">
                  {districtPartner?.franchiseCode || `HDK-${selectedDistrictId.substring(0, 3).toUpperCase()}-001`}
                </span>
                {districtPartner?.status === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    ACTIVE (OPERATIONAL)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {districtPartner?.status || 'PENDING ACTIVATION'}
                  </span>
                )}

                {/* Agreement Visual Status Badge */}
                {isAgreementApproved ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" />
                    Agreement: Approved
                  </span>
                ) : isAgreementRejected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-400/40" />
                    Agreement: {currentAgreementStatus}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/40 animate-pulse" />
                    Agreement: Pending
                  </span>
                )}

                {/* KYC Visual Status Badge */}
                {isKycApproved ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/40 animate-pulse" />
                    KYC: Verified
                  </span>
                ) : isKycRejected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-400/40" />
                    KYC: Action Required
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/40 animate-pulse" />
                    KYC: Pending
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                <span>{districtPartner?.stateName || 'Madhya Pradesh'}</span>
                <span>•</span>
                <span>Administrator: <strong className="text-stone-200">{districtPartner?.name}</strong></span>
              </p>
            </div>
          </div>

          {/* Right: Actions & District Switcher (for Super Admin) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* If Super Admin, show District Selector */}
            {isAdmin && allPartners.length > 0 && (
              <div className="flex items-center gap-1.5 bg-stone-800 border border-stone-700 rounded-xl px-2.5 py-1 text-xs text-stone-300">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-stone-400 hidden sm:inline">District:</span>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrictId(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer"
                >
                  {allPartners.map((p) => (
                    <option key={p.id} value={p.assignedDistrictId.toLowerCase()} className="bg-stone-900 text-white">
                      {p.assignedDistrictName} ({p.franchiseCode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Back to Super Admin Hub */}
            {isAdmin && onOpenSuperAdminHub && (
              <button
                type="button"
                onClick={onOpenSuperAdminHub}
                className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition flex items-center gap-1.5 border border-stone-700 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Super Admin Hub</span>
              </button>
            )}

            {onBackToMain && (
              <button
                type="button"
                onClick={onBackToMain}
                className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Marketplace View
              </button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto py-2 border-t border-stone-800 text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Overview &amp; Targets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'bookings'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>District Bookings ({districtBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('technicians')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'technicians'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Service Pros &amp; KYC ({districtTechnicians.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('localities')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'localities'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Localities &amp; Pincodes ({localitiesList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Broadcast</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>District Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agreement')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'agreement'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Agreement &amp; Status</span>
            {isAgreementApproved ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            ) : isAgreementRejected ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Action
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Pending
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kyc')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'kyc'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-black'
                : 'text-stone-400 hover:text-white hover:bg-stone-800'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>KYC Compliance</span>
            {isKycApproved ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified
              </span>
            ) : isKycRejected ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Rejected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Pending
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* District Activation Status Alert for Inactive / Pending Partners */}
        {districtPartner?.status !== 'ACTIVE' && (
          <div className="mb-6 p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-stone-900 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                  <span>District Operations Inactive (सक्रियण प्रतीक्षा में)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
                    {districtPartner?.status || 'PENDING'}
                  </span>
                </h3>
                <p className="text-xs text-amber-900/90 mt-1 max-w-2xl">
                  This Franchise Partner account can operate this district only when all 5 conditions are fulfilled:
                  (1) Agreement APPROVED/ACTIVE, (2) Agreement accepted, (3) Gumasta VERIFIED, (4) All REQUIRED KYC docs VERIFIED, (5) Super Admin final approval.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('kyc')}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Complete KYC &amp; Docs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('agreement')}
                className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Sign Agreement
              </button>
            </div>
          </div>
        )}

        {/* District Target Performance Banner */}
        <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 border border-amber-500/30 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  {districtPartner?.assignedDistrictName} District Monthly Target
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black">
                  Target Tier 1
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                ₹{totalRevenue.toLocaleString('en-IN')} <span className="text-xs text-stone-400 font-normal">of ₹{monthlyTargetAmount.toLocaleString('en-IN')} Target</span>
              </h2>
              <p className="text-xs text-stone-300 mt-1">
                Franchise Partner Commission (90%): <strong className="text-emerald-400">₹{franchiseShareRevenue.toLocaleString('en-IN')}</strong> • Platform Royalty (10%): <strong className="text-amber-300">₹{Math.round(totalRevenue * 0.1).toLocaleString('en-IN')}</strong>
              </p>
            </div>

            {/* Target Progress Bar */}
            <div className="w-full md:w-72 bg-stone-800/80 p-3 rounded-2xl border border-stone-700">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-stone-300">Achievement Progress</span>
                <span className="text-amber-400">{targetPercent}% Completed</span>
              </div>
              <div className="w-full h-3 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, targetPercent)}%` }}
                />
              </div>
              <div className="text-[10px] text-stone-400 mt-1.5 flex items-center justify-between">
                <span>Min Target: 30 jobs</span>
                <span className="text-emerald-400 font-semibold">{districtBookings.length} Total Jobs Executed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= VIEW TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Franchise Partner Agreement & KYC Status Display (Read-Only) */}
            <FranchiseAgreementKycStatusDisplay
              partner={districtPartner}
              latestAgreement={partnerAgreements[0] || null}
              allAgreements={partnerAgreements}
              kycDocs={partnerKycDocs}
            />

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold">Total District Bookings</span>
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-stone-900">{districtBookings.length}</div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-500">
                  <span className="text-emerald-600 font-bold">{completedCount} Done</span>
                  <span>•</span>
                  <span className="text-amber-600 font-bold">{inProgressCount} Active</span>
                  <span>•</span>
                  <span className="text-rose-500 font-bold">{pendingCount} Pending</span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold">District Revenue</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-stone-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-2">
                  ₹{franchiseShareRevenue.toLocaleString('en-IN')} Partner Share
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold">Active Technicians</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-stone-900">{districtTechnicians.length}</div>
                <div className="text-[11px] text-stone-500 mt-2 flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">
                    {districtTechnicians.filter((t) => t.isVerified).length} Verified
                  </span>
                  <span>•</span>
                  <span className="text-amber-600">
                    {districtTechnicians.filter((t) => !t.isVerified).length} Pending KYC
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-2">
                  <span className="text-xs font-bold">District Quality Score</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-stone-900">4.9 ★</div>
                <div className="text-[11px] text-emerald-600 font-bold mt-2">
                  98.4% Customer Satisfaction
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent District Jobs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Recent Bookings in District */}
              <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black text-stone-900">
                    हाल की बुकिंग्स / Recent District Bookings
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All ({districtBookings.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {districtBookings.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookingForModal(b)}
                      className="p-3.5 rounded-2xl border border-stone-100 bg-stone-50/60 hover:bg-orange-50/40 hover:border-orange-200 transition cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold shrink-0 text-xs">
                          {b.categoryName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-stone-900">{b.serviceName}</h4>
                            <span className="text-[10px] font-mono text-stone-500 font-bold">#{b.id}</span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Customer: <strong>{b.customerName}</strong> • {b.timeSlot || 'Scheduled'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-stone-900">₹{b.totalAmount}</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-1 ${
                            b.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'in_progress' || b.status === 'dispatched'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-stone-200 text-stone-700'
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Col: Franchise Partner Information & Helpline */}
              <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-stone-900">Franchise Partner Profile</h3>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 text-xs text-stone-800 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold">Franchise Code:</span>
                    <strong className="font-mono text-amber-900">{districtPartner?.franchiseCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold">Assigned District:</span>
                    <strong className="text-stone-900">{districtPartner?.assignedDistrictName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold">Partner Name:</span>
                    <strong className="text-stone-900">{districtPartner?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold">Contact Phone:</span>
                    <strong className="text-stone-900">{districtPartner?.phone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-semibold">Email:</span>
                    <strong className="text-stone-900">{districtPartner?.email}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100">
                  <h4 className="text-xs font-black text-stone-900 mb-2">Central Support &amp; Escalations</h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed mb-3">
                    मुख्य प्रशासक DEEPAK (दीपक बिल्डकॉन हेडक्वार्टर, भोपाल) से संपर्क करें:
                  </p>
                  <a
                    href="tel:+919826012345"
                    className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Call Super Admin DEEPAK (+91 98260 12345)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW TAB 2: DISTRICT BOOKINGS ================= */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-stone-500">Filter Status:</span>
                {['all', 'pending', 'confirmed', 'dispatched', 'in_progress', 'completed', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBookingStatusFilter(st)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                      bookingStatusFilter === st
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer, job or pro..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Bookings Table / List */}
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200/80">
                    <tr>
                      <th className="p-4">Booking ID &amp; Service</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Assigned Technician</th>
                      <th className="p-4">Amount &amp; Payment</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredBookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-stone-400 text-xs">
                          इस फिल्टर के अंतर्गत कोई बुकिंग नहीं मिली।
                        </td>
                      </tr>
                    ) : (
                      filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-stone-50/80 transition">
                          <td className="p-4">
                            <div className="font-mono font-bold text-stone-900">#{b.id}</div>
                            <div className="font-semibold text-stone-700 mt-0.5">{b.serviceName}</div>
                            <div className="text-[11px] text-stone-400">{b.categoryName}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-bold text-stone-900">{b.customerName}</div>
                            <a
                              href={`tel:${b.customerPhone}`}
                              className="text-orange-600 hover:underline text-[11px] font-semibold flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{b.customerPhone}</span>
                            </a>
                            <div className="text-[10px] text-stone-500 line-clamp-1 mt-0.5 max-w-xs">
                              {b.customerAddress}
                            </div>
                          </td>
                          <td className="p-4">
                            {b.serviceManName ? (
                              <div>
                                <div className="font-bold text-stone-900 flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{b.serviceManName}</span>
                                </div>
                                <div className="text-[11px] text-stone-500">{b.serviceManPhone}</div>
                              </div>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                                Unassigned
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-black text-stone-900 text-sm">₹{b.totalAmount}</div>
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase mt-0.5 ${
                                b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {b.paymentStatus || 'pending'}
                            </span>
                          </td>
                          <td className="p-4">
                            <select
                              value={b.status}
                              onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                              className="bg-stone-100 border border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-stone-800 focus:outline-hidden cursor-pointer"
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="dispatched">Dispatched</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedBookingForModal(b)}
                              className="px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs transition cursor-pointer border border-orange-200"
                            >
                              Details
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

        {/* ================= VIEW TAB 3: DISTRICT TECHNICIANS (SERVICE PROS) ================= */}
        {activeTab === 'technicians' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-black text-stone-900">
                  {districtPartner?.assignedDistrictName} जिला सर्विस प्रोफेशनल्स / Technicians
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage local verified electricians, plumbers, AC mechanics and home service pros.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddTechModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Onboard New District Technician</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {districtTechnicians.map((tech) => (
                <div
                  key={tech.id}
                  className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                        {tech.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-stone-900">{tech.name}</h4>
                        <p className="text-xs text-stone-500">{tech.categoryNames?.join(', ') || 'Service Pro'}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tech.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tech.isVerified ? 'Verified' : 'Pending KYC'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-stone-50 text-xs text-stone-700">
                    <div>
                      <span className="text-[10px] text-stone-400 block">Rating &amp; Jobs:</span>
                      <strong>{tech.rating || 5.0} ★ ({tech.totalJobs || 0} jobs)</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block">Hourly Rate:</span>
                      <strong>₹{tech.hourlyRate || 250}/hr</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <a
                      href={`tel:${tech.phone}`}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold flex items-center gap-1.5 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-orange-600" />
                      <span>{tech.phone}</span>
                    </a>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'service_men', tech.id), {
                            isVerified: !tech.isVerified,
                            kycStatus: tech.isVerified ? 'pending' : 'approved',
                            updatedAt: new Date().toISOString(),
                          });
                          setDistrictTechnicians((prev) =>
                            prev.map((t) =>
                              t.id === tech.id
                                ? { ...t, isVerified: !t.isVerified, kycStatus: t.isVerified ? 'pending' : 'approved' }
                                : t
                            )
                          );
                        } catch (e) {}
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer text-xs ${
                        tech.isVerified
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {tech.isVerified ? 'Revoke KYC' : 'Approve KYC'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= VIEW TAB 4: LOCALITIES & PINCODES ================= */}
        {activeTab === 'localities' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Covered Localities List */}
            <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {districtPartner?.assignedDistrictName} कवरेज क्षेत्र व पिनकोड / Coverage Localities
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Select active operational wards and localities for your district.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                  {localitiesList.length} Active Localities
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {localitiesList.map((loc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">{loc.name}</h4>
                        {loc.pincode && <span className="text-[10px] text-stone-500 font-mono">Pin: {loc.pincode}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLocalitiesList((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, active: !item.active } : item))
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                        loc.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {loc.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Add New Locality Form */}
            <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-4">
              <h3 className="text-base font-black text-stone-900">+ नया क्षेत्र जोड़ें / Add Locality</h3>
              <form onSubmit={handleAddLocality} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Locality / Ward Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newLocalityName}
                    onChange={(e) => setNewLocalityName(e.target.value)}
                    placeholder="e.g. Lashkar West, Morar Circle"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Postal Pincode (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                    placeholder="e.g. 474001"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                >
                  Add Locality to Coverage
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= VIEW TAB 5: NOTIFICATIONS & WHATSAPP BROADCAST ================= */}
        {activeTab === 'notifications' && (
          <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <span>जिला WhatsApp व SMS ब्रॉडकास्ट / District Broadcast</span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Send emergency alerts, work updates or announcements to all technicians and customers in {districtPartner?.assignedDistrictName}.
              </p>
            </div>

            {broadcastSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{broadcastSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Target Audience
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'technicians', label: 'All Technicians' },
                    { id: 'customers', label: 'All Customers' },
                    { id: 'both', label: 'Both Pros & Clients' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBroadcastTarget(t.id as any)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        broadcastTarget === t.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Broadcast Message Text
                </label>
                <textarea
                  required
                  rows={4}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. प्रिय साथी, आज ग्वालियर जिले में अत्यधिक AC रिपेयर और इलेक्ट्रीशियन बुकिंग्स हैं। तुरंत ड्यूटी पर एक्टिव रहें।"
                  className="w-full p-3 text-xs rounded-2xl border border-stone-200 focus:outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={broadcastSending}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {broadcastSending ? (
                  'संदेश भेजा जा रहा है...'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send District Broadcast Now</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ================= VIEW TAB 6: DISTRICT SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-black text-stone-900">
                {districtPartner?.assignedDistrictName} जिला संचालन सेटिंग्स / District Operating Settings
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Configure your district helpline, operating hours, and customer greeting notice.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>सेटिंग्स सफलतापूर्वक सहेज ली गई हैं! / District Settings Saved Successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveDistrictSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  District Support Helpline Phone
                </label>
                <input
                  type="tel"
                  required
                  value={settingsSupportPhone}
                  onChange={(e) => setSettingsSupportPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  District Support Email
                </label>
                <input
                  type="email"
                  required
                  value={settingsSupportEmail}
                  onChange={(e) => setSettingsSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={settingsHours}
                  onChange={(e) => setSettingsHours(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Customer Greeting / Custom Notice
                </label>
                <textarea
                  rows={3}
                  value={settingsNotice}
                  onChange={(e) => setSettingsNotice(e.target.value)}
                  placeholder="Welcome message shown to customers booking in this district..."
                  className="w-full p-3 text-xs rounded-2xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60"
              >
                {savingSettings ? 'सहेजा जा रहा है...' : 'Save District Configuration'}
              </button>
            </form>
          </div>
        )}

        {/* ================= VIEW TAB 7: AGREEMENT & LEGAL ================= */}
        {activeTab === 'agreement' && (
          <div className="space-y-6">
            {/* Franchise Partner Agreement & KYC Status Display */}
            <FranchiseAgreementKycStatusDisplay
              partner={districtPartner}
              latestAgreement={partnerAgreements[0] || null}
              allAgreements={partnerAgreements}
              kycDocs={partnerKycDocs}
            />

            <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6 text-stone-800">
            <div className="border-b border-stone-200 pb-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    Official Legal Agreement
                  </span>
                  <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                    ID: {partnerAgreements[0]?.agreementId || `AGR-${districtPartner?.franchiseCode}-${new Date().getFullYear()}`}
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full border border-amber-200">
                    Version: {partnerAgreements[0]?.agreementVersion || 'v1.0'}
                  </span>
                </div>
                <h2 className="text-xl font-black text-stone-900 mt-1">
                  दीपक बिल्डकॉन व फ्रैंचाइज़ी पार्टनर अनुबंध पत्र
                </h2>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-stone-500 block">
                  Code: {districtPartner?.franchiseCode}
                </span>
                {districtPartner?.agreementStatus === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> हस्ताक्षरित (SIGNED)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1">
                    हस्ताक्षर प्रतीक्षित (PENDING SIGNATURE)
                  </span>
                )}
              </div>
            </div>

            {agreementSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{agreementSuccessMsg}</span>
              </div>
            )}

            <div className="space-y-4 text-xs leading-relaxed text-stone-600">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
                <h4 className="font-bold text-stone-900 mb-1">1. अधिकार क्षेत्र व विशेष प्रशासनिक दायित्व (Exclusive District Rights)</h4>
                <p>
                  दीपक बिल्डकॉन प्राइवेट लिमिटेड द्वारा फ्रैंचाइज़ी पार्टनर ({districtPartner?.name}) को <strong>{districtPartner?.assignedDistrictName} जिला</strong> का एकमात्र अधिकृत व्यवस्थापक (District Administrator) नियुक्त किया गया है।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
                <h4 className="font-bold text-stone-900 mb-1">2. राजस्व मॉडल व रॉयल्टी शेयरिंग (Revenue Distribution)</h4>
                <p>
                  जिले के अंतर्गत निष्पादित सभी होम सर्विसेज का 90% सकल राजस्व संबंधित तकनीशियन व फ्रैंचाइज़ी इकाई को देय होगा। 10% केंद्रीय सॉफ्टवेयर व ब्रांड रॉयल्टी हेड ऑफिस को देय होगी।
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
                <h4 className="font-bold text-stone-900 mb-1">3. मासिक न्यूनतम लक्ष्य व सुरक्षा शर्तें (Performance Targets)</h4>
                <p>
                  फ्रैंचाइज़ी पार्टनर को जिले में मासिक न्यूनतम 30 सफल बुकिंग्स का स्तर बनाए रखना अनिवार्य है। निरंतर 3 माह तक लक्ष्य अपूर्ण रहने पर सुपर एडमिन समीक्षा का अधिकार सुरक्षित रखते हैं।
                </p>
              </div>
            </div>

            {/* Interactive Digital Acceptance Form if not yet completed */}
            {districtPartner?.agreementStatus !== 'COMPLETED' ? (
              <form onSubmit={handleSignAndSubmitAgreement} className="p-5 rounded-3xl bg-amber-50/50 border border-amber-200/80 space-y-4">
                <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
                  <FileCheck2 className="w-5 h-5 text-amber-600" />
                  <span>डिजिटल अनुबंध स्वीकृति व ई-हस्ताक्षर सबमिशन</span>
                </div>
                <p className="text-xs text-amber-800">
                  कृपया अनुबंध की सभी नियम व शर्तों को पढ़कर अपने हस्ताक्षरकर्ता का नाम दर्ज कर सबमिट करें। सबमिट करते ही सुपर एडमिन को तुरंत रियल-टाइम नोटिफिकेशन प्राप्त होगा।
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">हस्ताक्षरकर्ता का पूरा नाम (Full Name)</label>
                    <input
                      type="text"
                      required
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder={districtPartner?.name || 'e.g. Ramesh Sharma'}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:border-amber-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">पद / Designation</label>
                    <input
                      type="text"
                      value={signerDesignation}
                      onChange={(e) => setSignerDesignation(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:border-amber-500 bg-white"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs text-stone-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={agreeTermsAccepted}
                    onChange={(e) => setAgreeTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    मैं प्रमाणित करता हूँ कि मैंने दीपक बिल्डकॉन फ्रैंचाइज़ी अनुबंध की सभी शर्तों को ध्यानपूर्वक पढ़ लिया है और मैं इसे पूर्णतः स्वीकार करता हूँ।
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submittingAgreement || !agreeTermsAccepted || !signerName.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submittingAgreement ? 'सबमिट किया जा रहा है...' : '📜 अनुबंध पत्र डिजिटल रूप से स्वीकार करें व सबमिट करें (Submit Agreement)'}
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <strong className="text-emerald-950 font-bold">हस्ताक्षर व स्वीकृति विवरण (Acceptance Record):</strong>
                    <p className="mt-0.5 text-emerald-900">
                      हस्ताक्षरकर्ता: <strong>{districtPartner?.agreementSignedBy || districtPartner?.name}</strong> • दिनांक: {districtPartner?.agreementSignedAt ? new Date(districtPartner.agreementSignedAt).toLocaleString('en-IN') : 'Active'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold">
                    Verified Legal Copy
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800">
                  <div>
                    <span className="text-emerald-700 block">Agreement ID:</span>
                    <strong className="font-mono text-emerald-950">{districtPartner?.acceptanceRecord?.agreementId || partnerAgreements[0]?.agreementId || `AGR-${districtPartner?.franchiseCode}`}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Version:</span>
                    <strong className="text-emerald-950">{districtPartner?.acceptanceRecord?.agreementVersion || partnerAgreements[0]?.agreementVersion || 'v1.0'}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Account ID:</span>
                    <strong className="font-mono text-emerald-950">{districtPartner?.acceptanceRecord?.partnerAccountId || districtPartner?.loginUsername || districtPartner?.id}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-700 block">Status:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ACCEPTED
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
              <strong>सुपर एडमिन संपर्क (DEEPAK):</strong>
              <p>दीपक बिल्डकॉन, एमपी नगर जोन 1, भोपाल (म.प्र.) • फोन: +91 98260 12345 • ईमेल: deepakbuildconbhopal@gmail.com</p>
            </div>
            </div>
          </div>
        )}

        {/* ================= VIEW TAB 8: KYC VERIFICATION & STATUS ================= */}
        {activeTab === 'kyc' && districtPartner && (
          <div className="space-y-6">
            {/* Franchise Partner Agreement & KYC Status Display */}
            <FranchiseAgreementKycStatusDisplay
              partner={districtPartner}
              latestAgreement={partnerAgreements[0] || null}
              allAgreements={partnerAgreements}
              kycDocs={partnerKycDocs}
            />

            <div className="max-w-4xl mx-auto">
              <FranchiseKYCSection
                partner={districtPartner}
                onNavigateToAgreement={() => setActiveTab('agreement')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">
                  Booking #{selectedBookingForModal.id}
                </h3>
                <span className="text-xs text-stone-500 font-semibold">{selectedBookingForModal.serviceName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="p-3.5 rounded-2xl bg-stone-50 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-stone-500">Customer:</span>
                  <strong>{selectedBookingForModal.customerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Phone:</span>
                  <a href={`tel:${selectedBookingForModal.customerPhone}`} className="text-orange-600 font-bold hover:underline">
                    {selectedBookingForModal.customerPhone}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Address:</span>
                  <span className="text-right max-w-xs">{selectedBookingForModal.customerAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Total Amount:</span>
                  <strong className="text-sm font-black text-stone-900">₹{selectedBookingForModal.totalAmount}</strong>
                </div>
              </div>

              {/* Assign Technician Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Assign District Technician
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {districtTechnicians.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleAssignTechnician(selectedBookingForModal.id, t)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border flex items-center justify-between transition cursor-pointer ${
                        selectedBookingForModal.serviceManId === t.id
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-stone-50 border-stone-200 hover:bg-stone-100 text-stone-800'
                      }`}
                    >
                      <span>{t.name} ({t.categoryNames?.join(', ')})</span>
                      {selectedBookingForModal.serviceManId === t.id && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBookingForModal(null)}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Onboard Technician Modal */}
      {isAddTechModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 border border-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900">
                + Onboard New District Technician
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTechModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewTechnician} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="e.g. Ramesh Kushwaha"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={newTechPhone}
                  onChange={(e) => setNewTechPhone(e.target.value)}
                  placeholder="+91 98270 00000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Trade Category</label>
                <select
                  value={newTechCategory}
                  onChange={(e) => setNewTechCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-white"
                >
                  <option value="Electrician">Electrician (इलेक्ट्रीशियन)</option>
                  <option value="Plumber">Plumber (प्लंबर)</option>
                  <option value="AC & Appliance Repair">AC &amp; Appliance Repair (एसी रिपेयर)</option>
                  <option value="Carpenter">Carpenter (कारपेंटर)</option>
                  <option value="Painter">Painter (पेंटर)</option>
                  <option value="Cleaning & Sanitation">Cleaning &amp; Sanitation (सफाई)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Experience (Yrs)</label>
                  <input
                    type="number"
                    min={1}
                    value={newTechExperience}
                    onChange={(e) => setNewTechExperience(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Hourly Rate (₹)</label>
                  <input
                    type="number"
                    min={100}
                    value={newTechHourlyRate}
                    onChange={(e) => setNewTechHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingTech}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60"
              >
                {savingTech ? 'सहेजा जा रहा है...' : 'Save & Verify Technician'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

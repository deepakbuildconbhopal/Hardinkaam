import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Calendar,
  ShieldCheck,
  Plus,
  History,
  Building,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  RefreshCw,
  Award,
  DollarSign,
  Percent,
  AlertOctagon,
  XCircle,
  Search,
  Edit3,
  Ban,
  Check,
  Filter,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Eye,
  UploadCloud,
  Download,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { FranchisePartner, FranchiseAgreementRecord } from '../../types';
import {
  getFranchiseAgreements,
  renewFranchiseAgreement,
  terminateFranchiseAgreement,
  cancelAgreementTermination,
  updateAgreementFinancials,
  approveFranchiseAgreement,
  rejectFranchiseAgreement,
  cancelFranchiseAgreement,
  subscribeAllFranchiseAgreements,
  uploadFranchiseAgreementDocument,
  removeFranchiseAgreementDocument,
} from '../../services/franchiseKycService';
import { subscribeAllFranchisePartners } from '../../services/franchisePartnerService';
import {
  notifyAdminAgreementRenewalDue,
  notifyAdminAgreementExpired,
} from '../../services/adminNotificationService';
import {
  notifyFranchisePartnerRenewalDue,
  notifyFranchisePartnerAgreementSent,
} from '../../services/franchiseNotificationService';

interface Props {
  adminName?: string;
  initialStatusFilter?: string;
}

export const AdminAgreementHistory: React.FC<Props> = ({
  adminName = 'Super Admin DEEPAK',
  initialStatusFilter,
}) => {
  const [partners, setPartners] = useState<FranchisePartner[]>([]);
  const [allAgreements, setAllAgreements] = useState<FranchiseAgreementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter States (Franchise Partner, District, Agreement Status, Agreement Year, Start Date, End Date)
  const [searchQuery, setSearchQuery] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || 'ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [viewMode, setViewMode] = useState<'agreements' | 'partners'>('agreements');

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);
  
  // Selected partner for viewing agreement history & renewal modal
  const [selectedPartner, setSelectedPartner] = useState<FranchisePartner | null>(null);
  const [partnerAgreements, setPartnerAgreements] = useState<FranchiseAgreementRecord[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(false);

  // Renewal Modal State
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [newAgreementId, setNewAgreementId] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newCharges, setNewCharges] = useState<number>(50000);
  const [newCommission, setNewCommission] = useState<number>(10);
  const [newProfit, setNewProfit] = useState<number>(20);
  const [newTerms, setNewTerms] = useState(
    'दीपक बिल्डकॉन प्राइवेट लिमिटेड एवं फ्रैंचाइज़ी पार्टनर के मध्य नवीनीकृत वार्षिक अनुबंध। सभी नियम एवं शर्तें यथावत लागू रहेंगी।'
  );
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Financials Modal State
  const [isEditFinModalOpen, setIsEditFinModalOpen] = useState(false);
  const [selectedAgrForEditFin, setSelectedAgrForEditFin] = useState<FranchiseAgreementRecord | null>(null);
  const [editCharges, setEditCharges] = useState<number>(50000);
  const [editCommission, setEditCommission] = useState<number>(10);
  const [editProfit, setEditProfit] = useState<number>(20);
  const [submittingEditFin, setSubmittingEditFin] = useState(false);

  const handleOpenEditFinancials = (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    if (partner) {
      setSelectedPartner(partner);
    }
    setSelectedAgrForEditFin(agr);
    setEditCharges(agr.charges || 50000);
    setEditCommission(agr.commissionPercent || 10);
    setEditProfit(agr.profitPercentage || 20);
    setIsEditFinModalOpen(true);
  };

  const handleSaveFinancials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgrForEditFin || !selectedPartner) return;

    try {
      setSubmittingEditFin(true);
      const res = await updateAgreementFinancials(
        selectedAgrForEditFin.id,
        selectedPartner.id,
        selectedPartner.assignedDistrictId,
        selectedPartner.assignedDistrictName,
        editCharges,
        editCommission,
        editProfit,
        adminName
      );

      if (res.success) {
        setIsEditFinModalOpen(false);
        await loadAgreementsForPartner(selectedPartner.id);
      } else {
        alert(res.error || 'Failed to update financials');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating agreement financials');
    } finally {
      setSubmittingEditFin(false);
    }
  };

  // Termination Modal State
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [selectedAgreementForTerm, setSelectedAgreementForTerm] = useState<FranchiseAgreementRecord | null>(null);
  const [termReason, setTermReason] = useState('Violation of operational guidelines and payment delays.');
  const [termNoticeDate, setTermNoticeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [termNoticePeriodDays, setTermNoticePeriodDays] = useState<number>(30);
  const [termEffectiveDate, setTermEffectiveDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [termNotes, setTermNotes] = useState('Formal termination notice issued as per agreement clause 14.2.');
  const [submittingTermination, setSubmittingTermination] = useState(false);

  // Approve Agreement Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedAgrForApprove, setSelectedAgrForApprove] = useState<FranchiseAgreementRecord | null>(null);
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Reject Agreement Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedAgrForReject, setSelectedAgrForReject] = useState<FranchiseAgreementRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('Agreement terms or financial criteria not met.');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Cancel Agreement Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAgrForCancel, setSelectedAgrForCancel] = useState<FranchiseAgreementRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by Super Admin due to administrative review.');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Franchise Agreement Document Upload Modal State
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [selectedAgrForUploadDoc, setSelectedAgrForUploadDoc] = useState<FranchiseAgreementRecord | null>(null);
  const [selectedPartnerForUpload, setSelectedPartnerForUpload] = useState<FranchisePartner | null>(null);
  const [uploadDocFile, setUploadDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);
  const [uploadSuccessToast, setUploadSuccessToast] = useState<string | null>(null);

  // Franchise Agreement Document Preview Modal State
  const [isPreviewDocModalOpen, setIsPreviewDocModalOpen] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('');
  const [previewDocType, setPreviewDocType] = useState<string>('application/pdf');

  // Auto calculate effective date when notice date or notice period changes
  useEffect(() => {
    if (termNoticeDate && termNoticePeriodDays) {
      const nd = new Date(termNoticeDate);
      nd.setDate(nd.getDate() + Number(termNoticePeriodDays));
      setTermEffectiveDate(nd.toISOString().split('T')[0]);
    }
  }, [termNoticeDate, termNoticePeriodDays]);

  // Load partners and all agreements from Firestore real-time
  useEffect(() => {
    const unsubPartners = subscribeAllFranchisePartners((list) => {
      setPartners(list);
      setLoading(false);
    });

    const unsubAgreements = subscribeAllFranchiseAgreements((list) => {
      setAllAgreements(list);
    });

    return () => {
      unsubPartners();
      unsubAgreements();
    };
  }, []);

  // Partner fast lookup map
  const partnerMap = useMemo(() => {
    const map = new Map<string, FranchisePartner>();
    partners.forEach((p) => {
      map.set(p.id, p);
      if (p.assignedDistrictId) map.set(p.assignedDistrictId.toLowerCase(), p);
      if (p.franchiseCode) map.set(p.franchiseCode.toLowerCase(), p);
    });
    return map;
  }, [partners]);

  // Helper to compute display status of an agreement
  const getAgreementComputedStatus = (agr: FranchiseAgreementRecord): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = agr.startDate ? new Date(agr.startDate) : new Date(0);
    startDate.setHours(0, 0, 0, 0);

    const endDate = agr.endDate ? new Date(agr.endDate) : new Date();
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isApproved = agr.status === 'APPROVED' || agr.status === 'ACTIVE' || Boolean(agr.approvedAt);
    const isPartnerAccepted =
      agr.termsAccepted === true ||
      Boolean(agr.signedAt) ||
      agr.status === 'ACCEPTED' ||
      agr.status === 'COMPLETED';
    const isStartDateReached = today.getTime() >= startDate.getTime();

    if (agr.status === 'TERMINATED') {
      return 'TERMINATED';
    } else if (agr.status === 'CANCELLED') {
      return 'CANCELLED';
    } else if (agr.status === 'REJECTED') {
      return 'REJECTED';
    } else if (agr.status === 'NOTICE_ISSUED' || agr.status === 'TERMINATION_PENDING') {
      return 'NOTICE_ISSUED';
    } else if (isApproved) {
      if (diffDays < 0) {
        return 'EXPIRED';
      } else if (isPartnerAccepted && isStartDateReached) {
        return 'ACTIVE';
      } else if (!isStartDateReached) {
        return 'APPROVED (Pending Start Date)';
      } else {
        return 'APPROVED';
      }
    } else {
      if (isPartnerAccepted) {
        return 'ACCEPTED (Pending Admin Approval)';
      } else {
        return 'PENDING SIGNATURE & APPROVAL';
      }
    }
  };

  // Helper to resolve a Partner for an Agreement
  const resolvePartnerForAgreement = (agr: FranchiseAgreementRecord): FranchisePartner | null => {
    if (!agr) return null;
    return (
      partnerMap.get(agr.franchisePartnerId) ||
      partnerMap.get(agr.districtId?.toLowerCase()) ||
      partnerMap.get(agr.franchiseCode?.toLowerCase()) ||
      partners.find(
        (p) =>
          p.id === agr.franchisePartnerId ||
          p.assignedDistrictId.toLowerCase() === agr.districtId.toLowerCase() ||
          p.franchiseCode.toLowerCase() === agr.franchiseCode.toLowerCase()
      ) ||
      null
    );
  };

  // Automated notification checks for Agreement Renewal Due & Agreement Expired
  useEffect(() => {
    if (allAgreements.length === 0) return;
    const notifiedKey = 'deepak_agr_notified_checks';
    const rawChecked = sessionStorage.getItem(notifiedKey);
    const checkedMap: Record<string, string> = rawChecked ? JSON.parse(rawChecked) : {};
    let hasNewCheck = false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    allAgreements.forEach((agr) => {
      if (!agr.endDate) return;
      if (agr.status === 'TERMINATED' || agr.status === 'CANCELLED' || agr.status === 'REJECTED') return;

      const endDate = new Date(agr.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const partner = resolvePartnerForAgreement(agr);
      const partnerName = partner?.name || agr.districtName + ' Franchise Partner';
      const partnerId = agr.franchisePartnerId;
      const districtId = agr.districtId;
      const districtName = agr.districtName;
      const franchiseCode = agr.franchiseCode;

      // Check if expired
      if (diffDays < 0) {
        const checkKey = `expired_${agr.id || agr.agreementId}`;
        if (!checkedMap[checkKey]) {
          checkedMap[checkKey] = new Date().toISOString();
          hasNewCheck = true;
          notifyAdminAgreementExpired({
            partnerId,
            partnerName,
            districtId,
            districtName,
            franchiseCode,
            agreementId: agr.agreementId,
            expiredOnDate: agr.endDate,
          }).catch((e) => console.debug('Expiry alert notice:', e));
        }
      }
      // Check if renewal is due within 30 days
      else if (diffDays <= 30 && diffDays >= 0) {
        const checkKey = `renewal_due_${agr.id || agr.agreementId}_${agr.endDate}`;
        if (!checkedMap[checkKey]) {
          checkedMap[checkKey] = new Date().toISOString();
          hasNewCheck = true;
          notifyAdminAgreementRenewalDue({
            partnerId,
            partnerName,
            districtId,
            districtName,
            franchiseCode,
            agreementId: agr.agreementId,
            renewalDueDate: agr.endDate,
            daysRemaining: diffDays,
          }).catch((e) => console.debug('Renewal alert notice:', e));

          notifyFranchisePartnerRenewalDue({
            partnerId,
            districtId,
            districtName,
            franchiseCode,
            agreementId: agr.agreementId,
            renewalDueDate: agr.endDate,
            daysRemaining: diffDays,
          }).catch((e) => console.debug('Partner renewal alert notice:', e));
        }
      }
    });

    if (hasNewCheck) {
      try {
        sessionStorage.setItem(notifiedKey, JSON.stringify(checkedMap));
      } catch (err) {
        console.debug('Storage notice:', err);
      }
    }
  }, [allAgreements, partners, partnerMap]);

  // Merged agreements (includes records from franchise_agreements and synthesized baseline records for any partner awaiting first renewal)
  const mergedAgreements = useMemo(() => {
    const list: FranchiseAgreementRecord[] = [...allAgreements];
    const existingPartnerIds = new Set(list.map((a) => a.franchisePartnerId));

    partners.forEach((p) => {
      if (!existingPartnerIds.has(p.id)) {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        const initialAgr: FranchiseAgreementRecord = {
          id: `partner_agr_${p.id}`,
          franchisePartnerId: p.id,
          franchiseCode: p.franchiseCode,
          districtId: p.assignedDistrictId,
          districtName: p.assignedDistrictName,
          agreementId: `HDK-AGR-${p.assignedDistrictId.toUpperCase()}-${currentYear}-${String(nextYear).slice(2)}`,
          versionNumber: 1,
          agreementVersion: 'Version 1',
          agreementYear: String(currentYear),
          startDate: `${currentYear}-04-01`,
          endDate: `${nextYear}-03-31`,
          charges: 50000,
          commissionPercent: 10,
          profitPercentage: 20,
          termsAndConditions: 'दीपक बिल्डकॉन प्राइवेट लिमिटेड एवं फ्रैंचाइज़ी पार्टनर के मध्य वार्षिक अनुबंध।',
          status: p.agreementStatus === 'COMPLETED' ? 'ACTIVE' : 'PENDING',
          signedAt: p.agreementSignedAt || (p.agreementStatus === 'COMPLETED' ? new Date().toISOString() : undefined),
          signedBy: p.agreementSignedBy || (p.agreementStatus === 'COMPLETED' ? 'Super Admin' : undefined),
          termsAccepted: p.agreementTermsAccepted || p.agreementStatus === 'COMPLETED',
          createdAt: p.createdAt || new Date().toISOString(),
          createdBy: 'System Initializer',
        };
        list.push(initialAgr);
      }
    });

    return list;
  }, [allAgreements, partners]);

  // Computed summary counts for Franchise Agreements (Total, Active, Pending Approval, Renewal Due, Expired, Terminated, Rejected)
  const agreementSummaryCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = 0;
    let active = 0;
    let pendingApproval = 0;
    let renewalDue = 0;
    let expired = 0;
    let terminated = 0;
    let rejected = 0;

    mergedAgreements.forEach((agr) => {
      total++;
      const computedStatus = getAgreementComputedStatus(agr);
      const endDate = agr.endDate ? new Date(agr.endDate) : null;
      if (endDate) endDate.setHours(0, 0, 0, 0);
      const diffDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      if (
        computedStatus === 'TERMINATED' ||
        agr.status === 'TERMINATED' ||
        computedStatus === 'NOTICE_ISSUED' ||
        agr.status === 'NOTICE_ISSUED' ||
        agr.status === 'TERMINATION_PENDING'
      ) {
        terminated++;
      } else if (computedStatus === 'REJECTED' || agr.status === 'REJECTED') {
        rejected++;
      } else if (computedStatus === 'EXPIRED' || agr.status === 'EXPIRED' || (endDate && diffDays < 0)) {
        expired++;
      } else if (
        diffDays >= 0 &&
        diffDays <= 30 &&
        (computedStatus === 'ACTIVE' || agr.status === 'ACTIVE' || agr.status === 'COMPLETED' || computedStatus.startsWith('APPROVED'))
      ) {
        renewalDue++;
        if (computedStatus === 'ACTIVE' || agr.status === 'ACTIVE' || agr.status === 'COMPLETED') {
          active++;
        }
      } else if (computedStatus === 'ACTIVE' || agr.status === 'ACTIVE' || (agr.status === 'COMPLETED' && diffDays >= 0)) {
        active++;
      } else if (
        computedStatus.includes('Pending') ||
        computedStatus.includes('PENDING') ||
        computedStatus.includes('ACCEPTED') ||
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
  }, [mergedAgreements]);

  // Distinct filter options extracted from real Firestore data
  const filterOptions = useMemo(() => {
    // 1. Franchise Partner Options
    const partnerList = partners.map((p) => ({
      id: p.id,
      name: `${p.name} (${p.assignedDistrictName} - ${p.franchiseCode})`,
    }));

    // 2. District Options
    const districtSet = new Set<string>();
    partners.forEach((p) => {
      if (p.assignedDistrictName) districtSet.add(p.assignedDistrictName);
    });
    mergedAgreements.forEach((a) => {
      if (a.districtName) districtSet.add(a.districtName);
    });
    const districtList = Array.from(districtSet).sort();

    // 3. Agreement Year Options
    const yearSet = new Set<string>();
    const currentYear = new Date().getFullYear();
    yearSet.add(String(currentYear - 1));
    yearSet.add(String(currentYear));
    yearSet.add(String(currentYear + 1));
    mergedAgreements.forEach((a) => {
      if (a.agreementYear) yearSet.add(String(a.agreementYear));
      if (a.startDate) yearSet.add(a.startDate.slice(0, 4));
      if (a.endDate) yearSet.add(a.endDate.slice(0, 4));
      if (a.agreementId) {
        const matches = a.agreementId.match(/\b(202\d)\b/g);
        if (matches) matches.forEach((m) => yearSet.add(m));
      }
    });
    const yearList = Array.from(yearSet).sort((a, b) => b.localeCompare(a));

    return {
      partners: partnerList,
      districts: districtList,
      years: yearList,
    };
  }, [partners, mergedAgreements]);

  // Filtered Agreements based on all 6 search & filter parameters
  const filteredAgreements = useMemo(() => {
    return mergedAgreements.filter((agr) => {
      const partner = resolvePartnerForAgreement(agr);
      const partnerName = partner?.name || '';
      const partnerPhone = partner?.phone || '';
      const partnerCode = agr.franchiseCode || partner?.franchiseCode || '';
      const districtName = agr.districtName || partner?.assignedDistrictName || '';
      const districtId = agr.districtId || partner?.assignedDistrictId || '';
      const computedStatus = getAgreementComputedStatus(agr);

      // 1. Franchise Partner Filter
      if (partnerFilter !== 'ALL') {
        const matchesPartner =
          agr.franchisePartnerId === partnerFilter ||
          partner?.id === partnerFilter ||
          partnerCode.toLowerCase() === partnerFilter.toLowerCase() ||
          partnerName.toLowerCase().includes(partnerFilter.toLowerCase());
        if (!matchesPartner) return false;
      }

      // 2. District Filter
      if (districtFilter !== 'ALL') {
        const matchesDistrict =
          districtId.toLowerCase() === districtFilter.toLowerCase() ||
          districtName.toLowerCase() === districtFilter.toLowerCase();
        if (!matchesDistrict) return false;
      }

      // 3. Agreement Status Filter
      if (statusFilter !== 'ALL') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = agr.endDate ? new Date(agr.endDate) : null;
        if (endDate) endDate.setHours(0, 0, 0, 0);
        const diffDays = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 999;

        if (statusFilter === 'ACTIVE') {
          const isActive =
            (computedStatus === 'ACTIVE' || agr.status === 'ACTIVE' || (agr.status === 'COMPLETED' && diffDays >= 0)) &&
            computedStatus !== 'TERMINATED' &&
            agr.status !== 'TERMINATED' &&
            computedStatus !== 'NOTICE_ISSUED' &&
            agr.status !== 'NOTICE_ISSUED' &&
            agr.status !== 'TERMINATION_PENDING' &&
            computedStatus !== 'REJECTED' &&
            agr.status !== 'REJECTED' &&
            computedStatus !== 'EXPIRED' &&
            agr.status !== 'EXPIRED' &&
            (!endDate || diffDays >= 0);
          if (!isActive) return false;
        } else if (statusFilter === 'PENDING' || statusFilter === 'PENDING_APPROVAL') {
          const isPending =
            (computedStatus.includes('Pending') ||
              computedStatus.includes('PENDING') ||
              computedStatus.includes('ACCEPTED') ||
              agr.status === 'PENDING' ||
              agr.status === 'SUBMITTED' ||
              agr.status === 'ACCEPTED' ||
              (!agr.approvedAt && agr.status !== 'CANCELLED')) &&
            computedStatus !== 'TERMINATED' &&
            agr.status !== 'TERMINATED' &&
            computedStatus !== 'NOTICE_ISSUED' &&
            agr.status !== 'NOTICE_ISSUED' &&
            agr.status !== 'TERMINATION_PENDING' &&
            computedStatus !== 'REJECTED' &&
            agr.status !== 'REJECTED' &&
            computedStatus !== 'ACTIVE' &&
            agr.status !== 'ACTIVE' &&
            computedStatus !== 'EXPIRED' &&
            agr.status !== 'EXPIRED';
          if (!isPending) return false;
        } else if (statusFilter === 'RENEWAL_DUE') {
          const isDue =
            diffDays >= 0 &&
            diffDays <= 30 &&
            (computedStatus === 'ACTIVE' || agr.status === 'ACTIVE' || agr.status === 'COMPLETED' || computedStatus.startsWith('APPROVED'));
          if (!isDue) return false;
        } else if (statusFilter === 'EXPIRED') {
          const isExp =
            (computedStatus === 'EXPIRED' || agr.status === 'EXPIRED' || (endDate && diffDays < 0)) &&
            computedStatus !== 'TERMINATED' &&
            agr.status !== 'TERMINATED' &&
            computedStatus !== 'REJECTED' &&
            agr.status !== 'REJECTED' &&
            computedStatus !== 'CANCELLED' &&
            agr.status !== 'CANCELLED';
          if (!isExp) return false;
        } else if (statusFilter === 'TERMINATED') {
          const isTerm =
            computedStatus === 'TERMINATED' ||
            agr.status === 'TERMINATED' ||
            computedStatus === 'NOTICE_ISSUED' ||
            agr.status === 'NOTICE_ISSUED' ||
            agr.status === 'TERMINATION_PENDING';
          if (!isTerm) return false;
        } else if (statusFilter === 'REJECTED') {
          if (computedStatus !== 'REJECTED' && agr.status !== 'REJECTED') return false;
        } else if (statusFilter === 'APPROVED') {
          if (!computedStatus.startsWith('APPROVED') && agr.status !== 'APPROVED') return false;
        } else if (statusFilter === 'ACCEPTED') {
          if (!computedStatus.startsWith('ACCEPTED') && agr.status !== 'ACCEPTED') return false;
        } else if (statusFilter === 'NOTICE_ISSUED') {
          if (
            computedStatus !== 'NOTICE_ISSUED' &&
            agr.status !== 'NOTICE_ISSUED' &&
            agr.status !== 'TERMINATION_PENDING'
          )
            return false;
        } else if (statusFilter === 'CANCELLED') {
          if (computedStatus !== 'CANCELLED' && agr.status !== 'CANCELLED') return false;
        }
      }

      // 4. Agreement Year Filter
      if (yearFilter !== 'ALL') {
        const agrYear =
          agr.agreementYear ||
          (agr.startDate ? agr.startDate.slice(0, 4) : '') ||
          (agr.createdAt ? new Date(agr.createdAt).getFullYear().toString() : '');
        const idMatchesYear = agr.agreementId?.includes(yearFilter);
        if (agrYear !== yearFilter && !idMatchesYear) return false;
      }

      // 5. Start Date Filter (Filter for agreements starting on or after this date)
      if (startDateFilter) {
        if (!agr.startDate || agr.startDate < startDateFilter) return false;
      }

      // 6. End Date Filter (Filter for agreements ending on or before this date)
      if (endDateFilter) {
        if (!agr.endDate || agr.endDate > endDateFilter) return false;
      }

      // 7. General Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          agr.agreementId?.toLowerCase().includes(q) ||
          districtName.toLowerCase().includes(q) ||
          partnerCode.toLowerCase().includes(q) ||
          partnerName.toLowerCase().includes(q) ||
          partnerPhone.includes(q) ||
          agr.termsAndConditions?.toLowerCase().includes(q) ||
          agr.signedBy?.toLowerCase().includes(q) ||
          agr.approvedBy?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [
    mergedAgreements,
    partnerMap,
    partnerFilter,
    districtFilter,
    statusFilter,
    yearFilter,
    startDateFilter,
    endDateFilter,
    searchQuery,
  ]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (partnerFilter !== 'ALL') count++;
    if (districtFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (yearFilter !== 'ALL') count++;
    if (startDateFilter) count++;
    if (endDateFilter) count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [
    partnerFilter,
    districtFilter,
    statusFilter,
    yearFilter,
    startDateFilter,
    endDateFilter,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setPartnerFilter('ALL');
    setDistrictFilter('ALL');
    setStatusFilter('ALL');
    setYearFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
  };

  // Filtered partners list (respects current search and filters)
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      // District filter
      if (districtFilter !== 'ALL' && p.assignedDistrictName.toLowerCase() !== districtFilter.toLowerCase()) {
        return false;
      }
      // Partner filter
      if (partnerFilter !== 'ALL' && p.id !== partnerFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        const isCompleted = p.agreementStatus === 'COMPLETED';
        if (statusFilter === 'ACTIVE' && !isCompleted) return false;
        if (statusFilter === 'PENDING' && isCompleted) return false;
      }
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.assignedDistrictName.toLowerCase().includes(q) ||
          p.franchiseCode.toLowerCase().includes(q) ||
          p.phone.includes(q)
        );
      }
      return true;
    });
  }, [partners, districtFilter, partnerFilter, statusFilter, searchQuery]);

  // Load agreements when a partner is selected
  useEffect(() => {
    if (selectedPartner) {
      loadAgreementsForPartner(selectedPartner.id);
    } else {
      setPartnerAgreements([]);
    }
  }, [selectedPartner]);

  const loadAgreementsForPartner = async (partnerId: string) => {
    try {
      setLoadingAgreements(true);
      const list = await getFranchiseAgreements(partnerId);
      
      // Check if any agreement has reached its effective termination date -> update to TERMINATED
      const nowStr = new Date().toISOString().split('T')[0];
      for (const agr of list) {
        if (
          (agr.status === 'NOTICE_ISSUED' || agr.status === 'TERMINATION_PENDING') &&
          agr.terminationDetails?.effectiveDate &&
          agr.terminationDetails.effectiveDate <= nowStr
        ) {
          agr.status = 'TERMINATED';
          if (agr.terminationDetails) {
            agr.terminationDetails.status = 'TERMINATED';
          }
        }
      }

      setPartnerAgreements(list);
    } catch (err) {
      console.warn('Error loading partner agreements:', err);
    } finally {
      setLoadingAgreements(false);
    }
  };

  const handleOpenRenewModal = (partner: FranchisePartner) => {
    setSelectedPartner(partner);
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    setNewAgreementId(`HDK-AGR-${partner.assignedDistrictId.toUpperCase()}-${currentYear}-${String(nextYear).slice(2)}`);
    setNewStartDate(`${currentYear}-04-01`);
    setNewEndDate(`${nextYear}-03-31`);
    setNewCharges(50000);
    setNewCommission(10);
    setNewProfit(20);
    setIsRenewModalOpen(true);
    setMessage(null);
  };

  const handleOpenRenewModalFromAgreement = (agr: FranchiseAgreementRecord) => {
    const partner = resolvePartnerForAgreement(agr);
    if (partner) {
      handleOpenRenewModal(partner);
    } else {
      const fallbackPartner: FranchisePartner = {
        id: agr.franchisePartnerId,
        franchisePartnerId: agr.franchisePartnerId,
        name: agr.districtName + ' Partner',
        phone: '',
        email: '',
        franchiseCode: agr.franchiseCode,
        assignedDistrictId: agr.districtId,
        assignedDistrictName: agr.districtName,
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
        kycStatus: 'VERIFIED',
        agreementStatus: 'COMPLETED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      handleOpenRenewModal(fallbackPartner);
    }
  };

  const handleExecuteRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    try {
      setSubmittingRenewal(true);
      setMessage(null);

      const res = await renewFranchiseAgreement({
        franchisePartnerId: selectedPartner.id,
        franchiseCode: selectedPartner.franchiseCode,
        districtId: selectedPartner.assignedDistrictId,
        districtName: selectedPartner.assignedDistrictName,
        agreementId: newAgreementId,
        startDate: newStartDate,
        endDate: newEndDate,
        charges: Number(newCharges),
        commissionPercent: Number(newCommission),
        profitPercentage: Number(newProfit),
        termsAndConditions: newTerms,
        adminName,
      });

      if (res.success) {
        setMessage({ type: 'success', text: 'Franchise agreement successfully renewed! New record created in Firebase.' });
        await loadAgreementsForPartner(selectedPartner.id);
        setTimeout(() => {
          setIsRenewModalOpen(false);
        }, 1500);
      } else {
        setMessage({ type: 'error', text: res.error || 'Failed to renew agreement' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Renewal error' });
    } finally {
      setSubmittingRenewal(false);
    }
  };

  const handleOpenTerminateModal = (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    if (partner) {
      setSelectedPartner(partner);
    }
    setSelectedAgreementForTerm(agr);
    setTermReason('Breach of franchise performance guidelines and operational non-compliance.');
    setTermNoticeDate(new Date().toISOString().split('T')[0]);
    setTermNoticePeriodDays(30);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setTermEffectiveDate(d.toISOString().split('T')[0]);
    setTermNotes('Notice period initiated as per contract条款.');
    setIsTerminateModalOpen(true);
  };

  const handleExecuteTermination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgreementForTerm || !selectedPartner) return;

    try {
      setSubmittingTermination(true);
      const res = await terminateFranchiseAgreement({
        agreementRecordId: selectedAgreementForTerm.id,
        franchisePartnerId: selectedPartner.id,
        districtId: selectedPartner.assignedDistrictId,
        districtName: selectedPartner.assignedDistrictName,
        reason: termReason,
        noticeDate: termNoticeDate,
        noticePeriodDays: Number(termNoticePeriodDays),
        effectiveDate: termEffectiveDate,
        notes: termNotes,
        adminName,
      });

      if (res.success) {
        setIsTerminateModalOpen(false);
        await loadAgreementsForPartner(selectedPartner.id);
      } else {
        alert(res.error || 'Failed to terminate agreement');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing termination');
    } finally {
      setSubmittingTermination(false);
    }
  };

  const handleCancelTermination = async (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    if (!partner) return;
    if (!window.confirm('Are you sure you want to cancel this termination notice and restore the agreement to ACTIVE?')) {
      return;
    }

    try {
      const res = await cancelAgreementTermination(
        agr.id,
        partner.id,
        partner.assignedDistrictId,
        partner.assignedDistrictName,
        adminName
      );

      if (res.success) {
        await loadAgreementsForPartner(partner.id);
      } else {
        alert(res.error || 'Failed to cancel termination');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling termination');
    }
  };

  // Final Agreement Approval Handlers
  const handleOpenApproveModal = (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    if (partner) {
      setSelectedPartner(partner);
    }
    setSelectedAgrForApprove(agr);
    setIsApproveModalOpen(true);
  };

  const handleApproveAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgrForApprove || !selectedPartner) return;

    try {
      setSubmittingApprove(true);
      const res = await approveFranchiseAgreement(
        selectedAgrForApprove.id,
        selectedPartner.id,
        selectedPartner.assignedDistrictId,
        selectedPartner.assignedDistrictName,
        adminName,
        'SUPER_ADMIN'
      );

      if (res.success) {
        setIsApproveModalOpen(false);
        await loadAgreementsForPartner(selectedPartner.id);
      } else {
        alert(res.error || 'Failed to approve agreement');
      }
    } catch (err: any) {
      alert(err.message || 'Error approving agreement');
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleOpenRejectModal = (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    if (partner) {
      setSelectedPartner(partner);
    }
    setSelectedAgrForReject(agr);
    setRejectReason('Agreement terms or documentation not acceptable upon final review.');
    setIsRejectModalOpen(true);
  };

  const handleRejectAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgrForReject || !selectedPartner) return;

    try {
      setSubmittingReject(true);
      const res = await rejectFranchiseAgreement(
        selectedAgrForReject.id,
        selectedPartner.id,
        selectedPartner.assignedDistrictId,
        selectedPartner.assignedDistrictName,
        rejectReason,
        adminName,
        'SUPER_ADMIN'
      );

      if (res.success) {
        setIsRejectModalOpen(false);
        await loadAgreementsForPartner(selectedPartner.id);
      } else {
        alert(res.error || 'Failed to reject agreement');
      }
    } catch (err: any) {
      alert(err.message || 'Error rejecting agreement');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleOpenCancelModal = (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    if (partner) {
      setSelectedPartner(partner);
    }
    setSelectedAgrForCancel(agr);
    setCancelReason('Cancelled by Super Admin due to administrative review.');
    setIsCancelModalOpen(true);
  };

  const handleCancelAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgrForCancel || !selectedPartner) return;

    try {
      setSubmittingCancel(true);
      const res = await cancelFranchiseAgreement(
        selectedAgrForCancel.id,
        selectedPartner.id,
        selectedPartner.assignedDistrictId,
        selectedPartner.assignedDistrictName,
        cancelReason,
        adminName,
        'SUPER_ADMIN'
      );

      if (res.success) {
        setIsCancelModalOpen(false);
        await loadAgreementsForPartner(selectedPartner.id);
      } else {
        alert(res.error || 'Failed to cancel agreement');
      }
    } catch (err: any) {
      alert(err.message || 'Error cancelling agreement');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleOpenUploadDocModal = (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    const partner = specificPartner || resolvePartnerForAgreement(agr);
    setSelectedAgrForUploadDoc(agr);
    setSelectedPartnerForUpload(partner || null);
    setUploadDocFile(null);
    setUploadDocError(null);
    setIsUploadDocModalOpen(true);
  };

  const handleExecuteDocUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgrForUploadDoc) return;
    if (!uploadDocFile) {
      setUploadDocError('Please select a valid PDF, JPG, JPEG, or PNG document.');
      return;
    }

    const partner = selectedPartnerForUpload || resolvePartnerForAgreement(selectedAgrForUploadDoc);
    const partnerId = selectedAgrForUploadDoc.franchisePartnerId || partner?.id || '';
    const districtId = selectedAgrForUploadDoc.districtId || partner?.assignedDistrictId || '';
    const districtName = selectedAgrForUploadDoc.districtName || partner?.assignedDistrictName || 'District';
    const franchiseCode = selectedAgrForUploadDoc.franchiseCode || partner?.franchiseCode || '';

    try {
      setUploadingDoc(true);
      setUploadDocError(null);

      const res = await uploadFranchiseAgreementDocument({
        agreementRecordId: selectedAgrForUploadDoc.id,
        franchisePartnerId: partnerId,
        districtId,
        districtName,
        franchiseCode,
        agreementId: selectedAgrForUploadDoc.agreementId,
        file: uploadDocFile,
        adminName,
        fallbackRecord: selectedAgrForUploadDoc,
      });

      if (res.success) {
        setIsUploadDocModalOpen(false);
        setUploadDocFile(null);
        setUploadSuccessToast(
          `Official Agreement document "${uploadDocFile.name}" successfully uploaded and saved for ${districtName} (${franchiseCode})!`
        );
        setTimeout(() => setUploadSuccessToast(null), 6000);
        if (selectedPartner) {
          await loadAgreementsForPartner(selectedPartner.id);
        }
      } else {
        setUploadDocError(res.error || 'Failed to upload agreement document. Please try again.');
      }
    } catch (err: any) {
      setUploadDocError(err.message || 'An error occurred while uploading the document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handlePreviewDocument = (fileUrl: string, title: string, fileType: string = 'application/pdf') => {
    setPreviewDocUrl(fileUrl);
    setPreviewDocTitle(title);
    setPreviewDocType(fileType);
    setIsPreviewDocModalOpen(true);
  };

  const handleDownloadAgreementDoc = (fileUrl: string, fileName: string) => {
    try {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName || 'Franchise-Agreement-Document.pdf';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      window.open(fileUrl, '_blank');
    }
  };

  const handleRemoveDoc = async (agr: FranchiseAgreementRecord, specificPartner?: FranchisePartner | null) => {
    if (!window.confirm(`Are you sure you want to remove the uploaded agreement document for ${agr.agreementId}?`)) {
      return;
    }

    const partner = specificPartner || resolvePartnerForAgreement(agr);
    const partnerId = agr.franchisePartnerId || partner?.id || '';
    const districtId = agr.districtId || partner?.assignedDistrictId || '';
    const districtName = agr.districtName || partner?.assignedDistrictName || 'District';

    try {
      const res = await removeFranchiseAgreementDocument(
        agr.id,
        partnerId,
        districtId,
        districtName,
        adminName,
        'SUPER_ADMIN'
      );
      if (res.success) {
        setUploadSuccessToast(`Agreement document removed for ${agr.agreementId}.`);
        setTimeout(() => setUploadSuccessToast(null), 4000);
        if (selectedPartner) {
          await loadAgreementsForPartner(selectedPartner.id);
        }
      } else {
        alert(res.error || 'Failed to remove document');
      }
    } catch (err: any) {
      alert(err.message || 'Error removing document');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            Super Admin → Franchise Management
          </span>
          <h2 className="text-xl font-black text-stone-900 mt-1">
            Franchise Agreement History, Yearly Renewal &amp; Termination (वार्षिक अनुबंध एवं समाप्ति)
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Search and filter franchise agreements by partner, district, status, year, and date ranges with full lifecycle management.
          </p>
        </div>

        {/* View Switcher Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200">
          <button
            type="button"
            onClick={() => setViewMode('agreements')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'agreements'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Matching Agreements ({filteredAgreements.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('partners')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'partners'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>By District ({filteredPartners.length})</span>
          </button>
        </div>
      </div>

      {/* FRANCHISE AGREEMENT SUMMARY SECTION FOR SUPER ADMIN */}
      <div id="franchise-agreement-summary-section" className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-stone-950 flex items-center justify-center font-black shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900 tracking-tight">
                Franchise Agreement Summary (अनुबंध सारांश)
              </h3>
              <p className="text-[11px] text-stone-500">
                Click any status count to open the corresponding filtered Agreement History
              </p>
            </div>
          </div>

          {statusFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setViewMode('agreements');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3 h-3 text-stone-500" />
              <span>Reset Filter (सभी देखें)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Total Agreements */}
          <button
            type="button"
            id="summary-total-agreements"
            onClick={() => {
              setStatusFilter('ALL');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'ALL'
                ? 'bg-stone-100/90 border-stone-400 ring-2 ring-stone-400 shadow-xs'
                : 'bg-stone-50/70 hover:bg-stone-100/80 border-stone-200'
            }`}
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
              <div className="text-[10px] font-semibold text-stone-500 mt-0.5 truncate">
                {statusFilter === 'ALL' ? '● Showing All' : 'Click to view all'}
              </div>
            </div>
          </button>

          {/* 2. Active Agreements */}
          <button
            type="button"
            id="summary-active-agreements"
            onClick={() => {
              setStatusFilter('ACTIVE');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400 shadow-xs'
                : 'bg-emerald-50/40 hover:bg-emerald-50/80 border-emerald-200/80'
            }`}
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
              <div className="text-[10px] font-semibold text-emerald-600 mt-0.5 truncate">
                {statusFilter === 'ACTIVE' ? '● Filtering Active' : 'Click to filter'}
              </div>
            </div>
          </button>

          {/* 3. Pending Approval */}
          <button
            type="button"
            id="summary-pending-approval"
            onClick={() => {
              setStatusFilter('PENDING_APPROVAL');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'PENDING_APPROVAL' || statusFilter === 'PENDING'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400 shadow-xs'
                : 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-200/80'
            }`}
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
              <div className="text-[10px] font-semibold text-amber-600 mt-0.5 truncate">
                {statusFilter === 'PENDING_APPROVAL' || statusFilter === 'PENDING' ? '● Filtering Pending' : 'Click to filter'}
              </div>
            </div>
          </button>

          {/* 4. Renewal Due */}
          <button
            type="button"
            id="summary-renewal-due"
            onClick={() => {
              setStatusFilter('RENEWAL_DUE');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'RENEWAL_DUE'
                ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400 shadow-xs'
                : 'bg-orange-50/40 hover:bg-orange-50/80 border-orange-200/80'
            }`}
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
              <div className="text-[10px] font-semibold text-orange-600 mt-0.5 truncate">
                {statusFilter === 'RENEWAL_DUE' ? '● Filtering Renewal' : 'Click to filter'}
              </div>
            </div>
          </button>

          {/* 5. Expired */}
          <button
            type="button"
            id="summary-expired"
            onClick={() => {
              setStatusFilter('EXPIRED');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'EXPIRED'
                ? 'bg-red-50 border-red-400 ring-2 ring-red-400 shadow-xs'
                : 'bg-red-50/40 hover:bg-red-50/80 border-red-200/80'
            }`}
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
              <div className="text-[10px] font-semibold text-red-600 mt-0.5 truncate">
                {statusFilter === 'EXPIRED' ? '● Filtering Expired' : 'Click to filter'}
              </div>
            </div>
          </button>

          {/* 6. Terminated */}
          <button
            type="button"
            id="summary-terminated"
            onClick={() => {
              setStatusFilter('TERMINATED');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'TERMINATED'
                ? 'bg-stone-200 border-stone-500 ring-2 ring-stone-400 shadow-xs'
                : 'bg-stone-100/70 hover:bg-stone-200/80 border-stone-300/80'
            }`}
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
              <div className="text-[10px] font-semibold text-stone-600 mt-0.5 truncate">
                {statusFilter === 'TERMINATED' ? '● Filtering Terminated' : 'Click to filter'}
              </div>
            </div>
          </button>

          {/* 7. Rejected */}
          <button
            type="button"
            id="summary-rejected"
            onClick={() => {
              setStatusFilter('REJECTED');
              setViewMode('agreements');
            }}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400 shadow-xs'
                : 'bg-rose-50/40 hover:bg-rose-50/80 border-rose-200/80'
            }`}
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
              <div className="text-[10px] font-semibold text-rose-600 mt-0.5 truncate">
                {statusFilter === 'REJECTED' ? '● Filtering Rejected' : 'Click to filter'}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* AGREEMENT SEARCH & FILTER PANEL */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-stone-900">
                Agreement Search &amp; Filters (अनुबंध खोज एवं फ़िल्टर)
              </h3>
              <p className="text-[11px] text-stone-500">
                Filter by partner, district, status, year, start date, and end date
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </span>
            )}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-stone-500" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Query Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search agreement ID, franchise code, partner name, phone, or terms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-stone-50/50"
          />
        </div>

        {/* 6 Grid Filters: Franchise Partner, District, Status, Year, Start Date, End Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
          {/* 1. Franchise Partner Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Franchise Partner
            </label>
            <select
              value={partnerFilter}
              onChange={(e) => setPartnerFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-orange-500 truncate"
            >
              <option value="ALL">All Partners (सभी पार्टनर)</option>
              {filterOptions.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. District Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              District (ज़िला)
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-orange-500"
            >
              <option value="ALL">All Districts (सभी ज़िले)</option>
              {filterOptions.districts.map((d) => (
                <option key={d} value={d}>
                  {d} District
                </option>
              ))}
            </select>
          </div>

          {/* 3. Agreement Status Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Agreement Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-orange-500"
            >
              <option value="ALL">All Statuses (सभी स्थितियाँ)</option>
              <option value="ACTIVE">Active (सक्रिय)</option>
              <option value="PENDING_APPROVAL">Pending Approval (स्वीकृति प्रतीक्षारत)</option>
              <option value="RENEWAL_DUE">Renewal Due (नवीनीकरण शेष / ≤30 दिन)</option>
              <option value="APPROVED">Approved (स्वीकृत)</option>
              <option value="PENDING">Pending (प्रतीक्षारत)</option>
              <option value="ACCEPTED">Accepted by Partner</option>
              <option value="NOTICE_ISSUED">Termination Notice</option>
              <option value="TERMINATED">Terminated (समाप्त)</option>
              <option value="REJECTED">Rejected (अस्वीकृत)</option>
              <option value="CANCELLED">Cancelled (रद्द)</option>
              <option value="EXPIRED">Expired (अवधि समाप्त)</option>
            </select>
          </div>

          {/* 4. Agreement Year Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Agreement Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-orange-500"
            >
              <option value="ALL">All Years (सभी वर्ष)</option>
              {filterOptions.years.map((yr) => (
                <option key={yr} value={yr}>
                  Year {yr}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Start Date Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              Start Date (प्रारंभ तिथि)
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-orange-500"
            />
          </div>

          {/* 6. End Date Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
              End Date (समाप्ति तिथि)
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-white focus:outline-hidden focus:border-orange-500"
            />
          </div>
        </div>

        {/* Active Filter Tags Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
            <span className="text-[11px] font-medium text-stone-500">Active Filters:</span>

            {partnerFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-800 text-[11px] font-bold border border-orange-200">
                Partner: {filterOptions.partners.find((p) => p.id === partnerFilter)?.name || partnerFilter}
                <button
                  type="button"
                  onClick={() => setPartnerFilter('ALL')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}

            {districtFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                District: {districtFilter}
                <button
                  type="button"
                  onClick={() => setDistrictFilter('ALL')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}

            {yearFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-[11px] font-bold border border-stone-200">
                Year: {yearFilter}
                <button
                  type="button"
                  onClick={() => setYearFilter('ALL')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}

            {startDateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                From: {startDateFilter}
                <button
                  type="button"
                  onClick={() => setStartDateFilter('')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}

            {endDateFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200">
                To: {endDateFilter}
                <button
                  type="button"
                  onClick={() => setEndDateFilter('')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-stone-800 text-[11px] font-bold border border-stone-200">
                Query: "{searchQuery}"
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* SEARCH RESULTS: MATCHING AGREEMENTS VIEW */}
      {viewMode === 'agreements' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-600" />
              <span>Matching Agreements Results ({filteredAgreements.length})</span>
            </h3>
            <span className="text-xs text-stone-500">
              Showing only agreements matching your search criteria
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-3xl border border-stone-200">
              Loading matching agreements from database...
            </div>
          ) : filteredAgreements.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 space-y-3">
              <FileText className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-bold text-stone-700">No agreements matched the search &amp; filter criteria.</p>
              <p className="text-xs text-stone-500">Try adjusting your filter parameters or resetting filters.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All Filters</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgreements.map((agr, idx) => {
                const partner = resolvePartnerForAgreement(agr);
                const displayStatus = getAgreementComputedStatus(agr);

                const isActive = displayStatus === 'ACTIVE';
                const isNoticeIssued = displayStatus === 'NOTICE_ISSUED' || displayStatus === 'TERMINATION_PENDING';
                const isTerminated = displayStatus === 'TERMINATED';
                const isCancelled = displayStatus === 'CANCELLED';
                const isRejected = displayStatus === 'REJECTED';

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = agr.endDate ? new Date(agr.endDate) : new Date();
                endDate.setHours(0, 0, 0, 0);
                const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isDueSoon = diffDays >= 0 && diffDays <= 30 && (displayStatus === 'ACTIVE' || displayStatus === 'COMPLETED');

                return (
                  <div
                    key={agr.id || idx}
                    className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-xs hover:shadow-md transition space-y-4"
                  >
                    {/* Top Row: Partner, District, ID, Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm shrink-0">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-black text-stone-900">
                              {agr.districtName || partner?.assignedDistrictName} District
                            </h4>
                            <span className="text-[11px] font-mono font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-lg">
                              {agr.franchiseCode || partner?.franchiseCode}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg">
                              {agr.agreementId}
                            </span>
                            <span className="text-[11px] font-bold text-blue-900 bg-blue-100 px-2.5 py-0.5 rounded-lg border border-blue-200">
                              {agr.agreementVersion || (agr.versionNumber ? `Version ${agr.versionNumber}` : 'Version 1')}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Partner: <strong className="text-stone-800">{partner?.name || 'Franchise Partner'}</strong>
                            {partner?.phone && ` • 📞 ${partner.phone}`}
                            {agr.createdAt && ` • 📅 Created: ${new Date(agr.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            displayStatus === 'EXPIRED' || isTerminated
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800 border-rose-200'
                              : isCancelled
                              ? 'bg-stone-200 text-stone-800 border-stone-300'
                              : isNoticeIssued
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : displayStatus.startsWith('APPROVED')
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : displayStatus.startsWith('ACCEPTED')
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : displayStatus === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-700 border-stone-200'
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </div>
                    </div>

                    {/* Expiry / Renewal Notice */}
                    {isDueSoon && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 flex items-center gap-2">
                        <span>⚠️ Renewal due in {diffDays} {diffDays === 1 ? 'day' : 'days'} (Expires: {agr.endDate})</span>
                      </div>
                    )}

                    {displayStatus === 'EXPIRED' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs font-bold text-red-800 flex items-center gap-2">
                        <span>❌ Agreement expired on {agr.endDate} without renewal.</span>
                      </div>
                    )}

                    {/* Financials & Dates Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-100">
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Agreement Year</span>
                        <strong className="text-stone-800">
                          {agr.agreementYear || new Date(agr.startDate || agr.createdAt || Date.now()).getFullYear()}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Start Date</span>
                        <strong className="text-stone-800">{agr.startDate || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">End Date</span>
                        <strong className="text-stone-800">{agr.endDate || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Charges</span>
                        <strong className="text-stone-800">₹{agr.charges?.toLocaleString() || '50,000'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Commission %</span>
                        <strong className="text-stone-800">{agr.commissionPercent || 10}%</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-400 block font-medium">Profit Share %</span>
                        <strong className="text-stone-800">{agr.profitPercentage || 20}%</strong>
                      </div>
                    </div>

                    {/* Terms and Conditions preview */}
                    {agr.termsAndConditions && (
                      <div className="p-3 bg-stone-50/80 border border-stone-200/80 rounded-xl text-xs text-stone-700">
                        <strong className="text-stone-900 block mb-0.5">📜 Terms & Conditions:</strong>
                        <p className="line-clamp-2 text-stone-600">{agr.termsAndConditions}</p>
                      </div>
                    )}

                    {/* Approval or Rejection Banners */}
                    {agr.approvedAt && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                        <span>✅ <strong>Approved By Admin:</strong> {agr.approvedBy || 'Super Admin'}</span>
                        <span className="text-[10px] text-emerald-700 font-mono">
                          {new Date(agr.approvedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {agr.rejectionReason && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                        <strong>❌ Rejection Reason:</strong> {agr.rejectionReason}
                      </div>
                    )}

                    {agr.cancellationReason && (
                      <div className="p-2.5 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-800">
                        <strong>🚫 Cancellation Reason:</strong> {agr.cancellationReason}
                      </div>
                    )}

                    {/* Termination Details */}
                    {agr.terminationDetails && (
                      <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl space-y-1.5 text-xs text-red-900">
                        <div className="flex items-center justify-between font-bold">
                          <span>Termination: {agr.terminationDetails.status}</span>
                          <span className="text-[10px] text-red-700">Notice Date: {agr.terminationDetails.noticeDate}</span>
                        </div>
                        <p className="text-red-800 text-[11px]">
                          <strong>Reason:</strong> {agr.terminationDetails.reason}
                        </p>
                        <div className="flex justify-between text-[11px] text-red-700 font-medium">
                          <span>Notice Period: {agr.terminationDetails.noticePeriodDays} days</span>
                          <span>Effective Date: <strong>{agr.terminationDetails.effectiveDate}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* Franchise Agreement Acceptance Record */}
                    <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-950 flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-blue-600" />
                          Franchise Agreement Acceptance Record:
                        </span>
                        {agr.acceptanceRecord?.acceptanceStatus === 'ACCEPTED' || agr.termsAccepted || agr.signedAt || agr.status === 'ACCEPTED' || agr.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            Permanent Record Saved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Acceptance
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-blue-100 text-[11px]">
                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                          <span className="text-stone-500 block text-[10px]">Agreement ID</span>
                          <strong className="font-mono text-stone-900 truncate block" title={agr.acceptanceRecord?.agreementId || agr.agreementId}>
                            {agr.acceptanceRecord?.agreementId || agr.agreementId}
                          </strong>
                        </div>

                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                          <span className="text-stone-500 block text-[10px]">Franchise Partner ID</span>
                          <strong className="font-mono text-stone-900 truncate block" title={agr.acceptanceRecord?.franchisePartnerId || agr.franchisePartnerId || partner?.franchisePartnerId || partner?.id || 'N/A'}>
                            {agr.acceptanceRecord?.franchisePartnerId || agr.franchisePartnerId || partner?.franchisePartnerId || partner?.id || 'N/A'}
                          </strong>
                        </div>

                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                          <span className="text-stone-500 block text-[10px]">Acceptance Date & Time</span>
                          <strong className="text-stone-900 block truncate" title={agr.acceptanceRecord?.acceptanceDateTime ? new Date(agr.acceptanceRecord.acceptanceDateTime).toLocaleString('en-IN') : (agr.signedAt ? new Date(agr.signedAt).toLocaleString('en-IN') : 'Pending')}>
                            {agr.acceptanceRecord?.acceptanceDateTime
                              ? new Date(agr.acceptanceRecord.acceptanceDateTime).toLocaleString('en-IN')
                              : agr.signedAt
                              ? new Date(agr.signedAt).toLocaleString('en-IN')
                              : 'Pending'}
                          </strong>
                        </div>

                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                          <span className="text-stone-500 block text-[10px]">Agreement Version</span>
                          <strong className="text-stone-900 block font-semibold">
                            {agr.acceptanceRecord?.agreementVersion || agr.agreementVersion || 'v1.0'}
                          </strong>
                        </div>

                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                          <span className="text-stone-500 block text-[10px]">Acceptance Status</span>
                          <strong className="text-blue-800 font-bold block">
                            {agr.acceptanceRecord?.acceptanceStatus || (agr.termsAccepted || agr.signedAt ? 'ACCEPTED' : 'PENDING')}
                          </strong>
                        </div>

                        <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                          <span className="text-stone-500 block text-[10px]">Partner Account ID</span>
                          <strong className="font-mono text-stone-900 truncate block" title={agr.acceptanceRecord?.partnerAccountId || partner?.loginUsername || partner?.id || agr.franchisePartnerId}>
                            {agr.acceptanceRecord?.partnerAccountId || partner?.loginUsername || partner?.id || agr.franchisePartnerId}
                          </strong>
                        </div>
                      </div>
                      {agr.acceptanceRecord?.signerName && (
                        <div className="text-[11px] text-blue-900 pt-0.5 flex items-center justify-between">
                          <span>Signer: <strong>{agr.acceptanceRecord.signerName}</strong> {agr.acceptanceRecord.signerDesignation ? `(${agr.acceptanceRecord.signerDesignation})` : ''}</span>
                          <span className="text-[10px] text-blue-700 italic">Permanent Legal Audit Record</span>
                        </div>
                      )}
                    </div>

                    {/* Franchise Agreement Document Upload & Status Section */}
                    <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-stone-600" />
                            Signed Agreement Document:
                          </span>
                          {agr.agreementDocument?.fileUrl ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Document Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 border border-stone-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Not Uploaded
                            </span>
                          )}
                        </div>
                        {agr.agreementDocument?.fileUrl ? (
                          <p className="text-[11px] text-stone-600">
                            <span className="font-semibold text-stone-900">{agr.agreementDocument.fileName}</span>
                            {agr.agreementDocument.fileSize ? ` (${(agr.agreementDocument.fileSize / 1024).toFixed(1)} KB)` : ''} • Uploaded on{' '}
                            <strong>{new Date(agr.agreementDocument.uploadedAt).toLocaleDateString()}</strong> by {agr.agreementDocument.uploadedBy}
                          </p>
                        ) : (
                          <p className="text-[11px] text-stone-500">
                            Final signed/agreed agreement document not yet uploaded by Super Admin (PDF, JPG, JPEG, PNG).
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {agr.agreementDocument?.fileUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handlePreviewDocument(
                                  agr.agreementDocument!.fileUrl,
                                  agr.agreementDocument!.fileName || `Agreement-${agr.agreementId}`,
                                  agr.agreementDocument!.fileType || 'application/pdf'
                                )
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="View Document"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>View Document</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownloadAgreementDoc(
                                  agr.agreementDocument!.fileUrl,
                                  agr.agreementDocument!.fileName || `Agreement-${agr.agreementId}.pdf`
                                )
                              }
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                              title="Download Document"
                            >
                              <Download className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Download</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenUploadDocModal(agr, partner)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                              title="Re-upload / Replace Document"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-amber-700" />
                              <span>Replace</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenUploadDocModal(agr, partner)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-white" />
                            <span>Upload Signed Document</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-stone-100">
                      <p className="text-xs text-stone-500 italic max-w-xs sm:max-w-md truncate">
                        "{agr.termsAndConditions}"
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* View History Button */}
                        {partner && (
                          <button
                            type="button"
                            onClick={() => setSelectedPartner(partner)}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5 text-stone-600" />
                            <span>View History</span>
                          </button>
                        )}

                        {/* Edit Financials */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditFinancials(agr, partner)}
                          className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Financials</span>
                        </button>

                        {/* Approve Agreement */}
                        {!isTerminated && !isCancelled && displayStatus !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(agr, partner)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Reject Agreement */}
                        {!isTerminated && !isCancelled && !isRejected && (
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(agr, partner)}
                            className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        {/* Cancel Agreement */}
                        {!isTerminated && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(agr, partner)}
                            className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}

                        {/* Terminate */}
                        {(isActive || isCancelled) && (
                          <button
                            type="button"
                            onClick={() => handleOpenTerminateModal(agr, partner)}
                            className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <AlertOctagon className="w-3.5 h-3.5" />
                            <span>Terminate</span>
                          </button>
                        )}

                        {/* Cancel Termination */}
                        {isNoticeIssued && (
                          <button
                            type="button"
                            onClick={() => handleCancelTermination(agr, partner)}
                            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Cancel Termination</span>
                          </button>
                        )}

                        {/* Renew Agreement */}
                        <button
                          type="button"
                          onClick={() => handleOpenRenewModalFromAgreement(agr)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Renew</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* PARTNERS DIRECTORY SUMMARY VIEW */
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>Districts &amp; Franchise Partners ({filteredPartners.length})</span>
            </h3>
            <span className="text-xs text-stone-500">
              Filtered district partner records
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-3xl border border-stone-200">
              Loading franchise partners...
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
              No franchise partners matched the filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPartners.map((partner) => {
                const isCompleted = partner.agreementStatus === 'COMPLETED';
                return (
                  <div
                    key={partner.id}
                    className="bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-stone-400">{partner.franchiseCode}</span>
                          <h3 className="text-base font-black text-stone-900 mt-0.5">{partner.assignedDistrictName} District</h3>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCompleted ? 'Agreement Signed' : 'Pending Agreement'}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-stone-600 bg-stone-50 p-3.5 rounded-2xl border border-stone-100">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Partner:</span>
                          <strong className="text-stone-900">{partner.name}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Phone:</span>
                          <span>{partner.phone}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Status:</span>
                          <span className="font-bold text-stone-800">{partner.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPartner(partner);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-stone-600" />
                        <span>Agreement History</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenRenewModal(partner)}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>RENEW AGREEMENT</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Agreement History & Termination Modal */}
      {selectedPartner && !isRenewModalOpen && !isTerminateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Agreement History &amp; Termination Management
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  {selectedPartner.assignedDistrictName} ({selectedPartner.franchiseCode}) - Past Agreements
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loadingAgreements ? (
              <div className="py-12 text-center text-xs text-stone-500">Loading agreement history...</div>
            ) : partnerAgreements.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-500 space-y-2">
                <FileText className="w-8 h-8 text-stone-300 mx-auto" />
                <p>No separate historical agreement records found yet.</p>
                <button
                  type="button"
                  onClick={() => handleOpenRenewModal(selectedPartner)}
                  className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs"
                >
                  Create / Renew First Agreement
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {partnerAgreements.map((agr, idx) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const startDate = agr.startDate ? new Date(agr.startDate) : new Date(0);
                  startDate.setHours(0, 0, 0, 0);

                  const endDate = agr.endDate ? new Date(agr.endDate) : new Date();
                  endDate.setHours(0, 0, 0, 0);

                  const diffTime = endDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  const isApproved = agr.status === 'APPROVED' || agr.status === 'ACTIVE' || Boolean(agr.approvedAt);
                  const isPartnerAccepted = agr.termsAccepted === true || Boolean(agr.signedAt) || agr.status === 'ACCEPTED' || agr.status === 'COMPLETED';
                  const isStartDateReached = today.getTime() >= startDate.getTime();

                  let computedStatus: string = agr.status;
                  if (agr.status === 'TERMINATED') {
                    computedStatus = 'TERMINATED';
                  } else if (agr.status === 'CANCELLED') {
                    computedStatus = 'CANCELLED';
                  } else if (agr.status === 'REJECTED') {
                    computedStatus = 'REJECTED';
                  } else if (agr.status === 'NOTICE_ISSUED' || agr.status === 'TERMINATION_PENDING') {
                    computedStatus = 'NOTICE_ISSUED';
                  } else if (isApproved) {
                    if (diffDays < 0) {
                      computedStatus = 'EXPIRED';
                    } else if (isPartnerAccepted && isStartDateReached) {
                      computedStatus = 'ACTIVE';
                    } else if (!isStartDateReached) {
                      computedStatus = 'APPROVED (Pending Start Date)';
                    } else {
                      computedStatus = 'APPROVED';
                    }
                  } else {
                    if (isPartnerAccepted) {
                      computedStatus = 'ACCEPTED (Pending Admin Approval)';
                    } else {
                      computedStatus = 'PENDING SIGNATURE & APPROVAL';
                    }
                  }

                  const displayStatus = computedStatus;
                  const isDueSoon = diffDays >= 0 && diffDays <= 30 && (displayStatus === 'ACTIVE' || displayStatus === 'COMPLETED');

                  const isActive = displayStatus === 'ACTIVE';
                  const isNoticeIssued = displayStatus === 'NOTICE_ISSUED' || displayStatus === 'TERMINATION_PENDING';
                  const isTerminated = displayStatus === 'TERMINATED';
                  const isCancelled = displayStatus === 'CANCELLED';
                  const isRejected = displayStatus === 'REJECTED';

                  return (
                    <div key={agr.id || idx} className="p-5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-lg">
                            {agr.agreementId}
                          </span>
                          <span className="text-xs font-bold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-lg border border-blue-200">
                            {agr.agreementVersion || (agr.versionNumber ? `Version ${agr.versionNumber}` : 'Version 1')}
                          </span>
                          <span className="text-xs font-bold text-stone-700">
                            (End Date: {agr.endDate})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              displayStatus === 'EXPIRED' || isTerminated
                                ? 'bg-red-100 text-red-800 border-red-200'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : isCancelled
                                ? 'bg-stone-200 text-stone-800 border-stone-300'
                                : isNoticeIssued
                                ? 'bg-amber-100 text-amber-900 border-amber-200'
                                : displayStatus.startsWith('APPROVED')
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : displayStatus.startsWith('ACCEPTED')
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : displayStatus === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                            }`}
                          >
                            {displayStatus}
                          </span>
                        </div>
                      </div>

                      {/* Renewal Reminder Indicator */}
                      {isDueSoon && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                          <span>⚠️ Renewal due in {diffDays} {diffDays === 1 ? 'day' : 'days'} (Expires: {agr.endDate})</span>
                        </div>
                      )}

                      {displayStatus === 'EXPIRED' && (
                        <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center gap-2">
                          <span>❌ Agreement expired on {agr.endDate} without renewal.</span>
                        </div>
                      )}

                      {/* Approval Details Banner */}
                      {agr.approvedAt && (
                        <div className="p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span>✅ <strong>Approved By Admin:</strong> {agr.approvedBy || 'Super Admin'}</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-mono">
                            {new Date(agr.approvedAt).toLocaleDateString()} {new Date(agr.approvedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}

                      {/* Rejection Details Banner */}
                      {agr.rejectedAt && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-0.5">
                          <div className="flex items-center justify-between font-bold">
                            <span>❌ <strong>Agreement Rejected:</strong> {agr.rejectedBy || 'Super Admin'}</span>
                            <span className="text-[10px] text-rose-700 font-mono">
                              {new Date(agr.rejectedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {agr.rejectionReason && (
                            <p className="text-rose-800 text-[11px]">
                              <strong>Reason:</strong> {agr.rejectionReason}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cancellation Details Banner */}
                      {agr.cancelledAt && (
                        <div className="p-2.5 bg-stone-100 border border-stone-300 rounded-xl text-xs text-stone-800 space-y-0.5">
                          <div className="flex items-center justify-between font-bold">
                            <span>🚫 <strong>Agreement Cancelled:</strong> {agr.cancelledBy || 'Super Admin'}</span>
                            <span className="text-[10px] text-stone-600 font-mono">
                              {new Date(agr.cancelledAt).toLocaleDateString()}
                            </span>
                          </div>
                          {agr.cancellationReason && (
                            <p className="text-stone-700 text-[11px]">
                              <strong>Reason:</strong> {agr.cancellationReason}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs bg-white p-3.5 rounded-xl border border-stone-200/60">
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Agreement ID</span>
                          <strong className="font-mono text-stone-800">{agr.agreementId}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Version</span>
                          <strong className="text-blue-700">{agr.agreementVersion || (agr.versionNumber ? `Version ${agr.versionNumber}` : 'Version 1')}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Agreement Year</span>
                          <strong className="text-stone-800">{agr.agreementYear || new Date(agr.startDate || agr.createdAt || Date.now()).getFullYear()}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Start Date</span>
                          <strong className="text-stone-800">{agr.startDate || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">End Date</span>
                          <strong className="text-stone-800">{agr.endDate || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Status</span>
                          <strong className="text-amber-700">{displayStatus}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Charges</span>
                          <strong className="text-stone-800">₹{agr.charges?.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Commission %</span>
                          <strong className="text-stone-800">{agr.commissionPercent}%</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Profit %</span>
                          <strong className="text-stone-800">{agr.profitPercentage}%</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Created Date</span>
                          <strong className="text-stone-800">{agr.createdAt ? new Date(agr.createdAt).toLocaleDateString() : 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-stone-400 block font-medium">Signed By</span>
                          <span className="truncate block font-semibold text-stone-800">{agr.signedBy || 'Super Admin'}</span>
                        </div>
                      </div>

                      {/* Terms and Conditions preview in drawer */}
                      {agr.termsAndConditions && (
                        <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-700">
                          <strong className="text-stone-900 block mb-0.5">📜 Terms & Conditions:</strong>
                          <p className="line-clamp-2 text-stone-600">{agr.termsAndConditions}</p>
                        </div>
                      )}

                      {/* Termination Details Section if active notice or terminated */}
                      {agr.terminationDetails && (
                        <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between font-bold text-red-900">
                            <span>Termination Status: {agr.terminationDetails.status}</span>
                            <span className="text-[10px] text-red-700">Notice Date: {agr.terminationDetails.noticeDate}</span>
                          </div>
                          <p className="text-red-800">
                            <strong>Reason:</strong> {agr.terminationDetails.reason}
                          </p>
                          <div className="flex justify-between text-[11px] text-red-700">
                            <span>Notice Period: {agr.terminationDetails.noticePeriodDays} days</span>
                            <span>Effective Date: <strong>{agr.terminationDetails.effectiveDate}</strong></span>
                          </div>
                          {agr.terminationDetails.notes && (
                            <p className="text-stone-600 italic">Notes: {agr.terminationDetails.notes}</p>
                          )}
                        </div>
                      )}

                      {/* Franchise Agreement Acceptance Record */}
                      <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 flex items-center gap-1.5">
                            <FileCheck2 className="w-4 h-4 text-blue-600" />
                            Franchise Agreement Acceptance Record:
                          </span>
                          {agr.acceptanceRecord?.acceptanceStatus === 'ACCEPTED' || agr.termsAccepted || agr.signedAt || agr.status === 'ACCEPTED' || agr.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                              <CheckCircle2 className="w-3 h-3 text-blue-600" />
                              Permanent Record Saved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Acceptance
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-blue-100 text-[11px]">
                          <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                            <span className="text-stone-500 block text-[10px]">Agreement ID</span>
                            <strong className="font-mono text-stone-900 truncate block" title={agr.acceptanceRecord?.agreementId || agr.agreementId}>
                              {agr.acceptanceRecord?.agreementId || agr.agreementId}
                            </strong>
                          </div>

                          <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                            <span className="text-stone-500 block text-[10px]">Franchise Partner ID</span>
                            <strong className="font-mono text-stone-900 truncate block" title={agr.acceptanceRecord?.franchisePartnerId || agr.franchisePartnerId || selectedPartner?.franchisePartnerId || selectedPartner?.id || 'N/A'}>
                              {agr.acceptanceRecord?.franchisePartnerId || agr.franchisePartnerId || selectedPartner?.franchisePartnerId || selectedPartner?.id || 'N/A'}
                            </strong>
                          </div>

                          <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                            <span className="text-stone-500 block text-[10px]">Acceptance Date & Time</span>
                            <strong className="text-stone-900 block truncate" title={agr.acceptanceRecord?.acceptanceDateTime ? new Date(agr.acceptanceRecord.acceptanceDateTime).toLocaleString('en-IN') : (agr.signedAt ? new Date(agr.signedAt).toLocaleString('en-IN') : 'Pending')}>
                              {agr.acceptanceRecord?.acceptanceDateTime
                                ? new Date(agr.acceptanceRecord.acceptanceDateTime).toLocaleString('en-IN')
                                : agr.signedAt
                                ? new Date(agr.signedAt).toLocaleString('en-IN')
                                : 'Pending'}
                            </strong>
                          </div>

                          <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                            <span className="text-stone-500 block text-[10px]">Agreement Version</span>
                            <strong className="text-stone-900 block font-semibold">
                              {agr.acceptanceRecord?.agreementVersion || agr.agreementVersion || 'v1.0'}
                            </strong>
                          </div>

                          <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                            <span className="text-stone-500 block text-[10px]">Acceptance Status</span>
                            <strong className="text-blue-800 font-bold block">
                              {agr.acceptanceRecord?.acceptanceStatus || (agr.termsAccepted || agr.signedAt ? 'ACCEPTED' : 'PENDING')}
                            </strong>
                          </div>

                          <div className="bg-white/90 p-2 rounded-xl border border-blue-100 shadow-2xs">
                            <span className="text-stone-500 block text-[10px]">Partner Account ID</span>
                            <strong className="font-mono text-stone-900 truncate block" title={agr.acceptanceRecord?.partnerAccountId || selectedPartner?.loginUsername || selectedPartner?.id || agr.franchisePartnerId}>
                              {agr.acceptanceRecord?.partnerAccountId || selectedPartner?.loginUsername || selectedPartner?.id || agr.franchisePartnerId}
                            </strong>
                          </div>
                        </div>
                        {agr.acceptanceRecord?.signerName && (
                          <div className="text-[11px] text-blue-900 pt-0.5 flex items-center justify-between">
                            <span>Signer: <strong>{agr.acceptanceRecord.signerName}</strong> {agr.acceptanceRecord.signerDesignation ? `(${agr.acceptanceRecord.signerDesignation})` : ''}</span>
                            <span className="text-[10px] text-blue-700 italic">Permanent Legal Audit Record</span>
                          </div>
                        )}
                      </div>

                      {/* Franchise Agreement Document Upload & Status Section */}
                      <div className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-stone-600" />
                              Signed Agreement Document:
                            </span>
                            {agr.agreementDocument?.fileUrl ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Document Uploaded
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 border border-stone-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Not Uploaded
                              </span>
                            )}
                          </div>
                          {agr.agreementDocument?.fileUrl ? (
                            <p className="text-[11px] text-stone-600">
                              <span className="font-semibold text-stone-900">{agr.agreementDocument.fileName}</span>
                              {agr.agreementDocument.fileSize ? ` (${(agr.agreementDocument.fileSize / 1024).toFixed(1)} KB)` : ''} • Uploaded on{' '}
                              <strong>{new Date(agr.agreementDocument.uploadedAt).toLocaleDateString()}</strong> by {agr.agreementDocument.uploadedBy}
                            </p>
                          ) : (
                            <p className="text-[11px] text-stone-500">
                              Official signed agreement copy not yet uploaded by Super Admin.
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {agr.agreementDocument?.fileUrl ? (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePreviewDocument(
                                    agr.agreementDocument!.fileUrl,
                                    agr.agreementDocument!.fileName || `Agreement-${agr.agreementId}`,
                                    agr.agreementDocument!.fileType || 'application/pdf'
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                title="View Document"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>View</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadAgreementDoc(
                                    agr.agreementDocument!.fileUrl,
                                    agr.agreementDocument!.fileName || `Agreement-${agr.agreementId}.pdf`
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                                title="Download Document"
                              >
                                <Download className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenUploadDocModal(agr, selectedPartner)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                                title="Re-upload / Replace Document"
                              >
                                <UploadCloud className="w-3.5 h-3.5 text-amber-700" />
                                <span>Replace</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenUploadDocModal(agr, selectedPartner)}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                            >
                              <UploadCloud className="w-3.5 h-3.5 text-white" />
                              <span>Upload Signed Document</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                        <p className="text-xs text-stone-600 italic max-w-xs sm:max-w-md truncate">
                          "{agr.termsAndConditions}"
                        </p>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditFinancials(agr, selectedPartner)}
                            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Financials</span>
                          </button>

                          {/* Approve Agreement Button */}
                          {!isTerminated && !isCancelled && displayStatus !== 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleOpenApproveModal(agr, selectedPartner)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shadow-xs"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve Agreement</span>
                            </button>
                          )}

                          {/* Reject Agreement Button */}
                          {!isTerminated && !isCancelled && !isRejected && (
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(agr, selectedPartner)}
                              className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject Agreement</span>
                            </button>
                          )}

                          {/* Cancel Agreement Button */}
                          {!isTerminated && !isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleOpenCancelModal(agr, selectedPartner)}
                              className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancel Agreement</span>
                            </button>
                          )}

                          {(isActive || isCancelled) && (
                            <button
                              type="button"
                              onClick={() => handleOpenTerminateModal(agr, selectedPartner)}
                              className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>Terminate</span>
                            </button>
                          )}

                          {isNoticeIssued && (
                            <button
                              type="button"
                              onClick={() => handleCancelTermination(agr, selectedPartner)}
                              className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancel Termination</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  const partner = selectedPartner;
                  setSelectedPartner(null);
                  handleOpenRenewModal(partner);
                }}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer"
              >
                + Renew Agreement
              </button>
              <button
                type="button"
                onClick={() => setSelectedPartner(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Agreement Modal */}
      {isRenewModalOpen && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full">
                  Annual Franchise Renewal
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  Renew Agreement: {selectedPartner.assignedDistrictName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRenewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handleExecuteRenewal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">New Agreement ID</label>
                <input
                  type="text"
                  required
                  value={newAgreementId}
                  onChange={(e) => setNewAgreementId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Charges (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newCharges}
                    onChange={(e) => setNewCharges(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Commission (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={newCommission}
                    onChange={(e) => setNewCommission(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Profit Share (%)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={newProfit}
                    onChange={(e) => setNewProfit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Terms &amp; Conditions</label>
                <textarea
                  rows={3}
                  required
                  value={newTerms}
                  onChange={(e) => setNewTerms(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRenewal}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingRenewal ? 'Processing...' : 'Confirm & Create New Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Financials Modal */}
      {isEditFinModalOpen && selectedAgrForEditFin && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  Edit Agreement Financials
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  Agreement: {selectedAgrForEditFin.agreementId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditFinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFinancials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Franchise Charges (₹)</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editCharges}
                  onChange={(e) => setEditCharges(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Commission %</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  step="0.1"
                  value={editCommission}
                  onChange={(e) => setEditCommission(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Profit %</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={100}
                  step="0.1"
                  value={editProfit}
                  onChange={(e) => setEditProfit(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-amber-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditFinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEditFin}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingEditFin ? 'Saving...' : 'Save Financials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Agreement Modal */}
      {isTerminateModalOpen && selectedAgreementForTerm && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  Agreement Termination Notice
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  Terminate Agreement: {selectedAgreementForTerm.agreementId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTerminateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteTermination} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Termination Reason</label>
                <textarea
                  rows={2}
                  required
                  value={termReason}
                  onChange={(e) => setTermReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Notice Date</label>
                  <input
                    type="date"
                    required
                    value={termNoticeDate}
                    onChange={(e) => setTermNoticeDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Notice Period (Days)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={termNoticePeriodDays}
                    onChange={(e) => setTermNoticePeriodDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Effective Termination Date (Calculated)</label>
                <input
                  type="date"
                  required
                  value={termEffectiveDate}
                  onChange={(e) => setTermEffectiveDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold font-mono text-red-700 bg-red-50 rounded-xl border border-red-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  value={termNotes}
                  onChange={(e) => setTermNotes(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-red-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsTerminateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTermination}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  {submittingTermination ? 'Issuing Notice...' : 'Issue Termination Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve Agreement Modal */}
      {isApproveModalOpen && selectedAgrForApprove && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Super Admin Final Approval
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  Approve Agreement: {selectedAgrForApprove.agreementId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApproveAgreement} className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs text-stone-800">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">District & Franchise:</span>
                  <strong>{selectedPartner.assignedDistrictName} ({selectedPartner.franchiseCode})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Partner Name:</span>
                  <strong>{selectedPartner.ownerName || selectedPartner.businessName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Validity Period:</span>
                  <strong>{selectedAgrForApprove.startDate} to {selectedAgrForApprove.endDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Charges & Commission:</span>
                  <strong>₹{selectedAgrForApprove.charges?.toLocaleString()} | {selectedAgrForApprove.commissionPercent}% Comm. | {selectedAgrForApprove.profitPercentage}% Profit</strong>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-emerald-200/60">
                  <span className="text-stone-500 font-medium">Partner Acceptance:</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedAgrForApprove.termsAccepted || selectedAgrForApprove.signedAt || selectedAgrForApprove.status === 'ACCEPTED' || selectedAgrForApprove.acceptanceRecord?.acceptanceStatus === 'ACCEPTED'
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {selectedAgrForApprove.termsAccepted || selectedAgrForApprove.signedAt || selectedAgrForApprove.status === 'ACCEPTED' || selectedAgrForApprove.acceptanceRecord?.acceptanceStatus === 'ACCEPTED'
                      ? `Accepted on ${selectedAgrForApprove.acceptanceRecord?.acceptanceDateTime ? new Date(selectedAgrForApprove.acceptanceRecord.acceptanceDateTime).toLocaleString('en-IN') : (selectedAgrForApprove.signedAt ? new Date(selectedAgrForApprove.signedAt).toLocaleDateString() : 'Yes')}`
                      : 'Pending Acceptance'}
                  </span>
                </div>

                {/* Acceptance Record Audit Information in Modal */}
                <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-500 block text-[10px]">Agreement ID:</span>
                    <strong className="font-mono text-stone-900">{selectedAgrForApprove.acceptanceRecord?.agreementId || selectedAgrForApprove.agreementId}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">Franchise Partner ID:</span>
                    <strong className="font-mono text-stone-900">{selectedAgrForApprove.acceptanceRecord?.franchisePartnerId || selectedAgrForApprove.franchisePartnerId || selectedPartner.franchisePartnerId || selectedPartner.id}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">Agreement Version:</span>
                    <strong className="text-stone-900">{selectedAgrForApprove.acceptanceRecord?.agreementVersion || selectedAgrForApprove.agreementVersion || 'v1.0'}</strong>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px]">Partner Account ID:</span>
                    <strong className="font-mono text-stone-900">{selectedAgrForApprove.acceptanceRecord?.partnerAccountId || selectedPartner.loginUsername || selectedPartner.id}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1">
                <p className="font-semibold text-stone-800">Approval Criteria & Activation Rules:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-600">
                  <li>Agreement status will transition to <strong>ACTIVE</strong> if accepted and start date ({selectedAgrForApprove.startDate}) is reached.</li>
                  <li>If start date is in the future, status will be set to <strong>APPROVED</strong> until the start date arrives.</li>
                  <li>Approval timestamp and approving Super Admin ID will be permanently recorded in the audit trail.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApprove}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {submittingApprove ? 'Approving...' : 'Confirm & Approve Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Agreement Modal */}
      {isRejectModalOpen && selectedAgrForReject && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
                  Super Admin Rejection
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  Reject Agreement: {selectedAgrForReject.agreementId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRejectAgreement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Rejection Reason (अस्वीकृति का कारण) *</label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter detailed reason for rejecting this agreement..."
                  className="w-full p-3 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                <p className="font-semibold">⚠️ Note:</p>
                <p className="text-[11px] text-rose-800">
                  Rejecting this agreement will set its status to <strong>REJECTED</strong> and record the rejection reason. Historical records will remain intact.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReject || !rejectReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {submittingReject ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Agreement Modal */}
      {isCancelModalOpen && selectedAgrForCancel && selectedPartner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-700 bg-stone-100 px-2.5 py-1 rounded-full">
                  Super Admin Cancellation
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1">
                  Cancel Agreement: {selectedAgrForCancel.agreementId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCancelAgreement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Cancellation Reason (रद्दीकरण का कारण) *</label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter detailed reason for cancelling this agreement..."
                  className="w-full p-3 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-stone-500"
                />
              </div>

              <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-700 space-y-1">
                <p className="font-semibold text-stone-900">⚠️ Note:</p>
                <p className="text-[11px]">
                  Cancelling this agreement will mark it as <strong>CANCELLED</strong> with the stated reason. Full historical records and audit events are preserved.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel || !cancelReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-2"
                >
                  <Ban className="w-4 h-4" />
                  {submittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {uploadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-emerald-900 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-700 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{uploadSuccessToast}</span>
            <button
              type="button"
              onClick={() => setUploadSuccessToast(null)}
              className="ml-2 text-emerald-300 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Upload Agreement Document Modal */}
      {isUploadDocModalOpen && selectedAgrForUploadDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                  Super Admin Document Vault
                </span>
                <h3 className="text-lg font-black text-stone-900 mt-1 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-amber-600" />
                  Upload Signed Agreement Document
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUploadDocModalOpen(false);
                  setUploadDocFile(null);
                  setUploadDocError(null);
                }}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteDocUpload} className="space-y-4">
              {/* Target Agreement Context Info */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs space-y-1.5 text-stone-700">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Agreement ID:</span>
                  <strong className="font-mono text-stone-900">{selectedAgrForUploadDoc.agreementId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">District & Code:</span>
                  <strong>
                    {selectedAgrForUploadDoc.districtName} ({selectedAgrForUploadDoc.franchiseCode})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-medium">Agreement Period:</span>
                  <span>
                    {selectedAgrForUploadDoc.startDate} to {selectedAgrForUploadDoc.endDate}
                  </span>
                </div>
                {selectedAgrForUploadDoc.agreementDocument?.fileName && (
                  <div className="flex justify-between pt-1 border-t border-stone-200 text-amber-800">
                    <span className="font-medium">Current File:</span>
                    <span className="truncate max-w-[200px] font-semibold">{selectedAgrForUploadDoc.agreementDocument.fileName}</span>
                  </div>
                )}
              </div>

              {/* File Dropzone / Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  Select Agreement Document (PDF, JPG, JPEG, PNG) *
                </label>
                <div className="border-2 border-dashed border-stone-300 hover:border-amber-500 rounded-2xl p-6 text-center transition bg-stone-50/50 flex flex-col items-center justify-center cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/jpeg,image/jpg,image/png"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const f = e.target.files[0];
                        setUploadDocFile(f);
                        setUploadDocError(null);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  {uploadDocFile ? (
                    <div className="space-y-1">
                      <span className="font-bold text-stone-900 text-xs block truncate max-w-xs">
                        {uploadDocFile.name}
                      </span>
                      <span className="text-[11px] text-stone-500 block">
                        {(uploadDocFile.size / 1024).toFixed(1)} KB • {uploadDocFile.type || 'Document'}
                      </span>
                      <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-1">
                        ✓ Ready to Upload
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-stone-800">
                        Click or drag &amp; drop file here
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Supported formats: <strong>PDF, JPG, JPEG, PNG</strong> (Max 20MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {uploadDocError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{uploadDocError}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-semibold">🔒 Security & Access Rules:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  <li>Stored securely in Firebase Storage with encrypted storage references.</li>
                  <li>Accessible only by Super Admin and the authorized Franchise Partner.</li>
                  <li>Document URL and metadata will be permanently attached to this agreement record.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadDocModalOpen(false);
                    setUploadDocFile(null);
                    setUploadDocError(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs cursor-pointer hover:bg-stone-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !uploadDocFile}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  {uploadingDoc ? 'Uploading...' : 'Save & Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Franchise Agreement Document Preview Modal */}
      {isPreviewDocModalOpen && previewDocUrl && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-stone-900 truncate max-w-xs sm:max-w-md">
                    {previewDocTitle}
                  </h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Verified Legal Franchise Agreement Copy
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAgreementDoc(previewDocUrl, previewDocTitle)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <a
                  href={previewDocUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewDocModalOpen(false);
                    setPreviewDocUrl(null);
                  }}
                  className="w-8 h-8 rounded-full bg-stone-200 text-stone-700 hover:bg-stone-300 flex items-center justify-center cursor-pointer text-sm font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="flex-1 bg-stone-100 p-3 sm:p-4 overflow-auto flex items-center justify-center">
              {previewDocType.includes('pdf') || previewDocUrl.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={previewDocUrl}
                  className="w-full h-full rounded-2xl bg-white border border-stone-300 shadow-inner"
                  title="Agreement Document PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-900/10 rounded-2xl p-2 overflow-auto">
                  <img
                    src={previewDocUrl}
                    alt={previewDocTitle}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-2.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between text-[11px] text-stone-500">
              <span>Deepak Buildcon Private Limited • Legal Records Archive</span>
              <button
                type="button"
                onClick={() => {
                  setIsPreviewDocModalOpen(false);
                  setPreviewDocUrl(null);
                }}
                className="text-stone-700 hover:text-stone-950 font-bold cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


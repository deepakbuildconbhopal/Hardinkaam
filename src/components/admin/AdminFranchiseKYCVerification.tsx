import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Lock,
  Unlock,
  RefreshCw,
  Building,
  UserCheck,
  MapPin,
  X,
  History,
  Send,
} from 'lucide-react';
import {
  FranchisePartner,
  KYCDocumentRecord,
  KYCDocumentType,
  FranchiseKYCSettings,
} from '../../types';
import {
  getFranchiseKycSettings,
  subscribeFranchiseKycDocuments,
  getAllFranchiseKycDocuments,
  verifyFranchiseKycDocument,
  canActivateFranchise,
  approveAndActivateFranchise,
  DOCUMENT_TITLES,
  DEFAULT_KYC_SETTINGS,
} from '../../services/franchiseKycService';
import { subscribeAllFranchisePartners } from '../../services/franchisePartnerService';

interface Props {
  adminName?: string;
  onOpenPartnerDistrict?: (districtId: string) => void;
}

export const AdminFranchiseKYCVerification: React.FC<Props> = ({
  adminName = 'Super Admin DEEPAK',
  onOpenPartnerDistrict,
}) => {
  const [partners, setPartners] = useState<FranchisePartner[]>([]);
  const [allDocs, setAllDocs] = useState<KYCDocumentRecord[]>([]);
  const [kycSettings, setKycSettings] = useState<FranchiseKYCSettings>(DEFAULT_KYC_SETTINGS);
  const [selectedPartner, setSelectedPartner] = useState<FranchisePartner | null>(null);
  const [partnerDocs, setPartnerDocs] = useState<KYCDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'>('ALL');

  // Review modal state for single document
  const [activeReviewDoc, setActiveReviewDoc] = useState<KYCDocumentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preview file state
  const [previewDoc, setPreviewDoc] = useState<KYCDocumentRecord | null>(null);

  // Activation check state for selected partner
  const [activationCheck, setActivationCheck] = useState<{ canActivate: boolean; reasons: string[] }>({
    canActivate: false,
    reasons: [],
  });

  // 1. Load data
  useEffect(() => {
    let unsubPartners: (() => void) | undefined;

    const init = async () => {
      try {
        setLoading(true);
        const settings = await getFranchiseKycSettings();
        setKycSettings(settings);

        const docs = await getAllFranchiseKycDocuments();
        setAllDocs(docs);

        unsubPartners = subscribeAllFranchisePartners((pList) => {
          setPartners(pList);
          setLoading(false);
        });
      } catch (err) {
        console.warn('Error loading KYC verification data:', err);
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubPartners) unsubPartners();
    };
  }, []);

  // 2. When a partner is selected, load real-time documents for this partner
  useEffect(() => {
    let unsubPartnerDocs: (() => void) | undefined;
    if (selectedPartner?.id) {
      unsubPartnerDocs = subscribeFranchiseKycDocuments(selectedPartner.id, async (docs) => {
        setPartnerDocs(docs);
        const check = await canActivateFranchise(selectedPartner);
        setActivationCheck(check);
      });
    } else {
      setPartnerDocs([]);
    }

    return () => {
      if (unsubPartnerDocs) unsubPartnerDocs();
    };
  }, [selectedPartner]);

  // Filtered partners list
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.assignedDistrictName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.franchiseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone.includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'VERIFIED') return p.kycStatus === 'VERIFIED';
      if (statusFilter === 'UNDER_REVIEW') return p.kycStatus === 'UNDER_REVIEW';
      if (statusFilter === 'REJECTED') return p.kycStatus === 'REJECTED';
      if (statusFilter === 'PENDING') return !p.kycStatus || p.kycStatus === 'PENDING' || p.kycStatus === 'LOCKED';

      return true;
    });
  }, [partners, searchQuery, statusFilter]);

  // Handle Verify Single Document
  const handleVerifyDoc = async (docRecord: KYCDocumentRecord) => {
    try {
      setActionProcessing(true);
      setStatusMessage(null);

      const res = await verifyFranchiseKycDocument(docRecord.id, 'VERIFIED', '', adminName);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `${docRecord.documentTitle} successfully verified and approved!`,
        });
        setActiveReviewDoc(null);
        // Refresh check
        if (selectedPartner) {
          const check = await canActivateFranchise(selectedPartner);
          setActivationCheck(check);
        }
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to verify' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Action failed' });
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Reject Single Document
  const handleRejectDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReviewDoc || !rejectReason.trim()) return;

    try {
      setActionProcessing(true);
      setStatusMessage(null);

      const res = await verifyFranchiseKycDocument(
        activeReviewDoc.id,
        'REJECTED',
        rejectReason.trim(),
        adminName
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `${activeReviewDoc.documentTitle} marked as REJECTED. Partner can re-upload replacement.`,
        });
        setActiveReviewDoc(null);
        setRejectReason('');
        // Refresh check
        if (selectedPartner) {
          const check = await canActivateFranchise(selectedPartner);
          setActivationCheck(check);
        }
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to reject' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Action failed' });
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Final Franchise Activation
  const handleApproveAndActivate = async () => {
    if (!selectedPartner) return;
    try {
      setActionProcessing(true);
      setStatusMessage(null);

      const res = await approveAndActivateFranchise(selectedPartner, adminName);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `🎉 Franchise Partner for ${selectedPartner.assignedDistrictName} (${selectedPartner.franchiseCode}) has been fully APPROVED & ACTIVATED!`,
        });
        // Update local partner state
        setSelectedPartner((prev) => (prev ? { ...prev, status: 'ACTIVE', kycStatus: 'VERIFIED' } : null));
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Activation failed',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Activation failed',
      });
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-stone-900 via-stone-800 to-stone-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-400/30">
              SUPER ADMIN HUB
            </span>
            <span className="text-[10px] text-stone-300 font-bold">Deepak Buildcon Official</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-400" />
            <span>Franchise KYC &amp; Document Verification</span>
          </h2>
          <p className="text-xs text-stone-300 mt-1 max-w-xl">
            Inspect, approve, or reject business certificates (Gumasta, GST, Aadhaar, Utility bills) submitted by district franchise partners.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-stone-400">Total Partners</div>
            <div className="text-xl font-black text-white">{partners.length} Districts</div>
          </div>
        </div>
      </div>

      {/* Global Status Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 border animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Layout: Left (Partners List) | Right (Selected Partner KYC Dossier) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Partners List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, district, code, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-stone-50"
              />
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
              {(['ALL', 'UNDER_REVIEW', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-black transition cursor-pointer shrink-0 ${
                    statusFilter === st
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Partner Cards List */}
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredPartners.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-white rounded-3xl border border-dashed border-stone-200">
                No franchise partners found matching criteria.
              </div>
            ) : (
              filteredPartners.map((partner) => {
                const isSelected = selectedPartner?.id === partner.id;
                const isAgreementDone = partner.agreementStatus === 'COMPLETED';

                return (
                  <div
                    key={partner.id}
                    onClick={() => setSelectedPartner(partner)}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50/60 border-orange-300 ring-2 ring-orange-200/60 shadow-xs'
                        : 'bg-white border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-stone-900">{partner.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-orange-600">
                            {partner.franchiseCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          <span className="font-semibold text-stone-700">{partner.assignedDistrictName}</span>
                          <span>•</span>
                          <span>{partner.phone}</span>
                        </div>
                      </div>

                      {/* Status Pills */}
                      <div className="text-right shrink-0">
                        {partner.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                            ACTIVE
                          </span>
                        ) : partner.kycStatus === 'UNDER_REVIEW' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                            UNDER REVIEW
                          </span>
                        ) : partner.kycStatus === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                            REJECTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            PENDING
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick indicator badges */}
                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] font-bold text-stone-500">
                      <span className={isAgreementDone ? 'text-emerald-700' : 'text-amber-700'}>
                        {isAgreementDone ? '✓ Agreement Signed' : '🔒 Agreement Pending'}
                      </span>
                      <span className="text-stone-400">Click to Inspect Dossier →</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Partner Dossier (7 cols) */}
        <div className="lg:col-span-7">
          {selectedPartner ? (
            <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6 animate-in fade-in">
              {/* Partner Overview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800">
                      {selectedPartner.franchiseCode}
                    </span>
                    <span className="text-xs font-bold text-stone-500">
                      {selectedPartner.assignedDistrictName} District
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-stone-900 mt-1">{selectedPartner.name}</h3>
                  <div className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                    <span>Phone: {selectedPartner.phone}</span>
                    <span>•</span>
                    <span>Email: {selectedPartner.email}</span>
                  </div>
                </div>

                {/* Agreement Status */}
                <div className="shrink-0 p-3 rounded-2xl bg-stone-50 border border-stone-200 text-right">
                  <div className="text-[10px] uppercase font-bold text-stone-400">Legal Agreement</div>
                  <div className="mt-0.5">
                    {selectedPartner.agreementStatus === 'COMPLETED' ? (
                      <span className="text-xs font-black text-emerald-700 flex items-center gap-1 justify-end">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> COMPLETED (अनुबंधित)
                      </span>
                    ) : (
                      <span className="text-xs font-black text-amber-700 flex items-center gap-1 justify-end">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> NOT COMPLETED (अपूर्ण)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents Checklist & Actions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-stone-900">
                    Uploaded KYC Verification Dossier ({partnerDocs.length} Documents)
                  </h4>
                  <span className="text-[11px] font-bold text-stone-500">
                    Gumasta is Mandatory 🔒
                  </span>
                </div>

                {/* Document Slots List */}
                <div className="space-y-3">
                  {[
                    { type: 'GUMASTA' as KYCDocumentType, isMandatoryGumasta: true },
                    { type: 'GST' as KYCDocumentType, requirement: kycSettings.gst },
                    { type: 'AADHAAR' as KYCDocumentType, requirement: kycSettings.aadhaar },
                    { type: 'ELECTRICITY_BILL' as KYCDocumentType, requirement: kycSettings.electricityBill },
                    { type: 'OTHER_CERTIFICATE' as KYCDocumentType, requirement: kycSettings.otherCertificate },
                  ]
                    .filter((item) => item.isMandatoryGumasta || item.requirement !== 'DISABLED')
                    .map((item) => {
                      const docInfo = DOCUMENT_TITLES[item.type];
                      const uploadedDoc = partnerDocs.find((d) => d.documentType === item.type);
                      const isMandatory = item.isMandatoryGumasta || item.requirement === 'REQUIRED';

                      return (
                        <div
                          key={item.type}
                          className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            uploadedDoc?.status === 'VERIFIED'
                              ? 'bg-emerald-50/30 border-emerald-200'
                              : uploadedDoc?.status === 'REJECTED'
                              ? 'bg-rose-50/30 border-rose-200'
                              : uploadedDoc
                              ? 'bg-stone-50 border-stone-200'
                              : 'bg-stone-50/50 border-stone-200/60 opacity-80'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-stone-900">{docInfo.en}</span>
                              {item.isMandatoryGumasta ? (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                                  REQUIRED 🔒
                                </span>
                              ) : item.requirement === 'REQUIRED' ? (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  REQUIRED
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                  OPTIONAL
                                </span>
                              )}
                            </div>

                            {uploadedDoc ? (
                              <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5 text-stone-400" />
                                <span className="font-semibold text-stone-800 truncate max-w-[200px]">
                                  {uploadedDoc.fileName}
                                </span>
                                <span>•</span>
                                <span>{new Date(uploadedDoc.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-stone-400 mt-1 italic">
                                Not uploaded yet by partner
                              </div>
                            )}

                            {/* Rejection Notice */}
                            {uploadedDoc?.status === 'REJECTED' && uploadedDoc.rejectionReason && (
                              <div className="text-[10px] font-bold text-rose-700 mt-1">
                                Rejection: {uploadedDoc.rejectionReason}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons for Document */}
                          <div className="flex items-center gap-2 shrink-0">
                            {uploadedDoc ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(uploadedDoc)}
                                  className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>

                                {uploadedDoc.status !== 'VERIFIED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleVerifyDoc(uploadedDoc)}
                                    disabled={actionProcessing}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 transition cursor-pointer shadow-xs disabled:opacity-60"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Verify</span>
                                  </button>
                                )}

                                {uploadedDoc.status !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveReviewDoc(uploadedDoc);
                                      setRejectReason('');
                                    }}
                                    disabled={actionProcessing}
                                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-60"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                )}

                                {uploadedDoc.status === 'VERIFIED' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> VERIFIED
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] text-stone-400 font-bold px-2 py-1 bg-stone-100 rounded-lg">
                                Missing
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Final Franchise Approval & Activation Section */}
              <div className="p-5 rounded-3xl bg-stone-50 border border-stone-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-orange-600" />
                    <span>Final Franchise Partner Activation (अंतिम सक्रियण नियम)</span>
                  </h4>
                  <span className="text-[10px] font-bold text-stone-500">
                    Status: <strong className={selectedPartner.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-600'}>{selectedPartner.status || 'PENDING'}</strong>
                  </span>
                </div>

                {/* 5-Rule Verification Progress Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    activationCheck.checklist?.agreementApprovedOrActive
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-stone-100 border-stone-200 text-stone-600'
                  }`}>
                    {activationCheck.checklist?.agreementApprovedOrActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                    <span>1. Agreement Status: <strong>{activationCheck.checklist?.agreementApprovedOrActive ? 'APPROVED / ACTIVE' : 'Pending Approval'}</strong></span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    activationCheck.checklist?.agreementAccepted
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-stone-100 border-stone-200 text-stone-600'
                  }`}>
                    {activationCheck.checklist?.agreementAccepted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                    <span>2. Agreement Acceptance: <strong>{activationCheck.checklist?.agreementAccepted ? 'COMPLETED' : 'Pending Signature'}</strong></span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    activationCheck.checklist?.gumastaVerified
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    {activationCheck.checklist?.gumastaVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                    <span>3. Gumasta Certificate: <strong>{activationCheck.checklist?.gumastaVerified ? 'VERIFIED' : 'Pending / Missing'}</strong></span>
                  </div>

                  <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                    activationCheck.checklist?.requiredKycVerified
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    {activationCheck.checklist?.requiredKycVerified ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <span>4. Required KYC Docs: <strong>{activationCheck.checklist?.requiredKycVerified ? 'ALL VERIFIED' : 'Incomplete'}</strong></span>
                  </div>
                </div>

                {/* Validation checklist status banner */}
                {activationCheck.canActivate ? (
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      5. Ready for Final Super Admin Approval! All 4 prerequisites verified (Agreement Approved &amp; Accepted, Gumasta Verified, Required KYC Docs Verified).
                    </span>
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <strong className="block font-black text-amber-950">
                      Activation Blocked (Partner remains INACTIVE until all criteria are met):
                    </strong>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-amber-900 font-medium">
                      {activationCheck.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Activation Button */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-200/80">
                  <span className="text-[11px] text-stone-500 font-medium">
                    5. Super Admin Final Approval grants district operation and partner dashboard access.
                  </span>

                  <button
                    type="button"
                    onClick={handleApproveAndActivate}
                    disabled={!activationCheck.canActivate || actionProcessing || selectedPartner.status === 'ACTIVE'}
                    className={`px-5 py-2.5 rounded-2xl font-black text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                      !activationCheck.canActivate || selectedPartner.status === 'ACTIVE'
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    {selectedPartner.status === 'ACTIVE' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Franchise is LIVE &amp; ACTIVE</span>
                      </>
                    ) : actionProcessing ? (
                      'सक्रिय किया जा रहा है...'
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>5. Give Final Super Admin Approval &amp; Activate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-stone-400 bg-white rounded-3xl border border-dashed border-stone-200 flex flex-col items-center justify-center space-y-3">
              <ShieldCheck className="w-12 h-12 text-stone-300" />
              <p className="font-bold text-stone-600">Select a Franchise Partner from the left list to review KYC</p>
              <span className="text-[11px] text-stone-400">
                You can review documents, verify certificates, request re-uploads, or activate franchises.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal with Reason Input */}
      {activeReviewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reject KYC Document</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveReviewDoc(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-stone-600">
              You are rejecting <strong>{activeReviewDoc.documentTitle}</strong> ({activeReviewDoc.fileName}). Please provide an explicit reason so the franchise partner can re-upload a compliant replacement.
            </div>

            <form onSubmit={handleRejectDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Rejection Reason (अस्वीकृति का कारण) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Seal and stamp are unreadable. Please upload a clear color scan."
                  className="w-full p-3 text-xs rounded-2xl border border-stone-200 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveReviewDoc(null)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing || !rejectReason.trim()}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-60"
                >
                  {actionProcessing ? 'Rejecting...' : 'Reject & Request Re-upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">{previewDoc.documentTitle}</h3>
                <span className="text-xs text-stone-500 font-mono">{previewDoc.fileName}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document display */}
            <div className="max-h-[65vh] overflow-auto rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center p-2">
              {previewDoc.fileType?.includes('pdf') || previewDoc.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.documentTitle}
                  className="w-full h-[55vh] rounded-xl"
                />
              ) : (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.documentTitle}
                  className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            {/* Verification & History info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-2 border-t border-stone-100">
              <div className="text-stone-500">
                Uploaded: <strong>{new Date(previewDoc.uploadedAt).toLocaleString()}</strong> by{' '}
                <strong>{previewDoc.uploadedBy}</strong>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc.status !== 'VERIFIED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleVerifyDoc(previewDoc);
                      setPreviewDoc(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition cursor-pointer shadow-xs"
                  >
                    Verify &amp; Approve
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

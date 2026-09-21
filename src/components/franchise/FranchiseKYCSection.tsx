import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  FileCheck2,
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  RefreshCw,
  FileSpreadsheet,
  Building,
  Sparkles,
  Info,
  ArrowRight,
  Download,
  X,
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
  uploadFranchiseKycDocument,
  submitFranchiseKycForReview,
  DOCUMENT_TITLES,
  DEFAULT_KYC_SETTINGS,
} from '../../services/franchiseKycService';

interface Props {
  partner: FranchisePartner;
  onNavigateToAgreement?: () => void;
  onRefreshPartner?: () => void;
}

export const FranchiseKYCSection: React.FC<Props> = ({
  partner,
  onNavigateToAgreement,
  onRefreshPartner,
}) => {
  const [kycSettings, setKycSettings] = useState<FranchiseKYCSettings>(DEFAULT_KYC_SETTINGS);
  const [documents, setDocuments] = useState<KYCDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocType, setUploadingDocType] = useState<KYCDocumentType | null>(null);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<KYCDocumentRecord | null>(null);

  // Check agreement lock - Unlocked when agreement is completed, approved, active, or accepted
  const isAgreementCompleted =
    partner?.agreementStatus === 'COMPLETED' ||
    partner?.agreementStatus === 'APPROVED' ||
    partner?.agreementStatus === 'ACTIVE' ||
    partner?.agreementTermsAccepted === true;

  // 1. Fetch KYC settings & subscribe to partner documents
  useEffect(() => {
    let unsubDocs: (() => void) | undefined;

    const load = async () => {
      try {
        setLoading(true);
        const settings = await getFranchiseKycSettings();
        setKycSettings(settings);

        if (partner?.id) {
          unsubDocs = subscribeFranchiseKycDocuments(partner.id, (docs) => {
            setDocuments(docs);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.warn('Error loading KYC settings:', err);
        setLoading(false);
      }
    };

    load();

    return () => {
      if (unsubDocs) unsubDocs();
    };
  }, [partner?.id]);

  // Document list to render
  const documentSlots: Array<{
    type: KYCDocumentType;
    requirement: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
    isMandatoryGumasta?: boolean;
  }> = useMemo(() => {
    return [
      { type: 'GUMASTA', requirement: 'REQUIRED', isMandatoryGumasta: true },
      { type: 'GST', requirement: kycSettings.gst },
      { type: 'AADHAAR', requirement: kycSettings.aadhaar },
      { type: 'ELECTRICITY_BILL', requirement: kycSettings.electricityBill },
      { type: 'OTHER_CERTIFICATE', requirement: kycSettings.otherCertificate },
    ];
  }, [kycSettings]);

  // Filter out disabled documents
  const activeSlots = useMemo(() => {
    return documentSlots.filter((slot) => slot.requirement !== 'DISABLED');
  }, [documentSlots]);

  // Uploaded documents mapping
  const docMap = useMemo(() => {
    const map = new Map<KYCDocumentType, KYCDocumentRecord>();
    documents.forEach((d) => map.set(d.documentType, d));
    return map;
  }, [documents]);

  // Calculate completion
  const requiredSlots = useMemo(() => activeSlots.filter((s) => s.requirement === 'REQUIRED'), [activeSlots]);
  const uploadedRequiredCount = useMemo(() => {
    return requiredSlots.filter((s) => docMap.has(s.type)).length;
  }, [requiredSlots, docMap]);

  const hasGumastaUploaded = docMap.has('GUMASTA');
  const allRequiredUploaded = uploadedRequiredCount === requiredSlots.length;

  // Handle File Upload
  const handleFileUpload = async (type: KYCDocumentType, file: File) => {
    if (!partner?.id) return;
    try {
      setUploadingDocType(type);
      setStatusMessage(null);

      const res = await uploadFranchiseKycDocument({
        franchisePartnerId: partner.id,
        franchiseCode: partner.franchiseCode,
        districtId: partner.assignedDistrictId,
        districtName: partner.assignedDistrictName,
        documentType: type,
        file,
        uploadedBy: partner.name || 'Franchise Admin',
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `${DOCUMENT_TITLES[type]?.en} successfully uploaded!`,
        });
        if (onRefreshPartner) onRefreshPartner();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Upload failed',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to upload document',
      });
    } finally {
      setUploadingDocType(null);
    }
  };

  // Handle Submit KYC for Review
  const handleSubmitKyc = async () => {
    if (!partner?.id) return;
    try {
      setSubmittingKyc(true);
      setStatusMessage(null);

      const res = await submitFranchiseKycForReview(
        partner.id,
        partner.franchiseCode,
        partner.assignedDistrictName
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'KYC documents successfully submitted for Super Admin review!',
        });
        if (onRefreshPartner) onRefreshPartner();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Submission failed',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to submit KYC',
      });
    } finally {
      setSubmittingKyc(false);
    }
  };

  // =========================================================================
  // VIEW 1: LOCKED STATE (Agreement NOT Completed)
  // =========================================================================
  if (!isAgreementCompleted) {
    return (
      <div className="max-w-3xl mx-auto p-8 rounded-3xl bg-white border border-stone-200/80 shadow-xs space-y-6 text-center animate-in fade-in">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-300 text-amber-600 flex items-center justify-center shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            PREREQUISITE REQUIRED • चरण 1 अपूर्ण
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            Franchise KYC &amp; Documents are Locked 🔒
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            फ्रैंचाइज़ी केवाईसी व दस्तावेज सत्यापन को अनलॉक करने के लिए पहले <strong>दीपक बिल्डकॉन व फ्रैंचाइज़ी पार्टनर अनुबंध पत्र (Legal Agreement)</strong> को पूर्ण व डिजिटल रूप से स्वीकार करना अनिवार्य है।
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left max-w-md mx-auto space-y-2 text-xs text-stone-700">
          <div className="flex items-center gap-2 font-bold text-stone-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>सत्यापन प्रक्रिया अनुक्रम (Process Flow):</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-stone-600">
            <li className="font-bold text-stone-900">1. फ्रैंचाइज़ी अनुबंध पत्र स्वीकार व हस्ताक्षर करें</li>
            <li className="text-stone-400">2. गुमास्ता व अन्य अनिवार्य व्यावसायिक दस्तावेज अपलोड करें</li>
            <li className="text-stone-400">3. सुपर एडमिन द्वारा सत्यापन व फ्रैंचाइज़ी सक्रियण (Activation)</li>
          </ol>
        </div>

        {onNavigateToAgreement && (
          <button
            type="button"
            onClick={onNavigateToAgreement}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-orange-600/20"
          >
            <FileText className="w-4 h-4" />
            <span>Go to Legal Agreement (अनुबंध पत्र पर जाएं)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: UNLOCKED KYC & DOCUMENT UPLOADER
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-linear-to-r from-stone-900 via-stone-800 to-stone-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center gap-1">
                <Unlock className="w-3 h-3" /> AGREEMENT COMPLETED • KYC UNLOCKED
              </span>
              <span className="text-[10px] font-mono font-bold text-stone-300">
                District: {partner.assignedDistrictName} ({partner.franchiseCode})
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-orange-400" />
              <span>Franchise KYC &amp; Documents</span>
            </h2>
            <p className="text-xs text-stone-300 mt-1 max-w-xl">
              Upload your official business registration and identity documents. Gumasta license is mandatory for all district partners.
            </p>
          </div>

          {/* KYC Status Badge */}
          <div className="shrink-0 text-left sm:text-right">
            <div className="text-[10px] uppercase font-bold text-stone-400">Current KYC Status</div>
            <div className="mt-1">
              {partner.kycStatus === 'VERIFIED' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4" /> VERIFIED (सत्यापित)
                </span>
              ) : partner.kycStatus === 'UNDER_REVIEW' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 text-white font-black text-xs shadow-md shadow-blue-500/20">
                  <Clock className="w-4 h-4" /> UNDER REVIEW (समीक्षा जारी)
                </span>
              ) : partner.kycStatus === 'REJECTED' ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs shadow-md shadow-rose-600/20">
                  <XCircle className="w-4 h-4" /> ACTION REQUIRED (पुनः अपलोड करें)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-white font-black text-xs shadow-md shadow-amber-500/20">
                  <Clock className="w-4 h-4" /> PENDING UPLOAD (अपलोड प्रतीक्षित)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="w-full sm:w-2/3 bg-white/10 h-2.5 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                allRequiredUploaded ? 'bg-emerald-400' : 'bg-orange-400'
              }`}
              style={{
                width: `${Math.min(100, Math.round((uploadedRequiredCount / Math.max(1, requiredSlots.length)) * 100))}%`,
              }}
            />
          </div>
          <span className="font-bold text-stone-200">
            {uploadedRequiredCount} of {requiredSlots.length} Required Documents Uploaded
          </span>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 border ${
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

      {/* Document Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeSlots.map((slot) => {
          const docInfo = DOCUMENT_TITLES[slot.type];
          const uploadedDoc = docMap.get(slot.type);
          const isUploading = uploadingDocType === slot.type;
          const isMandatory = slot.isMandatoryGumasta || slot.requirement === 'REQUIRED';

          return (
            <div
              key={slot.type}
              className={`p-5 rounded-3xl bg-white border transition shadow-xs flex flex-col justify-between gap-4 ${
                uploadedDoc?.status === 'VERIFIED'
                  ? 'border-emerald-200 ring-1 ring-emerald-100'
                  : uploadedDoc?.status === 'REJECTED'
                  ? 'border-rose-200 ring-1 ring-rose-100'
                  : slot.isMandatoryGumasta
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-stone-200/80'
              }`}
            >
              <div>
                {/* Slot Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-stone-900">{docInfo.en}</span>
                    </div>
                    <div className="text-[11px] font-semibold text-stone-500 mt-0.5">{docInfo.hi}</div>
                  </div>

                  {/* Requirement Badge */}
                  {slot.isMandatoryGumasta ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                      <Lock className="w-2.5 h-2.5" /> REQUIRED 🔒
                    </span>
                  ) : slot.requirement === 'REQUIRED' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      REQUIRED
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200 shrink-0">
                      OPTIONAL
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">{docInfo.hint}</p>

                {/* Uploaded File Meta & Status */}
                {uploadedDoc ? (
                  <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        <FileText className="w-4 h-4 text-stone-400 shrink-0" />
                        <span className="font-bold text-stone-800 truncate">{uploadedDoc.fileName}</span>
                      </div>
                      {uploadedDoc.fileSize && (
                        <span className="text-[10px] text-stone-400 font-mono">
                          {(uploadedDoc.fileSize / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>

                    {/* Verification Status Pill */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60">
                      <span className="text-[10px] text-stone-500 font-bold uppercase">Status:</span>
                      {uploadedDoc.status === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> VERIFIED
                        </span>
                      ) : uploadedDoc.status === 'UNDER_REVIEW' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 text-blue-600" /> UNDER REVIEW
                        </span>
                      ) : uploadedDoc.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600" /> REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" /> PENDING REVIEW
                        </span>
                      )}
                    </div>

                    {/* Rejection notice box if rejected */}
                    {uploadedDoc.status === 'REJECTED' && uploadedDoc.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 space-y-0.5">
                        <strong className="block font-black text-rose-900">Rejection Reason (अस्वीकृति का कारण):</strong>
                        <p>{uploadedDoc.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-2xl border border-dashed border-stone-300 text-center text-xs text-stone-400">
                    No document uploaded yet
                  </div>
                )}
              </div>

              {/* Actions: View & Upload/Re-upload */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                {uploadedDoc && (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(uploadedDoc)}
                    className="flex-1 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View / Preview</span>
                  </button>
                )}

                <label
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs ${
                    uploadedDoc?.status === 'REJECTED'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : uploadedDoc
                      ? 'bg-stone-800 hover:bg-stone-900 text-white'
                      : slot.isMandatoryGumasta
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-stone-900 hover:bg-stone-800 text-white'
                  } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploading
                      ? 'Uploading...'
                      : uploadedDoc
                      ? 'Re-upload'
                      : 'Upload File'}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(slot.type, file);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Action Bar */}
      <div className="p-6 rounded-3xl bg-white border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-sm font-black text-stone-900">
            Submit Complete Dossier for Super Admin Verification
          </h3>
          <p className="text-xs text-stone-500">
            {!hasGumastaUploaded ? (
              <span className="text-rose-600 font-bold">
                ⚠️ Gumasta certificate is mandatory. Please upload Gumasta to proceed.
              </span>
            ) : !allRequiredUploaded ? (
              <span className="text-amber-700 font-semibold">
                Please upload all {requiredSlots.length} required documents before submitting.
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">
                ✅ All required documents uploaded. Ready for Super Admin approval!
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmitKyc}
          disabled={!hasGumastaUploaded || !allRequiredUploaded || submittingKyc || partner.kycStatus === 'UNDER_REVIEW'}
          className={`px-6 py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
            !hasGumastaUploaded || !allRequiredUploaded || partner.kycStatus === 'UNDER_REVIEW'
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
        >
          {submittingKyc ? (
            'समीक्षा के लिए भेजा जा रहा है...'
          ) : partner.kycStatus === 'UNDER_REVIEW' ? (
            <>
              <Clock className="w-4 h-4" />
              <span>Dossier Submitted (समीक्षा प्रक्रियाधीन)</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Submit KYC for Review (समीक्षा हेतु भेजें)</span>
            </>
          )}
        </button>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-stone-100 shadow-2xl">
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

            {/* Preview Box */}
            <div className="max-h-[60vh] overflow-auto rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center p-2">
              {previewDoc.fileType?.includes('pdf') || previewDoc.fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.fileUrl}
                  title={previewDoc.documentTitle}
                  className="w-full h-[50vh] rounded-xl"
                />
              ) : (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.documentTitle}
                  className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-stone-500 font-bold">
                Uploaded: {new Date(previewDoc.uploadedAt).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-5 py-2 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

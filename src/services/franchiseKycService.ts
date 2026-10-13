import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../utils/sparkQuotaGuard';
import {
  FranchiseKYCSettings,
  KYCDocumentRecord,
  KYCDocumentType,
  KYCDocumentRequirementStatus,
  KYCDocumentVerificationStatus,
  FranchisePartner,
  FranchiseAgreementRecord,
  FranchiseAgreementDocument,
  FranchiseAgreementAcceptanceRecord,
} from '../types';
import { compressImageForWeb } from '../utils/imageCompression';
import { logAuditEvent } from './auditService';
import {
  notifyAdminFranchiseAgreementSubmitted,
  notifyAdminAgreementSubmitted,
  notifyAdminAgreementAccepted,
  notifyAdminKycReadyForReview,
  notifyAdminAgreementRenewalDue,
  notifyAdminAgreementExpired,
  notifyAdminTerminationNoticeIssued,
  notifyAdminPartnerMilestoneReached,
} from './adminNotificationService';
import {
  notifyFranchisePartnerAgreementSent,
  notifyFranchisePartnerAgreementApproved,
  notifyFranchisePartnerAgreementRejected,
  notifyFranchisePartnerKycUnlocked,
  notifyFranchisePartnerKycRejected,
  notifyFranchisePartnerRenewalDue,
  notifyFranchisePartnerAgreementTerminated,
} from './franchiseNotificationService';

// Default KYC Configuration for Super Admin
export const DEFAULT_KYC_SETTINGS: FranchiseKYCSettings = {
  gumasta: 'REQUIRED', // PERMANENTLY LOCKED
  gst: 'REQUIRED',
  aadhaar: 'REQUIRED',
  electricityBill: 'REQUIRED',
  otherCertificate: 'OPTIONAL',
};

export const DOCUMENT_TITLES: Record<KYCDocumentType, { en: string; hi: string; hint: string }> = {
  GUMASTA: {
    en: 'Gumasta / Shop & Establishment Certificate',
    hi: 'गुमास्ता / दुकान एवं स्थापना पंजीयन प्रमाण पत्र',
    hint: 'Mandatory commercial license issued by Municipal Corporation (अनिवार्य नगर निगम पंजीयन)',
  },
  GST: {
    en: 'GST Registration Certificate',
    hi: 'जीएसटी पंजीकरण प्रमाण पत्र (GSTIN)',
    hint: '3-page GST certificate including Form GST REG-06',
  },
  AADHAAR: {
    en: 'Aadhaar Card (Authorized Signatory)',
    hi: 'आधार कार्ड (अधिकृत फ्रैंचाइज़ी धारक)',
    hint: 'Clear front & back copy with masked Aadhaar number for security',
  },
  ELECTRICITY_BILL: {
    en: 'Electricity Bill (Office Address Proof)',
    hi: 'कार्यालय बिजली बिल (पता सत्यापन हेतु)',
    hint: 'Recent utility bill within last 3 months matching registered office address',
  },
  OTHER_CERTIFICATE: {
    en: 'Other Certificate / Trade License',
    hi: 'अन्य व्यावसायिक प्रमाण पत्र / ट्रेड लाइसेंस',
    hint: 'MSME / Udyam registration, ISO certification, or local trade authorization',
  },
};

const KYC_SETTINGS_DOC_ID = 'franchise_kyc_config';

/**
 * Fetch the global Super Admin KYC requirements configuration
 */
export async function getFranchiseKycSettings(): Promise<FranchiseKYCSettings> {
  try {
    const docRef = doc(db, 'settings', KYC_SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as Partial<FranchiseKYCSettings>;
      return {
        ...DEFAULT_KYC_SETTINGS,
        ...data,
        gumasta: 'REQUIRED', // Enforce Gumasta is ALWAYS REQUIRED 🔒
      };
    }
    return DEFAULT_KYC_SETTINGS;
  } catch (err) {
    console.warn('Error fetching franchise KYC settings, using default:', err);
    return DEFAULT_KYC_SETTINGS;
  }
}

/**
 * Super Admin updates KYC requirements settings
 */
export async function updateFranchiseKycSettings(
  settings: Partial<FranchiseKYCSettings>,
  adminName: string = 'Super Admin DEEPAK'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'settings', KYC_SETTINGS_DOC_ID);
    const payload: FranchiseKYCSettings = {
      gumasta: 'REQUIRED', // GUARANTEED LOCK: Gumasta can NEVER be disabled or made optional
      gst: settings.gst || 'REQUIRED',
      aadhaar: settings.aadhaar || 'REQUIRED',
      electricityBill: settings.electricityBill || 'REQUIRED',
      otherCertificate: settings.otherCertificate || 'OPTIONAL',
      updatedAt: new Date().toISOString(),
      updatedBy: adminName,
    };

    await setDoc(docRef, payload, { merge: true });

    await logAuditEvent({
      action: 'KYC_SETTINGS_UPDATE',
      actorRole: 'admin',
      details: `Updated Franchise KYC Settings: GST=${payload.gst}, Aadhaar=${payload.aadhaar}, Electricity=${payload.electricityBill}, Other=${payload.otherCertificate}. Gumasta=REQUIRED (Locked).`,
      metadata: payload,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update KYC settings:', err);
    return { success: false, error: err.message || 'Failed to update settings' };
  }
}

/**
 * Subscribe to realtime KYC documents for a specific Franchise Partner
 */
export function subscribeFranchiseKycDocuments(
  franchisePartnerId: string,
  callback: (docs: KYCDocumentRecord[]) => void
) {
  const q = query(
    collection(db, 'franchise_kyc_documents'),
    where('franchisePartnerId', '==', franchisePartnerId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const docs: KYCDocumentRecord[] = [];
      snap.forEach((d) => {
        docs.push({ id: d.id, ...d.data() } as KYCDocumentRecord);
      });
      callback(docs);
    },
    (err) => {
      console.warn(`Error subscribing to KYC docs for partner ${franchisePartnerId}:`, err);
      callback([]);
    }
  );
}

/**
 * Fetch all KYC documents across all franchise partners for Super Admin Review
 */
export async function getAllFranchiseKycDocuments(): Promise<KYCDocumentRecord[]> {
  if (isResourceExhausted()) return [];
  try {
    const snap = await getDocs(query(collection(db, 'franchise_kyc_documents'), limit(50)));
    const docs: KYCDocumentRecord[] = [];
    snap.forEach((d) => {
      docs.push({ id: d.id, ...d.data() } as KYCDocumentRecord);
    });
    return docs;
  } catch (err) {
    console.error('Error fetching all KYC docs:', err);
    checkAndHandleQuotaError(err);
    return [];
  }
}

export interface CompleteFranchiseAgreementOptions {
  agreementId?: string;
  agreementVersion?: string;
  partnerAccountId?: string;
  districtId?: string;
  signerName?: string;
  signerDesignation?: string;
}

/**
 * Complete & Sign Legal Franchise Agreement
 * Saves Franchise Agreement Acceptance Record permanently with:
 * - Agreement ID
 * - Franchise Partner ID
 * - Acceptance date and time
 * - Agreement version
 * - Acceptance status
 * - Franchise Partner account ID
 * Unlocks the KYC & Document Verification Section
 */
export async function completeFranchiseAgreement(
  franchisePartnerId: string,
  franchiseCode: string,
  districtName: string,
  signedBy: string = 'Franchise Partner',
  options?: CompleteFranchiseAgreementOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    const now = new Date().toISOString();

    const defaultAgreementId = options?.agreementId || `AGR-${franchiseCode}-${new Date().getFullYear()}`;
    const agreementVersion = options?.agreementVersion || 'v1.0';
    const partnerAccountId = options?.partnerAccountId || franchisePartnerId;

    const acceptanceRecord: FranchiseAgreementAcceptanceRecord = {
      agreementId: defaultAgreementId,
      franchisePartnerId,
      acceptanceDateTime: now,
      agreementVersion,
      acceptanceStatus: 'ACCEPTED',
      partnerAccountId,
      signerName: options?.signerName || signedBy,
      signerDesignation: options?.signerDesignation,
    };

    await updateDoc(partnerRef, {
      agreementStatus: 'COMPLETED',
      agreementSignedAt: now,
      agreementSignedBy: signedBy,
      agreementTermsAccepted: true,
      acceptanceRecord,
      // If KYC was previously locked, advance to PENDING
      kycStatus: 'PENDING',
      updatedAt: now,
    });

    // Also update any agreement records for this partner or create initial record
    try {
      const q = query(
        collection(db, 'franchise_agreements'),
        where('franchisePartnerId', '==', franchisePartnerId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        for (const d of snap.docs) {
          const data = d.data() as FranchiseAgreementRecord;
          const recordAgrId = data.agreementId || defaultAgreementId;
          const recordVersion = data.agreementVersion || 'Version 1';
          const recordVersionNum = data.versionNumber || (parseInt(recordVersion.replace(/[^0-9]/g, '')) || 1);
          const recordAcceptanceRecord: FranchiseAgreementAcceptanceRecord = {
            agreementId: recordAgrId,
            franchisePartnerId,
            acceptanceDateTime: now,
            agreementVersion: recordVersion,
            acceptanceStatus: 'ACCEPTED',
            partnerAccountId,
            signerName: options?.signerName || signedBy,
            signerDesignation: options?.signerDesignation,
          };
          await updateDoc(doc(db, 'franchise_agreements', d.id), {
            status: data.status === 'PENDING' || !data.status ? 'ACCEPTED' : data.status,
            signedAt: now,
            signedBy: signedBy,
            termsAccepted: true,
            versionNumber: recordVersionNum,
            agreementVersion: recordVersion,
            acceptanceRecord: recordAcceptanceRecord,
            updatedAt: now,
          });
        }
      } else {
        // Create initial agreement record (Version 1) so acceptance record is permanently recorded
        const initialVersionNum = 1;
        const initialAgreementVersion = 'Version 1';
        const docId = `agr_${franchisePartnerId}_${defaultAgreementId.replace(/[^a-zA-Z0-9]/g, '_')}_v1_${Date.now()}`;
        const initialRecord: FranchiseAgreementRecord = {
          id: docId,
          franchisePartnerId,
          franchiseCode,
          districtId: options?.districtId || districtName.toLowerCase().replace(/\s+/g, '_'),
          districtName,
          agreementId: defaultAgreementId,
          versionNumber: initialVersionNum,
          agreementVersion: initialAgreementVersion,
          agreementYear: new Date().getFullYear().toString(),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          charges: 50000,
          commissionPercent: 10,
          profitPercentage: 20,
          termsAndConditions: 'Standard 1-Year Franchise Operation & Service Terms',
          status: 'ACCEPTED',
          signedAt: now,
          signedBy: signedBy,
          termsAccepted: true,
          acceptanceRecord,
          createdAt: now,
          createdBy: signedBy,
        };
        await setDoc(doc(db, 'franchise_agreements', docId), initialRecord);
      }
    } catch (e) {
      console.warn('Could not update/create agreement record on acceptance:', e);
    }

    await logAuditEvent({
      action: 'AGREEMENT_COMPLETED',
      targetPartnerId: franchisePartnerId,
      targetDistrictName: districtName,
      details: `Legal Franchise Agreement completed and digitally signed for ${districtName} (${franchiseCode}) by ${signedBy}. KYC module unlocked.`,
      metadata: { franchiseCode, districtName, signedBy, signedAt: now },
    });

    await logAuditEvent({
      action: 'AGREEMENT_ACCEPTED',
      targetPartnerId: franchisePartnerId,
      targetDistrictName: districtName,
      details: `Agreement accepted and digitally signed for ${districtName} (${franchiseCode}) by ${signedBy}.`,
      metadata: { franchiseCode, districtName, signedBy, signedAt: now },
    });

    // Real-time Admin Notification Alerts
    try {
      await notifyAdminFranchiseAgreementSubmitted({
        partnerId: franchisePartnerId,
        partnerName: signedBy || `${districtName} Franchise Partner`,
        districtId: districtName.toLowerCase().replace(/\s+/g, '_'),
        districtName,
        franchiseCode,
        signedBy,
      });
      await notifyAdminAgreementAccepted({
        partnerId: franchisePartnerId,
        partnerName: signedBy || `${districtName} Franchise Partner`,
        districtId: districtName.toLowerCase().replace(/\s+/g, '_'),
        districtName,
        franchiseCode,
        signedBy,
      });
    } catch (notifErr) {
      console.warn('Real-time agreement admin alert notice:', notifErr);
    }

    // Franchise Partner Notification: KYC Unlocked
    try {
      await notifyFranchisePartnerKycUnlocked({
        partnerId: franchisePartnerId,
        districtId: districtName.toLowerCase().replace(/\s+/g, '_'),
        districtName,
        franchiseCode,
      });
    } catch (partnerNotifErr) {
      console.warn('Franchise partner notification notice:', partnerNotifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to complete agreement:', err);
    return { success: false, error: err.message || 'Failed to complete agreement' };
  }
}

/**
 * Upload a KYC document (supports JPG, JPEG, PNG, PDF; < 10MB)
 */
export interface UploadKycDocumentParams {
  franchisePartnerId: string;
  franchiseCode: string;
  districtId: string;
  districtName: string;
  documentType: KYCDocumentType;
  file: File;
  uploadedBy: string;
}

export async function uploadFranchiseKycDocument(
  params: UploadKycDocumentParams
): Promise<{ success: boolean; docId?: string; error?: string }> {
  try {
    const {
      franchisePartnerId,
      franchiseCode,
      districtId,
      districtName,
      documentType,
      file,
      uploadedBy,
    } = params;

    // 1. Validation: Allowed extensions & types
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(extension)) {
      return {
        success: false,
        error: `Invalid file format (.${extension}). Only JPG, JPEG, PNG and PDF documents are allowed.`,
      };
    }

    // 2. Validation: Max 10MB file size
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return {
        success: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum limit of 10 MB.`,
      };
    }

    // Convert file to optimized data URL for fast upload and instant preview
    let base64Data = '';
    let processedFileSize = file.size;

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageForWeb(file, {
          maxDimension: 1200,
          quality: 0.82,
          maxSizeKB: 300,
        });
        base64Data = compressed.dataUrl;
        processedFileSize = compressed.compressedSize;
      } catch {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      }
    } else {
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }

    const now = new Date().toISOString();
    const docRecordId = `${franchisePartnerId}_${documentType.toLowerCase()}`;
    const docRef = doc(db, 'franchise_kyc_documents', docRecordId);

    // Check if existing record exists to maintain verification history
    const existingSnap = await getDoc(docRef);
    let history: any[] = [];
    let isReplacement = false;

    if (existingSnap.exists()) {
      const existingData = existingSnap.data() as KYCDocumentRecord;
      history = existingData.history || [];
      isReplacement = true;
      history.push({
        action: 'REPLACE',
        actor: uploadedBy,
        timestamp: now,
        note: `Replaced document with ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
        fileName: file.name,
      });
    } else {
      history.push({
        action: 'UPLOAD',
        actor: uploadedBy,
        timestamp: now,
        note: `Initial upload of ${DOCUMENT_TITLES[documentType]?.en || documentType}`,
        fileName: file.name,
      });
    }

    const payload: KYCDocumentRecord = {
      id: docRecordId,
      franchisePartnerId,
      franchiseCode,
      districtId,
      districtName,
      documentType,
      documentTitle: DOCUMENT_TITLES[documentType]?.en || documentType,
      fileUrl: base64Data,
      fileName: file.name,
      fileSize: processedFileSize,
      fileType: file.type || `application/${extension}`,
      status: 'PENDING',
      uploadedAt: now,
      uploadedBy,
      history,
    };

    await setDoc(docRef, payload, { merge: true });

    // Update partner's KYC status to action required / pending if previously rejected
    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      kycStatus: 'PENDING',
      updatedAt: now,
    });

    await logAuditEvent({
      action: isReplacement ? 'KYC_DOCUMENT_REPLACED' : 'KYC_DOCUMENT_UPLOADED',
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `${isReplacement ? 'Replaced' : 'Uploaded'} KYC Document: ${DOCUMENT_TITLES[documentType]?.en} (${file.name}) for ${districtName} (${franchiseCode}) by ${uploadedBy}.`,
      metadata: {
        documentType,
        fileName: file.name,
        fileSize: file.size,
        franchiseCode,
      },
    });

    return { success: true, docId: docRecordId };
  } catch (err: any) {
    console.error('Failed to upload KYC document:', err);
    return { success: false, error: err.message || 'Failed to upload document' };
  }
}

/**
 * Super Admin Review: Verify or Reject a KYC document
 */
export async function verifyFranchiseKycDocument(
  docId: string,
  status: 'VERIFIED' | 'REJECTED',
  rejectionReason: string = '',
  adminName: string = 'Super Admin DEEPAK'
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, 'franchise_kyc_documents', docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: 'KYC Document not found' };
    }

    const docData = snap.data() as KYCDocumentRecord;
    const now = new Date().toISOString();
    const history = docData.history || [];

    history.push({
      action: status === 'VERIFIED' ? 'VERIFY' : 'REJECT',
      actor: adminName,
      actorRole: 'admin',
      timestamp: now,
      note: status === 'VERIFIED' ? 'Document verified and approved' : `Rejected: ${rejectionReason}`,
    });

    const updatePayload: Partial<KYCDocumentRecord> = {
      status,
      verifiedAt: now,
      verifiedBy: adminName,
      history,
    };

    if (status === 'REJECTED') {
      updatePayload.rejectionReason = rejectionReason;
    } else {
      updatePayload.rejectionReason = '';
    }

    await updateDoc(docRef, updatePayload);

    // Audit log
    await logAuditEvent({
      action: status === 'VERIFIED' ? 'KYC_DOCUMENT_VERIFIED' : 'KYC_DOCUMENT_REJECTED',
      targetPartnerId: docData.franchisePartnerId,
      targetDistrictId: docData.districtId,
      targetDistrictName: docData.districtName,
      details: `${status === 'VERIFIED' ? 'Verified' : 'Rejected'} KYC Document [${docData.documentTitle}] for ${docData.districtName} (${docData.franchiseCode}) by ${adminName}.${status === 'REJECTED' ? ` Reason: ${rejectionReason}` : ''}`,
      metadata: {
        documentType: docData.documentType,
        status,
        rejectionReason,
        franchiseCode: docData.franchiseCode,
      },
    });

    // Check overall KYC status for this franchise partner
    await evaluateAndUpdatePartnerKycStatus(docData.franchisePartnerId);

    // Franchise Partner Notification if document is rejected
    if (status === 'REJECTED') {
      try {
        await notifyFranchisePartnerKycRejected({
          partnerId: docData.franchisePartnerId,
          districtId: docData.districtId,
          districtName: docData.districtName,
          franchiseCode: docData.franchiseCode,
          documentTitle: docData.documentTitle,
          rejectionReason: rejectionReason || 'Invalid document or unreadable image',
        });
      } catch (notifErr) {
        console.warn('KYC Rejection partner notification notice:', notifErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to verify document:', err);
    return { success: false, error: err.message || 'Verification failed' };
  }
}

/**
 * Submit all uploaded documents for Super Admin Review
 */
export async function submitFranchiseKycForReview(
  franchisePartnerId: string,
  franchiseCode: string,
  districtName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch current settings & uploaded documents
    const settings = await getFranchiseKycSettings();
    const q = query(
      collection(db, 'franchise_kyc_documents'),
      where('franchisePartnerId', '==', franchisePartnerId)
    );
    const snap = await getDocs(q);
    const uploadedDocs: KYCDocumentRecord[] = [];
    snap.forEach((d) => uploadedDocs.push(d.data() as KYCDocumentRecord));

    // 2. HARD RULE: Gumasta is MANDATORY 🔒
    const gumastaDoc = uploadedDocs.find((d) => d.documentType === 'GUMASTA');
    if (!gumastaDoc) {
      return {
        success: false,
        error: 'Gumasta / Shop & Establishment Certificate is MANDATORY. Please upload your Gumasta certificate before submitting.',
      };
    }

    // 3. Verify all other Admin-configured REQUIRED documents are uploaded
    if (settings.gst === 'REQUIRED' && !uploadedDocs.find((d) => d.documentType === 'GST')) {
      return {
        success: false,
        error: 'GST Registration Certificate is required as per platform policy.',
      };
    }
    if (settings.aadhaar === 'REQUIRED' && !uploadedDocs.find((d) => d.documentType === 'AADHAAR')) {
      return {
        success: false,
        error: 'Aadhaar Card is required as per platform policy.',
      };
    }
    if (
      settings.electricityBill === 'REQUIRED' &&
      !uploadedDocs.find((d) => d.documentType === 'ELECTRICITY_BILL')
    ) {
      return {
        success: false,
        error: 'Electricity Bill (Office Address Proof) is required as per platform policy.',
      };
    }
    if (
      settings.otherCertificate === 'REQUIRED' &&
      !uploadedDocs.find((d) => d.documentType === 'OTHER_CERTIFICATE')
    ) {
      return {
        success: false,
        error: 'Other Certificate / Trade License is required as per platform policy.',
      };
    }

    const now = new Date().toISOString();
    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      kycStatus: 'UNDER_REVIEW',
      kycSubmittedAt: now,
      updatedAt: now,
    });

    // Mark pending documents as UNDER_REVIEW
    for (const d of uploadedDocs) {
      if (d.status === 'PENDING') {
        await updateDoc(doc(db, 'franchise_kyc_documents', d.id), {
          status: 'UNDER_REVIEW',
        });
      }
    }

    await logAuditEvent({
      action: 'KYC_SUBMITTED',
      targetPartnerId: franchisePartnerId,
      targetDistrictName: districtName,
      details: `KYC dossier submitted for Super Admin review by ${districtName} (${franchiseCode}). Total ${uploadedDocs.length} documents uploaded.`,
      metadata: { franchiseCode, districtName, totalDocs: uploadedDocs.length },
    });

    // Real-time Admin Notification for KYC Milestone and Ready for Review
    try {
      await notifyAdminKycReadyForReview({
        partnerId: franchisePartnerId,
        partnerName: `${districtName} Franchise Partner`,
        districtId: districtName.toLowerCase().replace(/\s+/g, '_'),
        districtName,
        franchiseCode,
        totalDocs: uploadedDocs.length,
      });
      await notifyAdminPartnerMilestoneReached({
        partnerId: franchisePartnerId,
        partnerName: `${districtName} Franchise Partner`,
        districtId: districtName.toLowerCase().replace(/\s+/g, '_'),
        districtName,
        franchiseCode,
        milestoneType: 'KYC_DOSSIER_SUBMITTED',
        milestoneTitle: `📑 KYC डोजियर सबमिट: ${districtName} (${franchiseCode})`,
        milestoneDescription: `${districtName} फ्रैंचाइज़ी पार्टनर ने अनिवार्य गुमास्ता सहित कुल ${uploadedDocs.length} KYC दस्तावेज सुपर एडमिन समीक्षा हेतु सबमिट किए हैं।`,
        priority: 'high',
        metadata: { totalDocs: uploadedDocs.length },
      });
    } catch (notifErr) {
      console.warn('Real-time KYC milestone admin alert notice:', notifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to submit KYC:', err);
    return { success: false, error: err.message || 'Submission failed' };
  }
}

export interface FranchiseActivationCheckResult {
  canActivate: boolean;
  reasons: string[];
  checklist: {
    agreementApprovedOrActive: boolean;
    agreementAccepted: boolean;
    gumastaVerified: boolean;
    requiredKycVerified: boolean;
    allPrerequisitesMet: boolean;
  };
}

/**
 * Checks if a Franchise Partner meets all 5 conditions to become ACTIVE:
 * 1. Agreement status = APPROVED / ACTIVE (or COMPLETED)
 * 2. Agreement acceptance is completed (termsAccepted === true or signed)
 * 3. Gumasta = VERIFIED (Mandatory 🔒)
 * 4. Every KYC document marked REQUIRED by Admin is VERIFIED
 * 5. Super Admin gives final approval (triggers final status transition to ACTIVE)
 *
 * If any condition is incomplete:
 * - Franchise Partner remains INACTIVE/PENDING.
 * - District cannot be operated by that partner.
 */
export async function canActivateFranchise(
  partner: FranchisePartner
): Promise<FranchiseActivationCheckResult> {
  const reasons: string[] = [];

  // Check 1 & 2: Agreement Status and Acceptance
  let isAgreementApprovedOrActive = false;
  let isAgreementAccepted = false;

  try {
    const qAgr = query(
      collection(db, 'franchise_agreements'),
      where('franchisePartnerId', '==', partner.id)
    );
    const snapAgr = await getDocs(qAgr);

    if (!snapAgr.empty) {
      // Sort to get the latest agreement record
      const sorted = snapAgr.docs
        .map((d) => d.data() as FranchiseAgreementRecord)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const latestAgr = sorted[0];

      isAgreementApprovedOrActive =
        latestAgr.status === 'APPROVED' ||
        latestAgr.status === 'ACTIVE' ||
        latestAgr.status === 'COMPLETED' ||
        Boolean(latestAgr.approvedAt);

      isAgreementAccepted =
        latestAgr.termsAccepted === true ||
        Boolean(latestAgr.signedAt) ||
        latestAgr.status === 'ACCEPTED' ||
        latestAgr.status === 'APPROVED' ||
        latestAgr.status === 'ACTIVE' ||
        latestAgr.status === 'COMPLETED';
    } else {
      // Fallback to partner document fields
      isAgreementApprovedOrActive =
        partner.agreementStatus === 'APPROVED' ||
        partner.agreementStatus === 'ACTIVE' ||
        partner.agreementStatus === 'COMPLETED';

      isAgreementAccepted =
        partner.agreementTermsAccepted === true ||
        partner.agreementStatus === 'COMPLETED';
    }
  } catch (err) {
    console.warn('Error checking franchise agreement status:', err);
    isAgreementApprovedOrActive =
      partner.agreementStatus === 'APPROVED' ||
      partner.agreementStatus === 'ACTIVE' ||
      partner.agreementStatus === 'COMPLETED';
    isAgreementAccepted =
      partner.agreementTermsAccepted === true ||
      partner.agreementStatus === 'COMPLETED';
  }

  // 1. Agreement Status condition
  if (!isAgreementApprovedOrActive) {
    reasons.push('Condition 1: Agreement status must be APPROVED or ACTIVE (Currently: ' + (partner.agreementStatus || 'PENDING') + ').');
  }

  // 2. Agreement Acceptance condition
  if (!isAgreementAccepted) {
    reasons.push('Condition 2: Agreement terms acceptance is incomplete. Partner must accept agreement terms.');
  }

  // 3 & 4. Fetch KYC settings & documents
  const settings = await getFranchiseKycSettings();
  const q = query(
    collection(db, 'franchise_kyc_documents'),
    where('franchisePartnerId', '==', partner.id)
  );
  const snap = await getDocs(q);
  const docs: KYCDocumentRecord[] = [];
  snap.forEach((d) => docs.push(d.data() as KYCDocumentRecord));

  // 3. Mandatory Gumasta Check
  const gumasta = docs.find((d) => d.documentType === 'GUMASTA');
  let gumastaVerified = false;
  if (!gumasta) {
    reasons.push('Condition 3: Gumasta / Shop & Establishment Certificate is missing.');
  } else if (gumasta.status !== 'VERIFIED') {
    reasons.push(`Condition 3: Gumasta Certificate is ${gumasta.status} (Must be VERIFIED).`);
  } else {
    gumastaVerified = true;
  }

  // 4. Required KYC Documents Check
  let requiredKycVerified = true;

  // GST Check
  if (settings.gst === 'REQUIRED') {
    const gst = docs.find((d) => d.documentType === 'GST');
    if (!gst) {
      reasons.push('Condition 4: GST Registration Certificate is REQUIRED but not uploaded.');
      requiredKycVerified = false;
    } else if (gst.status !== 'VERIFIED') {
      reasons.push(`Condition 4: GST Certificate is ${gst.status} (Must be VERIFIED).`);
      requiredKycVerified = false;
    }
  }

  // Aadhaar Check
  if (settings.aadhaar === 'REQUIRED') {
    const aadhaar = docs.find((d) => d.documentType === 'AADHAAR');
    if (!aadhaar) {
      reasons.push('Condition 4: Aadhaar Card is REQUIRED but not uploaded.');
      requiredKycVerified = false;
    } else if (aadhaar.status !== 'VERIFIED') {
      reasons.push(`Condition 4: Aadhaar Card is ${aadhaar.status} (Must be VERIFIED).`);
      requiredKycVerified = false;
    }
  }

  // Electricity Bill Check
  if (settings.electricityBill === 'REQUIRED') {
    const elec = docs.find((d) => d.documentType === 'ELECTRICITY_BILL');
    if (!elec) {
      reasons.push('Condition 4: Electricity Bill is REQUIRED but not uploaded.');
      requiredKycVerified = false;
    } else if (elec.status !== 'VERIFIED') {
      reasons.push(`Condition 4: Electricity Bill is ${elec.status} (Must be VERIFIED).`);
      requiredKycVerified = false;
    }
  }

  // Other Certificate Check
  if (settings.otherCertificate === 'REQUIRED') {
    const other = docs.find((d) => d.documentType === 'OTHER_CERTIFICATE');
    if (!other) {
      reasons.push('Condition 4: Other Certificate / Trade License is REQUIRED but not uploaded.');
      requiredKycVerified = false;
    } else if (other.status !== 'VERIFIED') {
      reasons.push(`Condition 4: Other Certificate is ${other.status} (Must be VERIFIED).`);
      requiredKycVerified = false;
    }
  }

  const allPrerequisitesMet =
    isAgreementApprovedOrActive &&
    isAgreementAccepted &&
    gumastaVerified &&
    requiredKycVerified &&
    reasons.length === 0;

  return {
    canActivate: allPrerequisitesMet,
    reasons,
    checklist: {
      agreementApprovedOrActive: isAgreementApprovedOrActive,
      agreementAccepted: isAgreementAccepted,
      gumastaVerified,
      requiredKycVerified,
      allPrerequisitesMet,
    },
  };
}

/**
 * Super Admin Final Approval & Activation of Franchise Partner
 * Rule: Partner becomes ACTIVE only when:
 * 1. Agreement status = APPROVED/ACTIVE
 * 2. Agreement acceptance is completed
 * 3. Gumasta is VERIFIED
 * 4. Every KYC document marked REQUIRED is VERIFIED
 * 5. Super Admin gives final approval
 */
export async function approveAndActivateFranchise(
  partner: FranchisePartner,
  adminName: string = 'Super Admin DEEPAK',
  adminId: string = 'SUPER_ADMIN'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Strict Validation of All 4 Prerequisites
    const check = await canActivateFranchise(partner);
    if (!check.canActivate) {
      return {
        success: false,
        error: `Cannot activate Franchise Partner. Incomplete conditions:\n• ${check.reasons.join('\n• ')}`,
      };
    }

    const now = new Date().toISOString();
    const partnerRef = doc(db, 'franchise_partners', partner.id);

    // 5. Super Admin gives final approval -> set status to ACTIVE
    await updateDoc(partnerRef, {
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      kycVerifiedAt: now,
      kycVerifiedBy: adminName,
      activatedAt: now,
      activatedBy: `${adminName} (${adminId})`,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'KYC_APPROVED',
      actorId: adminId,
      targetPartnerId: partner.id,
      targetDistrictId: partner.assignedDistrictId,
      targetDistrictName: partner.assignedDistrictName,
      details: `Franchise Partner for ${partner.assignedDistrictName} (${partner.franchiseCode}) has received FINAL SUPER ADMIN APPROVAL and is now ACTIVE. All 5 activation criteria verified.`,
      metadata: {
        franchiseCode: partner.franchiseCode,
        district: partner.assignedDistrictName,
        approvedBy: adminName,
        adminId,
        activatedAt: now,
        criteriaSatisfied: {
          agreementApprovedOrActive: check.checklist.agreementApprovedOrActive,
          agreementAccepted: check.checklist.agreementAccepted,
          gumastaVerified: check.checklist.gumastaVerified,
          requiredKycVerified: check.checklist.requiredKycVerified,
          superAdminFinalApproval: true,
        },
      },
    });

    // Real-time Admin Notification for Critical Partner Activation Milestone
    try {
      await notifyAdminPartnerMilestoneReached({
        partnerId: partner.id,
        partnerName: partner.name,
        districtId: partner.assignedDistrictId,
        districtName: partner.assignedDistrictName,
        franchiseCode: partner.franchiseCode,
        milestoneType: 'PARTNER_ACTIVATED',
        milestoneTitle: `🚀 क्रिटिकल सक्रियण माइलस्टोन: ${partner.assignedDistrictName} (${partner.franchiseCode}) लाइव!`,
        milestoneDescription: `${partner.assignedDistrictName} फ्रैंचाइज़ी पार्टनर (${partner.name}) के सभी 5 सक्रियण मानदंड (अनुबंध पत्र, गुमास्ता, पूर्ण KYC) सत्यापित हो चुके हैं और जिला सक्रिय हो गया है।`,
        priority: 'critical',
        metadata: { activatedAt: now, activatedBy: adminName },
      });
    } catch (notifErr) {
      console.warn('Real-time partner activation alert notice:', notifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to approve and activate franchise:', err);
    return { success: false, error: err.message || 'Activation failed' };
  }
}

/**
 * Helper to update partner's overall kycStatus based on document states
 */
async function evaluateAndUpdatePartnerKycStatus(franchisePartnerId: string) {
  try {
    const settings = await getFranchiseKycSettings();
    const q = query(
      collection(db, 'franchise_kyc_documents'),
      where('franchisePartnerId', '==', franchisePartnerId)
    );
    const snap = await getDocs(q);
    const docs: KYCDocumentRecord[] = [];
    snap.forEach((d) => docs.push(d.data() as KYCDocumentRecord));

    const hasRejected = docs.some((d) => d.status === 'REJECTED');
    const gumasta = docs.find((d) => d.documentType === 'GUMASTA');
    const gumastaVerified = gumasta?.status === 'VERIFIED';

    let newStatus: any = 'UNDER_REVIEW';

    if (hasRejected) {
      newStatus = 'REJECTED';
    } else if (gumastaVerified) {
      // Check other required
      let allRequiredVerified = true;
      if (settings.gst === 'REQUIRED' && docs.find((d) => d.documentType === 'GST')?.status !== 'VERIFIED') allRequiredVerified = false;
      if (settings.aadhaar === 'REQUIRED' && docs.find((d) => d.documentType === 'AADHAAR')?.status !== 'VERIFIED') allRequiredVerified = false;
      if (settings.electricityBill === 'REQUIRED' && docs.find((d) => d.documentType === 'ELECTRICITY_BILL')?.status !== 'VERIFIED') allRequiredVerified = false;
      if (settings.otherCertificate === 'REQUIRED' && docs.find((d) => d.documentType === 'OTHER_CERTIFICATE')?.status !== 'VERIFIED') allRequiredVerified = false;

      if (allRequiredVerified) {
        newStatus = 'VERIFIED';
      }
    }

    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      kycStatus: newStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error updating partner kyc status:', err);
  }
}

/**
 * Get Franchise Agreements for a Partner (Agreement History)
 */
export async function getFranchiseAgreements(franchisePartnerId: string): Promise<FranchiseAgreementRecord[]> {
  try {
    const q = query(
      collection(db, 'franchise_agreements'),
      where('franchisePartnerId', '==', franchisePartnerId)
    );
    const snap = await getDocs(q);
    const agreements: FranchiseAgreementRecord[] = [];
    snap.forEach((d) => {
      agreements.push({ id: d.id, ...d.data() } as FranchiseAgreementRecord);
    });
    agreements.sort((a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime());
    return agreements;
  } catch (err) {
    console.error('Error fetching franchise agreements:', err);
    return [];
  }
}

/**
 * Real-time listener for franchise agreements
 */
export function subscribeFranchiseAgreements(
  franchisePartnerId: string,
  callback: (agreements: FranchiseAgreementRecord[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'franchise_agreements'),
      where('franchisePartnerId', '==', franchisePartnerId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const agreements: FranchiseAgreementRecord[] = [];
        snap.forEach((d) => {
          agreements.push({ id: d.id, ...d.data() } as FranchiseAgreementRecord);
        });
        agreements.sort((a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime());
        callback(agreements);
      },
      (err) => {
        console.warn('Agreements listener note:', err);
      }
    );
  } catch (err) {
    console.warn('Error setting up agreements listener:', err);
    return () => {};
  }
}

/**
 * Real-time listener for all franchise agreements across the platform
 */
export function subscribeAllFranchiseAgreements(
  callback: (agreements: FranchiseAgreementRecord[]) => void
): () => void {
  if (isResourceExhausted()) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'franchise_agreements'), limit(50));
    return onSnapshot(
      q,
      (snap) => {
        const agreements: FranchiseAgreementRecord[] = [];
        snap.forEach((d) => {
          agreements.push({ id: d.id, ...d.data() } as FranchiseAgreementRecord);
        });
        agreements.sort(
          (a, b) =>
            new Date(b.startDate || b.createdAt).getTime() -
            new Date(a.startDate || a.createdAt).getTime()
        );
        callback(agreements);
      },
      (err) => {
        console.warn('All agreements listener note:', err);
        checkAndHandleQuotaError(err);
      }
    );
  } catch (err) {
    console.warn('Error setting up all agreements listener:', err);
    checkAndHandleQuotaError(err);
    return () => {};
  }
}

/**
 * Fetch all Franchise Agreements across the platform
 */
export async function getAllFranchiseAgreements(): Promise<FranchiseAgreementRecord[]> {
  if (isResourceExhausted()) return [];
  try {
    const snap = await getDocs(query(collection(db, 'franchise_agreements'), limit(50)));
    const agreements: FranchiseAgreementRecord[] = [];
    snap.forEach((d) => {
      agreements.push({ id: d.id, ...d.data() } as FranchiseAgreementRecord);
    });
    agreements.sort(
      (a, b) =>
        new Date(b.startDate || b.createdAt).getTime() -
        new Date(a.startDate || a.createdAt).getTime()
    );
    return agreements;
  } catch (err) {
    console.error('Error fetching all franchise agreements:', err);
    checkAndHandleQuotaError(err);
    return [];
  }
}

/**
 * Renew Franchise Agreement (Creates a NEW Agreement record, keeping old ones intact)
 */
export interface RenewAgreementParams {
  franchisePartnerId: string;
  franchiseCode: string;
  districtId: string;
  districtName: string;
  agreementId: string;
  startDate: string;
  endDate: string;
  charges: number;
  commissionPercent: number;
  profitPercentage: number;
  termsAndConditions: string;
  adminName: string;
}

export async function renewFranchiseAgreement(
  params: RenewAgreementParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();

    // Query existing agreement versions to compute next version number
    let maxVersion = 0;
    try {
      const q = query(
        collection(db, 'franchise_agreements'),
        where('franchisePartnerId', '==', params.franchisePartnerId)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as FranchiseAgreementRecord;
        const vNum = typeof data.versionNumber === 'number' ? data.versionNumber : parseInt(String(data.agreementVersion || '').replace(/[^0-9]/g, '')) || 1;
        if (vNum > maxVersion) maxVersion = vNum;
      });
    } catch (verErr) {
      console.warn('Error computing version on renewal:', verErr);
    }

    const nextVersionNumber = maxVersion > 0 ? maxVersion + 1 : 1;
    const nextAgreementVersion = `Version ${nextVersionNumber}`;
    const agreementYear = String(new Date(params.startDate || now).getFullYear());

    const docId = `agr_${params.franchisePartnerId}_${params.agreementId.replace(/[^a-zA-Z0-9]/g, '_')}_v${nextVersionNumber}_${Date.now()}`;
    const agreementRef = doc(db, 'franchise_agreements', docId);

    const record: FranchiseAgreementRecord = {
      id: docId,
      franchisePartnerId: params.franchisePartnerId,
      franchiseCode: params.franchiseCode,
      districtId: params.districtId,
      districtName: params.districtName,
      agreementId: params.agreementId,
      versionNumber: nextVersionNumber,
      agreementVersion: nextAgreementVersion,
      agreementYear,
      startDate: params.startDate,
      endDate: params.endDate,
      charges: Number(params.charges),
      commissionPercent: Number(params.commissionPercent),
      profitPercentage: Number(params.profitPercentage),
      termsAndConditions: params.termsAndConditions,
      status: 'ACTIVE',
      signedAt: now,
      signedBy: params.adminName,
      termsAccepted: true,
      createdAt: now,
      createdBy: params.adminName,
    };

    // Store new version without overwriting previous version
    await setDoc(agreementRef, record);

    const partnerRef = doc(db, 'franchise_partners', params.franchisePartnerId);
    await updateDoc(partnerRef, {
      agreementStatus: 'COMPLETED',
      agreementSignedAt: now,
      agreementSignedBy: params.adminName,
      agreementTermsAccepted: true,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_RENEWED',
      targetPartnerId: params.franchisePartnerId,
      targetDistrictId: params.districtId,
      targetDistrictName: params.districtName,
      details: `Franchise Agreement renewed to ${nextAgreementVersion} (${params.agreementId}, ${params.startDate} to ${params.endDate}) for ${params.districtName} (${params.franchiseCode}) by ${params.adminName}. Previous version retained.`,
      metadata: {
        agreementId: params.agreementId,
        versionNumber: nextVersionNumber,
        agreementVersion: nextAgreementVersion,
        agreementYear,
        startDate: params.startDate,
        endDate: params.endDate,
        charges: params.charges,
        renewedBy: params.adminName,
      },
    });

    // Real-time notification for agreement renewal
    try {
      await notifyAdminFranchiseAgreementSubmitted({
        partnerId: params.franchisePartnerId,
        partnerName: params.adminName,
        districtId: params.districtId,
        districtName: params.districtName,
        franchiseCode: params.franchiseCode,
        agreementId: params.agreementId,
        signedBy: params.adminName,
        isRenewal: true,
      });
    } catch (notifErr) {
      console.warn('Real-time renewal alert notice:', notifErr);
    }

    // Franchise Partner Notification for Agreement Renewal Approval
    try {
      await notifyFranchisePartnerAgreementApproved({
        partnerId: params.franchisePartnerId,
        districtId: params.districtId,
        districtName: params.districtName,
        franchiseCode: params.franchiseCode,
        agreementId: params.agreementId,
        approvedBy: params.adminName,
      });
    } catch (partnerNotifErr) {
      console.warn('Franchise partner renewal notification notice:', partnerNotifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to renew franchise agreement:', err);
    return { success: false, error: err.message || 'Failed to renew agreement' };
  }
}

/**
 * Terminate Franchise Agreement
 */
export interface TerminateAgreementParams {
  agreementRecordId: string;
  franchisePartnerId: string;
  districtId: string;
  districtName: string;
  reason: string;
  noticeDate: string;
  noticePeriodDays: number;
  effectiveDate: string;
  notes: string;
  adminName: string;
}

export async function terminateFranchiseAgreement(
  params: TerminateAgreementParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const agreementDocRef = doc(db, 'franchise_agreements', params.agreementRecordId);
    const agreementSnap = await getDoc(agreementDocRef);
    const existingData = agreementSnap.exists() ? (agreementSnap.data() as FranchiseAgreementRecord) : null;

    const terminationDetails = {
      reason: params.reason,
      noticeDate: params.noticeDate,
      noticePeriodDays: params.noticePeriodDays,
      effectiveDate: params.effectiveDate,
      notes: params.notes,
      status: 'NOTICE_ISSUED' as const,
    };

    const historyEntry = {
      action: 'NOTICE_ISSUED',
      reason: params.reason,
      noticeDate: params.noticeDate,
      effectiveDate: params.effectiveDate,
      notes: params.notes,
      timestamp: now,
      actor: params.adminName,
    };

    const existingHistory = existingData?.terminationHistory || [];

    await updateDoc(agreementDocRef, {
      status: 'NOTICE_ISSUED',
      terminationDetails,
      terminationHistory: [...existingHistory, historyEntry],
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_TERMINATION_NOTICE_ISSUED',
      targetPartnerId: params.franchisePartnerId,
      targetDistrictId: params.districtId,
      targetDistrictName: params.districtName,
      details: `Termination notice issued for agreement in ${params.districtName}. Reason: ${params.reason}, Effective: ${params.effectiveDate}`,
      metadata: {
        agreementId: params.agreementRecordId,
        reason: params.reason,
        effectiveDate: params.effectiveDate,
      },
    });

    await logAuditEvent({
      action: 'AGREEMENT_TERMINATED',
      targetPartnerId: params.franchisePartnerId,
      targetDistrictId: params.districtId,
      targetDistrictName: params.districtName,
      details: `Agreement terminated for ${params.districtName}. Reason: ${params.reason}`,
      metadata: {
        agreementId: params.agreementRecordId,
        reason: params.reason,
      },
    });

    // Real-time Super Admin Notification: Termination Notice Issued
    try {
      await notifyAdminTerminationNoticeIssued({
        partnerId: params.franchisePartnerId,
        partnerName: params.districtName,
        districtId: params.districtId,
        districtName: params.districtName,
        franchiseCode: existingData?.franchiseCode || '',
        agreementId: existingData?.agreementId || params.agreementRecordId,
        reason: params.reason,
        effectiveDate: params.effectiveDate,
        noticePeriodDays: params.noticePeriodDays,
      });
    } catch (adminNotifErr) {
      console.warn('Super Admin termination notification notice:', adminNotifErr);
    }

    // Franchise Partner Notification: Termination Notice Issued
    try {
      await notifyFranchisePartnerAgreementTerminated({
        partnerId: params.franchisePartnerId,
        districtId: params.districtId,
        districtName: params.districtName,
        franchiseCode: existingData?.franchiseCode || '',
        agreementId: existingData?.agreementId || params.agreementRecordId,
        reason: params.reason,
        effectiveDate: params.effectiveDate,
      });
    } catch (partnerNotifErr) {
      console.warn('Franchise partner termination notification notice:', partnerNotifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to issue termination notice:', err);
    return { success: false, error: err.message || 'Failed to issue termination notice' };
  }
}

export async function cancelAgreementTermination(
  agreementRecordId: string,
  franchisePartnerId: string,
  districtId: string,
  districtName: string,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const agreementDocRef = doc(db, 'franchise_agreements', agreementRecordId);
    const agreementSnap = await getDoc(agreementDocRef);
    const existingData = agreementSnap.exists() ? (agreementSnap.data() as FranchiseAgreementRecord) : null;

    if (!existingData) {
      return { success: false, error: 'Agreement record not found' };
    }

    const currentTermination = existingData.terminationDetails;
    const updatedTermination = currentTermination ? {
      ...currentTermination,
      status: 'CANCELLED' as const,
      cancelledAt: now,
      cancelledBy: adminName,
    } : {
      reason: 'Cancelled by admin',
      noticeDate: now.split('T')[0],
      noticePeriodDays: 0,
      effectiveDate: now.split('T')[0],
      notes: 'Notice cancelled',
      status: 'CANCELLED' as const,
      cancelledAt: now,
      cancelledBy: adminName,
    };

    const historyEntry = {
      action: 'CANCELLED',
      reason: 'Termination notice cancelled by admin',
      noticeDate: now.split('T')[0],
      effectiveDate: now.split('T')[0],
      notes: 'Notice revoked and agreement restored to ACTIVE',
      timestamp: now,
      actor: adminName,
    };

    const existingHistory = existingData.terminationHistory || [];

    await updateDoc(agreementDocRef, {
      status: 'ACTIVE',
      terminationDetails: updatedTermination,
      terminationHistory: [...existingHistory, historyEntry],
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_TERMINATION_CANCELLED',
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Termination notice cancelled for agreement in ${districtName} by ${adminName}. Agreement restored to ACTIVE.`,
      metadata: {
        agreementId: agreementRecordId,
        cancelledBy: adminName,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to cancel termination:', err);
    return { success: false, error: err.message || 'Failed to cancel termination' };
  }
}
export async function updateAgreementFinancials(
  agreementRecordId: string,
  franchisePartnerId: string,
  districtId: string,
  districtName: string,
  charges: number,
  commissionPercent: number,
  profitPercentage: number,
  adminName: string,
  additionalParams?: {
    termsAndConditions?: string;
    startDate?: string;
    endDate?: string;
    agreementYear?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    // Read previous agreement record to preserve terms, dates, and agreementId
    let previousRecord: FranchiseAgreementRecord | null = null;
    try {
      const prevDocRef = doc(db, 'franchise_agreements', agreementRecordId);
      const prevSnap = await getDoc(prevDocRef);
      if (prevSnap.exists()) {
        previousRecord = { id: prevSnap.id, ...prevSnap.data() } as FranchiseAgreementRecord;
      }
    } catch (readErr) {
      console.warn('Note reading previous agreement:', readErr);
    }

    // Query all existing versions to determine next version number
    let maxVersion = 0;
    try {
      const q = query(
        collection(db, 'franchise_agreements'),
        where('franchisePartnerId', '==', franchisePartnerId)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as FranchiseAgreementRecord;
        const vNum = typeof data.versionNumber === 'number' ? data.versionNumber : parseInt(String(data.agreementVersion || '').replace(/[^0-9]/g, '')) || 1;
        if (vNum > maxVersion) maxVersion = vNum;
      });
    } catch (verErr) {
      console.warn('Error computing version numbers:', verErr);
    }

    const nextVersionNumber = maxVersion > 0 ? maxVersion + 1 : 2;
    const nextAgreementVersion = `Version ${nextVersionNumber}`;
    
    const baseAgreementId = previousRecord?.agreementId || `AGR-${franchisePartnerId}-${new Date().getFullYear()}`;
    const agreementYear = additionalParams?.agreementYear || previousRecord?.agreementYear || new Date().getFullYear().toString();
    const startDate = additionalParams?.startDate || previousRecord?.startDate || new Date().toISOString().split('T')[0];
    const endDate = additionalParams?.endDate || previousRecord?.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const termsAndConditions = additionalParams?.termsAndConditions || previousRecord?.termsAndConditions || 'दीपक बिल्डकॉन प्राइवेट लिमिटेड एवं फ्रैंचाइज़ी पार्टनर के मध्य संशोधित वार्षिक अनुबंध।';
    const franchiseCode = previousRecord?.franchiseCode || '';

    // Generate new document ID so the previous version is never overwritten
    const docId = `agr_${franchisePartnerId}_${baseAgreementId.replace(/[^a-zA-Z0-9]/g, '_')}_v${nextVersionNumber}_${Date.now()}`;
    const newVersionRecord: FranchiseAgreementRecord = {
      id: docId,
      franchisePartnerId,
      franchiseCode,
      districtId,
      districtName,
      agreementId: baseAgreementId,
      versionNumber: nextVersionNumber,
      agreementVersion: nextAgreementVersion,
      agreementYear,
      startDate,
      endDate,
      charges: Number(charges),
      commissionPercent: Number(commissionPercent),
      profitPercentage: Number(profitPercentage),
      termsAndConditions,
      status: 'ACTIVE',
      signedAt: now,
      signedBy: adminName,
      termsAccepted: true,
      createdAt: now,
      createdBy: adminName,
    };

    // Save new version
    await setDoc(doc(db, 'franchise_agreements', docId), newVersionRecord);

    // Update partner record
    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      agreementStatus: 'COMPLETED',
      agreementSignedAt: now,
      agreementSignedBy: adminName,
      agreementTermsAccepted: true,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_VERSION_CREATED',
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Franchise Agreement revised to ${nextAgreementVersion} for ${districtName} (Charges: ₹${charges}, Commission: ${commissionPercent}%, Profit: ${profitPercentage}%) by ${adminName}. Previous version preserved.`,
      metadata: {
        agreementId: baseAgreementId,
        versionNumber: nextVersionNumber,
        agreementVersion: nextAgreementVersion,
        agreementYear,
        startDate,
        endDate,
        charges,
        commissionPercent,
        profitPercentage,
        updatedBy: adminName,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update agreement financials / create new version:', err);
    return { success: false, error: err.message || 'Failed to update agreement financials' };
  }
}

/**
 * Super Admin Final Franchise Agreement Approval
 * Rules:
 * Agreement can become ACTIVE only when:
 * 1. Franchise Partner has accepted/submitted the agreement
 * 2. Super Admin has approved it
 * 3. Agreement start date is reached
 *
 * Before approval, it must NOT become active automatically.
 */
export async function approveFranchiseAgreement(
  agreementRecordId: string,
  franchisePartnerId: string,
  districtId: string,
  districtName: string,
  adminName: string,
  adminId: string = 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const agrRef = doc(db, 'franchise_agreements', agreementRecordId);
    const agrSnap = await getDoc(agrRef);
    if (!agrSnap.exists()) {
      return { success: false, error: 'Agreement record not found' };
    }

    const agrData = agrSnap.data() as FranchiseAgreementRecord;

    // Check if partner accepted
    const partnerAccepted = agrData.termsAccepted === true || Boolean(agrData.signedAt) || agrData.status === 'ACCEPTED' || agrData.status === 'COMPLETED';

    // Check start date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = agrData.startDate ? new Date(agrData.startDate) : new Date(0);
    startDate.setHours(0, 0, 0, 0);
    const isStartDateReached = today.getTime() >= startDate.getTime();

    // Set to ACTIVE if partner accepted and start date reached, otherwise APPROVED
    const finalStatus: FranchiseAgreementRecord['status'] = (partnerAccepted && isStartDateReached) ? 'ACTIVE' : 'APPROVED';

    await updateDoc(agrRef, {
      status: finalStatus,
      approvedAt: now,
      approvedBy: `${adminName} (${adminId})`,
      updatedAt: now,
      updatedBy: adminName,
    });

    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      agreementStatus: finalStatus === 'ACTIVE' ? 'COMPLETED' : 'APPROVED',
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_APPROVED',
      actorId: adminId,
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Franchise Agreement ${agrData.agreementId} approved by ${adminName}. Status set to ${finalStatus}.`,
      metadata: {
        agreementId: agrData.agreementId,
        agreementRecordId,
        approvedAt: now,
        approvedBy: adminName,
        adminId,
        status: finalStatus,
      },
    });

    // Franchise Partner Notification: Agreement Approved
    try {
      await notifyFranchisePartnerAgreementApproved({
        partnerId: franchisePartnerId,
        districtId,
        districtName,
        franchiseCode: agrData.franchiseCode,
        agreementId: agrData.agreementId,
        approvedBy: adminName,
      });
    } catch (partnerNotifErr) {
      console.warn('Franchise partner approval notification notice:', partnerNotifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to approve agreement:', err);
    return { success: false, error: err.message || 'Failed to approve agreement' };
  }
}

/**
 * Super Admin Franchise Agreement Rejection
 */
export async function rejectFranchiseAgreement(
  agreementRecordId: string,
  franchisePartnerId: string,
  districtId: string,
  districtName: string,
  reason: string,
  adminName: string,
  adminId: string = 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const agrRef = doc(db, 'franchise_agreements', agreementRecordId);
    const agrSnap = await getDoc(agrRef);
    if (!agrSnap.exists()) {
      return { success: false, error: 'Agreement record not found' };
    }

    const agrData = agrSnap.data() as FranchiseAgreementRecord;

    await updateDoc(agrRef, {
      status: 'REJECTED',
      rejectionReason: reason,
      rejectedAt: now,
      rejectedBy: `${adminName} (${adminId})`,
      updatedAt: now,
      updatedBy: adminName,
    });

    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      agreementStatus: 'REJECTED',
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_REJECTED',
      actorId: adminId,
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Franchise Agreement ${agrData.agreementId} rejected by ${adminName}. Reason: ${reason}`,
      metadata: {
        agreementId: agrData.agreementId,
        agreementRecordId,
        rejectedAt: now,
        rejectedBy: adminName,
        rejectionReason: reason,
      },
    });

    // Franchise Partner Notification: Agreement Rejected
    try {
      await notifyFranchisePartnerAgreementRejected({
        partnerId: franchisePartnerId,
        districtId,
        districtName,
        franchiseCode: agrData.franchiseCode,
        agreementId: agrData.agreementId,
        rejectionReason: reason,
      });
    } catch (partnerNotifErr) {
      console.warn('Franchise partner rejection notification notice:', partnerNotifErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to reject agreement:', err);
    return { success: false, error: err.message || 'Failed to reject agreement' };
  }
}

/**
 * Cancel Franchise Agreement
 */
export async function cancelFranchiseAgreement(
  agreementRecordId: string,
  franchisePartnerId: string,
  districtId: string,
  districtName: string,
  reason: string,
  adminName: string,
  adminId: string = 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const agrRef = doc(db, 'franchise_agreements', agreementRecordId);
    const agrSnap = await getDoc(agrRef);
    if (!agrSnap.exists()) {
      return { success: false, error: 'Agreement record not found' };
    }

    const agrData = agrSnap.data() as FranchiseAgreementRecord;

    await updateDoc(agrRef, {
      status: 'CANCELLED',
      cancellationReason: reason,
      cancelledAt: now,
      cancelledBy: `${adminName} (${adminId})`,
      updatedAt: now,
      updatedBy: adminName,
    });

    const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
    await updateDoc(partnerRef, {
      agreementStatus: 'CANCELLED',
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'AGREEMENT_CANCELLED',
      actorId: adminId,
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Franchise Agreement ${agrData.agreementId} cancelled by ${adminName}. Reason: ${reason}`,
      metadata: {
        agreementId: agrData.agreementId,
        agreementRecordId,
        cancelledAt: now,
        cancelledBy: adminName,
        cancellationReason: reason,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to cancel agreement:', err);
    return { success: false, error: err.message || 'Failed to cancel agreement' };
  }
}

export interface UploadAgreementDocParams {
  agreementRecordId: string;
  franchisePartnerId: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId: string;
  file: File;
  adminName: string;
  adminId?: string;
  fallbackRecord?: Partial<FranchiseAgreementRecord>;
}

/**
 * Upload final signed/agreed Franchise Agreement document to Firebase Storage
 * and store metadata & download reference URL in the Firebase agreement record.
 */
export async function uploadFranchiseAgreementDocument(
  params: UploadAgreementDocParams
): Promise<{ success: boolean; document?: FranchiseAgreementDocument; error?: string }> {
  try {
    const {
      agreementRecordId,
      franchisePartnerId,
      districtId,
      districtName,
      franchiseCode,
      agreementId,
      file,
      adminName,
      adminId = 'super_admin',
      fallbackRecord,
    } = params;

    // 1. Validate file format: PDF, JPG, JPEG, PNG
    const validMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const isExtensionValid = validExtensions.some((ext) => lowerName.endsWith(ext));
    const isMimeValid =
      validMimes.includes(file.type.toLowerCase()) ||
      file.type.startsWith('image/') ||
      file.type.includes('pdf');

    if (!isExtensionValid && !isMimeValid) {
      return {
        success: false,
        error: 'Invalid file format. Only PDF, JPG, JPEG, and PNG files are allowed.',
      };
    }

    // 2. Validate file size (max 20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        error: 'File size exceeds 20MB limit. Please upload a smaller document.',
      };
    }

    const now = new Date().toISOString();
    const safePartnerId = franchisePartnerId || 'general';
    const safeAgrId = agreementId ? agreementId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'agr';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `franchise_agreements/${safePartnerId}/${safeAgrId}_${Date.now()}_${sanitizedFileName}`;

    let downloadUrl = '';

    try {
      const storageReference = ref(storage, storagePath);
      const snapshot = await uploadBytes(storageReference, file, {
        contentType: file.type || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      });
      downloadUrl = await getDownloadURL(snapshot.ref);
    } catch (storageErr: any) {
      console.warn('Firebase Storage upload failed, falling back to data URL storage:', storageErr);
      downloadUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    }

    const agreementDocMeta: FranchiseAgreementDocument = {
      fileUrl: downloadUrl,
      fileName: file.name,
      fileType: file.type || (lowerName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      fileSize: file.size,
      uploadedAt: now,
      uploadedBy: `${adminName} (${adminId})`,
      storagePath,
    };

    // 3. Save into Firestore agreement record
    const agrRef = doc(db, 'franchise_agreements', agreementRecordId);
    const agrSnap = await getDoc(agrRef);

    if (agrSnap.exists()) {
      await updateDoc(agrRef, {
        agreementDocument: agreementDocMeta,
        updatedAt: now,
        updatedBy: adminName,
      });
    } else {
      const newRecord: FranchiseAgreementRecord = {
        id: agreementRecordId,
        franchisePartnerId,
        franchiseCode: franchiseCode || '',
        districtId: districtId || '',
        districtName: districtName || '',
        agreementId: agreementId || `AGR-${franchiseCode}-${new Date().getFullYear()}`,
        startDate: fallbackRecord?.startDate || `${new Date().getFullYear()}-04-01`,
        endDate: fallbackRecord?.endDate || `${new Date().getFullYear() + 1}-03-31`,
        charges: fallbackRecord?.charges ?? 50000,
        commissionPercent: fallbackRecord?.commissionPercent ?? 10,
        profitPercentage: fallbackRecord?.profitPercentage ?? 20,
        termsAndConditions:
          fallbackRecord?.termsAndConditions ||
          'दीपक बिल्डकॉन प्राइवेट लिमिटेड एवं फ्रैंचाइज़ी पार्टनर के मध्य वार्षिक अनुबंध।',
        status: fallbackRecord?.status || 'ACTIVE',
        termsAccepted: fallbackRecord?.termsAccepted ?? true,
        signedAt: fallbackRecord?.signedAt || now,
        signedBy: fallbackRecord?.signedBy || adminName,
        createdAt: fallbackRecord?.createdAt || now,
        createdBy: adminName,
        updatedAt: now,
        updatedBy: adminName,
        agreementDocument: agreementDocMeta,
      };
      await setDoc(agrRef, newRecord);
    }

    // 4. Update the franchise partner profile document as well
    if (franchisePartnerId) {
      try {
        const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
        await updateDoc(partnerRef, {
          agreementDocument: agreementDocMeta,
          updatedAt: now,
        });
      } catch (pErr) {
        console.debug('Partner doc update note:', pErr);
      }
    }

    // 5. Log audit trail
    await logAuditEvent({
      action: 'AGREEMENT_DOCUMENT_UPLOADED',
      actorId: adminId,
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Signed Franchise Agreement document "${file.name}" uploaded for ${districtName} (${franchiseCode}) by ${adminName}`,
      metadata: {
        agreementId,
        agreementRecordId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: now,
        uploadedBy: adminName,
      },
    });

    return { success: true, document: agreementDocMeta };
  } catch (err: any) {
    console.error('Failed to upload agreement document:', err);
    return { success: false, error: err.message || 'Failed to upload agreement document' };
  }
}

/**
 * Remove an uploaded Franchise Agreement document from Firestore & Storage
 */
export async function removeFranchiseAgreementDocument(
  agreementRecordId: string,
  franchisePartnerId: string,
  districtId: string,
  districtName: string,
  adminName: string,
  adminId: string = 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    const agrRef = doc(db, 'franchise_agreements', agreementRecordId);
    const agrSnap = await getDoc(agrRef);

    if (agrSnap.exists()) {
      const data = agrSnap.data() as FranchiseAgreementRecord;
      if (data.agreementDocument?.storagePath) {
        try {
          const storageReference = ref(storage, data.agreementDocument.storagePath);
          await deleteObject(storageReference);
        } catch (sErr) {
          console.debug('Storage delete note:', sErr);
        }
      }

      await updateDoc(agrRef, {
        agreementDocument: null as any,
        updatedAt: now,
        updatedBy: adminName,
      });
    }

    if (franchisePartnerId) {
      try {
        const partnerRef = doc(db, 'franchise_partners', franchisePartnerId);
        await updateDoc(partnerRef, {
          agreementDocument: null as any,
          updatedAt: now,
        });
      } catch (pErr) {
        console.debug('Partner doc update note:', pErr);
      }
    }

    await logAuditEvent({
      action: 'AGREEMENT_DOCUMENT_REMOVED',
      actorId: adminId,
      targetPartnerId: franchisePartnerId,
      targetDistrictId: districtId,
      targetDistrictName: districtName,
      details: `Agreement document removed for ${districtName} by ${adminName}`,
      metadata: {
        agreementRecordId,
        removedAt: now,
        removedBy: adminName,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to remove agreement document:', err);
    return { success: false, error: err.message || 'Failed to remove agreement document' };
  }
}





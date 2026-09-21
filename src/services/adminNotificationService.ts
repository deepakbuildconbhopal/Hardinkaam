import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

export type AdminAlertCategory =
  | 'agreement'
  | 'milestone'
  | 'kyc'
  | 'operational'
  | 'activation';

export type AdminMilestoneType =
  | 'AGREEMENT_SUBMITTED'
  | 'AGREEMENT_ACCEPTED'
  | 'AGREEMENT_RENEWED'
  | 'AGREEMENT_RENEWAL_DUE'
  | 'AGREEMENT_EXPIRED'
  | 'TERMINATION_NOTICE_ISSUED'
  | 'GUMASTA_UPLOADED'
  | 'KYC_DOSSIER_SUBMITTED'
  | 'KYC_FULLY_VERIFIED'
  | 'FIRST_TECH_ONBOARDED'
  | 'PARTNER_ACTIVATED'
  | 'TARGET_BOOKINGS_REACHED';

export interface AdminRealtimeAlert {
  id: string;
  title: string;
  message: string;
  category: AdminAlertCategory;
  milestoneType?: AdminMilestoneType;
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId?: string;
  priority: 'critical' | 'high' | 'medium' | 'info';
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
  actionTab?: string;
}

/**
 * Audio Synthesizer: plays a subtle, pleasant executive notification ping
 * using the browser Web Audio API without needing external MP3 files.
 */
export function playAdminChime(type: 'critical' | 'normal' = 'normal') {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'critical') {
      // Two-tone attention chime (e.g. Agreement submitted or Activation milestone)
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.12); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.12); // D6

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.12);
      osc1.stop(now + 0.55);
      osc2.stop(now + 0.55);
    } else {
      // Soft single chime
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.setValueAtTime(1046.5, now + 0.08); // C6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.4);
    }
  } catch (err) {
    // Audio context may be restricted by browser policy before first interaction
    console.debug('Notification audio cue notice:', err);
  }
}

/**
 * Creates a persistent Real-time Admin Alert in Firestore 'admin_alerts'
 */
export async function createAdminAlert(
  alert: Omit<AdminRealtimeAlert, 'id' | 'createdAt' | 'read'>
): Promise<string> {
  const alertId = `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const record: AdminRealtimeAlert = {
    ...alert,
    id: alertId,
    read: false,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'admin_alerts', alertId), record);
  } catch (err) {
    console.warn('Could not write to admin_alerts in Firestore:', err);
  }

  // Also log into standard notifications collection for cross-compatibility
  try {
    await setDoc(doc(db, 'notifications', `admin_${alertId}`), {
      userId: 'admin',
      targetRole: 'admin',
      title: record.title,
      message: record.message,
      type: 'kyc',
      read: false,
      createdAt: now,
      metadata: {
        alertId,
        category: record.category,
        districtName: record.districtName,
        franchiseCode: record.franchiseCode,
      },
    });
  } catch (e) {
    console.debug('Cross-notification log notice:', e);
  }

  return alertId;
}

/**
 * Real-time Admin Alert when a new Franchise Agreement is submitted/signed
 */
export async function notifyAdminFranchiseAgreementSubmitted(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId?: string;
  signedBy: string;
  isRenewal?: boolean;
}): Promise<string> {
  const isRenewal = !!params.isRenewal;
  const title = isRenewal
    ? `📜 फ़्रैंचाइज़ी अनुबंध नवीनीकरण: ${params.districtName} (${params.franchiseCode})`
    : `📜 नया फ़्रैंचाइज़ी अनुबंध सबमिट हुआ: ${params.districtName} (${params.franchiseCode})`;

  const message = isRenewal
    ? `फ्रैंचाइज़ी पार्टनर ${params.partnerName} (${params.franchiseCode}) द्वारा ${params.districtName} जिले हेतु नया वार्षिक अनुबंध पत्र स्वीकार व सबमिट किया गया है। हस्ताक्षरकर्ता: ${params.signedBy}।`
    : `फ्रैंचाइज़ी पार्टनर ${params.partnerName} (${params.franchiseCode}) द्वारा ${params.districtName} जिला अनुबंध पत्र को डिजिटल रूप से स्वीकार व हस्ताक्षरित कर सबमिट किया गया है। KYC मॉड्यूल अनलॉक हो गया है।`;

  const alertId = await createAdminAlert({
    title,
    message,
    category: 'agreement',
    milestoneType: isRenewal ? 'AGREEMENT_RENEWED' : 'AGREEMENT_SUBMITTED',
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    agreementId: params.agreementId,
    priority: 'critical',
    actionTab: 'admin_super_dashboard',
    metadata: {
      signedBy: params.signedBy,
      isRenewal,
      signedAt: new Date().toISOString(),
    },
  });

  playAdminChime('critical');
  return alertId;
}

export const notifyAdminAgreementSubmitted = notifyAdminFranchiseAgreementSubmitted;

/**
 * Real-time Admin Alert when an agreement is accepted by Franchise Partner
 */
export async function notifyAdminAgreementAccepted(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId?: string;
  signedBy: string;
}): Promise<string> {
  const title = `✍️ फ़्रैंचाइज़ी अनुबंध स्वीकार किया गया: ${params.districtName} (${params.franchiseCode})`;
  const message = `फ्रैंचाइज़ी पार्टनर ${params.partnerName} (${params.franchiseCode}) ने ${params.districtName} जिले हेतु अनुबंध की समस्त शर्तें स्वीकार कर ली हैं। KYC सत्यापन हेतु तैयार है।`;

  const alertId = await createAdminAlert({
    title,
    message,
    category: 'agreement',
    milestoneType: 'AGREEMENT_ACCEPTED',
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    agreementId: params.agreementId,
    priority: 'high',
    actionTab: 'admin_super_dashboard',
    metadata: {
      signedBy: params.signedBy,
      acceptedAt: new Date().toISOString(),
    },
  });

  playAdminChime('normal');
  return alertId;
}

/**
 * Real-time Admin Alert when KYC becomes ready for review
 */
export async function notifyAdminKycReadyForReview(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  totalDocs?: number;
}): Promise<string> {
  const title = `📑 KYC डोजियर समीक्षा हेतु तैयार: ${params.districtName} (${params.franchiseCode})`;
  const message = `${params.districtName} फ्रैंचाइज़ी पार्टनर ने गुमास्ता व अन्य आवश्यक दस्तावेज अपलोड कर KYC समीक्षा हेतु सबमिट कर दिया है। (कुल दस्तावेज: ${params.totalDocs || 1})`;

  const alertId = await createAdminAlert({
    title,
    message,
    category: 'kyc',
    milestoneType: 'KYC_DOSSIER_SUBMITTED',
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    priority: 'high',
    actionTab: 'admin_super_dashboard',
    metadata: {
      totalDocs: params.totalDocs,
      submittedAt: new Date().toISOString(),
    },
  });

  playAdminChime('normal');
  return alertId;
}

/**
 * Real-time Admin Alert when agreement renewal is due
 */
export async function notifyAdminAgreementRenewalDue(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId?: string;
  renewalDueDate: string;
  daysRemaining?: number;
}): Promise<string> {
  const title = `⏳ अनुबंध नवीनीकरण देय (Renewal Due): ${params.districtName} (${params.franchiseCode})`;
  const message = `${params.districtName} फ्रैंचाइज़ी पार्टनर (${params.franchiseCode}) का अनुबंध नवीनीकरण ${params.renewalDueDate} को देय है${params.daysRemaining !== undefined ? ` (${params.daysRemaining} दिन शेष)` : ''}। कृपया समीक्षा कर नवीनीकरण प्रक्रिया आरंभ करें।`;

  const alertId = await createAdminAlert({
    title,
    message,
    category: 'agreement',
    milestoneType: 'AGREEMENT_RENEWAL_DUE',
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    agreementId: params.agreementId,
    priority: 'high',
    actionTab: 'admin_super_dashboard',
    metadata: {
      renewalDueDate: params.renewalDueDate,
      daysRemaining: params.daysRemaining,
    },
  });

  playAdminChime('normal');
  return alertId;
}

/**
 * Real-time Admin Alert when agreement expires
 */
export async function notifyAdminAgreementExpired(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId?: string;
  expiredOnDate: string;
}): Promise<string> {
  const title = `⚠️ अनुबंध समाप्त (Agreement Expired): ${params.districtName} (${params.franchiseCode})`;
  const message = `${params.districtName} फ्रैंचाइज़ी पार्टनर (${params.franchiseCode}) का अनुबंध दिनांक ${params.expiredOnDate} को समाप्त हो चुका है। तत्काल नवीनीकरण या आवश्यक कार्यवाही अपेक्षित है।`;

  const alertId = await createAdminAlert({
    title,
    message,
    category: 'agreement',
    milestoneType: 'AGREEMENT_EXPIRED',
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    agreementId: params.agreementId,
    priority: 'critical',
    actionTab: 'admin_super_dashboard',
    metadata: {
      expiredOnDate: params.expiredOnDate,
    },
  });

  playAdminChime('critical');
  return alertId;
}

/**
 * Real-time Admin Alert when termination notice is issued
 */
export async function notifyAdminTerminationNoticeIssued(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  agreementId?: string;
  reason: string;
  effectiveDate: string;
  noticePeriodDays?: number;
}): Promise<string> {
  const title = `🚨 अनुबंध समाप्ति नोटिस जारी (Termination Notice Issued): ${params.districtName} (${params.franchiseCode})`;
  const message = `${params.districtName} फ्रैंचाइज़ी अनुबंध हेतु आधिकारिक समाप्ति नोटिस जारी किया गया है। कारण: ${params.reason}। प्रभावी तिथि: ${params.effectiveDate} (${params.noticePeriodDays || 30} दिन नोटिस अवधि)।`;

  const alertId = await createAdminAlert({
    title,
    message,
    category: 'agreement',
    milestoneType: 'TERMINATION_NOTICE_ISSUED',
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    agreementId: params.agreementId,
    priority: 'critical',
    actionTab: 'admin_super_dashboard',
    metadata: {
      reason: params.reason,
      effectiveDate: params.effectiveDate,
      noticePeriodDays: params.noticePeriodDays,
    },
  });

  playAdminChime('critical');
  return alertId;
}

/**
 * Real-time Admin Alert when a critical Partner Activation Milestone is reached
 */
export async function notifyAdminPartnerMilestoneReached(params: {
  partnerId: string;
  partnerName: string;
  districtId: string;
  districtName: string;
  franchiseCode: string;
  milestoneType: AdminMilestoneType;
  milestoneTitle: string;
  milestoneDescription: string;
  priority?: 'critical' | 'high' | 'medium' | 'info';
  metadata?: Record<string, any>;
}): Promise<string> {
  let category: AdminAlertCategory = 'milestone';
  if (params.milestoneType === 'PARTNER_ACTIVATED') category = 'activation';
  else if (params.milestoneType === 'KYC_DOSSIER_SUBMITTED' || params.milestoneType === 'KYC_FULLY_VERIFIED' || params.milestoneType === 'GUMASTA_UPLOADED') category = 'kyc';
  else if (params.milestoneType === 'FIRST_TECH_ONBOARDED' || params.milestoneType === 'TARGET_BOOKINGS_REACHED') category = 'operational';

  const alertId = await createAdminAlert({
    title: params.milestoneTitle,
    message: params.milestoneDescription,
    category,
    milestoneType: params.milestoneType,
    partnerId: params.partnerId,
    partnerName: params.partnerName,
    districtId: params.districtId,
    districtName: params.districtName,
    franchiseCode: params.franchiseCode,
    priority: params.priority || 'high',
    actionTab: 'admin_super_dashboard',
    metadata: params.metadata || {},
  });

  playAdminChime(params.priority === 'critical' ? 'critical' : 'normal');
  return alertId;
}

/**
 * Real-time Listener for all Admin Alerts from Firestore
 */
export function subscribeAdminAlerts(
  callback: (alerts: AdminRealtimeAlert[]) => void
): () => void {
  try {
    const alertsQuery = query(collection(db, 'admin_alerts'), limit(100));

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const list: AdminRealtimeAlert[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as AdminRealtimeAlert);
        });

        // Sort descending by creation timestamp
        list.sort(
          (a, b) =>
            new Date(b.createdAt || '').getTime() -
            new Date(a.createdAt || '').getTime()
        );

        callback(list);
      },
      (error) => {
        console.warn('Admin alerts live subscription notice:', error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to admin alerts:', err);
    return () => {};
  }
}

/**
 * Mark a single Admin Alert as Read
 */
export async function markAdminAlertAsRead(alertId: string): Promise<void> {
  try {
    const alertRef = doc(db, 'admin_alerts', alertId);
    await updateDoc(alertRef, { read: true });
  } catch (err) {
    console.warn('Failed to mark admin alert as read:', err);
  }
}

/**
 * Mark all Admin Alerts as Read
 */
export async function markAllAdminAlertsAsRead(
  alerts: AdminRealtimeAlert[]
): Promise<void> {
  try {
    const unread = alerts.filter((a) => !a.read);
    for (const a of unread) {
      await updateDoc(doc(db, 'admin_alerts', a.id), { read: true });
    }
  } catch (err) {
    console.warn('Failed to mark all admin alerts as read:', err);
  }
}

/**
 * Delete / Dismiss an alert
 */
export async function deleteAdminAlert(alertId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'admin_alerts', alertId));
  } catch (err) {
    console.warn('Failed to delete admin alert:', err);
  }
}

/**
 * Seed initial administrative alerts if collection is newly mounted
 */
export async function seedInitialAdminAlertsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(query(collection(db, 'admin_alerts'), limit(3)));
    if (!snap.empty) return;

    const initialSeed: Omit<AdminRealtimeAlert, 'id' | 'createdAt' | 'read'>[] = [
      {
        title: '📜 नया फ़्रैंचाइज़ी अनुबंध सबमिट हुआ: Gwalior (HDK-GWL-001)',
        message: 'ग्वालियर फ्रैंचाइज़ी पार्टनर द्वारा आधिकारिक अनुबंध पत्र 2026-27 को डिजिटल रूप से हस्ताक्षरित व स्वीकार कर लिया गया है। अनिवार्य गुमास्ता सत्यापन हेतु कतारबद्ध है।',
        category: 'agreement',
        milestoneType: 'AGREEMENT_SUBMITTED',
        partnerId: 'partner_gwalior_001',
        partnerName: 'Gwalior District Franchise Partner',
        districtId: 'gwalior',
        districtName: 'Gwalior',
        franchiseCode: 'HDK-GWL-001',
        agreementId: 'HDK-AGR-GWALIOR-2026-27',
        priority: 'critical',
        actionTab: 'admin_super_dashboard',
        metadata: { signedBy: 'Rajesh Sharma', signedAt: new Date(Date.now() - 3600000).toISOString() },
      },
      {
        title: '🚀 क्रिटिकल माइलस्टोन: इंदौर पार्टनर सक्रियण पूर्ण (100% KYC Verified)',
        message: 'इंदौर मालवा फ्रैंचाइज़ी पार्टनर (HDK-IDR-001) के सभी 5 सक्रियण मानदंड (गुमास्ता, आधार, अनुबंध पत्र) सत्यापित हो चुके हैं और जिला लाइव हो गया है।',
        category: 'activation',
        milestoneType: 'PARTNER_ACTIVATED',
        partnerId: 'partner_indore_001',
        partnerName: 'Indore Malwa Franchise Partner',
        districtId: 'indore',
        districtName: 'Indore',
        franchiseCode: 'HDK-IDR-001',
        priority: 'critical',
        actionTab: 'admin_super_dashboard',
        metadata: { activatedAt: new Date(Date.now() - 7200000).toISOString(), activatedBy: 'Deepak Central Admin' },
      },
      {
        title: '📑 KYC डोजियर सबमिट: Bhopal Central (HDK-BPL-001)',
        message: 'भोपाल सेंट्रल फ्रैंचाइज़ी पार्टनर ने गुमास्ता व बिजली बिल दस्तावेज समीक्षा हेतु सबमिट किए हैं। सुपर एडमिन समीक्षा प्रतीक्षित है।',
        category: 'kyc',
        milestoneType: 'KYC_DOSSIER_SUBMITTED',
        partnerId: 'partner_bhopal_001',
        partnerName: 'Bhopal Central Franchise Admin',
        districtId: 'bhopal',
        districtName: 'Bhopal',
        franchiseCode: 'HDK-BPL-001',
        priority: 'high',
        actionTab: 'admin_super_dashboard',
        metadata: { uploadedDocsCount: 4 },
      },
    ];

    for (const item of initialSeed) {
      await createAdminAlert(item);
    }
  } catch (err) {
    console.debug('Admin alerts seed notice:', err);
  }
}

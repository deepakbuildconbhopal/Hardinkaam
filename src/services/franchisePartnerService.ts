import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  FranchisePartner,
  FranchisePartnerPermissions,
  FranchisePartnerStatus,
  DistrictSettings,
  UserProfile,
} from '../types';
import { generateFranchiseCode, normalizeFranchiseCode } from '../utils/franchiseCode';
import { logAuditEvent } from './auditService';

export const DEFAULT_PERMISSIONS: FranchisePartnerPermissions = {
  manageCustomers: true,
  managePros: true,
  manageBookings: true,
  viewRevenue: true,
  viewReports: true,
  manageDistrictServices: true,
  manageDistrictCategories: true,
  manageDistrictSettings: true,
};

/**
 * Fetch all existing franchise partner codes to guarantee uniqueness
 */
export async function getAllFranchiseCodes(): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, 'franchise_partners'));
    const codes: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.franchiseCode) codes.push(data.franchiseCode);
    });
    return codes;
  } catch (err) {
    console.warn('Error fetching franchise codes:', err);
    return [];
  }
}

/**
 * Super Admin: Create a new Franchise Partner & District Admin
 */
export interface CreateFranchisePartnerParams {
  name: string;
  email: string;
  phone: string;
  assignedDistrictId: string;
  assignedDistrictName: string;
  stateName: string;
  customFranchiseCode?: string;
  officeAddress?: string;
  city?: string;
  pincodes?: string[];
  permissions?: Partial<FranchisePartnerPermissions>;
  password?: string;
  initialPassword?: string;
  notes?: string;
  createdBy?: string;
}

export async function createFranchisePartner(
  params: CreateFranchisePartnerParams
): Promise<{ success: boolean; partner?: FranchisePartner; error?: string }> {
  try {
    const {
      name,
      email,
      phone,
      assignedDistrictId,
      assignedDistrictName,
      stateName,
      customFranchiseCode,
      officeAddress = '',
      city = assignedDistrictName,
      pincodes = [],
      permissions = {},
      password,
      initialPassword,
      notes = '',
      createdBy = 'Super Admin DEEPAK',
    } = params;

    const actualPassword = password || initialPassword;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Generate unique Franchise Code
    const existingCodes = await getAllFranchiseCodes();
    const finalCode = customFranchiseCode
      ? normalizeFranchiseCode(customFranchiseCode)
      : generateFranchiseCode(assignedDistrictName, existingCodes);

    // Check if code is already taken
    if (existingCodes.includes(finalCode)) {
      return {
        success: false,
        error: `Franchise Code "${finalCode}" is already in use. Please select a unique code.`,
      };
    }

    // 2. Generate a stable Document ID
    const partnerDocId = `franchise_${assignedDistrictId.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}_${Date.now().toString(36)}`;

    // 3. Create Firebase Auth user account if password provided
    let authUid = partnerDocId;
    if (actualPassword && actualPassword.length >= 6) {
      try {
        // Try creating user in Firebase Auth.
        // We will catch error if email already exists or handle secondary auth
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, actualPassword);
        authUid = cred.user.uid;
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          // Account already exists in auth, use generated doc id or existing account
          console.warn('Firebase Auth user already exists for email:', normalizedEmail);
        } else {
          console.warn('Firebase Auth creation notice (continuing with Firestore doc):', authErr?.message);
        }
      }
    }

    const mergedPermissions: FranchisePartnerPermissions = {
      ...DEFAULT_PERMISSIONS,
      ...permissions,
    };

    const newPartner: FranchisePartner = {
      id: authUid,
      franchisePartnerId: authUid,
      franchiseCode: finalCode,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      assignedDistrictId: assignedDistrictId.trim().toLowerCase(),
      assignedDistrictName: assignedDistrictName.trim(),
      stateName: stateName.trim(),
      status: 'ACTIVE',
      permissions: mergedPermissions,
      officeAddress: officeAddress.trim(),
      city: city.trim(),
      pincodes: pincodes,
      districtSettings: {
        supportPhone: phone.trim(),
        supportEmail: normalizedEmail,
        emergencyContact: '0755-4001234',
        operatingHours: '08:00 AM - 08:00 PM (Daily)',
        serviceRadiusKm: 25,
        customNotice: `Welcome to HARDINKAAM ${assignedDistrictName} Franchise Services.`,
        coveredPincodes: pincodes,
      },
      disabledServiceIds: [],
      disabledCategoryIds: [],
      loginUsername: finalCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy,
      notes,
    };

    // 4. Save to 'franchise_partners' collection
    await setDoc(doc(db, 'franchise_partners', authUid), newPartner);

    // Create initial Agreement record in 'franchise_agreements'
    const now = new Date().toISOString();
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const initialAgrId = `agr_${authUid}_${Date.now()}`;
    const initialAgrRecord = {
      id: initialAgrId,
      franchisePartnerId: authUid,
      franchiseCode: finalCode,
      districtId: assignedDistrictId.trim().toLowerCase(),
      districtName: assignedDistrictName.trim(),
      agreementId: `HDK-AGR-${assignedDistrictId.toUpperCase()}-${currentYear}-${String(nextYear).slice(2)}`,
      agreementYear: `${currentYear}-${nextYear}`,
      startDate: `${currentYear}-04-01`,
      endDate: `${nextYear}-03-31`,
      charges: 50000,
      commissionPercent: 10,
      profitPercentage: 20,
      termsAndConditions: `Standard Franchise Agreement for ${assignedDistrictName} District Operations.`,
      status: 'PENDING',
      createdAt: now,
      createdBy: createdBy,
    };
    await setDoc(doc(db, 'franchise_agreements', initialAgrId), initialAgrRecord);

    await logAuditEvent({
      action: 'AGREEMENT_CREATED',
      actorId: createdBy,
      targetDistrictId: assignedDistrictId,
      targetDistrictName: assignedDistrictName,
      targetPartnerId: authUid,
      details: `Agreement created for ${assignedDistrictName} (${finalCode})`,
      metadata: { agreementId: initialAgrRecord.agreementId },
    });

    await logAuditEvent({
      action: 'AGREEMENT_SENT',
      actorId: createdBy,
      targetDistrictId: assignedDistrictId,
      targetDistrictName: assignedDistrictName,
      targetPartnerId: authUid,
      details: `Agreement sent to Franchise Partner ${name} (${finalCode})`,
      metadata: { agreementId: initialAgrRecord.agreementId },
    });

    // 5. Save/Update in 'users' collection with role 'franchise_admin'
    const userDoc: Partial<UserProfile> = {
      id: authUid,
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      role: 'franchise_admin',
      status: 'active',
      city: assignedDistrictName,
      state: stateName,
      districtId: assignedDistrictId.trim().toLowerCase(),
      districtName: assignedDistrictName.trim(),
      assignedDistrictId: assignedDistrictId.trim().toLowerCase(),
      assignedDistrictName: assignedDistrictName.trim(),
      franchiseCode: finalCode,
      franchisePartnerId: authUid,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', authUid), userDoc, { merge: true });

    // 6. Log securely in audit_logs (zero password or secret persistence)
    await logAuditEvent({
      action: 'FRANCHISE_PARTNER_CREATE',
      actorId: createdBy,
      targetDistrictId: assignedDistrictId,
      targetDistrictName: assignedDistrictName,
      targetPartnerId: authUid,
      details: `Created Franchise Partner ${name} (${finalCode}) for ${assignedDistrictName}, ${stateName}`,
      metadata: {
        franchiseCode: finalCode,
        assignedDistrictId,
        assignedDistrictName,
        stateName,
      },
    });

    return { success: true, partner: newPartner };
  } catch (err: any) {
    console.error('Error creating franchise partner:', err);
    return { success: false, error: err.message || 'Failed to create Franchise Partner' };
  }
}

/**
 * Super Admin: Update status of a Franchise Partner (ACTIVE, SUSPENDED, DISABLED, PENDING)
 */
export async function updateFranchiseStatus(
  partnerId: string,
  newStatus: FranchisePartnerStatus,
  adminUser: string = 'Super Admin DEEPAK'
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', partnerId);
    const snap = await getDoc(partnerRef);
    if (!snap.exists()) {
      return { success: false, error: 'Franchise Partner record not found' };
    }

    const now = new Date().toISOString();
    await updateDoc(partnerRef, {
      status: newStatus,
      updatedAt: now,
    });

    // Also update corresponding user profile
    const userStatus = newStatus === 'ACTIVE' ? 'active' : newStatus === 'SUSPENDED' ? 'suspended' : 'pending';
    await updateDoc(doc(db, 'users', partnerId), {
      status: userStatus,
      updatedAt: now,
    }).catch(() => {});

    // Audit log
    await logAuditEvent({
      action: 'FRANCHISE_PARTNER_STATUS_CHANGE',
      actorId: adminUser,
      targetPartnerId: partnerId,
      details: `Updated Franchise Partner (${partnerId}) status to ${newStatus}`,
      metadata: { newStatus },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error updating franchise status:', err);
    return { success: false, error: err.message || 'Failed to update status' };
  }
}

/**
 * Super Admin: Reassign district to an existing Franchise Partner
 */
export async function reassignFranchiseDistrict(
  partnerId: string,
  newDistrictId: string,
  newDistrictName: string,
  newStateName: string,
  adminUser: string = 'Super Admin DEEPAK'
): Promise<{ success: boolean; newCode?: string; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', partnerId);
    const snap = await getDoc(partnerRef);
    if (!snap.exists()) {
      return { success: false, error: 'Franchise Partner not found' };
    }

    const existingCodes = await getAllFranchiseCodes();
    const newCode = generateFranchiseCode(newDistrictName, existingCodes);
    const now = new Date().toISOString();

    await updateDoc(partnerRef, {
      assignedDistrictId: newDistrictId.toLowerCase(),
      assignedDistrictName: newDistrictName,
      stateName: newStateName,
      franchiseCode: newCode,
      loginUsername: newCode,
      city: newDistrictName,
      updatedAt: now,
    });

    await updateDoc(doc(db, 'users', partnerId), {
      districtId: newDistrictId.toLowerCase(),
      districtName: newDistrictName,
      assignedDistrictId: newDistrictId.toLowerCase(),
      assignedDistrictName: newDistrictName,
      city: newDistrictName,
      state: newStateName,
      franchiseCode: newCode,
      updatedAt: now,
    }).catch(() => {});

    // Audit log
    await logAuditEvent({
      action: 'DISTRICT_ASSIGNMENT',
      actorId: adminUser,
      targetPartnerId: partnerId,
      targetDistrictId: newDistrictId,
      targetDistrictName: newDistrictName,
      details: `Reassigned Franchise Partner (${partnerId}) to ${newDistrictName} with new code ${newCode}`,
      metadata: { newDistrictId, newDistrictName, newStateName, newCode },
    });

    return { success: true, newCode };
  } catch (err: any) {
    console.error('Error reassigning district:', err);
    return { success: false, error: err.message || 'Failed to reassign district' };
  }
}

/**
 * Super Admin: Update permissions for a Franchise Partner
 */
export async function updateFranchisePermissions(
  partnerId: string,
  permissions: FranchisePartnerPermissions,
  adminUser: string = 'Super Admin DEEPAK'
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', partnerId);
    const now = new Date().toISOString();
    await updateDoc(partnerRef, {
      permissions,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'FRANCHISE_PERMISSION_CHANGE',
      actorId: adminUser,
      targetPartnerId: partnerId,
      details: `Updated permissions for Franchise Partner (${partnerId})`,
      metadata: { permissions },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Franchise Partner / Super Admin: Update District Settings (Helpline, Hours, Custom Notice, etc.)
 */
export async function updateDistrictSettings(
  partnerId: string,
  districtSettings: DistrictSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', partnerId);
    const now = new Date().toISOString();
    await updateDoc(partnerRef, {
      districtSettings,
      updatedAt: now,
    });

    await logAuditEvent({
      action: 'DISTRICT_SETTINGS_UPDATE',
      targetPartnerId: partnerId,
      details: `Updated district settings for partner (${partnerId})`,
      metadata: { supportPhone: districtSettings.supportPhone, operatingHours: districtSettings.operatingHours },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Franchise Partner: Toggle Service availability in their District
 */
export async function toggleDistrictService(
  partnerId: string,
  serviceId: string,
  enable: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', partnerId);
    const snap = await getDoc(partnerRef);
    if (!snap.exists()) return { success: false, error: 'Partner not found' };

    const data = snap.data() as FranchisePartner;
    const disabled = new Set(data.disabledServiceIds || []);

    if (enable) {
      disabled.delete(serviceId);
    } else {
      disabled.add(serviceId);
    }

    await updateDoc(partnerRef, {
      disabledServiceIds: Array.from(disabled),
      updatedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      action: 'SERVICE_AVAILABILITY_CHANGE',
      targetPartnerId: partnerId,
      details: `${enable ? 'Enabled' : 'Disabled'} service ${serviceId} for partner (${partnerId})`,
      metadata: { serviceId, enable },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Franchise Partner: Toggle Category availability in their District
 */
export async function toggleDistrictCategory(
  partnerId: string,
  categoryId: string,
  enable: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const partnerRef = doc(db, 'franchise_partners', partnerId);
    const snap = await getDoc(partnerRef);
    if (!snap.exists()) return { success: false, error: 'Partner not found' };

    const data = snap.data() as FranchisePartner;
    const disabled = new Set(data.disabledCategoryIds || []);

    if (enable) {
      disabled.delete(categoryId);
    } else {
      disabled.add(categoryId);
    }

    await updateDoc(partnerRef, {
      disabledCategoryIds: Array.from(disabled),
      updatedAt: new Date().toISOString(),
    });

    await logAuditEvent({
      action: 'SERVICE_AVAILABILITY_CHANGE',
      targetPartnerId: partnerId,
      details: `${enable ? 'Enabled' : 'Disabled'} category ${categoryId} for partner (${partnerId})`,
      metadata: { categoryId, enable },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Secure password reset request via Firebase Auth email or secure link
 */
export async function sendFranchisePasswordReset(
  email: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return {
      success: true,
      message: `सुरक्षित पासवर्ड रीसेट लिंक ${email} पर सफलतापूर्वक भेज दी गई है।`,
    };
  } catch (err: any) {
    console.error('Password reset email error:', err);
    // If not found in Auth, create a pending admin password reset record
    try {
      await setDoc(doc(collection(db, 'password_reset_requests')), {
        emailOrUsername: email,
        userEmail: email,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        notes: 'Franchise Partner secure reset request',
      });
      return {
        success: true,
        message: `पासवर्ड रीसेट अनुरोध दर्ज हो गया है। सुपर एडमिन इसे तुरंत रीसेट करेंगे।`,
      };
    } catch (dbErr: any) {
      return { success: false, error: err.message || 'पासवर्ड रीसेट करने में त्रुटि आई।' };
    }
  }
}

/**
 * Query franchise partner by Franchise Code (e.g. HDK-GWL-001)
 */
export async function getFranchisePartnerByCode(
  franchiseCode: string
): Promise<FranchisePartner | null> {
  try {
    const normalized = normalizeFranchiseCode(franchiseCode);
    const q = query(collection(db, 'franchise_partners'), where('franchiseCode', '==', normalized));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as FranchisePartner;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching franchise partner by code:', err);
    return null;
  }
}

/**
 * Query franchise partner by Email
 */
export async function getFranchisePartnerByEmail(
  email: string
): Promise<FranchisePartner | null> {
  try {
    const normalized = email.trim().toLowerCase();
    const q = query(collection(db, 'franchise_partners'), where('email', '==', normalized));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as FranchisePartner;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching franchise partner by email:', err);
    return null;
  }
}

/**
 * Real-time listener for Super Admin (all franchise partners)
 */
export function subscribeAllFranchisePartners(
  callback: (partners: FranchisePartner[]) => void
) {
  return onSnapshot(
    collection(db, 'franchise_partners'),
    (snap) => {
      const list: FranchisePartner[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as FranchisePartner));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => console.warn('Franchise partners listener notice:', err)
  );
}

/**
 * Real-time listener for single Franchise Partner
 */
export function subscribeSingleFranchisePartner(
  partnerId: string,
  callback: (partner: FranchisePartner | null) => void
) {
  return onSnapshot(
    doc(db, 'franchise_partners', partnerId),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as FranchisePartner);
      } else {
        callback(null);
      }
    },
    (err) => console.warn('Single franchise partner listener notice:', err)
  );
}

/**
 * Retrieve district-specific business settings (inheriting default Bhopal rates if unset)
 */
export async function getDistrictConfig(districtId: string): Promise<DistrictSettings> {
  const normId = districtId.trim().toLowerCase();
  try {
    const cityDoc = await getDoc(doc(db, 'franchise_cities', normId));
    if (cityDoc.exists() && cityDoc.data()?.districtSettings) {
      return cityDoc.data().districtSettings as DistrictSettings;
    }

    // Check partner record
    const q = query(
      collection(db, 'franchise_partners'),
      where('assignedDistrictId', '==', normId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const pData = snap.docs[0].data() as FranchisePartner;
      if (pData.districtSettings) {
        return pData.districtSettings;
      }
    }
  } catch (err) {
    console.warn('Error fetching district settings:', err);
  }

  // Default baseline business rules (Bhopal default: 20% profit, 15% platform fee, etc.)
  if (normId === 'bhopal') {
    return {
      profitPercentage: 20,
      platformFeePercent: 15,
      franchiseCommissionPercent: 10,
      businessPartnerCommissionPercent: 15,
      serviceProfessionalSharePercent: 85,
      bookingFee: 0,
      cancellationFee: 50,
      minOrderValue: 199,
      operatingHours: '08:00 AM - 08:00 PM',
      supportPhone: '+91 98260 00000',
    };
  } else if (normId === 'gwalior') {
    return {
      profitPercentage: 15,
      platformFeePercent: 12,
      franchiseCommissionPercent: 10,
      businessPartnerCommissionPercent: 15,
      serviceProfessionalSharePercent: 85,
      bookingFee: 0,
      cancellationFee: 50,
      minOrderValue: 199,
      operatingHours: '08:00 AM - 08:00 PM',
      supportPhone: '+91 98270 54321',
    };
  }

  return {
    profitPercentage: 20,
    platformFeePercent: 15,
    franchiseCommissionPercent: 10,
    businessPartnerCommissionPercent: 15,
    serviceProfessionalSharePercent: 85,
    bookingFee: 0,
    cancellationFee: 50,
    minOrderValue: 199,
    operatingHours: '08:00 AM - 08:00 PM',
  };
}

/**
 * Super Admin: Update district-specific business settings independently
 */
export async function updateDistrictConfig(
  districtId: string,
  settings: DistrictSettings,
  districtName?: string
): Promise<{ success: boolean; error?: string }> {
  const normId = districtId.trim().toLowerCase();
  try {
    const now = new Date().toISOString();
    // 1. Update franchise_cities document
    await setDoc(
      doc(db, 'franchise_cities', normId),
      {
        district: districtName || districtId,
        districtSettings: settings,
        updatedAt: now,
      },
      { merge: true }
    );

    // 2. Also update corresponding partner doc if exists
    const q = query(
      collection(db, 'franchise_partners'),
      where('assignedDistrictId', '==', normId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      for (const pDoc of snap.docs) {
        await updateDoc(doc(db, 'franchise_partners', pDoc.id), {
          districtSettings: settings,
          updatedAt: now,
        });
      }
    }

    // 3. Log audit event
    await logAuditEvent({
      action: 'DISTRICT_SETTINGS_UPDATE',
      targetDistrictId: normId,
      targetDistrictName: districtName || districtId,
      details: `Updated district-specific business rates for ${districtName || districtId}: Profit=${settings.profitPercentage}%, PlatformFee=${settings.platformFeePercent}%`,
      metadata: { settings },
    });

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update district config:', err);
    return { success: false, error: err.message || 'जिले की सेटिंग्स अपडेट करने में विफल।' };
  }
}

/**
 * Ensure default initial franchise partners are seeded (Bhopal, Gwalior, Indore)
 */
export async function ensureDefaultFranchisePartners(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'franchise_partners'));
    if (!snap.empty) return; // already seeded

    const defaults: Partial<CreateFranchisePartnerParams>[] = [
      {
        name: 'Bhopal Central Franchise Admin',
        email: 'bhopal.franchise@hardinkaam.in',
        phone: '9826012345',
        assignedDistrictId: 'bhopal',
        assignedDistrictName: 'Bhopal',
        stateName: 'Madhya Pradesh',
        customFranchiseCode: 'HDK-BPL-001',
        officeAddress: 'Shop 14, MP Nagar Zone-II, Bhopal, MP - 462011',
        notes: 'Bhopal Central Headquarters Franchise Unit',
      },
      {
        name: 'Gwalior District Franchise Partner',
        email: 'gwalior.franchise@hardinkaam.in',
        phone: '9827054321',
        assignedDistrictId: 'gwalior',
        assignedDistrictName: 'Gwalior',
        stateName: 'Madhya Pradesh',
        customFranchiseCode: 'HDK-GWL-001',
        officeAddress: 'City Center Mall Road, Gwalior, MP - 474011',
        notes: 'Gwalior District Primary Administrator',
      },
      {
        name: 'Indore Malwa Franchise Partner',
        email: 'indore.franchise@hardinkaam.in',
        phone: '9826098765',
        assignedDistrictId: 'indore',
        assignedDistrictName: 'Indore',
        stateName: 'Madhya Pradesh',
        customFranchiseCode: 'HDK-IDR-001',
        officeAddress: 'Vijay Nagar Square, Indore, MP - 452010',
        notes: 'Indore District Primary Administrator',
      },
    ];

    for (const item of defaults) {
      await createFranchisePartner({
        name: item.name!,
        email: item.email!,
        phone: item.phone!,
        assignedDistrictId: item.assignedDistrictId!,
        assignedDistrictName: item.assignedDistrictName!,
        stateName: item.stateName!,
        customFranchiseCode: item.customFranchiseCode,
        officeAddress: item.officeAddress,
        notes: item.notes,
        createdBy: 'System Seed (Super Admin)',
      });
    }
  } catch (err) {
    console.warn('Franchise partner seed notice:', err);
  }
}

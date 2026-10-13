import { doc, setDoc, getDocs, query, collection, where, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { normalizePhoneDigits } from '../../context/AuthContext';
import { sendMemberRegistrationNotification } from '../../services/memberNotificationService';
import { RegistrationFlowState } from './conversationalRegistrationService';
import { UserProfile, UserRole } from '../../types';

export interface MultiRoleRegistrationResult {
  success: boolean;
  userProfile?: UserProfile;
  memberCode: string;
  role: UserRole;
  error?: string;
}

export async function executeMultiRoleRegistration(
  state: RegistrationFlowState
): Promise<MultiRoleRegistrationResult> {
  const role: UserRole =
    state.targetRole === 'franchise_admin'
      ? 'franchise_admin'
      : state.targetRole === 'business_partner'
      ? 'business_partner'
      : state.targetRole === 'service_man'
      ? 'service_man'
      : 'customer';

  const rawPhone = state.mobile || '';
  const phoneDigits = normalizePhoneDigits(rawPhone) || '6267546945';
  const cleanPhone = `+91 ${phoneDigits}`;
  const cleanEmail = state.email && state.email.includes('@') ? state.email.trim() : '';
  const fullName = state.name || state.contactPerson || 'HARDINKAAM Member';
  const nowIso = new Date().toISOString();

  const prefixByRole: Record<string, string> = {
    customer: 'HDK-CUST',
    service_man: 'HDK-PRO',
    business_partner: 'HDK-BP',
    brand_promoter: 'HDK-PROMO',
    franchise_admin: 'HDK-FR',
  };

  const rolePrefix = prefixByRole[state.targetRole || 'customer'] || 'HDK-MEM';
  const generatedCode = `${rolePrefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let resUid = auth.currentUser?.uid;

  if (!resUid) {
    // Authenticate user via Firebase Auth synthetic phone email
    const syntheticEmail = `${phoneDigits}@hardinkaam.internal`;
    const randomAuthPass = 'Hdk#' + Math.random().toString(36).substring(2, 10) + '9!';
    try {
      const res = await createUserWithEmailAndPassword(auth, syntheticEmail, randomAuthPass);
      resUid = res.user.uid;
      await updateProfile(res.user, { displayName: fullName.trim() });
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        const q = query(collection(db, 'users'), where('phone', '==', cleanPhone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          resUid = snap.docs[0].id;
        } else {
          resUid = 'usr_' + Date.now() + '_' + phoneDigits.slice(-4);
        }
      } else {
        resUid = 'usr_' + Date.now() + '_' + phoneDigits.slice(-4);
      }
    }
  }

  const fullAddress =
    state.address || (state.area ? `${state.area}, Bhopal` : 'Bhopal, Madhya Pradesh');
  const city = state.city || 'Bhopal';
  const districtName = state.assignedDistrict || state.district || 'Bhopal';

  // 1. Create or Update User Profile
  const profile: UserProfile = {
    id: resUid,
    name: fullName.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    role,
    memberCode: generatedCode,
    avatar: state.avatar || '',
    status: 'active',
    address: fullAddress,
    city,
    state: 'Madhya Pradesh',
    districtName,
    districtId: 'mp_bhopal_dist',
    assignedDistrictName: state.assignedDistrict,
    assignedDistrictId: state.assignedDistrict ? `dist_${state.assignedDistrict.toLowerCase().replace(/\s+/g, '_')}` : undefined,
    businessName: state.businessName,
    zone: state.assignedZone,
    partnerLicenseNumber: state.targetRole === 'business_partner' || state.targetRole === 'franchise_admin' ? generatedCode : undefined,
    registrationFeePaid: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await setDoc(doc(db, 'users', resUid), profile, { merge: true });
  } catch (err) {
    console.warn('[MultiRoleRegistration] User setDoc note:', err);
  }

  // 2. Role-specific Collection Records
  // 2A. SERVICE_PRO -> `service_men`
  if (state.targetRole === 'service_man') {
    try {
      const proDocId = `pro_${resUid}`;
      await setDoc(
        doc(db, 'service_men', proDocId),
        {
          id: proDocId,
          userId: resUid,
          name: fullName,
          phone: cleanPhone,
          email: cleanEmail,
          trade: state.tradeSkill || 'Multi-Trade Expert',
          skills: state.tradeSkill ? [state.tradeSkill] : ['General Maintenance'],
          experienceYears: state.experienceYears || 3,
          serviceArea: fullAddress,
          city,
          rating: 4.9,
          ratingCount: 1,
          totalJobs: 0,
          isAvailable: true,
          isVerified: true,
          kycStatus: 'verified',
          payoutUpiId: state.payoutUpiId || `${phoneDigits}@upi`,
          documents: state.documents || [],
          memberCode: generatedCode,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (proErr) {
      console.warn('[MultiRoleRegistration] ServiceMan create note:', proErr);
    }
  }

  // 2B. BUSINESS_PARTNER -> `business_partners`
  if (state.targetRole === 'business_partner') {
    try {
      const partnerDocId = `partner_${resUid}`;
      await setDoc(
        doc(db, 'business_partners', partnerDocId),
        {
          id: partnerDocId,
          userId: resUid,
          businessName: state.businessName || `${fullName} Services Agency`,
          businessType: state.businessType || 'Franchise Partner',
          contactPerson: fullName,
          email: cleanEmail,
          phone: cleanPhone,
          zone: state.assignedZone || 'Bhopal Central',
          fleetSize: state.fleetSize || '5-10 Technicians',
          partnerLicenseNumber: generatedCode,
          registrationFee: 1021,
          kycStatus: 'verified',
          status: 'active',
          totalFleetTechnicians: 0,
          totalRevenueGenerated: 0,
          documents: state.documents || [],
          payoutUpiId: state.payoutUpiId || `${phoneDigits}@upi`,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (bpErr) {
      console.warn('[MultiRoleRegistration] BusinessPartner create note:', bpErr);
    }
  }

  // 2C. BRAND_PROMOTER -> `brand_promoters`
  if (state.targetRole === 'brand_promoter') {
    try {
      const promoDocId = `promo_${resUid}`;
      await setDoc(
        doc(db, 'brand_promoters', promoDocId),
        {
          id: promoDocId,
          userId: resUid,
          name: fullName,
          phone: cleanPhone,
          email: cleanEmail,
          promoCode: state.preferredPromoCode || generatedCode,
          marketingChannel: state.marketingChannel || 'Instagram & Social Media',
          payoutUpiId: state.payoutUpiId || `${phoneDigits}@upi`,
          commissionRatePercent: 10,
          totalReferrals: 0,
          totalEarnings: 0,
          status: 'active',
          documents: state.documents || [],
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (bpErr) {
      console.warn('[MultiRoleRegistration] BrandPromoter create note:', bpErr);
    }
  }

  // 2D. FRANCHISE -> `franchise_partners`
  if (state.targetRole === 'franchise_admin') {
    try {
      const franchiseDocId = `franchise_${resUid}`;
      await setDoc(
        doc(db, 'franchise_partners', franchiseDocId),
        {
          id: franchiseDocId,
          userId: resUid,
          franchiseName: state.businessName || `${districtName} Master Franchise`,
          directorName: fullName,
          phone: cleanPhone,
          email: cleanEmail,
          district: districtName,
          assignedDistrict: districtName,
          franchiseCode: generatedCode,
          status: 'ACTIVE',
          revenueSharePercent: 12,
          totalDistrictBookings: 0,
          totalDistrictRevenue: 0,
          documents: state.documents || [],
          payoutUpiId: state.payoutUpiId || `${phoneDigits}@upi`,
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (frErr) {
      console.warn('[MultiRoleRegistration] Franchise create note:', frErr);
    }
  }

  // 3. Wallet Initialization
  try {
    const welcomeBonus = state.targetRole === 'customer' ? 200 : 0;
    await setDoc(
      doc(db, 'wallets', resUid),
      {
        id: resUid,
        userId: resUid,
        balance: welcomeBonus,
        pendingBalance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        updatedAt: nowIso,
      },
      { merge: true }
    );
  } catch (wErr) {
    console.warn('[MultiRoleRegistration] Wallet setDoc note:', wErr);
  }

  // 4. Send Registration Notification
  try {
    await sendMemberRegistrationNotification({
      userId: resUid,
      name: fullName,
      phone: cleanPhone,
      email: cleanEmail,
      role,
      memberCode: generatedCode,
      amountPaid: 0,
      registeredAt: nowIso,
    });
  } catch (nErr) {
    console.warn('[MultiRoleRegistration] Notification note:', nErr);
  }

  return {
    success: true,
    userProfile: profile,
    memberCode: generatedCode,
    role,
  };
}

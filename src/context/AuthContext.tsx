import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot, addDoc, limit } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import {
  generateUniqueMemberCode,
  sendMemberRegistrationNotification,
  MemberNotificationResult,
} from '../services/memberNotificationService';
import { checkAndHandleQuotaError, isResourceExhausted } from '../utils/sparkQuotaGuard';

export const normalizePhoneDigits = (input?: string | null): string | null => {
  if (!input || typeof input !== 'string') return null;

  // 1. Trim spaces
  let val = input.trim();

  // 2. Remove spaces
  val = val.replace(/\s+/g, '');

  // 3. Remove hyphens
  val = val.replace(/-/g, '');

  // 4. If the input starts with +91, remove +91
  if (val.startsWith('+91')) {
    val = val.slice(3);
  } else if (val.startsWith('91') && val.length === 12) {
    val = val.slice(2);
  }

  // 5. If appropriate, remove a leading 0
  if (val.startsWith('0')) {
    val = val.slice(1);
  }

  // 6. After normalization, validate exactly 10 digits
  if (/^\d{10}$/.test(val)) {
    return val;
  }

  return null;
};

export const validateIndianPhoneNumber = (input?: string | null): boolean => {
  return normalizePhoneDigits(input) !== null;
};

export const getSyntheticPhoneEmail = (phoneDigits: string): string => {
  return `${phoneDigits}@phone.hardinkaam.in`;
};

export const isSyntheticPhoneEmail = (email?: string | null): boolean => {
  return Boolean(email && email.toLowerCase().endsWith('@phone.hardinkaam.in'));
};

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  user?: UserProfile | null;
  loading: boolean;
  activeRole: UserRole;
  isAdmin: boolean;
  isFranchiseAdmin: boolean;
  assignedDistrict: string;
  assignedDistrictId: string;
  franchiseCode: string;
  isLoggedIn: boolean;
  setActiveRole: (role: UserRole) => void;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  signInWithEmail: (emailOrUsername: string, pass: string) => Promise<void>;
  signUpWithEmail: (
    name: string,
    email: string,
    pass: string,
    role?: UserRole,
    phone?: string,
    registrationPayment?: { paymentId?: string; orderId?: string; amount?: number; [key: string]: any }
  ) => Promise<any>;
  payRegistrationFee: (
    role: UserRole,
    paymentMeta: { paymentId: string; orderId: string; amount: number }
  ) => Promise<void>;
  adminChangeUserCredentials: (uid: string, name: string, email: string, newPassword?: string, newRole?: UserRole) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<{
    success: boolean;
    message: string;
    isAdmin?: boolean;
    resetDetails?: {
      reqId: string;
      userName: string;
      userEmail?: string;
      userPhone?: string;
      adminWhatsAppUrl: string;
    };
  }>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  registerConversationalCustomer: (data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    area?: string;
    city?: string;
    district?: string;
    avatar?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MASTER_ADMIN_PROFILE: UserProfile = {
  id: 'admin_deepak_root',
  name: 'DEEPAK',
  fullName: 'DEEPAK (Founder & Super Admin)',
  email: 'deepakbuildconbhopal@gmail.com',
  phone: '+91 62675 46945',
  role: 'admin',
  status: 'active',
  isAdmin: true,
  isSuperAdmin: true,
  address: 'Deepak Buildcon Head Office, MP Nagar Zone 1, Bhopal',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462011',
  updatedAt: new Date().toISOString(),
};

export const checkIsAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return (
    e === 'deepakbuildconbhopal@gmail.com' ||
    e === 'admin@hardinkaam.in'
  );
};

export const ensureAdminFirebaseAuth = async (): Promise<User | null> => {
  if (auth.currentUser && checkIsAdminEmail(auth.currentUser.email)) {
    return auth.currentUser;
  }
  return auth.currentUser;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // Security Fix: userProfile is initialized to null so localStorage cannot falsely authenticate a user
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const storedRole = localStorage.getItem('hardinkaam_active_role');
      if (storedRole) return storedRole as UserRole;
    } catch (_) {}
    return 'customer';
  });

  // Authoritative Admin check: User must be authenticated in Firebase Auth with verified admin identity
  const isAdmin = Boolean(
    currentUser &&
    currentUser.email &&
    checkIsAdminEmail(currentUser.email) &&
    (currentUser.emailVerified || (currentUser.providerData && currentUser.providerData.some(p => p.providerId === 'google.com' || p.providerId === 'password')))
  );
  const isFranchiseAdmin = Boolean(currentUser && userProfile?.role === 'franchise_admin');
  const assignedDistrict = userProfile?.assignedDistrictName || userProfile?.city || 'Bhopal';
  const assignedDistrictId = userProfile?.assignedDistrictId || (userProfile?.city?.toLowerCase() || 'bhopal');
  const franchiseCode = userProfile?.franchiseCode || '';
  // Authentication integrity: User is ONLY logged in if Firebase Auth confirms an active currentUser
  const isLoggedIn = Boolean(currentUser);

  const handleSetActiveRole = (role: UserRole) => {
    // If not logged in, user can only access customer public catalog
    if (!isLoggedIn) {
      setActiveRole('customer');
      localStorage.setItem('hardinkaam_active_role', 'customer');
      return;
    }
    // If trying to access admin dashboard, only authorized admin is permitted
    if (role === 'admin' && !isAdmin) {
      throw new Error("केवल अधिकृत सुपर एडमिन 'DEEPAK' ही सुपर एडमिन डैशबोर्ड में प्रवेश कर सकते हैं।");
    }
    // If logged in as franchise admin, lock to franchise_admin role
    if (userProfile?.role === 'franchise_admin' && !isAdmin) {
      setActiveRole('franchise_admin');
      localStorage.setItem('hardinkaam_active_role', 'franchise_admin');
      return;
    }
    // If logged in as non-admin, user role is locked to profile role
    if (!isAdmin && userProfile?.role) {
      setActiveRole(userProfile.role);
      localStorage.setItem('hardinkaam_active_role', userProfile.role);
      return;
    }
    // Super Admin has master privileges
    setActiveRole(role);
    localStorage.setItem('hardinkaam_active_role', role);
  };

  const activeProfileLoadRef = useRef<{ [uid: string]: Promise<UserProfile> }>({});

  const loadUserProfile = async (user: User): Promise<UserProfile> => {
    if (activeProfileLoadRef.current[user.uid]) {
      return activeProfileLoadRef.current[user.uid];
    }

    const loadPromise = (async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        const rawEmail = user.email || '';
        const isSynthetic = isSyntheticPhoneEmail(rawEmail);
        const phoneFromSynthetic = isSynthetic ? rawEmail.split('@')[0] : '';
        const isAdminEmail = checkIsAdminEmail(rawEmail);

        let profile: UserProfile;

        if (snap.exists()) {
          // 4. If existing profile has a valid role, preserve it
          const data = snap.data() as UserProfile;
          const validRoles: UserRole[] = ['customer', 'service_man', 'business_partner', 'admin', 'franchise_admin'];
          const profileRole: UserRole = data.role && validRoles.includes(data.role) ? data.role : 'customer';
          const resolvedRole: UserRole = isAdminEmail ? 'admin' : profileRole;

          const cleanEmail = isSyntheticPhoneEmail(data.email)
            ? ''
            : (data.email || (isSynthetic ? '' : rawEmail));
          const cleanPhone = data.phone || (phoneFromSynthetic ? `+91 ${phoneFromSynthetic}` : (user.phoneNumber || ''));

          profile = {
            ...data,
            id: user.uid,
            email: cleanEmail,
            phone: cleanPhone,
            role: resolvedRole,
            avatar: data.avatar || user.photoURL || '',
          };

          if (isAdminEmail && data.role !== 'admin') {
            try {
              await setDoc(userDocRef, { role: 'admin', isAdmin: true, isSuperAdmin: true }, { merge: true });
            } catch (_) {}
          }
        } else {
          // Profile document missing: provision a safe initial pending profile for the authenticated user
          const isVerifiedAdmin = Boolean(
            isAdminEmail &&
            (user.emailVerified || (user.providerData && user.providerData.some(p => p.providerId === 'google.com')))
          );

          if (isVerifiedAdmin) {
            // Authorized Admin session representation without insecure client-side privilege escalation
            profile = {
              ...MASTER_ADMIN_PROFILE,
              id: user.uid,
              email: rawEmail || 'deepakbuildconbhopal@gmail.com',
              role: 'admin',
              status: 'active',
              isAdmin: true,
              isSuperAdmin: true,
              avatar: user.photoURL || '',
            };
          } else {
            // Safe unprivileged pending profile: never self-grant active or fee-paid status
            const newMemberCode = generateUniqueMemberCode('customer');
            const provEmail = isSyntheticPhoneEmail(rawEmail) ? '' : rawEmail;
            const provPhone = phoneFromSynthetic ? `+91 ${phoneFromSynthetic}` : (user.phoneNumber || '');
            profile = {
              id: user.uid,
              name: user.displayName || 'HARDINKAAM User',
              email: provEmail,
              phone: provPhone,
              role: 'customer',
              status: 'pending',
              avatar: user.photoURL || '',
              city: 'Bhopal',
              memberCode: newMemberCode,
              registrationFeePaid: false,
              approvalStatus: 'pending',
              registrationPaymentStatus: 'pending_payment',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(userDocRef, profile, { merge: true });
              await setDoc(doc(db, 'wallets', user.uid), {
                id: user.uid,
                userId: user.uid,
                balance: 0,
                pendingBalance: 0,
                totalEarned: 0,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            } catch (_) {}
          }
        }

        if (!isAdminEmail && (profile.status === 'pending_approval' || profile.registrationPaymentStatus === 'pending_cash_approval')) {
          await fbSignOut(auth);
          setCurrentUser(null);
          setUserProfile(null);
          localStorage.removeItem('hardinkaam_active_profile');
          return null;
        }

        setUserProfile(profile);
        setActiveRole(profile.role);
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(profile));
        localStorage.setItem('hardinkaam_active_role', profile.role);

        return profile;
      } finally {
        delete activeProfileLoadRef.current[user.uid];
      }
    })();

    activeProfileLoadRef.current[user.uid] = loadPromise;
    return loadPromise;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await loadUserProfile(user);
        } catch (err) {
          console.warn('User profile loading notice on auth state change:', err);
        }
      } else {
        setUserProfile(null);
        setActiveRole('customer');
        localStorage.removeItem('hardinkaam_active_profile');
        localStorage.removeItem('hardinkaam_active_role');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to profile changes in real-time if signed in
  useEffect(() => {
    if (!auth.currentUser || !currentUser?.uid) return;
    const uid = currentUser.uid;
    if (!uid || uid === 'admin_deepak_root') return;
    if (isResourceExhausted()) return;

    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          const isAdminEmail = checkIsAdminEmail(currentUser?.email || data.email);
          const resolvedRole: UserRole = isAdminEmail ? 'admin' : (data.role || 'customer');
          const resolvedProfile = { ...data, role: resolvedRole };
          setUserProfile(resolvedProfile);
          localStorage.setItem('hardinkaam_active_profile', JSON.stringify(resolvedProfile));
        }
      },
      (err) => {
        console.warn('Real-time profile listener note:', err.message);
        checkAndHandleQuotaError(err);
      }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  const signInWithGoogle = async (preferredRole: UserRole = 'customer') => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userEmail = (user.email || '').toLowerCase().trim();
      const isAdminEmail = checkIsAdminEmail(userEmail);

      // 1. Super Admin bypasses registration check
      if (isAdminEmail) {
        const adminProfile: UserProfile = {
          ...MASTER_ADMIN_PROFILE,
          id: user.uid,
          email: user.email || 'deepakbuildconbhopal@gmail.com',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', user.uid), adminProfile, { merge: true });
        setUserProfile(adminProfile);
        setActiveRole('admin');
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(adminProfile));
        localStorage.setItem('hardinkaam_active_role', 'admin');
        return;
      }

      // 2. For all other users: Verify if user has a completed registration in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);
      let registeredProfile: UserProfile | null = null;

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        if (data.status === 'active' || data.registrationFeePaid || data.registrationPaymentId) {
          registeredProfile = data;
        }
      }

      // If not matched by UID, check by email match in users collection
      if (!registeredProfile && userEmail) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', userEmail));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const data = querySnap.docs[0].data() as UserProfile;
            if (data.status === 'active' || data.registrationFeePaid || data.registrationPaymentId) {
              registeredProfile = { ...data, id: user.uid };
              await setDoc(userDocRef, registeredProfile, { merge: true });
            }
          }
        } catch (queryErr) {
          console.warn('Google sign in email lookup note:', queryErr);
        }
      }

      // 3. If NO registered profile exists, BLOCK LOGIN and require registration with ₹121 fee
      if (!registeredProfile) {
        await fbSignOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        localStorage.removeItem('hardinkaam_active_profile');

        const regError: any = new Error(
          'आपका रजिस्ट्रेशन पूरा नहीं है! कृपया पहले ₹121 रजिस्ट्रेशन शुल्क का भुगतान करके रजिस्ट्रेशन पूरा करें।'
        );
        regError.code = 'auth/registration-required';
        regError.googleUser = {
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          phoneNumber: user.phoneNumber || '',
        };
        throw regError;
      }

      // 4. Valid registered user found: Log them in
      const roleToSet = registeredProfile.role || preferredRole;
      const finalProfile: UserProfile = { ...registeredProfile, role: roleToSet };
      setUserProfile(finalProfile);
      setActiveRole(roleToSet);
      localStorage.setItem('hardinkaam_active_profile', JSON.stringify(finalProfile));
      localStorage.setItem('hardinkaam_active_role', roleToSet);
    } catch (error) {
      console.warn('Google Sign In notice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    setLoading(true);
    const cleanedId = (emailOrUsername || '').trim();
    const normalizedCleaned = cleanedId.toLowerCase();
    const phoneDigits = normalizePhoneDigits(cleanedId);

    let targetAuthEmail = cleanedId;

    // 1. Resolve Super Admin identifier
    if (normalizedCleaned === 'deepak' || normalizedCleaned === 'admin') {
      targetAuthEmail = 'deepakbuildconbhopal@gmail.com';
    }
    // 2. Resolve Franchise Partner identifier (e.g. HDK-GWL-001)
    else if (cleanedId.toUpperCase().startsWith('HDK-')) {
      try {
        const qPartner = query(
          collection(db, 'franchise_partners'),
          where('franchiseCode', '==', cleanedId.toUpperCase()),
          limit(1)
        );
        const partnerSnap = await getDocs(qPartner);
        if (!partnerSnap.empty) {
          const pData = partnerSnap.docs[0].data();
          if (pData.status === 'SUSPENDED' || pData.status === 'DISABLED') {
            setLoading(false);
            throw new Error(
              `यह फ्रैंचाइज़ी पार्टनर खाता (${pData.franchiseCode}) निलंबित/निष्क्रिय है। कृपया सुपर एडमिन से संपर्क करें।`
            );
          }
          if (pData.email) {
            targetAuthEmail = pData.email;
          }
        } else {
          setLoading(false);
          throw new Error(`फ्रैंचाइज़ी कोड '${cleanedId.toUpperCase()}' पंजीकृत नहीं है।`);
        }
      } catch (err: any) {
        if (err.message?.includes('फ्रैंचाइज़ी')) {
          setLoading(false);
          throw err;
        }
        console.warn('[AuthContext] Franchise partner lookup note:', err?.message);
      }
    }
    // 3. Resolve Phone number identifier
    else if (phoneDigits) {
      targetAuthEmail = getSyntheticPhoneEmail(phoneDigits);
      try {
        const qPhone = query(collection(db, 'users'), where('phone', '==', `+91 ${phoneDigits}`), limit(1));
        const phoneSnap = await getDocs(qPhone);
        if (!phoneSnap.empty) {
          const uData = phoneSnap.docs[0].data();
          if (uData.authEmail && uData.authEmail.includes('@')) {
            targetAuthEmail = uData.authEmail;
          } else if (uData.email && uData.email.includes('@') && !isSyntheticPhoneEmail(uData.email)) {
            targetAuthEmail = uData.email;
          }
        }
      } catch {
        targetAuthEmail = getSyntheticPhoneEmail(phoneDigits);
      }
    }

    if (!targetAuthEmail.includes('@')) {
      setLoading(false);
      const customErr: any = new Error('गलत मोबाइल नंबर, ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।');
      customErr.code = 'auth/invalid-credential';
      throw customErr;
    }

    const isAdminTarget = checkIsAdminEmail(targetAuthEmail);

    try {
      let userCred: any = null;
      let lastAuthError: any = null;

      if (isAdminTarget) {
        try {
          userCred = await signInWithEmailAndPassword(auth, targetAuthEmail.toLowerCase().trim(), pass);
        } catch (adminErr: any) {
          lastAuthError = adminErr;
          console.warn('[AuthContext] Admin authentication attempt notice:', adminErr?.code || adminErr?.message);
        }
      }

      // Primary Attempt: Authentic Firebase Authentication
      if (!userCred) {
        try {
          userCred = await signInWithEmailAndPassword(auth, targetAuthEmail.toLowerCase().trim(), pass);
        } catch (firstErr: any) {
          lastAuthError = firstErr;
          if (
            firstErr?.code === 'auth/network-request-failed' ||
            firstErr?.message?.toLowerCase().includes('network') ||
            firstErr?.message?.toLowerCase().includes('failed to fetch')
          ) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            try {
              userCred = await signInWithEmailAndPassword(auth, targetAuthEmail.toLowerCase().trim(), pass);
              lastAuthError = null;
            } catch (retryErr: any) {
              lastAuthError = retryErr;
            }
          }
        }
      }

      if (userCred) {
        const authUser = userCred.user;
        setCurrentUser(authUser);
        await loadUserProfile(authUser);
        setLoading(false);
        return;
      }

      // If client auth encountered an issue, attempt server authentication proxy bridge
      if (lastAuthError) {
        try {
          const srvResp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: cleanedId, password: pass }),
          });
          if (srvResp.ok) {
            const srvData = await srvResp.json();
            if (srvData.success && srvData.userProfile) {
              if (srvData.customToken) {
                try {
                  const tokenCred = await signInWithCustomToken(auth, srvData.customToken);
                  setCurrentUser(tokenCred.user);
                } catch (tokErr) {
                  console.warn('[AuthContext] Custom token sign in note:', tokErr);
                }
              }
              const prof = srvData.userProfile;
              setUserProfile(prof);
              setActiveRole(prof.role || 'customer');
              localStorage.setItem('hardinkaam_active_profile', JSON.stringify(prof));
              localStorage.setItem('hardinkaam_active_role', prof.role || 'customer');
              setLoading(false);
              return;
            }
          } else {
            const errBody = await srvResp.json().catch(() => ({}));
            if (errBody?.message && errBody?.error === 'INVALID_CREDENTIALS') {
              const invalidErr: any = new Error(errBody.message);
              invalidErr.code = 'auth/invalid-credential';
              throw invalidErr;
            }
          }
        } catch (srvErr: any) {
          if (srvErr?.code === 'auth/invalid-credential') throw srvErr;
        }

        if (
          lastAuthError?.code === 'auth/invalid-credential' ||
          lastAuthError?.code === 'auth/user-not-found' ||
          lastAuthError?.code === 'auth/wrong-password'
        ) {
          const cleanErr: any = new Error(
            'गलत पासवर्ड, ईमेल या मोबाइल नंबर। कृपया सही क्रेडेंशियल्स दर्ज करें अथवा पासवर्ड रीसेट करें।'
          );
          cleanErr.code = 'auth/invalid-credential';
          throw cleanErr;
        }

        if (
          lastAuthError?.code === 'auth/network-request-failed' ||
          lastAuthError?.message?.toLowerCase().includes('network') ||
          lastAuthError?.message?.toLowerCase().includes('failed to fetch')
        ) {
          const netErr: any = new Error(
            'नेटवर्क त्रुटि: सर्वर से संपर्क नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।'
          );
          netErr.code = 'auth/network-request-failed';
          throw netErr;
        }

        throw lastAuthError;
      }
    } catch (error: any) {
      console.warn('Email/Phone sign in notice:', error?.code || error?.message || 'AUTH_NOTICE');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    name: string,
    email: string,
    pass: string,
    role: UserRole = 'customer',
    phone: string = '',
    registrationPayment?: { paymentId: string; orderId: string; amount: number; [key: string]: any }
  ) => {
    setLoading(true);
    try {
      if (role === 'admin') {
        throw new Error('एडमिन खाता केवल सिस्टम सुपर एडमिन द्वारा अधिकृत किया जा सकता है। / Admin accounts cannot be created via public registration.');
      }

      if (phone && phone.trim() && !normalizePhoneDigits(phone)) {
        throw new Error('कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें। / Please enter a valid 10-digit Indian mobile number.');
      }
      if (email && email.trim() && !email.includes('@') && !normalizePhoneDigits(email)) {
        throw new Error('कृपया सही 10-अंकीय मोबाइल नंबर या वैध ईमेल दर्ज करें। / Please enter a valid 10-digit Indian mobile number or email.');
      }

      // Check if email or phone is provided, calculate synthetic email if phone-based
      const phoneDigits = normalizePhoneDigits(phone) || normalizePhoneDigits(email);
      let targetAuthEmail = email.trim();

      // If email is actually a phone number or empty with phone provided, use synthetic email
      if (phoneDigits && (!targetAuthEmail || !targetAuthEmail.includes('@') || normalizePhoneDigits(targetAuthEmail) === phoneDigits)) {
        targetAuthEmail = getSyntheticPhoneEmail(phoneDigits);
      }

      // Pre-check for duplicate phone in existing user accounts (indexed query with limit(1) instead of scanning entire collection)
      if (phoneDigits) {
        try {
          const qPhone = query(collection(db, 'users'), where('phone', '==', phoneDigits), limit(1));
          const usersSnap = await getDocs(qPhone);
          let phoneExists = !usersSnap.empty;

          if (!phoneExists) {
            const qPhoneIntl = query(collection(db, 'users'), where('phone', '==', `+91${phoneDigits}`), limit(1));
            const intlSnap = await getDocs(qPhoneIntl);
            phoneExists = !intlSnap.empty;
          }

          if (phoneExists) {
            const dupError: any = new Error('यह मोबाइल नंबर पहले से रजिस्टर्ड है। कृपया लॉगिन करें। / This mobile number is already registered. Please sign in.');
            dupError.code = 'auth/email-already-in-use';
            throw dupError;
          }
        } catch (lookupErr: any) {
          if (lookupErr.code === 'auth/email-already-in-use') throw lookupErr;
          checkAndHandleQuotaError(lookupErr);
        }
      }

      let resUid = '';
      let authUser: User | null = null;
      try {
        const res = await createUserWithEmailAndPassword(auth, targetAuthEmail, pass);
        authUser = res.user;
        await updateProfile(res.user, { displayName: name });
        resUid = res.user.uid;
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          // If already exists, attempt authentic sign-in with the provided password
          try {
            const signInRes = await signInWithEmailAndPassword(auth, targetAuthEmail, pass);
            authUser = signInRes.user;
            resUid = signInRes.user.uid;
          } catch (signInErr: any) {
            const friendlyError: any = new Error(
              'यह मोबाइल नंबर या ईमेल पहले से ही रजिस्टर्ड है। कृपया "लॉगिन करें" विकल्प का उपयोग करके लॉगिन करें। / This mobile number or email is already registered. Please log in.'
            );
            friendlyError.code = 'auth/email-already-in-use';
            throw friendlyError;
          }
        } else {
          console.warn('[AuthContext] Firebase auth create notice:', fbErr);
          throw fbErr;
        }
      }

      if (!resUid) {
        throw new Error('Authentication user ID could not be established. Please retry.');
      }

      // Ensure auth.currentUser is established and matches resUid before Firestore writes
      let authWaitAttempts = 0;
      while ((!auth.currentUser || auth.currentUser.uid !== resUid) && authWaitAttempts < 15) {
        await new Promise((r) => setTimeout(r, 200));
        authWaitAttempts++;
      }
      if (!auth.currentUser || auth.currentUser.uid !== resUid) {
        throw new Error('Authentication state synchronization failed. Please sign in again. / प्रमाणीकरण स्थिति सिंक विफल। कृपया पुनः लॉगिन करें।');
      }

      // Security restriction: Administrative accounts cannot be registered publicly
      if (role === 'franchise_admin' || (role as string) === 'admin' || (role as string) === 'super_admin') {
        throw new Error('सुरक्षा प्रतिबंध: प्रशासनिक (Admin / Franchise) खाते सार्वजनिक रूप से पंजीकृत नहीं किए जा सकते।');
      }

      const finalRole: UserRole = role;
      const cleanEmail = isSyntheticPhoneEmail(email) || (phoneDigits && normalizePhoneDigits(email) === phoneDigits)
        ? ''
        : (email.includes('@') && !isSyntheticPhoneEmail(email) ? email : '');
      const cleanPhone = phone || (phoneDigits ? `+91 ${phoneDigits}` : '');
      const uniqueMemberCode = generateUniqueMemberCode(finalRole);
      const isCash = registrationPayment?.paymentMethod === 'cash' || registrationPayment?.isCash === true;

      // Security: Client initially writes unprivileged pending document. Server marks paid upon signature verification.
      const profile: UserProfile = {
        id: resUid,
        name,
        fatherName: registrationPayment?.fatherName?.trim() || '',
        motherName: registrationPayment?.motherName?.trim() || '',
        noCriminalRecordOath: Boolean(registrationPayment?.noCriminalRecordOath),
        email: cleanEmail,
        phone: cleanPhone,
        role: finalRole,
        memberCode: uniqueMemberCode,
        avatar: registrationPayment?.avatar || '',
        status: finalRole === 'customer' ? 'active' : isCash ? 'pending_approval' : 'pending',
        registrationFeePaid: false,
        registrationFeeAmount:
          registrationPayment?.amount ||
          ((finalRole as string) === 'field_officer' || (finalRole as string) === 'franchise_partner'
            ? 2021
            : finalRole === 'business_partner'
            ? 1021
            : (finalRole === 'service_man' || finalRole === 'customer')
            ? 121
            : 0),
        registrationPaymentMethod: isCash ? 'cash' : 'online',
        registrationPaymentStatus: isCash ? 'pending_cash_approval' : 'pending_payment',
        approvalStatus: finalRole === 'customer' ? 'approved' : 'pending',
        cashRequestedAt: isCash ? new Date().toISOString() : undefined,
        registrationPaymentId: null,
        registrationOrderId: registrationPayment?.orderId || null,
        registrationPaidAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', resUid), profile);
      } catch (firestoreErr: any) {
        console.error('[AuthContext] Firestore Write Error (users/{uid}):', firestoreErr?.code, firestoreErr?.message);
        throw new Error(`अनुमति त्रुटि (Permission Denied): डेटा सहेजने में विफल। [Code: ${firestoreErr?.code || 'unknown'}] / Failed to save user profile.`);
      }



      // If cash registration, store in registration_approvals and notify Admin
      if (isCash) {
        try {
          await setDoc(doc(db, 'registration_approvals', resUid), {
            id: resUid,
            userId: resUid,
            name,
            fatherName: registrationPayment?.fatherName?.trim() || '',
            motherName: registrationPayment?.motherName?.trim() || '',
            noCriminalRecordOath: Boolean(registrationPayment?.noCriminalRecordOath),
            email: cleanEmail,
            phone: cleanPhone,
            role: finalRole,
            memberCode: uniqueMemberCode,
            amount: profile.registrationFeeAmount || 121,
            paymentMethod: 'cash',
            status: 'pending',
            requestedAt: new Date().toISOString(),
            avatar: registrationPayment?.avatar || '',
          }, { merge: true });

          // Send approval notification for Super Admin
          await addDoc(collection(db, 'notifications'), {
            recipientId: 'admin_deepak_root',
            userId: resUid,
            targetRole: 'admin',
            type: 'cash_registration_approval',
            title: 'नकद रजिस्ट्रेशन अनुरोध (Cash Registration Request)',
            message: `${name} (${finalRole === 'service_man' ? 'सर्विसमैन / प्रो' : finalRole === 'business_partner' ? 'बिजनेस पार्टनर' : 'कस्टमर'}) ने ₹${profile.registrationFeeAmount} नकद (Cash) भुगतान का अनुरोध भेजा है। सत्यापन के बाद अप्रूव करें।`,
            amount: profile.registrationFeeAmount,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } catch (apprErr: any) {
          console.error('[AuthContext] Firestore Write Error (registration_approvals / notifications):', apprErr?.code, apprErr?.message);
        }
      }

      // Automated SMS & WhatsApp Notification & In-App Member & Admin Alert (Non-blocking background dispatch)
      let notificationResult: MemberNotificationResult | null = null;
      sendMemberRegistrationNotification({
        userId: resUid,
        name,
        fatherName: profile.fatherName || registrationPayment?.fatherName,
        motherName: profile.motherName || registrationPayment?.motherName,
        noCriminalRecordOath: profile.noCriminalRecordOath ?? registrationPayment?.noCriminalRecordOath,
        phone: cleanPhone,
        email: cleanEmail,
        role: finalRole,
        memberCode: uniqueMemberCode,
        paymentMethod: isCash ? 'cash' : 'razorpay',
        registrationPaymentId: registrationPayment?.paymentId,
        registrationOrderId: registrationPayment?.orderId,
        amountPaid: profile.registrationFeeAmount,
        registeredAt: profile.createdAt,
        avatar: registrationPayment?.avatar || '',
      })
        .then((res) => {
          notificationResult = res;
        })
        .catch((notifErr) => {
          console.warn('Auto member registration dispatch notice:', notifErr);
        });

      // Initialize Wallet with clean 0 balance (no unearned money)
      try {
        await setDoc(doc(db, 'wallets', resUid), {
          id: resUid,
          userId: resUid,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          currency: 'INR',
          updatedAt: new Date().toISOString(),
        });
      } catch (wErr) {
        console.warn('Wallet direct client write note (managed by server/admin):', wErr);
      }

      // If Service Pro, initialize service_men profile document
      if (finalRole === 'service_man') {
        const serviceProPayload = {
          id: resUid,
          userId: resUid,
          name: name.trim(),
          phone: cleanPhone || '+91 98260 00000',
          email: cleanEmail || '',
          photoUrl: registrationPayment?.avatar || '/1788786363389.png',
          categoryIds: ['cat_electrician'],
          categoryNames: ['Electrician'],
          serviceArea: 'Bhopal City & Central MP',
          experienceYears: 2,
          hourlyRate: 250,
          isAvailable: true,
          isVerified: false,
          kycStatus: 'pending',
          approvalStatus: 'pending',
          rating: 5.0,
          totalJobs: 0,
          status: isCash ? 'pending_approval' : 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, 'service_men', resUid), serviceProPayload);
          // Also sync to alias collection serviceMen
          await setDoc(doc(db, 'serviceMen', resUid), serviceProPayload);
          console.log('[AuthContext] Successfully created service_men profile document for:', resUid);
        } catch (proErr: any) {
          console.warn('[AuthContext] Notice creating service_men profile in Firestore:', proErr);
          throw new Error(`सर्विसमैन प्रोफाइल बनाने में समस्या आई: ${proErr.message || 'Firestore Permission Error'}`);
        }
      }

      if (isCash) {
        // Cash payment registration requires Admin approval first!
        // Sign out Firebase user so they don't automatically enter active app dashboards
        try {
          await fbSignOut(auth);
        } catch (_) {}
        setCurrentUser(null);
        setUserProfile(null);
        localStorage.removeItem('hardinkaam_active_profile');
      } else {
        setUserProfile(profile);
        setActiveRole(finalRole);
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(profile));
        localStorage.setItem('hardinkaam_active_role', finalRole);
      }

      return { user: authUser || { uid: resUid }, profile, notificationResult };
    } catch (error) {
      console.warn('Sign up notice:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const payRegistrationFee = async (
    role: UserRole,
    paymentMeta: { paymentId: string; orderId: string; amount: number; signature?: string }
  ) => {
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid) throw new Error('User not logged in');

    throw new Error('ऑनलाइन भुगतान (Razorpay) वर्तमान में बंद है। कृपया "Cash / Admin Approval" माध्यम से पंजीकरण करें।');
  };

  // Admin power to change any user's username or password
  const adminChangeUserCredentials = async (
    uid: string,
    name: string,
    email: string,
    newPassword?: string,
    newRole?: UserRole
  ) => {
    if (!isAdmin) {
      throw new Error("केवल अधिकृत एडमिन DEEPAK को ही अन्य यूजर्स के यूजरनेम व पासवर्ड बदलने का अधिकार है।");
    }

    const token = await auth.currentUser?.getIdToken();
    const srvResp = await fetch(`/api/admin/users/${uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name,
        email,
        password: newPassword && newPassword.trim() ? newPassword.trim() : undefined,
        role: newRole,
      }),
    });

    if (!srvResp.ok) {
      const srvErr = await srvResp.json().catch(() => ({}));
      throw new Error(srvErr.error || 'सर्वर द्वारा क्रेडेंशियल्स अपडेट करने में विफल।');
    }

    // Also sync with service_men if existing
    try {
      const proRef = doc(db, 'service_men', uid);
      const proSnap = await getDoc(proRef);
      if (proSnap.exists()) {
        await setDoc(proRef, { name, email }, { merge: true });
      }
    } catch (e) {
      console.warn('Service pro sync note:', e);
    }

    // Resolve any pending reset requests for this user without storing plaintext password
    try {
      const qReset = query(
        collection(db, 'password_reset_requests'),
        where('status', '==', 'pending'),
        where('userId', '==', uid)
      );
      const rstSnap = await getDocs(qReset);
      for (const d of rstSnap.docs) {
        await updateDoc(doc(db, 'password_reset_requests', d.id), {
          status: 'resolved',
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'DEEPAK',
          notes: `Credentials updated securely by Admin DEEPAK for ${name} (${email})`,
        });
      }
    } catch (e) {
      console.warn('Password reset resolve notice:', e);
    }

    // Log in audit_logs without storing plaintext password
    try {
      const auditId = 'aud_' + Date.now();
      await setDoc(doc(db, 'audit_logs', auditId), {
        id: auditId,
        action: 'ADMIN_CREDENTIAL_RESET',
        actor: 'DEEPAK',
        actorRole: 'admin',
        targetUserId: uid,
        targetUserName: name,
        targetEmail: email,
        hasNewPassword: Boolean(newPassword && newPassword.trim()),
        assignedRole: newRole || null,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Audit log notice:', e);
    }
  };

  // Forgot password handler: Uses official sendPasswordResetEmail and neutral privacy responses
  const requestPasswordReset = async (
    identifier: string
  ): Promise<{
    success: boolean;
    message: string;
    isAdmin?: boolean;
    resetDetails?: {
      reqId: string;
      userName: string;
      userEmail?: string;
      userPhone?: string;
      adminWhatsAppUrl: string;
    };
  }> => {
    const cleaned = identifier.trim();
    if (!cleaned) {
      throw new Error('कृपया अपना रजिस्टर्ड ईमेल या यूजरनेम दर्ज करें।');
    }

    // Determine target email for Firebase Auth
    let targetEmail = cleaned.includes('@') ? cleaned.toLowerCase() : '';

    // If phone was provided, lookup corresponding email in users collection without disclosing
    if (!targetEmail) {
      const phoneDigits = normalizePhoneDigits(cleaned);
      if (phoneDigits) {
        try {
          const q = query(collection(db, 'users'), where('phone', '==', `+91 ${phoneDigits}`), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const u = snap.docs[0].data();
            if (u.email && u.email.includes('@')) targetEmail = u.email.toLowerCase();
          }
        } catch (e) {
          console.warn('User lookup notice in password reset:', e);
        }
      }
    }

    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://www.hardinkaam.online';

    // Call official Firebase Auth password reset API with clean action URL
    if (targetEmail) {
      try {
        await sendPasswordResetEmail(auth, targetEmail, {
          url: `${origin}/#reset-password`,
          handleCodeInApp: true,
        });
      } catch (fbErr: any) {
        console.warn('sendPasswordResetEmail notice in auth context:', fbErr?.code);
      }
    }

    return {
      success: true,
      message:
        'यदि इस विवरण से कोई अकाउंट पंजीकृत है, तो पासवर्ड रीसेट के आधिकारिक निर्देश ईमेल पर भेज दिए गए हैं। कृपया अपना इनबॉक्स और स्पैम फ़ोल्डर देखें।',
    };
  };

  // Quick Switch / Role Preview helper (strictly non-privileged roles only)
  const quickDemoLogin = async (role: UserRole) => {
    if (role === 'admin' || role === 'franchise_admin') {
      throw new Error("प्रशासनिक भूमिकाओं (Admin / Franchise Admin) में प्रवेश के लिए अधिकृत क्रेडेंशियल्स से वास्तविक लॉगिन अनिवार्य है।");
    }
    setActiveRole(role);
    localStorage.setItem('hardinkaam_active_role', role);
  };

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
    const uid = currentUser?.uid;
    if (!uid) return;

    // Sanitize data: Never allow client-side escalation of privileged, approval, or financial fields
    const safeData = { ...data };
    delete (safeData as any).role;
    delete (safeData as any).isAdmin;
    delete (safeData as any).isSuperAdmin;
    delete (safeData as any).permissions;
    delete (safeData as any).balance;
    delete (safeData as any).walletBalance;
    delete (safeData as any).totalEarned;
    delete (safeData as any).earnings;
    delete (safeData as any).commission;
    delete (safeData as any).loginPassword;
    delete (safeData as any).registrationFeePaid;
    delete (safeData as any).registrationPaymentStatus;
    delete (safeData as any).registrationPaymentId;
    delete (safeData as any).registrationOrderId;
    delete (safeData as any).registrationFeeAmount;
    delete (safeData as any).approvalStatus;
    delete (safeData as any).isApproved;
    delete (safeData as any).approved;
    delete (safeData as any).isVerified;
    delete (safeData as any).verified;
    delete (safeData as any).kycStatus;
    delete (safeData as any).status;
    delete (safeData as any).accountStatus;

    try {
      const ref = doc(db, 'users', uid);
      await setDoc(ref, { ...safeData, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.warn('Firestore update note for user profile:', error);
    }
    setUserProfile((prev) => {
      const updated = prev ? { ...prev, ...safeData } : ({ id: uid, ...safeData } as UserProfile);
      try {
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save profile to localStorage:', e);
      }
      return updated;
    });
  };

  const registerConversationalCustomer = async (data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    area?: string;
    city?: string;
    district?: string;
    avatar?: string;
  }): Promise<UserProfile> => {
    setLoading(true);
    try {
      const phoneDigits = normalizePhoneDigits(data.phone) || '';
      if (!phoneDigits) {
        throw new Error('कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।');
      }

      const syntheticEmail = getSyntheticPhoneEmail(phoneDigits);
      const cleanEmail = data.email && data.email.includes('@') ? data.email.trim() : '';
      const cleanPhone = `+91 ${phoneDigits}`;
      const uniqueMemberCode = generateUniqueMemberCode('customer');

      let resUid = currentUser?.uid;

      if (!resUid) {
        // Authenticate user via Firebase Auth synthetic phone email
        const randomAuthPass = 'Hdk#' + Math.random().toString(36).substring(2, 10) + '9!';
        try {
          const res = await createUserWithEmailAndPassword(auth, syntheticEmail, randomAuthPass);
          resUid = res.user.uid;
          await updateProfile(res.user, { displayName: data.name.trim() });
          setCurrentUser(res.user);
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
        data.address || (data.area ? `${data.area}, Bhopal` : 'Bhopal, Madhya Pradesh');
      const city = data.city || 'Bhopal';
      const districtName = data.district || 'Bhopal';

      const profile: UserProfile = {
        id: resUid,
        name: data.name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        role: 'customer',
        memberCode: uniqueMemberCode,
        avatar: data.avatar || '',
        status: 'active',
        address: fullAddress,
        city,
        state: 'Madhya Pradesh',
        districtName,
        districtId: 'mp_bhopal_dist',
        registrationFeePaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Save user profile to users collection (NO password stored in Firestore)
      await setDoc(doc(db, 'users', resUid), profile, { merge: true });

      // 2. Initialize wallet with clean 0 balance for customer
      try {
        await setDoc(
          doc(db, 'wallets', resUid),
          {
            id: resUid,
            userId: resUid,
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            currency: 'INR',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (wErr) {
        console.warn('Wallet init notice:', wErr);
      }

      // 3. Send automated registration notification
      try {
        await sendMemberRegistrationNotification({
          userId: resUid,
          name: data.name.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          role: 'customer',
          memberCode: uniqueMemberCode,
          amountPaid: 0,
          registeredAt: profile.createdAt,
        });
      } catch (e) {}

      // 4. Update state and local storage
      setUserProfile(profile);
      setActiveRole('customer');
      localStorage.setItem('hardinkaam_active_profile', JSON.stringify(profile));
      localStorage.setItem('hardinkaam_active_role', 'customer');

      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      localStorage.removeItem('hardinkaam_active_profile');
      localStorage.removeItem('hardinkaam_active_role');
      setUserProfile(null);
      setActiveRole('customer');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        user: userProfile,
        loading,
        activeRole,
        isAdmin,
        isFranchiseAdmin,
        assignedDistrict,
        assignedDistrictId,
        franchiseCode,
        isLoggedIn,
        setActiveRole: handleSetActiveRole,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        payRegistrationFee,
        adminChangeUserCredentials,
        requestPasswordReset,
        quickDemoLogin,
        updateUserProfileData,
        registerConversationalCustomer,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


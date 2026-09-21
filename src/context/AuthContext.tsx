import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
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
    registrationPayment?: { paymentId: string; orderId: string; amount: number }
  ) => Promise<void>;
  payRegistrationFee: (
    role: UserRole,
    paymentMeta: { paymentId: string; orderId: string; amount: number }
  ) => Promise<void>;
  adminChangeUserCredentials: (uid: string, name: string, email: string, newPassword?: string, newRole?: UserRole) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<{ success: boolean; message: string; isAdmin?: boolean }>;
  quickDemoLogin: (role: UserRole) => Promise<void>;
  updateUserProfileData: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MASTER_ADMIN_PROFILE: UserProfile = {
  id: 'admin_deepak_root',
  name: 'DEEPAK',
  email: 'deepakbuildconbhopal@gmail.com',
  phone: '+91 98260 12345',
  role: 'admin',
  status: 'active',
  address: 'Deepak Buildcon Head Office, MP Nagar Zone 1, Bhopal',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  pincode: '462011',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('hardinkaam_active_profile');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    try {
      const storedRole = localStorage.getItem('hardinkaam_active_role');
      if (storedRole) return storedRole as UserRole;
    } catch (_) {}
    return 'customer';
  });

  const isAdmin = Boolean(
    userProfile?.role === 'admin' ||
    userProfile?.email?.toLowerCase() === 'deepakbuildconbhopal@gmail.com' ||
    (currentUser && currentUser.email?.toLowerCase() === 'deepakbuildconbhopal@gmail.com') ||
    localStorage.getItem('hardinkaam_admin_active') === 'true'
  );
  const isFranchiseAdmin = Boolean(userProfile?.role === 'franchise_admin');
  const assignedDistrict = userProfile?.assignedDistrictName || userProfile?.city || 'Bhopal';
  const assignedDistrictId = userProfile?.assignedDistrictId || (userProfile?.city?.toLowerCase() || 'bhopal');
  const franchiseCode = userProfile?.franchiseCode || '';
  const isLoggedIn = Boolean(currentUser || userProfile);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          const isAdminEmail = user.email?.toLowerCase() === 'deepakbuildconbhopal@gmail.com';

          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            const resolvedRole: UserRole = isAdminEmail ? 'admin' : (data.role || 'customer');
            const resolvedProfile: UserProfile = { ...data, role: resolvedRole };
            setUserProfile(resolvedProfile);
            setActiveRole(resolvedRole);
            if (isAdminEmail) {
              localStorage.setItem('hardinkaam_admin_active', 'true');
            }
            localStorage.setItem('hardinkaam_active_profile', JSON.stringify(resolvedProfile));
            localStorage.setItem('hardinkaam_active_role', resolvedRole);

            // If admin email document in firestore had non-admin role, update it
            if (isAdminEmail && data.role !== 'admin') {
              try {
                await setDoc(userDocRef, { role: 'admin' }, { merge: true });
              } catch (_) {}
            }
          } else {
            // New user registration
            const initialRole: UserRole = isAdminEmail ? 'admin' : 'customer';
            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || (isAdminEmail ? 'DEEPAK' : 'HARDINKAAM User'),
              email: user.email || '',
              phone: user.phoneNumber || '',
              role: initialRole,
              avatar: user.photoURL || '',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            setActiveRole(initialRole);
            if (isAdminEmail) {
              localStorage.setItem('hardinkaam_admin_active', 'true');
            }
            localStorage.setItem('hardinkaam_active_profile', JSON.stringify(newProfile));
            localStorage.setItem('hardinkaam_active_role', initialRole);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        // If not authenticated via Firebase auth, check if admin local session exists
        const adminFlag = localStorage.getItem('hardinkaam_admin_active');
        if (adminFlag === 'true') {
          setUserProfile(MASTER_ADMIN_PROFILE);
          setActiveRole('admin');
        } else {
          const stored = localStorage.getItem('hardinkaam_active_profile');
          if (stored) {
            try {
              const parsed: UserProfile = JSON.parse(stored);
              setUserProfile(parsed);
              if (parsed?.role) {
                setActiveRole(parsed.role);
                localStorage.setItem('hardinkaam_active_role', parsed.role);
              }
            } catch (_) {
              setUserProfile(null);
            }
          } else {
            setUserProfile(null);
            setActiveRole('customer');
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Listen to profile changes in real-time if signed in
  useEffect(() => {
    if (!currentUser && !userProfile?.id) return;
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid || uid === 'admin_deepak_root') return;

    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          const isAdminEmail = (currentUser?.email || data.email)?.toLowerCase() === 'deepakbuildconbhopal@gmail.com';
          const resolvedRole: UserRole = isAdminEmail ? 'admin' : (data.role || 'customer');
          const resolvedProfile = { ...data, role: resolvedRole };
          setUserProfile(resolvedProfile);
          localStorage.setItem('hardinkaam_active_profile', JSON.stringify(resolvedProfile));
        }
      },
      (err) => {
        console.warn('Real-time profile listener note:', err.message);
      }
    );
    return () => unsub();
  }, [currentUser, userProfile?.id]);

  const signInWithGoogle = async (preferredRole: UserRole = 'customer') => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);

      const isAdminEmail = user.email?.toLowerCase() === 'deepakbuildconbhopal@gmail.com';
      const roleToSet: UserRole = isAdminEmail ? 'admin' : preferredRole;

      if (!snap.exists()) {
        const newProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || (isAdminEmail ? 'DEEPAK' : 'HARDINKAAM User'),
          email: user.email || '',
          phone: user.phoneNumber || '',
          role: roleToSet,
          avatar: user.photoURL || '',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
        setActiveRole(roleToSet);
        if (isAdminEmail) {
          localStorage.setItem('hardinkaam_admin_active', 'true');
        }
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(newProfile));
        localStorage.setItem('hardinkaam_active_role', roleToSet);
      } else {
        const existing = snap.data() as UserProfile;
        const resolvedRole: UserRole = isAdminEmail ? 'admin' : (existing.role || roleToSet);
        const resolvedProfile = { ...existing, role: resolvedRole };
        setUserProfile(resolvedProfile);
        setActiveRole(resolvedRole);
        if (isAdminEmail) {
          localStorage.setItem('hardinkaam_admin_active', 'true');
          if (existing.role !== 'admin') {
            await setDoc(userDocRef, { role: 'admin' }, { merge: true });
          }
        }
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(resolvedProfile));
        localStorage.setItem('hardinkaam_active_role', resolvedRole);
      }
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (emailOrUsername: string, pass: string) => {
    setLoading(true);
    const cleanedId = emailOrUsername.trim();
    const isMasterAdminCandidate =
      cleanedId.toUpperCase() === 'DEEPAK' ||
      cleanedId.toLowerCase() === 'deepakbuildconbhopal@gmail.com';

    // 1. Check Master Admin Credentials strictly requested by User:
    // Admin Name: DEEPAK, Password: Bhopal2030$
    if (isMasterAdminCandidate) {
      if (pass === 'Bhopal2030$') {
        // Authenticated as Master Admin DEEPAK
        const adminProfile: UserProfile = {
          ...MASTER_ADMIN_PROFILE,
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(doc(db, 'users', 'admin_deepak_root'), adminProfile, { merge: true });
        } catch (e) {
          console.warn('Admin doc sync notice:', e);
        }
        setUserProfile(adminProfile);
        setActiveRole('admin');
        localStorage.setItem('hardinkaam_admin_active', 'true');
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(adminProfile));
        localStorage.setItem('hardinkaam_active_role', 'admin');
        setLoading(false);
        return;
      } else {
        setLoading(false);
        throw new Error("गलत एडमिन पासवर्ड! अधिकृत एडमिन 'DEEPAK' के लिए सही पासवर्ड दर्ज करें।");
      }
    }

    // 2. Check if this is a Franchise Partner logging in via Franchise Code (e.g. HDK-GWL-001) or Email
    try {
      const partnerSnap = await getDocs(collection(db, 'franchise_partners'));
      let matchedPartner: any = null;
      partnerSnap.forEach((d) => {
        const pData = d.data();
        const codeMatch = pData.franchiseCode && pData.franchiseCode.toUpperCase() === cleanedId.toUpperCase();
        const emailMatch = pData.email && pData.email.toLowerCase() === cleanedId.toLowerCase();
        const userMatch = pData.loginUsername && pData.loginUsername.toUpperCase() === cleanedId.toUpperCase();
        if (codeMatch || emailMatch || userMatch) {
          matchedPartner = { id: d.id, ...pData };
        }
      });

      if (matchedPartner) {
        // Enforce status check
        if (matchedPartner.status === 'SUSPENDED') {
          setLoading(false);
          throw new Error(
            `यह फ्रैंचाइज़ी पार्टनर खाता (${matchedPartner.franchiseCode} - ${matchedPartner.assignedDistrictName}) वर्तमान में निलंबित (SUSPENDED) है। कृपया सुपर एडमिन DEEPAK से संपर्क करें।`
          );
        }
        if (matchedPartner.status === 'DISABLED') {
          setLoading(false);
          throw new Error(
            `यह फ्रैंचाइज़ी पार्टनर खाता (${matchedPartner.franchiseCode}) निष्क्रिय (DISABLED) कर दिया गया है। कृपया सुपर एडमिन DEEPAK से संपर्क करें।`
          );
        }

        // Check password via Firebase Auth or stored/direct password
        let authenticated = false;
        try {
          // If password matches Firebase Auth user for this email
          await signInWithEmailAndPassword(auth, matchedPartner.email, pass);
          authenticated = true;
        } catch (authErr) {
          // Check if password matches custom admin password or partner pass
          if (matchedPartner.loginPassword && matchedPartner.loginPassword === pass) {
            authenticated = true;
          } else if (pass.length >= 6) {
            // Check in users collection
            const uRef = doc(db, 'users', matchedPartner.id);
            const uSnap = await getDoc(uRef);
            if (uSnap.exists() && uSnap.data().loginPassword === pass) {
              authenticated = true;
            }
          }
        }

        if (authenticated) {
          const profile: UserProfile = {
            id: matchedPartner.id,
            name: matchedPartner.name,
            email: matchedPartner.email,
            phone: matchedPartner.phone,
            role: 'franchise_admin',
            status: matchedPartner.status === 'ACTIVE' ? 'active' : 'suspended',
            city: matchedPartner.assignedDistrictName,
            state: matchedPartner.stateName,
            districtId: matchedPartner.assignedDistrictId,
            districtName: matchedPartner.assignedDistrictName,
            assignedDistrictId: matchedPartner.assignedDistrictId,
            assignedDistrictName: matchedPartner.assignedDistrictName,
            franchiseCode: matchedPartner.franchiseCode,
            franchisePartnerId: matchedPartner.id,
            updatedAt: new Date().toISOString(),
          };

          // Update last login in Firestore
          try {
            await updateDoc(doc(db, 'franchise_partners', matchedPartner.id), {
              lastLoginAt: new Date().toISOString(),
            });
          } catch (e) {}

          setUserProfile(profile);
          setActiveRole('franchise_admin');
          localStorage.removeItem('hardinkaam_admin_active');
          localStorage.setItem('hardinkaam_active_profile', JSON.stringify(profile));
          localStorage.setItem('hardinkaam_active_role', 'franchise_admin');
          setLoading(false);
          return;
        } else {
          setLoading(false);
          throw new Error(
            `फ्रैंचाइज़ी पार्टनर (${matchedPartner.franchiseCode}) के लिए पासवर्ड गलत है। सही पासवर्ड दर्ज करें।`
          );
        }
      }
    } catch (franchiseLookupErr: any) {
      if (franchiseLookupErr.message?.includes('फ्रैंचाइज़ी') || franchiseLookupErr.message?.includes('SUSPENDED') || franchiseLookupErr.message?.includes('DISABLED')) {
        setLoading(false);
        throw franchiseLookupErr;
      }
      console.warn('Franchise partner lookup notice:', franchiseLookupErr);
    }

    // 3. Check if a user's password or username was modified by Admin in Firestore
    try {
      const usersRef = collection(db, 'users');
      // Look up by email or phone or name or franchiseCode
      const snap = await getDocs(usersRef);
      let matchedUser: any = null;
      snap.forEach((d) => {
        const data = d.data();
        if (
          (data.email && data.email.toLowerCase() === cleanedId.toLowerCase()) ||
          (data.name && data.name.toLowerCase() === cleanedId.toLowerCase()) ||
          (data.phone && data.phone === cleanedId) ||
          (data.franchiseCode && data.franchiseCode.toUpperCase() === cleanedId.toUpperCase())
        ) {
          matchedUser = { uid: d.id, ...data };
        }
      });

      if (matchedUser) {
        // If password matches the admin-updated password or saved password
        if (matchedUser.loginPassword && matchedUser.loginPassword === pass) {
          const profile: UserProfile = {
            id: matchedUser.uid,
            name: matchedUser.name || 'HARDINKAAM User',
            email: matchedUser.email || '',
            phone: matchedUser.phone || '',
            role: matchedUser.role || 'customer',
            status: matchedUser.status || 'active',
            avatar: matchedUser.avatar || '',
            address: matchedUser.address || '',
            city: matchedUser.city || 'Bhopal',
            assignedDistrictId: matchedUser.assignedDistrictId || matchedUser.districtId,
            assignedDistrictName: matchedUser.assignedDistrictName || matchedUser.districtName,
            franchiseCode: matchedUser.franchiseCode,
            franchisePartnerId: matchedUser.franchisePartnerId,
          };
          setUserProfile(profile);
          setActiveRole(profile.role);
          localStorage.setItem('hardinkaam_active_profile', JSON.stringify(profile));
          localStorage.setItem('hardinkaam_active_role', profile.role);
          localStorage.removeItem('hardinkaam_admin_active');
          setLoading(false);
          return;
        }
      }
    } catch (customLookupErr) {
      console.warn('Custom credential lookup note:', customLookupErr);
    }

    // 4. Fallback to Firebase standard Email/Password authentication
    try {
      await signInWithEmailAndPassword(auth, cleanedId, pass);
    } catch (error: any) {
      console.error('Email sign in failed:', error);
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
    registrationPayment?: { paymentId: string; orderId: string; amount: number }
  ) => {
    setLoading(true);
    try {
      const isTryingAdmin = role === 'admin' || name.toUpperCase() === 'DEEPAK' || email.toLowerCase() === 'deepakbuildconbhopal@gmail.com';
      if (isTryingAdmin && pass !== 'Bhopal2030$') {
        throw new Error("एडमिन अकाउंट केवल अधिकृत क्रेडेंशियल्स के साथ ही रजिस्टर किया जा सकता है।");
      }

      let resUid = 'user_' + Date.now();
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(res.user, { displayName: name });
        resUid = res.user.uid;
      } catch (fbErr: any) {
        console.warn('Firebase auth create warning, proceeding with direct profile:', fbErr.message);
      }

      const finalRole: UserRole = isTryingAdmin ? 'admin' : role;
      const profile: UserProfile = {
        id: resUid,
        name,
        email,
        phone,
        role: finalRole,
        status: 'active',
        registrationFeePaid: isTryingAdmin ? true : Boolean(registrationPayment?.paymentId),
        registrationFeeAmount: registrationPayment?.amount || (finalRole === 'business_partner' ? 1021 : (finalRole === 'admin' ? 0 : 121)),
        registrationPaymentId: registrationPayment?.paymentId,
        registrationOrderId: registrationPayment?.orderId,
        registrationPaidAt: registrationPayment ? new Date().toISOString() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', resUid), profile);

      // Initialize Wallet
      try {
        await setDoc(doc(db, 'wallets', resUid), {
          id: resUid,
          userId: resUid,
          balance: finalRole === 'service_man' ? 500 : 200,
          pendingBalance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          updatedAt: new Date().toISOString(),
        });
      } catch (wErr) {
        console.warn('Wallet init note:', wErr);
      }

      // If Service Pro, initialize service_men profile document
      if (finalRole === 'service_man') {
        try {
          await setDoc(doc(db, 'service_men', resUid), {
            id: resUid,
            userId: resUid,
            name,
            phone: phone || '+91 98260 00000',
            email,
            photoUrl: '/1788786363389.png',
            categoryIds: ['cat_electrician'],
            categoryNames: ['Electrician'],
            serviceArea: 'Bhopal City & Central MP',
            experienceYears: 2,
            hourlyRate: 250,
            isAvailable: true,
            isVerified: Boolean(registrationPayment?.paymentId),
            kycStatus: 'pending',
            rating: 5.0,
            totalJobs: 0,
            createdAt: new Date().toISOString(),
          });
        } catch (proErr) {
          console.warn('Service pro document init note:', proErr);
        }
      }

      setUserProfile(profile);
      setActiveRole(finalRole);
      localStorage.setItem('hardinkaam_active_profile', JSON.stringify(profile));
      localStorage.setItem('hardinkaam_active_role', finalRole);
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const payRegistrationFee = async (
    role: UserRole,
    paymentMeta: { paymentId: string; orderId: string; amount: number }
  ) => {
    const uid = currentUser?.uid || userProfile?.id;
    if (!uid) throw new Error('User not logged in');

    const updates: Partial<UserProfile> = {
      registrationFeePaid: true,
      registrationFeeAmount: paymentMeta.amount,
      registrationPaymentId: paymentMeta.paymentId,
      registrationOrderId: paymentMeta.orderId,
      registrationPaidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
      if (role === 'service_man') {
        await setDoc(doc(db, 'service_men', uid), { isVerified: true, updatedAt: new Date().toISOString() }, { merge: true });
      }
    } catch (e) {
      console.warn('Firestore update note for registration payment:', e);
    }

    setUserProfile((prev) => {
      const next = prev ? { ...prev, ...updates } : ({ id: uid, role, ...updates } as UserProfile);
      localStorage.setItem('hardinkaam_active_profile', JSON.stringify(next));
      return next;
    });
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
      throw new Error("केवल एडमिन DEEPAK को ही अन्य यूजर्स के यूजरनेम व पासवर्ड बदलने का अधिकार है।");
    }

    const updates: any = {
      name,
      email,
      resetRequested: false,
      updatedAt: new Date().toISOString(),
    };
    if (newPassword && newPassword.trim()) {
      updates.loginPassword = newPassword.trim();
    }
    if (newRole) {
      updates.role = newRole;
    }

    await setDoc(doc(db, 'users', uid), updates, { merge: true });

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

    // Resolve any pending reset requests for this user
    try {
      const rstSnap = await getDocs(collection(db, 'password_reset_requests'));
      rstSnap.forEach(async (d) => {
        const rData = d.data();
        if (
          rData.status === 'pending' &&
          (rData.userId === uid ||
           (rData.userEmail && rData.userEmail.toLowerCase() === email.toLowerCase()) ||
           (rData.emailOrUsername && rData.emailOrUsername.toLowerCase() === email.toLowerCase()) ||
           (rData.emailOrUsername && rData.emailOrUsername.toLowerCase() === name.toLowerCase()))
        ) {
          await updateDoc(doc(db, 'password_reset_requests', d.id), {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            resolvedBy: 'DEEPAK',
            newAssignedPassword: newPassword?.trim() || '',
            notes: `Credentials updated by Admin DEEPAK for ${name} (${email})`,
          });
        }
      });
    } catch (e) {
      console.warn('Password reset resolve notice:', e);
    }

    // Log in audit_logs
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

  // Forgot password handler
  const requestPasswordReset = async (identifier: string): Promise<{ success: boolean; message: string; isAdmin?: boolean }> => {
    const cleaned = identifier.trim();
    if (!cleaned) {
      throw new Error('कृपया अपना रजिस्टर्ड ईमेल या यूजरनेम दर्ज करें।');
    }

    if (cleaned.toUpperCase() === 'DEEPAK' || cleaned.toLowerCase() === 'deepakbuildconbhopal@gmail.com') {
      return {
        success: true,
        isAdmin: true,
        message:
          "एडमिन DEEPAK के लिए अधिकृत पासवर्ड रिकवरी: कृपया अपने रजिस्टर्ड ईमेल deepakbuildconbhopal@gmail.com या अधिकृत मोबाइल +91 98260 12345 पर प्राप्त सुरक्षा कोड का उपयोग करें।",
      };
    }

    // 1. Search if this matches any user in Firestore
    let matchedUser: any = null;
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((d) => {
        const u = d.data();
        if (
          (u.email && u.email.toLowerCase() === cleaned.toLowerCase()) ||
          (u.name && u.name.toLowerCase() === cleaned.toLowerCase()) ||
          (u.phone && u.phone === cleaned)
        ) {
          matchedUser = { uid: d.id, ...u };
        }
      });
    } catch (e) {
      console.warn('User lookup notice in password reset:', e);
    }

    // 2. Record password reset request in Firestore so Admin can view & resolve it
    const reqId = 'rst_' + Date.now();
    const effectiveEmail = matchedUser?.email || (cleaned.includes('@') ? cleaned : '');
    try {
      await setDoc(doc(db, 'password_reset_requests', reqId), {
        id: reqId,
        emailOrUsername: cleaned,
        userId: matchedUser?.uid || null,
        userName: matchedUser?.name || cleaned,
        userEmail: effectiveEmail,
        userPhone: matchedUser?.phone || null,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      });

      // Mark user document with pending reset flag
      if (matchedUser?.uid) {
        await updateDoc(doc(db, 'users', matchedUser.uid), {
          resetRequested: true,
          resetRequestedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn('Password reset request logging notice:', err);
    }

    // 3. Attempt Firebase auth password reset email if email is available
    if (effectiveEmail) {
      try {
        await sendPasswordResetEmail(auth, effectiveEmail);
        return {
          success: true,
          message: `पासवर्ड रीसेट लिंक आपके ईमेल (${effectiveEmail}) पर भेज दिया गया है। कृपया अपना इनबॉक्स व स्पैम फोल्डर देखें। साथ ही एडमिन DEEPAK के पास भी आपका अनुरोध दर्ज हो गया है।`,
        };
      } catch (fbErr: any) {
        console.warn('Firebase reset email notice:', fbErr);
      }
    }

    return {
      success: true,
      message: `पासवर्ड रीसेट अनुरोध सफलतापूर्वक दर्ज कर लिया गया है! मुख्य प्रशासक DEEPAK (कंट्रोल रूम) के पास आपका अनुरोध पहुंच चुका है। एडमिन द्वारा आपके संपर्क (${effectiveEmail || cleaned}) पर नया पासवर्ड शीघ्र जारी किया जाएगा।`,
    };
  };

  // Quick Switch / Demo Login helper
  const quickDemoLogin = async (role: UserRole) => {
    if (role === 'admin') {
      setUserProfile(MASTER_ADMIN_PROFILE);
      setActiveRole('admin');
      localStorage.setItem('hardinkaam_admin_active', 'true');
      localStorage.setItem('hardinkaam_active_profile', JSON.stringify(MASTER_ADMIN_PROFILE));
      localStorage.setItem('hardinkaam_active_role', 'admin');
      return;
    }
    if (role === 'franchise_admin') {
      const demoFranchiseProfile: UserProfile = {
        id: 'franchise_gwalior_demo',
        name: 'Gwalior District Franchise Partner',
        email: 'gwalior.franchise@hardinkaam.in',
        phone: '+91 98270 54321',
        role: 'franchise_admin',
        status: 'active',
        city: 'Gwalior',
        state: 'Madhya Pradesh',
        districtId: 'gwalior',
        districtName: 'Gwalior',
        assignedDistrictId: 'gwalior',
        assignedDistrictName: 'Gwalior',
        franchiseCode: 'HDK-GWL-001',
        franchisePartnerId: 'franchise_gwalior_demo',
        address: 'City Center Mall Road, Gwalior',
        updatedAt: new Date().toISOString(),
      };
      setUserProfile(demoFranchiseProfile);
      setActiveRole('franchise_admin');
      localStorage.removeItem('hardinkaam_admin_active');
      localStorage.setItem('hardinkaam_active_profile', JSON.stringify(demoFranchiseProfile));
      localStorage.setItem('hardinkaam_active_role', 'franchise_admin');
      return;
    }
    setActiveRole(role);
    localStorage.setItem('hardinkaam_active_role', role);
    if (currentUser) {
      const updated: Partial<UserProfile> = { role };
      try {
        await setDoc(doc(db, 'users', currentUser.uid), updated, { merge: true });
        setUserProfile((prev) => (prev ? { ...prev, role } : null));
      } catch (err) {
        console.warn('Could not update role in Firestore:', err);
      }
    }
  };

  const updateUserProfileData = async (data: Partial<UserProfile>) => {
    const uid = currentUser?.uid || userProfile?.id || (isAdmin ? 'admin_deepak_root' : 'user_active');
    if (!uid) return;
    try {
      const ref = doc(db, 'users', uid);
      await setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.warn('Firestore update note for user profile:', error);
    }
    setUserProfile((prev) => {
      const updated = prev ? { ...prev, ...data } : ({ id: uid, ...data } as UserProfile);
      try {
        localStorage.setItem('hardinkaam_active_profile', JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save profile to localStorage:', e);
      }
      return updated;
    });
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      localStorage.removeItem('hardinkaam_admin_active');
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


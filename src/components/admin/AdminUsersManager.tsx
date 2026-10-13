import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  CheckCircle2,
  X,
  XCircle,
  UserPlus,
  RefreshCw,
  User,
  Mail,
  Phone,
  Clock,
  AlertCircle,
  Share2,
  Wrench,
  Briefcase,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Banknote,
  PhoneCall,
  MessageSquare,
  Wallet,
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, setDoc, addDoc, query, limit, where } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { UserRole, PasswordResetRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';
import { ManualPasswordResetUtility } from './ManualPasswordResetUtility';
import { sendMemberRegistrationNotification } from '../../services/memberNotificationService';
import { PhotoCaptureWidget } from '../common/PhotoCaptureWidget';

export const AdminUsersManager: React.FC = () => {
  const { adminChangeUserCredentials } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [activeTab, setActiveTab] = useState<
    'all' | 'members_ledger' | 'pending_approvals' | 'manual_reset_utility' | 'reset_requests' | 'customers' | 'service_pros' | 'partners' | 'admins'
  >('all');
  const [selectedUserForUtility, setSelectedUserForUtility] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const [cashApprovals, setCashApprovals] = useState<any[]>([]);
  const [approvingCashId, setApprovingCashId] = useState<string | null>(null);
  const [rejectingCashId, setRejectingCashId] = useState<string | null>(null);
  const [cashFilter, setCashFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Spark Quota Optimization: Client-side pagination to handle users without lagging or unbounded DOM trees
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Edit user credential modal state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('customer');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // New User Creation Modal
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('customer');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  // Revealed password map for table rows (allows Admin to inspect stored password if needed)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [zeroingDeepakWallet, setZeroingDeepakWallet] = useState(false);

  const handleZeroDeepakWallet = async () => {
    if (!window.confirm("क्या आप वाकई दीपक (Deepak) का वॉलेट बैलेंस शून्य (Zero) करना चाहते हैं?")) return;
    setZeroingDeepakWallet(true);
    try {
      const matchedUsers = users.filter(u => 
        (u.name && u.name.toLowerCase().includes('deepak')) || 
        (u.email && u.email.toLowerCase().includes('deepak'))
      );

      for (const u of matchedUsers) {
        const uid = u.uid || u.id;
        try {
          await updateDoc(doc(db, 'users', uid), {
            walletBalance: 0,
            wallet: 0,
            balance: 0,
            totalEarned: 0,
            pendingBalance: 0,
            updatedAt: new Date().toISOString()
          });
        } catch (_) {}

        try {
          await setDoc(doc(db, 'wallets', uid), {
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            totalWithdrawn: 0,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (_) {}
      }

      const walletsSnap = await getDocs(query(collection(db, 'wallets'), limit(50)));
      for (const wDoc of walletsSnap.docs) {
        const data = wDoc.data();
        if (wDoc.id.toLowerCase().includes('deepak') || (data.userId && String(data.userId).toLowerCase().includes('deepak'))) {
          await updateDoc(doc(db, 'wallets', wDoc.id), {
            balance: 0,
            pendingBalance: 0,
            totalEarned: 0,
            updatedAt: new Date().toISOString()
          });
        }
      }

      setStatusMsg({
        type: 'success',
        text: 'सफलतापूर्वक दीपक का वॉलेट बैलेंस शून्य कर दिया गया है!'
      });
      fetchUsersAndRequests();
    } catch (err: any) {
      checkAndHandleQuotaError(err);
      setStatusMsg({
        type: 'error',
        text: 'वॉलेट शून्य करने में त्रुटि: ' + (err.message || 'Error')
      });
    } finally {
      setZeroingDeepakWallet(false);
    }
  };

  const generateSecurePassword = () => {
    const prefixes = ['Kaam', 'Seva', 'Hardin', 'Bhopal', 'Mitra', 'Pro'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['#', '@', '$', '!'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    return `${prefix}${symbol}${num}`;
  };

  const fetchUsersAndRequests = async () => {
    if (isResourceExhausted()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Users (capped at 50 to protect Spark tier daily read quotas)
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
      const list: any[] = [];
      usersSnap.forEach((d) => list.push({ uid: d.id, ...d.data() }));
      setUsers(list);

      // 2. Fetch Password Reset Requests (capped at 30)
      const rstSnap = await getDocs(query(collection(db, 'password_reset_requests'), limit(30)));
      const reqList: PasswordResetRequest[] = [];
      rstSnap.forEach((d) => reqList.push({ id: d.id, ...d.data() } as PasswordResetRequest));
      reqList.sort(
        (a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
      );
      setResetRequests(reqList);

      // 3. Fetch Cash Registration Approvals (capped at 50)
      const apprSnap = await getDocs(query(collection(db, 'registration_approvals'), limit(50)));
      const apprList: any[] = [];
      apprSnap.forEach((d) => apprList.push({ id: d.id, ...d.data() }));

      // Also merge any users with pending cash approval who might not be in registration_approvals
      list.forEach((u) => {
        if (
          (u.status === 'pending_approval' || u.registrationPaymentMethod === 'cash' || u.registrationPaymentStatus === 'pending_cash_approval') &&
          !apprList.some((a) => a.userId === u.uid || a.id === u.uid)
        ) {
          apprList.push({
            id: u.uid,
            userId: u.uid,
            name: u.name || 'Anonymous User',
            email: u.email || '',
            phone: u.phone || '',
            role: u.role || 'customer',
            amount: u.registrationFeeAmount || (u.role === 'business_partner' ? 1021 : 121),
            memberCode: u.memberCode || '',
            status: u.status === 'active' ? 'approved' : 'pending',
            paymentMethod: 'cash',
            requestedAt: u.cashRequestedAt || u.createdAt || new Date().toISOString(),
            avatar: u.avatar || '',
          });
        }
      });

      apprList.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());
      setCashApprovals(apprList);
    } catch (err) {
      console.warn('Users/Reset/Cash approvals fetch notice:', err);
      checkAndHandleQuotaError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRequests();
  }, []);

  const pendingResetRequests = useMemo(
    () => resetRequests.filter((r) => r.status === 'pending'),
    [resetRequests]
  );

  const openEditModal = (user: any, suggestedPassword?: string) => {
    setEditingUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditAvatar(user.avatar || '');
    setEditPassword(suggestedPassword || '');
    setEditRole(user.role || 'customer');
    setShowPassword(true);
    setStatusMsg(null);
  };

  const openResetRequestForUser = (req: PasswordResetRequest) => {
    // Look up matched user
    const matched = users.find(
      (u) =>
        (req.userId && u.uid === req.userId) ||
        (req.userEmail && u.email?.toLowerCase() === req.userEmail.toLowerCase()) ||
        (u.email && u.email.toLowerCase() === req.emailOrUsername.toLowerCase()) ||
        (u.name && u.name.toLowerCase() === req.emailOrUsername.toLowerCase()) ||
        (u.phone && u.phone === req.emailOrUsername)
    );

    if (matched) {
      setSelectedUserForUtility(matched);
      setActiveTab('manual_reset_utility');
    } else {
      // User is not in local list, construct temporary object and pass to utility
      const tempUser = {
        uid: req.userId || 'usr_' + Date.now(),
        name: req.userName || req.emailOrUsername,
        email: req.userEmail || (req.emailOrUsername.includes('@') ? req.emailOrUsername : ''),
        phone: req.userPhone || (req.emailOrUsername.match(/^[0-9+]+$/) ? req.emailOrUsername : ''),
        role: 'customer',
      };
      setSelectedUserForUtility(tempUser);
      setActiveTab('manual_reset_utility');
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingCredentials(true);
    setStatusMsg(null);

    try {
      await adminChangeUserCredentials(
        editingUser.uid,
        editName.trim(),
        editEmail.trim(),
        editPassword.trim(),
        editRole
      );

      // If phone or avatar was changed, update doc
      try {
        await updateDoc(doc(db, 'users', editingUser.uid), {
          phone: editPhone.trim(),
          avatar: editAvatar || '',
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('User doc extra fields update note:', e);
      }

      setStatusMsg({
        type: 'success',
        text: `सफलतापूर्वक अपडेट किया गया! ${editName} के क्रेडेंशियल्स व फोटो तुरंत सक्रिय हो गए हैं।`,
      });

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === editingUser.uid
            ? {
                ...u,
                name: editName.trim(),
                email: editEmail.trim(),
                phone: editPhone.trim(),
                avatar: editAvatar || '',
                role: editRole,
                resetRequested: false,
              }
            : u
        )
      );

      // Update resetRequests locally
      setResetRequests((prev) =>
        prev.map((r) =>
          r.userId === editingUser.uid ||
          (r.userEmail && r.userEmail.toLowerCase() === editEmail.toLowerCase()) ||
          (r.emailOrUsername && r.emailOrUsername.toLowerCase() === editEmail.toLowerCase()) ||
          (r.emailOrUsername && r.emailOrUsername.toLowerCase() === editName.toLowerCase())
            ? {
                ...r,
                status: 'resolved',
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'DEEPAK',
                newAssignedPassword: editPassword.trim(),
              }
            : r
        )
      );

      setTimeout(() => {
        setEditingUser(null);
        setStatusMsg(null);
      }, 2000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'क्रेडेंशियल्स अपडेट करने में त्रुटि आई।',
      });
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setCreateUserError('कृपया नाम, ईमेल और पासवर्ड भरें।');
      return;
    }
    setCreatingUser(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const srvResp = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim(),
          role: newRole,
          password: newPassword.trim(),
        }),
      });

      if (!srvResp.ok) {
        const errJson = await srvResp.json().catch(() => ({}));
        throw new Error(errJson.error || 'सर्वर पर यूजर बनाने में विफल।');
      }

      const resData = await srvResp.json();
      const createdUser = resData.user || {
        id: 'usr_' + Date.now(),
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        role: newRole,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [createdUser, ...prev]);
      setIsCreateUserModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setStatusMsg({
        type: 'success',
        text: `यूजर ${newName} सफलतापूर्वक जोड़ा गया! (Firebase Auth द्वारा सुरक्षित)`,
      });
    } catch (e: any) {
      console.error('Create user error:', e);
      setCreateUserError('यूजर जोड़ने में त्रुटि: ' + (e?.message || 'Error saving user'));
    } finally {
      setCreatingUser(false);
    }
  };

  const copyCredentials = (name: string, email: string, pass: string, phone?: string) => {
    const text = `HARDINKAAM Login Credentials:\n👤 Name / Username: ${name}\n📧 Email: ${email}${phone ? `\n📱 Mobile: ${phone}` : ''}\n🔑 Password: ${pass}\n🌐 Sign In at: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedStatus('copied');
    setTimeout(() => setCopiedStatus(null), 2500);
  };

  const shareViaWhatsApp = (name: string, email: string, pass: string, phone?: string) => {
    const cleanPhone = phone?.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `नमस्ते ${name},\n\nHARDINKAAM में आपके नए लॉगिन क्रेडेंशियल्स:\n👤 यूजरनेम / नाम: ${name}\n📧 ईमेल: ${email}\n🔑 पासवर्ड: ${pass}\n\n🌐 लॉगिन करें: ${window.location.origin}`
    );
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(targetUrl, '_blank');
  };

  const handleApproveCashRegistration = async (req: any) => {
    const targetUid = req.userId || req.id;
    setApprovingCashId(targetUid);
    try {
      const nowIso = new Date().toISOString();

      // 1. Update users document in Firestore to active and approved
      await updateDoc(doc(db, 'users', targetUid), {
        status: 'active',
        approvalStatus: 'approved',
        registrationFeePaid: true,
        registrationPaymentStatus: 'approved',
        approvedAt: nowIso,
        approvedBy: 'DEEPAK (Super Admin)',
        updatedAt: nowIso,
      });

      // 2. Update registration_approvals document
      await setDoc(doc(db, 'registration_approvals', targetUid), {
        ...req,
        status: 'approved',
        approvedAt: nowIso,
        approvedBy: 'DEEPAK (Super Admin)',
        updatedAt: nowIso,
      }, { merge: true });

      // 3. If service_man, update service_men document to active
      if (req.role === 'service_man') {
        try {
          await updateDoc(doc(db, 'service_men', targetUid), {
            status: 'active',
            approvalStatus: 'approved',
            isVerified: true,
            updatedAt: nowIso,
          });
          await updateDoc(doc(db, 'serviceMen', targetUid), {
            status: 'active',
            approvalStatus: 'approved',
            isVerified: true,
            updatedAt: nowIso,
          });
        } catch (_) {}
      }

      // 4. If business_partner, update business_partners document
      if (req.role === 'business_partner') {
        try {
          const bpSnap = await getDocs(query(collection(db, 'business_partners'), where('userId', '==', targetUid)));
          bpSnap.forEach(async (bpDoc) => {
            await updateDoc(doc(db, 'business_partners', bpDoc.id), {
              status: 'active',
              kycStatus: 'verified',
              updatedAt: nowIso,
            });
          });
        } catch (_) {}
      }

      // 5. Initialize wallet with clean 0 balance upon registration approval (no unearned money)
      try {
        await setDoc(doc(db, 'wallets', targetUid), {
          id: targetUid,
          userId: targetUid,
          balance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          currency: 'INR',
          updatedAt: nowIso,
        }, { merge: true });
      } catch (_) {}

      // 6. Send notification to user
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: targetUid,
          userId: targetUid,
          targetRole: req.role,
          type: 'registration_approved',
          title: 'रजिस्ट्रेशन स्वीकृत! (Registration Approved)',
          message: `बधाई हो ${req.name}! आपका ₹${req.amount || 121} नकद भुगतान एडमिन द्वारा सत्यापित कर लिया गया है। आपका खाता सक्रिय हो गया है। अब आप लॉगिन कर सभी सेवाओं का उपयोग कर सकते हैं।`,
          amount: req.amount || 121,
          createdAt: nowIso,
          read: false,
        });
      } catch (_) {}

      // 7. Dispatch automated member notification
      try {
        await sendMemberRegistrationNotification({
          userId: targetUid,
          name: req.name,
          phone: req.phone,
          email: req.email,
          role: req.role,
          memberCode: req.memberCode,
          amountPaid: req.amount || 121,
          registeredAt: nowIso,
        });
      } catch (_) {}

      // 8. Update local state
      setCashApprovals((prev) =>
        prev.map((c) =>
          (c.id === targetUid || c.userId === targetUid)
            ? { ...c, status: 'approved', approvedAt: nowIso, approvedBy: 'DEEPAK (Super Admin)' }
            : c
        )
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? { ...u, status: 'active', approvalStatus: 'approved', registrationFeePaid: true, registrationPaymentStatus: 'approved' }
            : u
        )
      );

      setStatusMsg({
        type: 'success',
        text: `सफलतापूर्वक स्वीकृत! ${req.name} का नकद रजिस्ट्रेशन (₹${req.amount || 121}) अप्रूव कर दिया गया है और खाता सक्रिय हो गया है।`,
      });
    } catch (err: any) {
      console.error('Approve cash registration error:', err);
      setStatusMsg({
        type: 'error',
        text: 'अप्रूवल में त्रुटि: ' + (err.message || 'Unknown error'),
      });
    } finally {
      setApprovingCashId(null);
    }
  };

  const handleRejectCashRegistration = async (req: any, reason = 'नकद राशि अप्राप्त / अमान्य विवरण') => {
    const targetUid = req.userId || req.id;
    setRejectingCashId(targetUid);
    try {
      const nowIso = new Date().toISOString();

      await updateDoc(doc(db, 'users', targetUid), {
        status: 'rejected',
        approvalStatus: 'rejected',
        registrationPaymentStatus: 'rejected',
        rejectedAt: nowIso,
        rejectionReason: reason,
        updatedAt: nowIso,
      });

      await setDoc(doc(db, 'registration_approvals', targetUid), {
        ...req,
        status: 'rejected',
        rejectedAt: nowIso,
        rejectedBy: 'DEEPAK (Super Admin)',
        rejectionReason: reason,
        updatedAt: nowIso,
      }, { merge: true });

      // Notification to user
      await addDoc(collection(db, 'notifications'), {
        recipientId: targetUid,
        userId: targetUid,
        targetRole: req.role,
        type: 'registration_rejected',
        title: 'नकद रजिस्ट्रेशन अस्वीकृत (Cash Registration Rejected)',
        message: `नमस्ते ${req.name}, आपका नकद रजिस्ट्रेशन अनुरोध अस्वीकृत कर दिया गया है। कारण: ${reason}। कृपया सही विवरण के साथ पुनः प्रयास करें या +91 62675 46945 पर संपर्क करें।`,
        createdAt: nowIso,
        read: false,
      });

      setCashApprovals((prev) =>
        prev.map((c) =>
          (c.id === targetUid || c.userId === targetUid)
            ? { ...c, status: 'rejected', rejectedAt: nowIso, rejectionReason: reason }
            : c
        )
      );

      setStatusMsg({
        type: 'success',
        text: `${req.name} का अनुरोध अस्वीकृत कर दिया गया है।`,
      });
    } catch (err: any) {
      console.error('Reject cash error:', err);
      setStatusMsg({
        type: 'error',
        text: 'अस्वीकार करने में त्रुटि: ' + (err.message || 'Error'),
      });
    } finally {
      setRejectingCashId(null);
    }
  };

  const handleMarkUserAsCashPaid = async (user: any) => {
    const targetUid = user.uid || user.id || user.userId;
    const targetFee = user.registrationFeeAmount || (user.role === 'business_partner' ? 1021 : user.role === 'franchise_partner' ? 1021 : 121);
    const nowIso = new Date().toISOString();
    const paymentId = `CASH_ADMIN_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    setApprovingCashId(targetUid);
    try {
      // 1. Update users document in Firestore
      await setDoc(
        doc(db, 'users', targetUid),
        {
          status: 'active',
          registrationFeePaid: true,
          registrationFeeAmount: targetFee,
          registrationPaymentMethod: 'cash',
          registrationPaymentStatus: 'approved',
          approvalStatus: 'approved',
          registrationPaidAt: nowIso,
          registrationPaymentId: paymentId,
          approvedBy: 'DEEPAK (Super Admin)',
          approvedAt: nowIso,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // 2. Update registration_approvals document
      await setDoc(
        doc(db, 'registration_approvals', targetUid),
        {
          id: targetUid,
          userId: targetUid,
          name: user.name || 'User',
          fatherName: user.fatherName || '',
          motherName: user.motherName || '',
          noCriminalRecordOath: Boolean(user.noCriminalRecordOath),
          phone: user.phone || '',
          email: user.email || '',
          role: user.role || 'customer',
          memberCode: user.memberCode || '',
          amount: targetFee,
          paymentMethod: 'cash',
          status: 'approved',
          approvedAt: nowIso,
          approvedBy: 'DEEPAK (Super Admin)',
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // 3. If business partner, update business_partners collection
      if (user.role === 'business_partner') {
        try {
          const bpSnap = await getDocs(query(collection(db, 'business_partners'), where('userId', '==', targetUid)));
          bpSnap.forEach(async (bpDoc) => {
            await updateDoc(doc(db, 'business_partners', bpDoc.id), {
              status: 'active',
              paymentMethod: 'cash',
              registrationFeePaid: true,
              onboardingPaymentId: paymentId,
              updatedAt: nowIso,
            });
          });
        } catch (_) {}
      }

      // 4. Send notification to user
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: targetUid,
          userId: targetUid,
          targetRole: user.role || 'customer',
          type: 'registration_approved',
          title: 'रजिस्ट्रेशन शुल्क नकद प्राप्त व अकाउंट सक्रिय! (Fee Paid & Active)',
          message: `नमस्ते ${user.name || 'सदस्य'}! आपका ₹${targetFee} नकद (Cash) रजिस्ट्रेशन शुल्क सुपर एडमिन DEEPAK द्वारा प्राप्त कर लिया गया है। आपका खाता 100% सक्रिय (Active) हो चुका है।`,
          amount: targetFee,
          createdAt: nowIso,
          read: false,
        });
      } catch (_) {}

      // 5. Send automated SMS & WhatsApp notification log
      try {
        await sendMemberRegistrationNotification({
          userId: targetUid,
          name: user.name || 'सदस्य',
          fatherName: user.fatherName,
          motherName: user.motherName,
          noCriminalRecordOath: Boolean(user.noCriminalRecordOath),
          phone: user.phone,
          email: user.email,
          role: user.role || 'customer',
          memberCode: user.memberCode,
          amountPaid: targetFee,
          paymentMethod: 'cash',
          registrationPaymentId: paymentId,
          registeredAt: nowIso,
        });
      } catch (_) {}

      // 6. Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUid
            ? {
                ...u,
                status: 'active',
                registrationFeePaid: true,
                registrationFeeAmount: targetFee,
                registrationPaymentStatus: 'approved',
                approvalStatus: 'approved',
                registrationPaymentMethod: 'cash',
                registrationPaymentId: paymentId,
                registrationPaidAt: nowIso,
              }
            : u
        )
      );

      setCashApprovals((prev) =>
        prev.map((c) =>
          c.id === targetUid || c.userId === targetUid
            ? { ...c, status: 'approved', approvedAt: nowIso, approvedBy: 'DEEPAK (Super Admin)' }
            : c
        )
      );

      setStatusMsg({
        type: 'success',
        text: `सफलतापूर्वक नकद प्राप्त! ${user.name || 'सदस्य'} का ₹${targetFee} रजिस्ट्रेशन शुल्क Paid चिह्नित हो गया है और खाता सक्रिय हो गया है।`,
      });
    } catch (err: any) {
      console.error('Mark as cash paid error:', err);
      setStatusMsg({
        type: 'error',
        text: 'शुल्क अपडेट करने में त्रुटि: ' + (err.message || 'Error'),
      });
    } finally {
      setApprovingCashId(null);
    }
  };

  const pendingCashApprovals = useMemo(
    () => cashApprovals.filter((c) => c.status === 'pending'),
    [cashApprovals]
  );

  const isPaidUser = (u: any) => {
    return (
      u.registrationFeePaid === true ||
      u.registrationPaymentStatus === 'approved' ||
      u.approvalStatus === 'approved' ||
      (u.status === 'active' && u.registrationPaymentStatus !== 'pending_cash_approval' && u.status !== 'pending_approval') ||
      u.role === 'admin'
    );
  };

  const filteredCashApprovals = useMemo(() => {
    return cashApprovals.filter((c) => {
      let matchesStatus = true;
      if (cashFilter === 'pending') matchesStatus = c.status === 'pending';
      else if (cashFilter === 'approved') matchesStatus = c.status === 'approved';
      else if (cashFilter === 'rejected') matchesStatus = c.status === 'rejected';

      const s = search.toLowerCase();
      const matchesSearch =
        !search ||
        (c.name && c.name.toLowerCase().includes(s)) ||
        (c.fatherName && c.fatherName.toLowerCase().includes(s)) ||
        (c.motherName && c.motherName.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s)) ||
        (c.phone && c.phone.includes(search)) ||
        (c.memberCode && c.memberCode.toLowerCase().includes(s));

      return matchesStatus && matchesSearch;
    });
  }, [cashApprovals, cashFilter, search]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      let matchesRole = true;
      if (activeTab === 'customers') matchesRole = u.role === 'customer';
      else if (activeTab === 'service_pros') matchesRole = u.role === 'service_man';
      else if (activeTab === 'partners') matchesRole = u.role === 'business_partner' || u.role === 'franchise_partner';
      else if (activeTab === 'admins') matchesRole = u.role === 'admin';

      let matchesPayment = true;
      if (paymentFilter === 'paid') matchesPayment = isPaidUser(u);
      else if (paymentFilter === 'unpaid') matchesPayment = !isPaidUser(u);

      const s = search.toLowerCase();
      const matchesSearch =
        !search ||
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.fatherName && u.fatherName.toLowerCase().includes(s)) ||
        (u.motherName && u.motherName.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.phone && u.phone.includes(search)) ||
        (u.memberCode && u.memberCode.toLowerCase().includes(s)) ||
        (u.uid && u.uid.toLowerCase().includes(s));

      return matchesRole && matchesPayment && matchesSearch;
    });
  }, [users, activeTab, paymentFilter, search]);

  // Spark Quota Optimization: Paginate users list
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeUserPage = Math.min(currentPage, totalUserPages);
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((safeUserPage - 1) * pageSize, safeUserPage * pageSize);
  }, [filteredUsers, safeUserPage, pageSize]);

  const filteredResetRequests = useMemo(() => {
    if (!search) return resetRequests;
    const s = search.toLowerCase();
    return resetRequests.filter(
      (r) =>
        r.emailOrUsername.toLowerCase().includes(s) ||
        (r.userName && r.userName.toLowerCase().includes(s)) ||
        (r.userEmail && r.userEmail.toLowerCase().includes(s)) ||
        (r.userPhone && r.userPhone.includes(search))
    );
  }, [resetRequests, search]);

  const counts = useMemo(() => {
    const paidList = users.filter(isPaidUser);
    const unpaidList = users.filter((u) => !isPaidUser(u));
    return {
      all: users.length,
      paid: paidList.length,
      unpaid: unpaidList.length,
      cashApprovals: pendingCashApprovals.length,
      resets: pendingResetRequests.length,
      pros: users.filter((u) => u.role === 'service_man').length,
      customers: users.filter((u) => u.role === 'customer').length,
      partners: users.filter((u) => u.role === 'business_partner' || u.role === 'franchise_partner').length,
      admins: users.filter((u) => u.role === 'admin').length,
    };
  }, [users, pendingResetRequests, pendingCashApprovals]);

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden border border-amber-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-2.5 border border-amber-400/30">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Master Admin Credentials Authority</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              यूजर एवं पासवर्ड नियंत्रण / Users &amp; Credentials Hub
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl leading-relaxed">
              प्रशासक DEEPAK विशेष अधिकार: किसी भी उपयोगकर्ता (कारीगर, ग्राहक, फ्रेंचाइजी पार्टनर) का यूजरनेम व पासवर्ड सीधे रीसेट करें, नए क्रेडेंशियल्स जारी करें तथा 'Forgot Password' अनुरोधों का तुरंत समाधान करें।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              id="admin-open-reset-utility-btn"
              type="button"
              onClick={() => {
                setSelectedUserForUtility(null);
                setActiveTab('manual_reset_utility');
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-stone-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-orange-950/40"
            >
              <KeyRound className="w-4 h-4 text-stone-950" />
              <span>पासवर्ड रीसेट यूटिलिटी / Reset Utility</span>
            </button>
            <button
              id="admin-create-user-btn"
              type="button"
              onClick={() => {
                setNewPassword(generateSecurePassword());
                setIsCreateUserModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-950/40"
            >
              <UserPlus className="w-4 h-4" />
              <span>नया यूजर जोड़ें / Create User</span>
            </button>
            <button
              type="button"
              onClick={handleZeroDeepakWallet}
              disabled={zeroingDeepakWallet}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-60 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-red-950/40"
              title="दीपक का वॉलेट शून्य करें / Zero Deepak's Wallet"
            >
              <Wallet className="w-4 h-4 text-white" />
              <span>{zeroingDeepakWallet ? 'शून्य हो रहा...' : 'दीपक वॉलेट शून्य करें (0 Rs)'}</span>
            </button>
            <button
              type="button"
              onClick={fetchUsersAndRequests}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              title="Refresh users and requests"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>रिफ्रेश</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-amber-50/80 border-amber-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-amber-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">कुल पंजीकृत यूजर</span>
            <Users className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900">{counts.all}</div>
          <span className="text-[11px] text-stone-500">सभी रोल्स के सदस्य</span>
        </div>

        <div
          id="kpi-cash-approvals-card"
          onClick={() => setActiveTab('pending_approvals')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'pending_approvals'
              ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
              : counts.cashApprovals > 0
              ? 'bg-emerald-50/60 border-emerald-400 hover:border-emerald-500 shadow-xs'
              : 'bg-white border-stone-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-800 mb-1.5">
            <span className="text-xs font-black uppercase tracking-wider">नकद अप्रूवल अनुरोध</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl sm:text-3xl font-black text-emerald-950">{counts.cashApprovals}</div>
            {counts.cashApprovals > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] animate-pulse">
                स्वीकृति प्रतीक्षारत
              </span>
            )}
          </div>
          <span className="text-[11px] text-emerald-800 font-medium">Cash Registration से प्राप्त</span>
        </div>

        <div
          id="kpi-reset-requests-card"
          onClick={() => setActiveTab('reset_requests')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
            activeTab === 'reset_requests'
              ? 'bg-orange-50 border-orange-400 shadow-sm ring-2 ring-orange-400/20'
              : counts.resets > 0
              ? 'bg-orange-50/50 border-orange-300 hover:border-orange-400 shadow-xs'
              : 'bg-white border-stone-200 hover:border-stone-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-orange-700 mb-1.5">
            <span className="text-xs font-black uppercase tracking-wider">पासवर्ड रीसेट अनुरोध</span>
            <KeyRound className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl sm:text-3xl font-black text-orange-950">{counts.resets}</div>
            {counts.resets > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white font-bold text-[10px] animate-pulse">
                एक्शन आवश्यक
              </span>
            )}
          </div>
          <span className="text-[11px] text-orange-800 font-medium">Forgot Password से प्राप्त</span>
        </div>

        <div
          onClick={() => setActiveTab('service_pros')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'service_pros'
              ? 'bg-blue-50 border-blue-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-blue-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">सर्विस प्रो (कारीगर)</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950">{counts.pros}</div>
          <span className="text-[11px] text-blue-700">फील्ड तकनीशियन</span>
        </div>

        <div
          onClick={() => setActiveTab('customers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-emerald-50 border-emerald-300 shadow-xs'
              : 'bg-white border-stone-200 hover:border-emerald-200 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">ग्राहक (Customers)</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950">{counts.customers}</div>
          <span className="text-[11px] text-emerald-700">सेवा उपभोक्ता</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 pb-1 overflow-x-auto no-scrollbar">
        <button
          id="tab-members-ledger-btn"
          onClick={() => {
            setActiveTab('members_ledger');
            setPaymentFilter('all');
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 shadow-xs ${
            activeTab === 'members_ledger'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white ring-2 ring-emerald-400/40'
              : 'text-emerald-950 bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-300'
          }`}
        >
          <Banknote className="w-4 h-4 text-emerald-300" />
          <span>📑 सभी पंजीकृत सदस्य व शुल्क लेजर ({counts.all})</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-900 text-emerald-200 text-[10px] font-bold">
            Paid: {counts.paid} | Unpaid: {counts.unpaid}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'all'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          सभी उपयोगकर्ता ({counts.all})
        </button>

        <button
          id="tab-cash-approvals-btn"
          onClick={() => setActiveTab('pending_approvals')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending_approvals'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>💵 नकद रजिस्ट्रेशन अप्रूवल</span>
          {pendingCashApprovals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black animate-pulse">
              {pendingCashApprovals.length}
            </span>
          )}
        </button>

        <button
          id="tab-manual-reset-utility-btn"
          onClick={() => setActiveTab('manual_reset_utility')}
          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'manual_reset_utility'
              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs ring-2 ring-orange-400/30'
              : 'text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-200'
          }`}
        >
          <KeyRound className={`w-3.5 h-3.5 ${activeTab === 'manual_reset_utility' ? 'text-white' : 'text-orange-600'}`} />
          <span>⚡ पासवर्ड रीसेट यूटिलिटी (Admin Utility)</span>
        </button>

        <button
          id="tab-reset-requests-btn"
          onClick={() => setActiveTab('reset_requests')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'reset_requests'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'text-orange-700 bg-orange-50 hover:bg-orange-100'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>पासवर्ड रीसेट अनुरोध</span>
          {counts.resets > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white text-orange-700 text-[10px] font-black">
              {counts.resets}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('service_pros')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'service_pros'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          सर्विस प्रो ({counts.pros})
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          ग्राहक ({counts.customers})
        </button>

        <button
          onClick={() => setActiveTab('partners')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'partners'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          फ्रेंचाइजी पार्टनर्स ({counts.partners})
        </button>

        <button
          onClick={() => setActiveTab('admins')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'admins'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          एडमिन ({counts.admins})
        </button>
      </div>

      {/* Search & Fee Status Filter Bar - only shown for table views */}
      {activeTab !== 'manual_reset_utility' && (
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="admin-users-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="नाम, पिता/माता का नाम, ईमेल, फोन नंबर, मेम्बर कोड या UID द्वारा खोजें..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Registration Fee Status Filters */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-stone-500 hidden sm:inline mr-1">शुल्क स्थिति:</span>
            <button
              type="button"
              onClick={() => setPaymentFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                paymentFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              सभी ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('paid')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                paymentFilter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>शुल्क Paid ({counts.paid})</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('unpaid')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                paymentFilter === 'unpaid'
                  ? 'bg-amber-500 text-stone-950 shadow-xs font-black'
                  : 'bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5 text-amber-700" />
              <span>Unpaid / बकाया ({counts.unpaid})</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 0: Manual Password Reset Utility Component */}
      {activeTab === 'manual_reset_utility' ? (
        <ManualPasswordResetUtility
          initialSelectedUser={selectedUserForUtility}
          onNavigateToUserList={() => setActiveTab('all')}
          onSuccessReset={() => {
            fetchUsersAndRequests();
          }}
        />
      ) : activeTab === 'reset_requests' ? (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                जब भी कोई उपयोगकर्ता लॉगिन स्क्रीन पर 'Forgot Password' लिंक पर क्लिक करता है, उसका अनुरोध यहां दर्ज होता है।
              </p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                एडमिन DEEPAK किसी भी अनुरोध पर 'नया पासवर्ड व यूजरनेम जारी करें' बटन दबाकर तुरंत सुरक्षित पासवर्ड असाइन कर सकते हैं तथा WhatsApp या SMS द्वारा सूचित कर सकते हैं।
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">अनुरोधकर्ता / Identifier</th>
                    <th className="py-3.5 px-4">मेल / फोन</th>
                    <th className="py-3.5 px-4">अनुरोध समय</th>
                    <th className="py-3.5 px-4">स्थिति / Status</th>
                    <th className="py-3.5 px-4 text-right">एडमिन एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredResetRequests.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-400 text-xs">
                        कोई पासवर्ड रीसेट अनुरोध प्राप्त नहीं हुआ है।
                      </td>
                    </tr>
                  ) : (
                    filteredResetRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-amber-50/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-stone-900 flex items-center gap-1.5">
                            <span>{req.userName || req.emailOrUsername}</span>
                            {req.status === 'pending' && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                            )}
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono">
                            {req.emailOrUsername}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-stone-700">{req.userEmail || '—'}</div>
                          <div className="text-[11px] text-stone-500">{req.userPhone || '—'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>
                              {req.requestedAt
                                ? new Date(req.requestedAt).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'अभी-अभी'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {req.status === 'pending' ? (
                            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                              रीसेट प्रतीक्षारत (Pending)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              समाधानित (Resolved)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            id={`action-reset-req-${req.id}`}
                            onClick={() => openResetRequestForUser(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>नया पासवर्ड जारी करें</span>
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
      ) : activeTab === 'pending_approvals' ? (
        <div className="space-y-4">
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex items-start gap-3">
            <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                उपयोगकर्ताओं द्वारा नकद (Cash) भुगतान से किए गए रजिस्ट्रेशन अनुरोध:
              </p>
              <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                जब भी कोई ग्राहक (₹121), कारीगर/सर्विस प्रो (₹121) या बिजनेस पार्टनर (₹1021) 'नकद भुगतान (Cash)' चुनकर रजिस्ट्रेशन करता है, उसका अनुरोध यहां आता है। सुपर एडमिन DEEPAK नकद राशि प्राप्त कर 'स्वीकार करें (Approve)' दबाकर अकाउंट तुरंत सक्रिय कर सकते हैं।
              </p>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCashFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                cashFilter === 'pending'
                  ? 'bg-amber-500 text-stone-950 shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>लंबित अनुरोध (Pending)</span>
              {pendingCashApprovals.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-stone-950 text-amber-400 text-[10px] font-black">
                  {pendingCashApprovals.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setCashFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                cashFilter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>स्वीकृत (Approved)</span>
            </button>

            <button
              onClick={() => setCashFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                cashFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>अस्वीकृत (Rejected)</span>
            </button>

            <button
              onClick={() => setCashFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                cashFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>सभी अनुरोध (All)</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">आवेदक / Name</th>
                    <th className="py-3.5 px-4">भूमिका / Role</th>
                    <th className="py-3.5 px-4">शुल्क व माध्यम / Fee</th>
                    <th className="py-3.5 px-4">संपर्क व सत्यापन / Contact</th>
                    <th className="py-3.5 px-4">अनुरोध समय</th>
                    <th className="py-3.5 px-4">स्थिति / Status</th>
                    <th className="py-3.5 px-4 text-right">एडमिन एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredCashApprovals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400 text-xs">
                        {loading ? 'लोड हो रहा है...' : 'कोई नकद रजिस्ट्रेशन अनुरोध नहीं मिला।'}
                      </td>
                    </tr>
                  ) : (
                    filteredCashApprovals.map((req) => {
                      const isApproving = approvingCashId === (req.userId || req.id);
                      const isRejecting = rejectingCashId === (req.userId || req.id);
                      const cleanPhone = (req.phone || '').replace(/[^0-9]/g, '');
                      const waText = encodeURIComponent(
                        `नमस्ते ${req.name}, HARDINKAAM एडमिन हेड ऑफिस से। आपका ₹${req.amount || 121} नकद रजिस्ट्रेशन अनुरोध प्राप्त हुआ है।`
                      );

                      return (
                        <tr key={req.id || req.userId} className="hover:bg-amber-50/20 transition-colors">
                          {/* Name & Avatar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {req.avatar ? (
                                <img
                                  src={req.avatar}
                                  alt={req.name}
                                  className="w-9 h-9 rounded-2xl object-cover border border-stone-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                                  {req.name?.charAt(0) || 'U'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                  <span>{req.name}</span>
                                  {req.status === 'pending' && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                  )}
                                </div>
                                <div className="text-[10px] text-stone-400 font-mono">
                                  {req.memberCode || `ID: ${(req.userId || req.id)?.substring(0, 10)}`}
                                </div>
                                {(req.fatherName || req.motherName) && (
                                  <div className="text-[10px] text-stone-600 mt-0.5">
                                    {req.fatherName && <span>पिता: <strong>{req.fatherName}</strong> </span>}
                                    {req.motherName && <span>माता: <strong>{req.motherName}</strong></span>}
                                  </div>
                                )}
                                <div className="mt-0.5">
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                    <ShieldCheck className="w-2.5 h-2.5" />
                                    <span>आपराधिक रिकॉर्ड नहीं (Oath Verified)</span>
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                                req.role === 'service_man'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : req.role === 'business_partner'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              }`}
                            >
                              {req.role === 'service_man'
                                ? 'सर्विसमैन / प्रो'
                                : req.role === 'business_partner'
                                ? 'बिजनेस पार्टनर'
                                : 'कस्टमर'}
                            </span>
                          </td>

                          {/* Amount & Mode */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-stone-900 text-sm">
                              ₹{req.amount || 121}
                            </div>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <Banknote className="w-3 h-3" />
                              <span>नकद (Cash)</span>
                            </span>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4">
                            <div className="text-stone-800 font-medium">{req.phone || '—'}</div>
                            <div className="text-stone-500 text-[10px]">{req.email || '—'}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {cleanPhone && (
                                <>
                                  <a
                                    href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${waText}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200"
                                    title="WhatsApp message"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                  <a
                                    href={`tel:${cleanPhone}`}
                                    className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold flex items-center gap-1 border border-stone-200"
                                    title="Call user"
                                  >
                                    <PhoneCall className="w-3 h-3" />
                                    <span>कॉल</span>
                                  </a>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Requested At */}
                          <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-stone-400" />
                              <span>
                                {req.requestedAt
                                  ? new Date(req.requestedAt).toLocaleString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : '—'}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {req.status === 'pending' ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px] uppercase inline-flex items-center gap-1 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                सत्यापन प्रतीक्षारत (Pending)
                              </span>
                            ) : req.status === 'approved' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase inline-flex items-center gap-1 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                स्वीकृत (Approved)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 font-bold text-[10px] uppercase inline-flex items-center gap-1 border border-rose-300">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                अस्वीकृत (Rejected)
                              </span>
                            )}
                          </td>

                          {/* Admin Action */}
                          <td className="py-3.5 px-4 text-right">
                            {req.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  disabled={isApproving || isRejecting}
                                  onClick={() => handleApproveCashRegistration(req)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs transition"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isApproving ? 'अप्रूव हो रहा...' : 'स्वीकार करें'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isApproving || isRejecting}
                                  onClick={() => handleRejectCashRegistration(req)}
                                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-60 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>अस्वीकार</span>
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-stone-500 font-medium">
                                {req.status === 'approved'
                                  ? `स्वीकृत द्वारा: ${req.approvedBy || 'DEEPAK'}`
                                  : 'अस्वीकृत'}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: Users & Members Ledger Table */
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">पंजीकृत सदस्य / Member</th>
                  <th className="py-3.5 px-4">भूमिका / Role</th>
                  <th className="py-3.5 px-4">संपर्क / Contact</th>
                  <th className="py-3.5 px-4">रजिस्ट्रेशन शुल्क / Fee Status</th>
                  <th className="py-3.5 px-4">पासवर्ड स्थिति / Password</th>
                  <th className="py-3.5 px-4 text-right">प्रशासनिक एक्शन / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400 text-xs">
                      {loading ? 'उपयोगकर्ताओं की सूची लोड हो रही है...' : 'कोई पंजीकृत उपयोगकर्ता नहीं मिला।'}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, idx) => {
                    const isRevealed = Boolean(revealedPasswords[user.uid]);
                    const isPaid = isPaidUser(user);
                    const userFee =
                      user.registrationFeeAmount ||
                      (user.role === 'business_partner' || user.role === 'franchise_partner' ? 1021 : user.role === 'admin' ? 0 : 121);
                    const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
                    const isApproving = approvingCashId === user.uid;
                    const waText = encodeURIComponent(
                      `नमस्ते ${user.name || 'सदस्य'}, HARDINKAAM एडमिन हेड ऑफिस से। आपका मेम्बर कोड ${user.memberCode || user.uid?.substring(0, 8)} है।`
                    );

                    return (
                      <tr key={user.uid || user.id || `user_${idx}`} className="hover:bg-amber-50/20 transition-colors">
                        {/* Name, Member Code, Parents & Oath */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-start gap-3">
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-10 h-10 rounded-2xl object-cover border border-stone-200 shrink-0 mt-0.5"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 border border-stone-200 mt-0.5">
                                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                              </div>
                            )}
                            <div>
                              <div className="font-black text-stone-900 flex items-center gap-1.5 text-xs sm:text-sm">
                                <span>{user.name || 'Anonymous User'}</span>
                                {user.resetRequested && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 text-[9px] font-black border border-orange-200">
                                    रीसेट अपेक्षित
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1">
                                <span className="font-bold text-amber-700">{user.memberCode || `ID: ${user.uid?.substring(0, 10)}`}</span>
                                {user.createdAt && (
                                  <span className="text-stone-400">
                                    • {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </span>
                                )}
                              </div>

                              {/* Father & Mother Name */}
                              {(user.fatherName || user.motherName) && (
                                <div className="text-[10px] text-stone-700 mt-0.5 flex flex-wrap gap-x-2">
                                  {user.fatherName && (
                                    <span>
                                      पिता: <strong className="text-stone-900">{user.fatherName}</strong>
                                    </span>
                                  )}
                                  {user.motherName && (
                                    <span>
                                      माता: <strong className="text-stone-900">{user.motherName}</strong>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Oath Badge */}
                              <div className="mt-1">
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>शपथ: कोई आपराधिक रिकॉर्ड नहीं</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                              user.role === 'admin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : user.role === 'service_man'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : user.role === 'business_partner' || user.role === 'franchise_partner'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            }`}
                          >
                            {user.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-700" />}
                            {user.role === 'service_man' && <Wrench className="w-3 h-3 text-blue-700" />}
                            {(user.role === 'business_partner' || user.role === 'franchise_partner') && (
                              <Briefcase className="w-3 h-3 text-purple-700" />
                            )}
                            {user.role === 'service_man'
                              ? 'सर्विसमैन / प्रो'
                              : user.role === 'business_partner' || user.role === 'franchise_partner'
                              ? 'पार्टनर / फ्रेंचाइजी'
                              : user.role === 'admin'
                              ? 'एडमिन'
                              : 'ग्राहक (Customer)'}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <div className="text-stone-900 font-bold">{user.phone || '—'}</div>
                          <div className="text-stone-500 text-[10px] truncate max-w-[150px]">{user.email || '—'}</div>
                          {cleanPhone && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <a
                                href={`https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${waText}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200"
                                title="WhatsApp संदेश भेजें"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                <span>WhatsApp</span>
                              </a>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="px-1.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold flex items-center gap-1 border border-stone-200"
                                title="कॉल करें"
                              >
                                <PhoneCall className="w-2.5 h-2.5" />
                                <span>कॉल</span>
                              </a>
                            </div>
                          )}
                        </td>

                        {/* Registration Fee Status */}
                        <td className="py-3.5 px-4">
                          {user.role === 'admin' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600">
                              प्रशासनिक खाता
                            </span>
                          ) : isPaid ? (
                            <div>
                              <span className="px-2.5 py-1 rounded-full font-black text-[10px] uppercase inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>₹{userFee} Paid</span>
                              </span>
                              <div className="text-[10px] text-stone-500 mt-1 flex items-center gap-1">
                                <span className="font-semibold capitalize">
                                  {user.registrationPaymentMethod === 'cash' ? '💵 नकद (Cash)' : '💳 ऑनलाइन (Razorpay)'}
                                </span>
                              </div>
                              {user.registrationPaymentId && (
                                <div className="text-[9px] text-stone-400 font-mono">
                                  Ref: {user.registrationPaymentId.substring(0, 14)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="px-2.5 py-1 rounded-full font-black text-[10px] uppercase inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                <span>₹{userFee} Unpaid / बकाया</span>
                              </span>
                              <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                                भुगतान प्रतीक्षारत
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Auth Status */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Firebase Auth
                          </span>
                        </td>

                        {/* Administrative Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end flex-wrap gap-1.5">
                            {/* Instant Cash Payment Button if unpaid */}
                            {!isPaid && user.role !== 'admin' && (
                              <button
                                type="button"
                                disabled={isApproving}
                                onClick={() => handleMarkUserAsCashPaid(user)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-60 text-white font-black text-xs cursor-pointer shadow-sm transition"
                                title="उपयोगकर्ता से नकद प्राप्त कर शुल्क को तुरंत Paid चिह्नित करें"
                              >
                                <Banknote className="w-3.5 h-3.5" />
                                <span>{isApproving ? 'अपडेट हो रहा...' : `💵 नकद लेकर Paid करें (₹${userFee})`}</span>
                              </button>
                            )}

                            <button
                              id={`open-utility-btn-${user.uid}`}
                              onClick={() => {
                                setSelectedUserForUtility(user);
                                setActiveTab('manual_reset_utility');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                              title="पासवर्ड रीसेट यूटिलिटी"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">रीसेट</span>
                            </button>

                            <button
                              id={`edit-credentials-btn-${user.uid}`}
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-bold text-xs cursor-pointer transition-colors"
                              title="यूजरनेम, फोन व रोल बदलें"
                            >
                              <span>संपादित</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Spark Quota Optimization: Users Pagination Bar */}
          {filteredUsers.length > 0 && (
            <div className="px-6 py-4 bg-stone-50/80 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
              <div className="flex items-center gap-2">
                <span>
                  उपयोगकर्ता {(safeUserPage - 1) * pageSize + 1}–{Math.min(safeUserPage * pageSize, filteredUsers.length)} (कुल {filteredUsers.length})
                </span>
                <span className="text-stone-300">|</span>
                <label className="flex items-center gap-1">
                  <span>प्रति पृष्ठ:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-stone-200 rounded-md px-1.5 py-0.5 text-xs text-stone-700"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeUserPage <= 1}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="पिछला पृष्ठ"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-semibold text-stone-700 px-2">
                  पृष्ठ {safeUserPage} / {totalUserPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalUserPages, p + 1))}
                  disabled={safeUserPage >= totalUserPages}
                  className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="अगला पृष्ठ"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: EDIT / RESET CREDENTIALS ================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">
                    यूजरनेम एवं पासवर्ड रीसेट करें
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    एडमिन DEEPAK विशेष नियंत्रण — तुरंत सक्रिय होगा
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCredentials} className="p-6 space-y-4">
              {statusMsg && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold ${
                    statusMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {statusMsg.text}
                </div>
              )}

              {/* User UID Badge */}
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                <span>टारगेट यूजर आईडी:</span>
                <span className="font-mono font-bold text-stone-800">{editingUser.uid}</span>
              </div>

              {/* Photo / Avatar Section */}
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                <PhotoCaptureWidget
                  photo={editAvatar}
                  onPhotoChange={(newPhoto) => setEditAvatar(newPhoto || '')}
                  label="सदस्य की फ़ोटो बदलें / अपलोड करें (Member Photo)"
                />
              </div>

              {/* 1. Username / Name */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  यूजर का नाम / Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="admin-edit-name-input"
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="उदा. Rajesh Sharma या राजेश"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  उपयोगकर्ता ईमेल के स्थान पर इस नाम/यूजरनेम को दर्ज करके भी लॉगिन कर सकता है।
                </p>
              </div>

              {/* 2. Email */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  ईमेल पता / Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="admin-edit-email-input"
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* 3. Phone */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  मोबाइल नंबर / Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="admin-edit-phone-input"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98260 00000"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                  />
                </div>
              </div>

              {/* 4. New Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-800">
                    नया पासवर्ड सेट करें / New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateSecurePassword())}
                    className="inline-flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900 font-bold cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>मजबूत पासवर्ड बनाएं</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    id="admin-edit-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="उदा. Hardin#9284"
                    className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  पासवर्ड तुरंत सक्रिय हो जाएगा। यूजर इसी नए पासवर्ड से तुरंत लॉगिन कर सकेंगे।
                </p>
              </div>

              {/* 5. Role */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  भूमिका / User Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 bg-white font-semibold"
                >
                  <option value="customer">Customer (ग्राहक)</option>
                  <option value="service_man">Service Pro (कारीगर / फील्ड तकनीशियन)</option>
                  <option value="business_partner">Business Partner (फ्रेंचाइजी पार्टनर)</option>
                  <option value="admin">Admin (प्लेटफॉर्म प्रशासक)</option>
                </select>
              </div>

              {/* Quick Credentials Share Action */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[11px] text-amber-900 font-medium">
                  {copiedStatus === 'copied' ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> क्रेडेंशियल्स क्लिपबोर्ड पर कॉपी हो गए!
                    </span>
                  ) : (
                    <span>क्रेडेंशियल्स को यूजर के साथ WhatsApp या SMS द्वारा साझा करें।</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyCredentials(editName, editEmail, editPassword, editPhone)
                    }
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold border border-stone-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      shareViaWhatsApp(editName, editEmail, editPassword, editPhone)
                    }
                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  id="admin-save-credentials-submit-btn"
                  type="submit"
                  disabled={savingCredentials}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black cursor-pointer shadow-md shadow-orange-600/20 disabled:opacity-60 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{savingCredentials ? 'सेव कर रहे हैं...' : 'क्रेडेंशियल्स अपडेट करें'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE NEW USER ================= */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-stone-900 to-amber-950 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base">नया उपयोगकर्ता पंजीकृत करें</h3>
              </div>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="p-6 space-y-4">
              {createUserError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  {createUserError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  पूरा नाम / Name / Username
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="उदा. Amit Verma"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  ईमेल / Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="amit@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  मोबाइल नंबर / Phone
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98260 12345"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  भूमिका / Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-2 text-xs rounded-xl border border-stone-200 font-semibold"
                >
                  <option value="customer">Customer (ग्राहक)</option>
                  <option value="service_man">Service Pro (कारीगर / तकनीशियन)</option>
                  <option value="business_partner">Business Partner (फ्रेंचाइजी)</option>
                  <option value="admin">Admin (प्रशासक)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-800">
                    प्रारंभिक पासवर्ड / Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateSecurePassword())}
                    className="text-[11px] text-amber-700 font-bold cursor-pointer"
                  >
                    नया पासवर्ड बनाएं
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 border border-stone-200 cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black cursor-pointer shadow-md disabled:opacity-60"
                >
                  {creatingUser ? 'जोड़ रहे हैं...' : 'यूजर सेव करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

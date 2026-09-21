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
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, setDoc, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserRole, PasswordResetRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ManualPasswordResetUtility } from './ManualPasswordResetUtility';

export const AdminUsersManager: React.FC = () => {
  const { adminChangeUserCredentials } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [activeTab, setActiveTab] = useState<
    'all' | 'manual_reset_utility' | 'reset_requests' | 'customers' | 'service_pros' | 'partners' | 'admins'
  >('all');
  const [selectedUserForUtility, setSelectedUserForUtility] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const generateSecurePassword = () => {
    const prefixes = ['Kaam', 'Seva', 'Hardin', 'Bhopal', 'Mitra', 'Pro'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['#', '@', '$', '!'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    return `${prefix}${symbol}${num}`;
  };

  const fetchUsersAndRequests = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users (capped at 200 to protect Spark tier daily read quotas)
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(200)));
      const list: any[] = [];
      usersSnap.forEach((d) => list.push({ uid: d.id, ...d.data() }));
      setUsers(list);

      // 2. Fetch Password Reset Requests (capped at 100)
      const rstSnap = await getDocs(query(collection(db, 'password_reset_requests'), limit(100)));
      const reqList: PasswordResetRequest[] = [];
      rstSnap.forEach((d) => reqList.push({ id: d.id, ...d.data() } as PasswordResetRequest));
      reqList.sort(
        (a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime()
      );
      setResetRequests(reqList);
    } catch (err) {
      console.warn('Users/Reset requests fetch notice:', err);
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
    setEditPassword(suggestedPassword || user.loginPassword || '');
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

      // If phone was changed, update doc
      if (editPhone.trim() !== (editingUser.phone || '')) {
        try {
          await updateDoc(doc(db, 'users', editingUser.uid), {
            phone: editPhone.trim(),
          });
        } catch (e) {
          console.warn('Phone update note:', e);
        }
      }

      setStatusMsg({
        type: 'success',
        text: `सफलतापूर्वक अपडेट किया गया! ${editName} के क्रेडेंशियल्स (यूजरनेम/पासवर्ड) तुरंत सक्रिय हो गए हैं।`,
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
                loginPassword: editPassword.trim(),
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
      const uid = 'usr_' + Date.now();
      const newUserDoc = {
        id: uid,
        name: newName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone.trim(),
        role: newRole,
        loginPassword: newPassword.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', uid), newUserDoc, { merge: true });
      setUsers((prev) => [newUserDoc, ...prev]);
      setIsCreateUserModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      setStatusMsg({
        type: 'success',
        text: `यूजर ${newName} सफलतापूर्वक जोड़ा गया! नया पासवर्ड: ${newPassword}`,
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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      let matchesRole = true;
      if (activeTab === 'customers') matchesRole = u.role === 'customer';
      else if (activeTab === 'service_pros') matchesRole = u.role === 'service_man';
      else if (activeTab === 'partners') matchesRole = u.role === 'business_partner';
      else if (activeTab === 'admins') matchesRole = u.role === 'admin';

      const s = search.toLowerCase();
      const matchesSearch =
        !search ||
        (u.name && u.name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.phone && u.phone.includes(search)) ||
        (u.uid && u.uid.toLowerCase().includes(s));

      return matchesRole && matchesSearch;
    });
  }, [users, activeTab, search]);

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
    return {
      all: users.length,
      resets: pendingResetRequests.length,
      pros: users.filter((u) => u.role === 'service_man').length,
      customers: users.filter((u) => u.role === 'customer').length,
      partners: users.filter((u) => u.role === 'business_partner').length,
      admins: users.filter((u) => u.role === 'admin').length,
    };
  }, [users, pendingResetRequests]);

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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

      {/* Search Bar - only shown for table views */}
      {activeTab !== 'manual_reset_utility' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="admin-users-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="नाम, यूजरनेम, ईमेल पता, फोन नंबर या यूजर आईडी द्वारा खोजें..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-white border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 text-xs"
              >
                Clear
              </button>
            )}
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
      ) : (
        /* VIEW 2: Users Table */
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">उपयोगकर्ता / Name</th>
                  <th className="py-3.5 px-4">संपर्क (Email &amp; Mobile)</th>
                  <th className="py-3.5 px-4">भूमिका / Role</th>
                  <th className="py-3.5 px-4">पासवर्ड स्थिति / Password</th>
                  <th className="py-3.5 px-4 text-right">प्रशासनिक रीसेट / Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-stone-400 text-xs">
                      {loading ? 'उपयोगकर्ताओं की सूची लोड हो रही है...' : 'कोई उपयोगकर्ता नहीं मिला।'}
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const isRevealed = Boolean(revealedPasswords[user.uid]);
                    return (
                      <tr key={user.uid} className="hover:bg-amber-50/20 transition-colors">
                        {/* Name & ID */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 border border-stone-200">
                              {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900 flex items-center gap-1.5">
                                <span>{user.name || 'Anonymous User'}</span>
                                {user.resetRequested && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 text-[9px] font-black border border-orange-200">
                                    रीसेट अपेक्षित
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-stone-400 font-mono">
                                UID: {user.uid?.substring(0, 10)}...
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <div className="text-stone-800 font-medium">{user.email || '—'}</div>
                          <div className="text-stone-500 text-[11px]">{user.phone || '—'}</div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.8 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                              user.role === 'admin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : user.role === 'service_man'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : user.role === 'business_partner'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : 'bg-stone-100 text-stone-800 border border-stone-200'
                            }`}
                          >
                            {user.role === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-700" />}
                            {user.role === 'service_man' && <Wrench className="w-3 h-3 text-blue-700" />}
                            {user.role === 'business_partner' && <Briefcase className="w-3 h-3 text-purple-700" />}
                            {user.role}
                          </span>
                        </td>

                        {/* Password Status */}
                        <td className="py-3.5 px-4">
                          {user.loginPassword ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                                {isRevealed ? user.loginPassword : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setRevealedPasswords((prev) => ({
                                    ...prev,
                                    [user.uid]: !isRevealed,
                                  }))
                                }
                                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                                title={isRevealed ? 'पासवर्ड छुपाएं' : 'पासवर्ड देखें'}
                              >
                                {isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-stone-400 italic">
                              डिफ़ॉल्ट / Google Auth
                            </span>
                          )}
                        </td>

                        {/* Reset Action */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {user.loginPassword && (
                              <button
                                type="button"
                                onClick={() =>
                                  copyCredentials(user.name, user.email, user.loginPassword, user.phone)
                                }
                                className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                                title="क्रेडेंशियल्स कॉपी करें"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              id={`open-utility-btn-${user.uid}`}
                              onClick={() => {
                                setSelectedUserForUtility(user);
                                setActiveTab('manual_reset_utility');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
                              title="इस उपयोगकर्ता का पासवर्ड रीसेट यूटिलिटी में खोलें"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>पासवर्ड रीसेट यूटिलिटी</span>
                            </button>
                            <button
                              id={`edit-credentials-btn-${user.uid}`}
                              onClick={() => openEditModal(user)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs cursor-pointer transition-colors"
                              title="यूजरनेम, फोन व रोल बदलें"
                            >
                              <span>विवरण बदलें</span>
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

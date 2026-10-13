import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  Lock,
  ShieldCheck,
  Search,
  User,
  Mail,
  Phone,
  Sparkles,
  Copy,
  Check,
  Share2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  UserCheck,
  CheckCheck,
  History,
  ShieldAlert,
  ArrowRight,
  Send,
  Sliders,
  Wrench,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, setDoc, getDoc, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { UserProfile, UserRole, PasswordResetRequest } from '../../types';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';
import { useAuth } from '../../context/AuthContext';

interface ManualPasswordResetUtilityProps {
  initialSelectedUser?: any | null;
  onSuccessReset?: (user: any) => void;
  onNavigateToUserList?: () => void;
}

interface ResetLogItem {
  id: string;
  targetUserId: string;
  targetUserName: string;
  targetEmail: string;
  assignedPassword?: string;
  performedBy: string;
  timestamp: string;
  note?: string;
  requirePasswordChange?: boolean;
}

export const ManualPasswordResetUtility: React.FC<ManualPasswordResetUtilityProps> = ({
  initialSelectedUser = null,
  onSuccessReset,
  onNavigateToUserList,
}) => {
  const { adminChangeUserCredentials } = useAuth();

  // State
  const [users, setUsers] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Selected User
  const [selectedUser, setSelectedUser] = useState<any | null>(initialSelectedUser);

  // Password configuration
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [generatorPreset, setGeneratorPreset] = useState<'memorable' | 'strong' | 'pin'>('memorable');
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [updateDisplayName, setUpdateDisplayName] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Execution state
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{
    user: any;
    passwordAssigned: string;
    timestamp: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Audit Logs for recent manual resets
  const [recentResets, setRecentResets] = useState<ResetLogItem[]>([]);

  // Password Generator Engine
  const generatePassword = (preset: 'memorable' | 'strong' | 'pin') => {
    if (preset === 'memorable') {
      const words = ['Kaam', 'Seva', 'Bhopal', 'Mitra', 'Hardin', 'Pro', 'Kareegar', 'Udyog'];
      const symbols = ['#', '@', '$', '!'];
      const word = words[Math.floor(Math.random() * words.length)];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      return `${word}${symbol}${num}`;
    } else if (preset === 'strong') {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
      let pass = '';
      for (let i = 0; i < 10; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
    } else {
      // PIN / Simple
      const words = ['Kaam', 'User', 'Pro', 'Seva'];
      const word = words[Math.floor(Math.random() * words.length)];
      const year = 2026;
      return `${word}${year}`;
    }
  };

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: 'खाली', color: 'bg-stone-200 text-stone-400' };
    let score = 0;
    if (newPassword.length >= 6) score += 1;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    if (score <= 2) return { score, label: 'सामान्य / Fair', color: 'bg-amber-400 text-amber-950' };
    if (score <= 4) return { score, label: 'मजबूत / Strong', color: 'bg-emerald-500 text-white' };
    return { score, label: 'अति-सुरक्षित / Very Strong', color: 'bg-emerald-600 text-white' };
  }, [newPassword]);

  // Load Users & Audit Logs (bounded & quota-guarded)
  const fetchData = async () => {
    if (isResourceExhausted()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Users (capped to 50)
      const snap = await getDocs(query(collection(db, 'users'), limit(50)));
      const list: any[] = [];
      snap.forEach((d) => list.push({ uid: d.id, ...d.data() }));
      setUsers(list);

      // 2. Fetch Reset Requests (capped to 25)
      const reqSnap = await getDocs(query(collection(db, 'password_reset_requests'), limit(25)));
      const reqList: PasswordResetRequest[] = [];
      reqSnap.forEach((d) => reqList.push({ id: d.id, ...d.data() } as PasswordResetRequest));
      setResetRequests(reqList);

      // 3. Fetch Recent Audit Logs for Manual Password Resets (capped to 25)
      try {
        const auditSnap = await getDocs(query(collection(db, 'audit_logs'), limit(25)));
        const resets: ResetLogItem[] = [];
        auditSnap.forEach((d) => {
          const data = d.data();
          if (data.action === 'ADMIN_CREDENTIAL_RESET' || data.action === 'MANUAL_PASSWORD_RESET') {
            resets.push({
              id: d.id,
              targetUserId: data.targetUserId,
              targetUserName: data.targetUserName || 'User',
              targetEmail: data.targetEmail || '',
              assignedPassword: data.newAssignedPassword || data.assignedPassword || '',
              performedBy: data.actor || 'DEEPAK',
              timestamp: data.timestamp || new Date().toISOString(),
              note: data.note || data.notes || '',
              requirePasswordChange: data.requirePasswordChange || false,
            });
          }
        });
        resets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setRecentResets(resets.slice(0, 8));
      } catch (aErr) {
        console.warn('Audit logs read notice:', aErr);
        checkAndHandleQuotaError(aErr);
      }
    } catch (err) {
      console.warn('Manual reset utility fetch notice:', err);
      checkAndHandleQuotaError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update selected user when prop changes
  useEffect(() => {
    if (initialSelectedUser) {
      selectUser(initialSelectedUser);
    } else if (!selectedUser && users.length > 0) {
      // Don't auto select unless requested
    }
  }, [initialSelectedUser, users]);

  const selectUser = (user: any) => {
    setSelectedUser(user);
    setCustomDisplayName(user.name || '');
    setNewPassword(generatePassword(generatorPreset));
    setErrorMsg(null);
    setSuccessInfo(null);
    setIsDropdownOpen(false);
  };

  // Filtered users for search
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesRole;
      const matchesSearch =
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.uid && u.uid.toLowerCase().includes(q));
      return matchesRole && matchesSearch;
    });
  }, [users, searchQuery, roleFilter]);

  // Execute Password Reset
  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      setErrorMsg('कृपया पहले उस उपयोगकर्ता को चुनें जिसका पासवर्ड रीसेट करना है।');
      return;
    }
    if (!newPassword || newPassword.trim().length < 4) {
      setErrorMsg('कृपया कम से कम 4 अक्षरों का वैध पासवर्ड दर्ज करें।');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const finalName = updateDisplayName && customDisplayName.trim()
      ? customDisplayName.trim()
      : selectedUser.name || 'User';
    const finalPassword = newPassword.trim();

    try {
      // 1. Update user via Auth Context
      await adminChangeUserCredentials(
        selectedUser.uid,
        finalName,
        selectedUser.email || '',
        finalPassword,
        selectedUser.role
      );

      // 2. Extra metadata on user document (never store plaintext passwords)
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, {
        passwordUpdatedAt: new Date().toISOString(),
        passwordResetBy: 'DEEPAK',
        requirePasswordChange: requirePasswordChange,
        resetRequested: false,
      });

      // 3. Log into audit_logs specifically with details (without plaintext password)
      try {
        const auditDocId = 'aud_pwd_' + Date.now();
        await setDoc(doc(db, 'audit_logs', auditDocId), {
          id: auditDocId,
          action: 'MANUAL_PASSWORD_RESET',
          actor: 'DEEPAK',
          actorEmail: 'deepakbuildconbhopal@gmail.com',
          actorRole: 'admin',
          targetUserId: selectedUser.uid,
          targetUserName: finalName,
          targetEmail: selectedUser.email || '',
          targetRole: selectedUser.role || 'customer',
          requirePasswordChange: requirePasswordChange,
          note: adminNote.trim() || 'Manual reset performed from Admin Utility',
          timestamp: new Date().toISOString(),
        });

        // Add to local recent resets state
        setRecentResets((prev) => [
          {
            id: auditDocId,
            targetUserId: selectedUser.uid,
            targetUserName: finalName,
            targetEmail: selectedUser.email || '',
            performedBy: 'DEEPAK',
            timestamp: new Date().toISOString(),
            note: adminNote.trim(),
            requirePasswordChange,
          },
          ...prev.slice(0, 7),
        ]);
      } catch (logErr) {
        console.warn('Audit logging note:', logErr);
      }

      // 4. Update local user state
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === selectedUser.uid
            ? {
                ...u,
                name: finalName,
                passwordUpdatedAt: new Date().toISOString(),
                resetRequested: false,
              }
            : u
        )
      );

      const updatedUserObj = {
        ...selectedUser,
        name: finalName,
      };
      setSelectedUser(updatedUserObj);

      // 5. Trigger success state
      setSuccessInfo({
        user: updatedUserObj,
        passwordAssigned: '•••••••• (Firebase Auth)',
        timestamp: new Date().toISOString(),
      });

      if (onSuccessReset) {
        onSuccessReset(updatedUserObj);
      }
    } catch (err: any) {
      console.error('Password reset execution error:', err);
      setErrorMsg(err.message || 'पासवर्ड रीसेट करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setSubmitting(false);
    }
  };

  // Copy helper
  const copyFormattedCredentials = (user: any, pass: string) => {
    const text = `HARDINKAAM User Account Access:\n━━━━━━━━━━━━━━━━━━\n👤 Name / Username: ${user.name}\n📧 Email / Login ID: ${user.email || '—'}\n📱 Mobile: ${user.phone || '—'}\n🔑 New Password: ${pass}\n🌐 Sign In Portal: ${window.location.origin}\n━━━━━━━━━━━━━━━━━━\nनोट: कृपया लॉगिन करने के पश्चात अपना पासवर्ड सुरक्षित रखें।`;
    navigator.clipboard.writeText(text);
    setCopiedKey('all');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyOnlyPassword = (pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedKey('pass_only');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const shareViaWhatsApp = (user: any, pass: string) => {
    const cleanPhone = user.phone ? user.phone.replace(/[^0-9]/g, '') : '';
    const message = encodeURIComponent(
      `नमस्ते ${user.name},\n\nHARDINKAAM में आपका लॉगिन पासवर्ड एडमिन DEEPAK द्वारा सफलतापूर्वक रीसेट कर दिया गया है:\n\n👤 यूजरनेम: ${user.name}\n📧 लॉगिन ईमेल: ${user.email}\n🔑 नया पासवर्ड: ${pass}\n\n🌐 यहां लॉगिन करें: ${window.location.origin}\n\nकिसी भी सहायता के लिए संपर्क करें: +91 62675 46945`
    );
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(targetUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Utility Hero Header */}
      <div className="bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-amber-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>Administrative Authority Console</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <KeyRound className="w-6 h-6 text-amber-400" />
              <span>मैनुअल पासवर्ड रीसेट यूटिलिटी / Manual Password Reset Tool</span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1.5 max-w-2xl leading-relaxed">
              प्रशासक <strong>DEEPAK</strong> विशेष नियंत्रण: किसी भी पंजीकृत उपयोगकर्ता (कारीगर, ग्राहक, फ्रेंचाइजी पार्टनर) का पासवर्ड तुरंत बदलें, सुरक्षित पासवर्ड जनरेट करें तथा क्रेडेंशियल्स तुरंत WhatsApp या SMS द्वारा साझा करें।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-white/10"
              title="Refresh users and audit logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>डेटा रिफ्रेश</span>
            </button>
            {onNavigateToUserList && (
              <button
                type="button"
                onClick={onNavigateToUserList}
                className="px-4 py-2 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-stone-700"
              >
                <span>सभी यूजर सूची देखें</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Banner inside Utility */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">कुल पंजीकृत यूजर</span>
            <div className="text-xl font-black text-white mt-0.5">{users.length}</div>
          </div>
          <div className="bg-orange-500/10 rounded-2xl p-3 border border-orange-500/20">
            <span className="text-[10px] text-orange-300 uppercase font-bold tracking-wider">लंबित रीसेट अनुरोध</span>
            <div className="text-xl font-black text-orange-400 mt-0.5">
              {resetRequests.filter((r) => r.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">सर्विस प्रो (कारीगर)</span>
            <div className="text-xl font-black text-blue-400 mt-0.5">
              {users.filter((u) => u.role === 'service_man').length}
            </div>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">हालिया रीसेट लॉग</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{recentResets.length}</div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: User Selection & Manual Reset Engine (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Select Registered User */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center text-xs font-black">
                  1
                </div>
                <h3 className="text-sm font-black text-stone-900">
                  उपयोगकर्ता का चयन करें / Select Target User
                </h3>
              </div>
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setSuccessInfo(null);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 font-bold cursor-pointer"
                >
                  बदलें (Change)
                </button>
              )}
            </div>

            {/* User Search & Dropdown */}
            <div className="relative">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  id="manual-reset-user-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder="नाम, ईमेल पता, मोबाइल नंबर या UID टाइप करें..."
                  className="w-full pl-10 pr-10 py-3 text-xs rounded-2xl bg-stone-50 border border-stone-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3.5 text-stone-400 hover:text-stone-600 text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1.5 pt-2 overflow-x-auto no-scrollbar">
                {(['all', 'customer', 'service_man', 'business_partner', 'admin'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRoleFilter(r);
                      setIsDropdownOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                      roleFilter === r
                        ? 'bg-stone-900 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {r === 'all'
                      ? 'सभी'
                      : r === 'service_man'
                      ? 'कारीगर (Pro)'
                      : r === 'customer'
                      ? 'ग्राहक'
                      : r === 'business_partner'
                      ? 'पार्टनर'
                      : 'एडमिन'}
                  </button>
                ))}
              </div>

              {/* Search Suggestions Dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-stone-200 z-30 max-h-64 overflow-y-auto divide-y divide-stone-100">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-stone-400">
                      कोई उपयोगकर्ता नहीं मिला।
                    </div>
                  ) : (
                    filteredUsers.map((u) => {
                      const isSelected = selectedUser?.uid === u.uid;
                      const hasPendingReset = u.resetRequested || resetRequests.some(r => r.status === 'pending' && (r.userId === u.uid || r.emailOrUsername === u.email));
                      return (
                        <div
                          key={u.uid}
                          onClick={() => selectUser(u)}
                          className={`p-3 flex items-center justify-between hover:bg-amber-50/60 cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-50 ring-1 ring-amber-400' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center border border-stone-200 shrink-0">
                              {u.name?.charAt(0) || u.email?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                                <span>{u.name || 'Anonymous User'}</span>
                                {hasPendingReset && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-800 text-[9px] font-black border border-orange-200">
                                    रीसेट लंबित
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 flex items-center gap-2">
                                <span>{u.email || 'No email'}</span>
                                {u.phone && <span>• {u.phone}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.role === 'admin'
                                  ? 'bg-amber-100 text-amber-900'
                                  : u.role === 'service_man'
                                  ? 'bg-blue-100 text-blue-900'
                                  : u.role === 'business_partner'
                                  ? 'bg-purple-100 text-purple-900'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {u.role}
                            </span>
                            <span className="text-xs text-amber-600 font-bold">चुनें</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected User Showcase Card */}
            {selectedUser ? (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-black text-base flex items-center justify-center shadow-xs">
                      {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-stone-900 text-sm">{selectedUser.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            selectedUser.role === 'admin'
                              ? 'bg-amber-200 text-amber-950'
                              : selectedUser.role === 'service_man'
                              ? 'bg-blue-100 text-blue-900'
                              : selectedUser.role === 'business_partner'
                              ? 'bg-purple-100 text-purple-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {selectedUser.role}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-stone-400" />
                          {selectedUser.email || '—'}
                        </span>
                        {selectedUser.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-stone-400" />
                            {selectedUser.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Authentication Security Status */}
                  <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-amber-200/60">
                    <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                      सुरक्षा प्रमाणीकरण स्थिति
                    </div>
                    <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Firebase Auth (Encrypted)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 text-center text-xs text-stone-500">
                पासवर्ड रीसेट करने के लिए ऊपर सर्च बार से किसी उपयोगकर्ता को चुनें या नीचे दी गई सूची से चयन करें।
              </div>
            )}
          </div>

          {/* STEP 2: Password Reset Engine Form */}
          <form
            onSubmit={handleExecuteReset}
            className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-900 flex items-center justify-center text-xs font-black">
                  2
                </div>
                <h3 className="text-sm font-black text-stone-900">
                  नया पासवर्ड कॉन्फ़िगर करें / Configure New Password
                </h3>
              </div>
              <span className="text-[11px] text-stone-500 font-bold">Admin Override</span>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 text-red-800 border border-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Generator Presets Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>पासवर्ड जनरेटर प्रीसेट / Generator Preset</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generatePassword(generatorPreset))}
                  className="inline-flex items-center gap-1 text-[11px] text-amber-800 hover:text-amber-950 font-bold cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-amber-600" />
                  <span>पुनः जनरेट करें (Regenerate)</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGeneratorPreset('memorable');
                    setNewPassword(generatePassword('memorable'));
                  }}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                    generatorPreset === 'memorable'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-[11px] font-black">यादगार (Memorable)</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">Kaam#8291</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGeneratorPreset('strong');
                    setNewPassword(generatePassword('strong'));
                  }}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                    generatorPreset === 'strong'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-[11px] font-black">जटिल (Strong)</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">Hrd@839!Xz</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGeneratorPreset('pin');
                    setNewPassword(generatePassword('pin'));
                  }}
                  className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-left ${
                    generatorPreset === 'pin'
                      ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <div className="text-[11px] font-black">सरल (Simple)</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">Kaam2026</div>
                </button>
              </div>
            </div>

            {/* Password Input with Visibility and Strength */}
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1.5">
                नया पासवर्ड / New Password Value
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                <input
                  id="manual-reset-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="नया पासवर्ड टाइप करें..."
                  className="w-full pl-10 pr-20 py-3 text-sm rounded-2xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono font-black text-stone-900 bg-white"
                />
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => copyOnlyPassword(newPassword)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                    title="पासवर्ड कॉपी करें"
                  >
                    {copiedKey === 'pass_only' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                    title={showPassword ? 'पासवर्ड छुपाएं' : 'पासवर्ड देखें'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-stone-500">मजबूती:</span>
                  <span className={`px-2 py-0.2 rounded-full font-bold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <span className="text-stone-400 font-mono text-[10px]">
                  {newPassword.length} वर्ण
                </span>
              </div>
            </div>

            {/* Optional: Update Username / Display Name */}
            <div className="pt-2 border-t border-stone-100 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={updateDisplayName}
                  onChange={(e) => setUpdateDisplayName(e.target.checked)}
                  className="rounded-md border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-stone-800">
                  यूजर का नाम / यूजरनेम भी अपडेट करें (Optional)
                </span>
              </label>

              {updateDisplayName && (
                <div className="pl-6 space-y-1 animate-in fade-in duration-150">
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={customDisplayName}
                      onChange={(e) => setCustomDisplayName(e.target.value)}
                      placeholder="संशोधित नाम या यूजरनेम दर्ज करें"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-stone-500">
                    यूजर ईमेल के स्थान पर इस नाम को भी लॉगिन आईडी के रूप में इस्तेमाल कर सकेगा।
                  </p>
                </div>
              )}

              {/* Require Password Change on next login */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requirePasswordChange}
                  onChange={(e) => setRequirePasswordChange(e.target.checked)}
                  className="rounded-md border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-medium text-stone-700">
                  यूजर को पहली लॉगिन पर अपना पासवर्ड बदलने का निर्देश दें (Require Password Change)
                </span>
              </label>

              {/* Admin Audit Note */}
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  प्रशासनिक ऑडिट नोट (वैकल्पिक / Optional)
                </label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="उदा. ग्राहक द्वारा फ़ोन पर अनुरोध, शाखा सत्यापन, या ईमेल टिकट #482"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-stone-800"
                />
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-3">
              <button
                id="manual-reset-submit-btn"
                type="submit"
                disabled={submitting || !selectedUser || !newPassword}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-black text-sm transition-all cursor-pointer shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
              >
                <KeyRound className="w-4 h-4 text-stone-950" />
                <span>
                  {submitting
                    ? 'पासवर्ड अपडेट कर रहे हैं...'
                    : selectedUser
                    ? `पासवर्ड तुरंत रीसेट व सक्रिय करें (${selectedUser.name})`
                    : 'उपयोगकर्ता चुनें और पासवर्ड रीसेट करें'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Instant Credentials Card & Recent Resets History (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Post-Reset Credentials Dispatch Box */}
          {successInfo ? (
            <div className="bg-gradient-to-br from-emerald-950 via-stone-900 to-emerald-900 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/40 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>पासवर्ड सफलतापूर्वक अपडेट हुआ!</span>
              </div>
              <h3 className="text-lg font-black text-white">
                क्रेडेंशियल्स जारी कार्ड / Credentials Dispatch Card
              </h3>
              <p className="text-xs text-stone-300 mt-1">
                नया पासवर्ड तुरंत सक्रिय हो चुका है। आप इसे सीधे यूजर के साथ साझा कर सकते हैं।
              </p>

              {/* Credential Data Container */}
              <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5 font-mono text-xs text-stone-200">
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-stone-400 text-[11px]">User / Name:</span>
                  <span className="font-bold text-white">{successInfo.user.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-stone-400 text-[11px]">Email / Login:</span>
                  <span className="font-bold text-white">{successInfo.user.email || '—'}</span>
                </div>
                {successInfo.user.phone && (
                  <div className="flex justify-between items-center py-1 border-b border-white/10">
                    <span className="text-stone-400 text-[11px]">Mobile Phone:</span>
                    <span className="font-bold text-white">{successInfo.user.phone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-1 border-b border-white/10">
                  <span className="text-stone-400 text-[11px]">New Password:</span>
                  <span className="font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-md">
                    {successInfo.passwordAssigned}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 text-[11px]">
                  <span className="text-stone-400">Portal:</span>
                  <span className="text-stone-300 truncate max-w-[180px]">{window.location.origin}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyFormattedCredentials(successInfo.user, successInfo.passwordAssigned)
                    }
                    className="py-2.5 px-3 rounded-xl bg-white text-stone-900 hover:bg-stone-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    {copiedKey === 'all' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>कॉपी हो गया!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>क्रेडेंशियल्स कॉपी</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      shareViaWhatsApp(successInfo.user, successInfo.passwordAssigned)
                    }
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp भेजें</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSuccessInfo(null);
                    setSelectedUser(null);
                    setNewPassword(generatePassword(generatorPreset));
                  }}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  अन्य यूजर का पासवर्ड रीसेट करें
                </button>
              </div>
            </div>
          ) : (
            /* Helper Tips Card */
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-amber-800">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <h3 className="text-sm font-black text-stone-900">
                  प्रशासनिक निर्देश / Guidelines for Password Reset
                </h3>
              </div>
              <ul className="space-y-2.5 text-xs text-stone-600 leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>पूर्ण स्वायत्तता (Full Control):</strong> एडमिन DEEPAK किसी भी समय बिना किसी ओटीपी के किसी भी खाते का क्रेडेंशियल बदल सकते हैं।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>तत्काल सक्रियता (Instant Access):</strong> पासवर्ड बदलते ही डेटाबेस में तुरंत अपडेट हो जाता है और यूजर तुरंत नए पासवर्ड से लॉगिन कर सकता है।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>लॉगिन पहचानकर्ता (Login ID):</strong> यूजर अपने पंजीकृत ईमेल अथवा असाइन किए गए नाम/यूजरनेम दोनों में से किसी से भी लॉगिन कर सकता है।
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ऑडिट रिकॉर्ड (Audit Trail):</strong> प्रत्येक रीसेट की प्रविष्टि <code>audit_logs</code> में सुरक्षित रूप से दर्ज होती है।
                  </span>
                </li>
              </ul>
            </div>
          )}

          {/* Recent Resets History List */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-stone-600" />
                <h3 className="text-xs font-black text-stone-900 uppercase tracking-wider">
                  हालिया रीसेट गतिविधि / Recent Admin Resets
                </h3>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">
                {recentResets.length} प्रविष्टियां
              </span>
            </div>

            <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto no-scrollbar">
              {recentResets.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  अभी तक कोई हालिया रीसेट लॉग दर्ज नहीं है।
                </div>
              ) : (
                recentResets.map((item) => (
                  <div key={item.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-stone-900 flex items-center gap-1.5">
                        <span>{item.targetUserName}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          रीसेट सफल
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500">{item.targetEmail || '—'}</div>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.timestamp).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.note && <span className="italic">• {item.note}</span>}
                      </div>
                    </div>

                    {item.assignedPassword && (
                      <button
                        type="button"
                        onClick={() => copyOnlyPassword(item.assignedPassword!)}
                        className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                        title="पासवर्ड कॉपी करें"
                      >
                        <Copy className="w-3 h-3" />
                        <span>कॉपी</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

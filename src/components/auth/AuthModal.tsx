import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, CheckCircle2, Shield, Wrench, Briefcase, UserCheck, KeyRound, ArrowLeft, CreditCard, Sparkles, Building2, ExternalLink, ChevronRight, Banknote, MessageSquare } from 'lucide-react';
import { useAuth, normalizePhoneDigits } from '../../context/AuthContext';
import { UserRole, REGISTRATION_FEES } from '../../types';
import { BusinessPartnerRegistrationModal } from '../partner/BusinessPartnerRegistrationModal';
import { MembershipSuccessModal } from '../common/MembershipSuccessModal';
import { PhotoCaptureWidget } from '../common/PhotoCaptureWidget';
import { MemberNotificationResult } from '../../services/memberNotificationService';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { ForgotPasswordModal } from './ForgotPasswordModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (role: UserRole) => void;
  defaultRole?: UserRole;
  defaultMode?: 'in' | 'reg';
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, defaultRole = 'customer', defaultMode }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, payRegistrationFee, quickDemoLogin } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [regStep, setRegStep] = useState<1 | 2>(1); // Multi-step registration: 1 = Role selection, 2 = Role-specific form fields
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [noCriminalRecordOath, setNoCriminalRecordOath] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [membershipResult, setMembershipResult] = useState<MemberNotificationResult | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cash'>('cash');
  const [cashApprovalPendingResult, setCashApprovalPendingResult] = useState<{
    name: string;
    phone: string;
    role: UserRole;
    amount: number;
    memberCode?: string;
  } | null>(null);

  // Sync role and register tab when modal opens or defaultRole changes
  useEffect(() => {
    if (isOpen) {
      if (defaultRole) {
        setRole(defaultRole);
      }
      if (defaultMode === 'reg') {
        setIsRegister(true);
        setRegStep(2);
      } else {
        // Default to Sign In mode cleanly when defaultMode is 'in' or unspecified
        setIsRegister(false);
        setRegStep(1);
      }
      setShowPartnerModal(false);
      setMembershipResult(null);
      setCashApprovalPendingResult(null);
      setError(null);
    }
  }, [isOpen, defaultRole, defaultMode]);

  if (!isOpen) return null;

  const registrationFee = REGISTRATION_FEES[role] || 121;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name / कृपया पूरा नाम दर्ज करें');
        if (!fatherName.trim()) throw new Error('कृपया पिता का नाम दर्ज करें / Please enter Father\'s name');
        if (!motherName.trim()) throw new Error('कृपया माता का नाम दर्ज करें / Please enter Mother\'s name');
        if (!noCriminalRecordOath) {
          throw new Error('रजिस्ट्रेशन के लिए आपराधिक रिकॉर्ड न होने की शपथ (I take an oath that I don\'t have any criminal record) पर टिक करना अनिवार्य है।');
        }
        if (!email.trim() && !phone.trim()) throw new Error('Please enter an email address or mobile number / कृपया ईमेल या मोबाइल नंबर दर्ज करें');
        if (phone.trim() && !normalizePhoneDigits(phone)) {
          throw new Error('कृपया सही 10-अंकीय भारतीय मोबाइल नंबर दर्ज करें। / Please enter a valid 10-digit Indian mobile number.');
        }
        if (email.trim() && !email.includes('@') && !normalizePhoneDigits(email)) {
          throw new Error('कृपया सही 10-अंकीय भारतीय मोबाइल नंबर या वैध ईमेल दर्ज करें। / Please enter a valid 10-digit Indian mobile number or email.');
        }
        if (password.length < 6) throw new Error('Password must be at least 6 characters / पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');

        // Administrator accounts cannot be registered publicly
        if (role === 'admin' || (role as string) === 'super_admin') {
          throw new Error('सुरक्षा प्रतिबंध: व्यवस्थापक (Admin) खाते सार्वजनिक रूप से पंजीकृत नहीं किए जा सकते। / Security restriction: Administrator accounts cannot be registered publicly.');
        }

        setLoading(true);

        // If Cash payment chosen: Register with pending approval and notify admin immediately
        if (paymentMethod === 'cash') {
          const signupRes = await signUpWithEmail(name, email, password, role, phone, {
            avatar: photo,
            fatherName,
            motherName,
            noCriminalRecordOath: true,
            amount: registrationFee,
            paymentMethod: 'cash',
            isCash: true,
          });

          setLoading(false);
          setCashApprovalPendingResult({
            name,
            phone: phone || email,
            role,
            amount: registrationFee,
            memberCode: signupRes?.profile?.memberCode,
          });
          return;
        }

        // Online payment flow disabled in Phase 1
        setLoading(false);
        setError('ऑनलाइन भुगतान (Razorpay) वर्तमान में बंद है। कृपया "नकद / ऑफ़लाइन (Cash - Pending Approval)" विकल्प से रजिस्ट्रेशन करें।');
        return;
      } else {
        if (!email.trim() || !password) throw new Error('Please enter phone/email/username and password');
        setLoading(true);
        await signInWithEmail(email, password);
        setLoading(false);
        if (onSuccess) onSuccess(role);
        else onClose();
      }
    } catch (err: any) {
      setLoading(false);
      const errCode = err?.code || '';
      const errMsg = typeof err === 'string' ? err : (err?.message || '');

      // 1. Wrong password
      if (errCode === 'auth/wrong-password') {
        setError('गलत पासवर्ड। कृपया पुनः प्रयास करें। / Incorrect password. Please try again.');
      } else if (errCode === 'auth/invalid-credential') {
        setError('गलत मोबाइल नंबर, ईमेल या पासवर्ड। कृपया पुनः प्रयास करें। / Invalid credentials or incorrect password. Please try again.');
      // 2. Account not found
      } else if (errCode === 'auth/user-not-found') {
        setError('अकाउंट नहीं मिला। कृपया अपना मोबाइल नंबर या ईमेल जांचें अथवा नया अकाउंट बनाएं। / Account not found. Please register or verify your details.');
      // 3. Disabled account
      } else if (errCode === 'auth/user-disabled') {
        setError('यह अकाउंट निष्क्रिय (disabled) कर दिया गया है। कृपया सहायता से संपर्क करें। / This account has been disabled. Please contact support.');
      // 4. Network failure
      } else if (
        errCode === 'auth/network-request-failed' ||
        errMsg.toLowerCase().includes('network') ||
        errMsg.toLowerCase().includes('failed to fetch') ||
        errMsg.toLowerCase().includes('offline')
      ) {
        setError('नेटवर्क त्रुटि। कृपया इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें। / Network connection failed. Please check your internet connection and retry.');
      // Other standard Firebase auth codes
      } else if (errCode === 'auth/email-already-in-use') {
        setError('यह मोबाइल नंबर या ईमेल पहले से रजिस्टर्ड है। कृपया लॉगिन करें। / Account already registered. Please sign in.');
      } else if (errCode === 'auth/weak-password') {
        setError('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए। / Password must be at least 6 characters.');
      } else if (errCode === 'auth/invalid-email') {
        setError('कृपया सही 10-अंकीय मोबाइल नंबर या वैध ईमेल दर्ज करें। / Please enter a valid 10-digit mobile number or email address.');
      } else if (errCode === 'auth/too-many-requests') {
        setError('बहुत अधिक असफल प्रयास। कृपया कुछ मिनट बाद पुनः प्रयास करें। / Too many attempts. Please try again later.');
      } else if (errCode === 'auth/operation-not-allowed' || errMsg.includes('operation-not-allowed')) {
        setError('ईमेल/पासवर्ड प्रमाणीकरण अभी सक्षम नहीं है। / Email/Password provider is not yet enabled. Please try another method.');
      } else if (
        errMsg.includes('Unexpected token') ||
        errMsg.includes('not valid JSON') ||
        errMsg.includes('<!doctype') ||
        errMsg.includes('is not valid JSON')
      ) {
        setError('भुगतान सर्वर से कनेक्ट करने में समस्या आई। कृपया पुनः प्रयास करें। / Payment gateway service temporarily unreachable. Please retry.');
      // 5. Direct error message display without suppressing details
      } else {
        setError(errMsg || 'प्रमाणीकरण विफल रहा। कृपया अपनी जानकारी जांचकर पुनः प्रयास करें। / Authentication failed. Please check your details and try again.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(role);
      if (onSuccess) onSuccess(role);
      else onClose();
    } catch (err: any) {
      const gMsg = err?.message || '';
      if (err?.code === 'auth/registration-required' || gMsg.includes('रजिस्ट्रेशन पूरा नहीं')) {
        if (err?.googleUser) {
          if (err.googleUser.displayName) setName(err.googleUser.displayName);
          if (err.googleUser.email) setEmail(err.googleUser.email);
          if (err.googleUser.phoneNumber) setPhone(err.googleUser.phoneNumber);
        }
        setIsRegister(true);
        setRegStep(2);
        setError('Google अकाउंट सत्यापित! आपका रजिस्ट्रेशन अभी पूरा नहीं हुआ है। कृपया नीचे रजिस्ट्रेशन शुल्क का भुगतान करके अपना अकाउंट एक्टिवेट करें।');
      } else {
        const isRawError = /firebase|auth\/|stack|error \(/i.test(gMsg);
        setError(gMsg && !isRawError ? gMsg : 'Google प्रमाणीकरण विफल रहा। कृपया पुनः प्रयास करें। / Google authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain">
      <div
        id="auth-modal-card"
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200 my-auto flex flex-col"
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 text-white relative">
          <button
            id="close-auth-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-2xl tracking-tight">HARDINKAAM</span>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
              हर दिन काम
            </span>
          </div>
          <p className="text-orange-100 text-xs mt-1 font-medium">
            {isForgotPassword
              ? 'Password Recovery / पासवर्ड रीसेट'
              : isRegister && regStep === 1
              ? 'Step 1: Select your role to join HARDINKAAM'
              : isRegister && regStep === 2
              ? `Step 2: Enter details for ${role === 'service_man' ? 'Service Pro' : role === 'business_partner' ? 'Brand Partner' : 'Customer'}`
              : 'Sign in to manage your services and bookings'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain min-h-0">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              <div>{error}</div>
              {error.includes('रजिस्टर्ड है') || error.includes('already registered') || error.includes('auth/email-already-in-use') ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError(null);
                  }}
                  className="mt-2 w-full py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>लॉगिन स्क्रीन पर जाएं / Switch to Sign In</span>
                </button>
              ) : error.includes('गलत') || error.includes('invalid-credential') || error.includes('Incorrect password') ? (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError(null);
                    }}
                    className="flex-1 py-1.5 px-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                  >
                    पासवर्ड भूल गए? / Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setRegStep(1);
                      setError(null);
                    }}
                    className="flex-1 py-1.5 px-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer text-center"
                  >
                    नया अकाउंट बनाएं / Register
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* Multi-Step Registration: Step 1 - Designation / Role Selection */}
          {isRegister && regStep === 1 ? (
            /* Multi-Step Registration: Step 1 - Designation / Role Selection */
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center pb-1">
                <h3 className="text-sm font-black text-stone-900">
                  आप HARDINKAAM से किस रूप में जुड़ना चाहते हैं?
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Choose your role to get tailored benefits and registration details
                </p>
              </div>

              <div className="space-y-2.5">
                {/* 1. Customer */}
                <button
                  type="button"
                  onClick={() => {
                    setRole('customer');
                    setRegStep(2);
                    setError(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                    role === 'customer'
                      ? 'border-orange-500 bg-orange-50/50 shadow-md'
                      : 'border-stone-200 hover:border-orange-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-stone-900">Customer (ग्राहक)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">₹121 Fee</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        घरेलू सेवा बुकिंग, आजीवन सुरक्षा गारंटी, प्रायोरिटी डिस्पैच व सुरक्षित बुकिंग एक्सेस।
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-orange-600 shrink-0" />
                </button>

                {/* 2. Serviceman */}
                <button
                  type="button"
                  onClick={() => {
                    setRole('service_man');
                    setRegStep(2);
                    setError(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                    role === 'service_man'
                      ? 'border-orange-500 bg-orange-50/50 shadow-md'
                      : 'border-stone-200 hover:border-orange-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-stone-900">Serviceman / Technician (सर्विसमैन)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">₹121 Fee</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        दैनिक जॉब लीड्स, वेरीफाइड बैज, डिजिटल आईडी कार्ड और सीधी कमाई।
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-orange-600 shrink-0" />
                </button>

                {/* 3. Business Partner */}
                <button
                  type="button"
                  onClick={() => {
                    setRole('business_partner');
                    setRegStep(2);
                    setError(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                    role === 'business_partner'
                      ? 'border-purple-500 bg-purple-50/50 shadow-md'
                      : 'border-stone-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-stone-900">Brand Partner / Franchise (पार्टनर)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">₹1,021 Fee</span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                        डिस्टिक फ़्रैंचाइज़ी अधिकार, फ्लीट मॉनिटरिंग, रेवेन्यू शेयर और पार्टनर पोर्टल।
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-purple-600 shrink-0" />
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setRegStep(1);
                    setError(null);
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-semibold cursor-pointer"
                >
                  Already have an account? Sign In / पहले से खाता है? लॉगिन करें
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Google Button (only shown for sign in or step 2 if desired) */}
              {!isRegister && (
                <>
                  <button
                    id="google-signin-btn"
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition-colors mb-4 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27a7.27 7.27 0 0 1 0-4.54V6.58H1.26a11.97 11.97 0 0 0 0 10.84l4.02-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <div className="relative flex py-2 items-center mb-4">
                    <div className="grow border-t border-stone-200"></div>
                    <span className="shrink mx-3 text-stone-400 text-[11px] font-medium uppercase">Or with email / username</span>
                    <div className="grow border-t border-stone-200"></div>
                  </div>
                </>
              )}

              {/* Selected Role Indicator & Back to Step 1 when registering */}
              {isRegister && !isForgotPassword && (
                <div className="mb-3.5 flex items-center justify-between bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
                    <span className="text-xs font-bold text-orange-900">
                      चयनित भूमिका: {role === 'service_man' ? 'Service Pro / सर्विसमैन' : role === 'business_partner' ? 'Brand Partner / पार्टनर' : 'Customer / कस्टमर'} (₹{registrationFee})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRegStep(1);
                      setError(null);
                    }}
                    className="text-[11px] text-orange-700 hover:text-orange-900 font-bold underline cursor-pointer"
                  >
                    भूमिका बदलें / Change
                  </button>
                </div>
              )}

              {/* Email / Password Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Full Name / आपका पूरा नाम <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                        <input
                          id="auth-name-input"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="उदा. Rajesh Kumar"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          पिता का नाम (Father's Name) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <input
                            id="auth-father-name-input"
                            type="text"
                            required
                            value={fatherName}
                            onChange={(e) => setFatherName(e.target.value)}
                            placeholder="पिता का पूरा नाम"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          माता का नाम (Mother's Name) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <input
                            id="auth-mother-name-input"
                            type="text"
                            required
                            value={motherName}
                            onChange={(e) => setMotherName(e.target.value)}
                            placeholder="माता का पूरा नाम"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {isRegister ? 'Email or Mobile Number / ईमेल या मोबाइल नंबर' : 'Phone, Email or Username / फोन, ईमेल या यूजरनेम'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="auth-email-input"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRegister ? 'name@example.com or 9876543210' : '9876543210 or user@example.com'}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number (Optional / वैकल्पिक फोन)</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        id="auth-phone-input"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98260 00000"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                )}

                {/* Live Camera Photo Capture for Digital ID Card */}
                {isRegister && (
                  <div className="pt-1 pb-1">
                    <PhotoCaptureWidget
                      photo={photo}
                      onPhotoChange={setPhoto}
                      label="ID कार्ड हेतु फोटो (Live Camera / Selfie)"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-stone-700">Password / पासवर्ड</label>
                    {!isRegister && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError(null);
                        }}
                        className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>पासवर्ड भूल गए?</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="auth-password-input"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (min 6 chars)"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {isRegister && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-stone-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          कंपनी रजिस्ट्रेशन शुल्क / Registration Fee:
                        </span>
                        <span className="text-sm font-black text-amber-700 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                          ₹{registrationFee}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        {role === 'business_partner'
                          ? 'बिजनेस पार्टनर पोर्टल लाइसेंस, फ्लीट मॉनिटरिंग व आधिकारिक पार्टनरशिप (₹1021)'
                          : role === 'service_man'
                          ? 'सर्विसमैन ऑनबोर्डिंग, वेरिफाइड बैज और डायरेक्ट कस्टमर लीड्स एक्सेस (₹121)'
                          : 'कस्टमर आजीवन सुरक्षा गारंटी, प्रायोरिटी डिस्पैच व सुरक्षित बुकिंग एक्सेस (₹121)'}
                      </p>
                    </div>

                    {/* Registration Payment Method Options */}
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5">
                        भुगतान का माध्यम चुनें (Payment Option):
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('razorpay')}
                          className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                            paymentMethod === 'razorpay'
                              ? 'bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-500/20 shadow-xs'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <CreditCard className="w-4 h-4 text-orange-600" />
                            <span>ऑनलाइन पेमेंट</span>
                          </div>
                          <span className="text-[10px] text-stone-500 leading-tight">
                            Razorpay / UPI / कार्ड (तुरंत एक्टिवेशन)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod('cash')}
                          className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                            paymentMethod === 'cash'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <Banknote className="w-4 h-4 text-emerald-600" />
                            <span>नकद भुगतान (Cash)</span>
                          </div>
                          <span className="text-[10px] text-stone-500 leading-tight">
                            एडमिन अप्रूवल आवश्यक (Pay to Admin)
                          </span>
                        </button>
                      </div>

                      {paymentMethod === 'cash' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>नकद भुगतान सूचना:</strong> आपका अनुरोध सुपर एडमिन को भेजा जाएगा। एडमिन द्वारा ₹{registrationFee} कैश प्राप्त कर अप्रूव करते ही खाता सक्रिय हो जाएगा।
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isRegister && (
                  <div className="p-3.5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 text-stone-900 shadow-xs">
                    <label className="flex items-start gap-2.5 text-xs text-stone-900 font-semibold cursor-pointer select-none">
                      <input
                        id="auth-criminal-record-oath-checkbox"
                        type="checkbox"
                        required
                        checked={noCriminalRecordOath}
                        onChange={(e) => setNoCriminalRecordOath(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300 cursor-pointer accent-orange-600 shrink-0"
                      />
                      <span className="leading-snug">
                        <strong className="text-stone-900 font-black">शपथ पत्र (Mandatory Declaration): </strong>
                        "I take an oath that I don't have any criminal record" / मैं सत्यनिष्ठा से शपथ लेता/लेती हूँ कि मेरा कोई आपराधिक रिकॉर्ड (Criminal Record) नहीं है।
                        <span className="text-red-600 font-bold ml-1">* (अनिवार्य)</span>
                      </span>
                    </label>
                  </div>
                )}

                {isRegister && role === 'business_partner' && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900">
                    <p className="font-bold">✨ फ़्रैंचाइज़ी/ब्रांड पार्टनर रजिस्ट्रेशन (₹1,021):</p>
                    <p className="text-[11px] text-purple-700 mt-0.5">आपका पार्टनर लाइसेंस व फ़्रैंचाइज़ी पोर्टल पहुँच भुगतान के पश्चात तुरंत सक्षम कर दिया जाएगा।</p>
                  </div>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-white font-bold text-xs transition-all cursor-pointer shadow-md disabled:opacity-60 flex items-center justify-center gap-2 ${
                    isRegister && paymentMethod === 'cash'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
                  }`}
                >
                  {loading ? (
                    'प्रक्रिया जारी है... / Processing...'
                  ) : isRegister ? (
                    paymentMethod === 'cash' ? (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>
                          नकद भुगतान अनुरोध भेजें (Send Cash Request) - ₹{registrationFee}
                        </span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>
                          Pay ₹{registrationFee} &amp; Register {role === 'service_man' ? 'Service Pro' : role === 'business_partner' ? 'Partner' : 'Customer'}
                        </span>
                      </>
                    )
                  ) : (
                    'Sign In to HARDINKAAM'
                  )}
                </button>

               </form>

              {/* Toggle Register / Sign in */}
              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    const nextRegState = !isRegister;
                    setIsRegister(nextRegState);
                    if (nextRegState) {
                      setRegStep(1);
                    }
                    setError(null);
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                >
                  {isRegister ? 'Already have an account? Sign In' : 'New to HARDINKAAM? Create an Account'}
                </button>
              </div>

              {/* Security Notice */}
              <div className="mt-4 pt-3 border-t border-stone-100 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-[11px] font-medium">
                  <Shield className="w-3.5 h-3.5 text-orange-600" />
                  <span>सुरक्षित और अधिकृत एडमिन पोर्टल / Secure &amp; Authorized Portal</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dedicated Business Partner Registration Modal */}
      {showPartnerModal && (
        <BusinessPartnerRegistrationModal
          isOpen={showPartnerModal}
          onClose={() => setShowPartnerModal(false)}
          onSuccess={() => {
            setShowPartnerModal(false);
            onClose();
          }}
        />
      )}

      {/* Instant Membership ID & Notification Confirmation Modal */}
      {membershipResult && (
        <MembershipSuccessModal
          isOpen={Boolean(membershipResult)}
          onClose={() => {
            setMembershipResult(null);
            onClose();
          }}
          notificationResult={membershipResult}
          userName={name || 'सदस्य'}
          userPhone={phone || email}
          photoUrl={photo}
          onProceed={() => {
            setMembershipResult(null);
            onClose();
          }}
        />
      )}

      {/* Cash Registration Pending Admin Approval Modal */}
      {cashApprovalPendingResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider inline-block mb-2">
                ⏳ पेंडिंग एडमिन अप्रूवल (Pending Approval)
              </span>
              <h3 className="text-lg font-black text-stone-900">
                नकद रजिस्ट्रेशन अनुरोध दर्ज हुआ!
              </h3>
              <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
                नमस्ते <strong>{cashApprovalPendingResult.name}</strong>, आपका अकाउंट अनुरोध प्राप्त हो गया है। आपने <strong>₹{cashApprovalPendingResult.amount} नकद (Cash) भुगतान</strong> चुना है।
              </p>
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>खाता प्रकार (Role):</span>
                <span className="font-bold text-stone-900 capitalize">
                  {cashApprovalPendingResult.role === 'service_man' ? 'टेक्नीशियन / सर्विस प्रो' : cashApprovalPendingResult.role === 'business_partner' ? 'बिजनेस पार्टनर' : 'कस्टमर'}
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>भुगतान मोड:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  💵 नकद भुगतान (Cash to Admin)
                </span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>नकद शुल्क (Amount):</span>
                <span className="font-black text-stone-900 text-sm">
                  ₹{cashApprovalPendingResult.amount}
                </span>
              </div>
              {cashApprovalPendingResult.memberCode && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>रेफरेंस कोड:</span>
                  <span className="font-mono font-bold text-orange-700">
                    {cashApprovalPendingResult.memberCode}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left text-[11px] text-blue-900 space-y-1">
              <p className="font-bold">ℹ️ अगली प्रक्रिया:</p>
              <p className="text-blue-800 leading-relaxed">
                सुपर एडमिन (Deepak Buildcon) को आपका अनुरोध भेज दिया गया है। एडमिन द्वारा ₹{cashApprovalPendingResult.amount} कैश प्राप्त कर अप्रूव करते ही आपका खाता तुरंत सक्रिय हो जाएगा।
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/916267546945?text=${encodeURIComponent(
                  `नमस्ते एडमिन सर! मैंने HardinKaam पर ${cashApprovalPendingResult.role} के रूप में ₹${cashApprovalPendingResult.amount} नकद (Cash) रजिस्ट्रेशन अनुरोध भेजा है।\nनाम: ${cashApprovalPendingResult.name}\nफोन: ${cashApprovalPendingResult.phone}\nकोड: ${cashApprovalPendingResult.memberCode || ''}\nकृपया कैश प्राप्त कर मेरा अकाउंट अप्रूव करें।`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <span>💬 WhatsApp एडमिन</span>
              </a>
              <a
                href="tel:+916267546945"
                className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition"
              >
                <span>📞 कॉल हेड ऑफिस</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                setCashApprovalPendingResult(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition cursor-pointer"
            >
              <span>समझ गया, बंद करें (Close)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modern Production-Grade Password Reset Modal */}
      {isForgotPassword && (
        <ForgotPasswordModal
          isOpen={isForgotPassword}
          onClose={() => setIsForgotPassword(false)}
          onBackToLogin={() => setIsForgotPassword(false)}
          initialEmail={email}
          role={role}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, CheckCircle2, Shield, Wrench, Briefcase, UserCheck, KeyRound, ArrowLeft, CreditCard, Sparkles, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole, REGISTRATION_FEES } from '../../types';
import { processRazorpayPayment } from '../../services/razorpayService';
import { BusinessPartnerRegistrationModal } from '../partner/BusinessPartnerRegistrationModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, defaultRole = 'customer' }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, quickDemoLogin, requestPasswordReset } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const registrationFee = REGISTRATION_FEES[role] || 121;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isForgotPassword) {
        if (!email.trim()) throw new Error('कृपया अपना ईमेल या एडमिन यूजरनेम दर्ज करें');
        setLoading(true);
        const res = await requestPasswordReset(email.trim());
        setResetSent(res.message);
        setLoading(false);
        return;
      }

      if (isRegister) {
        if (!name.trim()) throw new Error('Please enter your full name / कृपया पूरा नाम दर्ज करें');
        if (!email.trim()) throw new Error('Please enter an email address / कृपया ईमेल दर्ज करें');
        if (password.length < 6) throw new Error('Password must be at least 6 characters / पासवर्ड कम से कम 6 अक्षरों का होना चाहिए');

        // Check if admin registration
        const isTryingAdmin = role === 'admin' || name.toUpperCase() === 'DEEPAK' || email.toLowerCase() === 'deepakbuildconbhopal@gmail.com';
        if (isTryingAdmin) {
          setLoading(true);
          await signUpWithEmail(name, email, password, 'admin', phone);
          setLoading(false);
          onClose();
          return;
        }

        // Trigger Razorpay Payment for Registration Fee (Customer: ₹121, Service Man: ₹121, Business Partner: ₹1021)
        setLoading(true);
        await processRazorpayPayment({
          amount: registrationFee,
          name: 'HARDINKAAM Private Limited',
          description: `${role === 'business_partner' ? 'Business Partner' : role === 'service_man' ? 'Technician / Service Pro' : 'Customer'} Company Registration Fee`,
          prefill: {
            name,
            email,
            contact: phone || '',
          },
          notes: {
            role,
            purpose: 'registration_fee',
            user_name: name,
            user_email: email,
            registration_charge: String(registrationFee),
          },
          onSuccess: async (payResp) => {
            try {
              await signUpWithEmail(name, email, password, role, phone, {
                paymentId: payResp.payment_id,
                orderId: payResp.order_id,
                amount: registrationFee,
              });
              setLoading(false);
              onClose();
            } catch (signupErr: any) {
              setError(signupErr.message || 'Registration failed after payment verification.');
              setLoading(false);
            }
          },
          onFailure: (payErr) => {
            setError(payErr.description || payErr.reason || 'Razorpay registration fee payment could not be completed.');
            setLoading(false);
          },
          onDismiss: () => {
            setLoading(false);
          },
        });
      } else {
        if (!email.trim() || !password) throw new Error('Please enter email/username and password');
        setLoading(true);
        await signInWithEmail(email, password);
        setLoading(false);
        onClose();
      }
    } catch (err: any) {
      setLoading(false);
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError(
          'Email/Password provider is not yet enabled in the Firebase Console. Please continue with Google or enter credentials.'
        );
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.');
      }
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle(role);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        id="auth-modal-card"
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-100 animate-in fade-in zoom-in-95 duration-200"
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
              : isRegister
              ? 'Join India’s trusted on-demand home service network'
              : 'Sign in to manage your services and bookings'}
          </p>

          {/* Role selector tabs when registering */}
          {isRegister && !isForgotPassword && (
            <div className="grid grid-cols-3 gap-1.5 mt-4 bg-black/15 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  role === 'customer' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setRole('service_man')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  role === 'service_man' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                Service Pro
              </button>
              <button
                type="button"
                onClick={() => setRole('business_partner')}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  role === 'business_partner' ? 'bg-white text-orange-600 shadow-sm' : 'text-white/80 hover:text-white'
                }`}
              >
                Partner
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Forgot Password View */}
          {isForgotPassword ? (
            resetSent ? (
              <div id="forgot-password-success-view" className="space-y-4 py-2 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    रीसेट अनुरोध दर्ज / Request Dispatched!
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    पासवर्ड रिकवरी के निर्देश सफलतापूर्वक भेज दिए गए हैं।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-left text-xs text-emerald-900 space-y-2 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-200/80 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>यदि यह ईमेल Firebase Auth पर पंजीकृत है, तो पासवर्ड रीसेट लिंक इनबॉक्स व स्पैम फोल्डर में पहुंच गया है।</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-200/80 text-emerald-800 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>मुख्य प्रशासक <strong>DEEPAK (+91 98260 12345)</strong> के कंट्रोल डैशबोर्ड पर भी अनुरोध पहुंच गया है। एडमिन किसी भी समय नया पासवर्ड जारी कर सकते हैं।</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    id="forgot-success-back-to-login"
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(null);
                      setError(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-orange-600/20"
                  >
                    लॉगिन स्क्रीन पर वापस जाएं / Back to Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(null);
                      setEmail('');
                    }}
                    className="w-full py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    दूसरा ईमेल या यूजरनेम आज़माएं / Try Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email, Phone or Username / ईमेल, फोन या यूजरनेम
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="forgot-email-input"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. DEEPAK or user@example.com or 9826000000"
                      className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">
                    अपना पंजीकृत ईमेल या यूजरनेम दर्ज करें। आपको पासवर्ड रीसेट लिंक भेजा जाएगा तथा एडमिन कंट्रोल रूम को भी सूचित किया जाएगा। (एडमिन के लिए यूजरनेम: <strong>DEEPAK</strong>)
                  </p>
                </div>

                <button
                  id="submit-forgot-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-md shadow-orange-600/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{loading ? 'भेज रहे हैं...' : 'पासवर्ड रीसेट लिंक भेजें / Send Reset Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setResetSent(null);
                    setError(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-semibold py-2 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>लॉगिन स्क्रीन पर वापस जाएं / Back to Sign In</span>
                </button>
              </form>
            )
          ) : (
            <>
              {/* Google Button */}
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

              {/* Email / Password Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name / पूरा नाम</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        id="auth-name-input"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {isRegister ? 'Email Address' : 'Email or Username / ईमेल या यूजरनेम'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="auth-email-input"
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isRegister ? 'name@example.com' : 'DEEPAK or name@example.com'}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number (Optional)</label>
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
                      placeholder="Enter password"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>
                </div>

                {isRegister && (
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
                    <div className="text-[10px] text-stone-500 flex items-center gap-1 pt-1 border-t border-amber-200/60">
                      <CreditCard className="w-3 h-3 text-emerald-600" />
                      <span>Razorpay द्वारा 100% सुरक्षित भुगतान (UPI / कार्ड / नेटबैंकिंग)</span>
                    </div>
                  </div>
                )}

                {isRegister && role === 'business_partner' && (
                  <button
                    type="button"
                    onClick={() => setShowPartnerModal(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Open Detailed Franchise Partner Registration (₹1,021)</span>
                  </button>
                )}

                <button
                  id="auth-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md shadow-orange-600/20 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    'प्रक्रिया जारी है... / Processing...'
                  ) : isRegister ? (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>
                        Pay ₹{registrationFee} &amp; Register {role === 'service_man' ? 'Service Pro' : role === 'business_partner' ? 'Partner' : 'Customer'}
                      </span>
                    </>
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
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium cursor-pointer"
                >
                  {isRegister ? 'Already have an account? Sign In' : 'New to HARDINKAAM? Create an Account'}
                </button>
              </div>

              {/* Security Notice */}
              <div className="mt-5 pt-4 border-t border-stone-100 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-[11px] font-medium">
                  <Shield className="w-3.5 h-3.5 text-stone-500" />
                  <span>एडमिन लॉगिन केवल 'DEEPAK' के अधिकृत पासवर्ड द्वारा ही संभव है</span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1.5 max-w-xs mx-auto">
                  लॉगिन के बाद ही संबंधित डैशबोर्ड खुलेगा। एडमिन के पास सभी रिकॉर्ड्स देखने व संशोधित करने का पूरा अधिकार है।
                </p>
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
    </div>
  );
};

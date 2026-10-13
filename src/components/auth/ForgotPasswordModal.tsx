import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Shield,
  Send,
  Building2,
  Wrench,
  User,
  ExternalLink,
} from 'lucide-react';
import { UserRole } from '../../types';
import {
  sendOfficialPasswordResetEmail,
  getRemainingCooldown,
  isValidEmailFormat,
} from '../../services/passwordResetService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  initialEmail?: string;
  role?: UserRole;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onBackToLogin,
  initialEmail = '',
  role = 'customer',
}) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [isSuccessView, setIsSuccessView] = useState(false);

  // Initialize email when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEmail && initialEmail.includes('@')) {
        setEmail(initialEmail);
      }
      setStatusMessage(null);
      setErrorMessage(null);
      setIsSuccessView(false);

      if (initialEmail) {
        const remaining = getRemainingCooldown(initialEmail);
        setCooldown(remaining);
      }
    }
  }, [isOpen, initialEmail]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMessage('कृपया अपना पंजीकृत ईमेल पता दर्ज करें।');
      return;
    }

    if (!isValidEmailFormat(trimmed)) {
      setErrorMessage('कृपया एक वैध ईमेल पता दर्ज करें (उदा. user@example.com)।');
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendOfficialPasswordResetEmail(trimmed);
      setStatusMessage(res.message);
      setIsSuccessView(true);
      if (res.cooldownSeconds) {
        setCooldown(res.cooldownSeconds);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'पासवर्ड रीसेट निर्देश भेजने में समस्या आई। कृपया थोड़ी देर बाद पुनः प्रयास करें।'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email.trim()) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await sendOfficialPasswordResetEmail(email.trim());
      setStatusMessage(res.message);
      if (res.cooldownSeconds) {
        setCooldown(res.cooldownSeconds);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'पुनः भेजने में समस्या आई।');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'प्रशासक (Admin)';
      case 'service_man':
        return 'सर्विसमैन (Service Pro)';
      case 'business_partner':
        return 'बिजनेस पार्टनर (Partner)';
      case 'franchise_admin':
        return 'फ्रेंचाइज़ी पार्टनर (Franchise)';
      default:
        return 'ग्राहक (Customer)';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-150">
      <div
        id="forgot-password-card"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 my-auto flex flex-col animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-2xl tracking-tight">HARDINKAAM</span>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              सिक्योरिटी
            </span>
          </div>
          <p className="text-orange-100 text-xs mt-1 font-medium">
            पासवर्ड रीसेट / Password Recovery ({getRoleLabel()})
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccessView ? (
            /* Step 2 & 3: Neutral confirmation & instructions */
            <div className="space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-black text-stone-900">
                  निर्देश भेजे गए / Instructions Dispatched
                </h3>
                <p className="text-xs text-stone-600 mt-2 bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 text-left leading-relaxed">
                  {statusMessage ||
                    'यदि इस ईमेल पते के लिए अकाउंट मौजूद है, तो पासवर्ड रीसेट निर्देश भेज दिए गए हैं। कृपया अपना इनबॉक्स और स्पैम फ़ोल्डर जांचें।'}
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs text-stone-600 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>ईमेल में दिए गए आधिकारिक HARDINKAAM रीसेट लिंक पर क्लिक करें।</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>नया सुरक्षित पासवर्ड (कम से कम 8 अक्षर) बनाएं और पुष्टि करें।</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>वापस आकर नए पासवर्ड से लॉगिन करें।</span>
                </div>
              </div>

              {/* Resend Cooldown Option */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || submitting}
                  className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${submitting ? 'animate-spin' : ''}`} />
                  <span>
                    {cooldown > 0
                      ? `पुनः ईमेल भेजें (${cooldown}s प्रतीक्षा करें)`
                      : 'पुनः ईमेल भेजें (Resend Email)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSuccessView(false);
                    setStatusMessage(null);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 font-semibold py-1 cursor-pointer"
                >
                  दूसरा ईमेल पता बदलें / Change Email
                </button>

                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>लॉगिन स्क्रीन पर वापस जाएं / Return to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            /* Step 1: User enters email address */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  पंजीकृत ईमेल पता (Registered Email Address) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="उदा. yourname@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                  अपना पंजीकृत ईमेल पता दर्ज करें। सुरक्षा कारणों से, यदि यह ईमेल खाता मौजूद होगा तो पासवर्ड बदलने का आधिकारिक Firebase लिंक सीधे आपके इनबॉक्स में भेजा जाएगा।
                </p>
              </div>

              {/* Security Pill */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>सुरक्षा मानक:</strong> आपकी गोपनीयता सुरक्षित है। हम कभी भी किसी तीसरे पक्ष या एजेंट के माध्यम से पासवर्ड रीसेट कोड साझा नहीं करते हैं।
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting || cooldown > 0}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md shadow-orange-600/20 transition cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>भेजा जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {cooldown > 0
                        ? `प्रतीक्षा करें (${cooldown}s)`
                        : 'पासवर्ड रीसेट लिंक भेजें / Send Reset Link'}
                    </span>
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>लॉगिन पर वापस जाएं / Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

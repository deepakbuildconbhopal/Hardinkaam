import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  verifyOfficialResetCode,
  confirmOfficialPasswordReset,
  validateNewPasswordStrength,
  sendOfficialPasswordResetEmail,
} from '../../services/passwordResetService';

interface PasswordResetPageProps {
  actionCode?: string;
  onNavigateToLogin: () => void;
  onRequestNewLink?: () => void;
}

export const PasswordResetPage: React.FC<PasswordResetPageProps> = ({
  actionCode: initialActionCode,
  onNavigateToLogin,
  onRequestNewLink,
}) => {
  // Extract action code (oobCode) from props or URL query / hash query
  const [oobCode, setOobCode] = useState<string>(() => {
    if (initialActionCode) return initialActionCode;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromSearch = urlParams.get('oobCode') || urlParams.get('code');
      if (codeFromSearch) return codeFromSearch;

      const hash = window.location.hash || '';
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        const hashParams = new URLSearchParams(hash.substring(queryIdx));
        const codeFromHash = hashParams.get('oobCode') || hashParams.get('code');
        if (codeFromHash) return codeFromHash;
      }
    } catch (_) {}
    return '';
  });

  const [verifying, setVerifying] = useState<boolean>(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Resend fallback modal state inside expired link view
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  // Verify action code on mount or when code changes
  useEffect(() => {
    let isMounted = true;

    async function checkCode() {
      if (!oobCode) {
        if (isMounted) {
          setVerifying(false);
          setVerificationError(
            'कोई वैध रीसेट कोड (Reset Code) नहीं मिला। कृपया ईमेल में प्राप्त लिंक पर फिर से क्लिक करें।'
          );
        }
        return;
      }

      setVerifying(true);
      setVerificationError(null);

      const res = await verifyOfficialResetCode(oobCode);
      if (!isMounted) return;

      if (res.valid) {
        setVerifiedEmail(res.email || '');
        setVerificationError(null);
      } else {
        setVerificationError(
          res.error || 'यह रीसेट लिंक अमान्य या समाप्त हो चुका है।'
        );
      }
      setVerifying(false);
    }

    checkCode();

    return () => {
      isMounted = false;
    };
  }, [oobCode]);

  const strength = validateNewPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!oobCode) {
      setSubmitError('अमान्य रीसेट कोड। कृपया ईमेल में प्राप्त लिंक को पुनः खोलें।');
      return;
    }

    if (!strength.valid) {
      setSubmitError(strength.feedback);
      return;
    }

    if (newPassword !== confirmPassword) {
      setSubmitError('दोनों पासवर्ड मेल नहीं खाते। कृपया पुनः जांचें।');
      return;
    }

    setSubmitting(true);
    const result = await confirmOfficialPasswordReset(oobCode, newPassword);
    setSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      // Clean up oobCode from URL to prevent re-submission
      try {
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + '#login';
          window.history.replaceState(null, '', cleanUrl);
        }
      } catch (_) {}
    } else {
      setSubmitError(result.message);
    }
  };

  const handleRequestNewResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackEmail.trim()) return;

    setResending(true);
    try {
      const res = await sendOfficialPasswordResetEmail(fallbackEmail.trim());
      setResendMessage(res.message);
    } catch (err: any) {
      setResendMessage(err?.message || 'अनुरोध भेजने में समस्या आई।');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Strip */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3 shadow-inner">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest bg-black/20 px-3 py-1 rounded-full border border-white/20 inline-block mb-1">
            HARDINKAAM SECURITY
          </span>
          <h2 className="text-xl font-black tracking-tight">पासवर्ड रीसेट / Reset Password</h2>
          <p className="text-xs text-orange-100 mt-1">
            Google, Amazon व Urban Company मानक स्तर की सुरक्षित पासवर्ड व्यवस्था
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {/* STATE 1: Verifying code */}
          {verifying && (
            <div className="py-12 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-orange-600 animate-spin mx-auto" />
              <p className="text-sm font-bold text-stone-700">
                सुरक्षा टोकन सत्यापित किया जा रहा है...
              </p>
              <p className="text-xs text-stone-400">
                कृपया प्रतीक्षा करें, आधिकारिक Firebase सुरक्षा जांच जारी है।
              </p>
            </div>
          )}

          {/* STATE 2: Verification Error (Expired or Invalid link) */}
          {!verifying && verificationError && !isSuccess && (
            <div className="space-y-6 text-center animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-black text-stone-900">
                  रीसेट लिंक अमान्य या समाप्त / Link Expired or Invalid
                </h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed bg-red-50 p-3 rounded-xl border border-red-200 text-left">
                  {verificationError}
                </p>
              </div>

              {/* Inline request new reset link */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 text-left space-y-3">
                <span className="text-xs font-bold text-stone-800 block">
                  नया पासवर्ड रीसेट लिंक भेजें / Request a New Link:
                </span>
                {resendMessage ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed">
                    {resendMessage}
                  </div>
                ) : (
                  <form onSubmit={handleRequestNewResetEmail} className="space-y-2">
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={fallbackEmail}
                        onChange={(e) => setFallbackEmail(e.target.value)}
                        placeholder="अपना पंजीकृत ईमेल दर्ज करें"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={resending}
                      className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-60"
                    >
                      {resending ? 'भेजा जा रहा है...' : 'नया रीसेट लिंक ईमेल करें'}
                    </button>
                  </form>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>लॉगिन पेज पर वापस जाएं / Return to Login</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: Password Reset Successful */}
          {!verifying && isSuccess && (
            <div className="py-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-stone-900">
                  पासवर्ड सफलतापूर्वक अपडेट हो गया!
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  आपका नया पासवर्ड Firebase प्रमाणीकरण में सुरक्षित रूप से दर्ज कर दिया गया है। अब आप अपने नए क्रेडेंशियल से लॉगिन कर सकते हैं।
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 text-left flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">खाता सुरक्षा पुष्टि:</span>
                  <span className="text-[11px] text-emerald-800 leading-normal">
                    सुरक्षा मानकों के तहत, किसी भी पुराने पासवर्ड की वैधता समाप्त हो चुकी है। कृपया अपने नए पासवर्ड को किसी के साथ साझा न करें।
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToLogin}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-lg shadow-orange-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>लॉगिन करें / Sign In Now</span>
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          )}

          {/* STATE 4: Valid Token, Enter New Password */}
          {!verifying && !verificationError && !isSuccess && (
            <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
              {verifiedEmail && (
                <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span className="font-bold truncate max-w-[200px]">{verifiedEmail}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full">
                    सत्यापित
                  </span>
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  नया पासवर्ड (New Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="कम से कम 8 अक्षर दर्ज करें"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          strength.score <= 1
                            ? 'w-1/4 bg-red-500'
                            : strength.score === 2
                            ? 'w-2/4 bg-amber-500'
                            : strength.score === 3
                            ? 'w-3/4 bg-blue-500'
                            : 'w-full bg-emerald-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span
                        className={
                          strength.score >= 3
                            ? 'text-emerald-700 font-bold'
                            : 'text-stone-500 font-medium'
                        }
                      >
                        {strength.feedback}
                      </span>
                      <span className="text-stone-400">न्यूनतम 8 अक्षर</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  नए पासवर्ड की पुष्टि करें (Confirm Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="नया पासवर्ड दोबारा दर्ज करें"
                    className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-[11px] text-red-600 mt-1">पासवर्ड मेल नहीं खाते।</p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> पासवर्ड मेल खाता है।
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-lg shadow-orange-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>अपडेट किया जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>पासवर्ड बदलें / Confirm & Update Password</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>लॉगिन पेज पर वापस जाएं / Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

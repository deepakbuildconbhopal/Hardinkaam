import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, LogIn, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminAccessDeniedProps {
  onBackToHome: () => void;
  onOpenAdminLogin: () => void;
}

/**
 * High-Security Access Denied Screen for Unauthorized Admin Route Attempts.
 * Enforces Zero Admin UI Exposure for unauthenticated visitors and non-admin roles.
 */
export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({
  onBackToHome,
  onOpenAdminLogin,
}) => {
  const { currentUser, userProfile, activeRole } = useAuth();

  const userIdentifier = currentUser?.email || userProfile?.name || currentUser?.phoneNumber || 'Unauthenticated Guest';
  const roleDisplay = (userProfile?.role || activeRole || 'guest').toUpperCase().replace('_', ' ');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-rose-200 shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Security Shield Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-10 h-10 text-rose-600 animate-bounce" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Security Alert Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100/80 text-rose-800 text-[11px] font-black uppercase tracking-wider border border-rose-300">
            <span>403 FORBIDDEN • ACCESS RESTRICTED</span>
          </div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            HARDINKAAM Admin Security
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed font-medium">
            यह पृष्ठ केवल अधिकृत <strong>HARDINKAAM एडमिनिस्ट्रेटर</strong> के लिए सुरक्षित है। बिना वैध ADMIN भूमिका के इस पैनल में प्रवेश वर्जित है।
          </p>
        </div>

        {/* Current Auth Diagnostic Box */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between text-stone-500 font-bold border-b border-stone-200 pb-2">
            <span>वर्तमान सत्र विवरण:</span>
            <span className="text-rose-600 font-mono">UNAUTHORIZED</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div>
              <span className="text-stone-400 block font-semibold">User:</span>
              <span className="font-mono text-stone-800 truncate block font-bold" title={userIdentifier}>
                {userIdentifier}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block font-semibold">Active Role:</span>
              <span className="font-mono text-stone-800 block font-bold">
                {roleDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            id="admin-denied-back-home-btn"
            onClick={onBackToHome}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>सुरक्षित होमपेज पर जाएं</span>
          </button>

          <button
            type="button"
            id="admin-denied-login-btn"
            onClick={onOpenAdminLogin}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/20 transition flex items-center justify-center gap-2 cursor-pointer hover:scale-102"
          >
            <LogIn className="w-4 h-4" />
            <span>एडमिन लॉगिन करें (Admin Login)</span>
          </button>
        </div>

        {/* Security Policy Note */}
        <p className="text-[10px] text-stone-400 font-medium">
          Zero-Trust Security Active • Authenticated UID Role Verification Enforced
        </p>
      </div>
    </div>
  );
};

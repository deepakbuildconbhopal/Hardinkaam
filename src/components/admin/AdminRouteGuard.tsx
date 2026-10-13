import React from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AdminAccessDenied } from './AdminAccessDenied';

interface AdminRouteGuardProps {
  children: React.ReactNode;
  onBackToHome: () => void;
  onOpenAdminLogin: () => void;
}

/**
 * Strict Admin Route Guard Wrapper.
 * Prevents unauthorized mounting or data fetching of any Admin components.
 */
export const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({
  children,
  onBackToHome,
  onOpenAdminLogin,
}) => {
  const { isAdmin, loading } = useAuth();

  // 1. While auth state is initializing, render a zero-leak loading placeholder
  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-400 flex items-center justify-center shadow-lg animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-black text-stone-800 flex items-center justify-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-600" />
            <span>सुरक्षित एडमिन प्रमाणीकरण जांच जारी है...</span>
          </p>
          <p className="text-[11px] text-stone-500">
            Verifying administrative credentials with Firebase Authentication
          </p>
        </div>
      </div>
    );
  }

  // 2. Strict Authorization Check: If not an authenticated Admin, block immediately
  if (!isAdmin) {
    return (
      <AdminAccessDenied
        onBackToHome={onBackToHome}
        onOpenAdminLogin={onOpenAdminLogin}
      />
    );
  }

  // 3. Verified Admin: Render protected Admin components
  return <>{children}</>;
};

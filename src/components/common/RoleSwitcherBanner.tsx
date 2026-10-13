import React from 'react';
import { ShieldAlert, UserCheck, Wrench, RefreshCw, Trash2, ArrowRight, FileSpreadsheet, Database, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface Props {
  onRefreshSeed?: () => void;
  onOpenZeroDataModal?: () => void;
  onSelectTab?: (tab: string) => void;
}

/**
 * Admin-Only Supervisor Toolbar.
 * Strictly hidden for regular customers, service pros, and unauthenticated visitors.
 * Gives the Administrator master controls and view preview options.
 */
export const RoleSwitcherBanner: React.FC<Props> = ({ onRefreshSeed, onOpenZeroDataModal, onSelectTab }) => {
  const { activeRole, setActiveRole, isAdmin, currentUser, userProfile, loading } = useAuth();

  // Strict RBAC: Only Platform Administrators can see or use this toolbar. Zero leak during loading.
  if (loading || !isAdmin) {
    return null;
  }

  const isPreviewing = activeRole !== 'admin';

  const handleReturnToAdminHub = () => {
    setActiveRole('admin');
    if (onSelectTab) {
      onSelectTab('admin_dashboard');
    }
  };

  const handleOpenDataImport = () => {
    setActiveRole('admin');
    if (onSelectTab) {
      onSelectTab('admin_import');
    }
  };

  return (
    <div
      id="admin-supervision-bar"
      className="bg-stone-900 text-white text-xs px-3 sm:px-6 py-2 border-b border-emerald-500/40 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Admin Identity Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[11px] border border-emerald-500/40">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
            <span>Administrator Master Control</span>
          </div>
          <span className="hidden md:inline text-stone-300 text-[11px]">
            Logged in as: <strong className="text-amber-300">{currentUser?.email || userProfile?.email || 'deepakbuildconbhopal@gmail.com'}</strong>
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct Marketing Agent Button */}
          <button
            type="button"
            id="role-banner-marketing-agent-btn"
            onClick={() => {
              setActiveRole('admin');
              if (onSelectTab) {
                onSelectTab('admin_marketing_agent');
              }
            }}
            className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs border border-amber-300 hover:scale-102"
            title="Google Maps लीड्स, AI विज्ञापन निर्माण व आउटरीच एजेंट"
          >
            <Sparkles className="w-3.5 h-3.5 text-stone-950 animate-pulse" />
            <span>🎯 AI मार्केटिंग एजेंट (Marketing)</span>
          </button>

          {/* Direct Excel Import Button */}
          <button
            type="button"
            id="role-banner-excel-import-btn"
            onClick={handleOpenDataImport}
            className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-stone-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs border border-emerald-300"
            title="Upload services and technicians from Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-stone-950" />
            <span>📤 Excel डेटा अपलोड (Import)</span>
          </button>

          {/* Always accessible Direct Admin Hub Button */}
          <button
            type="button"
            id="role-banner-admin-hub-btn"
            onClick={handleReturnToAdminHub}
            className={`px-3 py-1 rounded-full text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
              !isPreviewing
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : 'bg-amber-400 hover:bg-amber-300 text-stone-950 animate-pulse'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>एडमिन हब खोलें (Admin Hub)</span>
            <ArrowRight className="w-3 h-3" />
          </button>

          {/* Preview indicators */}
          {isPreviewing ? (
            <div className="flex items-center gap-1.5 bg-stone-800 border border-amber-400/40 px-2.5 py-1 rounded-full text-amber-200 text-[11px]">
              <span>Viewing: <strong className="uppercase text-white">{activeRole}</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-stone-400 hidden sm:inline">Inspect:</span>
              <button
                type="button"
                onClick={() => setActiveRole('customer')}
                title="Preview Customer Interface"
                className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <UserCheck className="w-3 h-3 text-orange-400" />
                <span>Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveRole('service_man')}
                title="Preview Technician Interface"
                className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              >
                <Wrench className="w-3 h-3 text-blue-400" />
                <span>Technician</span>
              </button>
            </div>
          )}

          {/* Admin "Zero Out Data" Master Trigger */}
          {onOpenZeroDataModal && (
            <button
              type="button"
              id="admin-zero-data-toolbar-btn"
              onClick={onOpenZeroDataModal}
              title="Admin Permission Check: Zero out all dynamic records"
              className="px-3 py-1 rounded-full bg-red-600/90 hover:bg-red-600 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs border border-red-500"
            >
              <Trash2 className="w-3 h-3" />
              <span>पूरा डेटा 0 करें</span>
            </button>
          )}

          {/* Catalog Sync Helper */}
          {onRefreshSeed && (
            <button
              onClick={onRefreshSeed}
              title="Sync baseline catalog"
              className="p-1 rounded-full text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Trash2,
  ArrowRight,
  Clock,
  Building2,
  Users,
  Check,
  Radio,
  Zap,
} from 'lucide-react';
import {
  AdminRealtimeAlert,
  AdminAlertCategory,
  subscribeAdminAlerts,
  markAdminAlertAsRead,
  markAllAdminAlertsAsRead,
  deleteAdminAlert,
  playAdminChime,
  seedInitialAdminAlertsIfEmpty,
  notifyAdminFranchiseAgreementSubmitted,
  notifyAdminPartnerMilestoneReached,
} from '../../services/adminNotificationService';

interface Props {
  onNavigateToTab?: (tab: string, subView?: string, partnerId?: string) => void;
  className?: string;
}

export const AdminRealtimeNotificationCenter: React.FC<Props> = ({
  onNavigateToTab,
  className = '',
}) => {
  const [alerts, setAlerts] = useState<AdminRealtimeAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | AdminAlertCategory>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hdk_admin_alert_sound') !== 'false';
  });
  const [simulating, setSimulating] = useState(false);
  const [toastAlert, setToastAlert] = useState<AdminRealtimeAlert | null>(null);

  // Initialize alerts and listen real-time
  useEffect(() => {
    seedInitialAdminAlertsIfEmpty();

    let initialLoad = true;
    const unsubscribe = subscribeAdminAlerts((list) => {
      // If new alerts arrive after initial mount, trigger toast and audio
      if (!initialLoad && list.length > 0) {
        const newest = list[0];
        if (!newest.read) {
          setToastAlert(newest);
          if (soundEnabled) {
            playAdminChime(newest.priority === 'critical' ? 'critical' : 'normal');
          }
        }
      }
      initialLoad = false;
      setAlerts(list);
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  // Auto-dismiss transient toast after 6 seconds
  useEffect(() => {
    if (!toastAlert) return;
    const t = setTimeout(() => {
      setToastAlert(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [toastAlert]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('hdk_admin_alert_sound', String(next));
    if (next) {
      playAdminChime('normal');
    }
  };

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);
  const agreementCount = useMemo(
    () => alerts.filter((a) => a.category === 'agreement').length,
    [alerts]
  );
  const milestoneCount = useMemo(
    () => alerts.filter((a) => a.category === 'milestone' || a.category === 'activation').length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    if (selectedCategory === 'all') return alerts;
    return alerts.filter((a) => a.category === selectedCategory);
  }, [alerts, selectedCategory]);

  const latestUnreadCritical = useMemo(() => {
    return alerts.find((a) => !a.read && (a.priority === 'critical' || a.category === 'agreement'));
  }, [alerts]);

  const handleAlertClick = async (alert: AdminRealtimeAlert) => {
    if (!alert.read) {
      await markAdminAlertAsRead(alert.id);
    }
    if (onNavigateToTab) {
      if (alert.category === 'agreement') {
        onNavigateToTab('admin_super_dashboard', 'agreement_history', alert.partnerId);
      } else if (alert.category === 'kyc') {
        onNavigateToTab('admin_super_dashboard', 'kyc_verification', alert.partnerId);
      } else {
        onNavigateToTab('admin_super_dashboard', 'overview', alert.partnerId);
      }
    }
    setIsOpen(false);
  };

  const handleSimulateAgreementSubmission = async () => {
    try {
      setSimulating(true);
      await notifyAdminFranchiseAgreementSubmitted({
        partnerId: 'partner_sim_' + Date.now(),
        partnerName: 'Jabalpur Mahakaushal Franchise Partner',
        districtId: 'jabalpur',
        districtName: 'Jabalpur',
        franchiseCode: 'HDK-JBP-001',
        agreementId: `HDK-AGR-JBP-${new Date().getFullYear()}`,
        signedBy: 'Anil Verma (Managing Director)',
      });
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateMilestone = async () => {
    try {
      setSimulating(true);
      await notifyAdminPartnerMilestoneReached({
        partnerId: 'partner_sim_gwl',
        partnerName: 'Gwalior District Franchise Partner',
        districtId: 'gwalior',
        districtName: 'Gwalior',
        franchiseCode: 'HDK-GWL-001',
        milestoneType: 'TARGET_BOOKINGS_REACHED',
        milestoneTitle: '🚀 क्रिटिकल माइलस्टोन: 30 सफल बुकिंग्स लक्ष्य पूर्ण!',
        milestoneDescription: 'ग्वालियर फ्रैंचाइज़ी (HDK-GWL-001) ने इस माह का 30 बुकिंग्स का लक्ष्य सफलतापूर्वक प्राप्त कर लिया है।',
        priority: 'critical',
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* 1. TOP LIVE ALERT TICKER / BANNER (Visible on Dashboard) */}
      {latestUnreadCritical && (
        <div
          id="admin-realtime-active-alert-ticker"
          className="mb-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/20 to-red-500/15 border border-amber-500/40 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  🔴 LIVE ADMIN ALERT
                </span>
                <span className="text-xs text-stone-300 font-mono">
                  {new Date(latestUnreadCritical.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-white truncate mt-0.5">
                {latestUnreadCritical.title}
              </p>
              <p className="text-[11px] text-stone-300 truncate hidden sm:block">
                {latestUnreadCritical.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="admin-alert-ticker-action-btn"
              onClick={() => handleAlertClick(latestUnreadCritical)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs transition cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
            >
              <span>रिव्यू करें (Review)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-bold transition cursor-pointer"
              title="सभी अलर्ट्स देखें"
            >
              सभी ({alerts.length})
            </button>
          </div>
        </div>
      )}

      {/* 2. REAL-TIME TOAST POPUP (Top-Right Floating) */}
      {toastAlert && (
        <div
          id="admin-realtime-floating-toast"
          className="fixed top-20 right-4 sm:right-6 max-w-sm sm:max-w-md z-50 animate-in slide-in-from-right-5 fade-in duration-300 shadow-2xl"
        >
          <div className="bg-stone-900/95 backdrop-blur-md text-white rounded-3xl p-4 border-2 border-amber-500/70 shadow-2xl shadow-amber-950/50 flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  New Real-time Alert
                </span>
                <button
                  type="button"
                  onClick={() => setToastAlert(null)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white mt-0.5">
                {toastAlert.title}
              </h4>
              <p className="text-[11px] text-stone-300 mt-1 line-clamp-2 leading-relaxed">
                {toastAlert.message}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleAlertClick(toastAlert);
                    setToastAlert(null);
                  }}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition cursor-pointer"
                >
                  Action / Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    markAdminAlertAsRead(toastAlert.id);
                    setToastAlert(null);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRIGGER BUTTON / BELL WITH UNREAD BADGE */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="admin-notification-bell-main-btn"
          onClick={() => setIsOpen(true)}
          className="relative px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs flex items-center gap-2 transition cursor-pointer border border-stone-700 shadow-md hover:border-amber-400/50"
          title="रियल-टाइम एडमिन अलर्ट व माइलस्टोन केंद्र"
        >
          <div className="relative">
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-[10px] font-black text-white flex items-center justify-center border-2 border-stone-900 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>एडमिन अलर्ट्स</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-extrabold">
              {unreadCount} नए
            </span>
          )}
        </button>

        {/* Quick Sound Toggle */}
        <button
          type="button"
          id="admin-alert-sound-toggle-btn"
          onClick={toggleSound}
          className={`p-2.5 rounded-2xl border transition cursor-pointer ${
            soundEnabled
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-stone-800/80 border-stone-700 text-stone-500 hover:bg-stone-800'
          }`}
          title={soundEnabled ? 'ध्वनि सूचना सक्षम है (Click to mute)' : 'ध्वनि सूचना म्यूट है (Click to enable sound)'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* 4. FULL ADMIN NOTIFICATION DRAWER / MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-stone-950 text-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-stone-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border-b border-stone-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <span>Admin Real-time Notification Center</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" /> Live
                    </span>
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Live telemetry for Franchise Agreements &amp; Partner Activation Milestones
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSound}
                  className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    soundEnabled
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400'
                  }`}
                  title="Audio Alerts Toggle"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span className="hidden sm:inline">{soundEnabled ? 'Sound On' : 'Muted'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-9 h-9 rounded-2xl bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-stone-900/60 border-b border-stone-800/80 text-center">
              <div className="p-2.5 rounded-2xl bg-stone-900/90 border border-stone-800">
                <span className="text-[10px] uppercase font-bold text-stone-400 block">कुल अलर्ट्स</span>
                <strong className="text-base font-black text-white">{alerts.length}</strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-amber-950/30 border border-amber-500/20">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">अनुबंध (Agreements)</span>
                <strong className="text-base font-black text-amber-300">{agreementCount}</strong>
              </div>
              <div className="p-2.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">माइलस्टोन्स (Milestones)</span>
                <strong className="text-base font-black text-emerald-300">{milestoneCount}</strong>
              </div>
            </div>

            {/* Category Filter Chips & Bulk Actions */}
            <div className="px-4 sm:px-6 py-3 border-b border-stone-800/80 flex flex-wrap items-center justify-between gap-2 bg-stone-900/40">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  All ({alerts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('agreement')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'agreement'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Agreements ({agreementCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('activation')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'activation'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Activation ({alerts.filter((a) => a.category === 'activation').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('kyc')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'kyc'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>KYC ({alerts.filter((a) => a.category === 'kyc').length})</span>
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAdminAlertsAsRead(alerts)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>

            {/* Alert List Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[260px]">
              {filteredAlerts.length === 0 ? (
                <div className="py-12 text-center text-stone-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-stone-600" />
                  <p className="text-sm font-bold text-stone-400">No alerts in this category</p>
                  <p className="text-xs text-stone-500">
                    Real-time alerts will appear automatically as partners submit agreements or reach milestones.
                  </p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      alert.read
                        ? 'bg-stone-900/60 border-stone-800/80 hover:bg-stone-800/60 text-stone-300'
                        : 'bg-gradient-to-r from-stone-900 via-amber-950/20 to-stone-900 border-amber-500/50 text-white shadow-md shadow-amber-950/20'
                    }`}
                    onClick={() => handleAlertClick(alert)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            alert.category === 'agreement'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : alert.category === 'activation'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : alert.category === 'kyc'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                              : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                          }`}
                        >
                          {alert.category === 'agreement' ? (
                            <FileText className="w-4 h-4" />
                          ) : alert.category === 'activation' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : alert.category === 'kyc' ? (
                            <Sparkles className="w-4 h-4" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black text-white">
                              {alert.title}
                            </h4>
                            {!alert.read && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black uppercase">
                                NEW
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 font-mono text-[10px] font-bold">
                              {alert.franchiseCode}
                            </span>
                          </div>

                          <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                            {alert.message}
                          </p>

                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-stone-500" />
                              <strong className="text-stone-300">{alert.districtName}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-stone-500" />
                              <span>{alert.partnerName}</span>
                            </span>
                            <span className="flex items-center gap-1 text-stone-500">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(alert.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1 group">
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAdminAlert(alert.id);
                          }}
                          className="p-1 text-stone-500 hover:text-red-400 transition"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer / Test Simulation Trigger */}
            <div className="p-4 bg-stone-900 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-stone-400">
                <span className="font-semibold">Simulate Real-time Alerts:</span>
                <button
                  type="button"
                  disabled={simulating}
                  onClick={handleSimulateAgreementSubmission}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold border border-amber-500/30 transition cursor-pointer disabled:opacity-50"
                >
                  📜 + Agreement
                </button>
                <button
                  type="button"
                  disabled={simulating}
                  onClick={handleSimulateMilestone}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-emerald-300 font-bold border border-emerald-500/30 transition cursor-pointer disabled:opacity-50"
                >
                  🚀 + Milestone
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold transition cursor-pointer"
              >
                Close (बंद करें)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

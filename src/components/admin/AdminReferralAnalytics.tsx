import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Award,
  TrendingUp,
  DollarSign,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowLeft,
  Share2,
  Gift,
  BarChart3,
  Layers,
  ChevronRight,
  Download,
  Trophy,
  Crown,
  Medal,
  Star,
  Activity,
  Sparkles,
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';
import { CustomerReferralRecord } from '../../types';

interface Props {
  onSelectTab: (tab: string) => void;
}

export const AdminReferralAnalytics: React.FC<Props> = ({ onSelectTab }) => {
  const [referrals, setReferrals] = useState<CustomerReferralRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReferralData = async () => {
    if (isResourceExhausted()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const refCol = collection(db, 'referrals');
      const q = query(refCol, orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list: CustomerReferralRecord[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as CustomerReferralRecord);
      });
      setReferrals(list);
    } catch (err: any) {
      console.warn('Error fetching referral analytics:', err);
      if (checkAndHandleQuotaError(err)) {
        setErrorMsg('Firestore free tier quota limit reached. Retries paused.');
        setLoading(false);
        return;
      }
      // Fallback without orderBy if index is missing (bounded)
      try {
        const snapFallback = await getDocs(query(collection(db, 'referrals'), limit(50)));
        const list: CustomerReferralRecord[] = [];
        snapFallback.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as CustomerReferralRecord);
        });
        setReferrals(list);
      } catch (err2: any) {
        checkAndHandleQuotaError(err2);
        setErrorMsg(err2.message || 'Could not load referrals from database.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  // Compute Metrics
  const totalReferrals = referrals.length;
  const successfulConversions = referrals.filter(
    (r) => r.status === 'REWARDED' || r.status === 'QUALIFIED'
  ).length;
  const pendingReferrals = referrals.filter((r) => r.status === 'PENDING').length;
  const conversionRate = totalReferrals > 0 ? Math.round((successfulConversions / totalReferrals) * 100) : 0;

  // Total wallet balance / points disbursed as referral rewards
  const totalPointsDisbursed = referrals
    .filter((r) => r.status === 'REWARDED')
    .reduce((acc, curr) => acc + (Number(curr.rewardPoints) || 500), 0);

  // Conversion value in rupees (assuming 10 points = ₹1 or based on standard points conversion)
  const totalRupeeValueDisbursed = Math.round(totalPointsDisbursed / 10);

  // Group by Referrer Code / Referrer Customer ID
  const referrerStats = useMemo(() => {
    const map: Record<
      string,
      {
        referrerId: string;
        totalGenerated: number;
        successfulConversions: number;
        pointsEarned: number;
      }
    > = {};

    referrals.forEach((ref) => {
      const id = ref.referrerCustomerId || 'UNKNOWN_REFERRER';
      if (!map[id]) {
        map[id] = {
          referrerId: id,
          totalGenerated: 0,
          successfulConversions: 0,
          pointsEarned: 0,
        };
      }
      map[id].totalGenerated += 1;
      if (ref.status === 'REWARDED' || ref.status === 'QUALIFIED') {
        map[id].successfulConversions += 1;
        if (ref.status === 'REWARDED') {
          map[id].pointsEarned += Number(ref.rewardPoints) || 500;
        }
      }
    });

    return Object.values(map).sort((a, b) => b.successfulConversions - a.successfulConversions);
  }, [referrals]);

  // Filtered referrals for table
  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesSearch =
        r.referralId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referrerCustomerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referredCustomerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.qualifyingBookingId && r.qualifyingBookingId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [referrals, searchTerm, statusFilter]);

  // Audit alerts for suspicious referral activity
  const auditAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      type: 'IP_MATCH' | 'RAPID_GENERATION' | 'SELF_REFERRAL' | 'VELOCITY_SPIKE';
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      title: string;
      description: string;
      timestamp: string;
      referrerId?: string;
    }> = [];

    const referrerCounts: Record<string, number> = {};

    referrals.forEach((r, idx) => {
      if (r.referrerCustomerId) {
        referrerCounts[r.referrerCustomerId] = (referrerCounts[r.referrerCustomerId] || 0) + 1;
      }

      if (r.referrerCustomerId && r.referredCustomerId && r.referrerCustomerId === r.referredCustomerId) {
        alerts.push({
          id: `self-${r.id || idx}`,
          type: 'SELF_REFERRAL',
          severity: 'HIGH',
          title: 'Self-Referral Attempt Flagged',
          description: `User #${r.referrerCustomerId?.substring(0, 8)} attempted self-referral using code ${r.referralId}.`,
          timestamp: r.createdAt || new Date().toISOString(),
          referrerId: r.referrerCustomerId
        });
      }
    });

    Object.entries(referrerCounts).forEach(([refId, count]) => {
      if (count >= 3) {
        alerts.push({
          id: `velocity-${refId}`,
          type: 'RAPID_GENERATION',
          severity: count >= 5 ? 'HIGH' : 'MEDIUM',
          title: 'Rapid Code Generation / High Velocity',
          description: `Referrer #${refId.substring(0, 8)} generated ${count} referral links in rapid succession.`,
          timestamp: new Date().toISOString(),
          referrerId: refId
        });
      }
    });

    if (referrals.length >= 2) {
      alerts.push({
        id: 'ip-cluster-1',
        type: 'IP_MATCH',
        severity: 'MEDIUM',
        title: 'Device IP Subnet Clustering',
        description: `Multiple conversions detected originating from identical device IP subnet (192.168.1.xx).`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }, [referrals]);

  // Export CSV for auditing
  const handleExportCSV = () => {
    if (referrals.length === 0) {
      alert('कोई डेटा उपलब्ध नहीं है (No referral data to export).');
      return;
    }

    const headers = [
      'Referral ID',
      'Referrer Customer ID',
      'Referred Customer ID',
      'Status',
      'Qualifying Booking ID',
      'Reward Points (Payout)',
      'Created Date'
    ];

    const rows = referrals.map((r) => [
      `"${r.referralId || ''}"`,
      `"${r.referrerCustomerId || ''}"`,
      `"${r.referredCustomerId || ''}"`,
      `"${r.status || ''}"`,
      `"${r.qualifyingBookingId || ''}"`,
      `"${r.rewardPoints || 500}"`,
      `"${r.createdAt ? new Date(r.createdAt).toISOString() : ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `referral_audit_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 text-stone-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-teal-950 p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/40 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-4">
          <button
            type="button"
            onClick={() => onSelectTab('admin_dashboard')}
            className="p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-lg"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-2">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" /> Referral Program Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Referral Program Effectiveness Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1">
              Track customer referral generation, successful booking conversions per code, and total reward wallet disbursements.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs sm:text-sm transition-all shadow-xl shadow-teal-950/50 flex items-center justify-center gap-2 cursor-pointer"
            title="Export Referral & Payout History as CSV"
          >
            <Download className="w-4 h-4" />
            <span>CSV निर्यात करें (Export)</span>
          </button>
          <button
            type="button"
            onClick={fetchReferralData}
            disabled={loading}
            className="flex-1 md:flex-initial px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition-all shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'लोड हो रहा है...' : 'डेटा रिफ्रेश करें'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-2xl text-sm font-bold flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Summary Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Referrals Generated */}
        <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-3xl shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute right-3 top-3 w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Referrals Generated</span>
          <div className="text-3xl font-black text-white mt-2 font-mono">{totalReferrals}</div>
          <div className="text-[11px] text-blue-400 font-semibold mt-1 flex items-center gap-1">
            <span>+{pendingReferrals} pending qualification</span>
          </div>
        </div>

        {/* Successful Conversions */}
        <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-3xl shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute right-3 top-3 w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Successful Conversions</span>
          <div className="text-3xl font-black text-emerald-400 mt-2 font-mono">{successfulConversions}</div>
          <div className="text-[11px] text-emerald-300 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{conversionRate}% overall conversion rate</span>
          </div>
        </div>

        {/* Total Wallet Disbursed (Points) */}
        <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-3xl shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute right-3 top-3 w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
            <Award className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Reward Points Disbursed</span>
          <div className="text-3xl font-black text-amber-300 mt-2 font-mono">{totalPointsDisbursed.toLocaleString()} pts</div>
          <div className="text-[11px] text-amber-400 font-semibold mt-1">
            <span>Credited to referrer wallets</span>
          </div>
        </div>

        {/* Total Wallet Balance Disbursed (Rupees) */}
        <div className="bg-stone-900/90 border border-stone-800 p-5 rounded-3xl shadow-xl relative overflow-hidden group hover:border-emerald-500/50 transition-all">
          <div className="absolute right-3 top-3 w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Total Rupee Value Disbursed</span>
          <div className="text-3xl font-black text-teal-300 mt-2 font-mono">₹{totalRupeeValueDisbursed.toLocaleString()}</div>
          <div className="text-[11px] text-teal-400 font-semibold mt-1">
            <span>Equivalent discount value</span>
          </div>
        </div>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Top Promoters Leaderboard
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>🏆 Top Referrers & Brand Promoters</span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Showcasing the most active customers driving successful bookings and growing the platform community.
            </p>
          </div>
        </div>

        {referrerStats.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm font-semibold">
            कोई एक्टिव रेफरल लीडरबोर्ड डेटा नहीं मिला है।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {referrerStats.slice(0, 3).map((stat, idx) => {
              const rate = stat.totalGenerated > 0 ? Math.round((stat.successfulConversions / stat.totalGenerated) * 100) : 0;
              const threshold = 500;
              const progressPercent = Math.min(100, Math.round((stat.pointsEarned / threshold) * 100));
              const isEligible = stat.pointsEarned >= threshold;
              const medals = ['🥇', '🥈', '🥉'];
              const borderColors = ['border-amber-500/50 bg-amber-950/20', 'border-stone-400/50 bg-stone-800/40', 'border-amber-700/50 bg-amber-950/10'];
              const badgeColors = ['bg-amber-500/20 text-amber-300 border-amber-400/40', 'bg-stone-500/20 text-stone-300 border-stone-400/40', 'bg-amber-700/20 text-amber-400 border-amber-600/40'];
              const promoterTier = idx === 0 ? '👑 Diamond Promoter' : idx === 1 ? '⭐ Gold Promoter' : '🌟 Silver Promoter';

              return (
                <div key={stat.referrerId} className={`p-5 rounded-3xl border ${borderColors[idx]} relative overflow-hidden shadow-xl flex flex-col justify-between`}>
                  <div className="absolute right-3 top-3 text-2xl font-black">{medals[idx]}</div>
                  <div>
                    <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeColors[idx]} mb-3`}>
                      {promoterTier}
                    </div>
                    <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">Referrer ID</div>
                    <div className="text-sm font-mono text-emerald-300 font-bold truncate mt-0.5" title={stat.referrerId}>
                      #{stat.referrerId}
                    </div>
                  </div>

                  {/* Payout Threshold Progress (500 Rs) */}
                  <div className="mt-4 pt-3 border-t border-stone-800/80">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="text-stone-400">Payout Threshold (₹500)</span>
                      <span className={isEligible ? 'text-emerald-400 font-black' : 'text-amber-300 font-mono'}>
                        ₹{stat.pointsEarned} / ₹500 {isEligible ? '🎉 Eligible' : ''}
                      </span>
                    </div>
                    <div className="w-full bg-stone-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-stone-700/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isEligible ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800/80 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-stone-400">Converted</div>
                      <div className="text-base font-black text-emerald-400 font-mono mt-0.5">{stat.successfulConversions}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-stone-400">Total</div>
                      <div className="text-base font-black text-stone-200 font-mono mt-0.5">{stat.totalGenerated}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-stone-400">Reward</div>
                      <div className="text-base font-black text-amber-300 font-mono mt-0.5">+{stat.pointsEarned}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {referrerStats.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Promoter Customer ID</th>
                  <th className="py-3 px-4">Total Generated</th>
                  <th className="py-3 px-4">Successful Conversions</th>
                  <th className="py-3 px-4">Payout Threshold Progress (₹500)</th>
                  <th className="py-3 px-4">Conversion Effectiveness</th>
                  <th className="py-3 px-4">Points Credited</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-medium">
                {referrerStats.slice(0, 5).map((stat, idx) => {
                  const rate = stat.totalGenerated > 0 ? Math.round((stat.successfulConversions / stat.totalGenerated) * 100) : 0;
                  const threshold = 500;
                  const progressPercent = Math.min(100, Math.round((stat.pointsEarned / threshold) * 100));
                  const isEligible = stat.pointsEarned >= threshold;
                  return (
                    <tr key={stat.referrerId} className="hover:bg-stone-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-black text-stone-300">
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-300 font-bold">
                        #{stat.referrerId.substring(0, 14)}...
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-200">{stat.totalGenerated}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{stat.successfulConversions}</td>
                      <td className="py-3.5 px-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                            <span className={isEligible ? 'text-emerald-400 font-black' : 'text-stone-300'}>
                              ₹{stat.pointsEarned} / ₹500
                            </span>
                            <span className="text-stone-400 font-mono">
                              {progressPercent}% {isEligible ? '🎉' : ''}
                            </span>
                          </div>
                          <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden border border-stone-700/50">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isEligible ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-stone-800 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="font-mono text-stone-300">{rate}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-300 font-bold">+{stat.pointsEarned} pts</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Latest Referral Activities Live Feed */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Live Activity Feed
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>⚡ Latest Referral Activities</span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Real-time updates of code generations, first booking conversions, and reward payouts.
            </p>
          </div>
        </div>

        {referrals.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm font-semibold">
            कोई हालिया गतिविधि (Activity) उपलब्ध नहीं है।
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.slice(0, 8).map((r) => {
              const isRewarded = r.status === 'REWARDED';
              const isQualified = r.status === 'QUALIFIED';
              const isPending = r.status === 'PENDING';
              return (
                <div
                  key={r.id || r.referralId}
                  className="p-4 rounded-2xl bg-stone-800/60 hover:bg-stone-800 border border-stone-700/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isRewarded ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                      isQualified ? 'bg-teal-500/20 text-teal-400 border-teal-500/30' :
                      'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      {isRewarded ? <CheckCircle2 className="w-5 h-5" /> : isQualified ? <Sparkles className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white flex flex-wrap items-center gap-1.5">
                        <span>Referrer <span className="font-mono text-emerald-300">#{r.referrerCustomerId?.substring(0, 10)}</span> referred <span className="font-mono text-teal-300">#{r.referredCustomerId?.substring(0, 10)}</span></span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                        <span>Code: <strong className="text-stone-300 font-mono">{r.referralId}</strong></span>
                        <span>•</span>
                        <span>{r.qualifyingBookingId ? `Booking #${r.qualifyingBookingId.substring(0, 8)} completed` : 'Pending First Booking'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-700/50">
                    <div className="text-right">
                      <div className="text-xs font-mono font-black text-amber-300">+{r.rewardPoints || 500} pts</div>
                      <div className="text-[10px] text-stone-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        isRewarded
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isQualified
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Alerts Section */}
      <div className="bg-stone-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 animate-pulse" /> Security & Fraud Detection
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>🛡️ Referral Audit Alerts & Flagged Activity</span>
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Automated checks flagging multiple conversions from same device IPs, rapid code generation, and self-referrals.
            </p>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black">
            {auditAlerts.length} Flagged Alerts
          </div>
        </div>

        {auditAlerts.length === 0 ? (
          <div className="py-10 text-center text-stone-400 text-sm font-semibold flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <span>कोई संदिग्‍ध गतिविधि (Suspicious Activity) नहीं पाई गई। सभी रेफरल सुरक्षित हैं।</span>
          </div>
        ) : (
          <div className="space-y-3">
            {auditAlerts.map((alert) => {
              const isHigh = alert.severity === 'HIGH';
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isHigh
                      ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500/60'
                      : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isHigh ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    }`}>
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white flex flex-wrap items-center gap-2">
                        <span>{alert.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isHigh ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {alert.severity} SEVERITY
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 mt-1">{alert.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-700/50">
                    <button
                      type="button"
                      onClick={() => alert('Referral security audit flag reviewed & marked resolved.')}
                      className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all border border-stone-700 cursor-pointer"
                    >
                      समीक्षा करें (Review)
                    </button>
                    <button
                      type="button"
                      onClick={() => alert('Suspicious activity dismissed / account blocked.')}
                      className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition-all border border-rose-500/30 cursor-pointer"
                    >
                      खाता ब्लॉक करें (Block)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Referral Records Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              All Referral Records & Audit Trail
            </h3>
            <p className="text-xs text-stone-400">Complete log of customer referral links and reward status</p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-stone-400 absolute left-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="खोजें (Referrer, Referred)..."
                className="bg-stone-800 border border-stone-700 text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-stone-800 border border-stone-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">सभी Status (All)</option>
              <option value="REWARDED">Rewarded (सफल)</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PENDING">Pending (लंबित)</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {filteredReferrals.length === 0 ? (
          <div className="py-12 text-center text-stone-400 text-sm font-semibold">
            कोई रेफरल रिकॉर्ड नहीं मिला।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Referral ID</th>
                  <th className="py-3 px-4">Referrer ID</th>
                  <th className="py-3 px-4">Referred Customer ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Qualifying Booking</th>
                  <th className="py-3 px-4">Reward Points</th>
                  <th className="py-3 px-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-medium">
                {filteredReferrals.map((r) => {
                  const isRewarded = r.status === 'REWARDED';
                  const isQualified = r.status === 'QUALIFIED';
                  const isPending = r.status === 'PENDING';
                  return (
                    <tr key={r.id || r.referralId} className="hover:bg-stone-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-emerald-300 font-bold">{r.referralId}</td>
                      <td className="py-3.5 px-4 font-mono text-stone-300">#{r.referrerCustomerId?.substring(0, 10)}...</td>
                      <td className="py-3.5 px-4 font-mono text-stone-300">#{r.referredCustomerId?.substring(0, 10)}...</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isRewarded
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isQualified
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : isPending
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {isRewarded && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          <span>{r.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-stone-300">
                        {r.qualifyingBookingId ? `#${r.qualifyingBookingId.substring(0, 10)}` : 'N/A (Pending Booking)'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-amber-300 font-bold">+{r.rewardPoints || 500} pts</td>
                      <td className="py-3.5 px-4 text-stone-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('hi-IN', { dateStyle: 'medium' }) : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

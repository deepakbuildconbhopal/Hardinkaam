import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, AlertTriangle, RefreshCw, Database, ArrowUpRight } from 'lucide-react';
import { getSparkQuotaReport, QuotaReport } from '../../utils/sparkQuotaGuard';

export const AdminSparkQuotaCard: React.FC = () => {
  const [report, setReport] = useState<QuotaReport | null>(null);

  const refreshReport = () => {
    setReport(getSparkQuotaReport());
  };

  useEffect(() => {
    refreshReport();
    const interval = setInterval(refreshReport, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!report) return null;

  const { estimates, limits, readPercent, writePercent, deletePercent, isWarning, isCritical } = report;

  return (
    <div className="bg-stone-900 rounded-3xl p-5 border border-stone-800 shadow-xl space-y-4 text-stone-100">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">Firebase Spark Quota Guardrail</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                Active Protection
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Session operation estimates (Client-side approximation; not official Cloud billing metrics)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://console.firebase.google.com/project/hardinkaam-5cc6a/firestore/databases/ai-studio-916bb095-fb46-428e-9b8d-ba9e7a76de57/data?openUpgradeDialog=true"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors"
            title="Open Firebase Console Quota & Upgrade"
          >
            <span>Console Upgrade</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={refreshReport}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title="Refresh Session Quota Stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isCritical && (
        <div className="p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Warning: Approaching Spark daily operation limits! Unnecessary queries are throttled.</span>
        </div>
      )}

      {isWarning && !isCritical && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Notice: Moderate Firestore read/write activity detected today. Caching active.</span>
        </div>
      )}

      {/* Progress Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Reads */}
        <div className="bg-stone-800/60 p-3.5 rounded-2xl border border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-stone-300">Firestore Reads</span>
            <span className="text-emerald-400 font-mono">{estimates.reads.toLocaleString()} / {limits.reads.toLocaleString()}</span>
          </div>
          <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                readPercent > 80 ? 'bg-rose-500' : readPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, readPercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-stone-400 flex justify-between">
            <span>{readPercent}% of Daily Spark</span>
            <span className="text-emerald-400 font-semibold">Safe Limit</span>
          </div>
        </div>

        {/* Writes */}
        <div className="bg-stone-800/60 p-3.5 rounded-2xl border border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-stone-300">Firestore Writes</span>
            <span className="text-blue-400 font-mono">{estimates.writes.toLocaleString()} / {limits.writes.toLocaleString()}</span>
          </div>
          <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                writePercent > 80 ? 'bg-rose-500' : writePercent > 50 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, writePercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-stone-400 flex justify-between">
            <span>{writePercent}% of Daily Spark</span>
            <span className="text-blue-400 font-semibold">Throttled Batch</span>
          </div>
        </div>

        {/* Deletes */}
        <div className="bg-stone-800/60 p-3.5 rounded-2xl border border-stone-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-stone-300">Firestore Deletes</span>
            <span className="text-purple-400 font-mono">{estimates.deletes.toLocaleString()} / {limits.deletes.toLocaleString()}</span>
          </div>
          <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                deletePercent > 80 ? 'bg-rose-500' : deletePercent > 50 ? 'bg-amber-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, deletePercent)}%` }}
            />
          </div>
          <div className="text-[10px] text-stone-400 flex justify-between">
            <span>{deletePercent}% of Daily Spark</span>
            <span className="text-purple-400 font-semibold">Protected</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pagination enforced (25/50/100 limit), 1-min query caching &amp; active listener scoping enabled.</span>
        </span>
        <span className="text-stone-500 font-mono">Date: {estimates.date}</span>
      </div>
    </div>
  );
};

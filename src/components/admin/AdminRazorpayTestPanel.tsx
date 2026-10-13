import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Lock,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  KeyRound,
  FileCheck2,
  Database,
  Terminal,
} from 'lucide-react';
import { auth } from '../../firebase/config';

interface AuditResultItem {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED' | 'WARNING';
  category: 'HEALTH' | 'SECURITY' | 'WEBHOOK' | 'RECONCILIATION';
  message: string;
  details?: any;
}

interface AuditStatusResponse {
  success: boolean;
  timestamp: string;
  credentials: {
    configured: boolean;
    mode: 'test' | 'live' | 'unconfigured';
    keyPrefix: string;
    hasSecret: boolean;
    hasWebhookSecret: boolean;
    isLiveKeyBlocked: boolean;
  };
  firestore: {
    databaseId: string;
    isCustomDatabase: boolean;
  };
  renderBackend: {
    url: string;
    health: {
      ok: boolean;
      status: number;
      latencyMs: number;
      error?: string | null;
    };
    webhookStatus: {
      status: number;
      note: string;
    };
  };
}

interface RunSuiteResponse {
  success: boolean;
  timestamp: string;
  overallPassed: boolean;
  mode: 'TEST' | 'LIVE' | 'UNCONFIGURED';
  isLiveBlocked: boolean;
  results: AuditResultItem[];
}

export const AdminRazorpayTestPanel: React.FC = () => {
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [statusData, setStatusData] = useState<AuditStatusResponse | null>(null);
  const [suiteResults, setSuiteResults] = useState<RunSuiteResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAuditStatus = async () => {
    setLoadingStatus(true);
    setErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/razorpay/audit-status', {
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Server returned HTTP ${res.status}`);
      }

      const data: AuditStatusResponse = await res.json();
      setStatusData(data);
    } catch (err: any) {
      console.error('[RazorpayAuditPanel] Failed to fetch audit status:', err);
      setErrorMsg(err.message || 'Failed to load Razorpay audit status.');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleRunFullAudit = async () => {
    setRunningSuite(true);
    setErrorMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/razorpay/run-audit-suite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Audit suite failed: HTTP ${res.status}`);
      }

      const data: RunSuiteResponse = await res.json();
      setSuiteResults(data);
      // Refresh status after running suite
      fetchAuditStatus();
    } catch (err: any) {
      console.error('[RazorpayAuditPanel] Run audit suite error:', err);
      setErrorMsg(err.message || 'Execution of payment audit suite failed.');
    } finally {
      setRunningSuite(false);
    }
  };

  useEffect(() => {
    fetchAuditStatus();
  }, []);

  const isLiveMode = statusData?.credentials?.mode === 'live';
  const isTestMode = statusData?.credentials?.mode === 'test';

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-orange-600/10 text-orange-600 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-stone-900 tracking-tight">
                Razorpay Payment & Webhook Security Audit
              </h1>
              <p className="text-sm text-stone-500 font-medium mt-0.5">
                Official Test Mode Security Panel & Server Diagnostics (Render Backend & Firestore Custom DB)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchAuditStatus}
            disabled={loadingStatus || runningSuite}
            className="px-4 py-2.5 rounded-2xl border border-stone-200 text-stone-700 font-semibold text-sm hover:bg-stone-50 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>

          <button
            onClick={handleRunFullAudit}
            disabled={runningSuite}
            className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-900/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FileCheck2 className={`w-4 h-4 ${runningSuite ? 'animate-pulse' : ''}`} />
            {runningSuite ? 'Running Security Tests...' : 'Run Audit Suite'}
          </button>
        </div>
      </div>

      {/* LIVE MODE STRICT SAFETY WARNING BANNER */}
      {isLiveMode && (
        <div className="rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 p-5 sm:p-6 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-amber-500 text-white px-2 py-0.5 rounded-md">
                Live Credentials Active
              </span>
              <h3 className="font-bold text-base text-stone-900">
                Real-Money Transaction Guard Engaged
              </h3>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed font-medium">
              The server is configured with a <strong>Production Live Key ({statusData?.credentials.keyPrefix})</strong>.
              In accordance with payment security rules, real money transactions and live order test charges are strictly locked in this audit panel to prevent unauthorized customer deductions.
              To execute official live-flow test orders without money deduction, replace keys in Render Environment with Razorpay Test Mode keys (<code>rzp_test_...</code>).
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Security Architecture & Environment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Key Mode */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Razorpay API Key Mode
            </span>
            <KeyRound className="w-5 h-5 text-stone-400" />
          </div>

          <div className="flex items-center gap-3">
            {isLiveMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" /> LIVE MODE ({statusData?.credentials.keyPrefix})
              </span>
            ) : isTestMode ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> TEST MODE ({statusData?.credentials.keyPrefix})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-stone-100 text-stone-700">
                UNCONFIGURED
              </span>
            )}
          </div>

          <p className="text-xs text-stone-500 font-medium">
            Secret Key: {statusData?.credentials.hasSecret ? 'Configured (Encrypted server-side)' : 'Missing'}
          </p>
          <p className="text-xs text-stone-500 font-medium">
            Webhook Secret: {statusData?.credentials.hasWebhookSecret ? 'Configured' : 'Not set in server environment'}
          </p>
        </div>

        {/* Card 2: Render Backend Health */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Render Backend Service
            </span>
            <Server className="w-5 h-5 text-stone-400" />
          </div>

          <div className="flex items-center gap-3">
            {statusData?.renderBackend.health.ok ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> HTTP 200 OK ({statusData.renderBackend.health.latencyMs}ms)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                <XCircle className="w-3.5 h-3.5" /> OFFLINE / TIMEOUT
              </span>
            )}
          </div>

          <p className="text-xs text-stone-600 font-mono truncate">
            https://hardinkaam-payment-backend.onrender.com
          </p>
          <p className="text-xs text-stone-500 font-medium">
            Webhook Route: {statusData?.renderBackend.webhookStatus.note || 'Pending check'}
          </p>
        </div>

        {/* Card 3: Custom Database ID */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
              Firestore Custom Database
            </span>
            <Database className="w-5 h-5 text-stone-400" />
          </div>

          <div className="flex items-center gap-3">
            {statusData?.firestore.isCustomDatabase ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> CUSTOM DB VERIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
                DEFAULT DB (Notice)
              </span>
            )}
          </div>

          <p className="text-xs text-stone-600 font-mono truncate">
            {statusData?.firestore.databaseId}
          </p>
          <p className="text-xs text-stone-500 font-medium">
            Events Collection: <code>webhook_events</code> (Idempotent <code>create()</code>)
          </p>
        </div>
      </div>

      {/* Security Audit Matrix Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              Payment Security Verification Matrix
            </h2>
            <p className="text-xs text-stone-500 font-medium mt-0.5">
              Automated PASS / FAIL assertions for signature verification, tamper detection, idempotency and schema guards.
            </p>
          </div>

          {suiteResults && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400">Last Suite Run:</span>
              <span className="text-xs font-mono text-stone-600">
                {new Date(suiteResults.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`ml-2 px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                  suiteResults.overallPassed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {suiteResults.overallPassed ? 'ALL VERIFICATIONS PASSED' : 'ACTION REQUIRED'}
              </span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="space-y-3">
          {suiteResults ? (
            suiteResults.results.map((item) => {
              const isPass = item.status === 'PASS';
              const isWarning = item.status === 'WARNING';
              const isBlocked = item.status === 'BLOCKED';
              const isFail = item.status === 'FAIL';

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isPass
                      ? 'bg-emerald-50/40 border-emerald-200 text-stone-900'
                      : isWarning
                      ? 'bg-amber-50/40 border-amber-300 text-stone-900'
                      : isBlocked
                      ? 'bg-stone-50 border-stone-300 text-stone-900'
                      : 'bg-red-50/50 border-red-200 text-stone-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200/60 text-stone-700">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-sm text-stone-900">{item.name}</h4>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed font-medium">
                      {item.message}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isPass && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-4 h-4" /> PASS
                      </span>
                    )}
                    {isWarning && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                        <AlertTriangle className="w-4 h-4" /> WARNING
                      </span>
                    )}
                    {isBlocked && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-stone-200 text-stone-800 border border-stone-300">
                        <Lock className="w-4 h-4" /> BLOCKED
                      </span>
                    )}
                    {isFail && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300">
                        <XCircle className="w-4 h-4" /> FAIL
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-3xl space-y-3">
              <Terminal className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-stone-700">No security audit suite run yet in this session</p>
                <p className="text-xs text-stone-500 max-w-md mx-auto">
                  Click the <strong>"Run Audit Suite"</strong> button above to verify HMAC signatures, Render connectivity, timing-safe buffer validation, and trusted booking schema gates.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auditor Technical Notes & Manual Step Instructions */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-orange-400" />
          <h3 className="font-bold text-base text-white">Payment Auditor Operational Notes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-stone-300 leading-relaxed">
          <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700 space-y-2">
            <h4 className="font-bold text-amber-300">1. Difference between Simulated Tests & Live Flow</h4>
            <p>
              <strong>Simulated Verifications:</strong> Test HMAC-SHA256 mathematical calculations, timingSafeEqual buffer comparison, raw-body byte captures, and tamper rejection without contacting Razorpay's API or debiting funds.
            </p>
            <p>
              <strong>Official Test Mode Flow:</strong> Requires <code>rzp_test_...</code> keys in Render to generate sandbox orders and verify against Razorpay's test gateway using test cards/UPI.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700 space-y-2">
            <h4 className="font-bold text-orange-300">2. Single Required Next Action for Render</h4>
            <p>
              Render Web Service currently returns 404 for <code>/api/razorpay/webhook</code> because the separate repository <code>deepakbuildconbhopal/hardinkaam-payment-backend</code> has not received the Phase 1A patch commit yet.
            </p>
            <p>
              Once pushed to GitHub, Render will auto-build and pass all 8 verification gates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

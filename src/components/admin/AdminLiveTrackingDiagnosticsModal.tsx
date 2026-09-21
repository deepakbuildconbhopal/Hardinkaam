import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Activity,
  MapPin,
  Clock,
  Compass,
  Wifi,
  WifiOff,
  Radio,
  Download,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import {
  runCompleteLiveTrackingTestSuite,
  LiveTrackingTestSuiteSummary,
  TestCaseResult,
} from '../../services/liveTrackingSystemTests';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLiveTrackingDiagnosticsModal: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const [suiteSummary, setSuiteSummary] = useState<LiveTrackingTestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'passed' | 'failed'>('all');
  const [copied, setCopied] = useState<boolean>(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const summary = await runCompleteLiveTrackingTestSuite();
      setSuiteSummary(summary);
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen && !suiteSummary) {
      handleRunTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredResults = (suiteSummary?.results || []).filter((r) => {
    if (selectedFilter === 'passed') return r.status === 'passed';
    if (selectedFilter === 'failed') return r.status === 'failed';
    return true;
  });

  const handleCopyReport = () => {
    if (!suiteSummary) return;
    const reportText = [
      `=== LIVE TRACKING SYSTEM TEST REPORT ===`,
      `Executed: ${new Date(suiteSummary.executedAt).toLocaleString('en-IN')}`,
      `Total Tests: ${suiteSummary.total} | Passed: ${suiteSummary.passed} | Failed: ${suiteSummary.failed}`,
      ``,
      ...suiteSummary.results.map(
        (r, i) =>
          `[${r.status.toUpperCase()}] ${i + 1}. ${r.name} (${r.category}) - ${r.durationMs}ms\n  Details: ${
            r.details
          }${r.error ? `\n  Error: ${r.error}` : ''}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div
        id="admin-live-tracking-diagnostics-modal"
        className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  लाइव ट्रैकिंग सिस्टम परीक्षण (Live Tracking Diagnostics)
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                  Phase 15
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                12-बिंदु व्यापक सत्यापन: GPS, मैप्स, दूरी, ETA, स्टेटस व सुरक्षा गेट्स
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunTests}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>पुनः परीक्षण करें</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40">
          <div className="p-3 rounded-2xl bg-white dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80">
            <div className="text-[11px] font-medium text-stone-500 dark:text-stone-400">कुल परीक्षण (Total)</div>
            <div className="text-xl font-black text-stone-900 dark:text-stone-100 mt-1">
              {suiteSummary?.total ?? 12}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">सफल (Passed)</div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
              {suiteSummary?.passed ?? 0}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60">
            <div className="text-[11px] font-medium text-rose-700 dark:text-rose-400">विफल (Failed)</div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-300 mt-1">
              {suiteSummary?.failed ?? 0}
            </div>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs bg-white dark:bg-stone-900">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              सभी ({suiteSummary?.total ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('passed')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedFilter === 'passed'
                  ? 'bg-emerald-600 text-white'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
              }`}
            >
              सफल ({suiteSummary?.passed ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('failed')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                selectedFilter === 'failed'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50'
              }`}
            >
              विफल ({suiteSummary?.failed ?? 0})
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopyReport}
            className="flex items-center gap-1 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-indigo-600 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>रिपोर्ट कॉपी हो गई</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>रिपोर्ट कॉपी करें</span>
              </>
            )}
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {isRunning ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-semibold">लाइव ट्रैकिंग परीक्षण रन हो रहे हैं...</p>
            </div>
          ) : (
            filteredResults.map((test, index) => {
              const isPass = test.status === 'passed';
              return (
                <div
                  key={test.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isPass
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50'
                      : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {isPass ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                            {index + 1}. {test.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            {test.category}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                          {test.details}
                        </p>
                        {test.error && (
                          <p className="text-xs font-mono text-rose-700 dark:text-rose-300 mt-1.5 p-2 rounded-xl bg-rose-100/70 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800">
                            {test.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isPass
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {test.status}
                      </span>
                      <div className="text-[10px] font-mono text-stone-400 mt-1">
                        {test.durationMs}ms
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex items-center justify-between">
          <div className="text-xs text-stone-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>लाइव ट्रैकिंग सिस्टम पूर्णतः प्रमाणित एवं सक्रिय</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-xs font-bold transition-colors cursor-pointer"
          >
            पूर्ण (Done)
          </button>
        </div>
      </div>
    </div>
  );
};

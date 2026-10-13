import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ChevronRight,
  X,
  ShieldAlert,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { proLowNetworkService } from '../../services/proLowNetworkService';
import { ProOfflineJobRecord } from '../../types';
import { useToast } from '../../context/ToastContext';

export const ProLowNetworkBar: React.FC = () => {
  const { addToast } = useToast();
  const [syncState, setSyncState] = useState<string>('online');
  const [cachedJobs, setCachedJobs] = useState<ProOfflineJobRecord[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeJob, setActiveJob] = useState<ProOfflineJobRecord | null>(null);
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const unsub = proLowNetworkService.subscribe((state, jobs) => {
      setSyncState(state);
      setCachedJobs(jobs);
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await proLowNetworkService.syncPendingDrafts();
      if (res.syncedCount > 0) {
        addToast(`${res.syncedCount} कार्य नोट्स और चेकलिस्ट सफलतापूर्वक सर्वर पर सिंक हुईं!`, 'success');
      } else if (res.errors > 0) {
        addToast('कुछ नोट्स सिंक करने में त्रुटि आई। कृपया पुनः प्रयास करें।', 'error');
      } else {
        addToast('सभी कार्य पहले से सिंक हैं।', 'info');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenJobDraft = (job: ProOfflineJobRecord) => {
    setActiveJob(job);
    setDraftNotes(job.draftWorkNotes || '');
  };

  const handleSaveNotes = async () => {
    if (!activeJob) return;
    await proLowNetworkService.saveDraftWorkNotes(activeJob.bookingId, draftNotes, activeJob.taskChecklist);
    addToast('कार्य नोट्स स्थानीय डिवाइस पर सुरक्षित सहेजे गए!', 'info');
    setActiveJob(null);
  };

  const handleToggleChecklist = async (chkId: string) => {
    if (!activeJob) return;
    const updated = activeJob.taskChecklist.map((c) =>
      c.id === chkId ? { ...c, completed: !c.completed } : c
    );
    setActiveJob({ ...activeJob, taskChecklist: updated });
    await proLowNetworkService.saveDraftWorkNotes(activeJob.bookingId, draftNotes, updated);
  };

  const pendingCount = cachedJobs.filter((j) => j.pendingSyncDraft).length;

  return (
    <>
      {/* Low Network Bar in Pro Dashboard */}
      <div
        className={`w-full rounded-2xl p-3 border flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs transition-all ${
          syncState === 'offline'
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : pendingCount > 0
            ? 'bg-blue-50 border-blue-300 text-blue-950'
            : 'bg-stone-50 border-stone-200 text-stone-700'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
              syncState === 'offline'
                ? 'bg-amber-200 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {syncState === 'offline' ? (
              <WifiOff className="w-4 h-4 animate-pulse" />
            ) : (
              <Wifi className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {syncState === 'offline'
                  ? 'कमजोर / बंद इंटरनेट (Low-Network Mode Active)'
                  : 'नेटवर्क कनेक्टेड (Online)'}
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  syncState === 'offline'
                    ? 'bg-amber-200 text-amber-900'
                    : pendingCount > 0
                    ? 'bg-blue-200 text-blue-900'
                    : 'bg-emerald-200 text-emerald-900'
                }`}
              >
                {syncState === 'offline'
                  ? 'ऑफ़लाइन कैशिंग'
                  : pendingCount > 0
                  ? `${pendingCount} नोट्स सिंक प्रतीक्षारत`
                  : 'सिंक पूर्ण'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              आबंटित जॉब्स, टास्क चेकलिस्ट व ड्राफ्ट नोट्स IndexedDB में सुरक्षित रहते हैं।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 font-bold text-stone-800 transition flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-stone-500" />
            <span>ऑफ़लाइन जॉब्स ({cachedJobs.length})</span>
          </button>

          {syncState !== 'offline' && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'सिंक हो रहा है...' : 'सिंक करें (Sync)'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Jobs Inspection Drawer / Modal */}
      {isDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900 text-base flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  लो-नेटवर्क जॉब मैनेजर (Low-Network Offline Jobs)
                </h3>
                <p className="text-xs text-stone-500">
                  इंटरनेट न होने पर भी आप जॉब विवरण देख सकते हैं और चेकलिस्ट भर सकते हैं।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {/* Security Warning Notice */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>सुरक्षा नियम:</strong> ग्राहक भुगतान सत्यापन, ओटीपी और अंतिम बिलिंग केवल आधिकारिक ऑनलाइन नेटवर्क पर ही मान्य होती है। यहाँ केवल कार्य नोट्स व चेकलिस्ट सुरक्षित की जा सकती हैं।
                </p>
              </div>

              {cachedJobs.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  स्थानीय कैश में कोई जॉब सुरक्षित नहीं है। जॉब स्वीकार होते ही वह यहाँ स्वतः कैश हो जाती है।
                </div>
              ) : (
                cachedJobs.map((job) => (
                  <div
                    key={job.bookingId}
                    className="p-3.5 rounded-2xl border border-stone-200 bg-white shadow-xs space-y-2 hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-stone-900 text-sm block">
                          {job.serviceName}
                        </span>
                        <span className="text-xs text-stone-500">
                          #{job.bookingId} • ग्राहक: {job.customerName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          job.pendingSyncDraft
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {job.pendingSyncDraft ? 'ड्राफ्ट पेंडिंग' : 'सिंक है'}
                      </span>
                    </div>

                    <div className="text-xs text-stone-500 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {job.scheduledDate} ({job.scheduledTime})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {job.address}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-xs text-stone-500">
                        चेकलिस्ट: {job.taskChecklist.filter((c) => c.completed).length} / {job.taskChecklist.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenJobDraft(job)}
                        className="px-3 py-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-lg transition"
                      >
                        चेकलिस्ट व नोट्स खोलें
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Draft Modal */}
      {activeJob && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-900 text-sm">
                  {activeJob.serviceName} (#{activeJob.bookingId})
                </h4>
                <p className="text-xs text-stone-500">ऑफ़लाइन चेकलिस्ट एवं कार्य विवरण</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveJob(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              <div>
                <span className="font-bold text-xs text-stone-800 block mb-2">
                  कार्य चेकलिस्ट (Checklist):
                </span>
                <div className="space-y-2">
                  {activeJob.taskChecklist.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-stone-50 border border-stone-200 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={c.completed}
                        onChange={() => handleToggleChecklist(c.id)}
                        className="rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className={c.completed ? 'line-through text-stone-400' : 'text-stone-800 font-medium'}>
                        {c.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-xs text-stone-800 block mb-1">
                  कार्य नोट्स (Technician Work Notes):
                </label>
                <textarea
                  rows={3}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="उदा. कॉइल में लीकेज मिली, नया कैपेसिटर 45 MFD लगाया।"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveNotes}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                ड्राफ्ट स्थानीय रूप से सहेजें (Save Draft)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Calendar,
  IndianRupee,
  MapPin,
  ChevronRight,
  X,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useOfflineBookingSync } from '../../hooks/useOfflineBookingSync';
import { useToast } from '../../context/ToastContext';

export const PendingSyncBanner: React.FC = () => {
  const { isOnline, pendingQueue, isSyncing, syncNow, deletePending } = useOfflineBookingSync();
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const pendingCount = pendingQueue.length;

  const handleManualSync = async () => {
    if (!isOnline) {
      addToast('आप अभी भी ऑफ़लाइन हैं। इंटरनेट उपलब्ध होने पर सिंक पुनः प्रयास करें।', 'warning');
      return;
    }
    const result = await syncNow();
    if (result.succeeded > 0) {
      addToast({
        type: 'success',
        title: 'सफलतापूर्वक सिंक हुआ!',
        description: `${result.succeeded} ऑफ़लाइन बुकिंग्स सफलतापूर्वक Firestore पर भेज दी गईं।`,
      });
    } else if (result.failed > 0) {
      addToast({
        type: 'error',
        title: 'सिंक अधूरा रहा',
        description: `${result.failed} बुकिंग सिंक करने में त्रुटि आई। कृपया पुनः प्रयास करें।`,
      });
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस ऑफ़लाइन बुकिंग को कतार से हटाना चाहते हैं?')) {
      await deletePending(id);
      addToast('बुकिंग ऑफ़लाइन कतार से हटा दी गई।', 'info');
    }
  };

  // Don't render banner if online, nothing pending, and not in modal
  if (isOnline && pendingCount === 0 && !isModalOpen) {
    return null;
  }

  return (
    <>
      {/* Top Floating Notification Banner */}
      {!dismissedBanner && (
        <aside
          role="region"
          aria-label="Offline Booking Synchronization Queue"
          className={`w-full z-40 transition-all duration-300 border-b text-sm px-4 py-2.5 shadow-sm ${
            !isOnline
              ? 'bg-amber-500 text-stone-950 border-amber-600'
              : pendingCount > 0
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-stone-800 text-stone-100 border-stone-700'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Status Information */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1 rounded bg-black/10 shrink-0">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 animate-pulse" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </span>
              <div className="truncate">
                {!isOnline ? (
                  <span>
                    <strong className="font-semibold">ऑफ़लाइन मोड (Offline Mode):</strong> नई
                    बुकिंग्स सुरक्षित IndexedDB कतार में सहेजी जाएंगी।
                  </span>
                ) : (
                  <span>
                    <strong className="font-semibold">इंटरनेट पुनः कनेक्ट हुआ:</strong>{' '}
                    {pendingCount} ऑफ़लाइन बुकिंग्स सिंक की प्रतीक्षा में हैं।
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 font-medium bg-black/20 px-2 py-0.5 rounded-full text-xs">
                    <Database className="w-3 h-3" />
                    {pendingCount} लंबित
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-black/15 hover:bg-black/25 active:scale-95 transition flex items-center gap-1"
                >
                  कतार देखें (Queue)
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              {isOnline && pendingCount > 0 && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="px-3 py-1 text-xs font-bold rounded shadow-sm bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 transition flex items-center gap-1.5 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'सिंक हो रहा है...' : 'अभी सिंक करें (Sync)'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="p-1 rounded hover:bg-black/15 active:scale-90 transition text-current opacity-80 hover:opacity-100"
                title="बंद करें (Dismiss)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Persistent Small Floating Badge if Banner Dismissed but Queue Has Items */}
      {dismissedBanner && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`fixed bottom-20 right-4 z-40 px-3 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition active:scale-95 ${
            isOnline
              ? 'bg-emerald-600 text-white hover:bg-emerald-700 animate-bounce'
              : 'bg-amber-600 text-stone-950 hover:bg-amber-700'
          }`}
          title="लंबित सिंक कतार देखें"
        >
          <Database className="w-4 h-4" />
          <span>{pendingCount} ऑफ़लाइन बुकिंग्स</span>
        </button>
      )}

      {/* Queue Details Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pending-sync-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    !isOnline ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pending-sync-modal-title" className="font-bold text-base sm:text-lg text-stone-900 flex items-center gap-2">
                    लंबित तुल्यकालन कतार (Pending Synchronization)
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-stone-200 text-stone-700">
                      {pendingCount} कुल
                    </span>
                  </h3>
                  <p className="text-xs text-stone-500">
                    ब्राउज़र IndexedDB में सुरक्षित ऑफ़लाइन बुकिंग्स
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Network Banner inside Modal */}
            <div
              className={`px-4 py-2 text-xs flex items-center justify-between ${
                isOnline ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium">
                {isOnline ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                    <span>इंटरनेट सक्रिय है (Online) — सिंक तैयार है।</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>डिवाइस ऑफ़लाइन है (Offline) — इंटरनेट आते ही सिंक होगा।</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] opacity-80">
                <ShieldCheck className="w-3.5 h-3.5" />
                IndexedDB Persistent Store
              </div>
            </div>

            {/* Queue Item List */}
            <div className="p-4 sm:p-5 overflow-y-auto divide-y divide-stone-100 flex-1">
              {pendingCount === 0 ? (
                <div className="py-12 text-center text-stone-500">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold text-stone-800">कतार में कोई लंबित बुकिंग नहीं है!</p>
                  <p className="text-xs text-stone-400 mt-1">
                    आपकी सभी बुकिंग्स Firestore डेटाबेस पर पूरी तरह सुरक्षित और सिंक हैं।
                  </p>
                </div>
              ) : (
                pendingQueue.map((item) => {
                  const b = item.booking;
                  return (
                    <div
                      key={item.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm truncate">
                            {b.serviceName || 'सेवा'}
                          </span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              item.status === 'syncing'
                                ? 'bg-blue-100 text-blue-700 animate-pulse'
                                : item.status === 'failed'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                            {item.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                            {item.status === 'pending' && <Clock className="w-3 h-3" />}
                            {item.status === 'syncing'
                              ? 'सिंक हो रहा है...'
                              : item.status === 'failed'
                              ? 'विफल (पुनः प्रयास करें)'
                              : 'ऑफ़लाइन लंबित'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            {b.scheduledDate} {b.scheduledTime && `(${b.scheduledTime})`}
                          </span>
                          <span className="flex items-center gap-1 font-semibold text-stone-700">
                            <IndianRupee className="w-3 h-3 text-stone-400" />₹{b.amount || b.totalAmount || 0}
                          </span>
                          <span className="text-stone-400">
                            {b.paymentMethod === 'cash' ? 'Pay on Service (Cash)' : b.paymentMethod}
                          </span>
                          {b.address && (
                            <span className="flex items-center gap-1 truncate max-w-xs text-stone-500">
                              <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                              <span className="truncate">{b.address}</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span>बुकिंग ID: #{item.id}</span>
                          <span>•</span>
                          <span>सहेजा गया: {new Date(item.timestamp).toLocaleTimeString()}</span>
                          {item.retryCount > 0 && (
                            <>
                              <span>•</span>
                              <span>प्रयास: {item.retryCount}</span>
                            </>
                          )}
                        </div>

                        {item.lastError && (
                          <div className="text-xs text-rose-600 bg-rose-50 rounded p-1.5 font-mono">
                            त्रुटि: {item.lastError}
                          </div>
                        )}
                      </div>

                      {/* Actions per item */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="कतार से हटाएं"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-500 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-stone-400" />
                <span>IndexedDB सुरक्षित स्थानीय भंडारण</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 rounded-lg transition"
                >
                  बंद करें
                </button>

                {pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isSyncing || !isOnline}
                    className="px-4 py-2 text-xs font-bold rounded-xl shadow-sm bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'सिंक प्रगति में है...' : 'सभी को अभी सिंक करें (Push to Firestore)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

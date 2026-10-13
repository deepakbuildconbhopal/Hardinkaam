import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { TaskEarningRecord } from '../../types/workAndJobs';

export const AdminTaskPayoutsManager: React.FC = () => {
  const { addToast } = useToast();
  const [earnings, setEarnings] = useState<TaskEarningRecord[]>([]);
  const [selectedEarning, setSelectedEarning] = useState<TaskEarningRecord | null>(null);
  const [utr, setUtr] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const all = await workAndJobsService.getAllEarnings();
      setEarnings(all);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (earningId: string, status: 'PAID' | 'REJECTED') => {
    try {
      await workAndJobsService.updatePayoutStatus(earningId, status, utr);
      addToast(`Payout marked as ${status.toLowerCase()}`, 'success');
      setSelectedEarning(null);
      setUtr('');
      loadEarnings();
    } catch (e: any) {
      addToast('Failed to update payout', 'error');
    }
  };

  const handleRunDailyReconciliation = async () => {
    try {
      setIsReconciling(true);
      const res = await workAndJobsService.runDailyTaskReconciliationAndPayouts();
      addToast(`सफलतापूर्वक दैनिक कार्य समेकन पूर्ण हुआ! ${res.reconciledCount} tasks reconciled, ₹${res.totalAmountPaid} credited to wallets.`, 'success');
      loadEarnings();
    } catch (e: any) {
      addToast(e.message || 'दैनिक कार्य समेकन विफल रहा', 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900">Task Payout Center & Automated Reconciliation</h2>
          <p className="text-stone-500 text-sm">Review approved task earnings, record UTR, or run automated daily reconciliation (up to 3 daily tasks at ₹10 each consolidated into wallet).</p>
        </div>
        <button
          onClick={handleRunDailyReconciliation}
          disabled={isReconciling}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold px-5 py-3 rounded-2xl shadow-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {isReconciling ? 'Processing...' : '⚡ Run Daily Task Reconciliation & Wallet Payouts'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase">
                <th className="p-4">Customer</th>
                <th className="p-4">Task Title</th>
                <th className="p-4">Approved Amount</th>
                <th className="p-4">Payout Status</th>
                <th className="p-4">UTR / Ref</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {earnings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">No task payout records found.</td>
                </tr>
              ) : (
                earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50/50 transition">
                    <td className="p-4 font-bold text-stone-900">{e.customerName}</td>
                    <td className="p-4 font-medium text-stone-800">{e.taskTitle}</td>
                    <td className="p-4 font-black text-emerald-600">₹{e.payableAmount}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        e.payoutStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {e.payoutStatus}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-stone-600">{e.utrReference || '—'}</td>
                    <td className="p-4 text-right">
                      {e.payoutStatus !== 'PAID' && (
                        <button
                          onClick={() => {
                            setSelectedEarning(e);
                            setUtr('');
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow"
                        >
                          Pay & Record 💳
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEarning && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-stone-900 mb-2">Record Task Payout</h3>
            <p className="text-sm font-bold text-emerald-700">Amount: ₹{selectedEarning.payableAmount}</p>
            <p className="text-xs text-stone-500 mb-4">Customer: {selectedEarning.customerName}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                  placeholder="e.g. UTR123456789"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm outline-none uppercase font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setSelectedEarning(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedEarning.id, 'PAID')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-sm shadow"
                >
                  Confirm Paid ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

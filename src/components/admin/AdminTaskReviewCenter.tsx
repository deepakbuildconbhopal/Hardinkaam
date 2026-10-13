import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { TaskSubmission } from '../../types/workAndJobs';
import { exportTaskMonthlyReportToPDF } from '../../utils/taskReportExport';

export const AdminTaskReviewCenter: React.FC = () => {
  const { addToast } = useToast();
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('SUBMITTED');
  const [activeTab, setActiveTab] = useState<'REVIEW_QUEUE' | 'COMPLETED_HISTORY' | 'TASK_RECONCILIATION'>('REVIEW_QUEUE');
  const [selectedSub, setSelectedSub] = useState<TaskSubmission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const all = await workAndJobsService.getAllSubmissions();
      setSubmissions(all);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReview = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedSub) return;
    try {
      await workAndJobsService.reviewSubmission(selectedSub.id, status, adminNote, rejectionReason);
      addToast(`Submission ${status.toLowerCase()} successfully!`, 'success');
      setSelectedSub(null);
      setAdminNote('');
      setRejectionReason('');
      loadSubmissions();
    } catch (e: any) {
      addToast('Failed to review submission', 'error');
    }
  };

  const filtered = filterStatus === 'ALL' ? submissions : submissions.filter(s => s.status === filterStatus);
  const historySubmissions = submissions.filter(s => {
    const matchesStatus = s.status === 'APPROVED' || s.status === 'REJECTED' || s.status === 'PAID';
    const matchesSearch = searchTerm === '' || 
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customerPhone && s.customerPhone.includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  const flaggedDiscrepancies = React.useMemo(() => {
    const list: Array<{
      sub: TaskSubmission;
      anomalyType: 'RAPID_SUCCESSION' | 'DUPLICATE_PROOF' | 'DOUBLE_COUNTING';
      severity: 'HIGH' | 'MEDIUM';
      reason: string;
    }> = [];

    const userSubMap: Record<string, TaskSubmission[]> = {};
    const proofTextMap: Record<string, TaskSubmission[]> = {};

    for (const sub of submissions) {
      if (!userSubMap[sub.customerId]) userSubMap[sub.customerId] = [];
      userSubMap[sub.customerId].push(sub);

      if (sub.proofText && sub.proofText.trim().length > 3) {
        const pKey = sub.proofText.trim().toLowerCase();
        if (!proofTextMap[pKey]) proofTextMap[pKey] = [];
        proofTextMap[pKey].push(sub);
      }
    }

    for (const [customerId, subs] of Object.entries(userSubMap)) {
      const sorted = [...subs].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const diffMinutes = (new Date(curr.submittedAt).getTime() - new Date(prev.submittedAt).getTime()) / 60000;
        if (diffMinutes < 3) {
          list.push({
            sub: curr,
            anomalyType: 'RAPID_SUCCESSION',
            severity: 'HIGH',
            reason: `Submitted only ${Math.round(diffMinutes * 60)} seconds after previous task by same user (Potential double-counting/bot activity).`
          });
        }
      }
    }

    for (const [proof, subs] of Object.entries(proofTextMap)) {
      if (subs.length > 1) {
        for (let i = 1; i < subs.length; i++) {
          list.push({
            sub: subs[i],
            anomalyType: 'DUPLICATE_PROOF',
            severity: 'HIGH',
            reason: `Exact identical proof text submitted across multiple tasks by ${subs[i].customerName}.`
          });
        }
      }
    }

    return list;
  }, [submissions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900">Task Review & Reconciliation Engine</h2>
          <p className="text-stone-500 text-sm">Review customer submissions, track history, and detect automated fraud or double-counting anomalies.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('REVIEW_QUEUE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'REVIEW_QUEUE' ? 'bg-teal-600 text-white shadow' : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            📋 Review Queue
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED_HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'COMPLETED_HISTORY' ? 'bg-teal-600 text-white shadow' : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            📜 Task Completion History
          </button>
          <button
            onClick={() => setActiveTab('TASK_RECONCILIATION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'TASK_RECONCILIATION' ? 'bg-indigo-600 text-white shadow' : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            🛡️ Reconciliation Engine {flaggedDiscrepancies.length > 0 && <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">{flaggedDiscrepancies.length}</span>}
          </button>
        </div>
      </div>

      {activeTab === 'REVIEW_QUEUE' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filterStatus === st ? 'bg-teal-600 text-white shadow' : 'bg-white text-stone-600 border border-stone-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase">
                    <th className="p-4">Customer</th>
                    <th className="p-4">Task Title</th>
                    <th className="p-4">Submitted At</th>
                    <th className="p-4">Reward</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">No submissions found.</td>
                    </tr>
                  ) : (
                    filtered.map((sub) => (
                      <tr key={sub.id} className="hover:bg-stone-50/50 transition">
                        <td className="p-4 font-bold text-stone-900">
                          {sub.customerName}
                          <span className="block text-xs font-normal text-stone-500">{sub.customerPhone}</span>
                        </td>
                        <td className="p-4 font-medium text-stone-800">{sub.taskTitle}</td>
                        <td className="p-4 text-stone-500 text-xs">{new Date(sub.submittedAt).toLocaleString('en-IN')}</td>
                        <td className="p-4 font-black text-emerald-600">₹{sub.rewardAmount}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            sub.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            sub.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedSub(sub)}
                            className="bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow"
                          >
                            Review 🔍
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'COMPLETED_HISTORY' ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by user name or task title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 px-4 py-2 rounded-xl border border-stone-300 text-sm outline-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs font-bold text-stone-600">
                Total Processed Logs: <span className="text-teal-600 font-black">{historySubmissions.length}</span> | Disbursed: <span className="text-emerald-600 font-black">₹{historySubmissions.filter(s => s.status === 'APPROVED' || s.status === 'PAID').length * 10}</span>
              </div>
              <button
                onClick={() => exportTaskMonthlyReportToPDF(historySubmissions, 'Current Month Report')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow transition flex items-center gap-1.5"
              >
                <span>📥 Download Monthly Report (PDF)</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase">
                    <th className="p-4">Customer Name / Phone</th>
                    <th className="p-4">Task Title</th>
                    <th className="p-4">Task Timestamp</th>
                    <th className="p-4">Reward Amount</th>
                    <th className="p-4">Verification Status</th>
                    <th className="p-4">Admin Feedback / Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {historySubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">No task completion history logs found.</td>
                    </tr>
                  ) : (
                    historySubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-stone-50/50 transition">
                        <td className="p-4 font-bold text-stone-900">
                          {sub.customerName}
                          <span className="block text-xs font-mono font-normal text-stone-500">{sub.customerPhone || '—'}</span>
                        </td>
                        <td className="p-4 font-medium text-stone-800">{sub.taskTitle}</td>
                        <td className="p-4 text-xs text-stone-600">
                          <div>Submitted: {new Date(sub.submittedAt).toLocaleString('en-IN')}</div>
                          {sub.reviewedAt && <div className="text-teal-600 mt-0.5">Reviewed: {new Date(sub.reviewedAt).toLocaleString('en-IN')}</div>}
                        </td>
                        <td className="p-4 font-black text-emerald-600">₹{sub.rewardAmount || 10}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            sub.status === 'APPROVED' || sub.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-stone-600">
                          {sub.adminNote ? <div>Note: {sub.adminNote}</div> : null}
                          {sub.rejectionReason ? <div className="text-rose-600">Reason: {sub.rejectionReason}</div> : null}
                          {!sub.adminNote && !sub.rejectionReason && '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-black mb-1">🛡️ Automated Task Reconciliation & Fraud Defense Engine</h3>
              <p className="text-xs text-indigo-200 max-w-2xl">
                Real-time automated auditing engine comparing reported task completions with submission timestamps and proof uniqueness to flag double-counting, rapid bot submissions, and duplicate proof fraud.
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-center">
              <span className="block text-xs uppercase tracking-wider text-indigo-200 font-bold">Flagged Anomalies</span>
              <span className="text-2xl font-black text-rose-400">{flaggedDiscrepancies.length}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-700 uppercase flex items-center justify-between">
              <span>Discrepancy & Fraud Audit Log</span>
              <span>Total Flagged: {flaggedDiscrepancies.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50/50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Task Title</th>
                    <th className="p-4">Anomaly Type</th>
                    <th className="p-4">Severity</th>
                    <th className="p-4">Reconciliation Discrepancy Reason</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {flaggedDiscrepancies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-stone-500">
                        <div className="text-emerald-600 font-bold mb-1">No discrepancies or fraud detected! 🎉</div>
                        <div className="text-xs text-stone-400">All task completions adhere to timing and proof uniqueness standards.</div>
                      </td>
                    </tr>
                  ) : (
                    flaggedDiscrepancies.map((item, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition">
                        <td className="p-4 font-bold text-stone-900">
                          {item.sub.customerName}
                          <span className="block text-xs font-mono font-normal text-stone-500">{item.sub.customerPhone || '—'}</span>
                        </td>
                        <td className="p-4 font-medium text-stone-800">{item.sub.taskTitle}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                            {item.anomalyType}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                            {item.severity}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-stone-700 font-medium">
                          {item.reason}
                          <div className="text-[11px] text-stone-400 mt-0.5">Submitted at: {new Date(item.sub.submittedAt).toLocaleString('en-IN')}</div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedSub(item.sub)}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow"
                          >
                            Investigate ⚡
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedSub && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-black text-stone-900 mb-2">Review Task Submission</h3>
            <p className="text-sm font-bold text-teal-700">{selectedSub.taskTitle}</p>
            <p className="text-xs text-stone-500 mb-4">Customer: {selectedSub.customerName} ({selectedSub.customerPhone})</p>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 mb-4">
              <span className="block text-xs font-bold text-stone-500 uppercase mb-1">Customer Proof / Submission Text</span>
              <p className="text-sm text-stone-800 whitespace-pre-line">{selectedSub.proofText || 'No proof text provided.'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Admin Internal Note (Optional)</label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. Verified successfully."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Rejection Reason (Required if rejecting)</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Invalid or incomplete proof data."
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setSelectedSub(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100"
                >
                  Close
                </button>
                <button
                  onClick={() => handleReview('REJECTED')}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow"
                >
                  Reject ❌
                </button>
                <button
                  onClick={() => handleReview('APPROVED')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow"
                >
                  Approve & Credit ₹{selectedSub.rewardAmount} ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

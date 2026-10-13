import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { TaskDefinition, TaskSubmission, TaskEarningRecord, PayoutProfile } from '../../types/workAndJobs';
import { AdSenseBanner } from '../ads/AdSenseBanner';

interface WorkFromHomeHubProps {
  onOpenAuth: (role?: any) => void;
  onSelectTab: (tab: string) => void;
}

export const WorkFromHomeHub: React.FC<WorkFromHomeHubProps> = ({ onOpenAuth, onSelectTab }) => {
  const { currentUser, userProfile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'available' | 'my_tasks' | 'earnings' | 'payout_profile'>('available');
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [earnings, setEarnings] = useState<TaskEarningRecord[]>([]);
  const [payoutProfile, setPayoutProfile] = useState<PayoutProfile | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskDefinition | null>(null);

  // Submission form state
  const [proofText, setProofText] = useState('');
  const [submissionAnswers, setSubmissionAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Payout profile form state
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [preferredMethod, setPreferredMethod] = useState<'BANK_TRANSFER' | 'UPI'>('UPI');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentUser?.uid]);

  const loadData = async () => {
    try {
      const allTasks = await workAndJobsService.getTasks();
      setTasks(allTasks);

      if (currentUser?.uid) {
        const mySubs = await workAndJobsService.getCustomerSubmissions(currentUser.uid);
        setSubmissions(mySubs);

        const myEarns = await workAndJobsService.getCustomerEarnings(currentUser.uid);
        setEarnings(myEarns);

        const profile = await workAndJobsService.getPayoutProfile(currentUser.uid);
        if (profile) {
          setPayoutProfile(profile);
          setAccountHolder(profile.accountHolderName);
          setBankName(profile.bankName);
          setAccountNumber(profile.accountNumber);
          setIfsc(profile.ifsc);
          setUpiId(profile.upiId);
          setPreferredMethod(profile.preferredMethod);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaimTask = (task: TaskDefinition) => {
    if (!currentUser) {
      addToast('कृपया पहले लॉगिन करें / Please login first', 'info');
      onOpenAuth('customer');
      return;
    }
    setSelectedTask(task);
    setProofText('');
    setSubmissionAnswers({});
  };

  const handleSubmitTaskProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !currentUser) return;
    setSubmitting(true);
    try {
      await workAndJobsService.submitTask({
        taskId: selectedTask.id,
        taskTitle: selectedTask.title,
        customerId: currentUser.uid,
        customerName: userProfile?.name || currentUser.displayName || 'Customer',
        customerPhone: userProfile?.phone || currentUser.phoneNumber || '',
        submissionData: submissionAnswers,
        proofText,
        rewardAmount: selectedTask.rewardAmount
      });
      addToast('Task submitted successfully! Under review.', 'success');
      setSelectedTask(null);
      setActiveTab('my_tasks');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to submit task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSavePayoutProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      const profile: PayoutProfile = {
        customerId: currentUser.uid,
        accountHolderName: accountHolder,
        bankName,
        accountNumber,
        ifsc,
        upiId,
        preferredMethod,
        verificationStatus: 'VERIFIED', // auto-verified or pending
        verifiedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await workAndJobsService.savePayoutProfile(profile);
      setPayoutProfile(profile);
      addToast('Payout profile saved successfully!', 'success');
    } catch (e: any) {
      addToast('Failed to save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const totalEarningsAmount = earnings.reduce((sum, e) => sum + (e.payoutStatus === 'PAID' ? e.payableAmount : 0), 0);
  const pendingEarningsAmount = earnings.reduce((sum, e) => sum + (e.payoutStatus !== 'PAID' ? e.payableAmount : 0), 0);

  return (
    <div className="space-y-6 pb-12 animate-entry">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-700 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <span className="bg-white/20 text-teal-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            🏠 Work From Home Hub
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-3 leading-tight">
            घर से छोटे-छोटे वास्तविक tasks करके HARDINKAAM network से जुड़ें
          </h1>
          <p className="text-teal-100 mt-2 text-base sm:text-lg">
            Complete verified digital tasks, data verification, and surveys. Earn genuine rewards with direct bank & UPI payouts.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => setActiveTab('available')}
              className={`px-5 py-2.5 rounded-xl font-bold transition shadow ${
                activeTab === 'available' ? 'bg-white text-teal-700' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              🚀 Available Tasks ({tasks.length})
            </button>
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth('customer');
                  return;
                }
                setActiveTab('my_tasks');
              }}
              className={`px-5 py-2.5 rounded-xl font-bold transition shadow ${
                activeTab === 'my_tasks' ? 'bg-white text-teal-700' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📋 My Tasks ({submissions.length})
            </button>
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth('customer');
                  return;
                }
                setActiveTab('earnings');
              }}
              className={`px-5 py-2.5 rounded-xl font-bold transition shadow ${
                activeTab === 'earnings' ? 'bg-white text-teal-700' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              💰 Earnings & Payouts
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {currentUser && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-semibold uppercase">Total Earnings (Paid)</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalEarningsAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 text-xl font-bold">
              ₹
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-semibold uppercase">Pending / Payable</p>
              <p className="text-2xl font-black text-amber-600 mt-1">₹{pendingEarningsAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 text-xl font-bold">
              ⏳
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-500 font-semibold uppercase">Tasks Submitted</p>
              <p className="text-2xl font-black text-teal-600 mt-1">{submissions.length}</p>
            </div>
            <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 text-xl font-bold">
              ✓
            </div>
          </div>
        </div>
      )}

      {/* AdSense In-Page Responsive Unit */}
      <AdSenseBanner
        slot="4829105738"
        format="responsive"
        category="services"
        label="गूगल एडसेंस • WORK FROM HOME SPONSOR"
      />

      {/* Tab Content */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-stone-800">Available Work From Home Tasks</h2>
            <span className="text-sm text-stone-500">{tasks.length} tasks open</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tasks.map((task) => (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 flex flex-col justify-between hover:shadow-md transition">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                      {task.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-semibold text-stone-500 uppercase">{task.difficulty}</span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-lg mt-3">{task.title}</h3>
                  <p className="text-stone-600 text-sm mt-1 line-clamp-2">{task.description}</p>
                  <div className="mt-4 space-y-1.5 text-xs text-stone-500">
                    <p>⏱ Est. Time: {task.estimatedTimeMinutes} mins</p>
                    <p>👥 Slots Left: {task.availableSlots}</p>
                    <p className="text-stone-400">Source: {task.source.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-stone-400 block">Reward</span>
                    <span className="text-lg font-black text-emerald-600">₹{task.rewardAmount}</span>
                  </div>
                  <button
                    onClick={() => handleClaimTask(task)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow transition"
                  >
                    Start Task 🚀
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'my_tasks' && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
          <h2 className="text-xl font-black text-stone-800 mb-4">My Task Submissions</h2>
          {!currentUser ? (
            <div className="text-center py-12">
              <p className="text-stone-600 mb-4">Please login to view your task history.</p>
              <button onClick={() => onOpenAuth('customer')} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold">
                Login / Register
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <p>You haven't claimed or submitted any tasks yet.</p>
              <button onClick={() => setActiveTab('available')} className="mt-4 text-teal-600 font-bold underline">
                Browse available tasks
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-stone-900">{sub.taskTitle}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">Submitted on: {new Date(sub.submittedAt).toLocaleString('en-IN')}</p>
                    {sub.rejectionReason && (
                      <p className="text-xs text-rose-600 mt-1">Rejection Reason: {sub.rejectionReason}</p>
                    )}
                    {sub.adminNote && (
                      <p className="text-xs text-emerald-600 mt-1">Admin Note: {sub.adminNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      sub.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                      sub.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {sub.status}
                    </span>
                    <span className="font-black text-emerald-600 text-base">₹{sub.rewardAmount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-stone-800">Task Earnings & Payout Profile</h2>
            <button
              onClick={() => setActiveTab('payout_profile')}
              className="bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow"
            >
              ⚙️ Manage Payout Profile
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h3 className="font-bold text-stone-800 mb-4">Earnings History</h3>
            {earnings.length === 0 ? (
              <p className="text-stone-500 text-sm">No approved task earnings yet.</p>
            ) : (
              <div className="space-y-3">
                {earnings.map((e) => (
                  <div key={e.id} className="p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-stone-900">{e.taskTitle}</h4>
                      <p className="text-xs text-stone-500">Approved: {new Date(e.createdAt).toLocaleDateString('en-IN')}</p>
                      {e.utrReference && <p className="text-xs text-emerald-600">UTR: {e.utrReference}</p>}
                    </div>
                    <div className="text-right">
                      <span className="font-black text-emerald-600 text-lg">₹{e.payableAmount}</span>
                      <span className={`block text-xs font-bold ${e.payoutStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {e.payoutStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'payout_profile' && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-black text-stone-800 mb-2">Bank / UPI Payout Details</h2>
          <p className="text-stone-500 text-sm mb-6">Enter your verified bank or UPI details for secure direct payouts.</p>
          <form onSubmit={handleSavePayoutProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Account Holder Name</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
                placeholder="e.g. Deepak Verma"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  required
                  placeholder="e.g. State Bank of India"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  required
                  placeholder="e.g. SBIN0001234"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm uppercase"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Account Number</label>
              <input
                type="password"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                placeholder="Enter bank account number"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase mb-1">UPI ID (Fastest Payouts)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. deepak@upi"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('earnings')}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow transition"
              >
                {savingProfile ? 'Saving...' : 'Save Payout Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Execution Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <span className="bg-teal-50 text-teal-700 text-xs font-bold px-3 py-1 rounded-full">
                {selectedTask.category.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-stone-400 hover:text-stone-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <h2 className="text-xl font-black text-stone-900 mt-4">{selectedTask.title}</h2>
            <p className="text-stone-600 text-sm mt-2">{selectedTask.description}</p>

            <div className="mt-4 bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
              <h4 className="font-bold text-stone-800 text-xs uppercase tracking-wider">Instructions:</h4>
              <p className="text-stone-700 text-sm whitespace-pre-line">{selectedTask.instructions}</p>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 block font-semibold uppercase">Reward Upon Approval</span>
                <span className="text-2xl font-black text-emerald-800">₹{selectedTask.rewardAmount}</span>
              </div>
              <div className="text-right text-xs text-emerald-700 font-medium">
                <p>⏱ {selectedTask.estimatedTimeMinutes} mins</p>
                <p>Difficulty: {selectedTask.difficulty}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitTaskProof} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">
                  Submission Proof / Answer ({selectedTask.proofRequirements})
                </label>
                <textarea
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  required
                  rows={4}
                  placeholder="Enter your work details, notes, or verification data..."
                  className="w-full px-4 py-3 rounded-2xl border border-stone-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm shadow transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Task for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

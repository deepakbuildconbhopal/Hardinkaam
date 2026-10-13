import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { TaskDefinition, TaskSubmission, TaskEarningRecord, PayoutProfile, JobPost } from '../../types/workAndJobs';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  Plus,
  Clock,
  Coins,
  ArrowLeft,
  FileCheck2,
  Wallet,
  Users,
  Building2,
  Trash2,
  Edit3,
  Search,
  Filter,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check,
  X,
  CreditCard
} from 'lucide-react';

interface AdminWorkFromManagerProps {
  onBack?: () => void;
}

export const AdminWorkFromManager: React.FC<AdminWorkFromManagerProps> = ({ onBack }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'tasks' | 'submissions' | 'payouts' | 'jobs'>('tasks');
  const [loading, setLoading] = useState(false);

  // Task Definitions state
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null);

  // New task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<TaskDefinition['category']>('BUSINESS_VERIFICATION');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskInstructions, setTaskInstructions] = useState('');
  const [rewardAmount, setRewardAmount] = useState<number>(10);
  const [availableSlots, setAvailableSlots] = useState<number>(50);
  const [estimatedTime, setEstimatedTime] = useState<number>(15);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'ADVANCED'>('EASY');
  const [proofRequirements, setProofRequirements] = useState('');
  const [submissionReqs, setSubmissionReqs] = useState('Confirmation Note / Link');

  // Submissions state
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [filterSubStatus, setFilterSubStatus] = useState<string>('SUBMITTED');
  const [selectedSub, setSelectedSub] = useState<TaskSubmission | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Payout Profiles state
  const [payoutProfiles, setPayoutProfiles] = useState<PayoutProfile[]>([]);
  const [processingPayoutUid, setProcessingPayoutUid] = useState<string | null>(null);

  // Jobs state
  const [jobs, setJobs] = useState<JobPost[]>([]);

  useEffect(() => {
    loadAllData();
  }, [activeTab]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'tasks' || activeTab === 'jobs') {
        const allTasks = await workAndJobsService.getTasks();
        setTasks(allTasks);
        const allJobs = await workAndJobsService.getJobs();
        setJobs(allJobs);
      }
      if (activeTab === 'submissions') {
        const allSubs = await workAndJobsService.getAllSubmissions();
        setSubmissions(allSubs);
      }
      if (activeTab === 'payouts') {
        const allProfiles = await workAndJobsService.getAllPayoutProfiles();
        setPayoutProfiles(allProfiles);
      }
    } catch (e: any) {
      console.error('Error loading Work From Home data:', e);
      addToast('डाटा लोडिंग में रुकावट - पुनः प्रयास करें', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDescription.trim()) {
      addToast('कृपया टास्क का शीर्षक एवं विवरण दर्ज करें', 'warning');
      return;
    }

    try {
      const taskPayload = {
        title: taskTitle.trim(),
        category: taskCategory,
        description: taskDescription.trim(),
        instructions: taskInstructions.trim() || 'अनुदेशों का ध्यानपूर्वक पालन करें।',
        eligibility: 'सभी हार्डिनकाम पंजीकृत ग्राहक',
        difficulty,
        estimatedTimeMinutes: Number(estimatedTime) || 15,
        startDate: new Date().toISOString(),
        deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
        availableSlots: Number(availableSlots) || 50,
        maxAttempts: 2,
        submissionRequirements: submissionReqs.split(',').map(s => s.trim()).filter(Boolean),
        proofRequirements: proofRequirements.trim() || 'स्क्रीनशॉट या विवरण नोट दर्ज करें।',
        rewardAmount: Number(rewardAmount) || 50,
        terms: 'सटीक एवं वैध जानकारी ही स्वीकार की जाएगी। डुप्लीकेट प्रविष्टियां निरस्त होंगी।',
        source: 'HARDINKAAM_INTERNAL' as const,
        status: 'ACTIVE' as const,
        createdAt: new Date().toISOString(),
        createdBy: 'admin_root'
      };

      if (editingTask) {
        await workAndJobsService.updateTask(editingTask.id, taskPayload);
        addToast('टास्क सफलतापूर्वक अपडेट हो गया!', 'success');
      } else {
        await workAndJobsService.createTask(taskPayload);
        addToast('नया वर्क फ्रॉम होम टास्क लाइव हो गया!', 'success');
      }

      resetTaskForm();
      loadAllData();
    } catch (e: any) {
      addToast('टास्क सेव करने में त्रुटि: ' + e.message, 'error');
    }
  };

  const resetTaskForm = () => {
    setIsCreatingTask(false);
    setEditingTask(null);
    setTaskTitle('');
    setTaskDescription('');
    setTaskInstructions('');
    setRewardAmount(75);
    setAvailableSlots(50);
    setEstimatedTime(15);
    setProofRequirements('');
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('क्या आप निश्चित ही इस टास्क को हटाना चाहते हैं?')) return;
    try {
      await workAndJobsService.deleteTask(taskId);
      addToast('टास्क हटा दिया गया है', 'info');
      loadAllData();
    } catch (e: any) {
      addToast('टास्क हटाने में त्रुटि', 'error');
    }
  };

  const handleReviewSubmission = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedSub) return;
    if (status === 'REJECTED' && !rejectionReason.trim()) {
      addToast('कृपया रिजेक्शन का कारण दर्ज करें', 'warning');
      return;
    }

    setReviewing(true);
    try {
      await workAndJobsService.reviewSubmission(selectedSub.id, status, adminNote, rejectionReason);
      addToast(`सबमिशन ${status === 'APPROVED' ? 'स्वीकृत (Approved)' : 'अस्वीकृत (Rejected)'} कर दिया गया!`, 'success');
      setSelectedSub(null);
      setAdminNote('');
      setRejectionReason('');
      loadAllData();
    } catch (e: any) {
      addToast('समीक्षा प्रक्रिया विफल: ' + e.message, 'error');
    } finally {
      setReviewing(false);
    }
  };

  const handleProcessPayoutTransfer = async (profile: PayoutProfile) => {
    const amountStr = window.prompt(`कस्टमर ${profile.accountHolderName || 'यूजर'} के खाते में पेआउट ट्रांसफर राशि दर्ज करें (₹):`, '250');
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      addToast('अमान्य राशि', 'error');
      return;
    }

    setProcessingPayoutUid(profile.customerId);
    try {
      await workAndJobsService.processPayout({
        customerId: profile.customerId,
        amount,
        paymentMethod: profile.preferredMethod,
        transactionRef: `WFH_PAY_${Date.now()}`,
        adminNote: 'Admin DEEPAK Verified Work From Home Payout'
      });
      addToast(`₹${amount} का पेआउट ट्रांसफर सफलतापूर्वक दर्ज हो गया!`, 'success');
      loadAllData();
    } catch (e: any) {
      addToast('पेआउट ट्रांसफर विफल', 'error');
    } finally {
      setProcessingPayoutUid(null);
    }
  };

  const filteredSubmissions = filterSubStatus === 'ALL'
    ? submissions
    : submissions.filter(s => s.status === filterSubStatus);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-2 sm:px-4 py-2">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-amber-300">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl transition cursor-pointer text-white border border-white/20"
              title="वापस एडमिन डैशबोर्ड पर जाएं"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] tracking-wider uppercase">
                HARDINKAAM WFH HUB
              </span>
              <span className="text-xs text-amber-200 font-bold">• 100% ऑनलाइन टास्क</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5 flex items-center gap-2">
              <span>🏠 वर्क फ्रॉम होम व टास्क प्रबंधन</span>
            </h1>
            <p className="text-amber-100 text-xs mt-1 max-w-2xl font-medium">
              ऑनलाइन वर्क फ्रॉम होम टास्क्स बनाएं, ग्राहकों की कार्य समीक्षा करें, रिवॉर्ड अप्रूव करें और बैंक/UPI पेआउट्स प्रोसेस करें।
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadAllData}
            className="px-3.5 py-2 bg-stone-900/40 hover:bg-stone-900/60 rounded-2xl text-xs font-bold text-amber-200 flex items-center gap-1.5 border border-amber-400/30 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>रिफ्रेश</span>
          </button>
          <button
            onClick={() => {
              resetTaskForm();
              setIsCreatingTask(true);
              setActiveTab('tasks');
            }}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs rounded-2xl shadow-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नया WFH टास्क जोड़ें</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 bg-stone-900/90 p-2 rounded-2xl border border-stone-800 shadow-md">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-amber-500 text-stone-950 shadow-md scale-102'
              : 'text-stone-300 hover:bg-stone-800 hover:text-white'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>टास्क लिस्ट ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-teal-500 text-stone-950 shadow-md scale-102'
              : 'text-stone-300 hover:bg-stone-800 hover:text-white'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>सबमिशन समीक्षा ({submissions.length})</span>
          {submissions.filter(s => s.status === 'SUBMITTED').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] animate-pulse">
              {submissions.filter(s => s.status === 'SUBMITTED').length} नए
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
            activeTab === 'payouts'
              ? 'bg-emerald-500 text-stone-950 shadow-md scale-102'
              : 'text-stone-300 hover:bg-stone-800 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>पेआउट्स व बैंक/UPI ({payoutProfiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-blue-500 text-stone-950 shadow-md scale-102'
              : 'text-stone-300 hover:bg-stone-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>जॉब्स व भर्ती ({jobs.length})</span>
        </button>
      </div>

      {/* CREATE / EDIT TASK MODAL */}
      {isCreatingTask && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 text-stone-100 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                <Sparkles className="w-5 h-5" />
                <span>{editingTask ? 'WFH टास्क संपादित करें' : 'नया ऑनलाइन Work From Home टास्क बनाएं'}</span>
              </div>
              <button
                onClick={resetTaskForm}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">टास्क शीर्षक (Title) *</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="उदा. भोपाल लोकल शॉप फोन व एड्रेस वेरिफिकेशन"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">कैटेगरी</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="BUSINESS_VERIFICATION">बिजनेस वेरिफिकेशन (Business Verification)</option>
                    <option value="HINDI_ENGLISH_TYPING">हिंदी/अंग्रेजी टाइपिंग (Typing & Tagging)</option>
                    <option value="WEBSITE_APP_TESTING">वेबसाइट/ऐप टेस्टिंग (App Testing)</option>
                    <option value="DATA_ENTRY">डाटा एंट्री (Data Entry)</option>
                    <option value="SOCIAL_PROMOTION">सोशल मीडिया प्रमोशन (Social Promotion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">रिवॉर्ड राशि (₹ Reward) *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">उपलब्ध स्लॉट्स</label>
                  <input
                    type="number"
                    value={availableSlots}
                    onChange={(e) => setAvailableSlots(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1">अनुमानित समय (Min)</label>
                  <input
                    type="number"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1">कठिनाई (Difficulty)</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="EASY">आसान (EASY)</option>
                    <option value="MEDIUM">मध्यम (MEDIUM)</option>
                    <option value="ADVANCED">एडवांस (ADVANCED)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">टास्क विवरण (Description) *</label>
                <textarea
                  rows={2}
                  required
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="टास्क का संक्षिप्त विवरण लिखें..."
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">विस्तृत अनुदेश (Instructions)</label>
                <textarea
                  rows={2}
                  value={taskInstructions}
                  onChange={(e) => setTaskInstructions(e.target.value)}
                  placeholder="चरणबद्ध निर्देश (Step 1, Step 2...)"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">प्रूफ आवश्यकता (Proof Requirements)</label>
                <input
                  type="text"
                  value={proofRequirements}
                  onChange={(e) => setProofRequirements(e.target.value)}
                  placeholder="उदा. पुष्टि का नोट, कॉल समरी या लिंक"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={resetTaskForm}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl font-bold transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl shadow-lg transition cursor-pointer"
                >
                  {editingTask ? 'टास्क सेव करें' : 'लाइव टास्क प्रकाशित करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: TASK DEFINITIONS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
            <div>
              <h2 className="text-base font-black text-amber-300">ऑनलाइन वर्क फ्रॉम होम टास्क्स ({tasks.length})</h2>
              <p className="text-xs text-stone-400">ग्राहकों व यूजर्स हेतु एक्टिव वर्क फ्रॉम होम टास्क लिस्ट एवं रिवॉर्ड्स</p>
            </div>
            <button
              onClick={() => {
                resetTaskForm();
                setIsCreatingTask(true);
              }}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl flex items-center gap-1 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>नया टास्क जोड़ें</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-amber-500/50 transition shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 font-bold text-[10px]">
                      {t.category.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-xs border border-emerald-500/30">
                      ₹{t.rewardAmount} रिवॉर्ड
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-stone-100 mt-2 line-clamp-2">{t.title}</h3>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-3">{t.description}</p>
                </div>

                <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {t.estimatedTimeMinutes} Min
                    </span>
                    <span>स्लॉट: {t.availableSlots}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTask(t);
                        setTaskTitle(t.title);
                        setTaskCategory(t.category);
                        setTaskDescription(t.description);
                        setTaskInstructions(t.instructions || '');
                        setRewardAmount(t.rewardAmount);
                        setAvailableSlots(t.availableSlots);
                        setEstimatedTime(t.estimatedTimeMinutes);
                        setDifficulty(t.difficulty);
                        setProofRequirements(t.proofRequirements || '');
                        setIsCreatingTask(true);
                      }}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-lg transition cursor-pointer"
                      title="संपादित करें"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1.5 bg-stone-800 hover:bg-rose-900/60 text-rose-400 rounded-lg transition cursor-pointer"
                      title="हटाएं"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SUBMISSIONS REVIEW */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
            <div>
              <h2 className="text-base font-black text-teal-300">टास्क वर्क सबमिशन एवं प्रूफ समीक्षा</h2>
              <p className="text-xs text-stone-400">ग्राहकों द्वारा जमा किए गए प्रूफ का सत्यापन एवं अप्रूवल</p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterSubStatus(st)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterSubStatus === st
                      ? 'bg-teal-500 text-stone-950 shadow'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {st === 'SUBMITTED' ? 'लंबित (Submitted)' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-950 text-stone-400 font-bold border-b border-stone-800 uppercase tracking-wider">
                    <th className="p-3.5">कस्टमर / यूज़र</th>
                    <th className="p-3.5">टास्क शीर्षक</th>
                    <th className="p-3.5">जमा करने की तिथि</th>
                    <th className="p-3.5">रिवॉर्ड राशि</th>
                    <th className="p-3.5">स्थिति</th>
                    <th className="p-3.5 text-right">समीक्षा/एक्शन</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 text-stone-200">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-stone-500">
                        कोई सबमिशन नहीं मिला।
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-stone-800/50 transition">
                        <td className="p-3.5 font-bold text-white">
                          {sub.customerName}
                          <span className="block text-[11px] font-normal text-stone-400">{sub.customerPhone}</span>
                        </td>
                        <td className="p-3.5 font-medium text-stone-300">{sub.taskTitle}</td>
                        <td className="p-3.5 text-stone-400">{new Date(sub.submittedAt).toLocaleString('hi-IN')}</td>
                        <td className="p-3.5 font-black text-emerald-400">₹{sub.rewardAmount}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            sub.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            sub.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {sub.status === 'SUBMITTED' ? 'लंबित' : sub.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedSub(sub);
                              setAdminNote('');
                              setRejectionReason('');
                            }}
                            className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition cursor-pointer"
                          >
                            प्रूफ देखें व समीक्षा
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

      {/* SUBMISSION REVIEW MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-teal-500/40 text-stone-100 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-black text-base">
                <FileCheck2 className="w-5 h-5" />
                <span>टास्क सबमिशन समीक्षा</span>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-1">
                <div className="text-stone-400">कस्टमर: <span className="text-white font-bold">{selectedSub.customerName} ({selectedSub.customerPhone})</span></div>
                <div className="text-stone-400">टास्क: <span className="text-amber-300 font-bold">{selectedSub.taskTitle}</span></div>
                <div className="text-stone-400">रिवॉर्ड राशि: <span className="text-emerald-400 font-black">₹{selectedSub.rewardAmount}</span></div>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">कस्टमर प्रूफ एवं विवरण (Proof Text):</label>
                <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-stone-200 font-mono text-xs whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {selectedSub.proofText || 'कोई प्रूफ टेक्स्ट दर्ज नहीं किया गया।'}
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">एडमिन टिप्पणी (Admin Note - Optional):</label>
                <input
                  type="text"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="उदा. कार्य का सत्यापन पूर्ण"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-teal-400"
                />
              </div>

              {selectedSub.status !== 'APPROVED' && (
                <div>
                  <label className="block text-stone-300 font-bold mb-1">अस्वीकृति का कारण (Rejection Reason - Required if Rejecting):</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="उदा. जानकारी अधूरी या डुप्लीकेट है"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReviewSubmission('REJECTED')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>अस्वीकार करें (Reject)</span>
                </button>
                <button
                  type="button"
                  disabled={reviewing}
                  onClick={() => handleReviewSubmission('APPROVED')}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl shadow-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>स्वीकार व रिवॉर्ड जारी करें (Approve)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYOUT PROFILES & TRANSFERS */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
            <div>
              <h2 className="text-base font-black text-emerald-300">वर्क फ्रॉम होम पेआउट्स व बैंक/UPI प्रोफाइल</h2>
              <p className="text-xs text-stone-400">ग्राहकों के बैंक व UPI खाते का विवरण एवं रिवॉर्ड पेआउट हस्तांतरण</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payoutProfiles.map((p) => (
              <div
                key={p.customerId}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3 shadow-lg hover:border-emerald-500/50 transition"
              >
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">{p.accountHolderName || 'यूजर खाता'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                    {p.preferredMethod}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-300">
                  {p.upiId && (
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-xl border border-stone-800">
                      <span className="text-stone-400">UPI ID:</span>
                      <span className="font-mono font-bold text-amber-300">{p.upiId}</span>
                    </div>
                  )}
                  {p.bankName && (
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-xl border border-stone-800">
                      <span className="text-stone-400">बैंक:</span>
                      <span>{p.bankName}</span>
                    </div>
                  )}
                  {p.accountNumber && (
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-xl border border-stone-800">
                      <span className="text-stone-400">खाता संख्या:</span>
                      <span className="font-mono">{p.accountNumber}</span>
                    </div>
                  )}
                  {p.ifsc && (
                    <div className="flex items-center justify-between bg-stone-950 p-2 rounded-xl border border-stone-800">
                      <span className="text-stone-400">IFSC कोड:</span>
                      <span className="font-mono">{p.ifsc}</span>
                    </div>
                  )}
                </div>

                <button
                  disabled={processingPayoutUid === p.customerId}
                  onClick={() => handleProcessPayoutTransfer(p)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Coins className="w-4 h-4" />
                  <span>पेआउट ट्रांसफर दर्ज करें</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: JOB POSTINGS */}
      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 p-4 rounded-2xl border border-stone-800">
            <div>
              <h2 className="text-base font-black text-blue-300">फील्ड जॉब्स एवं करियर भर्ती ({jobs.length})</h2>
              <p className="text-xs text-stone-400">टेक्नीशियन, फील्ड ऑफिसर एवं ऑपरेशन्स टीम हेतु जॉब पोस्टिंग्स</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobs.map((j) => (
              <div
                key={j.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-2 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 text-blue-300 font-bold text-[10px]">
                      {j.jobType}
                    </span>
                    <h3 className="font-bold text-sm text-white mt-1">{j.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-xs border border-blue-500/30">
                    {j.salaryRange}
                  </span>
                </div>
                <p className="text-xs text-stone-400">{j.department} • {j.location}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

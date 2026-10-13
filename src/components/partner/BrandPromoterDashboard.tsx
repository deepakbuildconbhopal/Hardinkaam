import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Target,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  FileText,
  Award,
  TrendingUp,
  Calendar,
  Briefcase,
  ShieldCheck,
  CheckSquare,
  BookOpen,
  Sparkles,
  MessageSquare,
  Phone,
  Send,
  MapPin,
  RefreshCw,
  Share2,
  Video,
  Radio,
  Copy,
  Check,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DashboardIdCardBanner } from '../common/DashboardIdCardBanner';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import {
  MarketingTaskRecord,
  fetchMarketingTasks,
  updateLeadStatus,
  buildWhatsAppUrl,
  buildSmsUrl,
  shareToSocialPlatform,
} from '../../services/marketingAgentClientService';
import { MarketingLead, createBusinessLead, fetchBusinessLeadsForUser } from '../../services/marketingLeadsService';

interface Props {
  onOpenWallet?: () => void;
}

export const BrandPromoterDashboard: React.FC<Props> = ({ onOpenWallet }) => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'targets' | 'earnings' | 'attendance' | 'marketing_tasks' | 'business_leads'>('overview');
  const [assignedMarketingTasks, setAssignedMarketingTasks] = useState<MarketingTaskRecord[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [showBringBusinessModal, setShowBringBusinessModal] = useState(false);
  const [myBusinessLeads, setMyBusinessLeads] = useState<MarketingLead[]>([]);
  const [bizName, setBizName] = useState('');
  const [bizContactPerson, setBizContactPerson] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizEmail, setBizEmail] = useState('');
  const [bizType, setBizType] = useState('Electrician & Electrical Services');
  const [bizCity, setBizCity] = useState(userProfile?.city || 'Bhopal');
  const [bizArea, setBizArea] = useState('');
  const [bizRequiredService, setBizRequiredService] = useState('');
  const [bizRequirement, setBizRequirement] = useState('');
  const [bizNotes, setBizNotes] = useState('');
  const [submittingBiz, setSubmittingBiz] = useState(false);

  useEffect(() => {
    loadAssignedTasks();
    if (userProfile?.id) {
      fetchBusinessLeadsForUser(userProfile.id)
        .then((leads) => setMyBusinessLeads(leads))
        .catch((e) => console.warn('Business leads fetch note:', e));
    }
  }, [userProfile?.id]);

  const handleBringBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim() || !bizPhone.trim()) {
      alert('Please enter Business Name and Mobile Number.');
      return;
    }
    try {
      setSubmittingBiz(true);
      const newLead = await createBusinessLead(
        {
          businessName: bizName.trim(),
          contactPerson: bizContactPerson.trim(),
          phone: bizPhone.trim(),
          email: bizEmail.trim(),
          businessType: bizType,
          city: bizCity,
          area: bizArea,
          requiredService: bizRequiredService,
          requirement: bizRequirement,
          notes: bizNotes,
        },
        {
          id: userProfile?.id || 'promoter_user',
          role: userProfile?.role || 'brand_promoter',
          referralCode: userProfile?.referralCode || userProfile?.memberCode || 'HDK-REF',
        }
      );
      setMyBusinessLeads((prev) => [newLead, ...prev]);
      setShowBringBusinessModal(false);
      setBizName('');
      setBizContactPerson('');
      setBizPhone('');
      setBizEmail('');
      setBizArea('');
      setBizRequiredService('');
      setBizRequirement('');
      setBizNotes('');
      alert('Business lead successfully submitted with your referral attribution!');
    } catch (err: any) {
      alert('Failed to submit business lead: ' + (err?.message || err));
    } finally {
      setSubmittingBiz(false);
    }
  };

  const loadAssignedTasks = async () => {
    try {
      setLoadingTasks(true);
      const allTasks = await fetchMarketingTasks();
      // Filter tasks assigned to promoter or show all if promoter matches
      const myTasks = allTasks.filter((t) => {
        const name = (userProfile?.name || '').toLowerCase();
        return (
          t.assignedToEmployeeName.toLowerCase().includes(name) ||
          t.assignedToEmployeeRole.toLowerCase().includes('promoter') ||
          allTasks.length <= 5
        );
      });
      setAssignedMarketingTasks(myTasks.length > 0 ? myTasks : allTasks);
    } catch (err) {
      console.error('Failed to load promoter marketing tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Simulated brand promoter data (strictly isolated to logged-in user)
  const promoterName = userProfile?.name || 'Aarav Sharma (Promoter ID: BPR-BPL-104)';
  const zone = userProfile?.zone || 'Bhopal Central & North';
  
  const [campaigns] = useState([
    {
      id: 'cmp_1',
      title: 'HDK Monsoon Electrician Drive',
      target: 150,
      achieved: 128,
      status: 'Active',
      startDate: '2026-06-01',
      endDate: '2026-09-30',
      commissionRate: '₹120 per conversion',
    },
    {
      id: 'cmp_2',
      title: 'Deepak Buildcon Home Safety Campaign',
      target: 200,
      achieved: 185,
      status: 'Active',
      startDate: '2026-08-01',
      endDate: '2026-10-15',
      commissionRate: '₹150 per registration',
    },
  ]);

  const [tasks] = useState([
    { id: 'tsk_1', title: 'MP Nagar Zone Field Survey', status: 'Completed', deadline: 'Today, 2:00 PM' },
    { id: 'tsk_2', title: 'Verify 15 Electrician Leads in TT Nagar', status: 'Pending', deadline: 'Tomorrow, 5:00 PM' },
    { id: 'tsk_3', title: 'Promotional Banner Placement at 5 Societies', status: 'In Progress', deadline: 'Sep 30, 2026' },
  ]);

  const [earningsHistory] = useState([
    { id: 'earn_1', campaign: 'HDK Monsoon Electrician Drive', conversions: 45, earned: 5400, status: 'Paid', date: 'Sep 20, 2026' },
    { id: 'earn_2', campaign: 'Deepak Buildcon Home Safety', conversions: 62, earned: 9300, status: 'Approved', date: 'Sep 24, 2026' },
    { id: 'earn_3', campaign: 'HDK Monsoon Electrician Drive', conversions: 38, earned: 4560, status: 'Pending Settlement', date: 'Sep 26, 2026' },
  ]);

  const totalEarned = earningsHistory.reduce((acc, curr) => acc + curr.earned, 0);
  const pendingEarnings = earningsHistory.filter(e => e.status.includes('Pending')).reduce((acc, curr) => acc + curr.earned, 0);
  const approvedEarnings = totalEarned - pendingEarnings;

  const totalLeadsGenerated = 313;
  const totalConversions = 273;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Official ID Card Banner */}
      <DashboardIdCardBanner />

      {/* Header Profile */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xl shrink-0">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">{promoterName}</h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                BRAND PROMOTER
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Assigned Zone: {zone} • Employee Code: <strong className="font-mono text-amber-700">HDK-PR-2026-042</strong>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Campaign Officer • Attendance &amp; Performance Linked</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowBringBusinessModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 transition-transform hover:scale-102"
          >
            <Building2 className="w-4 h-4" /> Bring Business to HARDINKAAM
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 cursor-pointer transition-transform hover:scale-102"
          >
            Active Campaigns ({campaigns.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">{totalLeadsGenerated}</p>
          <span className="text-[11px] text-amber-600 font-medium">{totalConversions} successful conversions</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Target Progress</span>
            <Target className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">87.2%</p>
          <span className="text-[11px] text-emerald-600 font-medium">313 / 350 combined target</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Earned</span>
            <DollarSign className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">₹{totalEarned}</p>
          <button onClick={onOpenWallet} className="text-[11px] text-purple-600 font-bold hover:underline">
            View Earnings Wallet →
          </button>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance</span>
            <CheckSquare className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-stone-900">100%</p>
          <span className="text-[11px] text-stone-500">26 / 26 days checked in</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Overview &amp; Tasks
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'campaigns' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Campaigns &amp; Performance
        </button>
        <button
          onClick={() => setActiveTab('targets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'targets' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Targets &amp; Progress
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'earnings' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Earnings &amp; Commission
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'attendance' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white text-stone-600 hover:bg-stone-100'
          }`}
        >
          Attendance, Training &amp; Docs
        </button>
        <button
          onClick={() => setActiveTab('marketing_tasks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'marketing_tasks' ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-xs' : 'bg-white text-orange-800 hover:bg-orange-50 border border-orange-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Google Maps लीड्स &amp; कार्य ({assignedMarketingTasks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('business_leads')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'business_leads' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Business Leads ({myBusinessLeads.length})</span>
        </button>
      </div>

      {/* Tab Content: Overview & Tasks */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-600" />
              <span>Assigned Tasks &amp; Duties</span>
            </h2>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.id} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">{t.title}</h4>
                    <span className="text-[10px] text-stone-500">Deadline: {t.deadline}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      t.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <span>Active Campaign Summary</span>
            </h2>
            <div className="space-y-3">
              {campaigns.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900">{c.title}</h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-600">
                    Target: <strong>{c.target}</strong> • Achieved: <strong className="text-emerald-700">{c.achieved}</strong>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, (c.achieved / c.target) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-stone-900">All Brand Promotion Campaigns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map((c) => (
              <div key={c.id} className="p-5 rounded-3xl border border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">{c.title}</h3>
                  <span className="text-xs font-bold text-amber-700">{c.commissionRate}</span>
                </div>
                <p className="text-xs text-stone-500">
                  Duration: {c.startDate} to {c.endDate}
                </p>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200">
                  <span className="text-stone-600">Conversions: <strong>{c.achieved} / {c.target}</strong></span>
                  <span className="text-emerald-700 font-bold">
                    {Math.round((c.achieved / c.target) * 100)}% Complete
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Targets */}
      {activeTab === 'targets' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-stone-900">Performance Targets &amp; Milestones</h2>
          <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Monthly Target (September 2026)</span>
              <span className="text-xs font-bold bg-amber-600 text-white px-2.5 py-1 rounded-full">On Track</span>
            </div>
            <div className="text-2xl font-black text-stone-900">273 / 350 Registrations</div>
            <p className="text-xs text-stone-600">
              You need 77 more customer &amp; serviceman registrations before Sep 30, 2026 to unlock the ₹5,000 bonus milestone.
            </p>
            <div className="w-full bg-amber-200 h-3 rounded-full overflow-hidden">
              <div className="bg-amber-600 h-full rounded-full" style={{ width: '78%' }} />
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Earnings */}
      {activeTab === 'earnings' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">Campaign Commission &amp; Earnings History</h2>
            <div className="text-right">
              <span className="text-xs text-stone-400 block">Total Earned</span>
              <span className="text-lg font-black text-amber-700">₹{totalEarned}</span>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {earningsHistory.map((e) => (
              <div key={e.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">{e.campaign}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      {e.conversions} conversions
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Date: {e.date}</div>
                </div>

                <div className="text-right flex items-center gap-3 self-end sm:self-center">
                  <div>
                    <span className="text-sm font-black text-stone-900 block">+₹{e.earned}</span>
                    <span className="text-[10px] font-bold text-emerald-700">{e.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Attendance & Training */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>Daily Attendance Log</span>
            </h2>
            <p className="text-xs text-stone-500">September 2026 Geo-Tagged Check-Ins</p>
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-stone-800">
                <span>Working Days: 26</span>
                <span className="text-emerald-700">Present: 26 (100%)</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Late Arrivals: 0</span>
                <span>Leaves: 0</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <span>Training &amp; Compliance Docs</span>
            </h2>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <span>Hardinkaam Field Protocol v3.2</span>
                <span className="text-emerald-700 font-bold">Completed</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <span>Brand Safety &amp; Ethics Certification</span>
                <span className="text-emerald-700 font-bold">Verified</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Assigned Marketing Tasks & Leads */}
      {activeTab === 'marketing_tasks' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-600" />
                <span>एडमिन द्वारा सौंपे गए मार्केटिंग कार्य व Google Maps लीड्स</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                सर्विसमैन को 1-क्लिक WhatsApp विज्ञापन भेजें, कॉल करें और ऑनबोर्डिंग स्टेटस अपडेट करें
              </p>
            </div>

            <button
              type="button"
              onClick={loadAssignedTasks}
              disabled={loadingTasks}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTasks ? 'animate-spin' : ''}`} />
              <span>रिफ्रेश</span>
            </button>
          </div>

          {loadingTasks ? (
            <div className="py-12 text-center text-stone-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-600" />
              <p className="text-xs">टास्क लोड हो रहे हैं...</p>
            </div>
          ) : assignedMarketingTasks.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">वर्तमान में कोई आवंटित मार्केटिंग कार्य नहीं है।</p>
              <p className="text-xs text-stone-400 mt-1">
                जैसे ही एडमिन आपको नया अभियान सौंपेंगे, लीड्स यहाँ दिखाई देंगी।
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {assignedMarketingTasks.map((task) => {
                const totalLeads = task.leads?.length || 0;
                const contacted = task.leads?.filter((l) => l.verificationStatus !== 'unverified').length || 0;
                const percent = totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0;
                const defaultMsg =
                  task.campaignCopy?.whatsappAdText ||
                  `नमस्ते जी, मैं HARDINKAAM (www.hardinkaam.online) दीपक बिल्डकॉन भोपाल से बोल रहा हूँ। क्या आप ${task.district} में ${task.trade} का काम करते हैं? सीधे ग्राहक बुकिंग्स व 100% कमाई हेतु हमसे जुड़ें: +91 62675 46945`;

                return (
                  <div key={task.id} className="p-5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-900">
                            {task.trade}
                          </span>
                          <span className="text-xs text-stone-500">
                            {task.district}, {task.state}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-stone-900 mt-1">{task.title}</h3>
                        {task.notes && (
                          <p className="text-xs text-stone-600 mt-1 bg-white p-2 rounded-lg border border-stone-200">
                            <strong>एडमिन निर्देश:</strong> {task.notes}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-stone-800">
                          {contacted} / {totalLeads} संपर्कित ({percent}%)
                        </span>
                        <div className="w-32 h-1.5 rounded-full bg-stone-200 mt-1 ml-auto overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </div>

                    {/* Campaign Copy & Social Share Bar */}
                    {task.campaignCopy && (
                      <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>प्रचार विज्ञापन सामग्री (Campaign Materials):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              shareToSocialPlatform({
                                platform: 'native',
                                text: task.campaignCopy?.whatsappAdText || '',
                                title: task.title,
                              })
                            }
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-stone-900 text-white hover:bg-black flex items-center gap-1 cursor-pointer"
                          >
                            <Share2 className="w-3 h-3" />
                            <span>सोशल मीडिया पर शेयर करें</span>
                          </button>
                        </div>

                        <p className="text-xs text-stone-700 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 font-mono whitespace-pre-wrap line-clamp-3">
                          {task.campaignCopy.whatsappAdText}
                        </p>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              shareToSocialPlatform({
                                platform: 'whatsapp',
                                text: task.campaignCopy?.whatsappAdText || '',
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              shareToSocialPlatform({
                                platform: 'facebook',
                                text: task.campaignCopy?.whatsappAdText || '',
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Facebook</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              shareToSocialPlatform({
                                platform: 'instagram',
                                text: task.campaignCopy?.socialMedia?.instagramCaption || task.campaignCopy?.whatsappAdText || '',
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Instagram</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              shareToSocialPlatform({
                                platform: 'telegram',
                                text: task.campaignCopy?.whatsappAdText || '',
                              })
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Telegram</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Leads list in this task */}
                    <div className="space-y-2 mt-3">
                      <h4 className="text-xs font-bold text-stone-800">लीड्स सूची ({totalLeads}):</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                        {task.leads?.map((lead) => (
                          <div
                            key={lead.id}
                            className="bg-white p-3 rounded-xl border border-stone-200 flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h5 className="text-xs font-bold text-stone-900 truncate">{lead.name}</h5>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                                  {lead.trade}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{lead.address}</p>
                              {lead.phone && (
                                <p className="text-xs font-mono font-bold text-stone-800 mt-0.5">
                                  📞 {lead.phone}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between gap-1 pt-2 border-t border-stone-100">
                              <select
                                value={lead.verificationStatus || 'unverified'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    await updateLeadStatus({
                                      taskId: task.id,
                                      leadId: lead.id,
                                      newStatus,
                                    });
                                    lead.verificationStatus = newStatus as any;
                                    loadAssignedTasks();
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="text-[11px] font-bold rounded-lg border border-stone-300 bg-stone-50 px-2 py-1"
                              >
                                <option value="unverified">लंबित</option>
                                <option value="contacted">संपर्क किया</option>
                                <option value="interested">इच्छुक</option>
                                <option value="registered">रजिस्टर्ड</option>
                                <option value="rejected">इच्छुक नहीं</option>
                              </select>

                              <div className="flex items-center gap-1">
                                <a
                                  href={buildWhatsAppUrl(lead.phone, defaultMsg)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold"
                                  title="WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </a>
                                {lead.phone && (
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold"
                                    title="Call"
                                  >
                                    <Phone className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Business Leads */}
      {activeTab === 'business_leads' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>मेरे द्वारा जोड़े गए बिजनेस लीड्स (Business Network Leads)</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Existing earnings architecture integration. Attributed to your UID &amp; Referral Code.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBringBusinessModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Building2 className="w-4 h-4" /> Bring Business to HARDINKAAM
            </button>
          </div>

          {myBusinessLeads.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-sm font-bold text-stone-600">कोई बिजनेस लीड दर्ज नहीं है।</p>
              <p className="text-xs text-stone-400 mt-1">
                "Bring Business to HARDINKAAM" बटन पर क्लिक करके पहला बिजनेस लीड जोड़ें।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myBusinessLeads.map((lead) => (
                <div key={lead.id} className="p-5 rounded-2xl border border-stone-200 bg-stone-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-stone-900">{lead.businessName}</h3>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                      {lead.status || 'NEW'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    <strong>संपर्क:</strong> {lead.contactPerson || 'N/A'} • <span className="font-mono">{lead.phone}</span>
                  </p>
                  <p className="text-xs text-stone-500">
                    <strong>स्थान:</strong> {lead.city || 'Bhopal'} • <strong>प्रकार:</strong> {lead.businessType || lead.trade || 'General'}
                  </p>
                  {lead.notes && (
                    <p className="text-xs text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                      <strong>विवरण:</strong> {lead.notes}
                    </p>
                  )}
                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-400">
                    <span>Ref Code: <strong className="font-mono text-stone-700">{lead.referralCode || 'N/A'}</strong></span>
                    <span>{new Date(lead.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bring Business to HARDINKAAM Modal */}
      {showBringBusinessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-stone-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Bring Business to HARDINKAAM</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowBringBusinessModal(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Connect business opportunities to HARDINKAAM. Automatically attributed to your existing UID &amp; Referral Code.
            </p>

            <form onSubmit={handleBringBusinessSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Business Name / Firm Name (फर्म या दुकान का नाम) *</label>
                <input
                  type="text"
                  required
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. Bhopal Hardware & Electricals"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Contact Person (संपर्क व्यक्ति)</label>
                  <input
                    type="text"
                    value={bizContactPerson}
                    onChange={(e) => setBizContactPerson(e.target.value)}
                    placeholder="e.g. Ramesh Meena"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Number (10 डिजिट मोबाइल) *</label>
                  <input
                    type="tel"
                    required
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    placeholder="9826012345"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Business Type / Category</label>
                  <select
                    value={bizType}
                    onChange={(e) => setBizType(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Electrician & Electrical Services">Electrician &amp; Electrical Services</option>
                    <option value="Plumber & Sanitary">Plumber &amp; Sanitary</option>
                    <option value="Civil Contractor & Mason">Civil Contractor &amp; Mason (राजमिस्त्री)</option>
                    <option value="AC & Appliance Repair">AC &amp; Appliance Repair</option>
                    <option value="Carpenter & Woodwork">Carpenter &amp; Woodwork</option>
                    <option value="Painter & Waterproofing">Painter &amp; Waterproofing</option>
                    <option value="Commercial Business / Store">Commercial Business / Store / Hotel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">City / District</label>
                  <input
                    type="text"
                    value={bizCity}
                    onChange={(e) => setBizCity(e.target.value)}
                    placeholder="Bhopal"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Area / Locality / Address</label>
                <input
                  type="text"
                  value={bizArea}
                  onChange={(e) => setBizArea(e.target.value)}
                  placeholder="e.g. MP Nagar Zone 2, Near DB Mall"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Requirement / Notes</label>
                <textarea
                  rows={3}
                  value={bizNotes}
                  onChange={(e) => setBizNotes(e.target.value)}
                  placeholder="Enter business requirement, scale of work, or partnership interest..."
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                <div><strong>Automatic Attribution:</strong></div>
                <div>User UID: <span className="font-mono text-stone-800">{userProfile?.id || 'N/A'}</span></div>
                <div>Role: <span className="font-mono text-stone-800">{userProfile?.role || 'brand_promoter'}</span></div>
                <div>Referral Code: <strong className="font-mono text-emerald-700">{userProfile?.referralCode || userProfile?.memberCode || 'HDK-REF'}</strong> (Locked)</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBringBusinessModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBiz}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  {submittingBiz ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Building2 className="w-3.5 h-3.5" />}
                  <span>Submit Business Lead</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google AdSense Promoter Banner */}
      <AdSenseBanner
        slot="3849201948"
        format="responsive"
        category="branding"
        label="ब्रांड प्रमोशन एवं विज्ञापन टूल्स • GOOGLE ADSENSE"
        className="my-3"
      />
    </div>
  );
};

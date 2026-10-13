import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { jobSocialService, JobSocialLinksConfig } from '../../services/jobSocialService';
import { JobPost, JobType } from '../../types/workAndJobs';
import {
  Share2,
  Settings,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  X,
  Facebook,
  Linkedin,
  Instagram,
  Send,
  MessageSquare,
  Globe,
  Briefcase
} from 'lucide-react';

interface AdminJobManagerProps {
  onBack?: () => void;
}

export const AdminJobManager: React.FC<AdminJobManagerProps> = ({ onBack }) => {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Social Links state
  const [socialLinks, setSocialLinks] = useState<JobSocialLinksConfig>({
    facebookUrl: 'https://facebook.com/hardinkaam',
    linkedInUrl: 'https://linkedin.com/company/hardinkaam',
    whatsAppNumberOrUrl: 'https://wa.me/916267546945',
    instagramUrl: 'https://instagram.com/hardinkaam',
    telegramUrl: 'https://t.me/hardinkaam',
    twitterUrl: 'https://x.com/hardinkaam',
    companyWebsite: 'https://www.hardinkaam.online',
    updatedAt: new Date().toISOString()
  });
  const [isSocialSettingsOpen, setIsSocialSettingsOpen] = useState(false);
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);

  // Share modal state
  const [selectedShareJob, setSelectedShareJob] = useState<JobPost | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Job Form state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Operations');
  const [jobType, setJobType] = useState<JobType>('FIELD_WORK');
  const [location, setLocation] = useState('Bhopal, MP');
  const [experience, setExperience] = useState('1-3 Years');
  const [qualification, setQualification] = useState('Graduate / ITI');
  const [salaryRange, setSalaryRange] = useState('₹18,000 - ₹30,000 / month');
  const [openings, setOpenings] = useState(5);
  const [responsibilitiesText, setResponsibilitiesText] = useState('Manage daily operations and customer satisfaction.');
  const [requirementsText, setRequirementsText] = useState('Valid smartphone and professional attitude.');
  const [hindiContent, setHindiContent] = useState('');
  const [englishContent, setEnglishContent] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const allJobs = await workAndJobsService.getJobs();
      setJobs(allJobs);
      const links = await jobSocialService.getSavedSocialLinks();
      setSocialLinks(links);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSocialLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSocialLinks(true);
    try {
      await jobSocialService.saveSocialLinks(socialLinks);
      addToast('सोशल मीडिया लिंक्स सफलतापूर्वक सेव हो गए हैं!', 'success');
      setIsSocialSettingsOpen(false);
    } catch (e: any) {
      addToast('सोशल लिंक्स सेव करने में त्रुटि: ' + e.message, 'error');
    } finally {
      setSavingSocialLinks(false);
    }
  };

  const handleAiGenerate = () => {
    if (!title) {
      addToast('कृपया पहले जॉब का पद/शीर्षक दर्ज करें', 'info');
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      setEnglishContent(`Join Hardinkaam team as ${title} in ${location}. Competitive pay, weekly payouts, and direct growth.`);
      setHindiContent(`हार्डिनकाम में ${title} के पद हेतु भर्ती जारी (${location})। आकर्षक वेतन ₹18,000 - ₹30,000 एवं डायरेक्ट भुगतान। ऑनलाइन आवेदन करें: ${socialLinks.companyWebsite}/#jobs`);
      setAiGenerating(false);
      addToast('AI जॉब पोस्ट जनरेट हो गई!', 'success');
    }, 600);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await workAndJobsService.createJob({
        title,
        department,
        jobType,
        location,
        experience,
        qualification,
        skills: ['Professional', 'Communication', 'Field Execution'],
        salaryRange,
        openings: Number(openings) || 5,
        responsibilities: responsibilitiesText.split('\n').filter(Boolean),
        requirements: requirementsText.split('\n').filter(Boolean),
        benefits: ['Weekly payout', 'Direct support', 'Incentives'],
        deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
        hindiContent: hindiContent || `हार्डिनकाम ${title} भर्ती - स्थान: ${location}`,
        englishContent: englishContent || `Hardinkaam hiring ${title} in ${location}`,
        ctaText: 'Apply Now / आवेदन करें',
        contactMethod: socialLinks.whatsAppNumberOrUrl || 'In-app application',
        status: 'PUBLISHED',
        createdBy: 'admin_root'
      });
      addToast('जॉब पोस्ट प्रकाशित कर दी गई है!', 'success');
      setIsCreating(false);
      setTitle('');
      loadData();
    } catch (e: any) {
      addToast('जॉब पोस्ट बनाने में त्रुटि', 'error');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('क्या आप निश्चित ही इस जॉब पोस्ट को हटाना चाहते हैं?')) return;
    try {
      await workAndJobsService.deleteJob(id);
      addToast('जॉब पोस्ट हटा दी गई', 'info');
      loadData();
    } catch (e) {
      addToast('जॉब हटाने में त्रुटि', 'error');
    }
  };

  const handleOpenSocialPost = (platform: 'whatsapp' | 'facebook' | 'linkedin' | 'twitter' | 'telegram') => {
    if (!selectedShareJob) return;
    const shareText = jobSocialService.buildJobShareText(selectedShareJob, socialLinks, platform);
    const url = jobSocialService.getSocialShareUrl(platform, shareText, socialLinks.companyWebsite);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyShareText = () => {
    if (!selectedShareJob) return;
    const shareText = jobSocialService.buildJobShareText(selectedShareJob, socialLinks, 'all');
    navigator.clipboard.writeText(shareText);
    setCopiedText(true);
    addToast('जॉब पोस्ट एवं सोशल लिंक्स कॉपी हो गए हैं!', 'success');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-2 sm:px-4 py-2">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl border border-blue-400/30">
        <div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <span>←</span> वापस
              </button>
            )}
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" /> JOBS & RECRUITMENT
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5">जॉब भर्ती एवं सोशल मीडिया पोस्टिंग केंद्र</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
            जॉब्स पोस्ट करें, अपने सोशल मीडिया लिंक्स (FB, LinkedIn, WhatsApp, IG) सेव करें और 1-क्लिक में पोस्ट शेयर करें।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsSocialSettingsOpen(true)}
            className="bg-stone-900/80 hover:bg-stone-900 text-amber-300 font-bold px-3.5 py-2 rounded-2xl text-xs border border-amber-400/40 shadow flex items-center gap-1.5 transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-amber-400" />
            <span>🔗 सोशल लिंक्स सेट करें</span>
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="bg-white hover:bg-blue-50 text-blue-900 font-black px-4 py-2 rounded-2xl text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>नयी जॉब पोस्ट करें</span>
          </button>
        </div>
      </div>

      {/* SAVED SOCIAL LINKS SUMMARY CARD */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg text-xs space-y-2">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2 text-amber-300 font-bold">
            <Globe className="w-4 h-4" />
            <span>सेव किए गए सोशल मीडिया लिंक्स (Job Posting & Sharing Profile)</span>
          </div>
          <button
            onClick={() => setIsSocialSettingsOpen(true)}
            className="text-amber-400 hover:underline font-bold text-[11px] cursor-pointer"
          >
            संपादित करें / Edit Links
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-stone-300">
          <div className="flex items-center gap-1.5 truncate">
            <Facebook className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">{socialLinks.facebookUrl || 'Not Set'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Linkedin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{socialLinks.linkedInUrl || 'Not Set'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{socialLinks.whatsAppNumberOrUrl || 'Not Set'}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span className="truncate">{socialLinks.instagramUrl || 'Not Set'}</span>
          </div>
        </div>
      </div>

      {/* SOCIAL LINKS SETTINGS MODAL */}
      {isSocialSettingsOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 text-stone-100 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                <Settings className="w-5 h-5" />
                <span>सोशल मीडिया लिंक्स कॉन्फ़िगर करें</span>
              </div>
              <button
                onClick={() => setIsSocialSettingsOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400">
              इन्हें एक बार सेव कर लें। जॉब पोस्ट करते समय या 1-क्लिक शेयर करते वक्त ये लिंक्स स्वतः पोस्ट मैसेज में जुड़ जाएंगे।
            </p>

            <form onSubmit={handleSaveSocialLinks} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1 flex items-center gap-1.5">
                  <Facebook className="w-4 h-4 text-blue-400" />
                  <span>Facebook पेज लिंक</span>
                </label>
                <input
                  type="url"
                  value={socialLinks.facebookUrl}
                  onChange={(e) => setSocialLinks({ ...socialLinks, facebookUrl: e.target.value })}
                  placeholder="https://facebook.com/hardinkaam"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1 flex items-center gap-1.5">
                  <Linkedin className="w-4 h-4 text-sky-400" />
                  <span>LinkedIn कंपनी पेज लिंक</span>
                </label>
                <input
                  type="url"
                  value={socialLinks.linkedInUrl}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedInUrl: e.target.value })}
                  placeholder="https://linkedin.com/company/hardinkaam"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp ग्रुप / नंबर / चैनल लिंक</span>
                </label>
                <input
                  type="text"
                  value={socialLinks.whatsAppNumberOrUrl}
                  onChange={(e) => setSocialLinks({ ...socialLinks, whatsAppNumberOrUrl: e.target.value })}
                  placeholder="https://wa.me/916267546945"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1 flex items-center gap-1.5">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span>Instagram प्रोफाइल लिंक</span>
                </label>
                <input
                  type="url"
                  value={socialLinks.instagramUrl}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagramUrl: e.target.value })}
                  placeholder="https://instagram.com/hardinkaam"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-300 font-bold mb-1 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Telegram चैनल लिंक</span>
                  </label>
                  <input
                    type="url"
                    value={socialLinks.telegramUrl}
                    onChange={(e) => setSocialLinks({ ...socialLinks, telegramUrl: e.target.value })}
                    placeholder="https://t.me/hardinkaam"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-stone-300" />
                    <span>कंपनी वेबसाइट URL</span>
                  </label>
                  <input
                    type="url"
                    value={socialLinks.companyWebsite}
                    onChange={(e) => setSocialLinks({ ...socialLinks, companyWebsite: e.target.value })}
                    placeholder="https://www.hardinkaam.online"
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsSocialSettingsOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={savingSocialLinks}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl shadow-lg transition cursor-pointer"
                >
                  {savingSocialLinks ? 'सेव हो रहा है...' : 'सोशल लिंक्स सेव करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SHARE / POST ON SOCIAL MEDIA MODAL */}
      {selectedShareJob && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-indigo-500/40 text-stone-100 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-indigo-400 font-black text-base">
                <Share2 className="w-5 h-5" />
                <span>1-क्लिक सोशल मीडिया जॉब पोस्टिंग</span>
              </div>
              <button
                onClick={() => setSelectedShareJob(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-1 text-xs">
              <div className="text-amber-300 font-bold text-sm">{selectedShareJob.title}</div>
              <div className="text-stone-400">{selectedShareJob.location} • <span className="text-emerald-400 font-bold">{selectedShareJob.salaryRange || 'Attractive Salary'}</span></div>
            </div>

            <div>
              <label className="block text-stone-300 font-bold mb-1 text-xs">पोस्ट सामग्री एवं लिंक्स (Auto Formatted):</label>
              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-stone-300 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                {jobSocialService.buildJobShareText(selectedShareJob, socialLinks, 'all')}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-stone-300 font-bold text-xs">प्लेटफ़ॉर्म चुनें और 1-क्लिक में पोस्ट करें:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => handleOpenSocialPost('whatsapp')}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Share</span>
                </button>

                <button
                  onClick={() => handleOpenSocialPost('facebook')}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Facebook Share</span>
                </button>

                <button
                  onClick={() => handleOpenSocialPost('linkedin')}
                  className="p-2.5 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <Linkedin className="w-4 h-4" />
                  <span>LinkedIn Post</span>
                </button>

                <button
                  onClick={() => handleOpenSocialPost('telegram')}
                  className="p-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>Telegram Channel</span>
                </button>

                <button
                  onClick={handleCopyShareText}
                  className="p-2.5 bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow border border-amber-400/30 col-span-2 sm:col-span-2"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedText ? 'कॉपी हो गया!' : 'टेक्स्ट व लिंक्स कॉपी करें (Copy All)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JOBS LIST GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-stone-900 rounded-2xl shadow-lg border border-stone-800 p-5 flex flex-col justify-between hover:border-indigo-500/50 transition text-stone-100"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="bg-stone-800 text-indigo-300 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                  {job.jobType.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${job.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-stone-800 text-stone-400'}`}>
                  {job.status}
                </span>
              </div>
              <h3 className="font-bold text-white text-base mt-2.5 line-clamp-1">{job.title}</h3>
              <p className="text-stone-400 text-xs mt-0.5">{job.location}</p>
              <p className="font-bold text-emerald-400 text-xs sm:text-sm mt-2">{job.salaryRange || 'Competitive'}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedShareJob(job)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>सोशल मीडिया पर पोस्ट करें</span>
              </button>

              <button
                onClick={() => handleDeleteJob(job.id)}
                className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                title="हटाएं"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE NEW JOB FORM MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-blue-500/40 text-stone-100 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-black text-base">
                <Plus className="w-5 h-5" />
                <span>नयी जॉब भर्ती प्रकाशित करें</span>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">पद / जॉब शीर्षक (Title) *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="उदा. फील्ड टेक्नीशियन - एसी विशेषज्ञ"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">विभाग / Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1">जॉब प्रकार (Job Type)</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-blue-400"
                  >
                    <option value="FIELD_WORK">फील्ड वर्क (Field Work)</option>
                    <option value="FULL_TIME">फुल टाइम (Full Time)</option>
                    <option value="PART_TIME">पार्ट टाइम (Part Time)</option>
                    <option value="TELECALLING">टेलीकॉलिंग (Telecalling)</option>
                    <option value="TECHNICIAN">टेक्नीशियन (Technician)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">स्थान (Location)</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1">वेतन सीमा (Salary)</label>
                  <input
                    type="text"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-emerald-300 font-bold focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1">ओपनिंग्स की संख्या</label>
                  <input
                    type="number"
                    value={openings}
                    onChange={(e) => setOpenings(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-amber-300 font-bold">AI स्वचालित विवरण जनरेटर</span>
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={handleAiGenerate}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{aiGenerating ? 'जनरेट हो रहा है...' : 'AI कंटेंट बनाएं'}</span>
                </button>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">हिंदी विवरण / सोशल मैसेज</label>
                <textarea
                  rows={2}
                  value={hindiContent}
                  onChange={(e) => setHindiContent(e.target.value)}
                  placeholder="हिंदी में जॉब का विवरण लिखें..."
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg transition cursor-pointer"
                >
                  जॉब प्रकाशित करें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

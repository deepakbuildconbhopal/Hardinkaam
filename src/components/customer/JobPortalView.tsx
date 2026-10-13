import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { workAndJobsService } from '../../services/workAndJobsService';
import { JobPost, JobApplication } from '../../types/workAndJobs';
import { AdSenseBanner } from '../ads/AdSenseBanner';

interface JobPortalViewProps {
  onOpenAuth: (role?: any) => void;
  onSelectTab: (tab: string) => void;
}

export const JobPortalView: React.FC<JobPortalViewProps> = ({ onOpenAuth, onSelectTab }) => {
  const { currentUser, userProfile } = useAuth();
  const { addToast } = useToast();

  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPost | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);
  const [myApplications, setMyApplications] = useState<JobApplication[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    loadJobs();
  }, [currentUser?.uid]);

  const loadJobs = async () => {
    try {
      const allJobs = await workAndJobsService.getJobs();
      setJobs(allJobs.filter(j => j.status === 'PUBLISHED'));

      if (currentUser?.uid) {
        const apps = await workAndJobsService.getJobApplications(currentUser.uid);
        setMyApplications(apps);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob || !currentUser) return;
    setApplying(true);
    try {
      await workAndJobsService.applyForJob({
        jobId: selectedJob.id,
        jobTitle: selectedJob.title,
        applicantId: currentUser.uid,
        applicantName: userProfile?.name || currentUser.displayName || 'Candidate',
        applicantPhone: userProfile?.phone || currentUser.phoneNumber || '',
        applicantEmail: currentUser.email || '',
        coverNote
      });
      addToast('Job application submitted successfully!', 'success');
      setSelectedJob(null);
      setCoverNote('');
      loadJobs();
    } catch (err: any) {
      addToast('Failed to apply for job', 'error');
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = filterType === 'ALL' ? jobs : jobs.filter(j => j.jobType === filterType);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-entry px-2 sm:px-4">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-400/30">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl">
          <span className="bg-white/20 text-blue-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            💼 Jobs & Careers Center
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black mt-2 leading-tight">
            HARDINKAAM में रोजगार एवं करियर के अवसर
          </h1>
          <p className="text-blue-100 mt-1.5 text-xs sm:text-sm">
            Explore full-time, part-time, field service, franchise, and technical career opportunities across Madhya Pradesh.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 sm:gap-2.5">
            {['ALL', 'FIELD_WORK', 'FRANCHISE', 'FULL_TIME', 'PART_TIME'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow ${
                  filterType === type ? 'bg-white text-blue-800' : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {type === 'ALL' ? 'All Roles' : type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AdSense In-Page Leaderboard Unit */}
      <AdSenseBanner
        slot="6718293045"
        format="leaderboard"
        category="general"
        label="गूगल एडसेंस • BHOPAL JOB PORTAL SPONSOR"
      />

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredJobs.map((job) => (
          <div key={job.id} className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-between hover:shadow-md transition">
            <div>
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-lg">
                  {job.jobType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold text-stone-500">{job.location}</span>
              </div>
              <h3 className="font-bold text-stone-900 dark:text-white text-base mt-2.5 line-clamp-1">{job.title}</h3>
              <p className="text-stone-600 dark:text-stone-400 text-xs mt-0.5">{job.department}</p>
              <div className="mt-3 space-y-1 text-xs text-stone-600 dark:text-stone-300">
                <p>🎓 {job.qualification}</p>
                <p>💼 {job.experience}</p>
                {job.salaryRange && <p className="font-bold text-emerald-600 dark:text-emerald-400">💰 {job.salaryRange}</p>}
              </div>
            </div>
            <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
              <span className="text-xs text-stone-400">Openings: {job.openings}</span>
              <button
                onClick={() => {
                  if (!currentUser) {
                    onOpenAuth('customer');
                    return;
                  }
                  setSelectedJob(job);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs sm:text-sm shadow transition active:scale-95"
              >
                View & Apply 🚀
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Application Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedJob(null);
          }}
        >
          <div
            className="bg-white dark:bg-stone-900 rounded-3xl max-w-2xl sm:max-w-3xl w-full shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col max-h-[88vh] overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200 text-stone-900 dark:text-stone-100"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm z-10 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                  {selectedJob.jobType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">📍 {selectedJob.location}</span>
                <span className="hidden sm:inline-block text-xs text-stone-400">•</span>
                <span className="hidden sm:inline-block text-xs font-semibold text-stone-500 dark:text-stone-400">🏢 {selectedJob.department}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 flex items-center justify-center font-bold text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body (Prominent Scrollbar & Mouse Wheel Smooth Scrolling) */}
            <div
              className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar"
              onWheel={(e) => e.stopPropagation()}
            >
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white">{selectedJob.title}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                  <span>📍 {selectedJob.location}</span>
                  <span>•</span>
                  <span>💼 {selectedJob.department}</span>
                  <span>•</span>
                  <span>🎓 {selectedJob.qualification}</span>
                  <span>•</span>
                  <span>⏳ {selectedJob.experience}</span>
                  <span>•</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">👥 Openings: {selectedJob.openings}</span>
                </div>
              </div>

              {selectedJob.salaryRange && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-center justify-between">
                  <span>💰 Salary / Payout Package</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">{selectedJob.salaryRange}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80">
                    <h4 className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                      <span>📋</span> Responsibilities (जिम्मेदारियां)
                    </h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
                      {selectedJob.responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                  <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80">
                    <h4 className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm mb-2 flex items-center gap-1.5">
                      <span>🎯</span> Requirements (आवश्यक योग्यता)
                    </h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-stone-600 dark:text-stone-300 text-xs leading-relaxed">
                      {selectedJob.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <form id="apply-job-form" onSubmit={handleApplyJob} className="p-4 sm:p-5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-3.5">
                <h4 className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm flex items-center gap-2">
                  <span>✍️</span> Submit Your Application
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">Applicant Name</label>
                    <input
                      type="text"
                      disabled
                      value={userProfile?.name || currentUser?.displayName || 'Logged In Candidate'}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      disabled
                      value={userProfile?.phone || currentUser?.phoneNumber || 'Registered Phone'}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">Email</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser?.email || 'N/A'}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase mb-1">
                    Cover Note / Relevant Experience (अनुभव एवं जानकारी)
                  </label>
                  <textarea
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    required
                    rows={3}
                    placeholder="Mention your relevant experience, key skills, and why you are the best fit for this role..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs sm:text-sm custom-scrollbar"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer (Fixed at bottom) */}
            <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-3.5 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex-shrink-0 z-10">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="apply-job-form"
                disabled={applying}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                {applying ? 'Submitting Application...' : 'Submit Application 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

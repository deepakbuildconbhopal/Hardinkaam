import React, { useState, useEffect } from 'react';
import { Booking, ServiceMan, Category, Service } from '../../types';
import { workAndJobsService } from '../../services/workAndJobsService';
import { TaskDefinition, TaskSubmission, JobPost } from '../../types/workAndJobs';

interface AdminHardinkaamControlRoomProps {
  bookings: Booking[];
  serviceMen: ServiceMan[];
  services: Service[];
  categories: Category[];
  onSelectTab: (tab: string) => void;
}

export const AdminHardinkaamControlRoom: React.FC<AdminHardinkaamControlRoomProps> = ({
  bookings,
  serviceMen,
  services,
  categories,
  onSelectTab
}) => {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);

  useEffect(() => {
    loadControlRoomData();
  }, []);

  const loadControlRoomData = async () => {
    try {
      const allTasks = await workAndJobsService.getTasks();
      setTasks(allTasks);
      const allSubs = await workAndJobsService.getAllSubmissions();
      setSubmissions(allSubs);
      const allJobs = await workAndJobsService.getJobs();
      setJobs(allJobs);
    } catch (e) {
      console.error(e);
    }
  };

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed' || b.status === 'work_completed').length;
  const activeBookings = bookings.filter(b => ['assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'work_started'].includes(b.status)).length;
  const totalRevenue = bookings.filter(b => b.status === 'completed' || b.status === 'work_completed').reduce((sum, b) => sum + (b.totalAmount || b.amount || 0), 0);

  const activePros = serviceMen.filter(p => p.isAvailable).length;
  const approvedTasks = submissions.filter(s => s.status === 'APPROVED').length;
  const pendingTasks = submissions.filter(s => s.status === 'SUBMITTED').length;
  const publishedJobs = jobs.filter(j => j.status === 'PUBLISHED').length;

  return (
    <div className="space-y-6 animate-entry">
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            🏛 HARDINKAAM Control Room
          </span>
          <h1 className="text-3xl sm:text-4xl font-black mt-3">Central Operational Command</h1>
          <p className="text-stone-300 mt-1 text-sm sm:text-base">
            Real-time analytics, services, tasks, jobs, and financial ledger control for Super Admin.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 font-bold uppercase">Total Bookings</p>
          <p className="text-3xl font-black text-stone-900 mt-2">{totalBookings}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Active: {activeBookings}</span>
            <span className="text-emerald-600 font-bold">Completed: {completedBookings}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 font-bold uppercase">Service Revenue</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Razorpay Admin Vault</span>
            <span className="text-emerald-700 font-bold">Secured ✓</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 font-bold uppercase">Task Submissions</p>
          <p className="text-3xl font-black text-teal-600 mt-2">{submissions.length}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Pending Review: {pendingTasks}</span>
            <span className="text-teal-700 font-bold">Approved: {approvedTasks}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-200">
          <p className="text-xs text-stone-500 font-bold uppercase">Active ServiceMen</p>
          <p className="text-3xl font-black text-blue-600 mt-2">{activePros}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-stone-500 pt-3 border-t border-stone-100">
            <span>Total Registered: {serviceMen.length}</span>
            <span className="text-blue-700 font-bold">Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
          <h3 className="font-black text-stone-900 text-lg">Quick Operations & Management</h3>
          <div className="space-y-2">
            <button
              onClick={() => onSelectTab('admin_bookings')}
              className="w-full text-left p-3 rounded-xl hover:bg-stone-50 font-bold text-stone-800 flex items-center justify-between transition"
            >
              <span>🛠 Bookings & Dispatch</span>
              <span>→</span>
            </button>
            <button
              onClick={() => onSelectTab('admin_users')}
              className="w-full text-left p-3 rounded-xl hover:bg-stone-50 font-bold text-stone-800 flex items-center justify-between transition"
            >
              <span>👥 Unified Customers Manager</span>
              <span>→</span>
            </button>
            <button
              onClick={() => onSelectTab('admin_financial_profit')}
              className="w-full text-left p-3 rounded-xl hover:bg-stone-50 font-bold text-stone-800 flex items-center justify-between transition"
            >
              <span>💰 Financial Profit & Ledgers</span>
              <span>→</span>
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
          <h3 className="font-black text-stone-900 text-lg">Work From Home & Tasks</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Active Tasks:</span>
              <span className="font-bold text-stone-900">{tasks.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Pending Review:</span>
              <span className="font-bold text-amber-600">{pendingTasks}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Approved Payouts:</span>
              <span className="font-bold text-emerald-600">{approvedTasks}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 space-y-4">
          <h3 className="font-black text-stone-900 text-lg">Jobs & Career Posts</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Published Jobs:</span>
              <span className="font-bold text-stone-900">{publishedJobs}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Total Openings:</span>
              <span className="font-bold text-blue-600">{jobs.reduce((s, j) => s + j.openings, 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

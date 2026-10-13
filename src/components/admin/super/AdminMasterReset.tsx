import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Database,
  Users,
  FileText,
  ArrowRight
} from 'lucide-react';
import { db } from '../../../firebase/config';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';

export const AdminMasterReset: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const isSuperAdmin = currentUser?.email?.toLowerCase() === 'deepakbuildconbhopal@gmail.com' || isAdmin;

  const [step, setStep] = useState<number>(1);
  const [confirmStep1Text, setConfirmStep1Text] = useState<string>('');
  const [confirmStep2Text, setConfirmStep2Text] = useState<string>('');
  const [confirmFinal, setConfirmFinal] = useState<boolean>(false);

  const [previewStats, setPreviewStats] = useState<any | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [resetReport, setResetReport] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-stone-900 text-stone-100 rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-rose-600/20 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/40">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">Access Denied</h2>
        <p className="text-xs text-stone-400">
          The Master Firebase Reset Studio is restricted exclusively to the verified Super Admin (<code className="text-rose-400">deepakbuildconbhopal@gmail.com</code>).
        </p>
      </div>
    );
  }

  const handleScanDatabase = async () => {
    setScanning(true);
    setErrorMsg(null);
    try {
      const getCount = async (colName: string) => {
        try {
          const snap = await getDocs(query(collection(db, colName), limit(500)));
          return snap.size;
        } catch {
          return 0;
        }
      };

      const usersCount = await getCount('users');
      const serviceMenCount = await getCount('service_men');
      const bookingsCount = await getCount('bookings');
      const messagesCount = await getCount('messages');
      const notificationsCount = await getCount('notifications');
      const walletsCount = await getCount('wallets');
      const transactionsCount = await getCount('transactions');
      const paymentsCount = await getCount('payments');
      const payoutsCount = await getCount('serviceman_payouts');
      const rewardsCount = await getCount('rewards');
      const kycCount = await getCount('kyc_documents');
      const reviewsCount = await getCount('reviews');
      const tokensCount = await getCount('device_tokens');

      setPreviewStats({
        authUsersToDelete: Math.max(0, usersCount - 1),
        firestoreUserDocs: usersCount,
        serviceMen: serviceMenCount,
        customers: Math.max(0, usersCount - serviceMenCount - 1),
        bookings: bookingsCount,
        messages: messagesCount,
        notifications: notificationsCount,
        transactions: transactionsCount,
        wallets: walletsCount,
        payouts: payoutsCount,
        rewards: rewardsCount,
        kyc: kycCount,
        reviews: reviewsCount,
        deviceTokens: tokensCount,
        dummyRecords: serviceMenCount + messagesCount + notificationsCount,
      });
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to scan database');
    } finally {
      setScanning(false);
    }
  };

  const handleExecuteMasterReset = async () => {
    if (
      confirmStep1Text !== 'I UNDERSTAND — DELETE ALL USERS AND USER DATA' ||
      confirmStep2Text !== 'DELETE HARDINKAAM USER DATA' ||
      !confirmFinal
    ) {
      setErrorMsg('Please complete both verification steps with exact text matching.');
      return;
    }

    setResetting(true);
    setProgressPercent(15);
    setErrorMsg(null);

    try {
      setProgressPercent(40);
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

      setProgressPercent(65);
      const res = await fetch('/api/admin/master-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ confirmationCode: 'DELETE_HARDINKAAM_USER_DATA_CONFIRMED' }),
      });

      setProgressPercent(90);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Master reset failed on server.');
      }

      setProgressPercent(100);
      setResetReport(data.report || {
        authUsersDeleted: previewStats?.authUsersToDelete || 0,
        firestoreDocsDeleted: (previewStats?.firestoreUserDocs || 0) + (previewStats?.bookings || 0),
        dummyRecordsRemoved: previewStats?.dummyRecords || 0,
        preservedAdmin: 'deepakbuildconbhopal@gmail.com',
        masterConfigPreserved: true,
      });
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Master reset execution failed');
      setResetting(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-stone-900 text-stone-100 rounded-3xl border border-rose-500/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center space-x-4 border-b border-stone-800 pb-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
          <ShieldAlert className="w-8 h-8 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white tracking-wide">
            HARDINKAAM MASTER FIREBASE RESET STUDIO
          </h1>
          <p className="text-xs text-rose-400 font-medium">
            🔒 Super-Admin-Only Destructive Operation for Fresh Production / Testing State
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Scan & Preview */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <h2 className="font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> CRITICAL WARNING & PURPOSE
            </h2>
            <p>
              This tool will permanently delete all normal user accounts (Customers, Service Professionals, Business Partners, Franchise users), along with their bookings, messages, notifications, wallets, transactions, and reviews from Firebase Authentication and Firestore database (<code className="bg-stone-950 px-1.5 py-0.5 rounded text-amber-300">hardinkaam-5cc6a</code>).
            </p>
            <p className="text-stone-300">
              Master platform configuration, service categories, pricing rules, district definitions, and the Super Admin account (<code className="bg-stone-950 px-1.5 py-0.5 rounded text-amber-300">deepakbuildconbhopal@gmail.com</code>) will be strictly preserved.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleScanDatabase}
              disabled={scanning}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-900/40"
            >
              {scanning ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Scanning Database...</span>
                </>
              ) : (
                <>
                  <span>Scan Database & Preview Records</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Two-Step Mandatory Verification */}
      {step === 2 && previewStats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-bold">Auth Users to Delete</span>
              <div className="text-xl font-black text-rose-400 mt-1">{previewStats.authUsersToDelete}</div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-bold">ServiceMen</span>
              <div className="text-xl font-black text-amber-400 mt-1">{previewStats.serviceMen}</div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-bold">Bookings</span>
              <div className="text-xl font-black text-blue-400 mt-1">{previewStats.bookings}</div>
            </div>
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800">
              <span className="text-[10px] text-stone-400 uppercase font-bold">Messages & Notifs</span>
              <div className="text-xl font-black text-purple-400 mt-1">{previewStats.messages + previewStats.notifications}</div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-rose-950/30 border border-rose-500/40 space-y-6">
            <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" /> Two-Step Mandatory Verification (Super Admin Only)
            </h3>

            <div className="space-y-4 text-xs">
              {/* Step 1 input */}
              <div className="space-y-1.5">
                <label className="block text-stone-300 font-medium">
                  Step 1: Type exact text: <code className="text-rose-400 font-bold">I UNDERSTAND — DELETE ALL USERS AND USER DATA</code>
                </label>
                <input
                  type="text"
                  value={confirmStep1Text}
                  onChange={(e) => setConfirmStep1Text(e.target.value)}
                  placeholder="Type exact text here..."
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Step 2 input */}
              <div className="space-y-1.5">
                <label className="block text-stone-300 font-medium">
                  Step 2: Type exact text: <code className="text-rose-400 font-bold">DELETE HARDINKAAM USER DATA</code>
                </label>
                <input
                  type="text"
                  value={confirmStep2Text}
                  onChange={(e) => setConfirmStep2Text(e.target.value)}
                  placeholder="Type exact text here..."
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Final confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={confirmFinal}
                  onChange={(e) => setConfirmFinal(e.target.checked)}
                  className="mt-0.5 accent-rose-600 w-4 h-4"
                />
                <span className="text-rose-200 font-bold">
                  Final Confirmation: YES, PERMANENTLY RESET HARDINKAAM DATABASE
                </span>
              </label>
            </div>
          </div>

          {resetting && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-stone-300 font-bold">
                <span>Resetting Firebase Auth & Firestore...</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full bg-rose-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={resetting}
              className="px-5 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleExecuteMasterReset}
              disabled={
                resetting ||
                confirmStep1Text !== 'I UNDERSTAND — DELETE ALL USERS AND USER DATA' ||
                confirmStep2Text !== 'DELETE HARDINKAAM USER DATA' ||
                !confirmFinal
              }
              className={`px-6 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                confirmStep1Text === 'I UNDERSTAND — DELETE ALL USERS AND USER DATA' &&
                confirmStep2Text === 'DELETE HARDINKAAM USER DATA' &&
                confirmFinal
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-900/50'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              {resetting ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Executing Master Reset...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Execute Master Reset Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success Report */}
      {step === 3 && resetReport && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
              <h2 className="text-lg font-black tracking-wide">
                HARDINKAAM MASTER RESET COMPLETE ✓
              </h2>
            </div>
            <p className="text-xs text-emerald-200">
              The system has been successfully reset to a pristine production/testing state. All normal users, bookings, messages, and dummy records have been permanently cleared.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex justify-between">
                <span className="text-stone-400">Firebase Auth Users Deleted:</span>
                <span className="font-bold text-rose-400">{resetReport.authUsersDeleted || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex justify-between">
                <span className="text-stone-400">Firestore User Docs Cleared:</span>
                <span className="font-bold text-rose-400">{resetReport.firestoreDocsDeleted || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex justify-between">
                <span className="text-stone-400">Dummy Records Removed:</span>
                <span className="font-bold text-amber-400">{resetReport.dummyRecordsRemoved || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex justify-between">
                <span className="text-stone-400">Master Admin Preserved:</span>
                <span className="font-bold text-emerald-400">deepakbuildconbhopal@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => (window.location.href = '/')}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Go to Fresh Home / Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  Smartphone,
  RefreshCw,
  Search,
  Filter,
  Send,
  AlertCircle,
  FileSpreadsheet,
  BadgePercent,
  Receipt,
  UserCheck,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  Zap,
  CreditCard,
  X,
  Sparkles,
  Download,
  Eye,
  Printer,
  QrCode,
  Check,
  Info,
  Layers,
  TrendingUp,
  Gift,
} from 'lucide-react';
import { doc, updateDoc, collection, addDoc, getDocs, query, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { checkAndHandleQuotaError, isResourceExhausted } from '../../utils/sparkQuotaGuard';
import { Booking, ServiceMan, ServicemanPayoutRecord, LedgerEntry } from '../../types';
import { getAllPlatformLedgers, triggerPaymentRefund } from '../../services/commissionLedgerService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { safeFetchJson } from '../../utils/safeJson';

interface Props {
  bookings: Booking[];
  serviceMen: ServiceMan[];
  onRefresh?: () => void;
}

export const AdminPayoutsManager: React.FC<Props> = ({ bookings, serviceMen, onRefresh }) => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  // Navigation & Filtering Tabs
  const [activeTab, setActiveTab] = useState<'pending' | 'settled' | 'pros' | 'referrals' | 'all' | 'ledgers'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProFilter, setSelectedProFilter] = useState<string>('all');
  const [commissionRate, setCommissionRate] = useState<number>(15); // 15% platform fee
  const [taxRate, setTaxRate] = useState<number>(5); // 5% TDS / GST deduction

  // Customer Referral Payouts State (Lazy loaded only when referrals tab is viewed)
  const [referralPayoutRecords, setReferralPayoutRecords] = useState<any[]>([]);
  const hasLoadedReferralsRef = React.useRef(false);

  const loadReferralPayouts = async () => {
    if (isResourceExhausted()) return;
    try {
      const snap = await getDocs(query(collection(db, 'referrals'), limit(50)));
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setReferralPayoutRecords(list);
      hasLoadedReferralsRef.current = true;
    } catch (err) {
      console.warn('Error loading referral payouts:', err);
      checkAndHandleQuotaError(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'referrals' && !hasLoadedReferralsRef.current) {
      loadReferralPayouts();
    }
  }, [activeTab]);

  const customerReferralPayoutStats = useMemo(() => {
    const map: Record<string, { referrerId: string; totalReferrals: number; successfulConversions: number; totalPoints: number; totalRupeeValue: number; records: any[]; isEligible: boolean }> = {};

    referralPayoutRecords.forEach((r) => {
      const id = r.referrerCustomerId || 'UNKNOWN';
      if (!map[id]) {
        map[id] = {
          referrerId: id,
          totalReferrals: 0,
          successfulConversions: 0,
          totalPoints: 0,
          totalRupeeValue: 0,
          records: [],
          isEligible: false,
        };
      }
      map[id].totalReferrals += 1;
      map[id].records.push(r);
      if (r.status === 'REWARDED' || r.status === 'QUALIFIED') {
        map[id].successfulConversions += 1;
        if (r.status === 'REWARDED') {
          const pts = Number(r.rewardPoints) || 500;
          map[id].totalPoints += pts;
          map[id].totalRupeeValue += pts;
        }
      }
    });

    return Object.values(map).map((item) => {
      const isEligible = item.totalRupeeValue >= 500;
      return {
        ...item,
        isEligible,
      };
    }).sort((a, b) => b.totalRupeeValue - a.totalRupeeValue);
  }, [referralPayoutRecords]);

  const handleProcessCustomerReferralPayout = async (stat: typeof customerReferralPayoutStats[0]) => {
    if (stat.totalRupeeValue < 500) {
      addToast({ title: 'Threshold Notice', message: `Customer referral rewards (₹${stat.totalRupeeValue}) have not reached the minimum threshold of ₹500.`, type: 'info' });
      return;
    }

    if (!window.confirm(`क्या आप ${stat.referrerId} के ₹${stat.totalRupeeValue} के referral rewards पेआउट को प्रोसेस करना चाहते हैं?`)) {
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': userProfile?.email || 'deepakbuildconbhopal@gmail.com',
        'x-admin-role': 'admin',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/payouts/process', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId: `REF_PAYOUT_${stat.referrerId}_${Date.now()}`,
          serviceManId: stat.referrerId,
          serviceManName: `Customer Promotor #${stat.referrerId.substring(0, 8)}`,
          serviceManPhone: '+91 98260 12345',
          grossAmount: stat.totalRupeeValue,
          companyCommissionRate: 0,
          taxRate: 0,
          payoutMethod: 'upi_instant',
          upiOrBank: `UPI: ${stat.referrerId}@okhdfcbank`,
          adminUsername: userProfile?.name || 'DEEPAK (Admin)',
          notes: `Customer Referral Reward Payout (Threshold >= ₹500 reached)`,
        }),
      });

      const jsonResult = await safeFetchJson(response);
      const data = jsonResult.data;

      await addDoc(collection(db, 'payouts'), {
        type: 'customer_referral',
        referrerCustomerId: stat.referrerId,
        amount: stat.totalRupeeValue,
        status: 'processed',
        payoutRazorpayId: data?.payout?.payoutRazorpayId || `PAYOUT_REF_${Date.now()}`,
        createdAt: new Date().toISOString(),
      });

      addToast({
        title: 'सफल / Referral Payout Processed!',
        message: `₹${stat.totalRupeeValue} payout successfully processed for customer #${stat.referrerId.substring(0, 8)}.`,
        type: 'success',
      });

      loadReferralPayouts();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      addToast({ title: 'Payout Error', message: err.message || 'Failed to process referral payout.', type: 'error' });
    }
  };

  const handleBulkReferralPayouts = async () => {
    const eligibleItems = customerReferralPayoutStats.filter((s) => s.isEligible);
    if (eligibleItems.length === 0) {
      addToast({ title: 'Notice', message: 'No eligible customer referral payouts found meeting the ₹500 threshold.', type: 'info' });
      return;
    }

    if (!window.confirm(`क्या आप सभी ${eligibleItems.length} योग्य कस्टमर referral पेआउट्स को प्रोसेस करना चाहते हैं?`)) {
      return;
    }

    let count = 0;
    for (const item of eligibleItems) {
      try {
        await handleProcessCustomerReferralPayout(item);
        count++;
      } catch (e) {
        console.warn('Bulk referral payout item error:', e);
      }
    }

    addToast({ title: 'Bulk Payout Complete', message: `Successfully processed ${count} customer referral payouts.`, type: 'success' });
  };

  // Multilevel Ledgers & Commissions State
  const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
  const [selectedLedgerRole, setSelectedLedgerRole] = useState<string>('all');
  const [loadingLedgers, setLoadingLedgers] = useState(false);
  const [refundModalItem, setRefundModalItem] = useState<{ paymentId: string; amount: number; bookingId: string } | null>(null);
  const [refundReasonText, setRefundReasonText] = useState('Customer cancellation / service adjustment');
  const [refundProcessing, setRefundProcessing] = useState(false);

  const loadLedgers = async () => {
    setLoadingLedgers(true);
    try {
      const data = await getAllPlatformLedgers();
      setLedgers(data);
    } catch (err: any) {
      console.warn('Error loading ledgers:', err?.message);
    } finally {
      setLoadingLedgers(false);
    }
  };

  React.useEffect(() => {
    loadLedgers();
  }, [activeTab]);

  const handleExecuteRefund = async () => {
    if (!refundModalItem) return;
    setRefundProcessing(true);
    try {
      const res = await triggerPaymentRefund(refundModalItem.paymentId, refundModalItem.amount, refundReasonText);
      addToast(res.message || 'Refund successfully processed and commission ledgers reversed.', 'success');
      setRefundModalItem(null);
      await loadLedgers();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      addToast(err?.message || 'Failed to process refund.', 'error');
    } finally {
      setRefundProcessing(false);
    }
  };

  const ledgerStats = useMemo(() => {
    let companyTotal = 0;
    let franchiseTotal = 0;
    let partnerTotal = 0;
    let servicemanTotal = 0;
    let reversedTotal = 0;

    ledgers.forEach((l) => {
      if (l.type === 'credit' && !l.isReversed) {
        if (l.ledgerOwnerRole === 'company') companyTotal += l.amount;
        else if (l.ledgerOwnerRole === 'franchise') franchiseTotal += l.amount;
        else if (l.ledgerOwnerRole === 'partner' || l.ledgerOwnerRole === 'brand_promoter') partnerTotal += l.amount;
        else if (l.ledgerOwnerRole === 'service_man') servicemanTotal += l.amount;
      } else if (l.type === 'debit' || l.isReversed) {
        reversedTotal += l.amount;
      }
    });

    return {
      companyTotal,
      franchiseTotal,
      partnerTotal,
      servicemanTotal,
      reversedTotal,
      totalLedgers: ledgers.length,
    };
  }, [ledgers]);

  const filteredLedgers = useMemo(() => {
    return ledgers.filter((l) => {
      const matchesRole = selectedLedgerRole === 'all' || l.ledgerOwnerRole === selectedLedgerRole;
      const matchesSearch =
        !searchTerm.trim() ||
        l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.ledgerOwnerName && l.ledgerOwnerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        l.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [ledgers, selectedLedgerRole, searchTerm]);

  // Processing & Modal States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingProId, setProcessingProId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [triggerPayoutModalItem, setTriggerPayoutModalItem] = useState<any | null>(null);
  const [viewReceiptItem, setViewReceiptItem] = useState<any | null>(null);
  const [customPayoutNotes, setCustomPayoutNotes] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'razorpay_instant' | 'upi_instant' | 'bank_neft'>('razorpay_instant');

  // Map and calculate payouts from bookings
  const payoutRecords = useMemo(() => {
    return bookings.map((b) => {
      const gross = b.amount || 0;
      const compCharge = b.companyCommission !== undefined ? b.companyCommission : Math.round((gross * commissionRate) / 100);
      const tax = b.taxDeduction !== undefined ? b.taxDeduction : Math.round((gross * taxRate) / 100);
      const net = b.servicemanPayoutAmount !== undefined ? b.servicemanPayoutAmount : Math.max(0, gross - compCharge - tax);
      
      const pro = serviceMen.find((s) => s.id === b.serviceManId || s.name === b.serviceManName);
      const isPaid = b.payoutStatus === 'paid';

      // Professional is eligible for payout if booking is completed/accepted and not yet paid
      const isEligibleForPayout = !isPaid && (b.status === 'completed' || b.status === 'accepted' || b.paymentStatus === 'paid' || gross > 0);

      return {
        ...b,
        calculatedGross: gross,
        calculatedCommission: compCharge,
        calculatedTax: tax,
        calculatedNet: net,
        proDetails: pro,
        effectivePayoutStatus: isPaid ? 'paid' : 'pending',
        isEligibleForPayout,
      };
    });
  }, [bookings, serviceMen, commissionRate, taxRate]);

  // Statistics Summary
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalCompanyRevenue = 0;
    let totalTaxCollected = 0;
    let pendingPayouts = 0;
    let settledPayouts = 0;
    let pendingCount = 0;
    let settledCount = 0;

    payoutRecords.forEach((item) => {
      totalGross += item.calculatedGross;
      totalCompanyRevenue += item.calculatedCommission;
      totalTaxCollected += item.calculatedTax;

      if (item.effectivePayoutStatus === 'paid') {
        settledPayouts += item.calculatedNet;
        settledCount += 1;
      } else {
        pendingPayouts += item.calculatedNet;
        pendingCount += 1;
      }
    });

    const totalCount = pendingCount + settledCount;
    const settledPercentage = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 100;

    return {
      totalGross,
      totalCompanyRevenue,
      totalTaxCollected,
      pendingPayouts,
      settledPayouts,
      pendingCount,
      settledCount,
      settledPercentage,
    };
  }, [payoutRecords]);

  // Verified Professionals aggregated earnings summary
  const verifiedProsSummary = useMemo(() => {
    return serviceMen.map((pro) => {
      const proBookings = payoutRecords.filter((b) => b.serviceManId === pro.id || b.serviceManName === pro.name);
      const totalJobs = proBookings.length;
      const completedJobs = proBookings.filter((b) => b.status === 'completed').length;
      const grossEarned = proBookings.reduce((sum, b) => sum + b.calculatedGross, 0);
      const settledAmount = proBookings.filter((b) => b.effectivePayoutStatus === 'paid').reduce((sum, b) => sum + b.calculatedNet, 0);
      const pendingAmount = proBookings.filter((b) => b.effectivePayoutStatus !== 'paid').reduce((sum, b) => sum + b.calculatedNet, 0);
      const pendingBookings = proBookings.filter((b) => b.effectivePayoutStatus !== 'paid');
      const pendingJobsCount = pendingBookings.length;
      const settledJobsCount = proBookings.filter((b) => b.effectivePayoutStatus === 'paid').length;

      return {
        ...pro,
        totalJobs,
        completedJobs,
        grossEarned,
        settledAmount,
        pendingAmount,
        pendingJobsCount,
        settledJobsCount,
        pendingBookings,
        proBookings,
        isEligible: pendingAmount > 0 && pro.isVerified,
      };
    });
  }, [serviceMen, payoutRecords]);

  // Filtered list based on active tab and search
  const filteredRecords = useMemo(() => {
    return payoutRecords.filter((rec) => {
      const matchesSearch =
        rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rec.serviceManName && rec.serviceManName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rec.payoutRazorpayId && rec.payoutRazorpayId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPro =
        selectedProFilter === 'all'
          ? true
          : rec.serviceManId === selectedProFilter || rec.serviceManName === selectedProFilter;

      if (!matchesSearch || !matchesPro) return false;

      if (activeTab === 'pending') return rec.effectivePayoutStatus !== 'paid';
      if (activeTab === 'settled') return rec.effectivePayoutStatus === 'paid';
      return true;
    });
  }, [payoutRecords, searchTerm, selectedProFilter, activeTab]);

  // Execute single payout via backend / Cloud Functions API
  const executePayout = async (booking: any) => {
    setProcessingId(booking.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': userProfile?.email || 'deepakbuildconbhopal@gmail.com',
        'x-admin-role': 'admin',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/payouts/process', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bookingId: booking.id,
          serviceManId: booking.serviceManId || 'pro_default',
          serviceManName: booking.serviceManName || 'Verified Professional',
          serviceManPhone: booking.serviceManPhone || '+91 98260 12345',
          grossAmount: booking.calculatedGross,
          companyCommissionRate: commissionRate,
          taxRate: taxRate,
          payoutMethod,
          upiOrBank: booking.proDetails?.phone ? `UPI: ${booking.proDetails.phone}@okhdfcbank` : 'Verified Bank Account',
          adminUsername: userProfile?.name || 'DEEPAK (Admin)',
          notes: customPayoutNotes || 'Verified service payout trigger',
        }),
      });

      const jsonResult = await safeFetchJson(response);
      const data = jsonResult.data;
      if (!response.ok || !jsonResult.ok || !data?.success) {
        throw new Error(data?.error || jsonResult.error || 'Payout transfer failed on server');
      }

      const payoutStatus = data.payout?.payoutStatus || data.payout?.status || 'processing';
      const payoutReference = data.payout?.payoutReference || data.payout?.payoutRazorpayId || null;
      const payoutRazorpayId = data.payout?.payoutRazorpayId || null;
      const isSettled = payoutStatus === 'settled' || payoutStatus === 'paid';
      const nowIso = new Date().toISOString();

      // Update Firestore booking record
      await updateDoc(doc(db, 'bookings', booking.id), {
        payoutStatus,
        payoutReference,
        payoutRazorpayId,
        payoutPaidAt: isSettled ? nowIso : null,
        payoutInitiatedAt: nowIso,
        companyCommission: booking.calculatedCommission,
        taxDeduction: booking.calculatedTax,
        servicemanPayoutAmount: booking.calculatedNet,
        updatedAt: nowIso,
      });

      // Log in serviceman_payouts collection
      try {
        await addDoc(collection(db, 'serviceman_payouts'), {
          ...data.payout,
          createdAt: nowIso,
        });
      } catch (e) {
        console.warn('Payout record save notice:', e);
      }

      const displayPayoutId = payoutRazorpayId || payoutReference || 'Processing';

      // Send in-app notification to the serviceman
      if (booking.serviceManId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: booking.serviceManId,
            title: isSettled ? 'पेआउट सफलतापूर्वक भेजा गया (Payout Settled)' : 'पेआउट प्रोसेसिंग शुरू (Payout Processing)',
            message: `Booking #${booking.id?.substring(0, 8)} के लिए ₹${booking.calculatedNet} का पेआउट प्रोसेस किया जा रहा है (Ref: ${displayPayoutId})।`,
            type: 'payout',
            read: false,
            createdAt: nowIso,
          });
        } catch (nErr) {
          console.warn('Notification notice:', nErr);
        }
      }

      // Log WhatsApp dispatch log
      try {
        await addDoc(collection(db, 'whatsapp_logs'), {
          recipientPhone: booking.serviceManPhone || '+91 98260 12345',
          recipientName: booking.serviceManName,
          type: 'serviceman_payout',
          messageBody: `Namaste ${booking.serviceManName}! HARDINKAAM Admin has initiated payout for Booking #${booking.id}. Gross: ₹${booking.calculatedGross}, Commission (-${commissionRate}%): ₹${booking.calculatedCommission}, Tax (-${taxRate}%): ₹${booking.calculatedTax}. Net: ₹${booking.calculatedNet} (Ref: ${displayPayoutId}).`,
          status: 'sent',
          timestamp: nowIso,
        });
      } catch (wErr) {
        console.warn('WhatsApp log note:', wErr);
      }

      addToast({
        title: isSettled ? 'भुगतान सफल / Payout Settled!' : 'पेआउट प्रोसेस में / Payout Queued',
        message: `₹${booking.calculatedNet} queued for ${booking.serviceManName} (Ref: ${displayPayoutId})`,
        type: 'success',
      });

      setTriggerPayoutModalItem(null);
      setCustomPayoutNotes('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Payout failed:', err);
      addToast({
        title: 'Payout Trigger Failed',
        message: err.message || 'Could not complete transfer.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Disburse all pending payouts for a specific professional
  const handleProConsolidatedPayout = async (pro: typeof verifiedProsSummary[0]) => {
    if (pro.pendingBookings.length === 0) return;

    if (
      !window.confirm(
        `क्या आप ${pro.name} के सभी ${pro.pendingBookings.length} लंबित पेआउट्स (कुल ₹${pro.pendingAmount}) Razorpay API द्वारा ट्रांसफर करना चाहते हैं?`
      )
    ) {
      return;
    }

    setProcessingProId(pro.id);
    let successCount = 0;
    let totalDisbursed = 0;

    const token = await auth.currentUser?.getIdToken();
    const adminHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-email': userProfile?.email || 'deepakbuildconbhopal@gmail.com',
      'x-admin-role': 'admin',
    };
    if (token) {
      adminHeaders['Authorization'] = `Bearer ${token}`;
    }

    for (const item of pro.pendingBookings) {
      try {
        const response = await fetch('/api/payouts/process', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            bookingId: item.id,
            serviceManId: pro.id,
            serviceManName: pro.name,
            serviceManPhone: pro.phone,
            grossAmount: item.calculatedGross,
            companyCommissionRate: commissionRate,
            taxRate: taxRate,
            payoutMethod: 'razorpay_instant',
            upiOrBank: pro.phone ? `UPI: ${pro.phone}@okhdfcbank` : 'Verified Bank Account',
            adminUsername: userProfile?.name || 'DEEPAK (Admin)',
            notes: `Consolidated Pro Payout for ${pro.name}`,
          }),
        });

        const jsonResult = await safeFetchJson(response);
        const data = jsonResult.data;
        if (response.ok && jsonResult.ok && data?.success) {
          const nowIso = new Date().toISOString();
          const payoutStatus = data.payout?.payoutStatus || data.payout?.status || 'processing';
          const payoutReference = data.payout?.payoutReference || data.payout?.payoutRazorpayId || null;
          const payoutRazorpayId = data.payout?.payoutRazorpayId || null;
          const isSettled = payoutStatus === 'settled' || payoutStatus === 'paid';

          await updateDoc(doc(db, 'bookings', item.id), {
            payoutStatus,
            payoutReference,
            payoutRazorpayId,
            payoutPaidAt: isSettled ? nowIso : null,
            payoutInitiatedAt: nowIso,
            companyCommission: item.calculatedCommission,
            taxDeduction: item.calculatedTax,
            servicemanPayoutAmount: item.calculatedNet,
            updatedAt: nowIso,
          });
          successCount++;
          totalDisbursed += item.calculatedNet;
        }
      } catch (err) {
        console.warn('Pro batch item error:', err);
      }
    }

    setProcessingProId(null);
    addToast({
      title: 'प्रोफेशनल पेआउट पूर्ण / Pro Payout Disbursed',
      message: `₹${totalDisbursed} queued for processing to ${pro.name} for ${successCount} booking(s).`,
      type: 'success',
    });
    if (onRefresh) onRefresh();
  };

  // Bulk payout process for all pending
  const handleBulkPayout = async () => {
    const pendingItems = payoutRecords.filter((p) => p.effectivePayoutStatus !== 'paid');
    if (pendingItems.length === 0) {
      addToast({ title: 'सूचना / Notice', message: 'No pending payouts to disburse.', type: 'info' });
      return;
    }

    if (
      !window.confirm(
        `क्या आप सभी ${pendingItems.length} लंबित सर्विसमैन पेआउट्स (कुल ₹${stats.pendingPayouts}) को Razorpay द्वारा ट्रांसफर करना चाहते हैं?`
      )
    ) {
      return;
    }

    setIsBulkProcessing(true);
    let successCount = 0;

    const token = await auth.currentUser?.getIdToken();
    const adminHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-admin-email': userProfile?.email || 'deepakbuildconbhopal@gmail.com',
      'x-admin-role': 'admin',
    };
    if (token) {
      adminHeaders['Authorization'] = `Bearer ${token}`;
    }

    for (const item of pendingItems) {
      try {
        const response = await fetch('/api/payouts/process', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            bookingId: item.id,
            serviceManId: item.serviceManId || 'pro_default',
            serviceManName: item.serviceManName || 'Verified Technician',
            serviceManPhone: item.serviceManPhone || '+91 98260 12345',
            grossAmount: item.calculatedGross,
            companyCommissionRate: commissionRate,
            taxRate: taxRate,
            adminUsername: userProfile?.name || 'DEEPAK (Admin)',
          }),
        });
        const jsonResult = await safeFetchJson(response);
        const data = jsonResult.data;
        if (response.ok && jsonResult.ok && data?.success) {
          const nowIso = new Date().toISOString();
          const payoutStatus = data.payout?.payoutStatus || data.payout?.status || 'processing';
          const payoutReference = data.payout?.payoutReference || data.payout?.payoutRazorpayId || null;
          const payoutRazorpayId = data.payout?.payoutRazorpayId || null;
          const isSettled = payoutStatus === 'settled' || payoutStatus === 'paid';

          await updateDoc(doc(db, 'bookings', item.id), {
            payoutStatus,
            payoutReference,
            payoutRazorpayId,
            payoutPaidAt: isSettled ? nowIso : null,
            payoutInitiatedAt: nowIso,
            companyCommission: item.calculatedCommission,
            taxDeduction: item.calculatedTax,
            servicemanPayoutAmount: item.calculatedNet,
            updatedAt: nowIso,
          });
          successCount++;
        }
      } catch (err) {
        console.warn('Bulk item payout error:', err);
      }
    }

    setIsBulkProcessing(false);
    addToast({
      title: 'बल्क पेआउट पूर्ण / Bulk Payout Complete',
      message: `${successCount} of ${pendingItems.length} payouts disbursed successfully via Razorpay.`,
      type: 'success',
    });
    if (onRefresh) onRefresh();
  };

  // Export CSV report
  const handleExportCSV = () => {
    const headers = [
      'Booking ID',
      'Service',
      'Date',
      'Customer',
      'Serviceman',
      'Gross (Rs)',
      'Company Fee (Rs)',
      'Tax (Rs)',
      'Net Payout (Rs)',
      'Payout Status',
      'Razorpay Payout ID',
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.serviceName}"`,
      r.scheduledDate,
      `"${r.customerName}"`,
      `"${r.serviceManName}"`,
      r.calculatedGross,
      r.calculatedCommission,
      r.calculatedTax,
      r.calculatedNet,
      r.effectivePayoutStatus,
      r.payoutRazorpayId || 'N/A',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HARDINKAAM_Payouts_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner with High-Contrast Governance Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-amber-500/20">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Razorpay Instant Payouts &amp; Split-Payment Hub</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              <span>Admin Payouts &amp; Settlements Manager</span>
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 mt-1.5 max-w-2xl leading-relaxed">
              Track pending vs. settled payouts for verified service professionals in Bhopal. Split fees automatically apply: <strong>{commissionRate}% Company Commission</strong> + <strong>{taxRate}% TDS</strong> deducted at source, with remaining <strong>80% funds</strong> disbursed directly via Razorpay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleBulkPayout}
              disabled={isBulkProcessing || stats.pendingCount === 0}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition hover:scale-102 disabled:opacity-50 cursor-pointer"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{isBulkProcessing ? 'Processing Bulk...' : `Disburse All Pending (₹${stats.pendingPayouts})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual Metrics Cards: Clearly separating Pending vs Settled states */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total GMV Card */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
            Total Customer Pay-In (Gross)
          </span>
          <div className="text-2xl font-black text-stone-900 mt-1">₹{stats.totalGross}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-1">
            <Layers className="w-3 h-3 text-stone-400" />
            <span>{payoutRecords.length} total bookings recorded</span>
          </div>
        </div>

        {/* Company Margin Card */}
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
            Platform Fee ({commissionRate}%)
          </span>
          <div className="text-2xl font-black text-amber-700 mt-1">₹{stats.totalCompanyRevenue}</div>
          <p className="text-[10px] text-amber-800 mt-1">HARDINKAAM retained margin</p>
        </div>

        {/* Tax TDS Card */}
        <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
            TDS / Tax Deducted ({taxRate}%)
          </span>
          <div className="text-2xl font-black text-blue-700 mt-1">₹{stats.totalTaxCollected}</div>
          <p className="text-[10px] text-blue-800 mt-1">Sec 194C statutory reserve</p>
        </div>

        {/* PENDING CARD (High Visual Urgency: Orange/Amber Border & Pulse) */}
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/30 shadow-md'
              : 'bg-orange-50/80 border-orange-200 hover:border-orange-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-950 uppercase tracking-wider">
              Pending Disbursal
            </span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-600"></span>
            </span>
          </div>
          <div className="text-2xl font-black text-orange-600 mt-1">₹{stats.pendingPayouts}</div>
          <div className="flex items-center justify-between text-[10px] text-orange-800 mt-1 font-semibold">
            <span>{stats.pendingCount} bookings ready</span>
            <span className="text-orange-700 underline">Action required →</span>
          </div>
        </div>

        {/* SETTLED CARD (High Visual Confirmation: Emerald Verified Badge) */}
        <div
          onClick={() => setActiveTab('settled')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'settled'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-md'
              : 'bg-emerald-50/80 border-emerald-200 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider">
              Settled Payouts
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">₹{stats.settledPayouts}</div>
          <div className="flex items-center justify-between text-[10px] text-emerald-800 mt-1 font-semibold">
            <span>{stats.settledCount} disbursed</span>
            <span className="text-emerald-700 font-bold">{stats.settledPercentage}% settled</span>
          </div>
        </div>
      </div>

      {/* Main Tabs & Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Primary View Tabs with Visual Cues */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-2xl border border-stone-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Disbursal</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'pending' ? 'bg-orange-800 text-orange-100' : 'bg-orange-100 text-orange-800'
                }`}
              >
                {stats.pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settled')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'settled'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settled History</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'settled' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {stats.settledCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'referrals'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Customer Referral Payouts (≥ ₹500)</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'referrals' ? 'bg-teal-900 text-teal-100' : 'bg-teal-100 text-teal-800'
                }`}
              >
                {customerReferralPayoutStats.filter((s) => s.isEligible).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pros')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'pros'
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Verified Professionals Roster</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'pros' ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                }`}
              >
                {serviceMen.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ledgers')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'ledgers'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Multilevel Ledgers &amp; Commissions</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  activeTab === 'ledgers' ? 'bg-indigo-900 text-indigo-100' : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {ledgers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>All Bookings Payouts</span>
              <span className="text-[10px] opacity-70">({payoutRecords.length})</span>
            </button>
          </div>

          {/* Quick Search & Pro Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search booking, pro, UTR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-stone-50"
              />
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 transition cursor-pointer shrink-0"
                title="Refresh from Firestore"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Rate Adjusters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 font-medium text-stone-600">
              <BadgePercent className="w-4 h-4 text-orange-600" />
              <span>Company Commission Rate:</span>
              <select
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="font-bold text-stone-900 border border-stone-200 rounded-lg px-2 py-1 bg-stone-50 cursor-pointer"
              >
                <option value={10}>10% Platform Fee</option>
                <option value={15}>15% Standard Fee</option>
                <option value={20}>20% Platform Fee</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-stone-600">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Tax / TDS (Sec 194C):</span>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="font-bold text-stone-900 border border-stone-200 rounded-lg px-2 py-1 bg-stone-50 cursor-pointer"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={2}>2% (Lower TDS)</option>
                <option value={5}>5% (Standard TDS/GST)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Settled</span>
            </div>
            <span>• Showing {activeTab === 'pros' ? verifiedProsSummary.length : filteredRecords.length} records</span>
          </div>
        </div>
      </div>

      {/* VIEW: CUSTOMER REFERRAL PAYOUTS (Min Threshold ₹500) */}
      {activeTab === 'referrals' && (
        <div className="space-y-4">
          <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-teal-900">
            <div className="flex items-start gap-3">
              <Gift className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-sm">Automated Customer Referral Payouts (Threshold: ₹500):</strong>
                <p className="text-xs text-teal-800 mt-0.5">
                  Customers who accumulate ₹500 or more in referral rewards are automatically eligible for payout. Click <strong>Process Payouts</strong> to transfer rewards instantly via Razorpay/UPI.
                </p>
              </div>
            </div>
            <button
              onClick={handleBulkReferralPayouts}
              className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Process All Eligible Payouts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerReferralPayoutStats.map((stat) => (
              <div
                key={stat.referrerId}
                className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between space-y-4 ${
                  stat.isEligible ? 'border-teal-300 ring-1 ring-teal-300/30' : 'border-stone-200 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Customer ID</span>
                    <h4 className="text-sm font-black text-stone-900 mt-0.5 font-mono">#{stat.referrerId.substring(0, 12)}</h4>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      stat.isEligible
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {stat.isEligible ? '✅ Eligible (≥ ₹500)' : '⏳ Below ₹500 Threshold'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-100 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-500 font-semibold block">Successful Referrals</span>
                    <span className="text-base font-black text-stone-900">{stat.successfulConversions} / {stat.totalReferrals}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 font-semibold block">Total Reward Earned</span>
                    <span className="text-base font-black text-teal-700">₹{stat.totalRupeeValue}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] text-stone-500">Min Threshold: ₹500</span>
                  <button
                    onClick={() => handleProcessCustomerReferralPayout(stat)}
                    disabled={!stat.isEligible}
                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
                      stat.isEligible
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Process Payouts</span>
                  </button>
                </div>
              </div>
            ))}
            {customerReferralPayoutStats.length === 0 && (
              <div className="col-span-full py-12 text-center text-stone-500 font-medium bg-white rounded-3xl border border-stone-200">
                No customer referral records found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: VERIFIED PROFESSIONALS ROSTER (With direct Consolidated 'Trigger Payout' Actions) */}
      {activeTab === 'pros' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-3xl flex items-start gap-3 text-xs text-purple-900">
            <Sparkles className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Verified Professional Fleet Payout Management:</strong>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Review aggregated earnings per professional. For professionals with pending balances, click <strong>Trigger Payout</strong> to disburse all their pending booking settlements directly via Razorpay API.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifiedProsSummary.map((pro) => {
              const isProProcessing = processingProId === pro.id;

              return (
                <div
                  key={pro.id}
                  className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                    pro.pendingAmount > 0
                      ? 'border-orange-300 ring-1 ring-orange-300/30'
                      : 'border-stone-200 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white font-bold text-base flex items-center justify-center overflow-hidden shrink-0 border border-stone-200">
                          {pro.photoUrl ? (
                            <img
                              src={pro.photoUrl}
                              alt={pro.name}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{pro.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-sm text-stone-900">{pro.name}</h3>
                            {pro.isVerified && (
                              <span title="Aadhaar KYC Verified">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500">{pro.phone}</p>
                          <p className="text-[10px] text-purple-700 font-bold mt-0.5">
                            {pro.categoryNames?.join(', ') || 'Home Service Professional'}
                          </p>
                        </div>
                      </div>

                      {pro.pendingAmount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200 flex items-center gap-1 shrink-0">
                          <Clock className="w-2.5 h-2.5 text-orange-600" />
                          <span>{pro.pendingJobsCount} Pending</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          <span>Settled</span>
                        </span>
                      )}
                    </div>

                    {/* Earnings Breakdown Box */}
                    <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs">
                      <div className="p-2 rounded-xl bg-white border border-stone-100">
                        <span className="text-[10px] text-stone-400 block font-semibold">Total Settled</span>
                        <span className="font-black text-emerald-700 text-sm">₹{pro.settledAmount}</span>
                        <span className="text-[9px] text-stone-400 block mt-0.5">{pro.settledJobsCount} jobs paid</span>
                      </div>
                      <div className="p-2 rounded-xl bg-orange-50/60 border border-orange-100">
                        <span className="text-[10px] text-orange-700 block font-semibold">Pending Disbursal</span>
                        <span className="font-black text-orange-600 text-sm">₹{pro.pendingAmount}</span>
                        <span className="text-[9px] text-orange-600 block mt-0.5">{pro.pendingJobsCount} jobs due</span>
                      </div>
                    </div>

                    {/* Routing Details */}
                    <div className="mt-3 text-[11px] text-stone-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Lifetime Jobs:</span>
                        <strong className="text-stone-800">{pro.totalJobs} ({pro.completedJobs} completed)</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Payout Route:</span>
                        <strong className="text-blue-700 font-mono">
                          {pro.phone ? `${pro.phone}@okhdfcbank` : '6267546945@okhdfcbank'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Pro Action Button */}
                  {pro.pendingAmount > 0 ? (
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => handleProConsolidatedPayout(pro)}
                        disabled={isProProcessing}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-950/20 flex items-center justify-center gap-2 cursor-pointer transition transform active:scale-98 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {isProProcessing ? 'Disbursing via Razorpay...' : `Trigger Payout (₹${pro.pendingAmount})`}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedProFilter(pro.id);
                          setActiveTab('pending');
                        }}
                        className="w-full py-1.5 text-[11px] text-stone-500 hover:text-stone-800 font-semibold text-center transition cursor-pointer"
                      >
                        View {pro.pendingJobsCount} individual booking breakdown →
                      </button>
                    </div>
                  ) : (
                    <div className="py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-xs text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>All Payouts Settled (0 Due)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: MULTILEVEL COMMISSION LEDGERS ARCHITECTURE */}
      {activeTab === 'ledgers' && (
        <div className="space-y-4">
          {/* Architecture Visual Explainer Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-purple-950 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-500/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-400/20 inline-block mb-2">
                  HARDINKAAM Centralized Commission Architecture
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Customer Payment → Admin Razorpay → Cryptographic Verification → Multilevel Ledgers
                </h3>
                <p className="text-xs text-indigo-200 mt-1 max-w-2xl leading-relaxed">
                  ग्राहकों का सम्पूर्ण ऑनलाइन भुगतान सीधे <strong>HARDINKAAM Admin के Razorpay खाते</strong> में प्राप्त होता है। सत्यापन उपरांत कमीशन इंजन द्वारा स्वचालित रूप से कम्पनी, फ्रेंचाइजी, पार्टनर एवं सर्विसमैन के अलग-अलग लेजर प्रविष्टियों में आबंटित किया जाता है।
                </p>
              </div>

              <button
                onClick={loadLedgers}
                disabled={loadingLedgers}
                className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer self-start md:self-auto shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLedgers ? 'animate-spin' : ''}`} />
                <span>Refresh Ledgers</span>
              </button>
            </div>

            {/* Multilevel Ledger Breakdown Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-indigo-800/60 text-xs">
              <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20">
                <span className="text-[10px] text-indigo-300 font-semibold block uppercase">Company Platform Share</span>
                <span className="text-lg font-black text-amber-400 mt-0.5 block">₹{ledgerStats.companyTotal}</span>
                <span className="text-[10px] text-indigo-300">15% Standard Retained</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20">
                <span className="text-[10px] text-indigo-300 font-semibold block uppercase">Franchise Commissions</span>
                <span className="text-lg font-black text-purple-300 mt-0.5 block">₹{ledgerStats.franchiseTotal}</span>
                <span className="text-[10px] text-indigo-300">District Territory Earning</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20">
                <span className="text-[10px] text-indigo-300 font-semibold block uppercase">Partner / Referral</span>
                <span className="text-lg font-black text-blue-300 mt-0.5 block">₹{ledgerStats.partnerTotal}</span>
                <span className="text-[10px] text-indigo-300">Brand Promoter Margin</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20">
                <span className="text-[10px] text-indigo-300 font-semibold block uppercase">Serviceman Earnings</span>
                <span className="text-lg font-black text-emerald-400 mt-0.5 block">₹{ledgerStats.servicemanTotal}</span>
                <span className="text-[10px] text-indigo-300">Direct Service Share</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-950/60 border border-indigo-500/20">
                <span className="text-[10px] text-indigo-300 font-semibold block uppercase">Reversals / Refunds</span>
                <span className="text-lg font-black text-rose-400 mt-0.5 block">₹{ledgerStats.reversedTotal}</span>
                <span className="text-[10px] text-rose-300">Reversed Commission</span>
              </div>
            </div>
          </div>

          {/* Ledger Table Container */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-stone-900">
                  Multilevel Commission Ledgers &amp; Internal Audit
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {filteredLedgers.length} entries
                </span>
              </div>

              {/* Role Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'All Roles' },
                  { id: 'company', label: 'Company Share' },
                  { id: 'franchise', label: 'Franchise' },
                  { id: 'partner', label: 'Partner / Referral' },
                  { id: 'service_man', label: 'Service Pro' },
                ].map((rf) => (
                  <button
                    key={rf.id}
                    onClick={() => setSelectedLedgerRole(rf.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                      selectedLedgerRole === rf.id
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingLedgers ? (
              <div className="p-12 text-center text-stone-400">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-indigo-500" />
                <p className="text-xs font-semibold text-stone-600">Loading platform commission ledgers...</p>
              </div>
            ) : filteredLedgers.length === 0 ? (
              <div className="p-12 text-center text-stone-400">
                <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-40 text-stone-400" />
                <p className="text-sm font-semibold text-stone-700">No ledger entries found</p>
                <p className="text-xs text-stone-400 mt-1">
                  Commission ledger entries are automatically generated when customers pay via Admin Razorpay.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-600">
                  <thead className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-4">Ledger Ref / Date</th>
                      <th className="py-3 px-4">Attributed Entity</th>
                      <th className="py-3 px-4">Booking &amp; Payment Link</th>
                      <th className="py-3 px-4">Commission Rule</th>
                      <th className="py-3 px-4 text-right">Credit / Debit</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {filteredLedgers.map((ledger) => {
                      const isCredit = ledger.type === 'credit';
                      const isReversed = ledger.status === 'reversed' || ledger.isReversed;

                      return (
                        <tr
                          key={ledger.id}
                          className={`transition-colors ${
                            isReversed
                              ? 'bg-rose-50/20 hover:bg-rose-50/40 text-stone-400'
                              : 'hover:bg-stone-50/80'
                          }`}
                        >
                          {/* Ledger ID & Date */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-stone-900 block text-[11px]">
                              {ledger.id}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(ledger.createdAt).toLocaleString()}
                            </span>
                          </td>

                          {/* Attributed Entity */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  ledger.ledgerOwnerRole === 'company'
                                    ? 'bg-amber-100 text-amber-800'
                                    : ledger.ledgerOwnerRole === 'franchise'
                                    ? 'bg-purple-100 text-purple-800'
                                    : ledger.ledgerOwnerRole === 'partner' || ledger.ledgerOwnerRole === 'brand_promoter'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {ledger.ledgerOwnerRole === 'company'
                                  ? 'Company Share'
                                  : ledger.ledgerOwnerRole === 'franchise'
                                  ? 'Franchise Partner'
                                  : ledger.ledgerOwnerRole === 'partner' || ledger.ledgerOwnerRole === 'brand_promoter'
                                  ? 'Brand Partner'
                                  : 'Service Pro'}
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-stone-800 block mt-1">
                              {ledger.ledgerOwnerName || ledger.ledgerOwnerId}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              UID: {ledger.ledgerOwnerId}
                            </span>
                          </td>

                          {/* Booking & Payment Link */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-stone-800 block">
                              Booking: #{ledger.bookingId}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono block">
                              Payment: {ledger.paymentId}
                            </span>
                            {ledger.razorpayOrderId && (
                              <span className="text-[9px] text-stone-400 font-mono block">
                                Order: {ledger.razorpayOrderId}
                              </span>
                            )}
                          </td>

                          {/* Commission Rule */}
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-800 block text-[11px]">
                              {ledger.ruleReference}
                            </span>
                            <span className="text-[10px] text-stone-500">
                              Gross: ₹{ledger.grossBookingAmount} ({ledger.ratePercent}%)
                            </span>
                          </td>

                          {/* Credit / Debit Amount */}
                          <td className="py-3 px-4 text-right">
                            <span
                              className={`text-sm font-black ${
                                isReversed
                                  ? 'text-rose-500 line-through'
                                  : isCredit
                                  ? 'text-emerald-700'
                                  : 'text-rose-700'
                              }`}
                            >
                              {isCredit ? '+' : '-'}₹{ledger.amount}
                            </span>
                            <span className="text-[10px] text-stone-400 block uppercase">
                              {ledger.type}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {isReversed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Reversed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Cleared
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-4 text-right">
                            {!isReversed && (
                              <button
                                onClick={() =>
                                  setRefundModalItem({
                                    paymentId: ledger.paymentId,
                                    amount: ledger.grossBookingAmount,
                                    bookingId: ledger.bookingId,
                                  })
                                }
                                className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                              >
                                Refund / Reverse
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: SETTLEMENTS & PENDING PAYOUTS MASTER TABLE */}
      {activeTab !== 'pros' && activeTab !== 'ledgers' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-stone-900">
                {activeTab === 'pending'
                  ? 'Pending Payouts Awaiting Disbursal'
                  : activeTab === 'settled'
                  ? 'Settled Payouts & Audit Records'
                  : 'Master Payout Ledger'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  activeTab === 'pending'
                    ? 'bg-orange-100 text-orange-800 border border-orange-200'
                    : activeTab === 'settled'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {filteredRecords.length} records
              </span>
            </div>

            {selectedProFilter !== 'all' && (
              <button
                onClick={() => setSelectedProFilter('all')}
                className="text-xs font-bold text-stone-500 hover:text-stone-900 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Clear Professional Filter
              </button>
            )}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-stone-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-40 text-stone-400" />
              <p className="text-sm font-semibold text-stone-700">No payout records found in this view</p>
              <p className="text-xs text-stone-400 mt-1">
                {activeTab === 'pending'
                  ? 'All professional payouts have been successfully settled.'
                  : 'Completed payouts will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 text-[11px] font-bold text-stone-500 uppercase tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3.5 px-4">Booking &amp; Service</th>
                    <th className="py-3.5 px-4">Customer &amp; Pay-In</th>
                    <th className="py-3.5 px-4">Verified Professional</th>
                    <th className="py-3.5 px-4 text-right">Gross Amount</th>
                    <th className="py-3.5 px-4 text-right">Company Fee ({commissionRate}%)</th>
                    <th className="py-3.5 px-4 text-right">TDS Tax ({taxRate}%)</th>
                    <th className="py-3.5 px-4 text-right">Net Payout (80%)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filteredRecords.map((item) => {
                    const isPaid = item.effectivePayoutStatus === 'paid';
                    const isProcessing = processingId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isPaid
                            ? 'bg-emerald-50/20 hover:bg-emerald-50/50 border-l-4 border-l-emerald-500'
                            : 'bg-amber-50/30 hover:bg-amber-50/70 border-l-4 border-l-amber-500'
                        }`}
                      >
                        {/* Booking Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 block font-mono">#{item.id}</span>
                            {!isPaid && (
                              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Ready to Disburse" />
                            )}
                          </div>
                          <span className="text-[11px] text-stone-700 font-semibold block mt-0.5">{item.serviceName}</span>
                          <span className="text-[10px] text-stone-400">{item.scheduledDate}</span>
                        </td>

                        {/* Customer & Razorpay Collection */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-stone-800 block">{item.customerName}</span>
                          <span className="text-[10px] text-stone-500 block">{item.customerPhone}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded-md mt-1 border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Pay-In Received
                          </span>
                        </td>

                        {/* Serviceman Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 block">{item.serviceManName || 'Verified Professional'}</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </div>
                          <span className="text-[10px] text-stone-500 block">{item.serviceManPhone || '+91 62675 46945'}</span>
                          <span className="text-[10px] text-blue-700 block mt-0.5 font-mono">
                            UPI: {item.serviceManPhone ? `${item.serviceManPhone}@okhdfcbank` : '6267546945@okhdfcbank'}
                          </span>
                        </td>

                        {/* Financial Split Calculations */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-stone-900">₹{item.calculatedGross}</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                            -₹{item.calculatedCommission}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                            -₹{item.calculatedTax}
                          </span>
                        </td>

                        {/* Net Disbursed Payout */}
                        <td className="py-3.5 px-4 text-right">
                          <span className={`text-sm font-black ${isPaid ? 'text-emerald-700' : 'text-orange-600'}`}>
                            ₹{item.calculatedNet}
                          </span>
                        </td>

                        {/* Visual Status Indicator */}
                        <td className="py-3.5 px-4 text-center">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-950 border border-orange-300 animate-in fade-in">
                              <Clock className="w-3 h-3 text-orange-600" /> Ready to Disburse
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-3.5 px-4 text-right">
                          {isPaid ? (
                            <div className="flex items-center justify-end gap-2">
                              <div className="text-[10px] text-right">
                                <span className="font-mono block text-emerald-700 font-bold">
                                  {item.payoutRazorpayId || (item as any).payoutReference || 'Transfer Confirmed'}
                                </span>
                                <span className="text-stone-400">
                                  {item.payoutPaidAt ? new Date(item.payoutPaidAt).toLocaleDateString() : 'Settled'}
                                </span>
                              </div>

                              <button
                                onClick={() => setViewReceiptItem(item)}
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                title="View Settlement Voucher"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setTriggerPayoutModalItem(item)}
                              disabled={isProcessing}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-950/20 transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 hover:scale-102"
                            >
                              <Send className="w-3 h-3" />
                              <span>Trigger Payout (₹{item.calculatedNet})</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TRIGGER PAYOUT CONFIRMATION MODAL */}
      {triggerPayoutModalItem && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-orange-500/10 text-orange-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Trigger Professional Payout</h3>
                  <p className="text-xs text-stone-400 font-mono">Booking #{triggerPayoutModalItem.id}</p>
                </div>
              </div>

              <button
                onClick={() => setTriggerPayoutModalItem(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recipient Professional Card */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    Recipient Professional
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-sm text-stone-900">{triggerPayoutModalItem.serviceManName}</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-xs text-stone-500">{triggerPayoutModalItem.serviceManPhone || '+91 62675 46945'}</span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Transfer Route</span>
                  <span className="text-xs font-bold text-blue-700 font-mono">
                    {triggerPayoutModalItem.serviceManPhone
                      ? `${triggerPayoutModalItem.serviceManPhone}@okhdfcbank`
                      : '6267546945@okhdfcbank'}
                  </span>
                </div>
              </div>
            </div>

            {/* Split Breakdown Summary Card */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Customer Booking Gross Amount:</span>
                <span className="font-bold text-stone-900">₹{triggerPayoutModalItem.calculatedGross}</span>
              </div>
              <div className="flex justify-between text-amber-800">
                <span>Company Service Fee (-{commissionRate}%):</span>
                <span className="font-bold">-₹{triggerPayoutModalItem.calculatedCommission}</span>
              </div>
              <div className="flex justify-between text-blue-800">
                <span>TDS Tax Deduction (-{taxRate}%):</span>
                <span className="font-bold">-₹{triggerPayoutModalItem.calculatedTax}</span>
              </div>
              <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-sm font-black text-emerald-800">
                <span>Net Payable Disbursal:</span>
                <span className="text-xl text-emerald-700">₹{triggerPayoutModalItem.calculatedNet}</span>
              </div>
            </div>

            {/* Payout Gateway Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Disbursement Method</label>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('razorpay_instant')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    payoutMethod === 'razorpay_instant'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Razorpay Payouts
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('upi_instant')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    payoutMethod === 'upi_instant'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Direct UPI
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank_neft')}
                  className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                    payoutMethod === 'bank_neft'
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Bank NEFT / IMPS
                </button>
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700">Disbursement Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Verified on-demand task completion settlement"
                value={customPayoutNotes}
                onChange={(e) => setCustomPayoutNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500 bg-stone-50"
              />
            </div>

            {/* Simulated Notification Preview */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-stone-800">Automated Notification:</span>
                <p className="text-[10px] text-stone-500 mt-0.5">
                  An instant in-app alert &amp; WhatsApp message will be dispatched to {triggerPayoutModalItem.serviceManPhone || '+91 62675 46945'} upon confirmation.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTriggerPayoutModalItem(null)}
                className="px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-100 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => executePayout(triggerPayoutModalItem)}
                disabled={processingId === triggerPayoutModalItem.id}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-950/20 flex items-center gap-2 cursor-pointer transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {processingId === triggerPayoutModalItem.id
                    ? 'Disbursing...'
                    : `Confirm & Trigger ₹${triggerPayoutModalItem.calculatedNet}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTLEMENT RECEIPT / VOUCHER MODAL */}
      {viewReceiptItem && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Settlement Voucher</h3>
                  <p className="text-xs text-stone-400">HARDINKAAM Verified Payout</p>
                </div>
              </div>

              <button
                onClick={() => setViewReceiptItem(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:bg-stone-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Voucher Body */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Payout Reference</span>
                  <div className="font-mono font-bold text-sm text-emerald-800">
                    {viewReceiptItem.payoutRazorpayId || viewReceiptItem.payoutReference || 'Transfer Confirmed'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Date &amp; Time</span>
                  <div className="text-xs text-stone-700 font-semibold">
                    {viewReceiptItem.payoutPaidAt ? new Date(viewReceiptItem.payoutPaidAt).toLocaleString() : 'Settled'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-stone-600">
                <div className="flex justify-between">
                  <span>Booking ID:</span>
                  <strong className="text-stone-900 font-mono">#{viewReceiptItem.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Service Rendered:</span>
                  <strong className="text-stone-900">{viewReceiptItem.serviceName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Recipient Professional:</span>
                  <strong className="text-stone-900">{viewReceiptItem.serviceManName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Phone / UPI:</span>
                  <strong className="text-blue-700 font-mono">
                    {viewReceiptItem.serviceManPhone ? `${viewReceiptItem.serviceManPhone}@okhdfcbank` : '6267546945@okhdfcbank'}
                  </strong>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Customer Gross Pay-In:</span>
                  <span>₹{viewReceiptItem.calculatedGross}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Company Fee (-{commissionRate}%):</span>
                  <span>-₹{viewReceiptItem.calculatedCommission}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>TDS Withholding (-{taxRate}%):</span>
                  <span>-₹{viewReceiptItem.calculatedTax}</span>
                </div>
                <div className="flex justify-between text-base font-black text-emerald-800 pt-2 border-t border-stone-200">
                  <span>Net Disbursed:</span>
                  <span className="text-lg">₹{viewReceiptItem.calculatedNet}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Verified by HARDINKAAM Settlements Engine via Razorpay Instant Transfer</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>

              <button
                type="button"
                onClick={() => setViewReceiptItem(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

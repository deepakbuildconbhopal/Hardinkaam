import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Building,
  Smartphone,
  Clock,
  Receipt,
  BadgePercent,
  Sparkles,
  CreditCard,
  Save,
  Check,
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Booking } from '../../types';

export const ProWallet: React.FC = () => {
  const { userProfile, updateUserProfileData } = useAuth();
  const { addToast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Bank & UPI Settlement settings
  const [upiId, setUpiId] = useState(userProfile?.payoutUpiId || 'rajesh.sharma@okhdfcbank');
  const [accountNo, setAccountNo] = useState(userProfile?.bankAccountNumber || '918273645012');
  const [ifsc, setIfsc] = useState(userProfile?.bankIfsc || 'HDFC0001234');
  const [holderName, setHolderName] = useState(userProfile?.bankAccountHolderName || userProfile?.name || 'Rajesh Sharma');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch technician bookings
  useEffect(() => {
    const proId = userProfile?.id || 'pro_rajesh_electrician';
    const proName = userProfile?.name || 'Rajesh Sharma';

    const unsub = onSnapshot(
      collection(db, 'bookings'),
      (snap) => {
        const list: Booking[] = [];
        snap.forEach((d) => {
          const data = d.data() as Booking;
          if (data.serviceManId === proId || data.serviceManName === proName || !data.serviceManId) {
            list.push({ id: d.id, ...data });
          }
        });
        setBookings(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Pro wallet bookings error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userProfile?.id, userProfile?.name]);

  // Financial Calculations
  const stats = useMemo(() => {
    let totalGross = 0;
    let totalCompanyDeductions = 0;
    let totalTaxDeductions = 0;
    let settledEarnings = 0;
    let pendingPayouts = 0;

    bookings.forEach((b) => {
      const gross = b.amount || 0;
      const compFee = b.companyCommission !== undefined ? b.companyCommission : Math.round(gross * 0.15);
      const taxFee = b.taxDeduction !== undefined ? b.taxDeduction : Math.round(gross * 0.05);
      const net = b.servicemanPayoutAmount !== undefined ? b.servicemanPayoutAmount : Math.max(0, gross - compFee - taxFee);

      totalGross += gross;
      totalCompanyDeductions += compFee;
      totalTaxDeductions += taxFee;

      if (b.payoutStatus === 'paid') {
        settledEarnings += net;
      } else {
        pendingPayouts += net;
      }
    });

    return {
      totalGross,
      totalCompanyDeductions,
      totalTaxDeductions,
      settledEarnings,
      pendingPayouts,
    };
  }, [bookings]);

  // Save payout account info
  const handleSaveAccountDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      await updateUserProfileData({
        payoutUpiId: upiId.trim(),
        bankAccountNumber: accountNo.trim(),
        bankIfsc: ifsc.trim().toUpperCase(),
        bankAccountHolderName: holderName.trim(),
      });
      setSavedSuccess(true);
      addToast({
        title: 'खाता विवरण सुरक्षित / Account Details Saved',
        message: 'Admin will disburse Razorpay payouts directly to this verified UPI / Account.',
        type: 'success',
      });
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      addToast({
        title: 'Error',
        message: err.message || 'Could not save bank details.',
        type: 'error',
      });
    } finally {
      setIsSavingDetails(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold mb-2">
          <Receipt className="w-3.5 h-3.5" /> सर्विसमैन कमाई व Razorpay भुगतान लेजर
        </div>
        <h1 className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
          Technician Earnings &amp; Settlements
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-2xl leading-relaxed">
          ग्राहक द्वारा किया गया भुगतान सीधे कंपनी के Razorpay खाते में जमा होता है। कंपनी अपना <strong>15% सर्विस चार्ज</strong> और <strong>5% टैक्स (TDS)</strong> काटकर <strong>80% शुद्ध राशि</strong> सीधे आपके बैंक/UPI खाते में ट्रांसफर करती है।
        </p>
      </div>

      {/* Main Balance Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-blue-950 to-stone-900 p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider block">
            कुल प्राप्त भुगतान (Settled via Razorpay)
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-5xl font-black text-white">₹{stats.settledEarnings}</span>
            <span className="text-xs text-stone-400">INR</span>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-blue-200">
            <Clock className="w-4 h-4 text-orange-400" />
            <span>लंबित कंपनी पेआउट्स: <strong>₹{stats.pendingPayouts}</strong></span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 max-w-xs text-xs space-y-2">
          <div className="flex justify-between text-stone-300">
            <span>ग्राहक से ग्रॉस बिलिंग:</span>
            <span className="font-bold text-white">₹{stats.totalGross}</span>
          </div>
          <div className="flex justify-between text-amber-300">
            <span>कंपनी सर्विस चार्ज (15%):</span>
            <span className="font-bold">-₹{stats.totalCompanyDeductions}</span>
          </div>
          <div className="flex justify-between text-blue-300">
            <span>टैक्स / TDS (5%):</span>
            <span className="font-bold">-₹{stats.totalTaxDeductions}</span>
          </div>
          <div className="pt-2 border-t border-white/20 flex justify-between font-bold text-emerald-400 text-sm">
            <span>आपका शुद्ध हिस्सा (80%):</span>
            <span>₹{stats.settledEarnings + stats.pendingPayouts}</span>
          </div>
        </div>
      </div>

      {/* Account / UPI Setup for Admin Settlements */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <span>पेआउट ट्रांसफर खाता विवरण / Payout Receiving Account</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              एडमिन द्वारा Razorpay Payouts रिलीज करते ही राशि सीधे इस खाते में पहुंचेगी।
            </p>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Razorpay Ready
          </span>
        </div>

        <form onSubmit={handleSaveAccountDetails} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">UPI ID (Google Pay / PhonePe / Paytm)</label>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. mobile@okhdfcbank"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">खाता धारक का नाम / Account Holder Name</label>
            <input
              type="text"
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">बैंक खाता संख्या / Bank Account Number</label>
            <div className="relative">
              <Building className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                placeholder="e.g. 918273645012"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">IFSC Code</label>
            <input
              type="text"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              placeholder="e.g. HDFC0001234"
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSavingDetails}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-colors"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{isSavingDetails ? 'Saving...' : savedSuccess ? 'Saved Successfully!' : 'Save Receiving Details'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Payout History & Live Jobs */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900 mb-3 flex items-center justify-between">
          <span>सर्विस काम व सेटलमेंट विवरण / Job Settlements</span>
          <span className="text-xs text-stone-400 font-normal">{bookings.length} Total Bookings</span>
        </h2>

        {bookings.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs">
            अभी तक कोई सर्विस बुकिंग रिकॉर्ड दर्ज नहीं है।
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {bookings.map((b) => {
              const gross = b.amount || 0;
              const compFee = b.companyCommission !== undefined ? b.companyCommission : Math.round(gross * 0.15);
              const taxFee = b.taxDeduction !== undefined ? b.taxDeduction : Math.round(gross * 0.05);
              const net = b.servicemanPayoutAmount !== undefined ? b.servicemanPayoutAmount : Math.max(0, gross - compFee - taxFee);
              const isPaid = b.payoutStatus === 'paid';

              return (
                <div key={b.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">#{b.id} - {b.serviceName}</span>
                      {isPaid ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Razorpay Settled
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 inline-flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Pending Admin Transfer
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 mt-1">
                      <span>ग्राहक: {b.customerName}</span>
                      <span>•</span>
                      <span>तारीख: {b.scheduledDate}</span>
                      <span>•</span>
                      <span className="text-stone-400 font-mono">
                        {b.payoutRazorpayId || `Ref: UPI/RZP_${b.id}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:self-center">
                    <div className="text-sm font-black text-stone-900">
                      ₹{net}{' '}
                      <span className="text-[10px] font-normal text-stone-400">
                        (Gross ₹{gross} - 15% - 5%)
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 block">
                      {isPaid ? 'खाते में क्रेडिटेड' : 'कंपनी खाते में सुरक्षित'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

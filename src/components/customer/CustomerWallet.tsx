import React, { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, ShieldCheck, Tag, Sparkles, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import { processRazorpayPayment } from '../../services/razorpayService';

interface CustomerWalletItem {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  timestamp: string;
}

export const CustomerWallet: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [balance, setBalance] = useState<number>(850);
  const [transactions, setTransactions] = useState<CustomerWalletItem[]>([
    {
      id: 'tx_1',
      amount: 500,
      type: 'credit',
      description: 'Wallet Recharge via UPI',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: 'tx_2',
      amount: 150,
      type: 'credit',
      description: 'Welcome Bonus Cash',
      timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
  ]);
  const [addAmount, setAddAmount] = useState<string>('500');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const fetchWallet = async () => {
      try {
        const walletDoc = await getDoc(doc(db, 'wallets', currentUser.uid));
        if (walletDoc.exists()) {
          const data = walletDoc.data();
          if (data.balance !== undefined) setBalance(data.balance);
          if (data.transactions) setTransactions(data.transactions);
        }
      } catch (err) {
        console.warn('Wallet fetch notice:', err);
      }
    };
    fetchWallet();
  }, [currentUser]);

  const handleAddFunds = async () => {
    const num = parseFloat(addAmount);
    if (isNaN(num) || num < 1) {
      setPaymentError('कृपया न्यूनतम ₹1 (100 पैसे) की राशि दर्ज करें।');
      return;
    }

    setPaymentError(null);
    setPaymentSuccessMsg(null);
    setIsAdding(true);

    try {
      // Initiate Razorpay Standard Checkout
      await processRazorpayPayment({
        amount: num,
        currency: 'INR',
        name: 'HARDINKAAM Wallet Recharge',
        description: `Add ₹${num} to HARDINKAAM Wallet`,
        receipt: `wal_${Date.now()}_${currentUser?.uid?.substring(0, 5) || 'cust'}`,
        prefill: {
          name: userProfile?.fullName || currentUser?.displayName || 'Customer',
          email: currentUser?.email || '',
          contact: userProfile?.phoneNumber || '',
        },
        notes: {
          type: 'wallet_recharge',
          userId: currentUser?.uid || 'guest',
        },
        onSuccess: async (res) => {
          const newBal = balance + num;
          const newTx: CustomerWalletItem = {
            id: 'tx_' + res.payment_id,
            amount: num,
            type: 'credit',
            description: `Razorpay Online Recharge (${res.payment_id})`,
            timestamp: new Date().toISOString(),
          };

          const updatedTxList = [newTx, ...transactions];

          try {
            if (currentUser) {
              await setDoc(
                doc(db, 'wallets', currentUser.uid),
                {
                  balance: newBal,
                  transactions: updatedTxList,
                  lastPaymentId: res.payment_id,
                  lastOrderId: res.order_id,
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            }
            setBalance(newBal);
            setTransactions(updatedTxList);
            setShowAddModal(false);
            setPaymentSuccessMsg(`₹${num} सफलतापूर्वक आपके वॉलेट में जोड़ दिए गए हैं! (Ref: ${res.payment_id})`);
            setTimeout(() => setPaymentSuccessMsg(null), 7000);
          } catch (dbErr) {
            console.error('Wallet update error:', dbErr);
            setBalance(newBal);
            setTransactions(updatedTxList);
            setShowAddModal(false);
          } finally {
            setIsAdding(false);
          }
        },
        onFailure: (err) => {
          console.error('Razorpay Payment Failed:', err);
          setPaymentError(err.description || err.reason || 'Payment failed or declined by bank. Please retry.');
          setIsAdding(false);
        },
        onDismiss: () => {
          setIsAdding(false);
        },
      });
    } catch (err: any) {
      console.error('Razorpay checkout initiation error:', err);
      setPaymentError(err.message || 'Could not initiate Razorpay checkout.');
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          HARDINKAAM Wallet
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          One-click instant payment, guaranteed refunds &amp; promotional cashbacks
        </p>
      </div>

      {/* Success / Error alerts */}
      {paymentSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{paymentSuccessMsg}</span>
        </div>
      )}

      {paymentError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{paymentError}</span>
          </div>
          <button
            onClick={() => setPaymentError(null)}
            className="text-stone-400 hover:text-stone-600 text-xs px-2 py-1"
          >
            बंद करें
          </button>
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-orange-950 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Wallet className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-orange-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Instant 1-Click Checkout
            </div>
            <span className="text-xs text-stone-300 block font-medium">Available Balance</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl sm:text-5xl font-black text-white">₹{balance}</span>
              <span className="text-xs text-stone-400 font-semibold">INR</span>
            </div>
            <p className="text-xs text-stone-400 mt-2">
              Linked to {currentUser?.email || userProfile?.phone || 'your account'}
            </p>
          </div>

          <div>
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer transition-transform hover:scale-102"
            >
              <Plus className="w-4 h-4" /> Add Money to Wallet
            </button>
          </div>
        </div>
      </div>

      {/* Promotions & Offers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-amber-900">Flat ₹100 Cashback on ₹1000+ Recharge</h3>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Use code <strong className="font-mono font-bold">HKRECHARGE</strong> during payment checkout.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-emerald-900">100% Safe &amp; Direct Refunds</h3>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Any booking cancellations are immediately credited back to your wallet with zero deduction.
            </p>
          </div>
        </div>
      </div>

      {/* Google AdSense Wallet Sponsor Unit */}
      <AdSenseBanner
        slot="8291048201"
        format="responsive"
        category="general"
        label="प्रायोजित ऑफर • GOOGLE ADSENSE PARTNER"
        className="my-3"
      />

      {/* Transaction History */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900 mb-4">Recent Transactions</h2>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">No transactions recorded yet.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {tx.type === 'credit' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">{tx.description}</h4>
                    <span className="text-[10px] text-stone-400">
                      {new Date(tx.timestamp).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                <div
                  className={`text-xs font-black ${
                    tx.type === 'credit' ? 'text-emerald-600' : 'text-stone-900'
                  }`}
                >
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Money Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-stone-900 mb-1">Add Money to Wallet</h3>
            <p className="text-xs text-stone-500 mb-4">Choose recharge amount via UPI or Cards</p>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {['200', '500', '1000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddAmount(amt)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      addAmount === amt
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Custom Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-stone-400 text-xs font-bold">₹</span>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex items-center justify-between text-[11px] text-stone-600">
                <span className="flex items-center gap-1.5 font-bold text-stone-800">
                  <CreditCard className="w-3.5 h-3.5 text-orange-600" /> Razorpay Standard
                </span>
                <span className="font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-black">
                  UPI • Cards • NetBanking
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="wallet-razorpay-pay-btn"
                  disabled={isAdding}
                  onClick={handleAddFunds}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-orange-950/20 disabled:opacity-60 flex items-center gap-2"
                >
                  {isAdding ? (
                    <span>Opening Razorpay...</span>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay ₹{addAmount} with Razorpay</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

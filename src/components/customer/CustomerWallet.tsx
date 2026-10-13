import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Tag,
  Sparkles,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Award,
  Share2,
  Copy,
  Check,
  Gift,
  Trophy,
  ArrowRight,
  History,
  RotateCcw,
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import {
  getCustomerRewardWallet,
  getRewardSettings,
  CustomerRewardWallet,
  RewardSettings,
  getCustomerReferrals,
  CustomerReferralRecord,
} from '../../services/rewardService';

interface CustomerWalletItem {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  timestamp: string;
}

export const CustomerWallet: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CustomerWalletItem[]>([]);
  const [referralsList, setReferralsList] = useState<CustomerReferralRecord[]>([]);

  // Reward Wallet state
  const [rewardWallet, setRewardWallet] = useState<CustomerRewardWallet | null>(null);
  const [rewardSettings, setRewardSettings] = useState<RewardSettings | null>(null);

  const [addAmount, setAddAmount] = useState<string>('500');
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const userId = currentUser?.uid || userProfile?.id || 'guest_user';
  const referralCode = 'HDK-' + (userId.substring(0, 6).toUpperCase());
  const referralLink = `https://hardinkaam.in/signup?ref=${referralCode}`;

  useEffect(() => {
    if (!auth.currentUser || !currentUser) return;
    const fetchWallets = async () => {
      try {
        const walletDoc = await getDoc(doc(db, 'wallets', currentUser.uid));
        if (walletDoc.exists()) {
          const data = walletDoc.data();
          if (data.balance !== undefined) setBalance(data.balance);
          if (data.transactions) setTransactions(data.transactions);
        }

        const rw = await getCustomerRewardWallet(currentUser.uid);
        setRewardWallet(rw);

        const rs = await getRewardSettings();
        setRewardSettings(rs);

        const refs = await getCustomerReferrals(currentUser.uid);
        setReferralsList(refs);
      } catch (err) {
        console.warn('Wallet fetch notice:', err);
      }
    };
    fetchWallets();

    if (!auth.currentUser || !currentUser?.uid || currentUser.uid === 'admin_deepak_root') return;

    // Real-time listener for reward wallet updates
    const walletRef = doc(db, 'reward_wallets', currentUser.uid);
    const unsub = onSnapshot(
      walletRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as any;
          const ptsBal = data.pointsBalance !== undefined ? Number(data.pointsBalance) : Number(data.availablePoints || 0);
          const conversion = 10;
          setRewardWallet({
            customerId: currentUser.uid,
            pointsBalance: Math.max(0, ptsBal),
            availablePoints: Math.max(0, ptsBal),
            reservedPoints: Math.max(0, Number(data.reservedPoints || 0)),
            totalEarned: Number(data.totalEarned || 0),
            totalRedeemed: Number(data.totalRedeemed || 0),
            totalReversed: Number(data.totalReversed || 0),
            totalExpired: Number(data.totalExpired || 0),
            estimatedRupeeValue: Math.round((ptsBal / conversion) * 10) / 10,
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            updatedAt: data.updatedAt || new Date().toISOString(),
          });
        }
      },
      (err) => {
        console.warn('Customer reward wallet listener notice:', err.message);
      }
    );

    return () => unsub();
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

    setPaymentError('ऑनलाइन वॉलेट रिचार्ज (Razorpay) वर्तमान में बंद है। सहायता के लिए सपोर्ट से संपर्क करें।');
    setIsAdding(false);
  };

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = () => {
    const shareText = encodeURIComponent(
      `🎉 HARDINKAAM होम-सर्विसेज ऐप पर मेरा रेफरल कोड ${referralCode} उपयोग करें और अपनी पहली बुकिंग पर विशेष छूट पाएं!\nलिंक: ${referralLink}`
    );
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
  };

  const isHindi = language === 'hi';

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          {isHindi ? 'HARDINKAAM वॉलेट व रिवॉर्ड पॉइंट्स' : 'HARDINKAAM Wallet & Reward Points'}
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          {isHindi
            ? 'कस्टमर रिवॉर्ड वॉलेट, रेफर एंड अर्न, और एडमिन रेज़रपे सुरक्षित भुगतान प्रणाली'
            : 'Customer Reward Wallet, Refer & Earn, and Admin Razorpay Payment System'}
        </p>
      </div>

      {/* Official Payment Policy Notice */}
      <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <span className="font-bold">{isHindi ? 'आधिकारिक भुगतान नीति: ' : 'Official Payment Policy: '}</span>
          <span>
            {isHindi
              ? 'सभी ग्राहक सेवा बुकिंग भुगतान व रिचार्ज केवल HARDINKAAM एडमिन के Razorpay गेटवे पर जाते हैं। रिवॉर्ड पॉइंट्स लॉयल्टी क्रेडिट हैं (1,000 pts = ₹100), डायरेक्ट कैश नहीं।'
              : "All customer service booking payments and recharges go exclusively to HARDINKAAM Admin's Razorpay Gateway. Reward points represent loyalty credits (1,000 pts = ₹100), not direct cash."}
          </span>
        </div>
      </div>

      {/* Success / Error alerts */}
      {paymentSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{paymentSuccessMsg}</span>
        </div>
      )}

      {paymentError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{paymentError}</span>
          </div>
          <button
            onClick={() => setPaymentError(null)}
            className="text-stone-400 hover:text-stone-600 text-xs px-2 py-1 cursor-pointer"
          >
            {isHindi ? 'बंद करें' : 'Close'}
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
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Admin Razorpay Instant Checkout
            </div>
            <span className="text-xs text-stone-300 block font-medium">Available Cash Balance</span>
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

      {/* ================= CUSTOMER REWARD POINTS WALLET ================= */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-stone-900">
                {isHindi ? 'कस्टमर रिवॉर्ड पॉइंट्स वॉलेट' : 'Customer Reward Points Wallet'}
              </h2>
              <p className="text-xs text-stone-500">
                {isHindi
                  ? 'कन्वर्ज़न दर: 1,000 Points = ₹100 सर्विस पर छूट'
                  : 'Conversion Rule: 1,000 Points = ₹100 Discount on Services'}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right bg-amber-50/80 sm:bg-transparent p-3 sm:p-0 rounded-2xl border sm:border-0 border-amber-200">
            <span className="text-xs text-stone-400 block font-medium">{t('pointsUsedDiscount', 'Estimated Value')}</span>
            <span className="text-lg font-black text-amber-600">
              ₹{rewardWallet?.estimatedRupeeValue || Math.round((((rewardWallet?.pointsBalance ?? rewardWallet?.availablePoints) || 250) / 10) * 10) / 10}
            </span>
          </div>
        </div>

        {/* 4 Points Balance Breakdown Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-900 uppercase">
              {t('availableRewards', 'Available Points')}
            </span>
            <p className="text-2xl font-black text-amber-700 mt-1">
              {(rewardWallet?.pointsBalance ?? rewardWallet?.availablePoints ?? 250).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <span className="text-[11px] font-bold text-stone-600 uppercase">Total Earned</span>
            <p className="text-2xl font-black text-stone-900 mt-1">
              {(rewardWallet?.totalEarned || 250).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <span className="text-[11px] font-bold text-stone-600 uppercase">Total Redeemed</span>
            <p className="text-2xl font-black text-stone-900 mt-1">
              {(rewardWallet?.totalRedeemed || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
            <span className="text-[11px] font-bold text-stone-600 uppercase">Reserved Points</span>
            <p className="text-2xl font-black text-purple-700 mt-1">
              {(rewardWallet?.reservedPoints || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* Use Rewards Explanation Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Gift className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-stone-900 uppercase">
                {t('useRewards', 'Use Rewards on Booking')}
              </h4>
              <p className="text-[11px] text-stone-600">
                {isHindi
                  ? 'सर्विस बुक करते समय चेकआउट स्टेप पर "रिवॉर्ड पॉइंट्स का उपयोग करें" चुनें और तुरंत छूट पाएं।'
                  : 'Select "Use Reward Points" during booking checkout to redeem points for an instant service discount.'}
              </p>
            </div>
          </div>
        </div>

        {/* Reward Transaction History */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-600" />
              <span>{t('rewardHistory', 'Reward Points Transaction History')}</span>
            </h3>
            <span className="text-[10px] text-stone-400 font-semibold">
              {(rewardWallet?.transactions || []).length} Records
            </span>
          </div>

          <div className="space-y-2">
            {(rewardWallet?.transactions || []).length === 0 ? (
              <div className="py-6 text-center text-stone-400 text-xs">
                {isHindi ? 'कोई रिवॉर्ड लेनदेन दर्ज नहीं है।' : 'No reward transactions recorded yet.'}
              </div>
            ) : (
              (rewardWallet?.transactions || []).map((t) => {
                const isDebit = t.type === 'REDEMPTION' || (t.points && t.points < 0);
                return (
                  <div
                    key={t.id || t.transactionId}
                    className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100/80 border border-stone-200 flex items-center justify-between text-xs transition-colors animate-in fade-in slide-in-from-bottom-2 duration-500"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{t.description || `${t.type} Points`}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            t.type === 'BOOKING'
                              ? 'bg-amber-100 text-amber-800'
                              : t.type === 'REFERRAL'
                              ? 'bg-orange-100 text-orange-800'
                              : t.type === 'REDEMPTION'
                              ? 'bg-rose-100 text-rose-800'
                              : t.type === 'REVERSAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {t.type}
                        </span>
                        {t.status && (
                          <span className="text-[9px] font-bold text-stone-500 uppercase">
                            ({t.status})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono">
                        <span>{t.transactionId || t.referenceId}</span>
                        {t.createdAt && (
                          <span>• {new Date(t.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-3">
                      <span
                        className={`font-black text-sm block ${
                          isDebit ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      >
                        {isDebit ? '-' : '+'}{t.points ?? t.amountPoints ?? 0} Pts
                      </span>
                      <span className="text-[10px] text-stone-400">
                        ₹{t.rupeeValue ?? t.pointValue ?? 0} value
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ================= REFER & EARN SECTION ================= */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/25 flex items-center justify-center font-bold text-white shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">
              {t('referAndEarn', 'Refer Friends & Earn Reward Points')}
            </h2>
            <p className="text-xs text-amber-100">
              {t(
                'shareReferralPrompt',
                'Earn +500 Reward Points when your friend completes their first verified booking!'
              )}
            </p>
          </div>
        </div>

        <div className="bg-black/20 p-4 rounded-2xl border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-200 block">
              {t('yourReferralCode', 'Your Personal Referral Link')}
            </span>
            <code className="text-xs font-mono font-bold text-white break-all">{referralLink}</code>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyReferral}
              className="px-4 py-2.5 rounded-xl bg-white text-stone-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 transition shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? t('linkCopied', 'Copied Link!') : t('copyLink', 'Copy Link')}</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md shrink-0"
            >
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Referral Stats & Referred Friends List */}
        <div className="bg-white/10 rounded-2xl p-4 border border-white/15 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-200 block">Total Referred</span>
              <span className="text-base font-black text-white">{referralsList.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-200 block">Rewarded</span>
              <span className="text-base font-black text-emerald-300">
                {referralsList.filter((r) => r.status === 'REWARDED').length}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-200 block">Points Earned</span>
              <span className="text-base font-black text-amber-200">
                +{referralsList.filter((r) => r.status === 'REWARDED').reduce((sum, r) => sum + (r.rewardPoints || 500), 0)} pts
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-amber-100 mb-2">Your Referred Friends ({referralsList.length})</h4>
            {referralsList.length === 0 ? (
              <p className="text-[11px] text-amber-200 italic">No friends referred yet. Share your link above to start earning rewards!</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {referralsList.map((refItem) => (
                  <div key={refItem.id} className="bg-black/20 px-3 py-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">Friend ID: #{refItem.referredCustomerId.substring(0, 6)}</span>
                      <span className="text-[10px] text-amber-200">
                        {new Date(refItem.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      {refItem.status === 'REWARDED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/30">
                          Rewarded (+{refItem.rewardPoints || 500} pts) 🎉
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold border border-amber-400/30">
                          Pending First Booking ⏳
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
        <h2 className="text-sm font-bold text-stone-900 mb-4">Cash Wallet Recharge History</h2>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-xs">No cash transactions recorded yet.</div>
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
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
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

                <div className={`text-xs font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-stone-900'}`}>
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
            <p className="text-xs text-stone-500 mb-4">Via HARDINKAAM Admin Razorpay Gateway</p>

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
                      <span>Pay ₹{addAmount} via Razorpay</span>
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

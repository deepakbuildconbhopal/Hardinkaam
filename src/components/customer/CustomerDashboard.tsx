import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  ShieldCheck,
  CreditCard,
  Wallet,
  Plus,
  ArrowRight,
  Calendar,
  Sparkles,
  Camera,
  Copy,
  Check,
  Share2,
  Gift,
  HelpCircle,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  TrendingUp,
  Receipt,
  Layers,
  Wrench,
  FileText,
  Briefcase,
  Users,
} from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { razorpayClientService } from '../../services/razorpayClientService';
import { useLanguage } from '../../context/LanguageContext';
import { Booking, Service, Category, UserProfile } from '../../types';
import { DashboardIdCardBanner } from '../common/DashboardIdCardBanner';
import { PhotoCaptureWidget } from '../common/PhotoCaptureWidget';
import { DigitalIdCard } from '../common/DigitalIdCard';
import { getCustomerRewardWallet, CustomerRewardWallet } from '../../services/rewardService';
import { getRoleTitles, generateWhatsAppDirectUrl } from '../../services/memberNotificationService';

interface Props {
  bookings: Booking[];
  services: Service[];
  categories: Category[];
  onSelectTab: (tab: string) => void;
  onBookService: (service: Service) => void;
  onOpenHelp?: () => void;
  onOpenCare?: () => void;
  onOpenRfq?: () => void;
  onOpenAmc?: () => void;
}

export const CustomerDashboard: React.FC<Props> = ({
  bookings,
  services,
  categories,
  onSelectTab,
  onBookService,
  onOpenHelp,
  onOpenCare,
  onOpenRfq,
  onOpenAmc,
}) => {
  const { currentUser, userProfile, activeRole, updateUserProfileData, logout, isAdmin } = useAuth();
  const { t } = useLanguage();

  // Photo & Profile State
  const [photo, setPhoto] = useState<string | null>(() => {
    return userProfile?.avatar || currentUser?.photoURL || localStorage.getItem('hardinkaam_admin_avatar') || null;
  });
  const [showPhotoWidget, setShowPhotoWidget] = useState(false);
  const [photoSuccessMsg, setPhotoSuccessMsg] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Wallet State
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [rewardWallet, setRewardWallet] = useState<CustomerRewardWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);

  // Add Money Modal State
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [addAmount, setAddAmount] = useState<string>('500');
  const [isAddingMoney, setIsAddingMoney] = useState(false);
  const [addMoneyError, setAddMoneyError] = useState<string | null>(null);
  const [addMoneySuccess, setAddMoneySuccess] = useState<string | null>(null);

  const userId = currentUser?.uid || userProfile?.id || 'guest_user';
  const roleTitles = getRoleTitles(activeRole);
  const displayMemberCode =
    userProfile?.memberCode ||
    `HDK-CUST-2026-${userId.slice(0, 6).toUpperCase()}`;
  const referralCode =
    userProfile?.referralCode ||
    'HDK-' + (userId.substring(0, 6).toUpperCase());
  const referralShareText = `नमस्ते! HARDINKAAM पर भोपाल की वेरिफाइड होम सर्विसेज बुक करें। मेरा रेफरल कोड ${referralCode} इस्तेमाल करें और पाएं रिवॉर्ड डिस्काउंट: https://hardinkaam.in`;

  // Sync photo if userProfile or currentUser changes
  useEffect(() => {
    if (userProfile?.avatar) {
      setPhoto(userProfile.avatar);
    } else if (currentUser?.photoURL) {
      setPhoto(currentUser.photoURL);
    }
  }, [userProfile?.avatar, currentUser?.photoURL]);

  // Real-time listen to customer wallet & reward wallet
  useEffect(() => {
    const targetUid = currentUser?.uid || userProfile?.id;
    if (!targetUid || targetUid === 'admin_deepak_root') return;

    // 1. Fetch authoritative wallet (clean 0 default, no unearned balances)
    const initWallet = async () => {
      try {
        const wRef = doc(db, 'wallets', targetUid);
        const snap = await getDoc(wRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.balance !== undefined) setWalletBalance(Number(data.balance));
          if (Array.isArray(data.transactions)) setWalletTransactions(data.transactions);
        } else {
          setWalletBalance(0);
        }

        const rw = await getCustomerRewardWallet(targetUid);
        setRewardWallet(rw);
      } catch (err) {
        console.warn('[CustomerDashboard] Wallet init notice:', err);
      }
    };

    initWallet();

    // 2. Real-time listener on wallets/{uid}
    const unsub = onSnapshot(
      doc(db, 'wallets', targetUid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.balance !== undefined) {
            setWalletBalance(Number(data.balance));
          }
          if (Array.isArray(data.transactions)) {
            setWalletTransactions(data.transactions);
          }
        }
      },
      (err) => console.warn('[CustomerDashboard] Wallet listener notice:', err.message)
    );

    return () => unsub();
  }, [currentUser?.uid, userProfile?.id]);

  // Handle Photo Save
  const handleSavePhoto = async (newPhoto: string | null) => {
    setPhoto(newPhoto);
    if (newPhoto) {
      localStorage.setItem('hardinkaam_admin_avatar', newPhoto);
    } else {
      localStorage.removeItem('hardinkaam_admin_avatar');
    }
    setPhotoSuccessMsg(true);
    setTimeout(() => setPhotoSuccessMsg(false), 3000);

    try {
      await updateUserProfileData({ avatar: newPhoto || '' });
    } catch (e) {
      console.warn('Failed to update avatar in customer profile:', e);
    }
  };

  // Copy Member Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayMemberCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy Referral Code
  const handleCopyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2000);
  };

  // Add Money Flow
  const handleAddMoneySubmit = async () => {
    const num = parseFloat(addAmount);
    if (isNaN(num) || num < 10) {
      setAddMoneyError('कृपया न्यूनतम ₹10 की राशि दर्ज करें।');
      return;
    }

    if (!currentUser) {
      setAddMoneyError('कृपया लॉग इन करें।');
      return;
    }

    setAddMoneyError(null);
    setAddMoneySuccess(null);
    setIsAddingMoney(true);

    try {
      const idToken = await currentUser.getIdToken(true);
      await razorpayClientService.openCheckout({
        purpose: 'wallet_topup',
        referenceId: currentUser.uid,
        amount: num * 100, // paise
        idToken,
        name: 'HARDINKAAM Wallet Top-up',
        description: `Wallet recharge of ₹${num}`,
        prefill: {
          name: userProfile?.name || currentUser.displayName || 'Customer',
          email: currentUser.email || undefined,
          contact: userProfile?.phone || undefined,
        },
        onSuccess: async (verifyResult) => {
          setIsAddingMoney(false);
          setAddMoneySuccess(`सफलतापूर्वक ₹${num} वॉलेट में जोड़े गए! (Payment ID: ${verifyResult.paymentId})`);
          setAddAmount('');
        },
        onFailure: (err) => {
          setAddMoneyError(err.message || 'वॉलेट रिचार्ज असफल रहा।');
          setIsAddingMoney(false);
        }
      });
    } catch (err: any) {
      setAddMoneyError(err.message || 'वॉलेट रिचार्ज शुरू करने में त्रुटि।');
      setIsAddingMoney(false);
    }
  };

  // Filter Active Bookings
  const activeBookings = bookings.filter((b) =>
    ['pending', 'accepted', 'on_the_way', 'in_progress'].includes(b.status)
  );

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. Official Digital ID Card Banner with Live Wallet Display */}
      <DashboardIdCardBanner />

      {/* 2. Top Header & User Profile Command Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* User Photo & Details Block */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5 flex-1">
            {/* Avatar Photo with Instant Update Trigger */}
            <div className="relative shrink-0">
              {photo ? (
                <img
                  src={photo}
                  alt={userProfile?.name || 'Customer'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl object-cover border-3 border-orange-500/90 shadow-lg shadow-orange-500/15 ring-4 ring-stone-100"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-orange-600 via-amber-500 to-orange-500 text-white font-black text-3xl sm:text-4xl flex items-center justify-center border-3 border-orange-400 shadow-lg shadow-orange-500/20 ring-4 ring-stone-100">
                  {userProfile?.name?.charAt(0).toUpperCase() || currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPhotoWidget(!showPhotoWidget)}
                className="absolute -bottom-2 -right-2 p-2 bg-stone-900 hover:bg-orange-600 text-white rounded-xl border-2 border-white transition-all shadow-md cursor-pointer hover:scale-105"
                title="फोटो बदलें या अपलोड करें (Change Photo)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* User Details */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight truncate">
                  {userProfile?.name || currentUser?.displayName || 'सम्मानित ग्राहक'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% सत्यापित ग्राहक</span>
                </span>
                {isAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                    SUPER ADMIN
                  </span>
                )}
              </div>

              {/* Member Code & Role */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 flex items-center gap-1.5 shadow-2xs">
                  <span className="text-[10px] text-stone-400 font-normal">MEMBER ID:</span>
                  <span>{displayMemberCode}</span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-0.5 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                    title="Copy Member Code"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>

                <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-200/80">
                  {roleTitles.hindi} ({roleTitles.english})
                </span>
              </div>

              {/* Contact Information & Location */}
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs text-stone-600 pt-1">
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{userProfile?.phone || '+91 62675 46945'}</span>
                </span>
                {userProfile?.email && !userProfile.email.includes('@phone.hardinkaam.in') && (
                  <span className="flex items-center gap-1 font-medium truncate max-w-[200px]">
                    <Mail className="w-3.5 h-3.5 text-stone-400" />
                    <span>{userProfile.email}</span>
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span>{userProfile?.city || 'भोपाल (Bhopal, MP)'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 border-stone-100">
            <button
              type="button"
              onClick={() => setShowIdCardModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>डिजिटल ID कार्ड</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('profile')}
              className="px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <User className="w-4 h-4 text-stone-600" />
              <span>प्रोफ़ाइल एडिट</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-orange-600/20 transition cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>नई सर्विस बुक करें</span>
            </button>
          </div>
        </div>

        {/* Live Photo Capture Drawer */}
        {showPhotoWidget && (
          <div className="mt-5 p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-orange-600" />
                <span>प्रोफ़ाइल फोटो अपडेट करें (Live Camera या File Upload)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPhotoWidget(false)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {photoSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>फोटो सफलतापूर्वक अपडेट हो गई और प्रोफ़ाइल पर सेव हो गई!</span>
              </div>
            )}

            <PhotoCaptureWidget
              photo={photo}
              onPhotoChange={(newP) => handleSavePhoto(newP)}
              label="अपनी ताज़ा फोटो लें या गैलरी से चुनें"
            />
          </div>
        )}
      </div>

      {/* 3. Live Wallet & Rewards Command Center */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Main Cash Wallet */}
        <div className="rounded-3xl bg-gradient-to-br from-stone-900 via-stone-850 to-slate-900 text-white p-6 shadow-xl border border-stone-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/15 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span>HARDINKAAM वॉलेट बैलेंस</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                <span className="text-amber-400">₹</span>
                <span>{walletBalance.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-stone-400">
                उपयोग: भोपाल में किसी भी होम सर्विस के तुरंत भुगतान हेतु
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-stone-800 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowAddMoneyModal(true)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-950/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>पैसे जोड़ें (+ Add Funds)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('wallet')}
              className="py-2.5 px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
              title="वॉलेट पासबुक व स्टेटमेंट देखें"
            >
              <Receipt className="w-3.5 h-3.5 text-stone-300" />
              <span>पासबुक</span>
            </button>
          </div>
        </div>

        {/* Card 2: Reward Points & Cashback Wallet */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white p-6 shadow-xs border border-amber-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>रिवार्ड पॉइंट्स व कैशबैक</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-300">
                CASHBACK
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight flex items-baseline gap-1.5">
                <span className="text-orange-600">
                  {rewardWallet?.availablePoints !== undefined ? rewardWallet.availablePoints : 0}
                </span>
                <span className="text-sm font-bold text-stone-500">Points</span>
              </div>
              <p className="text-xs font-semibold text-emerald-700">
                ≈ ₹{((rewardWallet?.availablePoints !== undefined ? rewardWallet.availablePoints : 0) / 10).toFixed(2)} रुपया मूल्य (अगली सर्विस में छूट)
              </p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-amber-100 flex items-center justify-between">
            <span className="text-xs text-stone-500">
              हर बुकिंग पर 10% तक रिवार्ड्स
            </span>
            <button
              type="button"
              onClick={() => onSelectTab('wallet')}
              className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
            >
              <span>रिडीम करें</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Refer & Earn Program */}
        <div className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-white p-6 shadow-xs border border-purple-200/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-600" />
                <span>रेफर करें और ₹100 कमाएं</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black border border-purple-300">
                REFERRAL
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-stone-600">
                अपने दोस्त या रिश्तेदार को HARDINKAAM बताएं और हर बुकिंग पर पाएं नकद रिवार्ड।
              </p>
              <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-200">
                <span className="font-mono font-black text-xs text-purple-900 tracking-wider flex-1 truncate">
                  {referralCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReferral}
                  className="px-2 py-1 bg-white hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs border border-purple-200"
                >
                  {copiedReferral ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100">
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(referralShareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp पर शेयर करें</span>
            </a>
          </div>
        </div>
      </div>

      {/* HARDINKAAM New Platform Modules Quick Hub */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-orange-950 p-5 sm:p-6 rounded-3xl border border-stone-800 text-white shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-600 text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                HARDINKAAM नई सुविधाएं (New Features Hub)
              </h2>
              <p className="text-xs text-stone-300">
                वारंटी सुरक्षा, बड़े प्रोजेक्ट कोट्स, मेंटेनेंस अनुबंध व ऑनलाइन अर्निंग हब
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div
            onClick={() => (onOpenCare ? onOpenCare() : onSelectTab('care'))}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-teal-400/40 cursor-pointer transition-all hover:scale-102 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600/40 text-teal-300 flex items-center justify-center font-black">
              <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-black text-sm text-white">7-दिन केयर वारंटी</h4>
            <p className="text-[11px] text-stone-300">
              फ्री री-सर्विस व संतुष्टि गारंटी। सीधे शिकायत टिकट दर्ज करें।
            </p>
            <div className="text-[11px] font-bold text-teal-300 flex items-center gap-1 pt-1">
              वारंटी हब खोलें <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => (onOpenRfq ? onOpenRfq() : onSelectTab('rfq'))}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-orange-400/40 cursor-pointer transition-all hover:scale-102 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-600/40 text-orange-300 flex items-center justify-center font-black">
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-black text-sm text-white">RFQ / मल्टीपल कोट्स</h4>
            <p className="text-[11px] text-stone-300">
              पेंटिंग, रिनोवेशन, वाटरप्रूफिंग हेतु कारीगरों से दरें मंगाएं।
            </p>
            <div className="text-[11px] font-bold text-orange-300 flex items-center gap-1 pt-1">
              कोट्स मंगाएं <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => (onOpenAmc ? onOpenAmc() : onSelectTab('amc'))}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-indigo-400/40 cursor-pointer transition-all hover:scale-102 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/40 text-indigo-300 flex items-center justify-center font-black">
              <Wrench className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-black text-sm text-white">AMC मेंटेनेंस प्लांस</h4>
            <p className="text-[11px] text-stone-300">
              AC, RO व संपूर्ण घर हेतु वार्षिक मेंटेनेंस व VIP मेंबरशिप।
            </p>
            <div className="text-[11px] font-bold text-indigo-300 flex items-center gap-1 pt-1">
              प्लांस देखें <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onSelectTab('work_from_home')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-amber-400/40 cursor-pointer transition-all hover:scale-102 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-600/40 text-amber-300 flex items-center justify-center font-black">
              <Briefcase className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-black text-sm text-white">Work From Home</h4>
            <p className="text-[11px] text-stone-300">
              घर बैठे ऑनलाइन माइक्रो-टास्क करें और दैनिक कमाई अपने बैंक में पाएं।
            </p>
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1 pt-1">
              टास्क हब <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          <div
            onClick={() => onSelectTab('jobs')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-blue-400/40 cursor-pointer transition-all hover:scale-102 space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/40 text-blue-300 flex items-center justify-center font-black">
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </div>
            <h4 className="font-black text-sm text-white">कारीगर भर्ती (Jobs)</h4>
            <p className="text-[11px] text-stone-300">
              इलेक्ट्रीशियन, प्लंबर, कारपेंटर हेतु भोपाल में खुली वेकेंसी।
            </p>
            <div className="text-[11px] font-bold text-blue-300 flex items-center gap-1 pt-1">
              जॉब्स देखें <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Bookings Status & Tracker */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-600">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              मेरी सक्रिय बुकिंग्स (Active Orders)
            </h2>
            {activeBookings.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-xs font-black">
                {activeBookings.length}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('bookings')}
            className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>सभी बुकिंग्स देखें ({bookings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeBookings.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center font-black">
              <Wrench className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-stone-700">
              वर्तमान में कोई सक्रिय बुकिंग नहीं है
            </p>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              घर के किसी भी काम (इलेक्ट्रीशियन, प्लंबर, एसी, सफाई, पेंटर) के लिए वेरिफाइड कारीगर 60 मिनट में उपलब्ध हैं।
            </p>
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md cursor-pointer transition"
            >
              <span>सर्विस कैटलॉग देखें</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-white hover:border-orange-300 transition-all shadow-2xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-stone-800">
                    #{b.id.slice(0, 8)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 uppercase">
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-stone-900 text-sm">{b.serviceName}</h3>
                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{b.bookingDate || 'Today'} • {b.bookingTime || 'Immediate'}</span>
                    </span>
                    <span className="font-bold text-stone-900">₹{b.totalAmount || b.price}</span>
                  </div>
                </div>

                {b.serviceManName && (
                  <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-400 block">असाइन सर्विसमैन:</span>
                      <span className="font-bold text-stone-800">{b.serviceManName}</span>
                    </div>
                    {b.serviceManPhone && (
                      <a
                        href={`tel:${b.serviceManPhone}`}
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>कॉल करें</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Quick Popular Services Bhopal Marketplace Grid */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-black text-stone-900 tracking-tight">
              भोपाल लोकप्रिय सेवाएं (Quick Book)
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="text-xs font-black text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
          >
            <span>सभी सेवाएं देखें</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {services.slice(0, 6).map((srv) => (
            <div
              key={srv.id}
              onClick={() => onBookService(srv)}
              className="p-3.5 rounded-2xl bg-stone-50 hover:bg-orange-50/70 border border-stone-200 hover:border-orange-300 transition-all cursor-pointer text-center space-y-2 group flex flex-col justify-between"
            >
              <div className="w-12 h-12 rounded-2xl bg-white mx-auto flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform overflow-hidden">
                {srv.imageUrl ? (
                  <img src={srv.imageUrl} alt={srv.name} className="w-full h-full object-cover" />
                ) : (
                  <Wrench className="w-6 h-6 text-orange-600" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                  {srv.name}
                </h4>
                <p className="text-[11px] font-black text-emerald-700 mt-0.5">
                  ₹{srv.price}
                </p>
              </div>
              <button
                type="button"
                className="w-full py-1 rounded-lg bg-orange-600 group-hover:bg-orange-700 text-white font-bold text-[10px] transition"
              >
                बुक करें
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Emergency 24x7 Customer Helpline & Support Card */}
      <div className="rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-orange-950 p-6 text-white shadow-xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-base font-black tracking-tight text-white">
              24x7 ग्राहक सहायता व दीपक बिल्डकॉन हेड ऑफिस
            </h3>
          </div>
          <p className="text-xs text-stone-300 max-w-xl">
            किसी भी सेवा, शिकायत, रिफंड या सुझाव हेतु अधिकृत ग्राहक सहायता टीम से संपर्क करें।
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="tel:+916267546945"
            className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>कॉल: +91 62675 46945</span>
          </a>

          <a
            href="https://wa.me/916267546945?text=नमस्ते%20दीपक%20बिल्डकॉन%20कस्टमर%20सपोर्ट"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp चैट</span>
          </a>
        </div>
      </div>

      {/* 7. Modal: Add Money to Wallet */}
      {showAddMoneyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 text-orange-600">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black text-stone-900">
                  वॉलेट में पैसे जोड़ें (Add Money)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMoneyModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between">
                <span>वर्तमान बैलेंस:</span>
                <span className="font-bold">₹{walletBalance.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-amber-700">
                सुरक्षित Razorpay गेटवे (UPI, Google Pay, PhonePe, Cards) द्वारा तुरंत रिचार्ज।
              </p>
            </div>

            {addMoneyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addMoneyError}</span>
              </div>
            )}

            {addMoneySuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{addMoneySuccess}</span>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-700 block">
                रिचार्ज राशि दर्ज करें (₹):
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-stone-400">
                  ₹
                </span>
                <input
                  type="number"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="500"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-stone-300 font-black text-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Preset Quick Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                {['100', '200', '500', '1000', '2000'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddAmount(amt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      addAmount === amt
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isAddingMoney}
                onClick={handleAddMoneySubmit}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-sm shadow-lg shadow-orange-900/20 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAddingMoney ? (
                  <span>प्रमाणीकरण हो रहा है...</span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>₹{addAmount || '0'} अभी भुगतान करें (Razorpay)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Digital ID Card Preview */}
      {showIdCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-stone-900 rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl border border-stone-700 space-y-4 animate-in zoom-in-95 text-white">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  डिजिटल सदस्यता ID कार्ड
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIdCardModal(false)}
                className="p-1 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <DigitalIdCard
              photoUrl={photo}
              onPhotoChange={(newP) => handleSavePhoto(newP)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

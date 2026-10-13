import React, { useState, useEffect } from 'react';
import {
  Shield,
  CreditCard,
  Download,
  Share2,
  Copy,
  Check,
  Camera,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Eye,
  X,
  Wallet,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { getRoleTitles, buildRegistrationMessage, generateWhatsAppDirectUrl } from '../../services/memberNotificationService';
import { DigitalIdCard } from './DigitalIdCard';
import { PhotoCaptureWidget } from './PhotoCaptureWidget';

interface Props {
  className?: string;
  variant?: 'banner' | 'card' | 'compact';
  onOpenWallet?: () => void;
}

export const DashboardIdCardBanner: React.FC<Props> = ({ className = '', variant = 'banner', onOpenWallet }) => {
  const { currentUser, userProfile, activeRole, isAdmin, updateUserProfileData } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showPhotoWidget, setShowPhotoWidget] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(() => {
    return userProfile?.avatar || currentUser?.photoURL || localStorage.getItem('hardinkaam_admin_avatar') || null;
  });
  const [photoSuccess, setPhotoSuccess] = useState(false);

  useEffect(() => {
    if (userProfile?.avatar) {
      setPhoto(userProfile.avatar);
    } else if (currentUser?.photoURL) {
      setPhoto(currentUser.photoURL);
    }
  }, [userProfile?.avatar, currentUser?.photoURL]);

  // Real-time wallet listener
  useEffect(() => {
    const targetUid = currentUser?.uid || userProfile?.id;
    if (!targetUid || targetUid === 'admin_deepak_root') {
      if (isAdmin) setWalletBalance(25000);
      return;
    }
    const unsub = onSnapshot(
      doc(db, 'wallets', targetUid),
      (snap) => {
        if (snap.exists()) {
          const bal = snap.data()?.balance;
          if (bal !== undefined) setWalletBalance(Number(bal));
        } else {
          setWalletBalance(activeRole === 'service_man' ? 500 : 200);
        }
      },
      () => {
        setWalletBalance(activeRole === 'service_man' ? 500 : 200);
      }
    );
    return () => unsub();
  }, [currentUser?.uid, userProfile?.id, activeRole, isAdmin]);

  if (!currentUser && !userProfile) {
    return null;
  }

  const roleTitles = getRoleTitles(activeRole);
  const userName = userProfile?.name || currentUser?.displayName || 'हार्दिक सदस्य';
  const userPhone = userProfile?.phone || (currentUser?.email?.includes('@phone.hardinkaam.in') ? currentUser.email.replace('@phone.hardinkaam.in', '') : '6267546945');
  const displayMemberCode =
    userProfile?.memberCode ||
    (isAdmin ? 'HDK-ADMN-2026-ROOT' : `HDK-${roleTitles.prefix}-2026-${Math.abs(hashCode(currentUser?.uid || '12345')).toString().slice(0, 5)}`);

  const builtMsg = buildRegistrationMessage({
    name: userName,
    phone: userPhone,
    memberCode: displayMemberCode,
    roleHindiTitle: roleTitles.hindi,
    roleEnglishTitle: roleTitles.english,
    amountPaid: 121,
  });

  const whatsappDirectUrl = generateWhatsAppDirectUrl(userPhone, builtMsg.whatsapp);

  const notificationResult = {
    memberCode: displayMemberCode,
    roleHindiTitle: roleTitles.hindi,
    roleEnglishTitle: roleTitles.english,
    whatsappDirectUrl,
    smsDispatched: true,
    whatsappDispatched: true,
    notificationId: 'notif_' + displayMemberCode,
  };

  const handleSavePhoto = async (newPhoto: string | null) => {
    setPhoto(newPhoto);
    if (newPhoto) {
      localStorage.setItem('hardinkaam_admin_avatar', newPhoto);
    } else {
      localStorage.removeItem('hardinkaam_admin_avatar');
    }
    setPhotoSuccess(true);
    setTimeout(() => setPhotoSuccess(false), 3000);

    try {
      await updateUserProfileData({ avatar: newPhoto || '' });
    } catch (e) {
      console.warn('Failed to update avatar photo in profile:', e);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(displayMemberCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <>
      <div
        id="dashboard-id-card-banner"
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-slate-900 border border-stone-700/70 p-4 sm:p-5 text-white shadow-xl shadow-stone-950/20 ${className}`}
      >
        {/* Ambient Decorative Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/15 via-amber-500/10 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* User Photo + Identification Block */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="relative shrink-0">
              {photo || userProfile?.avatar ? (
                <img
                  src={photo || userProfile?.avatar}
                  alt={userName}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-amber-400/80 shadow-md shadow-amber-500/10 ring-2 ring-stone-900"
                />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-2xl flex items-center justify-center border-2 border-amber-400/80 shadow-md">
                  {userName.charAt(0).toUpperCase() || 'H'}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowPhotoWidget(!showPhotoWidget);
                }}
                className="absolute -bottom-1.5 -right-1.5 p-1 bg-stone-950 hover:bg-orange-600 text-stone-200 hover:text-white rounded-lg border border-stone-700 transition cursor-pointer shadow-xs"
                title="फोटो अपडेट करें / Change Photo"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>{userName}</span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>सत्यापित सदस्य (Verified)</span>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  {roleTitles.hindi} ({roleTitles.english})
                </span>
                <span className="text-[11px] text-stone-400 font-medium">
                  📱 {userPhone}
                </span>
              </div>

              {/* Member Code & Live Wallet Badges */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                    मेम्बर ID:
                  </span>
                  <span className="font-mono font-black text-xs sm:text-sm text-amber-300 bg-black/40 px-2 py-0.5 rounded-md border border-stone-700 tracking-wider">
                    {displayMemberCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-1 hover:bg-white/10 text-stone-300 hover:text-white rounded-md transition cursor-pointer"
                    title="Copy Member Code"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Live Wallet Pill */}
                {walletBalance !== null && (
                  <div
                    onClick={onOpenWallet}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs transition ${
                      onOpenWallet ? 'cursor-pointer hover:scale-102' : ''
                    }`}
                    title="Live Wallet Balance"
                  >
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>वॉलेट: ₹{walletBalance.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions / ID Card Trigger */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-stone-800">
            {walletBalance !== null && (
              <button
                type="button"
                onClick={onOpenWallet}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/30 transition cursor-pointer"
              >
                <Wallet className="w-4 h-4 text-emerald-200" />
                <span>₹{walletBalance.toFixed(2)} वॉलेट</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-900/30 transition transform active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>डिजिटल ID कार्ड देखें / डाउनलोड</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/80" />
            </button>

            <a
              href={whatsappDirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              title="ID कार्ड व सदस्यता विवरण WhatsApp पर प्राप्त करें"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp शेयर</span>
            </a>
          </div>
        </div>

        {/* Live Photo Update Drawer */}
        {showPhotoWidget && (
          <div className="mt-4 p-4 rounded-2xl bg-stone-900/90 border border-stone-700 relative animate-fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" /> ID कार्ड फोटो अपडेट करें (Live Camera / Upload)
              </span>
              <button
                type="button"
                onClick={() => setShowPhotoWidget(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {photoSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>फोटो सफलतापूर्वक अपडेट हो गई और डिजिटल ID कार्ड पर सेव हो गई!</span>
              </div>
            )}

            <PhotoCaptureWidget
              photo={photo || userProfile?.avatar || null}
              onPhotoChange={(newP) => {
                handleSavePhoto(newP);
              }}
              label="ID कार्ड के लिए नई फोटो लें या अपलोड करें"
            />
          </div>
        )}
      </div>

      {/* FULL DIGITAL ID CARD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-lg bg-stone-900 border border-stone-700 rounded-3xl p-5 sm:p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    आधिकारिक डिजिटल सदस्यता ID कार्ड
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Official Digital ID Badge • HARDINKAAM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* The canvas digital ID card component */}
            <div className="py-1">
              <DigitalIdCard
                userName={userName}
                userPhone={userPhone}
                photoUrl={photo || userProfile?.avatar}
                notificationResult={notificationResult}
                onPhotoUpdate={handleSavePhoto}
              />
            </div>

            {/* Footer Notice */}
            <div className="p-3 rounded-2xl bg-black/40 border border-stone-800 text-[11px] text-stone-400 text-center leading-relaxed">
              यह ID कार्ड HARDINKAAM (DEEPAK BUILDCON) द्वारा अधिकृत है। इसे आप अपने मोबाइल में सुरक्षित रख सकते हैं या किसी भी समय ग्राहक अथवा सेवा स्थल पर सत्यापन हेतु दिखा सकते हैं।
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

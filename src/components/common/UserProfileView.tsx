import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Shield, CheckCircle2, LogOut, Save, BellRing, Loader2, Check, Copy, Sparkles, CreditCard, Camera, Send, Unlock } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { getRoleTitles, buildRegistrationMessage, generateWhatsAppDirectUrl } from '../../services/memberNotificationService';
import { DigitalIdCard } from './DigitalIdCard';
import { PhotoCaptureWidget } from './PhotoCaptureWidget';
import { AdSenseBanner } from '../ads/AdSenseBanner';
import { BrowserNotificationUnblockModal } from './BrowserNotificationUnblockModal';

interface Props {
  onOpenAdminHub?: () => void;
}

export const UserProfileView: React.FC<Props> = ({ onOpenAdminHub }) => {
  const { currentUser, userProfile, activeRole, logout, isAdmin, updateUserProfileData } = useAuth();
  const {
    isPushSupported,
    pushPermission,
    isPushSubscribed,
    enablePushNotifications,
    disablePushNotifications,
    sendTestPush,
  } = useNotifications();

  const [name, setName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [fatherName, setFatherName] = useState(userProfile?.fatherName || '');
  const [motherName, setMotherName] = useState(userProfile?.motherName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [photo, setPhoto] = useState<string | null>(userProfile?.avatar || currentUser?.photoURL || null);
  const [address, setAddress] = useState(userProfile?.address || '');
  const [city, setCity] = useState(userProfile?.city || 'Bhopal');
  const [pincode, setPincode] = useState(userProfile?.pincode || '462011');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showPhotoWidget, setShowPhotoWidget] = useState(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.name) setName(userProfile.name);
      if (userProfile.fatherName) setFatherName(userProfile.fatherName);
      if (userProfile.motherName) setMotherName(userProfile.motherName);
      if (userProfile.phone) setPhone(userProfile.phone);
      if (userProfile.avatar) setPhoto(userProfile.avatar);
      else if (currentUser?.photoURL) setPhoto(currentUser.photoURL);
      if (userProfile.address) setAddress(userProfile.address);
      if (userProfile.city) setCity(userProfile.city);
      if (userProfile.pincode) setPincode(userProfile.pincode);
    } else if (currentUser) {
      if (currentUser.displayName) setName(currentUser.displayName);
      if (currentUser.photoURL) setPhoto(currentUser.photoURL);
    }
  }, [userProfile, currentUser]);

  const roleTitles = getRoleTitles(activeRole);
  const displayMemberCode = userProfile?.memberCode || (isAdmin ? 'HDK-ADMN-2026-ROOT' : `HDK-${roleTitles.prefix}-2026-VERIFIED`);

  const builtMsg = buildRegistrationMessage({
    name: name || 'सदस्य',
    phone: phone || '6267546945',
    memberCode: displayMemberCode,
    roleHindiTitle: roleTitles.hindi,
    roleEnglishTitle: roleTitles.english,
    amountPaid: 121,
  });

  const notificationResult = {
    memberCode: displayMemberCode,
    roleHindiTitle: roleTitles.hindi,
    roleEnglishTitle: roleTitles.english,
    whatsappDirectUrl: generateWhatsAppDirectUrl(
      phone || '6267546945',
      builtMsg.whatsapp
    ),
    smsDispatched: true,
    whatsappDispatched: true,
    notificationId: 'notif_profile',
  };

  const [togglingPush, setTogglingPush] = useState(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<string | null>(null);

  const handleTogglePush = async () => {
    setTogglingPush(true);
    setPushStatusMsg(null);
    try {
      if (isPushSubscribed) {
        await disablePushNotifications();
        setPushStatusMsg('Push notifications deactivated for this device.');
      } else {
        const res = await enablePushNotifications();
        if (res.success) {
          setPushStatusMsg('Push notifications enabled successfully!');
        } else {
          setPushStatusMsg(res.error || 'Failed to enable push notifications.');
        }
      }
      setTimeout(() => setPushStatusMsg(null), 4000);
    } catch (err: any) {
      setPushStatusMsg(err?.message || 'Error updating push preferences.');
      setTimeout(() => setPushStatusMsg(null), 4000);
    } finally {
      setTogglingPush(false);
    }
  };

  const [testingPush, setTestingPush] = useState(false);
  const handleTestPush = async () => {
    setTestingPush(true);
    setPushStatusMsg(null);
    try {
      const res = await sendTestPush();
      setPushStatusMsg(res.message);
    } catch (err: any) {
      setPushStatusMsg(err?.message || 'Error sending test push.');
    } finally {
      setTestingPush(false);
      setTimeout(() => setPushStatusMsg(null), 5000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const updatePayload = {
      name: name.trim(),
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      phone: phone.trim(),
      avatar: photo || '',
      address: address.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
    };

    try {
      await updateUserProfileData(updatePayload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error('Update profile error:', err);
      setErrorMsg(err?.message || 'प्रोफ़ाइल सहेजने में त्रुटि आई। कृपया पुनः प्रयास करें।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          My Account &amp; Profile
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Manage your personal details, default service address, and login credentials
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-6">
        {/* Profile Avatar Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-stone-100">
          <div className="relative">
            {photo ? (
              <img
                src={photo}
                alt={name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-orange-500 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-2xl">
                {name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowPhotoWidget(!showPhotoWidget)}
              className="absolute -bottom-1 -right-1 p-1 bg-stone-900 hover:bg-orange-600 text-white rounded-lg transition shadow-sm cursor-pointer"
              title="Change Photo"
            >
              <Camera className="w-3 h-3" />
            </button>
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">{name || 'HARDINKAAM User'}</h2>
            <p className="text-xs text-stone-500">
              {userProfile?.email && !userProfile.email.endsWith('@phone.hardinkaam.in')
                ? userProfile.email
                : (userProfile?.phone || (currentUser?.email && !currentUser.email.endsWith('@phone.hardinkaam.in') ? currentUser.email : 'deepakbuildconbhopal@gmail.com'))}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold uppercase">
                Role: {roleTitles.hindi} ({activeRole.replace('_', ' ')})
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider uppercase border border-emerald-300">
                  PLATFORM ADMIN
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Photo Update Widget */}
        {showPhotoWidget && (
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 animate-fade-in">
            <PhotoCaptureWidget
              photo={photo}
              onPhotoChange={(newPhoto) => {
                setPhoto(newPhoto);
              }}
              label="अपडेट ID कार्ड फोटो (Click or Upload)"
            />
          </div>
        )}

        {/* Official Digital Membership ID Card */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              <span>डिजिटल सदस्यता ID कार्ड (Official Digital ID Badge)</span>
            </span>
          </div>

          <DigitalIdCard
            userName={name || 'सदस्य'}
            userPhone={phone || userProfile?.phone || ''}
            photoUrl={photo}
            notificationResult={notificationResult}
          />
        </div>

        {/* Dedicated Admin Portal Trigger inside Profile */}
        {isAdmin && onOpenAdminHub && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-stone-900 to-stone-800 text-white border border-emerald-500/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  एडमिनिस्ट्रेटर डैशबोर्ड (Super Admin Control Hub)
                </h3>
                <p className="text-stone-300 text-xs mt-0.5">
                  Access catalog management, booking audits, KYC approvals, and system controls.
                </p>
              </div>
            </div>
            <button
              type="button"
              id="profile-open-admin-hub-btn"
              onClick={onOpenAdminHub}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs cursor-pointer whitespace-nowrap text-center transition-colors"
            >
              एडमिन डैशबोर्ड खोलें (Open Hub) →
            </button>
          </div>
        )}

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile information updated successfully!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-stone-700 mb-1">Full Name / आपका पूरा नाम</label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">पिता का नाम (Father's Name)</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="पिता का पूरा नाम"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">माता का नाम (Mother's Name)</label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  placeholder="माता का पूरा नाम"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Oath Verification Status Badge */}
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center gap-2 text-emerald-900 text-[11px] font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>सत्यापित शपथ पत्र (Verified Declaration):</strong> कोई आपराधिक रिकॉर्ड नहीं है (No Criminal Record Oath Accepted during registration).
            </span>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Mobile Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98260 00000"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-stone-700 mb-1">Default Service Address</label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Flat/House, Street, Area, Landmark"
              className="w-full p-2.5 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-stone-700 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-200"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Pincode</label>
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full p-2 rounded-xl border border-stone-200"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Device Push Notification Settings */}
        {isPushSupported && (
          <div className="pt-4 border-t border-stone-100 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isPushSubscribed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  <BellRing className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-stone-900 text-xs">Push Notifications</h4>
                  <p className="text-[11px] text-stone-500">
                    {isPushSubscribed
                      ? 'Active on this device for real-time order and system alerts'
                      : pushPermission === 'denied'
                      ? 'Notifications are blocked in your browser site permissions'
                      : 'Receive real-time push alerts for bookings and updates'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isPushSubscribed && (
                  <button
                    type="button"
                    id="profile-fcm-test-btn"
                    disabled={testingPush}
                    onClick={handleTestPush}
                    className="px-2.5 py-1.5 rounded-xl font-bold text-xs bg-stone-900 hover:bg-stone-800 text-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-xs disabled:opacity-50"
                    title="Send a real-time test push notification to this device"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>{testingPush ? 'Sending...' : 'Test'}</span>
                  </button>
                )}

                {pushPermission === 'denied' ? (
                  <button
                    id="profile-fcm-unblock-btn"
                    type="button"
                    onClick={() => setIsUnblockModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl font-black text-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse ring-2 ring-red-400/40"
                    title="ब्राउज़र अनुमति अनलॉक करने के चरण देखें"
                  >
                    <Unlock className="w-3.5 h-3.5 text-amber-200" />
                    <span>अनलॉक करें (Unblock)</span>
                  </button>
                ) : (
                  <button
                    id="profile-fcm-push-toggle-btn"
                    type="button"
                    disabled={togglingPush}
                    onClick={handleTogglePush}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0 shadow-xs ${
                      isPushSubscribed
                        ? 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    {togglingPush ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isPushSubscribed ? (
                      'Disable'
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Enable
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {pushStatusMsg && (
              <p className="text-[11px] font-medium text-orange-700 bg-orange-50 p-2 rounded-xl">
                {pushStatusMsg}
              </p>
            )}
          </div>
        )}

        {/* Browser Notification Unblock Modal */}
        <BrowserNotificationUnblockModal
          isOpen={isUnblockModalOpen}
          onClose={() => setIsUnblockModalOpen(false)}
          onSuccess={() => {
            setIsUnblockModalOpen(false);
            setPushStatusMsg('🎉 डिवाइस पुश अलर्ट सफलतापूर्वक अनलॉक व सक्रिय हो गए हैं!');
            setTimeout(() => setPushStatusMsg(null), 5000);
          }}
        />

        {/* Profile Page Google AdSense Banner */}
        <AdSenseBanner
          slot="8291047563"
          format="leaderboard"
          category="branding"
          label="गूगल एडसेंस • HARDINKAAM PROFILE SPONSOR"
        />
      </div>
    </div>
  );
};

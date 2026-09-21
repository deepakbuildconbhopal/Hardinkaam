import React, { useState } from 'react';
import { User, Phone, Mail, MapPin, Shield, CheckCircle2, LogOut, Save } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

interface Props {
  onOpenAdminHub?: () => void;
}

export const UserProfileView: React.FC<Props> = ({ onOpenAdminHub }) => {
  const { currentUser, userProfile, activeRole, logout, isAdmin, updateUserProfileData } = useAuth();
  const [name, setName] = useState(userProfile?.name || currentUser?.displayName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [city, setCity] = useState(userProfile?.city || 'Bhopal');
  const [pincode, setPincode] = useState(userProfile?.pincode || '462011');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const updatePayload = {
      name: name.trim(),
      phone: phone.trim(),
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
          <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-2xl">
            {name?.charAt(0) || currentUser?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-base font-bold text-stone-900">{name || 'HARDINKAAM User'}</h2>
            <p className="text-xs text-stone-500">{currentUser?.email || userProfile?.email || 'deepakbuildconbhopal@gmail.com'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold uppercase">
                Role: {activeRole.replace('_', ' ')}
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider uppercase border border-emerald-300">
                  PLATFORM ADMIN
                </span>
              )}
            </div>
          </div>
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
            <label className="block font-bold text-stone-700 mb-1">Full Name</label>
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
      </div>
    </div>
  );
};

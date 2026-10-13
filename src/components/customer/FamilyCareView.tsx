import React, { useState, useEffect } from 'react';
import {
  Heart,
  Plus,
  MapPin,
  User,
  Phone,
  ShieldCheck,
  Send,
  Users,
  Wrench,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FamilyHousehold } from '../../types';
import { familyCareService } from '../../services/familyCareService';

interface Props {
  onBookForHousehold?: (household: FamilyHousehold) => void;
}

export const FamilyCareView: React.FC<Props> = ({ onBookForHousehold }) => {
  const { currentUser, userProfile } = useAuth();
  const { addToast } = useToast();
  const [households, setHouseholds] = useState<FamilyHousehold[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [inviteModalHousehold, setInviteModalHousehold] = useState<FamilyHousehold | null>(null);
  const [inviteContact, setInviteContact] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<'coordinator' | 'viewer'>('coordinator');
  const [inviting, setInviting] = useState<boolean>(false);

  // Form states
  const [label, setLabel] = useState<string>('माता-पिता का घर (Parents Residence)');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [city, setCity] = useState<string>('Bhopal');
  const [careNotes, setCareNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const loadHouseholds = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const list = await familyCareService.getHouseholdsForUser(
        currentUser.uid,
        userProfile?.phone || currentUser.email || undefined
      );
      setHouseholds(list);
    } catch (e) {
      console.warn('Error loading family care households:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHouseholds();
  }, [currentUser, userProfile]);

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryName.trim() || !address.trim()) {
      addToast('कृपया लाभार्थी का नाम और पता दर्ज करें।', 'warning');
      return;
    }
    if (!currentUser) return;

    setSaving(true);
    try {
      await familyCareService.createHousehold({
        ownerId: currentUser.uid,
        ownerName: userProfile?.name || currentUser.displayName || 'Customer',
        ownerPhone: userProfile?.phone || '',
        label,
        address: address.trim(),
        city,
        beneficiaryName: beneficiaryName.trim(),
        beneficiaryPhone: beneficiaryPhone.trim(),
        careNotes: careNotes.trim() || undefined,
        permissions: {
          canBook: true,
          canViewLiveStatus: true,
          canReceiveSms: true,
          canApproveEstimates: true,
        },
      });

      addToast('परिवार देखभाल प्रोफ़ाइल सफलतापूर्वक जोड़ी गई!', 'success');
      setShowAddModal(false);
      setBeneficiaryName('');
      setBeneficiaryPhone('');
      setAddress('');
      setCareNotes('');
      await loadHouseholds();
    } catch (err: any) {
      addToast(err.message || 'त्रुटि आई', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteModalHousehold || !inviteContact.trim()) return;

    setInviting(true);
    try {
      await familyCareService.inviteFamilyMember(
        inviteModalHousehold.id,
        inviteContact.trim(),
        inviteRole
      );
      addToast('पारिवारिक सदस्य को आमंत्रण भेजा गया!', 'success');
      setInviteModalHousehold(null);
      setInviteContact('');
      await loadHouseholds();
    } catch (err: any) {
      addToast(err.message || 'आमंत्रण भेजने में विफल', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('क्या आप इस परिवार प्रोफ़ाइल को हटाना चाहते हैं?')) {
      await familyCareService.deleteHousehold(id);
      addToast('प्रोफ़ाइल हटा दी गई।', 'info');
      await loadHouseholds();
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-rose-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-rose-600/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 text-white shadow-xs">
            <Heart className="w-6 h-6 fill-white/40" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-wider">
                अभिभावक एवं परिवार सुरक्षा
              </span>
              <span className="text-xs text-rose-100 font-medium">
                {households.length} प्रोफ़ाइल सक्रिय
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
              परिवार देखभाल — Family &amp; Parents Care
            </h2>
            <p className="text-xs text-white/85">
              दूर बैठे माता-पिता के घर के लिए सर्विस बुक करें, लाइव स्टेटस ट्रैक करें और बिलिंग प्रबंधित करें।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-white text-rose-950 hover:bg-rose-50 font-bold text-xs shadow-sm transition active:scale-95 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-rose-600" />
          <span>नया पारिवारिक पता जोड़ें (Add Home)</span>
        </button>
      </div>

      {/* Household Cards */}
      {loading ? (
        <div className="py-12 text-center text-stone-400">
          <Heart className="w-8 h-8 animate-pulse mx-auto mb-2 text-rose-500" />
          <p className="text-xs">परिवार देखभाल प्रोफ़ाइल लोड हो रही है...</p>
        </div>
      ) : households.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 text-center max-w-md mx-auto shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-stone-800">
            कोई पारिवारिक पता नहीं जोड़ा गया है
          </h3>
          <p className="text-xs text-stone-500 leading-relaxed">
            अपने माता-पिता या अन्य पारिवारिक पते को यहाँ जोड़ें ताकि आप उनके घर के लिए तकनीशियन आसानी से भेज सकें।
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs"
          >
            पहला पारिवारिक पता जोड़ें (Add First Home)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {households.map((h) => (
            <div
              key={h.id}
              className="bg-white rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {h.label}
                    </span>
                    <h4 className="font-extrabold text-stone-900 text-sm sm:text-base mt-1">
                      {h.beneficiaryName}
                    </h4>
                    {h.beneficiaryPhone && (
                      <span className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-stone-400" />
                        {h.beneficiaryPhone}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(h.id, e)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="प्रोफ़ाइल हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-100 space-y-1.5 text-xs text-stone-600">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-relaxed">{h.address}</span>
                  </div>

                  {h.careNotes && (
                    <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px]">
                      <span className="font-bold block">विशेष देखभाल निर्देश:</span>
                      {h.careNotes}
                    </div>
                  )}
                </div>

                {/* Shared Members */}
                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    {h.sharedWith?.length || 0} सदस्य साझा
                  </span>
                  <button
                    type="button"
                    onClick={() => setInviteModalHousehold(h)}
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    + सदस्य जोड़ें
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => {
                  if (onBookForHousehold) {
                    onBookForHousehold(h);
                  } else {
                    addToast(`'${h.beneficiaryName}' के पते पर सेवा बुक करने के लिए बुकिंग स्क्रीन लोड हो रही है।`, 'info');
                  }
                }}
                className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>यहाँ सेवा बुक करें (Book for this Home)</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Household Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    पारिवारिक पता जोड़ें (Add Family Home)
                  </h3>
                  <p className="text-xs text-stone-500">
                    माता-पिता या अन्य निवास का विवरण भरें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHousehold} className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  लेबल (Label) *
                </label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                >
                  <option value="माता-पिता का घर (Parents Residence)">माता-पिता का घर (Parents Residence)</option>
                  <option value="किराये का मकान (Rental Property)">किराये का मकान (Rental Property)</option>
                  <option value="नाना-नानी / दादा-दादी का घर">नाना-नानी / दादा-दादी का घर</option>
                  <option value="अन्य पारिवारिक पता (Other Family Home)">अन्य पारिवारिक पता</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    लाभार्थी का नाम (Beneficiary Name) *
                  </label>
                  <input
                    type="text"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="उदा. श्री रमेश शर्मा (पिताजी)"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    मोबाइल नंबर (Phone)
                  </label>
                  <input
                    type="tel"
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                    placeholder="+91 98260 XXXXX"
                    className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  घर का पूरा पता (Complete Address) *
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="मकान नंबर, ब्लॉक, कॉलोनी, भोपाल"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  विशेष देखभाल निर्देश (Care Instructions for Technician)
                </label>
                <input
                  type="text"
                  value={careNotes}
                  onChange={(e) => setCareNotes(e.target.value)}
                  placeholder="उदा. कृपया घंटी धीरे बजाएं, बुजुर्ग अकेले रहते हैं"
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'सहेजा जा रहा है...' : 'प्रोफ़ाइल सहेजें (Save Home)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalHousehold && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs animate-fadeIn"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <h4 className="font-bold text-sm text-stone-900">
              पारिवारिक सदस्य को साझा करें (Invite Coordinator)
            </h4>
            <p className="text-xs text-stone-500">
              आमंत्रित सदस्य इस घर के लिए बुकिंग देख या कर सकेंगे।
            </p>
            <form onSubmit={handleSendInvite} className="space-y-3">
              <input
                type="text"
                value={inviteContact}
                onChange={(e) => setInviteContact(e.target.value)}
                placeholder="मोबाइल नंबर या ईमेल दर्ज करें"
                className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setInviteModalHousehold(null)}
                  className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-xl"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
                >
                  {inviting ? 'भेज रहे हैं...' : 'आमंत्रण भेजें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

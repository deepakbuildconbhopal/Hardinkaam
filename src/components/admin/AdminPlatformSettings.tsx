import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  ShieldAlert,
  Phone,
  Mail,
  Percent,
  Clock,
  MapPin,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Database,
  Bell,
  Volume2,
  ShieldCheck,
  Play,
  Square,
  Megaphone,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CustomDomainSetupGuide } from './CustomDomainSetupGuide';
import { servicemanAlarmSettingsService } from '../../services/servicemanAlarmSettingsService';
import {
  ALARM_TONE_OPTIONS,
  AlarmToneType,
  bookingAlarmSoundService,
} from '../../services/bookingAlarmSoundService';

interface Props {
  onOpenZeroDataModal?: () => void;
  onSelectTab?: (tab: string) => void;
}

const STORAGE_KEY = 'hardinkaam_platform_settings';

export const AdminPlatformSettings: React.FC<Props> = ({ onOpenZeroDataModal, onSelectTab }) => {
  const [platformCommission, setPlatformCommission] = useState('15');
  const [guaranteeDays, setGuaranteeDays] = useState('7');
  const [helplinePhone, setHelplinePhone] = useState('+91 98260 12345');
  const [supportEmail, setSupportEmail] = useState('deepakbuildconbhopal@gmail.com');
  const [officeAddress, setOfficeAddress] = useState('S-2, Ashirwad Complex, Zone-1, M.P. Nagar, Bhopal');
  const [emergencyAlert, setEmergencyAlert] = useState('');
  // ServiceMan Booking Alarm Global Admin Controls
  const [globalAlarmEnabled, setGlobalAlarmEnabled] = useState(true);
  const [alarmCountdownSeconds, setAlarmCountdownSeconds] = useState('60');
  const [alarmNotificationTitle, setAlarmNotificationTitle] = useState('🔔 नया काम आया है!');
  const [alarmStrictEligibility, setAlarmStrictEligibility] = useState(true);
  const [selectedAlarmTone, setSelectedAlarmTone] = useState<AlarmToneType>('harmonic_bells');
  const [previewingTone, setPreviewingTone] = useState<AlarmToneType | null>(null);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load existing configuration on mount
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // 1. Try localStorage first for instant hydration
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.platformCommission !== undefined) setPlatformCommission(String(parsed.platformCommission));
          if (parsed.guaranteeDays !== undefined) setGuaranteeDays(String(parsed.guaranteeDays));
          if (parsed.helplinePhone) setHelplinePhone(parsed.helplinePhone);
          if (parsed.supportEmail) setSupportEmail(parsed.supportEmail);
          if (parsed.officeAddress) setOfficeAddress(parsed.officeAddress);
          if (parsed.emergencyAlert !== undefined) setEmergencyAlert(parsed.emergencyAlert);
          if (parsed.globalAlarmEnabled !== undefined) setGlobalAlarmEnabled(parsed.globalAlarmEnabled);
          if (parsed.alarmCountdownSeconds !== undefined) setAlarmCountdownSeconds(String(parsed.alarmCountdownSeconds));
          if (parsed.alarmNotificationTitle) setAlarmNotificationTitle(parsed.alarmNotificationTitle);
          if (parsed.alarmStrictEligibility !== undefined) setAlarmStrictEligibility(parsed.alarmStrictEligibility);
          if (parsed.selectedAlarmTone) setSelectedAlarmTone(parsed.selectedAlarmTone);
        }
      } catch (e) {
        console.warn('Local settings read note:', e);
      }

      // 2. Fetch from Firestore doc
      try {
        const snap = await getDoc(doc(db, 'settings', 'platform'));
        if (snap.exists() && isMounted) {
          const data = snap.data();
          if (data.platformCommission !== undefined) setPlatformCommission(String(data.platformCommission));
          if (data.guaranteeDays !== undefined) setGuaranteeDays(String(data.guaranteeDays));
          if (data.helplinePhone) setHelplinePhone(data.helplinePhone);
          if (data.supportEmail) setSupportEmail(data.supportEmail);
          if (data.officeAddress) setOfficeAddress(data.officeAddress);
          if (data.emergencyAlert !== undefined) setEmergencyAlert(data.emergencyAlert);
        }

        // Also fetch alarm settings from settings/booking_alarm
        const alarmSnap = await getDoc(doc(db, 'settings', 'booking_alarm'));
        if (alarmSnap.exists() && isMounted) {
          const aData = alarmSnap.data();
          if (aData.globalAlarmEnabled !== undefined) setGlobalAlarmEnabled(aData.globalAlarmEnabled);
          if (aData.countdownDurationSeconds !== undefined) setAlarmCountdownSeconds(String(aData.countdownDurationSeconds));
          if (aData.notificationTitle) setAlarmNotificationTitle(aData.notificationTitle);
          if (aData.strictEligibility !== undefined) setAlarmStrictEligibility(aData.strictEligibility);
          if (aData.selectedAlarmTone) {
            setSelectedAlarmTone(aData.selectedAlarmTone);
            bookingAlarmSoundService.setTone(aData.selectedAlarmTone);
          }
        }
      } catch (err) {
        console.warn('Firestore settings fetch note:', err);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
      bookingAlarmSoundService.stopLoop();
    };
  }, []);

  const handlePreviewTone = async (tone: AlarmToneType) => {
    try {
      setPreviewingTone(tone);
      await bookingAlarmSoundService.playTonePreview(tone);
      setTimeout(() => {
        setPreviewingTone(null);
      }, 1600);
    } catch (err) {
      console.warn('Audio preview error:', err);
      setPreviewingTone(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      platformCommission: parseFloat(platformCommission) || 15,
      guaranteeDays: parseInt(guaranteeDays) || 7,
      helplinePhone: helplinePhone.trim(),
      supportEmail: supportEmail.trim(),
      officeAddress: officeAddress.trim(),
      emergencyAlert: emergencyAlert.trim(),
      globalAlarmEnabled,
      alarmCountdownSeconds: parseInt(alarmCountdownSeconds) || 60,
      alarmNotificationTitle: alarmNotificationTitle.trim(),
      alarmStrictEligibility,
      selectedAlarmTone,
      updatedAt: new Date().toISOString(),
    };

    // 1. Instantly persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Local storage write note:', e);
    }

    // 2. Persist to Firestore
    try {
      await setDoc(doc(db, 'settings', 'platform'), payload, { merge: true });
      // Also update settings/booking_alarm
      await servicemanAlarmSettingsService.saveAdminGlobalSettings({
        globalAlarmEnabled,
        countdownDurationSeconds: parseInt(alarmCountdownSeconds) || 60,
        notificationTitle: alarmNotificationTitle.trim() || '🔔 नया काम आया है!',
        strictEligibility: alarmStrictEligibility,
        selectedAlarmTone,
      });

      bookingAlarmSoundService.setTone(selectedAlarmTone);

      // Also update settings/platform_commission for backward compatibility
      try {
        await setDoc(
          doc(db, 'settings', 'platform_commission'),
          { rate: payload.platformCommission, updatedAt: payload.updatedAt },
          { merge: true }
        );
      } catch (_) {}

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: any) {
      console.error('Failed to save settings to Firestore:', err);
      setErrorMsg(err?.message ? `डेटाबेस सिंक सूचना: ${err.message}` : 'कॉन्फ़िगरेशन स्थानीय रूप से सहेजा गया।');
      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Platform Configuration &amp; Business Rules
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          HARDINKAAM core operating parameters, revenue splits, and official contact points
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
        {saved && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings successfully saved and synced to database!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Platform Commission Rate (%)
              </label>
              <div className="relative">
                <Percent className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={platformCommission}
                  onChange={(e) => setPlatformCommission(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 font-bold"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Technician receives remaining (85%)
              </span>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">
                Customer Service Warranty (Days)
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={guaranteeDays}
                  onChange={(e) => setGuaranteeDays(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 font-bold"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Free revisit window for dissatisfied work
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Customer Helpline / Toll-Free Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={helplinePhone}
                  onChange={(e) => setHelplinePhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-stone-700 mb-1">Support Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="block font-bold text-stone-700 mb-1">
              Registered Office Address (Bhopal Headquarters)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                placeholder="e.g. S-2, Ashirwad Complex, Zone-1, M.P. Nagar, Bhopal"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <label className="block font-bold text-stone-700 mb-1">
              Top Banner / Operational Announcement (Optional)
            </label>
            <input
              type="text"
              value={emergencyAlert}
              onChange={(e) => setEmergencyAlert(e.target.value)}
              placeholder="e.g. Services running normally across Bhopal with high customer safety measures"
              className="w-full p-2.5 rounded-xl border border-stone-200"
            />
          </div>

          {/* HARDINKAAM Service Professional New Booking Alarm Global Settings */}
          <div className="pt-4 border-t-2 border-orange-100 bg-orange-50/40 p-4 rounded-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-orange-900">
              <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-stone-900">
                  सर्विसमैन नया बुकिंग अलार्म सिस्टम (Pro New Booking Alarm Controls)
                </h4>
                <p className="text-[11px] text-stone-500">
                  Global parameters for the real-time incoming booking alert & audio alarm engine
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Global Alarm Switch */}
              <div className="p-3 bg-white rounded-xl border border-orange-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800 text-xs block">
                    ग्लोबल अलार्म सक्षम (Global Alarm Active)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Master switch for all service professionals
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalAlarmEnabled}
                    onChange={(e) => setGlobalAlarmEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600" />
                </label>
              </div>

              {/* Countdown Duration */}
              <div className="p-3 bg-white rounded-xl border border-orange-200 space-y-1">
                <label className="font-bold text-stone-800 text-xs flex items-center justify-between">
                  <span>अलर्ट समयसीमा (Response Countdown)</span>
                  <span className="font-mono text-orange-700 font-bold">{alarmCountdownSeconds}s</span>
                </label>
                <select
                  value={alarmCountdownSeconds}
                  onChange={(e) => setAlarmCountdownSeconds(e.target.value)}
                  className="w-full p-2 rounded-lg border border-stone-200 text-xs font-semibold bg-stone-50"
                >
                  <option value="30">30 सेकंड (Fast Dispatch)</option>
                  <option value="45">45 सेकंड</option>
                  <option value="60">60 सेकंड (अनुशंसित / Standard)</option>
                  <option value="90">90 सेकंड</option>
                  <option value="120">120 सेकंड (Extended)</option>
                </select>
              </div>

              {/* Notification Headline */}
              <div className="p-3 bg-white rounded-xl border border-orange-200 space-y-1">
                <label className="font-bold text-stone-800 text-xs block">
                  नोटिफिकेशन शीर्षक (Notification Title)
                </label>
                <input
                  type="text"
                  value={alarmNotificationTitle}
                  onChange={(e) => setAlarmNotificationTitle(e.target.value)}
                  placeholder="🔔 नया काम आया है!"
                  className="w-full p-2 rounded-lg border border-stone-200 text-xs font-semibold"
                />
              </div>

              {/* Strict Area & Category Eligibility */}
              <div className="p-3 bg-white rounded-xl border border-orange-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-800 text-xs block">
                    सख्त पात्रता नियम (Strict Eligibility Rules)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Only alert pros matching exact category & district
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alarmStrictEligibility}
                    onChange={(e) => setAlarmStrictEligibility(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                </label>
              </div>
            </div>

            {/* Admin Alarm Tone Selector (अलार्म टोन बदलने का विकल्प) */}
            <div className="pt-3 border-t border-orange-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-black text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-orange-600" />
                  <span>सर्विसमैन अलार्म टोन चयन (Admin Alarm Tone Configuration)</span>
                </label>
                <span className="text-[11px] text-orange-700 font-semibold bg-orange-100 px-2.5 py-0.5 rounded-full">
                  5 डिफ़ॉल्ट टोन उपलब्ध
                </span>
              </div>
              <p className="text-[11px] text-stone-500">
                जब भी कोई नई बुकिंग सर्विसमैन को जाएगी, पूरे सर्विसमैन ऐप पर यहाँ चुनी गई अलार्म टोन बजेगी। टेस्ट करने हेतु &quot;सुनें&quot; बटन दबाएं:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                {ALARM_TONE_OPTIONS.map((tone) => {
                  const isSelected = selectedAlarmTone === tone.id;
                  const isPlaying = previewingTone === tone.id;

                  return (
                    <div
                      key={tone.id}
                      onClick={() => setSelectedAlarmTone(tone.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50/80 shadow-xs ring-1 ring-orange-500'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="admin_alarm_tone"
                            checked={isSelected}
                            onChange={() => setSelectedAlarmTone(tone.id)}
                            className="text-orange-600 focus:ring-orange-500 mt-0.5"
                          />
                          <div>
                            <div className="text-xs font-black text-stone-900">{tone.nameHindi}</div>
                            <div className="text-[10px] text-stone-500">{tone.nameEnglish}</div>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-stone-600 leading-tight">
                        {tone.description}
                      </p>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewTone(tone.id);
                        }}
                        className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                          isPlaying
                            ? 'bg-orange-600 text-white animate-pulse'
                            : 'bg-stone-100 hover:bg-orange-100 text-stone-800'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>बज रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current text-orange-600" />
                            <span>टोन सुनें (Test Preview)</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Direct Link to Broadcast Notice Manager */}
            {onSelectTab && (
              <div className="pt-3 border-t border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-3 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-stone-900">
                      त्योहार बधाई व प्रशासनिक संदेश ब्रॉडकास्टर
                    </h5>
                    <p className="text-[10px] text-stone-500">
                      सर्विसमैन, कस्टमर, फ्रेंचाइजी व प्रमोटर ऐप्स पर सीधे दीपावली/होली के वेलकम मैसेज भेजें
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTab('admin_broadcast')}
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>ब्रॉडकास्ट स्टूडियो खोलें</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              type="submit"
              id="admin-save-platform-settings-btn"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Domain Connection Guide for edusuper.in */}
      <CustomDomainSetupGuide />

      {/* Danger Zone: Database Zero Out */}
      <div className="bg-red-50/50 rounded-3xl border border-red-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-red-100 text-red-600 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-red-950">
                Danger Zone: डेटा शून्य (0) करें / Zero Dynamic Platform Records
              </h3>
              <p className="text-xs text-red-800/80 mt-1 max-w-lg">
                व्यवस्थापक अनुमति से चुनें कि क्या मिटाना है (सक्रिय/पूर्ण बुकिंग्स, वित्तीय लेनदेन, चैट, समीक्षाएं) और क्या अपडेट/रीसेट करना है (वॉलेट ₹0, तकनीशियन ड्यूटी ऑफलाइन, 5.0 रेटिंग)। कैटलॉग व एडमिन खाते हमेशा सुरक्षित रहेंगे।
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            {onSelectTab && (
              <button
                type="button"
                id="admin-settings-data-explorer-btn"
                onClick={() => onSelectTab('admin_data_explorer')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20 whitespace-nowrap"
                title="सभी रिकॉर्ड्स तालिका में देखें व चुनिंदा रिकॉर्ड डिलीट करें"
              >
                <Database className="w-4 h-4" />
                <span>डेटा एक्सप्लोरर (View &amp; Delete)</span>
              </button>
            )}

            {onOpenZeroDataModal && (
              <button
                type="button"
                id="admin-settings-zero-data-btn"
                onClick={onOpenZeroDataModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-red-600/20 whitespace-nowrap self-start sm:self-auto"
                title="प्रशासक चयन: क्या मिटाना है या क्या अपडेट/रीसेट करना है"
              >
                <Trash2 className="w-4 h-4" />
                <span>डेटा प्रबंधन व रीसेट (Advance Zero / Reset)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

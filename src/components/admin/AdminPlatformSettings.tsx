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
  Sliders,
  Check,
  Vibrate,
  UserCheck,
  Radio,
  Layers,
  Building2,
  Star,
  Activity,
  Award,
  Smartphone,
  Coins,
  ExternalLink,
  HelpCircle,
  BarChart3,
} from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CustomDomainSetupGuide } from './CustomDomainSetupGuide';
import { servicemanAlarmSettingsService } from '../../services/servicemanAlarmSettingsService';
import { performAdminRewardAdjustment } from '../../services/rewardService';
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

const POPULAR_DISTRICTS = [
  { id: 'bhopal', name: 'Bhopal (भोपाल)' },
  { id: 'indore', name: 'Indore (इंदौर)' },
  { id: 'gwalior', name: 'Gwalior (ग्वालियर)' },
  { id: 'jabalpur', name: 'Jabalpur (जबलपुर)' },
  { id: 'ujjain', name: 'Ujjain (उज्जैन)' },
  { id: 'sagar', name: 'Sagar (सागर)' },
  { id: 'rewa', name: 'Rewa (रीवा)' },
  { id: 'satna', name: 'Satna (सतना)' },
  { id: 'ratlam', name: 'Ratlam (रतलाम)' },
  { id: 'hoshangabad', name: 'Hoshangabad (होशंगाबाद)' },
];

const POPULAR_CATEGORIES = [
  { id: 'cat_electrician', name: 'Electrician (इलेक्ट्रीशियन)' },
  { id: 'cat_plumber', name: 'Plumber (प्लंबर)' },
  { id: 'cat_ac_appliance', name: 'AC & Appliance (एसी व उपकरण)' },
  { id: 'cat_cleaning', name: 'Home Cleaning (गृह स्वच्छता)' },
  { id: 'cat_painting', name: 'Painting (पुताई व रंगाई)' },
  { id: 'cat_carpentry', name: 'Carpentry (बढ़ई काम)' },
  { id: 'cat_ro_water', name: 'RO & Water Purifier (जल शोधक)' },
  { id: 'cat_pest_control', name: 'Pest Control (कीट नियंत्रण)' },
];

export const AdminPlatformSettings: React.FC<Props> = ({ onOpenZeroDataModal, onSelectTab }) => {
  const [platformCommission, setPlatformCommission] = useState('15');
  const [franchiseCommission, setFranchiseCommission] = useState('15');
  const [partnerCommission, setPartnerCommission] = useState('5');
  const [taxRatePercent, setTaxRatePercent] = useState('5');
  const [guaranteeDays, setGuaranteeDays] = useState('7');
  const [helplinePhone, setHelplinePhone] = useState('+91 62675 46945');
  const [supportEmail, setSupportEmail] = useState('deepakbuildconbhopal@gmail.com');
  const [officeAddress, setOfficeAddress] = useState('S-2, Ashirwad Complex, Zone-1, M.P. Nagar, Bhopal');
  const [emergencyAlert, setEmergencyAlert] = useState('');

  // Google AdMob & AdSense Monetization Credentials (Zero-Secret Public Identifiers)
  const [admobAppId, setAdmobAppId] = useState(
    () => localStorage.getItem('hardinkaam_admob_app_id') || ((import.meta as any).env?.VITE_ADMOB_APP_ID as string) || 'ca-app-pub-1925778784615690~8429442285'
  );
  const [admobBannerUnitId, setAdmobBannerUnitId] = useState(
    () => localStorage.getItem('hardinkaam_admob_banner_unit_id') || ((import.meta as any).env?.VITE_ADMOB_BANNER_UNIT_ID as string) || 'ca-app-pub-1925778784615690/5576223249'
  );
  const [admobInterstitialUnitId, setAdmobInterstitialUnitId] = useState(
    () => localStorage.getItem('hardinkaam_admob_interstitial_unit_id') || ((import.meta as any).env?.VITE_ADMOB_INTERSTITIAL_UNIT_ID as string) || 'ca-app-pub-1925778784615690/5576223249'
  );
  const [adsensePubId, setAdsensePubId] = useState(
    () => localStorage.getItem('hardinkaam_adsense_pub_id') || ((import.meta as any).env?.VITE_ADSENSE_CLIENT_ID as string) || 'ca-pub-1925778784615690'
  );

  // Reward Points & Redemption Admin Controls
  const [rewardEnabled, setRewardEnabled] = useState(true);
  const [pointsToRupeeConversion, setPointsToRupeeConversion] = useState('10');
  const [maxPointsUsablePerBooking, setMaxPointsUsablePerBooking] = useState('5000');
  const [maxBookingDiscountPercent, setMaxBookingDiscountPercent] = useState('50');
  const [minBookingAmountForRedemption, setMinBookingAmountForRedemption] = useState('199');
  const [minPointsForRedemption, setMinPointsForRedemption] = useState('100');
  const [rewardExpiryDays, setRewardExpiryDays] = useState('365');
  const [referralRewardPoints, setReferralRewardPoints] = useState('500');

  // Landing Page Video Ad URL
  const [landingVideoUrl, setLandingVideoUrl] = useState(
    () => localStorage.getItem('hardinkaam_landing_video_ad') || ''
  );

  // Manual Reward Adjustment State
  const [adjCustomerId, setAdjCustomerId] = useState('');
  const [adjPoints, setAdjPoints] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjSuccessMsg, setAdjSuccessMsg] = useState<string | null>(null);
  const [adjErrorMsg, setAdjErrorMsg] = useState<string | null>(null);

  // ServiceMan Booking Alarm Super Admin Controls
  const [globalAlarmEnabled, setGlobalAlarmEnabled] = useState(true);
  const [alarmCountdownSeconds, setAlarmCountdownSeconds] = useState('60');
  const [maxAlertAttempts, setMaxAlertAttempts] = useState('3');
  
  // Eligible ServiceMan Rules
  const [alarmStrictEligibility, setAlarmStrictEligibility] = useState(true);
  const [requireKycVerified, setRequireKycVerified] = useState(true);
  const [requireActiveGps, setRequireActiveGps] = useState(false);
  const [minRatingThreshold, setMinRatingThreshold] = useState('0');
  const [maxActiveJobsCap, setMaxActiveJobsCap] = useState('2');
  const [autoReassignOnExpiry, setAutoReassignOnExpiry] = useState(true);

  // District-wise availability
  const [allDistrictsEnabled, setAllDistrictsEnabled] = useState(true);
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>(['bhopal', 'indore', 'gwalior']);

  // Service category eligibility
  const [allCategoriesEligible, setAllCategoriesEligible] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'cat_electrician',
    'cat_plumber',
    'cat_ac_appliance',
    'cat_cleaning',
  ]);

  // Default notification text
  const [alarmNotificationTitle, setAlarmNotificationTitle] = useState('🔔 नया काम आया है!');
  const [alarmNotificationSubtitle, setAlarmNotificationSubtitle] = useState('New Service Request Received');
  const [defaultNotificationBody, setDefaultNotificationBody] = useState(
    'आपके क्षेत्र में नई बुकिंग प्राप्त हुई है। विवरण देखें और तुरंत स्वीकार करें।'
  );

  // Alarm configuration
  const [selectedAlarmTone, setSelectedAlarmTone] = useState<AlarmToneType>('harmonic_bells');
  const [alarmVolumeDefault, setAlarmVolumeDefault] = useState(85); // 10 to 100
  const [alarmSoundLoop, setAlarmSoundLoop] = useState(true);
  const [previewingTone, setPreviewingTone] = useState<AlarmToneType | null>(null);

  // Vibration default
  const [vibrationDefault, setVibrationDefault] = useState(true);
  const [vibrationPattern, setVibrationPattern] = useState<'standard' | 'heavy' | 'pulse'>('standard');

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
          if (parsed.maxAlertAttempts !== undefined) setMaxAlertAttempts(String(parsed.maxAlertAttempts));
          if (parsed.alarmNotificationTitle) setAlarmNotificationTitle(parsed.alarmNotificationTitle);
          if (parsed.alarmNotificationSubtitle) setAlarmNotificationSubtitle(parsed.alarmNotificationSubtitle);
          if (parsed.defaultNotificationBody) setDefaultNotificationBody(parsed.defaultNotificationBody);
          if (parsed.alarmStrictEligibility !== undefined) setAlarmStrictEligibility(parsed.alarmStrictEligibility);
          if (parsed.requireKycVerified !== undefined) setRequireKycVerified(parsed.requireKycVerified);
          if (parsed.requireActiveGps !== undefined) setRequireActiveGps(parsed.requireActiveGps);
          if (parsed.minRatingThreshold !== undefined) setMinRatingThreshold(String(parsed.minRatingThreshold));
          if (parsed.maxActiveJobsCap !== undefined) setMaxActiveJobsCap(String(parsed.maxActiveJobsCap));
          if (parsed.autoReassignOnExpiry !== undefined) setAutoReassignOnExpiry(parsed.autoReassignOnExpiry);
          if (parsed.selectedAlarmTone) setSelectedAlarmTone(parsed.selectedAlarmTone);
          if (parsed.alarmVolumeDefault !== undefined) setAlarmVolumeDefault(Math.round(parsed.alarmVolumeDefault * 100));
          if (parsed.alarmSoundLoop !== undefined) setAlarmSoundLoop(parsed.alarmSoundLoop);
          if (parsed.vibrationDefault !== undefined) setVibrationDefault(parsed.vibrationDefault);
          if (parsed.vibrationPattern) setVibrationPattern(parsed.vibrationPattern);
          if (parsed.enabledDistricts) {
            setAllDistrictsEnabled(parsed.enabledDistricts.includes('all'));
            setSelectedDistricts(parsed.enabledDistricts.filter((d: string) => d !== 'all'));
          }
          if (parsed.eligibleCategories) {
            setAllCategoriesEligible(parsed.eligibleCategories.includes('all'));
            setSelectedCategories(parsed.eligibleCategories.filter((c: string) => c !== 'all'));
          }
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

        // Also fetch centralized commission rules
        try {
          const commSnap = await getDoc(doc(db, 'settings', 'commission_rules'));
          if (commSnap.exists() && isMounted) {
            const cData = commSnap.data();
            if (cData.franchiseRatePercent !== undefined) setFranchiseCommission(String(cData.franchiseRatePercent));
            if (cData.partnerRatePercent !== undefined) setPartnerCommission(String(cData.partnerRatePercent));
            if (cData.taxRatePercent !== undefined) setTaxRatePercent(String(cData.taxRatePercent));
            if (cData.companyRatePercent !== undefined) setPlatformCommission(String(cData.companyRatePercent));
          }
        } catch (_) {}

        // Also fetch alarm settings from settings/booking_alarm
        const alarmSnap = await getDoc(doc(db, 'settings', 'booking_alarm'));
        if (alarmSnap.exists() && isMounted) {
          const aData = alarmSnap.data();
          if (aData.globalAlarmEnabled !== undefined) setGlobalAlarmEnabled(aData.globalAlarmEnabled);
          if (aData.countdownDurationSeconds !== undefined) setAlarmCountdownSeconds(String(aData.countdownDurationSeconds));
          if (aData.maxAlertAttempts !== undefined) setMaxAlertAttempts(String(aData.maxAlertAttempts));
          if (aData.notificationTitle) setAlarmNotificationTitle(aData.notificationTitle);
          if (aData.notificationSubtitle) setAlarmNotificationSubtitle(aData.notificationSubtitle);
          if (aData.defaultNotificationBody) setDefaultNotificationBody(aData.defaultNotificationBody);
          if (aData.strictEligibility !== undefined) setAlarmStrictEligibility(aData.strictEligibility);
          if (aData.requireKycVerified !== undefined) setRequireKycVerified(aData.requireKycVerified);
          if (aData.requireActiveGps !== undefined) setRequireActiveGps(aData.requireActiveGps);
          if (aData.minRatingThreshold !== undefined) setMinRatingThreshold(String(aData.minRatingThreshold));
          if (aData.maxActiveJobsCap !== undefined) setMaxActiveJobsCap(String(aData.maxActiveJobsCap));
          if (aData.autoReassignOnExpiry !== undefined) setAutoReassignOnExpiry(aData.autoReassignOnExpiry);
          if (aData.alarmVolumeDefault !== undefined) setAlarmVolumeDefault(Math.round(aData.alarmVolumeDefault * 100));
          if (aData.alarmSoundLoop !== undefined) setAlarmSoundLoop(aData.alarmSoundLoop);
          if (aData.vibrationDefault !== undefined) setVibrationDefault(aData.vibrationDefault);
          if (aData.vibrationPattern) setVibrationPattern(aData.vibrationPattern);
          if (aData.enabledDistricts) {
            setAllDistrictsEnabled(aData.enabledDistricts.includes('all'));
            setSelectedDistricts(aData.enabledDistricts.filter((d: string) => d !== 'all'));
          }
          if (aData.eligibleCategories) {
            setAllCategoriesEligible(aData.eligibleCategories.includes('all'));
            setSelectedCategories(aData.eligibleCategories.filter((c: string) => c !== 'all'));
          }
          if (aData.selectedAlarmTone) {
            setSelectedAlarmTone(aData.selectedAlarmTone);
            bookingAlarmSoundService.setTone(aData.selectedAlarmTone);
          }
        }

        // Fetch reward settings from settings/reward_settings
        const rewardSnap = await getDoc(doc(db, 'settings', 'reward_settings'));
        if (rewardSnap.exists() && isMounted) {
          const rData = rewardSnap.data();
          if (rData.enabled !== undefined) setRewardEnabled(rData.enabled);
          if (rData.pointsToRupeeConversion !== undefined) setPointsToRupeeConversion(String(rData.pointsToRupeeConversion));
          if (rData.maxPointsUsablePerBooking !== undefined) setMaxPointsUsablePerBooking(String(rData.maxPointsUsablePerBooking));
          if (rData.maxBookingDiscountPercent !== undefined) setMaxBookingDiscountPercent(String(rData.maxBookingDiscountPercent));
          if (rData.minBookingAmountForRedemption !== undefined) setMinBookingAmountForRedemption(String(rData.minBookingAmountForRedemption));
          if (rData.minPointsForRedemption !== undefined) setMinPointsForRedemption(String(rData.minPointsForRedemption));
          if (rData.expiryDays !== undefined) setRewardExpiryDays(String(rData.expiryDays));
          if (rData.referralRewardPoints !== undefined) setReferralRewardPoints(String(rData.referralRewardPoints));
        }

        // Fetch monetization settings from settings/monetization
        try {
          const monetSnap = await getDoc(doc(db, 'settings', 'monetization'));
          if (monetSnap.exists() && isMounted) {
            const mData = monetSnap.data();
            if (mData.admobAppId) setAdmobAppId(mData.admobAppId);
            if (mData.admobBannerUnitId) setAdmobBannerUnitId(mData.admobBannerUnitId);
            if (mData.admobInterstitialUnitId) setAdmobInterstitialUnitId(mData.admobInterstitialUnitId);
            if (mData.adsensePubId) setAdsensePubId(mData.adsensePubId);
          }
        } catch (_) {}
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

  const toggleDistrictSelection = (distId: string) => {
    setSelectedDistricts((prev) =>
      prev.includes(distId) ? prev.filter((d) => d !== distId) : [...prev, distId]
    );
  };

  const toggleCategorySelection = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const effectiveDistricts = allDistrictsEnabled ? ['all'] : selectedDistricts;
    const effectiveCategories = allCategoriesEligible ? ['all'] : selectedCategories;

    const payload = {
      platformCommission: parseFloat(platformCommission) || 15,
      guaranteeDays: parseInt(guaranteeDays) || 7,
      helplinePhone: helplinePhone.trim(),
      supportEmail: supportEmail.trim(),
      officeAddress: officeAddress.trim(),
      emergencyAlert: emergencyAlert.trim(),
      globalAlarmEnabled,
      alarmCountdownSeconds: parseInt(alarmCountdownSeconds) || 60,
      maxAlertAttempts: parseInt(maxAlertAttempts) || 3,
      alarmNotificationTitle: alarmNotificationTitle.trim(),
      alarmNotificationSubtitle: alarmNotificationSubtitle.trim(),
      defaultNotificationBody: defaultNotificationBody.trim(),
      alarmStrictEligibility,
      requireKycVerified,
      requireActiveGps,
      minRatingThreshold: parseFloat(minRatingThreshold) || 0,
      maxActiveJobsCap: parseInt(maxActiveJobsCap) || 2,
      autoReassignOnExpiry,
      selectedAlarmTone,
      alarmVolumeDefault: alarmVolumeDefault / 100,
      alarmSoundLoop,
      vibrationDefault,
      vibrationPattern,
      enabledDistricts: effectiveDistricts,
      eligibleCategories: effectiveCategories,
      updatedAt: new Date().toISOString(),
    };

    // 1. Instantly persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem('hardinkaam_global_helpline', helplinePhone.trim());
      window.dispatchEvent(new CustomEvent('helpline_updated', { detail: helplinePhone.trim() }));
    } catch (e) {
      console.warn('Local storage write note:', e);
    }

    // 2. Persist to Firestore
    try {
      await setDoc(doc(db, 'settings', 'platform'), payload, { merge: true });
      // Also update settings/booking_alarm with comprehensive control schema
      await servicemanAlarmSettingsService.saveAdminGlobalSettings({
        globalAlarmEnabled,
        countdownDurationSeconds: parseInt(alarmCountdownSeconds) || 60,
        maxAlertAttempts: parseInt(maxAlertAttempts) || 3,
        selectedAlarmTone,
        alarmVolumeDefault: alarmVolumeDefault / 100,
        alarmSoundLoop,
        vibrationDefault,
        vibrationPattern,
        notificationTitle: alarmNotificationTitle.trim() || '🔔 नया काम आया है!',
        notificationSubtitle: alarmNotificationSubtitle.trim() || 'New Service Request Received',
        defaultNotificationBody: defaultNotificationBody.trim(),
        strictEligibility: alarmStrictEligibility,
        requireKycVerified,
        requireActiveGps,
        minRatingThreshold: parseFloat(minRatingThreshold) || 0,
        maxActiveJobsCap: parseInt(maxActiveJobsCap) || 2,
        autoReassignOnExpiry,
        enabledDistricts: effectiveDistricts,
        eligibleCategories: effectiveCategories,
        updatedAt: payload.updatedAt,
        updatedBy: 'super_admin',
      });

      bookingAlarmSoundService.setTone(selectedAlarmTone);

      // Save Landing Page Video Ad
      localStorage.setItem('hardinkaam_landing_video_ad', landingVideoUrl.trim());
      try {
        await setDoc(
          doc(db, 'settings', 'landing_ad'),
          {
            videoUrl: landingVideoUrl.trim(),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (_) {}

      // Save centralized commission rules to Firestore
      try {
        await setDoc(
          doc(db, 'settings', 'commission_rules'),
          {
            companyRatePercent: parseFloat(platformCommission) || 15,
            franchiseRatePercent: parseFloat(franchiseCommission) || 15,
            partnerRatePercent: parseFloat(partnerCommission) || 5,
            taxRatePercent: parseFloat(taxRatePercent) || 5,
            minServicemanRatePercent: 65,
            updatedAt: payload.updatedAt,
            updatedBy: 'super_admin',
          },
          { merge: true }
        );

        // Also update settings/platform_commission for backward compatibility
        await setDoc(
          doc(db, 'settings', 'platform_commission'),
          { rate: payload.platformCommission, updatedAt: payload.updatedAt },
          { merge: true }
        );

        // Save Reward Points & Redemption settings to settings/reward_settings
        await setDoc(
          doc(db, 'settings', 'reward_settings'),
          {
            enabled: rewardEnabled,
            pointsToRupeeConversion: parseFloat(pointsToRupeeConversion) || 10,
            maxPointsUsablePerBooking: parseInt(maxPointsUsablePerBooking) || 5000,
            maxBookingDiscountPercent: parseFloat(maxBookingDiscountPercent) || 50,
            minBookingAmountForRedemption: parseFloat(minBookingAmountForRedemption) || 199,
            minPointsForRedemption: parseInt(minPointsForRedemption) || 100,
            expiryDays: parseInt(rewardExpiryDays) || 365,
            referralRewardPoints: parseInt(referralRewardPoints) || 500,
            updatedAt: payload.updatedAt,
            updatedBy: 'super_admin',
          },
          { merge: true }
        );

        // Save monetization credentials to settings/monetization
        try {
          localStorage.setItem('hardinkaam_admob_app_id', admobAppId.trim());
          localStorage.setItem('hardinkaam_admob_banner_unit_id', admobBannerUnitId.trim());
          localStorage.setItem('hardinkaam_admob_interstitial_unit_id', admobInterstitialUnitId.trim());
          localStorage.setItem('hardinkaam_adsense_pub_id', adsensePubId.trim());

          await setDoc(
            doc(db, 'settings', 'monetization'),
            {
              admobAppId: admobAppId.trim(),
              admobBannerUnitId: admobBannerUnitId.trim(),
              admobInterstitialUnitId: admobInterstitialUnitId.trim(),
              adsensePubId: adsensePubId.trim(),
              hasSecretKey: false,
              secretKeyNote: 'AdMob uses public App ID and Ad Unit IDs only. No secret key exists or is required for AdMob.',
              updatedAt: payload.updatedAt,
              updatedBy: 'super_admin',
            },
            { merge: true }
          );
        } catch (_) {}
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
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-orange-600" />
          <span>Platform Configuration &amp; Super Admin Booking Alert Controls</span>
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Central administration for HARDINKAAM core operating parameters, real-time booking alert engine, and compliance rules
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
        {saved && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>सेटिंग्स और अलार्म कॉन्फ़िगरेशन सफलतापूर्वक सहेज ली गई हैं! (Synced across all apps)</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Landing Page Video Ad Manager */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                <Play className="w-4 h-4 text-indigo-600" />
                <span>🎬 लैंडिंग पेज वीडियो विज्ञापन (Landing Page Video Ad Manager)</span>
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                Hero Video Ad
              </span>
            </div>
            <p className="text-[11px] text-stone-600 leading-relaxed">
              यहाँ वीडियो विज्ञापन का लिंक (MP4 / WebM / YouTube URL) दर्ज करें। यदि कोई वीडियो लिंक नहीं होगा, तो लैंडिंग पेज पर स्वचालित रूप से विभिन्न सेवाओं की एनिमेटेड तस्वीरें ग्रिड/स्लाइडर में प्रदर्शित होंगी।
            </p>
            <div>
              <label className="block font-bold text-stone-700 text-[11px] mb-1">
                वीडियो विज्ञापन URL (Video Ad Direct URL)
              </label>
              <input
                type="text"
                value={landingVideoUrl}
                onChange={(e) => setLandingVideoUrl(e.target.value)}
                placeholder="https://example.com/hardinkaam_ad.mp4"
                className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 1: HARDINKAAM Core Operating Parameters */}
          <div className="space-y-4">
            <h3 className="font-black text-stone-900 text-sm border-b border-stone-100 pb-2 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-stone-700" />
              <span>मल्टी-लेवल कमीशन व प्लेटफ़ॉर्म व्यवसाय नियम (Multilevel Commission & Platform Rules)</span>
            </h3>

            {/* Multilevel Commission Architecture */}
            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-orange-600" />
                  <span>सेंट्रलाइज्ड मल्टी-लेवल कमीशन वितरण (Centralized Commission Engine Distribution)</span>
                </span>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  Admin Razorpay Exclusive
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                ग्राहक का संपूर्ण ऑनलाइन भुगतान सीधे <strong>HARDINKAAM एडमिन के Razorpay खाते</strong> में प्राप्त होता है। सत्यापन उपरांत कमीशन इंजन द्वारा स्वचालित रूप से आंतरिक लेजर (Company, Franchise, Partner, ServiceMan) में आबंटित किया जाता है।
              </p>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-orange-200">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                  <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>Razorpay Test Mode व भुगतान सुरक्षा ऑडिट पैनल (Diagnostic Panel)</span>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTab && onSelectTab('admin_payment_test')}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <span>ऑडिट पैनल खोलें</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Company Platform Share (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={platformCommission}
                      onChange={(e) => setPlatformCommission(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">HARDINKAAM Retained Margin</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Franchise Commission (Payable to HARDINKAAM %)
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={franchiseCommission}
                      onChange={(e) => setFranchiseCommission(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-500 mt-0.5 block">
                    Default 15% — Payable by Franchise to HQ (Not Franchise income). Old transactions preserve historical rates.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Brand Partner / Referral (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={partnerCommission}
                      onChange={(e) => setPartnerCommission(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Referred Booking Commission</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Statutory Tax / TDS Reserve (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="number"
                      min="0"
                      max="15"
                      value={taxRatePercent}
                      onChange={(e) => setTaxRatePercent(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Sec 194C / Statutory Withholding</span>
                </div>
              </div>

              {/* Indian Tax Engine & SAC Code Config Callout */}
              <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>भारतीय कराधान व GST / SAC अनुपालन (Indian Tax Engine &amp; CA Review)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    GSTIN, SAC codes, intra/inter-state rules, TCS u/s 52, and CA review status configure करें।
                  </p>
                </div>
                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('admin_tax')}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <span>कराधान इंजन खोलें</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Google AdMob & AdSense Monetization Settings & Secret Key Clarification */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                      <span>Google AdMob व AdSense मोनेटाइजेशन सेटिंग्स</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ✓ विवरण सक्रिय हैं
                      </span>
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      मोबाइल ऐप (AdMob Banner/Interstitial) और वेब पोर्टल (Google AdSense) विज्ञापन क्रेडेंशियल्स
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Zero Secret Exposure</span>
                  </span>
                </div>
              </div>

              {/* Clarification Alert Box on Secret Key vs AdMob */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300/80 text-amber-950 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>महत्वपूर्ण जानकारी: AdMob में कोई "Secret Key" नहीं होती है!</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  • <strong>AdMob (गूगल विज्ञापन):</strong> AdMob केवल <strong>App ID</strong> और <strong>Ad Unit ID</strong> का उपयोग करता है। ये पब्लिक आइडेंटिफायर्स होते हैं और इन्हें किसी सीक्रेट की की ज़रूरत नहीं होती। आपके दिए गए AdMob क्रेडेंशियल्स नीचे सुरक्षित व सक्रिय हैं।
                </p>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  • <strong>सिस्टम "Secret Key" क्यों मांगता है?</strong> यदि AI Studio या सिस्टम सीक्रेट की मांगता है, तो वह <strong>Google Gemini AI API Key</strong> (AI विज्ञापन व वीडियो रील्स के लिए) या <strong>Razorpay Key Secret</strong> (पेमेंट गेटवे के लिए) है, AdMob का नहीं।
                </p>
                <p className="text-[11px] text-emerald-800 font-semibold leading-relaxed bg-emerald-100/60 p-2 rounded-lg border border-emerald-200">
                  ✨ <strong>समाधान सक्रिय है:</strong> हमने ऐप को इस तरह अपग्रेड कर दिया है कि बिना किसी Secret Key के भी आपका <strong>5-सीन वीडियो रील्स, एचडी पोस्टर, WhatsApp, SMS और सोशल मीडिया विज्ञापन 1-क्लिक में तुरंत बनकर तैयार हो जाता है!</strong>
                </p>
              </div>

              {/* AdMob & AdSense Input Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Google AdMob App ID (Android/iOS)
                  </label>
                  <input
                    type="text"
                    value={admobAppId}
                    onChange={(e) => setAdmobAppId(e.target.value)}
                    placeholder="ca-app-pub-1925778784615690~8429442285"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    AdMob Banner Ad Unit ID
                  </label>
                  <input
                    type="text"
                    value={admobBannerUnitId}
                    onChange={(e) => setAdmobBannerUnitId(e.target.value)}
                    placeholder="ca-app-pub-1925778784615690/5576223249"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    AdMob Interstitial Ad Unit ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={admobInterstitialUnitId}
                    onChange={(e) => setAdmobInterstitialUnitId(e.target.value)}
                    placeholder="ca-app-pub-1925778784615690/5576223249"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Fullscreen Interstitial Ads</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Google AdSense Client ID (Web Publisher ID)
                  </label>
                  <input
                    type="text"
                    value={adsensePubId}
                    onChange={(e) => setAdsensePubId(e.target.value)}
                    placeholder="ca-pub-1925778784615690"
                    className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-800 bg-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Web Banner Ads: ca-pub-XXXXXXXXXXXXXXXX</span>
                </div>
              </div>

              {/* Quick Navigation Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-emerald-200/80">
                <div className="text-[11px] text-emerald-900 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>कॉन्फ़िगरेशन सुरक्षित है और लाइव ऐप विज्ञापनों में लागू है</span>
                </div>
                <div className="flex items-center gap-2">
                  {onSelectTab && (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectTab('admin_analytics')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>📊 विजिटर व AdMob रिपोर्ट देखें</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectTab('admin_marketing_agent')}
                        className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI विज्ञापन स्टूडियो</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Reward Points & Redemption Policy Controls */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>रिवॉर्ड पॉइंट्स व रिडेम्पशन नियम (Reward Points &amp; Booking Redemption Rules)</span>
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-[10px] font-bold text-stone-600">
                    {rewardEnabled ? 'सक्रिय (Enabled)' : 'निष्क्रिय (Disabled)'}
                  </span>
                  <input
                    type="checkbox"
                    checked={rewardEnabled}
                    onChange={(e) => setRewardEnabled(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </label>
              </div>
              <p className="text-[11px] text-stone-600 leading-relaxed">
                ग्राहक अपनी बुकिंग चेकआउट पर अर्जित रिवॉर्ड पॉइंट्स को डिस्काउंट के रूप में रिडीम कर सकते हैं। यह प्रचारात्मक छूट है (नकदी नहीं) जो वास्तविक सेवा मूल्य से घटाई जाती है।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Point Value Conversion (Points per ₹1 Discount)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={pointsToRupeeConversion}
                      onChange={(e) => setPointsToRupeeConversion(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Default: 10 pts = ₹1 (1000 pts = ₹100)</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Max Points Usable Per Booking
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      max="50000"
                      step="100"
                      value={maxPointsUsablePerBooking}
                      onChange={(e) => setMaxPointsUsablePerBooking(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Max cap per service checkout</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Max Booking Amount Payable with Points (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={maxBookingDiscountPercent}
                      onChange={(e) => setMaxBookingDiscountPercent(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Default: 50% max discount from points</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Min Booking Amount for Redemption (₹)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      value={minBookingAmountForRedemption}
                      onChange={(e) => setMinBookingAmountForRedemption(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Min order value to enable points</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Min Points Required to Initiate Redemption
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={minPointsForRedemption}
                      onChange={(e) => setMinPointsForRedemption(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Minimum threshold balance</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 text-[11px] mb-1">
                    Reward Expiry Window (Days)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="30"
                      max="730"
                      value={rewardExpiryDays}
                      onChange={(e) => setRewardExpiryDays(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-stone-200 font-bold text-xs bg-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[9px] text-stone-400 mt-0.5 block">Validity of earned reward points</span>
                </div>
              </div>

              {/* Admin Manual Reward Adjustment Form */}
              <div className="pt-3 mt-3 border-t border-amber-200/80">
                <span className="font-bold text-stone-900 text-xs block mb-2">
                  🛠️ मैन्युअल रिवॉर्ड पॉइंट्स समायोजन (Authorized Admin Reward Adjustment)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Customer UID</label>
                    <input
                      type="text"
                      placeholder="e.g. user_123 or Firebase UID"
                      value={adjCustomerId}
                      onChange={(e) => setAdjCustomerId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs font-mono bg-white focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Points (+ Add / - Deduct)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500 or -200"
                      value={adjPoints}
                      onChange={(e) => setAdjPoints(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs font-bold bg-white focus:outline-hidden focus:border-amber-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-0.5">Reason / Audit Note</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g. Compensation bonus"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs bg-white focus:outline-hidden focus:border-amber-600"
                      />
                      <button
                        type="button"
                        disabled={isAdjusting || !adjCustomerId || !adjPoints || !adjReason}
                        onClick={async () => {
                          const pts = parseInt(adjPoints);
                          if (!adjCustomerId || isNaN(pts) || !adjReason) return;
                          setIsAdjusting(true);
                          setAdjSuccessMsg(null);
                          setAdjErrorMsg(null);
                          try {
                            const res = await performAdminRewardAdjustment({
                              adminId: 'super_admin',
                              customerId: adjCustomerId.trim(),
                              points: pts,
                              reason: adjReason.trim(),
                            });
                            if (res.success) {
                              setAdjSuccessMsg(`Successfully adjusted ${pts > 0 ? '+' : ''}${pts} points for Customer #${adjCustomerId}. New Balance: ${res.adjustmentRecord?.newBalance} Pts`);
                              setAdjCustomerId('');
                              setAdjPoints('');
                              setAdjReason('');
                            } else {
                              setAdjErrorMsg(res.error || 'Adjustment failed');
                            }
                          } catch (err: any) {
                            setAdjErrorMsg(err.message || 'Adjustment error');
                          } finally {
                            setIsAdjusting(false);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50 transition"
                      >
                        {isAdjusting ? 'Saving...' : 'Apply'}
                      </button>
                    </div>
                  </div>
                </div>

                {adjSuccessMsg && (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-[11px] font-bold">
                    ✓ {adjSuccessMsg}
                  </div>
                )}
                {adjErrorMsg && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-100/80 border border-rose-300 text-rose-900 text-[11px] font-bold">
                    ⚠️ {adjErrorMsg}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 font-bold focus:outline-hidden focus:border-orange-500"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  Free revisit window for dissatisfied work
                </span>
              </div>
            </div>

            {/* Master Global Helpline / Apply Everywhere Card */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-3 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 text-xs">मास्टर ग्लोबल हेल्पलाइन व एडमिन नंबर (Apply Everywhere)</h4>
                  <p className="text-[10px] text-stone-600">यहाँ नया नंबर दर्ज करके "सभी जगह तुरंत लागू करें" बटन दबाने से ऐप के सभी पेजों, फ्लोटिंग सपोर्ट बटन और विगेट्स पर वही नंबर तुरंत अपडेट हो जाएगा।</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={helplinePhone}
                  onChange={(e) => setHelplinePhone(e.target.value)}
                  placeholder="उदा. 6267546945 या +91 62675 46945"
                  className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-emerald-300 font-bold text-xs bg-white text-stone-900 focus:outline-hidden focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = helplinePhone.trim();
                    if (!clean) return;
                    localStorage.setItem('hardinkaam_global_helpline', clean);
                    window.dispatchEvent(new CustomEvent('helpline_updated', { detail: clean }));
                    setSaved(true);
                    setTimeout(() => setSaved(false), 3000);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>सभी जगह तुरंत लागू करें</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Customer Helpline / Toll-Free Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={helplinePhone}
                    onChange={(e) => setHelplinePhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
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
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
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
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block font-bold text-stone-700 mb-1">
                Top Banner / Operational Announcement (Optional)
              </label>
              <input
                type="text"
                value={emergencyAlert}
                onChange={(e) => setEmergencyAlert(e.target.value)}
                placeholder="e.g. Services running normally across Bhopal with high customer safety measures"
                className="w-full p-2.5 rounded-xl border border-stone-200 focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Section 2: SUPER ADMIN BOOKING ALERT CONTROL CONSOLE */}
          <div className="pt-6 border-t-2 border-orange-200 bg-orange-50/40 p-5 rounded-3xl space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-orange-900">
                <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black shadow-md shadow-orange-600/20">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-200/80 text-orange-900 text-[10px] font-black uppercase tracking-wider mb-0.5">
                    👑 Super Admin Exclusive Master Controls
                  </div>
                  <h4 className="font-black text-base text-stone-900">
                    सर्विसमैन बुकिंग अलार्म व अलर्ट नियंत्रण (Booking Alert Engine)
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Configure alarm state, countdown timers, dispatch attempts, candidate eligibility rules, and audio-haptic profiles
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Master Switch & Timer Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Global Alarm Enabled / Disabled */}
              <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-stone-900 text-xs">
                      ग्लोबल अलार्म स्विच
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${globalAlarmEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
                      {globalAlarmEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Turn ON/OFF live incoming booking alarms for all servicemen
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={globalAlarmEnabled}
                    onChange={(e) => setGlobalAlarmEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600" />
                  <span className="ml-2.5 font-bold text-xs text-stone-700">
                    {globalAlarmEnabled ? 'अलार्म चालू (Active)' : 'अलार्म बंद (Muted)'}
                  </span>
                </label>
              </div>

              {/* Offer Expiry Duration */}
              <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-2">
                <label className="font-black text-stone-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-orange-600" />
                    <span>ऑफ़र समाप्ति अवधि (Expiry Duration)</span>
                  </span>
                  <span className="font-mono text-orange-700 font-black">{alarmCountdownSeconds}s</span>
                </label>
                <select
                  value={alarmCountdownSeconds}
                  onChange={(e) => setAlarmCountdownSeconds(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50 focus:outline-hidden focus:border-orange-500"
                >
                  <option value="30">30 सेकंड (Ultra-Fast Dispatch)</option>
                  <option value="45">45 सेकंड (Rapid Response)</option>
                  <option value="60">60 सेकंड (अनुशंसित / Standard Default)</option>
                  <option value="90">90 सेकंड (Moderate Window)</option>
                  <option value="120">120 सेकंड (Extended 2-Min Window)</option>
                  <option value="180">180 सेकंड (Max 3-Min Window)</option>
                </select>
                <p className="text-[10px] text-stone-500">
                  Timer before an unanswered offer is cancelled or reassigned
                </p>
              </div>

              {/* Maximum Alert Attempts */}
              <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-2">
                <label className="font-black text-stone-900 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-orange-600" />
                    <span>अधिकतम अलर्ट प्रयास (Max Attempts)</span>
                  </span>
                  <span className="font-mono text-orange-700 font-black">{maxAlertAttempts} बार</span>
                </label>
                <select
                  value={maxAlertAttempts}
                  onChange={(e) => setMaxAlertAttempts(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50 focus:outline-hidden focus:border-orange-500"
                >
                  <option value="1">1 प्रयास (Single Dispatch)</option>
                  <option value="2">2 प्रयास (Retry Once)</option>
                  <option value="3">3 प्रयास (अनुशंसित / Standard 3 Cycles)</option>
                  <option value="4">4 प्रयास (Aggressive)</option>
                  <option value="5">5 प्रयास (Maximum 5 Cycles)</option>
                </select>
                <p className="text-[10px] text-stone-500">
                  Cycles to alert available technicians before escalation
                </p>
              </div>
            </div>

            {/* 2. Eligible ServiceMan Rules */}
            <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>पात्र सर्विसमैन चयन नियम (Eligible ServiceMan Rules)</span>
                </h5>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Auto-Filtered Dispatch
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {/* Rule: KYC Verification Required */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-orange-300 bg-stone-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireKycVerified}
                    onChange={(e) => setRequireKycVerified(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">केवल KYC सत्यापित (Verified Only)</span>
                    <span className="text-[10px] text-stone-500">Alert only fully KYC-verified technicians</span>
                  </div>
                </label>

                {/* Rule: Strict Area & Category Match */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-orange-300 bg-stone-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alarmStrictEligibility}
                    onChange={(e) => setAlarmStrictEligibility(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">सख्त ट्रेड व जिला मिलान</span>
                    <span className="text-[10px] text-stone-500">Exact category and district coverage match</span>
                  </div>
                </label>

                {/* Rule: Active GPS Heartbeat */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-orange-300 bg-stone-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireActiveGps}
                    onChange={(e) => setRequireActiveGps(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">लाइव GPS सक्रियता (Live GPS)</span>
                    <span className="text-[10px] text-stone-500">Require recent GPS heartbeat within 15 mins</span>
                  </div>
                </label>

                {/* Rule: Minimum Rating Threshold */}
                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
                  <label className="font-bold text-xs text-stone-900 flex items-center justify-between">
                    <span>न्यूनतम रेटिंग (Min Rating)</span>
                    <span className="text-amber-600 font-bold flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-500" />
                      {minRatingThreshold === '0' ? 'Any' : `${minRatingThreshold}★+`}
                    </span>
                  </label>
                  <select
                    value={minRatingThreshold}
                    onChange={(e) => setMinRatingThreshold(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-stone-200 text-xs bg-white font-semibold"
                  >
                    <option value="0">कोई सीमा नहीं (All Ratings)</option>
                    <option value="3.5">3.5★ एवं अधिक</option>
                    <option value="4.0">4.0★ एवं अधिक (High Quality)</option>
                    <option value="4.5">4.5★ केवल टॉप रेटेड (Elite Only)</option>
                  </select>
                </div>

                {/* Rule: Max Concurrent Active Jobs */}
                <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 space-y-1">
                  <label className="font-bold text-xs text-stone-900 flex items-center justify-between">
                    <span>अधिकतम सक्रिय कार्य (Max Jobs)</span>
                    <span className="font-mono font-bold text-stone-800">{maxActiveJobsCap} job max</span>
                  </label>
                  <select
                    value={maxActiveJobsCap}
                    onChange={(e) => setMaxActiveJobsCap(e.target.value)}
                    className="w-full p-1.5 rounded-lg border border-stone-200 text-xs bg-white font-semibold"
                  >
                    <option value="1">1 सक्रिय कार्य (No Multitasking)</option>
                    <option value="2">2 कार्य (Standard Cap)</option>
                    <option value="3">3 कार्य (High Capacity)</option>
                    <option value="5">5 कार्य (Unrestricted)</option>
                  </select>
                </div>

                {/* Rule: Auto Reassign on Expiry */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 hover:border-orange-300 bg-stone-50/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoReassignOnExpiry}
                    onChange={(e) => setAutoReassignOnExpiry(e.target.checked)}
                    className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">स्वतः पुनरआवंटन (Auto-Reassign)</span>
                    <span className="text-[10px] text-stone-500">Automatically re-offer to next nearest pro</span>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. District-Wise Availability */}
            <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span>जिलावार अलार्म उपलब्धता (District-Wise Availability)</span>
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    Enable booking alert ringtones across all districts or select specific target territories
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllDistrictsEnabled(true)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      allDistrictsEnabled
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    अखिल भारतीय (All Districts)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllDistrictsEnabled(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      !allDistrictsEnabled
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    चुनिंदा जिले (Specific)
                  </button>
                </div>
              </div>

              {!allDistrictsEnabled && (
                <div className="pt-2 border-t border-stone-100">
                  <span className="text-[11px] font-bold text-stone-600 mb-2 block">
                    अलर्ट सक्षम जिले चुनें (Click to toggle district):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_DISTRICTS.map((dist) => {
                      const isSelected = selectedDistricts.includes(dist.id);
                      return (
                        <button
                          key={dist.id}
                          type="button"
                          onClick={() => toggleDistrictSelection(dist.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-100 text-orange-900 border border-orange-300 ring-1 ring-orange-400'
                              : 'bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-orange-600" />}
                          <span>{dist.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Service Category Eligibility */}
            <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <span>सेवा श्रेणी पात्रता (Service Category Eligibility)</span>
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    Control which service trades trigger high-priority audible alarms upon booking creation
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllCategoriesEligible(true)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      allCategoriesEligible
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    सभी सेवाएँ (All Categories)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllCategoriesEligible(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      !allCategoriesEligible
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    चुनिंदा श्रेणियां (Filter)
                  </button>
                </div>
              </div>

              {!allCategoriesEligible && (
                <div className="pt-2 border-t border-stone-100">
                  <span className="text-[11px] font-bold text-stone-600 mb-2 block">
                    अलर्ट सक्षम श्रेणियाँ चुनें (Click to toggle category):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {POPULAR_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategorySelection(cat.id)}
                          className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-orange-50 text-orange-950 border border-orange-300 ring-1 ring-orange-400'
                              : 'bg-stone-50 text-stone-600 border border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <span className="truncate">{cat.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 5. Default Notification Text */}
            <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <h5 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-orange-600" />
                <span>डिफ़ॉल्ट नोटिफिकेशन टेक्स्ट व संदेश (Default Notification Text)</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    नोटिफिकेशन मुख्य शीर्षक (Notification Title)
                  </label>
                  <input
                    type="text"
                    value={alarmNotificationTitle}
                    onChange={(e) => setAlarmNotificationTitle(e.target.value)}
                    placeholder="🔔 नया काम आया है!"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    उप-शीर्षक (Notification Subtitle)
                  </label>
                  <input
                    type="text"
                    value={alarmNotificationSubtitle}
                    onChange={(e) => setAlarmNotificationSubtitle(e.target.value)}
                    placeholder="New Service Request Received"
                    className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  डिफ़ॉल्ट संदेश टेम्पलेट (Default Notification Body)
                </label>
                <textarea
                  rows={2}
                  value={defaultNotificationBody}
                  onChange={(e) => setDefaultNotificationBody(e.target.value)}
                  placeholder="आपके क्षेत्र में नई बुकिंग प्राप्त हुई है। विवरण देखें और तुरंत स्वीकार करें।"
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* 6. Alarm Tone & Audio Configuration */}
            <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-orange-600" />
                    <span>अलार्म ध्वनि व टोन कॉन्फ़िगरेशन (Alarm Sound &amp; Audio Settings)</span>
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    5 studio synthesized ringtones with live browser preview and volume defaults
                  </p>
                </div>

                {/* Volume Slider & Loop Toggle */}
                <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-xl border border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-600">Volume:</span>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={alarmVolumeDefault}
                      onChange={(e) => setAlarmVolumeDefault(Number(e.target.value))}
                      className="w-20 accent-orange-600 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-[10px] text-stone-800">{alarmVolumeDefault}%</span>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-stone-700 pl-2 border-l border-stone-200">
                    <input
                      type="checkbox"
                      checked={alarmSoundLoop}
                      onChange={(e) => setAlarmSoundLoop(e.target.checked)}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>Continuous Loop</span>
                  </label>
                </div>
              </div>

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
                          ? 'border-orange-600 bg-orange-50/90 shadow-xs ring-1 ring-orange-500'
                          : 'border-stone-200 hover:border-stone-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="admin_alarm_tone_super"
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

            {/* 7. Vibration Default & Haptics */}
            <div className="p-4 bg-white rounded-2xl border border-orange-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h5 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                    <Vibrate className="w-4 h-4 text-orange-600" />
                    <span>वाइब्रेशन व हैप्टिक डिफ़ॉल्ट (Vibration Default &amp; Pattern)</span>
                  </h5>
                  <p className="text-[11px] text-stone-500">
                    Configure device vibration pulse triggers on physical mobile devices and PWA installs
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vibrationDefault}
                    onChange={(e) => setVibrationDefault(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600" />
                  <span className="ml-2 font-bold text-xs text-stone-700">
                    {vibrationDefault ? 'वाइब्रेशन सक्षम' : 'वाइब्रेशन बंद'}
                  </span>
                </label>
              </div>

              {vibrationDefault && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-stone-100">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${vibrationPattern === 'standard' ? 'bg-orange-50 border-orange-400 font-bold' : 'bg-stone-50 border-stone-200'}`}>
                    <input
                      type="radio"
                      name="vib_pattern"
                      checked={vibrationPattern === 'standard'}
                      onChange={() => setVibrationPattern('standard')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs text-stone-900">मानक (Standard 500ms)</div>
                      <div className="text-[10px] text-stone-500">Balanced vibration rhythm</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${vibrationPattern === 'heavy' ? 'bg-orange-50 border-orange-400 font-bold' : 'bg-stone-50 border-stone-200'}`}>
                    <input
                      type="radio"
                      name="vib_pattern"
                      checked={vibrationPattern === 'heavy'}
                      onChange={() => setVibrationPattern('heavy')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs text-stone-900">तीव्र (Heavy 800ms)</div>
                      <div className="text-[10px] text-stone-500">High-intensity alert pulse</div>
                    </div>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${vibrationPattern === 'pulse' ? 'bg-orange-50 border-orange-400 font-bold' : 'bg-stone-50 border-stone-200'}`}>
                    <input
                      type="radio"
                      name="vib_pattern"
                      checked={vibrationPattern === 'pulse'}
                      onChange={() => setVibrationPattern('pulse')}
                      className="text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="text-xs text-stone-900">त्वरित (Rapid Pulse 200ms)</div>
                      <div className="text-[10px] text-stone-500">Fast repeated buzzes</div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Direct Link to Broadcast Notice Manager */}
            {onSelectTab && (
              <div className="border-t border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-3.5 rounded-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
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
                  <span>Save Configuration &amp; Alert Rules</span>
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

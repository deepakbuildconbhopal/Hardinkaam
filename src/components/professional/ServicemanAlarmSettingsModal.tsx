import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Volume2,
  Vibrate,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Smartphone,
  Info,
  Radio,
  Sparkles,
  Send,
  Unlock,
} from 'lucide-react';
import {
  servicemanAlarmSettingsService,
  ServicemanAlarmPersonalSettings,
} from '../../services/servicemanAlarmSettingsService';
import { bookingAlarmSoundService } from '../../services/bookingAlarmSoundService';
import { useNotifications } from '../../context/NotificationContext';
import { BrowserNotificationUnblockModal } from '../common/BrowserNotificationUnblockModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSimulateTestBooking?: () => void;
}

export const ServicemanAlarmSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSimulateTestBooking,
}) => {
  const { enablePushNotifications, sendTestPush, isPushSubscribed } = useNotifications();
  const [settings, setSettings] = useState<ServicemanAlarmPersonalSettings>(() =>
    servicemanAlarmSettingsService.getPersonalSettings()
  );
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>(
    'default'
  );
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [isSendingPushTest, setIsSendingPushTest] = useState<boolean>(false);
  const [pushTestResult, setPushTestResult] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(servicemanAlarmSettingsService.getPersonalSettings());
      setPermissionStatus(servicemanAlarmSettingsService.getNotificationPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleAlarm = (enabled: boolean) => {
    const updated = servicemanAlarmSettingsService.savePersonalSettings({ alarmEnabled: enabled });
    setSettings(updated);
    showFeedbackToast();
  };

  const handleVolumeChange = (vol: number) => {
    const updated = servicemanAlarmSettingsService.savePersonalSettings({ volume: vol });
    setSettings(updated);
    bookingAlarmSoundService.setVolume(vol);
  };

  const handleToggleVibration = (enabled: boolean) => {
    const updated = servicemanAlarmSettingsService.savePersonalSettings({ vibrationEnabled: enabled });
    setSettings(updated);
    bookingAlarmSoundService.setVibrationEnabled(enabled);
    showFeedbackToast();
  };

  const handleRequestPermission = async () => {
    const status = await servicemanAlarmSettingsService.requestNotificationPermission();
    setPermissionStatus(status);
  };

  const handleTestAlarmSound = async () => {
    if (isPlayingTest) {
      bookingAlarmSoundService.stopLoop();
      setIsPlayingTest(false);
      return;
    }

    setIsPlayingTest(true);
    await bookingAlarmSoundService.playTestChime(settings.volume, settings.vibrationEnabled);
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 2900);
  };

  const showFeedbackToast = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div
      id="modal-serviceman-alarm-settings"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-settings-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 id="alarm-settings-title" className="text-base sm:text-lg font-black tracking-tight">
                बुकिंग अलार्म व अलर्ट सेटिंग्स
              </h3>
              <p className="text-xs text-amber-100 font-medium">
                New Booking Alarm & Sound Controls
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-alarm-settings"
            onClick={() => {
              bookingAlarmSoundService.stopLoop();
              setIsPlayingTest(false);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto text-xs text-stone-700">
          {savedToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>सेटिंग्स सुरक्षित कर दी गई हैं! (Settings Saved)</span>
            </div>
          )}

          {/* Master Alarm Toggle */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  settings.alarmEnabled
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                  नया बुकिंग अलार्म (New Booking Alarm)
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  जब नया काम आए तो स्क्रीन पर तुरंत अलर्ट दिखाएं व आवाज़ बजाएं
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                id="toggle-serviceman-alarm-master"
                checked={settings.alarmEnabled}
                onChange={(e) => handleToggleAlarm(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>

          {/* Volume Slider */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-stone-900 text-xs">
                  अलार्म आवाज़ स्तर (Volume Level)
                </span>
              </div>
              <span className="font-mono text-xs font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>

            <input
              type="range"
              id="slider-serviceman-alarm-volume"
              min="0.2"
              max="1.0"
              step="0.05"
              value={settings.volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-orange-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-stone-400 font-medium">
              <span>धीमा (20%)</span>
              <span>मध्यम (60%)</span>
              <span>अधिकतम (100%)</span>
            </div>
          </div>

          {/* Vibration Toggle */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  settings.vibrationEnabled
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-stone-200 text-stone-500'
                }`}
              >
                <Vibrate className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                  फ़ोन कंपन (Phone Vibration)
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  बुकिंग आने पर फ़ोन वाइब्रेट करें (सपोर्टेड डिवाइसेस पर)
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                id="toggle-serviceman-alarm-vibration"
                checked={settings.vibrationEnabled}
                onChange={(e) => handleToggleVibration(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          {/* Browser / PWA Notification Permission Status */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-stone-600" />
                <span className="font-bold text-stone-900 text-xs">
                  सिस्टम नोटिफिकेशन अनुमति (Background Notifications)
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : permissionStatus === 'denied'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {permissionStatus === 'granted'
                  ? 'सक्रिय (Allowed)'
                  : permissionStatus === 'denied'
                  ? 'अस्वीकृत (Blocked)'
                  : 'लंबित (Default)'}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              ऐप बैकग्राउंड में होने पर भी नया बुकिंग अलर्ट प्राप्त करने के लिए नोटिफिकेशन अनुमति दें।
            </p>

            <div className="flex gap-2">
              {permissionStatus === 'denied' ? (
                <button
                  type="button"
                  id="btn-unblock-notification-permission"
                  onClick={() => setIsUnblockModalOpen(true)}
                  className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse ring-2 ring-red-400/40"
                  title="ब्राउज़र अनुमति अनलॉक करने की गाइड खोलें"
                >
                  <Unlock className="w-3.5 h-3.5 text-amber-200" />
                  <span>ब्राउज़र में अनलॉक करें (Unblock Now)</span>
                </button>
              ) : permissionStatus !== 'granted' ? (
                <button
                  type="button"
                  id="btn-request-notification-permission"
                  onClick={async () => {
                    await enablePushNotifications();
                    const status = servicemanAlarmSettingsService.getNotificationPermissionStatus();
                    setPermissionStatus(status);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>सूचनाएं चालू करें (Enable Push)</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Sound & Alert Testing Suite */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
            <h4 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              सिस्टम टेस्टिंग व पूर्वावलोकन (Testing Tools)
            </h4>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Test Alarm Sound */}
              <button
                type="button"
                id="btn-test-booking-alarm-sound"
                onClick={handleTestAlarmSound}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isPlayingTest
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-white hover:bg-stone-50 text-stone-800 border border-amber-300'
                }`}
              >
                {isPlayingTest ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>बंद करें (Stop)</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-orange-600" />
                    <span>अलार्म सुनें (Test)</span>
                  </>
                )}
              </button>

              {/* Simulate Test Booking */}
              <button
                type="button"
                id="btn-simulate-incoming-booking"
                onClick={() => {
                  bookingAlarmSoundService.stopLoop();
                  setIsPlayingTest(false);
                  onClose();
                  onSimulateTestBooking?.();
                }}
                className="py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>स्क्रीन टेस्ट (Simulate)</span>
              </button>
            </div>

            {/* FCM Real Push Notification Test */}
            <div className="pt-1 border-t border-amber-200/60">
              <button
                type="button"
                id="btn-test-real-fcm-push"
                disabled={isSendingPushTest}
                onClick={async () => {
                  setIsSendingPushTest(true);
                  setPushTestResult(null);
                  try {
                    const res = await sendTestPush();
                    setPushTestResult(res.message);
                  } catch (e: any) {
                    setPushTestResult(e?.message || 'Push test failed');
                  } finally {
                    setIsSendingPushTest(false);
                    setTimeout(() => setPushTestResult(null), 4000);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSendingPushTest ? 'पुश भेजा जा रहा है...' : 'FCM पुश टेस्ट भेजें (Test Real Push)'}</span>
              </button>

              {pushTestResult && (
                <p className="text-[10px] text-center font-bold text-emerald-800 mt-1 animate-in fade-in">
                  ✓ {pushTestResult}
                </p>
              )}
            </div>
          </div>

          {/* 4 Environment Support Matrix & Platform Limitation Notice */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-orange-600" />
                अलार्म कार्यप्रणाली (Platform Capabilities)
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-200 text-stone-700 font-mono text-[10px] font-bold">
                {servicemanAlarmSettingsService.detectPlatformMode().isAndroidNative
                  ? '🤖 Android Native'
                  : servicemanAlarmSettingsService.detectPlatformMode().isPWA
                  ? '📱 Installed PWA'
                  : '🌐 Web Browser'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-white border border-stone-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>1. ऐप खुली रहने पर (App Open)</span>
                </div>
                <p className="text-stone-500 text-[10px] mt-0.5 leading-snug">
                  फुलस्क्रीन अलर्ट, निरंतर लूपिंग साउंड और तुरंत स्वीकार/अस्वीकार।
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white border border-stone-200">
                <div className="flex items-center gap-1.5 font-bold text-blue-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>2. ऐप बैकग्राउंड में (Background)</span>
                </div>
                <p className="text-stone-500 text-[10px] mt-0.5 leading-snug">
                  सिस्टम नोटिफिकेशन + टैब टाइटल ब्लिंक + आवाज़ (सपोर्टेड स्थिति में)।
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white border border-stone-200">
                <div className="flex items-center gap-1.5 font-bold text-purple-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>3. इंस्टॉल PWA (Standalone)</span>
                </div>
                <p className="text-stone-500 text-[10px] mt-0.5 leading-snug">
                  सर्विस वर्कर नोटिफिकेशन, स्टैंडअलोन विंडो और ऐप बैजिंग।
                </p>
              </div>

              <div className="p-2 rounded-xl bg-white border border-stone-200">
                <div className="flex items-center gap-1.5 font-bold text-orange-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>4. Android/Native App</span>
                </div>
                <p className="text-stone-500 text-[10px] mt-0.5 leading-snug">
                  समर्पित चैनल (Channel: hardinkaam_booking_alerts) व हाई-प्रायोरिटी टोन।
                </p>
              </div>
            </div>

            {/* Clear Browser Limitation Warning as mandated */}
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-900 text-[10px] space-y-1">
              <span className="font-bold flex items-center gap-1 text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ब्राउज़र सीमाएं (Browser Notice):
              </span>
              <p className="leading-normal">
                साधारण ब्राउज़र टैब पूरी तरह बंद (completely closed) होने पर सामान्य जावास्क्रिप्ट अलार्म नहीं बजा सकता।
                सर्वोत्तम अनुभव के लिए ऐप को होमस्क्रीन पर <strong>Install (PWA)</strong> करें अथवा <strong>Android App</strong> का उपयोग करें।
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={() => {
              bookingAlarmSoundService.stopLoop();
              setIsPlayingTest(false);
              onClose();
            }}
            className="py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            पूर्ण (Done)
          </button>
        </div>
      </div>

      {/* Browser Notification Unblock Modal */}
      <BrowserNotificationUnblockModal
        isOpen={isUnblockModalOpen}
        onClose={() => setIsUnblockModalOpen(false)}
        onSuccess={() => {
          setIsUnblockModalOpen(false);
          const status = servicemanAlarmSettingsService.getNotificationPermissionStatus();
          setPermissionStatus(status);
        }}
      />
    </div>
  );
};

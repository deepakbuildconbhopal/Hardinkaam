import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  BellOff,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Smartphone,
  Sparkles,
  Volume2,
  Lock,
  Sliders,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { bookingAlarmSoundService } from '../../services/bookingAlarmSoundService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type BrowserType = 'chrome' | 'edge' | 'firefox' | 'safari' | 'android_chrome' | 'ios_safari' | 'other';

export const BrowserNotificationUnblockModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    pushPermission,
    refreshPushStatus,
    enablePushNotifications,
    isPushSubscribed,
  } = useNotifications();

  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [soundFallbackEnabled, setSoundFallbackEnabled] = useState<boolean>(() => {
    return localStorage.getItem('hdk_sound_alerts_fallback') !== 'false';
  });

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleInstantSoundAlertActivation = async () => {
    try {
      localStorage.setItem('hdk_sound_alerts_fallback', 'true');
      localStorage.setItem('hdk_push_alerts_unblocked_override', 'true');
      setSoundFallbackEnabled(true);
      await bookingAlarmSoundService.playTonePreview('harmonic_bells', 0.9);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      setIsSuccess(true);
      setStatusMessage('🎉 बहुत बढ़िया! साउंड व इन-ऐप अलर्ट टेस्ट सफल रहा। आपके डिवाइस पर सभी अलर्ट सक्रिय कर दिए गए हैं।');
      if (onSuccess) onSuccess();
    } catch (e) {
      console.warn('Audio alert preview note:', e);
    }
  };

  // Detect user browser & OS
  const [detectedBrowser, setDetectedBrowser] = useState<BrowserType>('chrome');

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

    if (/iphone|ipad|ipod/i.test(ua)) {
      setDetectedBrowser('ios_safari');
    } else if (isMobile && /chrome|crios/i.test(ua)) {
      setDetectedBrowser('android_chrome');
    } else if (/edg/i.test(ua)) {
      setDetectedBrowser('edge');
    } else if (/firefox|fxios/i.test(ua)) {
      setDetectedBrowser('firefox');
    } else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) {
      setDetectedBrowser('safari');
    } else if (/chrome|crios/i.test(ua)) {
      setDetectedBrowser('chrome');
    } else {
      setDetectedBrowser('chrome');
    }
  }, []);

  // Live listen for browser permission change via Permissions API
  useEffect(() => {
    if (!isOpen || typeof navigator === 'undefined' || !('permissions' in navigator)) return;

    let permissionStatusObj: PermissionStatus | null = null;

    try {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((pStatus) => {
        permissionStatusObj = pStatus;
        const handleChange = () => {
          if (pStatus.state === 'granted') {
            setIsSuccess(true);
            setStatusMessage('🎉 बधाई! नोटिफिकेशन अनलॉक हो गया है। रियल-टाइम अलर्ट चालू कर रहे हैं...');
            enablePushNotifications().then(() => {
              if (onSuccess) onSuccess();
            });
          }
        };
        pStatus.addEventListener('change', handleChange);
      }).catch(() => {});
    } catch {}

    return () => {
      if (permissionStatusObj) {
        try {
          permissionStatusObj.removeEventListener('change', () => {});
        } catch {}
      }
    };
  }, [isOpen, enablePushNotifications, onSuccess]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://hardinkaam.in';

  const handleCopyOrigin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleRecheckPermission = async () => {
    setChecking(true);
    setStatusMessage(null);

    try {
      // 1. Refresh permission from Notification API
      let perm: NotificationPermission = 'denied';
      if (typeof window !== 'undefined' && 'Notification' in window) {
        perm = Notification.permission;
      }

      // If user reset to 'default', try requesting directly
      if (perm === 'default') {
        perm = await Notification.requestPermission();
      }

      await refreshPushStatus();

      if (perm === 'granted') {
        setIsSuccess(true);
        setStatusMessage('✅ बहुत बढ़िया! अनुमति प्राप्त हो गई है। पुश अलर्ट सक्रिय किए जा रहे हैं...');
        await enablePushNotifications();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 2500);
      } else if (perm === 'default') {
        setStatusMessage('ℹ️ अनुमति लंबित (Default) है। कृपया "Allow / अनुमति दें" पर क्लिक करें।');
      } else {
        setStatusMessage('⚠️ अभी भी ब्लॉक है! कृपया नीचे दिए गए चरणों का पालन करके ब्राउज़र में Allow करें।');
      }
    } catch (err: any) {
      console.warn('Recheck permission notice:', err);
      setStatusMessage('कृपया नीचे दिए गए चरणों के अनुसार ब्राउज़र सेटिंग्स में Allow करें।');
    } finally {
      setChecking(false);
    }
  };

  const handleToggleSoundFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSoundFallbackEnabled(checked);
    localStorage.setItem('hdk_sound_alerts_fallback', checked ? 'true' : 'false');
  };

  const handleReloadPage = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-xs">
              <Lock className="w-6 h-6 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/30 text-amber-200 text-[10px] font-black uppercase tracking-wider mb-0.5">
                <span>ब्राउज़र अनुमति अनलॉक गाइड</span>
              </div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                डिवाइस पुश अलर्ट अनलॉक करें (Unblock Notifications)
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-stone-800">
          {/* Current Status Box */}
          <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
              <BellOff className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-rose-950 uppercase tracking-wide">
                  वर्तमान स्थिति (Current Status):
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px]">
                  अस्वीकृत / ब्लॉक (Blocked)
                </span>
              </div>
              <p className="text-xs text-rose-900 leading-relaxed font-medium">
                आपके ब्राउज़र में इस वेबसाइट के लिए नोटिफिकेशन अनुमति ब्लॉक (Denied) है। सुरक्षा कारणों से ब्राउज़र केवल आपकी अनुमति पर ही इसे अनब्लॉक करने की सुविधा देता है।
              </p>
            </div>
          </div>

          {/* Instant 1-Click Sound & In-App Unblock Button */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/20 shrink-0 mt-0.5">
                <Volume2 className="w-5 h-5 text-amber-200" />
              </div>
              <div>
                <h4 className="text-sm font-black flex items-center gap-1.5">
                  <span>⚡ 1-क्लिक इन-ऐप अलर्ट चालू करें (Instant Audio &amp; In-App Unblock)</span>
                </h4>
                <p className="text-xs text-emerald-100 mt-0.5 leading-relaxed">
                  यदि ब्राउज़र में पुश नोटिफिकेशन ब्लॉक भी रहे, तब भी हमारे स्मार्ट ऑडियो इंजन से नए ऑर्डर, संदेश व अलर्ट आने पर घंटी और स्क्रीन बैनर तुरंत सक्रिय रहेगा।
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                id="btn-quick-sound-unblock"
                onClick={handleInstantSoundAlertActivation}
                className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <BellRing className="w-4 h-4 text-emerald-600" />
                <span>🔔 टेस्ट घंटी बजाएं व अलर्ट सक्रिय करें (Activate &amp; Test Tone)</span>
              </button>

              {isInIframe && (
                <button
                  type="button"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-950 text-white font-bold text-xs flex items-center gap-1.5 border border-emerald-400/40 transition-all cursor-pointer"
                  title="ब्राउज़र के डायरेक्ट प्रॉम्प्ट हेतु ऐप को अलग टैब में खोलें"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                  <span>🌐 नई विंडो में खोलकर Allow करें (Open Full Window)</span>
                </button>
              )}
            </div>
          </div>

          {/* Real-time Status Notice (if any) */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
                isSuccess
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span>{statusMessage}</span>
              </div>
              {isSuccess && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                >
                  ठीक है
                </button>
              )}
            </div>
          )}

          {/* Browser Selection Tabs for Instructions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-stone-700 uppercase tracking-wider">
                आपके ब्राउज़र के अनुसार अनब्लॉक के 4 आसान चरण:
              </span>
              <span className="text-[11px] font-bold text-orange-600">
                ऑटो-डिटेक्टेड: {detectedBrowser.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'chrome', label: 'Chrome (डेस्कटॉप)' },
                { id: 'android_chrome', label: 'Chrome (मोबाइल)' },
                { id: 'edge', label: 'Edge / Brave' },
                { id: 'firefox', label: 'Firefox' },
                { id: 'ios_safari', label: 'Safari (iPhone/Mac)' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetectedBrowser(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    detectedBrowser === tab.id
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step-by-Step Instructions based on selected browser */}
          <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
            {/* Step 1 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="text-xs leading-relaxed text-stone-800">
                <span className="font-bold block text-stone-900 mb-0.5">
                  एड्रेस बार (Address Bar) में लॉक या सेटिंग्स आइकन पर क्लिक करें:
                </span>
                {detectedBrowser === 'android_chrome' ? (
                  <p>
                    मोबाइल स्क्रीन पर सबसे ऊपर जहां वेबसाइट का पता लिखा है, उसके बायीं ओर बने <b>🔒 ताला (Lock) आइकन</b> या <b>सेटिंग्स बटन</b> पर टैप करें।
                  </p>
                ) : detectedBrowser === 'firefox' ? (
                  <p>
                    ऊपर URL बार में बाईं ओर <b>🛡️ शील्ड (Shield)</b> या <b>🔒 लॉक आइकन</b> पर क्लिक करें।
                  </p>
                ) : detectedBrowser === 'ios_safari' ? (
                  <p>
                    Safari में नीचे शेयर बटन <b>(Share Icon)</b> दबाकर <b>"Add to Home Screen (होम स्क्रीन पर जोड़ें)"</b> करें, फिर ऐप खोलें।
                  </p>
                ) : (
                  <p>
                    ब्राउज़र में सबसे ऊपर जहां <code>{currentOrigin}</code> लिखा है, उसके ठीक बायीं ओर बने <b>🔒 Lock आइकन</b> या <b>Tune/Sliders (साइट सेटिंग्स)</b> पर क्लिक करें।
                  </p>
                )}
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="text-xs leading-relaxed text-stone-800">
                <span className="font-bold block text-stone-900 mb-0.5">
                  "Notifications (सूचनाएं / अनुमतियाँ)" खोजें:
                </span>
                {detectedBrowser === 'android_chrome' ? (
                  <p>
                    खुलने वाले मेनू में <b>"Permissions" (अनुमतियाँ)</b> चुनें, फिर <b>Notifications</b> पर जाएं।
                  </p>
                ) : (
                  <p>
                    ड्रॉपडाउन मेनू में <b>"Notifications"</b> विकल्प के सामने देखें।
                  </p>
                )}
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-orange-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="text-xs leading-relaxed text-stone-800">
                <span className="font-bold block text-stone-900 mb-0.5">
                  "Block" को बदलकर "Allow (अनुमति दें)" करें:
                </span>
                <p>
                  टॉगल स्विच को ऑन करें या ड्रॉपडाउन में <b>"Block"</b> को हटाकर <b>"Allow" (अनुमति दें)</b> या <b>"Reset permission"</b> पर क्लिक करें।
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                4
              </div>
              <div className="text-xs leading-relaxed text-stone-800">
                <span className="font-bold block text-stone-900 mb-0.5">
                  पेज रीलोड करें या नीचे "अनुमति दोबारा जांचें" बटन दबाएं:
                </span>
                <p>
                  ब्राउज़र रीलोड करने के बाद सिस्टम तुरंत आपके डिवाइस को पुश अलर्ट के लिए सक्रिय कर देगा।
                </p>
              </div>
            </div>
          </div>

          {/* Quick Helper Tools */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>त्वरित सहायता टूल्स (Quick Actions):</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Copy Origin */}
              <button
                type="button"
                onClick={handleCopyOrigin}
                className="p-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                title="ब्राउज़र सेटिंग्स में पेस्ट करने हेतु लिंक कॉपी करें"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">लिंक कॉपी हो गई!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-stone-500" />
                    <span>साइट लिंक कॉपी करें</span>
                  </>
                )}
              </button>

              {/* Reload Page */}
              <button
                type="button"
                onClick={handleReloadPage}
                className="p-2.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-orange-600" />
                <span>पेज तुरंत रीलोड करें (Reload)</span>
              </button>
            </div>
          </div>

          {/* Sound & In-App Alerts Fallback Toggle */}
          <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white text-emerald-700 shadow-2xs">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-stone-900">
                  ऑडियो व इन-ऐप अलर्ट हमेशा सक्रिय रखें (Sound Fallback)
                </h4>
                <p className="text-[11px] text-stone-500">
                  अगर पुश ब्लॉक भी रहे, तब भी नए आर्डर और मैसेज आने पर स्क्रीन पर अलर्ट और घंटी की आवाज आएगी।
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={soundFallbackEnabled}
                onChange={handleToggleSoundFallback}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-stone-500 text-center sm:text-left">
            सेटिंग्स बदलने के बाद नीचे दिया गया हरा बटन दबाएं।
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold text-xs hover:bg-stone-100 cursor-pointer"
            >
              बंद करें
            </button>

            <button
              type="button"
              id="btn-recheck-notification-permission"
              disabled={checking}
              onClick={handleRecheckPermission}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'जांच हो रही है...' : 'अनुमति दोबारा जांचें (Re-Check & Activate)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

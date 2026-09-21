import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Camera,
  Mic,
  Globe,
  RefreshCw,
  ExternalLink,
  HelpCircle,
  Smartphone,
  Laptop,
  Activity,
  Layers,
  ShieldCheck,
  Phone,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface DiagnosticResult {
  hasGetUserMedia: boolean;
  hasRTCPeerConnection: boolean;
  isOnline: boolean;
  isIframe: boolean;
  cameraPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  micPermission: 'granted' | 'denied' | 'prompt' | 'unknown';
  pingMs: number | null;
  connectionType?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRetryConnection: () => void;
  initialError?: string | null;
  meetingUrl: string;
  roomCode: string;
  onSwitchToWhatsApp?: () => void;
}

export const VideoQualityTroubleshooting: React.FC<Props> = ({
  isOpen,
  onClose,
  onRetryConnection,
  initialError,
  meetingUrl,
  roomCode,
  onSwitchToWhatsApp,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'permissions' | 'network' | 'browser'>('diagnostics');
  const [runningTest, setRunningTest] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult>({
    hasGetUserMedia: false,
    hasRTCPeerConnection: false,
    isOnline: navigator.onLine,
    isIframe: false,
    cameraPermission: 'unknown',
    micPermission: 'unknown',
    pingMs: null,
  });

  // Run diagnostics check
  const runDiagnostics = useCallback(async () => {
    setRunningTest(true);

    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const hasRTCPeerConnection = typeof window.RTCPeerConnection !== 'undefined';
    const isOnline = navigator.onLine;
    const isIframe = window.self !== window.top;

    let cameraPermission: DiagnosticResult['cameraPermission'] = 'unknown';
    let micPermission: DiagnosticResult['micPermission'] = 'unknown';

    // Query permissions API if supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        // @ts-ignore
        const camStatus = await navigator.permissions.query({ name: 'camera' as any });
        cameraPermission = camStatus.state as any;
      } catch (_) {}

      try {
        // @ts-ignore
        const micStatus = await navigator.permissions.query({ name: 'microphone' as any });
        micPermission = micStatus.state as any;
      } catch (_) {}
    }

    // Ping check
    const start = performance.now();
    let pingMs: number | null = null;
    try {
      // Ping current origin or head request
      await fetch(window.location.origin, { method: 'HEAD', cache: 'no-cache' });
      pingMs = Math.round(performance.now() - start);
    } catch (_) {
      pingMs = Math.round(performance.now() - start);
    }

    // Get connection info if available
    let connType = 'Unknown';
    // @ts-ignore
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      connType = `${conn.effectiveType ? conn.effectiveType.toUpperCase() : ''} (${conn.downlink ? conn.downlink + ' Mbps' : '4G/WiFi'})`;
    }

    setDiagnostics({
      hasGetUserMedia,
      hasRTCPeerConnection,
      isOnline,
      isIframe,
      cameraPermission,
      micPermission,
      pingMs,
      connectionType: connType,
    });

    setRunningTest(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
      if (initialError?.includes('अनुमति') || initialError?.includes('NotAllowedError')) {
        setActiveTab('permissions');
      } else if (!navigator.onLine) {
        setActiveTab('network');
      } else {
        setActiveTab('diagnostics');
      }
    }
  }, [isOpen, initialError, runDiagnostics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <header className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">वीडियो क्वालिटी व कनेक्शन समस्या निवारण</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  Troubleshoot
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                कैमरा/माइक अनुमतियाँ, नेटवर्क स्पीड और ब्राउज़र कम्पैटिबिलिटी गाइड
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Detected Issue Banner if initial error is provided */}
        {initialError && (
          <div className="px-4 py-2.5 bg-amber-950/40 border-b border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>पहचाना गया अवरोध:</strong> {initialError}
              </span>
            </div>
            <button
              onClick={() => setActiveTab('permissions')}
              className="text-[11px] font-bold text-amber-400 underline hover:text-amber-300 cursor-pointer shrink-0"
            >
              समाधान देखें
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-stone-800 px-3 sm:px-4 bg-stone-900/90 overflow-x-auto text-xs font-bold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. ऑटो डायग्नोस्टिक्स</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'permissions'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>2. कैमरा व माइक अनुमति</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'network'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>3. नेटवर्क व स्पीड</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('browser')}
            className={`py-3 px-3 sm:px-4 border-b-2 flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
              activeTab === 'browser'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>4. ब्राउज़र अनुकूलता</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* TAB 1: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between bg-stone-950/70 p-3.5 rounded-2xl border border-stone-800">
                <div>
                  <h4 className="font-bold text-stone-200 text-sm">सिस्टम स्वास्थ्य व डिवाइस चेक</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    लाइव वीडियो कॉल के लिए आपके ब्राउज़र और हार्डवेयर की स्वचालित जांच
                  </p>
                </div>
                <button
                  type="button"
                  onClick={runDiagnostics}
                  disabled={runningTest}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-700 disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningTest ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{runningTest ? 'जांच जारी...' : 'पुनः जांचें'}</span>
                </button>
              </div>

              {/* Diagnostic Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Internet connection */}
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80 flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-stone-800 text-stone-300">
                      {diagnostics.isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
                    </div>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">इंटरनेट कनेक्शन</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {diagnostics.isOnline ? `ऑनलाइन • लेटेंसी: ${diagnostics.pingMs ?? '--'}ms` : 'ऑफ़लाइन (डिस्कनेक्टेड)'}
                      </div>
                      {diagnostics.connectionType && (
                        <div className="text-[10px] text-stone-500 font-mono mt-0.5">{diagnostics.connectionType}</div>
                      )}
                    </div>
                  </div>
                  {diagnostics.isOnline ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> सक्रिय
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/40 text-red-400 font-bold text-[10px] flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> विफल
                    </span>
                  )}
                </div>

                {/* 2. WebRTC Media Stream API */}
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80 flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-stone-800 text-stone-300">
                      <Globe className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">WebRTC &amp; getUserMedia API</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {diagnostics.hasGetUserMedia && diagnostics.hasRTCPeerConnection
                          ? 'पूर्णतः समर्थित (HD 1080p)'
                          : 'ब्राउज़र में सीमित सपोर्ट'}
                      </div>
                    </div>
                  </div>
                  {diagnostics.hasGetUserMedia ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> पास
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold text-[10px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> अप्राप्य
                    </span>
                  )}
                </div>

                {/* 3. Camera Permission */}
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80 flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-stone-800 text-stone-300">
                      <Camera className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">कैमरा अनुमति (Camera Status)</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {diagnostics.cameraPermission === 'granted'
                          ? 'अनुमति स्वीकृत (Granted)'
                          : diagnostics.cameraPermission === 'denied'
                          ? 'अनुमति अस्वीकृत (Blocked)'
                          : 'जांच या अनुरोध की आवश्यकता'}
                      </div>
                    </div>
                  </div>
                  {diagnostics.cameraPermission === 'granted' ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> स्वीकृत
                    </span>
                  ) : diagnostics.cameraPermission === 'denied' ? (
                    <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/40 text-red-400 font-bold text-[10px] flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> ब्लॉक
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-stone-300 font-bold text-[10px]">
                      स्टैंडबाय
                    </span>
                  )}
                </div>

                {/* 4. Microphone Permission */}
                <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800/80 flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-xl bg-stone-800 text-stone-300">
                      <Mic className="w-4 h-4 text-teal-400" />
                    </div>
                    <div>
                      <div className="font-bold text-stone-200 text-xs">माइक्रोफोन अनुमति (Audio Mic)</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {diagnostics.micPermission === 'granted'
                          ? 'अनुमति स्वीकृत (Granted)'
                          : diagnostics.micPermission === 'denied'
                          ? 'अनुमति अस्वीकृत (Blocked)'
                          : 'जांच या अनुरोध की आवश्यकता'}
                      </div>
                    </div>
                  </div>
                  {diagnostics.micPermission === 'granted' ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> स्वीकृत
                    </span>
                  ) : diagnostics.micPermission === 'denied' ? (
                    <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-500/40 text-red-400 font-bold text-[10px] flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> ब्लॉक
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-stone-300 font-bold text-[10px]">
                      स्टैंडबाय
                    </span>
                  )}
                </div>
              </div>

              {/* Iframe Detection Warning */}
              {diagnostics.isIframe && (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold block text-amber-300">
                        आईफ्रेम कंटेनर (Embedded Sandbox Preview) डिटेक्ट हुआ
                      </span>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        सुरक्षा कारणों से कुछ ब्राउज़र आईफ्रेम के भीतर कैमरा/माइक एक्सेस को ब्लॉक कर देते हैं। यदि वीडियो स्ट्रीम लोड न हो, तो नीचे <strong>"नई विंडो में खोलें"</strong> पर क्लिक करें।
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fast Action Buttons */}
              <div className="p-4 rounded-2xl bg-stone-950/50 border border-stone-800/80 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-stone-200 block text-xs">क्या समस्या हल नहीं हुई?</span>
                  <span className="text-[11px] text-stone-400">कैमरा अनुमति रीसेट करें या त्वरित री-कनेक्ट करें</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRetryConnection();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>पुनः कनेक्ट करें</span>
                  </button>
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-stone-700 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>नई विंडो में खोलें</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS GUIDE */}
          {activeTab === 'permissions' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs">
                <span className="font-bold block text-emerald-300 mb-1">
                  कैमरा और माइक्रोफोन अनुमति कैसे चालू (Allow) करें?
                </span>
                <p className="leading-relaxed text-[11px] text-emerald-200/90">
                  लाइव वीडियो निरीक्षण और ध्वनि संचार के लिए आपके ब्राउज़र को कैमरा व माइक की अनुमति आवश्यक होती है। नीचे अपने डिवाइस के अनुसार स्टेप्स फॉलो करें:
                </p>
              </div>

              {/* Step by Step OS Guides */}
              <div className="space-y-3">
                {/* Chrome / Edge on Desktop / Android */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-stone-200 font-bold">
                    <Laptop className="w-4 h-4 text-emerald-400" />
                    <span>Google Chrome / Microsoft Edge (डेस्कटॉप व एंड्रॉइड मोबाइल)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-stone-300 text-[11px] pl-1 leading-relaxed">
                    <li>
                      ब्राउज़र के ऊपर एड्रेस बार (Address Bar) में बाईं तरफ <strong>🔒 लॉक (Lock) या ⚙️ ट्यून (Tune)</strong> आइकन पर क्लिक करें।
                    </li>
                    <li>
                      <strong>Permissions / साइट सेटिंग्स</strong> मेनू में जाएं।
                    </li>
                    <li>
                      <strong>Camera</strong> और <strong>Microphone</strong> के सामने विकल्प को <strong>'Allow' (अनुमति दें)</strong> पर सेट करें।
                    </li>
                    <li>
                      पेज को <strong>रिफ्रेश (F5 / Reload)</strong> करें।
                    </li>
                  </ol>
                </div>

                {/* iPhone / iPad Safari */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-stone-200 font-bold">
                    <Smartphone className="w-4 h-4 text-teal-400" />
                    <span>Apple iPhone / iPad (Safari Browser)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-stone-300 text-[11px] pl-1 leading-relaxed">
                    <li>
                      सफारी सर्च बार में बाईं ओर <strong>'aA'</strong> आइकन पर टैप करें।
                    </li>
                    <li>
                      <strong>'Website Settings' (वेबसाइट सेटिंग्स)</strong> चुनें।
                    </li>
                    <li>
                      <strong>Camera</strong> और <strong>Microphone</strong> को <strong>'Allow'</strong> करें।
                    </li>
                    <li>
                      यदि अभी भी ब्लॉक दिखे, तो iPhone <strong>Settings &gt; Safari &gt; Camera &amp; Microphone &gt; Allow</strong> जांचें।
                    </li>
                  </ol>
                </div>

                {/* Windows / Mac OS System Level Permissions */}
                <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                  <div className="flex items-center gap-2 text-stone-200 font-bold">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>ऑपरेटिंग सिस्टम स्तर पर प्राइवेसी अनुमति (Windows / macOS)</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    यदि ब्राउज़र अनुमति देने पर भी कैमरा काली स्क्रीन (Black Screen) दिखाता है, तो सुनिश्चित करें कि अन्य ऐप (Zoom/Google Meet/Teams) कैमरा का उपयोग नहीं कर रहे हैं, और सिस्टम प्राइवेसी में ब्राउज़र को कैमरा अनुमति दी गई है।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NETWORK & SPEED */}
          {activeTab === 'network' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-stone-200">इंटरनेट बैंडविड्थ आवश्यकताएं (Bandwidth Requirements)</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {diagnostics.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="text-stone-400 font-bold">न्यूनतम गति (Audio/SD)</div>
                    <div className="text-stone-200 font-black text-sm mt-0.5">512 Kbps</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="text-stone-400 font-bold">अनुशंसित (720p HD)</div>
                    <div className="text-emerald-400 font-black text-sm mt-0.5">1.5 - 2.5 Mbps</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                    <div className="text-stone-400 font-bold">अल्ट्रा HD (1080p 60fps)</div>
                    <div className="text-cyan-400 font-black text-sm mt-0.5">3.5+ Mbps</div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              <div className="space-y-2.5 text-stone-300 text-[11px]">
                <h5 className="font-bold text-stone-200 text-xs">वीडियो अटकने या आवाज़ कटने पर क्या करें?</h5>
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[10px]">
                    1
                  </span>
                  <p>
                    <strong>वाई-फाई से 4G/5G या 4G से वाई-फाई बदलें:</strong> यदि मोबाइल नेटवर्क पर सिगनल कम है, तो ब्रॉडबैंड वाई-फाई पर स्विच करें या मोबाइल को खिड़की/खुले स्थान के पास रखें।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[10px]">
                    2
                  </span>
                  <p>
                    <strong>बैकग्राउंड डाउनलोड्स रोकें:</strong> फोन या कंप्यूटर पर यूट्यूब, नेटफ्लिक्स या कोई भारी फाइल डाउनलोड हो रही हो तो उसे पॉज कर दें।
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800/80 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 text-[10px]">
                    3
                  </span>
                  <p>
                    <strong>कैमरा बंद कर केवल ऑडियो मोड:</strong> बहुत कम स्पीड होने पर नीचे टूलबार से वीडियो कैमरा बंद कर दें ताकि बातचीत बिना रुके स्पष्ट चलती रहे।
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BROWSER COMPATIBILITY */}
          {activeTab === 'browser' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <h5 className="font-bold text-stone-200 text-xs">समर्थित और अनुशंसित ब्राउज़र्स</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/40 text-emerald-300 font-bold">
                    Chrome (v88+)
                    <span className="block text-[9px] text-emerald-400/80 font-normal">अनुशंसित (Best)</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/40 text-emerald-300 font-bold">
                    Edge (Chromium)
                    <span className="block text-[9px] text-emerald-400/80 font-normal">पूर्ण समर्थित</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/40 text-emerald-300 font-bold">
                    Safari (iOS 14+)
                    <span className="block text-[9px] text-emerald-400/80 font-normal">समर्थित</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-emerald-500/40 text-emerald-300 font-bold">
                    Firefox (v85+)
                    <span className="block text-[9px] text-emerald-400/80 font-normal">समर्थित</span>
                  </div>
                </div>
              </div>

              {/* In-app browser warning */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>WhatsApp / Facebook / Instagram इन-ऐप ब्राउज़र की सीमाएं</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-200/90">
                  यदि आपने लिंक व्हाट्सएप या सोशल मीडिया चैट के भीतर खोला है, तो वह "इन-ऐप वेबव्यू" (In-App Browser) में खुलता है जहाँ कैमरा हार्डवेयर की अनुमति अक्सर लॉक रहती है।
                </p>
                <div className="pt-1">
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>डिफ़ॉल्ट Chrome / Safari ब्राउज़र में खोलें</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Fast Action Fallbacks */}
        <footer className="p-3.5 sm:p-4 bg-stone-950 border-t border-stone-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onSwitchToWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  onSwitchToWhatsApp();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                title="यदि वेब वीडियो में समस्या हो, तो सीधे WhatsApp वीडियो कॉल पर जाएं"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-white" />
                <span>WhatsApp वीडियो पर स्विच करें</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onRetryConnection();
                onClose();
              }}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-stone-700 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>पुनः प्रयास करें</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs cursor-pointer"
          >
            बंद करें
          </button>
        </footer>
      </div>
    </div>
  );
};

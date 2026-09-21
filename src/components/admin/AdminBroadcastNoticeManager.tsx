import React, { useState, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Megaphone,
  Bell,
  Eye,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  Layers,
  Heart,
  Calendar,
  X,
} from 'lucide-react';
import {
  AdminBroadcastMessage,
  BroadcastAudience,
  BroadcastMessageType,
  BroadcastTheme,
  BroadcastPreset,
} from '../../types/broadcast';
import {
  adminBroadcastService,
  FESTIVAL_AND_ADMIN_PRESETS,
} from '../../services/adminBroadcastService';
import { BroadcastWelcomeModal } from '../common/BroadcastWelcomeModal';

interface Props {
  onSelectTab?: (tab: string) => void;
}

const AUDIENCE_OPTIONS: { id: BroadcastAudience; labelHindi: string; labelEng: string; icon: string }[] = [
  { id: 'all', labelHindi: 'सभी ऐप्स (All 4 Apps)', labelEng: 'All Platforms', icon: '🌐' },
  { id: 'customer', labelHindi: 'ग्राहक ऐप (Customer App)', labelEng: 'Customers', icon: '🛍️' },
  { id: 'service_man', labelHindi: 'सर्विसमैन ऐप (ServiceMan App)', labelEng: 'Technicians', icon: '🔧' },
  { id: 'franchise', labelHindi: 'फ्रेंचाइजी ऐप (Franchise App)', labelEng: 'District Admins', icon: '🏢' },
  { id: 'brand_promoter', labelHindi: 'ब्रांड प्रमोटर ऐप (Partner App)', labelEng: 'Brand Promoters', icon: '🤝' },
];

const THEME_OPTIONS: { id: BroadcastTheme; name: string; bgClass: string; borderClass: string }[] = [
  { id: 'golden', name: 'गोल्डन उत्सव (Golden Amber)', bgClass: 'from-amber-500 to-orange-600', borderClass: 'border-amber-400' },
  { id: 'saffron', name: 'केसरिया शुभ (Royal Saffron)', bgClass: 'from-orange-600 to-red-600', borderClass: 'border-orange-400' },
  { id: 'emerald', name: 'मरकत हरा (Emerald Jade)', bgClass: 'from-emerald-600 to-teal-800', borderClass: 'border-emerald-400' },
  { id: 'crimson', name: 'गुलाल लाल (Crimson Holi)', bgClass: 'from-rose-600 to-pink-600', borderClass: 'border-rose-400' },
  { id: 'royal_blue', name: 'प्रशासनिक नीला (Royal Blue)', bgClass: 'from-indigo-600 to-slate-900', borderClass: 'border-indigo-400' },
];

const EMOJI_PICKER = ['🪔', '🎨', '🌙', '🇮🇳', '⚡', '🎁', '📢', '🌸', '✨', '💐', '🏆', '🔔'];

export const AdminBroadcastNoticeManager: React.FC<Props> = ({ onSelectTab }) => {
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedAudience, setSelectedAudience] = useState<BroadcastAudience>('all');
  const [messageType, setMessageType] = useState<BroadcastMessageType>('festival');
  const [theme, setTheme] = useState<BroadcastTheme>('golden');
  const [emoji, setEmoji] = useState('🪔');
  const [title, setTitle] = useState('🪔 शुभ दीपावली - हरदिनकाम परिवार की ओर से हार्दिक बधाई!');
  const [body, setBody] = useState(
    'दीपावली के इस पावन पर्व पर आपके और आपके परिवार के सुख, समृद्धि व उत्तम स्वास्थ्य की मंगलकामना करते हैं! हरदिनकाम हमेशा आपकी सेवा में तत्पर है।'
  );
  const [actionLabel, setActionLabel] = useState('शुभकामनाएं स्वीकार करें');
  const [displayMode, setDisplayMode] = useState<'popup_and_banner' | 'popup_only' | 'banner_only'>('popup_and_banner');

  // Preview Modal Test State
  const [testModalMessage, setTestModalMessage] = useState<AdminBroadcastMessage | null>(null);

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      const items = await adminBroadcastService.getAllBroadcasts();
      setBroadcasts(items);
    } catch (err) {
      console.warn('Load broadcasts err:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: BroadcastPreset) => {
    setMessageType(preset.type);
    setTheme(preset.theme);
    setEmoji(preset.emoji);
    setSelectedAudience(preset.defaultAudience);
    setTitle(preset.defaultTitle);
    setBody(preset.defaultBody);
    setActionLabel(preset.defaultActionLabel);
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      alert('कृपया शीर्षक और संदेश दोनों भरें।');
      return;
    }

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      const created = await adminBroadcastService.createBroadcast({
        title,
        body,
        audience: selectedAudience,
        type: messageType,
        theme,
        emoji,
        actionLabel,
        displayMode,
        createdBy: 'Admin Deepak Buildcon',
      });

      // Clear dismissed cache for this message to test immediate receipt
      adminBroadcastService.resetDismissed(created.id);

      setSuccessMsg('संदेश सफलतापूर्वक सभी चयनित ऐप्स पर प्रसारित कर दिया गया है!');
      setTimeout(() => setSuccessMsg(null), 4500);

      await loadBroadcasts();
    } catch (err: any) {
      console.error('Broadcast error:', err);
      alert('संदेश भेजने में त्रुटि: ' + (err?.message || 'अज्ञात त्रुटि'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await adminBroadcastService.toggleBroadcastActive(id, !currentActive);
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === id ? { ...b, isActive: !currentActive } : b))
      );
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('क्या आप इस प्रसारित संदेश को स्थायी रूप से हटाना चाहते हैं?')) return;
    try {
      await adminBroadcastService.deleteBroadcast(id);
      setBroadcasts((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const previewCurrentFormMessage: AdminBroadcastMessage = {
    id: 'preview_draft',
    title: title || 'शीर्षक यहाँ दिखेगा',
    body: body || 'विस्तृत संदेश विवरण यहाँ दिखेगा...',
    audience: selectedAudience,
    type: messageType,
    theme,
    emoji,
    actionLabel,
    displayMode,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-stone-900 text-white p-6 rounded-3xl shadow-xl border border-amber-300/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                BROADCAST STUDIO
              </span>
              <span className="text-xs text-amber-200 font-semibold">
                कस्टमर • सर्विसमैन • फ्रेंचाइजी • ब्रांड प्रमोटर
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              प्रशासनिक संदेश व त्योहार वेलकम ब्रॉडकास्टर
            </h1>
            <p className="text-xs sm:text-sm text-amber-100/90 mt-1 max-w-2xl font-medium">
              एडमिन पैनल से सीधे दीपावली, होली, ईद या राष्ट्रीय त्योहारों के बधाई संदेश और प्रशासनिक निर्देश चारों ऐप्स पर तत्काल पॉप-अप व टॉप बैनर के रूप में भेजें।
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTestModalMessage(previewCurrentFormMessage)}
              className="px-4 py-2.5 rounded-xl bg-white text-stone-900 hover:bg-amber-50 font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-orange-600" />
              <span>स्क्रीन पर टेस्ट देखें (Preview Popup)</span>
            </button>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid: Composer Form on Left, Live Device Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Presets */}
        <div className="lg:col-span-7 space-y-6">
          {/* Festival Presets Carousel */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>त्वरित त्योहार व नोटिस टेम्पलेट्स (1-Tap Presets)</span>
              </span>
              <span className="text-[11px] text-stone-400">क्लिक करके भरें</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FESTIVAL_AND_ADMIN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2.5 rounded-xl border border-stone-200 hover:border-orange-400 hover:bg-orange-50/50 text-left transition-all cursor-pointer group"
                >
                  <span className="text-base block mb-0.5">{preset.emoji}</span>
                  <span className="text-[11px] font-bold text-stone-800 line-clamp-1 group-hover:text-orange-700">
                    {preset.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Composer Form */}
          <form
            onSubmit={handleSendBroadcast}
            className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs space-y-5"
          >
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-600" />
              <span>नया संदेश तैयार करें (Compose Broadcast)</span>
            </h3>

            {/* Target App Audience Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800">
                लक्षित ऐप व दर्शक चुनें (Target Audience) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map((opt) => {
                  const isSelected = selectedAudience === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedAudience(opt.id)}
                      className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-orange-600 bg-orange-50 text-orange-950 font-bold shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{opt.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{opt.labelHindi}</div>
                        <div className="text-[10px] text-stone-500">{opt.labelEng}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Type & Theme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  संदेश का प्रकार (Message Type)
                </label>
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as BroadcastMessageType)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50"
                >
                  <option value="festival">त्योहार बधाई व स्वागत (Festive Greeting)</option>
                  <option value="announcement">प्रशासनिक सूचना (Administrative Notice)</option>
                  <option value="offer">विशेष ऑफर व बोनस (Special Bonus/Offer)</option>
                  <option value="alert">महत्वपूर्ण चेतावनी/रखरखाव (Alert Notice)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  रंग थीम (Visual Style Theme)
                </label>
                <div className="flex items-center gap-2">
                  {THEME_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      title={t.name}
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${t.bgClass} cursor-pointer transition-transform ${
                        theme === t.id ? 'scale-125 ring-2 ring-stone-900 shadow-md' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Emoji Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-800">
                प्रमुख उत्सव / प्रतीक इमोजी (Header Emoji)
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {EMOJI_PICKER.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                      emoji === em
                        ? 'bg-amber-100 border-2 border-amber-500 scale-110 shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 border border-stone-200'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-800">
                संदेश शीर्षक (Headline / Title) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🪔 शुभ दीपावली - हरदिनकाम परिवार की ओर से हार्दिक बधाई!"
                className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm font-bold bg-white focus:ring-2 focus:ring-orange-500 outline-hidden"
              />
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-800">
                विस्तृत संदेश (Message Body) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="विस्तृत शुभकामना या प्रशासनिक आदेश यहाँ लिखें..."
                className="w-full p-3 rounded-xl border border-stone-200 text-xs sm:text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-hidden leading-relaxed"
              />
            </div>

            {/* Action Label & Display Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  बटन टेक्स्ट (Action Button Label)
                </label>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="e.g. शुभकामनाएं स्वीकार करें"
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  दिखाने का माध्यम (Display Mode)
                </label>
                <select
                  value={displayMode}
                  onChange={(e) => setDisplayMode(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50"
                >
                  <option value="popup_and_banner">पॉप-अप + टॉप बैनर दोनों (Recommended)</option>
                  <option value="popup_only">केवल पॉप-अप वेलकम स्क्रीन (Popup Only)</option>
                  <option value="banner_only">केवल टॉप नोटिफिकेशन बार (Banner Only)</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-stone-500">
                भेजते ही यह संदेश चयनित ऐप्स पर तुरंत सक्रिय हो जाएगा।
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>ब्रॉडकास्ट भेजा जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>संदेश तुरंत भेजें (Broadcast Live)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Mobile / Screen Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs sticky top-24">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-orange-600" />
                <span>लाइव स्क्रीन प्रीव्यू (Live App Preview)</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-stone-100 text-[10px] font-bold text-stone-600">
                {selectedAudience.toUpperCase()} APP
              </span>
            </div>

            {/* Mock Phone Frame */}
            <div className="border-4 border-stone-800 rounded-3xl overflow-hidden shadow-xl bg-stone-100">
              {/* Phone Speaker Notch */}
              <div className="bg-stone-800 py-1 flex justify-center">
                <div className="w-14 h-1.5 rounded-full bg-stone-700" />
              </div>

              {/* Mock App Header */}
              <div className="bg-stone-900 text-white px-3 py-2 flex items-center justify-between text-[11px] font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  HARDINKAAM
                </span>
                <span className="text-[10px] text-stone-400">09:41 AM</span>
              </div>

              {/* Preview Banner */}
              {(displayMode === 'popup_and_banner' || displayMode === 'banner_only') && (
                <div className="p-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[11px] font-bold flex items-center justify-between gap-1 shadow-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span>{emoji}</span>
                    <span className="truncate">{title}</span>
                  </div>
                  <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-sm whitespace-nowrap">
                    देखें
                  </span>
                </div>
              )}

              {/* Preview Content Area */}
              <div className="p-4 space-y-3 bg-stone-50 min-h-[360px] flex flex-col justify-center">
                {/* Simulated Welcome Modal in Phone */}
                {(displayMode === 'popup_and_banner' || displayMode === 'popup_only') && (
                  <div className="bg-white rounded-2xl border border-amber-300 shadow-lg overflow-hidden">
                    <div className="p-4 bg-gradient-to-br from-amber-600 to-orange-600 text-white text-center relative">
                      <div className="text-2xl mb-1">{emoji}</div>
                      <div className="text-[10px] uppercase font-black tracking-wider text-amber-200">
                        {AUDIENCE_OPTIONS.find((a) => a.id === selectedAudience)?.labelHindi}
                      </div>
                      <h4 className="text-xs font-black mt-0.5">{title}</h4>
                    </div>

                    <div className="p-3.5 space-y-3">
                      <p className="text-[11px] text-stone-700 font-medium leading-relaxed">
                        {body}
                      </p>

                      <div className="flex items-center justify-between text-[9px] text-stone-400 border-t border-stone-100 pt-2">
                        <span className="flex items-center gap-1">
                          <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500" />
                          <span>शुभकामनाएं</span>
                        </span>
                        <span>दीपक बिल्डकॉन</span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-1.5 rounded-lg bg-orange-600 text-white text-[11px] font-black shadow-xs flex items-center justify-center gap-1"
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setTestModalMessage(previewCurrentFormMessage)}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 underline cursor-pointer"
              >
                फुल स्क्रीन टेस्ट विंडो खोलें
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History & Active Status Table */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-base font-black text-stone-900">
              प्रसारित संदेश इतिहास व सक्रिय स्थिति (Broadcast History)
            </h3>
            <p className="text-xs text-stone-500">
              पूर्व में भेजे गए बधाई संदेश व नोटिस प्रबंधित करें
            </p>
          </div>

          <button
            type="button"
            onClick={loadBroadcasts}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold hover:bg-stone-50 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>रीफ्रेश करें</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">
            संदेश लोड हो रहे हैं...
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2 text-xl">
              🪔
            </div>
            <p className="text-sm font-bold text-stone-700">अभी कोई पूर्व संदेश नहीं है</p>
            <p className="text-xs text-stone-400 mt-0.5">
              ऊपर दिए गए फॉर्म से पहला त्योहार या प्रशासनिक संदेश भेजें।
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {broadcasts.map((b) => (
              <div
                key={b.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl p-2 rounded-2xl bg-stone-100 flex-shrink-0">
                    {b.emoji || '📢'}
                  </span>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-stone-900">{b.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {AUDIENCE_OPTIONS.find((a) => a.id === b.audience)?.labelHindi || b.audience}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                        {b.type.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 max-w-2xl font-medium">
                      {b.body}
                    </p>

                    <div className="text-[10px] text-stone-400 flex items-center gap-2">
                      <span>भेजा गया: {new Date(b.createdAt).toLocaleString('hi-IN')}</span>
                      <span>•</span>
                      <span>द्वारा: {b.createdBy || 'Super Admin'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-stone-600">
                      {b.isActive ? 'सक्रिय' : 'बंद'}
                    </span>
                    <input
                      type="checkbox"
                      checked={b.isActive}
                      onChange={() => handleToggleActive(b.id, b.isActive)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-stone-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 relative" />
                  </label>

                  {/* Preview Modal Button */}
                  <button
                    type="button"
                    onClick={() => setTestModalMessage(b)}
                    className="p-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 cursor-pointer"
                    title="पॉपअप प्रीव्यू देखें"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="p-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 cursor-pointer"
                    title="हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Modal Overlay */}
      {testModalMessage && (
        <BroadcastWelcomeModal
          message={testModalMessage}
          onClose={() => setTestModalMessage(null)}
          onAction={(tab) => {
            setTestModalMessage(null);
            if (tab && onSelectTab) onSelectTab(tab);
          }}
        />
      )}
    </div>
  );
};

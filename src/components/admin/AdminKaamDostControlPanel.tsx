import React, { useState, useEffect } from 'react';
import {
  kaamDostConfigService,
  KaamDostAdminConfig,
  DEFAULT_KAAMDOST_CONFIG,
} from '../assistant/kaamDostConfigService';
import {
  Bot,
  Power,
  Sparkles,
  MessageSquare,
  Mic,
  Upload,
  Settings,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Globe,
  FileText,
  Sliders,
  HelpCircle,
  FolderOpen,
  Lock,
  Layers,
  Wrench,
  BookOpen,
} from 'lucide-react';
import { KaamDostActionType } from '../assistant/actionRouter';
import { AssistantLanguage } from '../assistant/types';

interface Props {
  onSelectTab?: (tab: string) => void;
}

export const AdminKaamDostControlPanel: React.FC<Props> = ({ onSelectTab }) => {
  const [config, setConfig] = useState<KaamDostAdminConfig>({ ...DEFAULT_KAAMDOST_CONFIG });
  const [activeTab, setActiveTab] = useState<
    'general' | 'welcome_prompts' | 'voice_media' | 'questions' | 'permissions'
  >('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  useEffect(() => {
    const unsub = kaamDostConfigService.subscribe((latest) => {
      setConfig(latest);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await kaamDostConfigService.saveConfig(config, 'Super Admin');
    setIsSaving(false);

    if (success) {
      setSaveNotification('KaamDost AI सेटिंग्स सफलतापूर्वक अपडेट व ब्रॉडकास्ट हो गईं! 🚀');
      setTimeout(() => setSaveNotification(null), 4000);
    } else {
      alert('सेटिंग्स सेव करने में त्रुटि हुई।');
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('क्या आप सभी KaamDost AI सेटिंग्स को मूल डिफॉल्ट मानों पर रीसेट करना चाहते हैं?')) return;
    setIsSaving(true);
    await kaamDostConfigService.saveConfig(DEFAULT_KAAMDOST_CONFIG, 'Reset to Verified Defaults');
    setIsSaving(false);
    setSaveNotification('सभी सेटिंग्स डिफॉल्ट पर रीसेट कर दी गईं!');
    setTimeout(() => setSaveNotification(null), 4000);
  };

  // Helper for Suggested Prompts
  const handleAddPrompt = () => {
    const newP = {
      id: 'p_' + Date.now(),
      label: '⚡ नया सुझाव',
      query: 'नया सवाल पूछें',
      icon: 'Sparkles',
    };
    setConfig({
      ...config,
      suggestedPrompts: [...config.suggestedPrompts, newP],
    });
  };

  const handleRemovePrompt = (index: number) => {
    const list = [...config.suggestedPrompts];
    list.splice(index, 1);
    setConfig({ ...config, suggestedPrompts: list });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-orange-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-wider">
            <Bot className="w-5 h-5 text-orange-500 animate-pulse" />
            <span>Master AI Operations Panel (Phase 20)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {config.assistantName} AI कंट्रोल सेंटर
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
            AI मास्टर स्विच, स्वागत संदेश, वॉयस/अपलोड सीमा, प्रश्न प्रवाह और सुरक्षा अनुमतियों का रीयल-टाइम नियंत्रण केंद्र।
          </p>
        </div>

        {/* Master AI Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setConfig({ ...config, isAiEnabled: !config.isAiEnabled })}
            className={`px-5 py-3 rounded-2xl font-black text-xs transition cursor-pointer flex items-center gap-2.5 shadow-lg active:scale-95 border ${
              config.isAiEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-950/40'
                : 'bg-red-600 hover:bg-red-500 text-white border-red-400 shadow-red-950/40'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{config.isAiEnabled ? 'AI एक्टिव (ONLINE)' : 'AI बंद (MAINTENANCE)'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white font-black text-xs rounded-2xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-orange-950/40 active:scale-95 border border-amber-300"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'सेव हो रहा है...' : 'सेव व लाइव ब्रॉडकास्ट करें'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="p-3 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-2xl transition cursor-pointer border border-stone-700"
            title="डिफॉल्ट पर रीसेट करें"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {saveNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveNotification}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200">
        {[
          { id: 'general', label: '🎛️ सामान्य व पहचान (General & Identity)', icon: Settings },
          { id: 'welcome_prompts', label: '💬 संदेश व संकेत (Welcome & Prompts)', icon: MessageSquare },
          { id: 'voice_media', label: '🎤 वॉयस व मीडिया (Voice & Uploads)', icon: Mic },
          { id: 'questions', label: '📋 प्रश्न प्रवाह (Question Flows)', icon: FileText },
          { id: 'permissions', label: '🛡️ एक्शन अनुमतियां (Permissions)', icon: ShieldCheck },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-3 rounded-2xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-900/20'
                  : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}

        {onSelectTab && (
          <button
            type="button"
            onClick={() => onSelectTab('admin_knowledge')}
            className="px-4 py-3 rounded-2xl text-xs font-black bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-400/30 whitespace-nowrap flex items-center gap-2 cursor-pointer ml-auto"
          >
            <BookOpen className="w-4 h-4" />
            <span>ज्ञानकोष (Knowledge Hub) →</span>
          </button>
        )}
      </div>

      {/* =========================================================================
       * TAB 1: GENERAL & IDENTITY
       * ========================================================================= */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-600" />
              <span>AI पहचान व ग्लोबल सेटिंग्स</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              असिस्टेंट का नाम, डिफ़ॉल्ट भाषा तथा आपातकालीन मेंटेनेंस मोड को प्रबंधित करें।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                असिस्टेंट का नाम (Assistant Name)
              </label>
              <input
                type="text"
                value={config.assistantName}
                onChange={(e) => setConfig({ ...config, assistantName: e.target.value })}
                className="w-full px-4 py-2.5 text-xs border border-stone-200 rounded-xl font-bold focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                डिफ़ॉल्ट भाषा (Default Language)
              </label>
              <select
                value={config.defaultLanguage}
                onChange={(e) =>
                  setConfig({ ...config, defaultLanguage: e.target.value as AssistantLanguage })
                }
                className="w-full px-4 py-2.5 text-xs border border-stone-200 rounded-xl font-bold bg-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="hi">हिंदी (Hindi)</option>
                <option value="hinglish">Hinglish</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                AI मास्टर स्टेटस (Master Status)
              </label>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`w-3 h-3 rounded-full ${
                    config.isAiEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span className="text-xs font-black">
                  {config.isAiEnabled ? 'सक्रिय (Live for Customers)' : 'मेंटेनेंस मोड (Maintenance Active)'}
                </span>
              </div>
            </div>
          </div>

          {/* Maintenance Messages */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider text-orange-600">
              मेंटेनेंस मोड संदेश (Maintenance Notice When AI is Disabled)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">हिंदी संदेश:</span>
                <textarea
                  rows={3}
                  value={config.maintenanceMessage.hi}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maintenanceMessage: { ...config.maintenanceMessage, hi: e.target.value },
                    })
                  }
                  className="w-full p-3 text-xs border border-stone-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">Hinglish Notice:</span>
                <textarea
                  rows={3}
                  value={config.maintenanceMessage.hinglish}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maintenanceMessage: { ...config.maintenanceMessage, hinglish: e.target.value },
                    })
                  }
                  className="w-full p-3 text-xs border border-stone-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">English Notice:</span>
                <textarea
                  rows={3}
                  value={config.maintenanceMessage.en}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maintenanceMessage: { ...config.maintenanceMessage, en: e.target.value },
                    })
                  }
                  className="w-full p-3 text-xs border border-stone-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * TAB 2: WELCOME & PROMPTS
       * ========================================================================= */}
      {activeTab === 'welcome_prompts' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-600" />
              <span>स्वागत संदेश व सुझाए गए प्रॉम्प्ट्स</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              चैट विंडो खुलने पर ग्राहक को दिखने वाले वेलकम ग्रीटिंग्स और क्विक एक्शन चिप्स प्रबंधित करें।
            </p>
          </div>

          {/* Welcome Messages per language */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                स्वागत संदेश (Hindi Welcome)
              </label>
              <textarea
                rows={4}
                value={config.welcomeMessage.hi}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    welcomeMessage: { ...config.welcomeMessage, hi: e.target.value },
                  })
                }
                className="w-full p-3 text-xs border border-stone-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Hinglish Welcome Message
              </label>
              <textarea
                rows={4}
                value={config.welcomeMessage.hinglish}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    welcomeMessage: { ...config.welcomeMessage, hinglish: e.target.value },
                  })
                }
                className="w-full p-3 text-xs border border-stone-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                English Welcome Message
              </label>
              <textarea
                rows={4}
                value={config.welcomeMessage.en}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    welcomeMessage: { ...config.welcomeMessage, en: e.target.value },
                  })
                }
                className="w-full p-3 text-xs border border-stone-200 rounded-xl leading-relaxed focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Suggested Starter Prompts */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider text-orange-600">
                  सुझाए गए स्टार्टर प्रॉम्प्ट्स (Suggested Starter Prompts)
                </h4>
                <p className="text-[11px] text-stone-500">ग्राहकों को चैट इनपुट के ऊपर दिखने वाली त्वरित गोलियां</p>
              </div>
              <button
                type="button"
                onClick={handleAddPrompt}
                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl border border-orange-200 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>नया प्रॉम्प्ट जोड़ें</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {config.suggestedPrompts.map((p, idx) => (
                <div key={p.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 relative group">
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={p.label}
                      onChange={(e) => {
                        const updated = [...config.suggestedPrompts];
                        updated[idx].label = e.target.value;
                        setConfig({ ...config, suggestedPrompts: updated });
                      }}
                      className="text-xs font-black bg-white px-2 py-1 rounded-lg border border-stone-200 w-full"
                      placeholder="Label"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePrompt(idx)}
                      className="p-1 text-stone-400 hover:text-red-600 transition cursor-pointer"
                      title="हटाएं"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={p.query}
                    onChange={(e) => {
                      const updated = [...config.suggestedPrompts];
                      updated[idx].query = e.target.value;
                      setConfig({ ...config, suggestedPrompts: updated });
                    }}
                    className="text-[11px] text-stone-600 bg-white px-2 py-1 rounded-lg border border-stone-200 w-full"
                    placeholder="AI Query"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * TAB 3: VOICE & MEDIA UPLOADS
       * ========================================================================= */}
      {activeTab === 'voice_media' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <Mic className="w-5 h-5 text-orange-600" />
              <span>वॉयस असिस्टेंट व फाइल अपलोड नियंत्रण</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              माइक स्पीच-टू-टेक्स्ट, टेक्स्ट-टू-स्पीच और फोटो/वीडियो/डॉक्यूमेंट अटैचमेंट की सीमाएं तय करें।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voice Controls */}
            <div className="space-y-4 p-5 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-stone-900">🎤 वॉयस इनपुट (Speech Recognition)</h4>
                  <p className="text-[11px] text-stone-500">हिंदी व अंग्रेजी में बोलकर सर्विस बुक करने की सुविधा</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isVoiceEnabled}
                  onChange={(e) => setConfig({ ...config, isVoiceEnabled: e.target.checked })}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-200">
                <div>
                  <h4 className="text-xs font-black text-stone-900">🔊 वॉयस आउटपुट (TTS Speech Playback)</h4>
                  <p className="text-[11px] text-stone-500">KaamDost के उत्तर को बोलकर सुनाना</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isTtsEnabled}
                  onChange={(e) => setConfig({ ...config, isTtsEnabled: e.target.checked })}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-2">
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  डिफ़ॉल्ट प्लेबैक स्पीड: {config.defaultTtsSpeed}x
                </label>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={config.defaultTtsSpeed}
                  onChange={(e) => setConfig({ ...config, defaultTtsSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-orange-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Media Upload Controls */}
            <div className="space-y-4 p-5 bg-stone-50 rounded-2xl border border-stone-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-stone-900">📁 फाइल अपलोड मास्टर स्विच</h4>
                  <p className="text-[11px] text-stone-500">कैमरा, फोटो, वीडियो व पीडीएफ अपलोड की अनुमति</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.isFileUploadEnabled}
                  onChange={(e) => setConfig({ ...config, isFileUploadEnabled: e.target.checked })}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  अधिकतम फाइल साइज (Maximum File Size): {Math.round(config.maxAttachmentSizeBytes / (1024 * 1024))} MB
                </label>
                <select
                  value={config.maxAttachmentSizeBytes}
                  onChange={(e) =>
                    setConfig({ ...config, maxAttachmentSizeBytes: parseInt(e.target.value, 10) })
                  }
                  className="w-full p-2.5 text-xs border border-stone-200 rounded-xl bg-white font-bold"
                >
                  <option value={5 * 1024 * 1024}>5 MB (Standard)</option>
                  <option value={10 * 1024 * 1024}>10 MB (Recommended)</option>
                  <option value={25 * 1024 * 1024}>25 MB (Large Videos & PDF)</option>
                  <option value={50 * 1024 * 1024}>50 MB (High Quality)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  अनुमत फाइल एक्सटेंशन (Allowed Extensions)
                </label>
                <input
                  type="text"
                  value={config.allowedExtensions.join(', ')}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      allowedExtensions: e.target.value.split(',').map((x) => x.trim()).filter(Boolean),
                    })
                  }
                  className="w-full p-2.5 text-xs border border-stone-200 rounded-xl bg-white font-mono"
                  placeholder=".jpg, .jpeg, .png, .pdf, .mp4"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * TAB 4: QUESTION FLOWS ENGINE
       * ========================================================================= */}
      {activeTab === 'questions' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              <span>संवादी प्रश्न प्रवाह कॉन्फ़िगरेशन (Question Flows)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              बुकिंग, ऑनबोर्डिंग, समस्या डायग्नोसिस व सपोर्ट के लिए AI द्वारा पूछे जाने वाले सवाल प्रबंधित करें।
            </p>
          </div>

          {/* 1. Booking Step Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider text-orange-600">
              1. बुकिंग चरण प्रश्न (Booking Step Prompts)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">सेवा प्रकार सवाल:</span>
                <input
                  type="text"
                  value={config.bookingQuestions.serviceTypePrompt}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bookingQuestions: { ...config.bookingQuestions, serviceTypePrompt: e.target.value },
                    })
                  }
                  className="w-full p-2.5 text-xs border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">स्थान / पता सवाल:</span>
                <input
                  type="text"
                  value={config.bookingQuestions.locationPrompt}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bookingQuestions: { ...config.bookingQuestions, locationPrompt: e.target.value },
                    })
                  }
                  className="w-full p-2.5 text-xs border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">तारीख चयन सवाल:</span>
                <input
                  type="text"
                  value={config.bookingQuestions.datePrompt}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bookingQuestions: { ...config.bookingQuestions, datePrompt: e.target.value },
                    })
                  }
                  className="w-full p-2.5 text-xs border border-stone-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 block mb-1">समय स्लॉट सवाल:</span>
                <input
                  type="text"
                  value={config.bookingQuestions.timePrompt}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      bookingQuestions: { ...config.bookingQuestions, timePrompt: e.target.value },
                    })
                  }
                  className="w-full p-2.5 text-xs border border-stone-200 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          {/* 2. Service Specific Diagnosis Questions */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider text-orange-600">
              2. सेवा-विशिष्ट डायग्नोसिस सवाल (Service-Specific Diagnosis Questions)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(config.serviceSpecificQuestions).map(([catKey, qData]: [string, any]) => (
                <div key={catKey} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <span className="text-xs font-black text-stone-900 block">{catKey}</span>
                  <input
                    type="text"
                    value={qData.diagnosisQuestion}
                    onChange={(e) => {
                      const updated = { ...config.serviceSpecificQuestions };
                      updated[catKey].diagnosisQuestion = e.target.value;
                      setConfig({ ...config, serviceSpecificQuestions: updated });
                    }}
                    className="w-full p-2 text-xs border border-stone-200 rounded-xl bg-white font-medium"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(qData.suggestedOptions || []).map((opt: string, i: number) => (
                      <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-stone-200 text-stone-600">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
       * TAB 5: ACTION PERMISSIONS MATRIX
       * ========================================================================= */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
          <div className="border-b border-stone-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-orange-600" />
                <span>AI एक्शन सुरक्षा व अनुमति मैट्रिक्स (Action Permissions)</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                तय करें कि AI कौन से एक्शन निष्पादित कर सकता है और किन एक्शन्स पर 3-बटन पुष्टिकरण अनिवार्य होगा।
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 text-[11px] font-black text-stone-400 uppercase tracking-wider">
                  <th className="py-3 px-4">एक्शन नाम (Action)</th>
                  <th className="py-3 px-4">विवरण (Description)</th>
                  <th className="py-3 px-4 text-center">एक्टिव (Enabled)</th>
                  <th className="py-3 px-4 text-center">पुष्टिकरण अनिवार्य (Requires Confirmation)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {Object.entries(config.actionPermissions).map(([actKey, perm]: [string, any]) => (
                  <tr key={actKey} className="hover:bg-stone-50/60 transition">
                    <td className="py-3 px-4 font-black font-mono text-stone-900">{actKey}</td>
                    <td className="py-3 px-4 text-stone-600">{perm.description}</td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perm.enabled}
                        onChange={(e) => {
                          const updated = { ...config.actionPermissions };
                          updated[actKey as KaamDostActionType].enabled = e.target.checked;
                          setConfig({ ...config, actionPermissions: updated });
                        }}
                        className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={perm.requiresConfirmation}
                        onChange={(e) => {
                          const updated = { ...config.actionPermissions };
                          updated[actKey as KaamDostActionType].requiresConfirmation = e.target.checked;
                          setConfig({ ...config, actionPermissions: updated });
                        }}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

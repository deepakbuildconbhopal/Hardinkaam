import React, { useState, useEffect } from 'react';
import {
  SupportedPageId,
  DynamicPageConfig,
  DynamicSectionConfig,
  PageSectionItem,
  SectionType,
  BgStyleType,
} from '../../types/pageCustomizer';
import {
  getPageConfig,
  savePageConfig,
  resetPageConfig,
  addSection,
  deleteSection,
  toggleSectionVisibility,
  reorderSections,
  updateSection,
  addSectionItem,
  removeSectionItem,
  updateTheme,
  DEFAULT_PAGE_CONFIGS,
} from '../../services/pageCustomizerService';
import { USER_UPLOADED_SHOWCASE_IMAGES } from '../../data/userImages';
import {
  Palette,
  Layout,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit3,
  Image as ImageIcon,
  Save,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  Sliders,
  Type,
  Maximize2,
  Smartphone,
  Monitor,
  X,
  Upload,
  Info,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface Props {
  onSelectTab?: (tab: string) => void;
}

export const AdminPageCustomizer: React.FC<Props> = ({ onSelectTab }) => {
  const { addToast } = useToast();

  const [activePageId, setActivePageId] = useState<SupportedPageId>('home');
  const [pageConfig, setPageConfig] = useState<DynamicPageConfig>(() =>
    getPageConfig('home')
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Modals state
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<DynamicSectionConfig | null>(null);
  const [imageManagerSection, setImageManagerSection] = useState<DynamicSectionConfig | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // New section draft
  const [newSectionType, setNewSectionType] = useState<SectionType>('custom_banner');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionBadge, setNewSectionBadge] = useState('SPECIAL');
  const [newSectionBgColor, setNewSectionBgColor] = useState('#ea580c');
  const [newSectionTextColor, setNewSectionTextColor] = useState('#ffffff');
  const [newSectionBtnText, setNewSectionBtnText] = useState('क्लिक करें');
  const [newSectionBtnLink, setNewSectionBtnLink] = useState('#services');

  // New image upload/input draft
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageTitle, setNewImageTitle] = useState('');
  const [newImageCategory, setNewImageCategory] = useState('Maintenance');

  // Preset color swatches
  const COLOR_PALETTES = [
    { name: 'Deep Orange', primary: '#ea580c', secondary: '#0f766e' },
    { name: 'Royal Blue', primary: '#2563eb', secondary: '#f97316' },
    { name: 'Emerald Green', primary: '#059669', secondary: '#ea580c' },
    { name: 'Royal Violet', primary: '#7c3aed', secondary: '#06b6d4' },
    { name: 'Crimson Rose', primary: '#e11d48', secondary: '#1e293b' },
    { name: 'Amber Cyber', primary: '#d97706', secondary: '#0284c7' },
    { name: 'Midnight Dark', primary: '#1e293b', secondary: '#ea580c' },
  ];

  // Load config when activePageId changes
  useEffect(() => {
    const cfg = getPageConfig(activePageId);
    setPageConfig(cfg);
    setHasUnsavedChanges(false);
  }, [activePageId]);

  // Handle saving
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await savePageConfig(pageConfig);
      setHasUnsavedChanges(false);
      addToast(
        `पेज "${pageConfig.pageNameHindi}" के सभी बदलाव सफलतापूर्वक लाइव कर दिए गए हैं!`,
        'success'
      );
    } catch (err: any) {
      addToast('बदलाव सहेजने में त्रुटि हुई: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset
  const handleResetToDefault = async () => {
    if (
      !window.confirm(
        `क्या आप वाकई "${pageConfig.pageNameHindi}" को मूल डिफ़ॉल्ट लेआउट पर रीसेट करना चाहते हैं?`
      )
    ) {
      return;
    }
    setIsSaving(true);
    try {
      const reset = await resetPageConfig(activePageId);
      setPageConfig(reset);
      setHasUnsavedChanges(false);
      addToast(`"${pageConfig.pageNameHindi}" मूल रूप में रीसेट हो गया है।`, 'info');
    } catch (err: any) {
      addToast('रीसेट में त्रुटि: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Section Visibility
  const handleToggleVisibility = async (secId: string) => {
    const updated = await toggleSectionVisibility(activePageId, secId);
    setPageConfig(updated);
    addToast('सेक्शन दृश्यता अपडेट की गई।', 'info');
  };

  // Reorder Sections
  const handleMoveSection = async (secId: string, direction: 'up' | 'down') => {
    const updated = await reorderSections(activePageId, secId, direction);
    setPageConfig(updated);
  };

  // Delete Section
  const handleDeleteSection = async (secId: string, title: string) => {
    if (!window.confirm(`क्या आप "${title}" सेक्शन को पूरी तरह हटाना चाहते हैं?`)) {
      return;
    }
    const updated = await deleteSection(activePageId, secId);
    setPageConfig(updated);
    addToast('सेक्शन हटा दिया गया।', 'success');
  };

  // Submit Add Section
  const handleCreateNewSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionTitle.trim()) {
      addToast('कृपया सेक्शन का नाम या शीर्षक दर्ज करें', 'warning');
      return;
    }

    const draft: Partial<DynamicSectionConfig> = {
      type: newSectionType,
      title: newSectionTitle.trim(),
      subtitle: newSectionSubtitle.trim(),
      badge: newSectionBadge.trim(),
      bgColor: newSectionBgColor,
      textColor: newSectionTextColor,
      buttonText: newSectionBtnText.trim(),
      buttonLink: newSectionBtnLink.trim(),
      items: [],
    };

    // If colossal gallery or features grid, seed with some items
    if (newSectionType === 'colossal_gallery') {
      draft.items = USER_UPLOADED_SHOWCASE_IMAGES.slice(0, 6).map((img) => ({
        id: `img_${Date.now()}_${img.id}`,
        title: img.title,
        subtitle: img.category,
        imageUrl: img.url,
        badge: img.category,
      }));
    } else if (newSectionType === 'features_grid') {
      draft.items = [
        {
          id: 'feat_1',
          title: '100% विश्वसनीय कारीगर',
          description: 'सख्त सत्यापन और पुलिस जांच के बाद स्वीकृत।',
          badge: 'VERIFIED',
        },
        {
          id: 'feat_2',
          title: 'त्वरित 30 मिनट सेवा',
          description: 'स्थानीय कारीगर तुरंत आपके दरवाजे पर।',
          badge: 'EXPRESS',
        },
      ];
    } else if (newSectionType === 'faq') {
      draft.items = [
        {
          id: 'faq_1',
          title: 'क्या मुझे सर्विस वारंटी मिलती है?',
          description: 'हाँ, हमारी सभी सेवाओं पर 30 दिन की निःशुल्क वारंटी है।',
        },
      ];
    }

    const updated = await addSection(activePageId, draft);
    setPageConfig(updated);
    setIsAddSectionModalOpen(false);
    setNewSectionTitle('');
    setNewSectionSubtitle('');
    addToast('नया सेक्शन सफलतापूर्वक जोड़ दिया गया!', 'success');
  };

  // Add Image to Section
  const handleAddImage = async (secId: string) => {
    if (!newImageUrl.trim()) {
      addToast('कृपया इमेज का यूआरएल (URL) दर्ज करें या प्रीसेट चुनें', 'warning');
      return;
    }

    const newItem: PageSectionItem = {
      id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newImageTitle.trim() || 'Work Photo',
      subtitle: newImageCategory.trim() || 'Service',
      imageUrl: newImageUrl.trim(),
      badge: newImageCategory.trim() || 'Gallery',
    };

    const updated = await addSectionItem(activePageId, secId, newItem);
    setPageConfig(updated);
    setImageManagerSection(
      updated.sections.find((s) => s.id === secId) || null
    );
    setNewImageUrl('');
    setNewImageTitle('');
    addToast('तस्वीर सफलतापूर्वक जोड़ दी गई!', 'success');
  };

  // Remove Image from Section
  const handleRemoveImage = async (secId: string, itemId: string) => {
    const updated = await removeSectionItem(activePageId, secId, itemId);
    setPageConfig(updated);
    setImageManagerSection(
      updated.sections.find((s) => s.id === secId) || null
    );
    addToast('तस्वीर हटा दी गई।', 'info');
  };

  // Handle Image File Upload (Base64 conversion)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        addToast('कृपया 4MB से कम साइज की इमेज चुनें', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setNewImageUrl(base64);
        if (!newImageTitle) {
          setNewImageTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        addToast('इमेज लोड हो गई! अब "गैलरी में जोड़ें" पर क्लिक करें।', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6 animate-entry pb-20">
      {/* Top Header Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-600/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
              <Palette className="w-3.5 h-3.5" />
              <span>DYNAMIC PAGE BUILDER & CMS STUDIO</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
              🎨 वेब पेज कस्टमाइज़र & व्यू बिल्डर
            </h1>
            <p className="text-sm sm:text-base text-stone-600 dark:text-stone-300 max-w-3xl leading-relaxed">
              एडमिन के रूप में वेबसाइट के किसी भी पेज का व्यू, रंग, नई तस्वीरें, नए सेक्शंस जोड़ें और किसी भी हिस्से को लाइव तुरंत हटाएं या छुपाएं।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Eye className="w-4 h-4 text-orange-500" />
              <span>लाइव प्रीव्यू</span>
            </button>

            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-rose-50 dark:bg-stone-800 dark:hover:bg-rose-950/40 text-stone-700 hover:text-rose-600 dark:text-stone-300 dark:hover:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border border-transparent hover:border-rose-300"
              title="डिफ़ॉल्ट लेआउट पर रीसेट करें"
            >
              <RotateCcw className="w-4 h-4" />
              <span>रीसेट</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:scale-105"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>सेव हो रहा है...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>बदलाव लाइव करें (Publish)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Page Tabs Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(
          [
            { id: 'home', name: '🏠 मुख्य पृष्ठ (Home)', count: pageConfig.sections.length },
            { id: 'services', name: '🛠️ सर्विस कैटलॉग (Services)' },
            { id: 'why_us', name: '🛡️ हमारे बारे में (Why Us)' },
            { id: 'bookings', name: '📋 मेरी बुकिंग्स (Bookings)' },
            { id: 'pro_dashboard', name: '👷 कारीगर पोर्टल (Pro)' },
            { id: 'franchise', name: '🏢 फ्रैंचाइज़ पोर्टल (Franchise)' },
            { id: 'partner_dashboard', name: '🤝 वेंडर पोर्टल (Partner)' },
          ] as const
        ).map((pg) => {
          const isActive = activePageId === pg.id;
          return (
            <button
              key={pg.id}
              onClick={() => setActivePageId(pg.id as SupportedPageId)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-orange-600 text-white shadow-md scale-102'
                  : 'bg-white/80 dark:bg-stone-900/80 hover:bg-orange-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800'
              }`}
            >
              <span>{pg.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Theme & Colors (Left) + Sections & Pictures (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Page Appearance & Colors */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-stone-200 dark:border-stone-800 space-y-5 shadow-lg">
            <div className="flex items-center gap-2.5 text-stone-900 dark:text-white border-b border-stone-100 dark:border-stone-800 pb-3">
              <Palette className="w-5 h-5 text-orange-500" />
              <h2 className="text-base font-black">
                {pageConfig.pageNameHindi} के रंग व रूप (Colors & Style)
              </h2>
            </div>

            {/* Quick Color Palette Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                त्वरित कलर थीम (Color Palette Presets)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.name}
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...pageConfig,
                        theme: {
                          ...pageConfig.theme,
                          primaryColor: pal.primary,
                          secondaryColor: pal.secondary,
                        },
                      };
                      setPageConfig(updated);
                      setHasUnsavedChanges(true);
                    }}
                    className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center gap-2 text-left hover:border-orange-500 transition-all cursor-pointer"
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-xs shrink-0"
                      style={{ backgroundColor: pal.primary }}
                    />
                    <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200 truncate">
                      {pal.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Primary & Secondary Color Pickers */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  प्राइमरी रंग (Primary)
                </label>
                <div className="flex items-center gap-2 p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                  <input
                    type="color"
                    value={pageConfig.theme.primaryColor || '#ea580c'}
                    onChange={(e) => {
                      setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, primaryColor: e.target.value },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                    {pageConfig.theme.primaryColor}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                  सेकेंडरी रंग (Secondary)
                </label>
                <div className="flex items-center gap-2 p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                  <input
                    type="color"
                    value={pageConfig.theme.secondaryColor || '#0f766e'}
                    onChange={(e) => {
                      setPageConfig({
                        ...pageConfig,
                        theme: { ...pageConfig.theme, secondaryColor: e.target.value },
                      });
                      setHasUnsavedChanges(true);
                    }}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono font-bold text-stone-800 dark:text-stone-200">
                    {pageConfig.theme.secondaryColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Background Style Mode */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                पेज बैकग्राउंड स्टाइल (Background Look)
              </label>
              <select
                value={pageConfig.theme.bgStyle || 'default'}
                onChange={(e) => {
                  setPageConfig({
                    ...pageConfig,
                    theme: {
                      ...pageConfig.theme,
                      bgStyle: e.target.value as BgStyleType,
                    },
                  });
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-bold text-stone-900 dark:text-white"
              >
                <option value="default">✨ Default Modern Clean (सफेद / हल्का ग्लास)</option>
                <option value="dark">🌙 Dark Luxury (गहरा प्रीमियम ब्लैक)</option>
                <option value="glass">🔮 Glassmorphism Frosted (आकर्षक ग्लास इफ़ेक्ट)</option>
                <option value="sunset">🌅 Sunset Warm Amber (सूर्योदय अम्बर)</option>
                <option value="emerald">🌲 Emerald Fresh Nature (हरा प्रकृति)</option>
                <option value="cyber">⚡ Cyber Neon Glow (हाई-टेक साइबर)</option>
                <option value="royal_blue">👑 Royal Indigo Deep (शाही नीला)</option>
              </select>
            </div>

            {/* Banner Titles & Texts */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-stone-600 dark:text-stone-300">
                शीर्ष मुख्य बैनर टेक्स्ट (Hero Banner Text)
              </label>

              <div className="space-y-1">
                <span className="text-[11px] text-stone-500 font-medium">बैज टेक्स्ट:</span>
                <input
                  type="text"
                  value={pageConfig.theme.bannerBadgeText || ''}
                  onChange={(e) => {
                    setPageConfig({
                      ...pageConfig,
                      theme: { ...pageConfig.theme, bannerBadgeText: e.target.value },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-stone-50 dark:bg-stone-900"
                  placeholder="उदा. Bhopal's #1 Home Services"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-stone-500 font-medium">मुख्य हेडिंग:</span>
                <input
                  type="text"
                  value={pageConfig.theme.bannerHeadline || ''}
                  onChange={(e) => {
                    setPageConfig({
                      ...pageConfig,
                      theme: { ...pageConfig.theme, bannerHeadline: e.target.value },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-stone-50 dark:bg-stone-900"
                  placeholder="घर का हर काम, अब आसान"
                />
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-stone-500 font-medium">सबहेडिंग विवरण:</span>
                <textarea
                  rows={2}
                  value={pageConfig.theme.bannerSubheadline || ''}
                  onChange={(e) => {
                    setPageConfig({
                      ...pageConfig,
                      theme: { ...pageConfig.theme, bannerSubheadline: e.target.value },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-stone-50 dark:bg-stone-900"
                  placeholder="Verified professionals को खोजें..."
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAll}
              className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>रंग व थीम बदलाव लागू करें</span>
            </button>
          </div>
        </div>

        {/* Right Columns (span 2): Dynamic Sections Manager */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-500" />
                  <span>पेज के सभी सेक्शन्स (Sections Management)</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  क्रम बदलें (Up/Down), नया जोड़ें (+), फोटो बदलें (🖼️), या किसी भी सेक्शन को छुपाएं/हटाएं।
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all self-start sm:self-auto hover:scale-102"
              >
                <Plus className="w-4 h-4" />
                <span>+ नया सेक्शन जोड़ें</span>
              </button>
            </div>

            {/* List of Sections */}
            <div className="space-y-3">
              {pageConfig.sections.map((section, index) => {
                const isFirst = index === 0;
                const isLast = index === pageConfig.sections.length - 1;
                const hasGallery =
                  section.type === 'colossal_gallery' ||
                  section.type === 'features_grid' ||
                  (section.items && section.items.length > 0);

                return (
                  <div
                    key={section.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      section.visible
                        ? 'bg-white/90 dark:bg-stone-900/90 border-stone-200 dark:border-stone-800 shadow-xs'
                        : 'bg-stone-100/60 dark:bg-stone-950/40 border-dashed border-stone-300 dark:border-stone-800 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Drag / Order & Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-black flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-stone-900 dark:text-white">
                              {section.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {section.type}
                            </span>
                            {section.isCustom && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                CUSTOM
                              </span>
                            )}
                            {!section.visible && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                HIDDEN (छिपा हुआ)
                              </span>
                            )}
                          </div>
                          {section.subtitle && (
                            <p className="text-[11px] text-stone-500 line-clamp-1">
                              {section.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveSection(section.id, 'up')}
                          disabled={isFirst}
                          title="ऊपर ले जाएं"
                          className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveSection(section.id, 'down')}
                          disabled={isLast}
                          title="नीचे ले जाएं"
                          className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                        </button>

                        {/* Pictures Manager button if gallery/images */}
                        <button
                          type="button"
                          onClick={() => setImageManagerSection(section)}
                          title="नई तस्वीरें जोड़ें या बदलें"
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>तस्वीरें ({section.items?.length || 0})</span>
                        </button>

                        {/* Edit details */}
                        <button
                          type="button"
                          onClick={() => setEditingSection(section)}
                          title="सेक्शन एडिट करें"
                          className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle visibility */}
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(section.id)}
                          title={section.visible ? 'सेक्शन छुपाएं' : 'सेक्शन दिखाएं'}
                          className={`p-1.5 rounded-xl border cursor-pointer ${
                            section.visible
                              ? 'border-stone-200 dark:border-stone-700 text-stone-600 hover:text-rose-600'
                              : 'border-orange-500/50 bg-orange-500/10 text-orange-600'
                          }`}
                        >
                          {section.visible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Section */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(section.id, section.title)}
                          title="सेक्शन हटाएं"
                          className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: ADD NEW SECTION ================= */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-black text-stone-900 dark:text-white">
                  + नया सेक्शन जोड़ें (Add New Section)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSection} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  सेक्शन का प्रकार (Section Template Type)
                </label>
                <select
                  value={newSectionType}
                  onChange={(e) => {
                    const st = e.target.value as SectionType;
                    setNewSectionType(st);
                    if (st === 'custom_banner') {
                      setNewSectionTitle('🔥 विशेष ऑफर बैनर');
                      setNewSectionSubtitle('आज ही बुकिंग पर पाएं 20% तक का डिस्काउंट');
                    } else if (st === 'colossal_gallery') {
                      setNewSectionTitle('🖼️ हमारे कार्यों की फोटो गैलरी');
                      setNewSectionSubtitle('भोपाल में वास्तविक कार्य स्थल की तस्वीरें');
                    } else if (st === 'features_grid') {
                      setNewSectionTitle('⭐ हमारी मुख्य विशेषताएं');
                    } else if (st === 'faq') {
                      setNewSectionTitle('❓ जरूरी सवाल-जवाब (FAQ)');
                    } else if (st === 'cta_action') {
                      setNewSectionTitle('📞 आपातकालीन सहायता केंद्र');
                      setNewSectionSubtitle('24x7 तत्काल समाधान के लिए सीधे संपर्क करें');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-xs font-bold text-stone-900 dark:text-white"
                >
                  <option value="custom_banner">📢 प्रमोशनल ऑफर बैनर (Offer Banner)</option>
                  <option value="colossal_gallery">🖼️ फोटो गैलरी व वर्क शोकेस (Image Gallery)</option>
                  <option value="features_grid">🛡️ फीचर्स व गारंटी ग्रिड (Why Choose Us Grid)</option>
                  <option value="testimonial_reviews">⭐ कस्टमर रिव्यू व रेटिंग्स (Reviews Grid)</option>
                  <option value="faq">❓ अक्सर पूछे जाने वाले सवाल (FAQ Accordion)</option>
                  <option value="cta_action">📞 कॉल व व्हाट्सएप एक्शन बॉक्स (CTA Action)</option>
                  <option value="custom_html_text">📝 कस्टम टेक्स्ट व सूचना बॉक्स (Rich Notice)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  सेक्शन शीर्षक (Section Heading) *
                </label>
                <input
                  type="text"
                  required
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white"
                  placeholder="उदा. भोपाल स्पेशल डिस्काउंट"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  सबहेडिंग या विवरण (Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={newSectionSubtitle}
                  onChange={(e) => setNewSectionSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-white"
                  placeholder="उदा. सभी प्लंबिंग व एसी सर्विस पर भारी छूट"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    बैज टैग (Badge)
                  </label>
                  <input
                    type="text"
                    value={newSectionBadge}
                    onChange={(e) => setNewSectionBadge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-white dark:bg-stone-900"
                    placeholder="SPECIAL OFFER"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    बैकग्राउंड रंग (Background Color)
                  </label>
                  <div className="flex items-center gap-2 p-1.5 rounded-xl border border-stone-200 dark:border-stone-700">
                    <input
                      type="color"
                      value={newSectionBgColor}
                      onChange={(e) => setNewSectionBgColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono">{newSectionBgColor}</span>
                  </div>
                </div>
              </div>

              {newSectionType === 'custom_banner' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      बटन टेक्स्ट (Button Text)
                    </label>
                    <input
                      type="text"
                      value={newSectionBtnText}
                      onChange={(e) => setNewSectionBtnText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs"
                      placeholder="अभी बुक करें"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      बटन लिंक (Link / Tab)
                    </label>
                    <input
                      type="text"
                      value={newSectionBtnLink}
                      onChange={(e) => setNewSectionBtnLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs"
                      placeholder="#services"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  सेक्शन जोड़ें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: PICTURES & GALLERY MANAGER ("Nayi Pic Add Karein") ================= */}
      {imageManagerSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-3xl w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-500" />
                  <span>तस्वीरें जोड़ें व बदलें (Pictures Manager)</span>
                </h3>
                <p className="text-xs text-stone-500">
                  सेक्शन: "{imageManagerSection.title}" ({imageManagerSection.items?.length || 0} तस्वीरें)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImageManagerSection(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Picture Form */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-3">
              <h4 className="text-xs font-black text-stone-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-orange-500" />
                <span>+ नई तस्वीर जोड़ें (Upload or Enter Image URL)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                    इमेज यूआरएल (Image URL या फ़ाइल नाम)
                  </label>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-white dark:bg-stone-900 font-mono"
                    placeholder="https://... या 1788786162664.png"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                    कंप्यूटर से इमेज चुनें (Upload Local File)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-orange-600 file:text-white hover:file:bg-orange-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                    तस्वीर का शीर्षक (Title)
                  </label>
                  <input
                    type="text"
                    value={newImageTitle}
                    onChange={(e) => setNewImageTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-white dark:bg-stone-900"
                    placeholder="उदा. न्यू एसी इंस्टॉलेशन कार्य"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300">
                    कैटेगरी या टैग (Category / Tag)
                  </label>
                  <input
                    type="text"
                    value={newImageCategory}
                    onChange={(e) => setNewImageCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 text-xs bg-white dark:bg-stone-900"
                    placeholder="उदा. Electrical, AC, Plumbing"
                  />
                </div>
              </div>

              {/* Quick Preset Selector from existing project work photos */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-stone-500 uppercase">
                  या पहले से उपलब्ध कार्य फोटो में से चुनें:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {USER_UPLOADED_SHOWCASE_IMAGES.slice(0, 10).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setNewImageUrl(preset.url);
                        setNewImageTitle(preset.title);
                        setNewImageCategory(preset.category);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 whitespace-nowrap hover:border-orange-500 cursor-pointer shrink-0"
                    >
                      {preset.title.split(' ')[0]} ({preset.category})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleAddImage(imageManagerSection.id)}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>गैलरी में तस्वीर जोड़ें</span>
                </button>
              </div>
            </div>

            {/* Current Pictures Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                वर्तमान में शामिल तस्वीरें ({imageManagerSection.items?.length || 0}):
              </h4>

              {(!imageManagerSection.items || imageManagerSection.items.length === 0) && (
                <div className="p-8 text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl text-xs text-stone-500">
                  इस सेक्शन में अभी कोई तस्वीर नहीं है। ऊपर दिए गए फॉर्म से नई तस्वीर जोड़ें।
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(imageManagerSection.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="relative group rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 flex flex-col"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-stone-200 dark:bg-stone-700 relative">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveImage(imageManagerSection.id, item.id)
                        }
                        title="तस्वीर हटाएं"
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-[11px] font-bold text-stone-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      {item.badge && (
                        <span className="text-[9px] font-semibold text-orange-600 dark:text-orange-400">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: EDIT SECTION DETAILS ("Sabkuch Badlein") ================= */}
      {editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 dark:border-stone-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <h3 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-500" />
                <span>सेक्शन एडिट करें: {editingSection.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold">शीर्षक (Title):</label>
                <input
                  type="text"
                  value={editingSection.title}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold">सबहेडिंग (Subtitle):</label>
                <textarea
                  rows={2}
                  value={editingSection.subtitle || ''}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">बैज (Badge):</label>
                  <input
                    type="text"
                    value={editingSection.badge || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, badge: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">बैकग्राउंड कलर:</label>
                  <div className="flex items-center gap-2 p-1 rounded-xl border border-stone-200 dark:border-stone-700">
                    <input
                      type="color"
                      value={editingSection.bgColor || '#ea580c'}
                      onChange={(e) =>
                        setEditingSection({ ...editingSection, bgColor: e.target.value })
                      }
                      className="w-6 h-6 border-0 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono">{editingSection.bgColor}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">बटन टेक्स्ट:</label>
                  <input
                    type="text"
                    value={editingSection.buttonText || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, buttonText: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold">बटन लिंक:</label>
                  <input
                    type="text"
                    value={editingSection.buttonLink || ''}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, buttonLink: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={async () => {
                  const updated = await updateSection(
                    activePageId,
                    editingSection.id,
                    editingSection
                  );
                  setPageConfig(updated);
                  setEditingSection(null);
                  addToast('सेक्शन विवरण अपडेट कर दिया गया।', 'success');
                }}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md cursor-pointer"
              >
                अपडेट सेव करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: LIVE PREVIEW MODAL ================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-950 rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col border border-stone-800 shadow-2xl overflow-hidden">
            {/* Top Preview Bar */}
            <div className="px-6 py-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  लाइव लेआउट प्रीव्यू: {pageConfig.pageNameHindi}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewDevice === 'desktop'
                      ? 'bg-orange-600 text-white'
                      : 'text-stone-400 hover:text-white'
                  }`}
                  title="डेस्कटॉप व्यू"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    previewDevice === 'mobile'
                      ? 'bg-orange-600 text-white'
                      : 'text-stone-400 hover:text-white'
                  }`}
                  title="मोबाइल व्यू"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer ml-3"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Simulated Frame */}
            <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center bg-stone-900/50">
              <div
                className={`w-full transition-all duration-300 rounded-3xl overflow-hidden border border-stone-800 shadow-2xl bg-white dark:bg-stone-950 text-stone-900 dark:text-white p-6 space-y-8 ${
                  previewDevice === 'mobile' ? 'max-w-md' : 'max-w-4xl'
                }`}
              >
                {/* Hero preview */}
                <div
                  className="rounded-3xl p-8 text-center space-y-4 shadow-xl"
                  style={{
                    backgroundColor: pageConfig.theme.primaryColor || '#ea580c',
                    color: '#ffffff',
                  }}
                >
                  {pageConfig.theme.bannerBadgeText && (
                    <span className="inline-block px-3 py-1 rounded-full bg-black/25 text-xs font-bold uppercase">
                      {pageConfig.theme.bannerBadgeText}
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-black">
                    {pageConfig.theme.bannerHeadline || 'मुख्य शीर्षक'}
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90 max-w-lg mx-auto">
                    {pageConfig.theme.bannerSubheadline || 'सबहेडिंग विवरण'}
                  </p>
                </div>

                {/* Visible sections preview */}
                <div className="space-y-6">
                  {pageConfig.sections
                    .filter((s) => s.visible)
                    .map((s, idx) => (
                      <div
                        key={s.id}
                        className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2 bg-stone-50/50 dark:bg-stone-900/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{s.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600">
                            {s.type}
                          </span>
                        </div>
                        {s.subtitle && (
                          <p className="text-xs text-stone-500">{s.subtitle}</p>
                        )}
                        {s.items && s.items.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 pt-2">
                            {s.items.slice(0, 3).map((item) => (
                              <div
                                key={item.id}
                                className="aspect-video rounded-xl bg-stone-200 dark:bg-stone-800 overflow-hidden relative"
                              >
                                {item.imageUrl && (
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

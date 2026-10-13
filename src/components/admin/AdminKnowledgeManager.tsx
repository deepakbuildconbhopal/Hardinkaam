import React, { useState, useEffect } from 'react';
import {
  knowledgeBaseService,
  KnowledgeArticle,
  KnowledgeCategory,
  DEFAULT_VERIFIED_KNOWLEDGE,
} from '../assistant/knowledgeBaseService';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  Search,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  Tag,
  DollarSign,
  MapPin,
  Briefcase,
  Layers,
  Phone,
  RotateCcw,
} from 'lucide-react';

export const AdminKnowledgeManager: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);
    const data = await knowledgeBaseService.syncFromFirestore();
    setArticles(data.length > 0 ? data : DEFAULT_VERIFIED_KNOWLEDGE);
    setIsLoading(false);
  };

  const handleStartCreate = () => {
    const newArt: KnowledgeArticle = {
      id: 'kb_' + Date.now().toString(36),
      category: 'faqs',
      title: '',
      hindiTitle: '',
      keywords: [],
      content: '',
      hindiContent: '',
      bullets: [],
      hindiBullets: [],
      lastUpdated: new Date().toISOString().split('T')[0],
      verifiedBy: 'Super Admin',
      isVerified: true,
    };
    setEditingArticle(newArt);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (art: KnowledgeArticle) => {
    setEditingArticle({ ...art });
    setIsCreatingNew(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle || !editingArticle.title || !editingArticle.content) {
      alert('कृपया शीर्षक और सामग्री भरें');
      return;
    }

    setIsLoading(true);
    const ok = await knowledgeBaseService.saveArticle(editingArticle);
    setIsLoading(false);

    if (ok) {
      setSaveSuccessMsg('लेख सफलतापूर्वक सुरक्षित किया गया!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setEditingArticle(null);
      setIsCreatingNew(false);
      loadArticles();
    } else {
      alert('लेख सुरक्षित करने में समस्या आई');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('क्या आप निश्चित रूप से इस ज्ञान लेख (Knowledge Article) को हटाना चाहते हैं?')) return;
    setIsLoading(true);
    await knowledgeBaseService.deleteArticle(id);
    setIsLoading(false);
    loadArticles();
  };

  const filteredArticles = articles.filter((a) => {
    const matchesCat = selectedCategory === 'all' || a.category === selectedCategory;
    const matchesQuery =
      searchQuery === '' ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.hindiTitle && a.hindiTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  const categoryIcons: Record<KnowledgeCategory, React.ReactNode> = {
    services: <Layers className="w-4 h-4 text-orange-500" />,
    pricing: <DollarSign className="w-4 h-4 text-emerald-500" />,
    booking_process: <BookOpen className="w-4 h-4 text-blue-500" />,
    cancellation_rules: <RotateCcw className="w-4 h-4 text-red-500" />,
    payment_info: <DollarSign className="w-4 h-4 text-teal-500" />,
    service_areas: <MapPin className="w-4 h-4 text-purple-500" />,
    partner_info: <Briefcase className="w-4 h-4 text-amber-500" />,
    franchise_info: <ShieldCheck className="w-4 h-4 text-indigo-500" />,
    support_info: <Phone className="w-4 h-4 text-rose-500" />,
    faqs: <HelpCircle className="w-4 h-4 text-sky-500" />,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-orange-950 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-orange-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>KaamDost AI Knowledge Hub</span>
          </div>
          <h2 className="text-2xl font-black mt-1">सत्यापित ज्ञान प्रणाली (Verified Knowledge Base)</h2>
          <p className="text-stone-300 text-xs mt-1 max-w-xl">
            KaamDost AI केवल इसी सत्यापित ज्ञानकोष से उत्तर देता है। यहां से सेवाएं, दरें, नियम, और अक्सर पूछे जाने वाले सवाल रियल-टाइम में अपडेट करें।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadArticles}
            disabled={isLoading}
            className="p-2.5 bg-stone-800 hover:bg-stone-700 rounded-xl text-stone-200 transition cursor-pointer border border-stone-700"
            title="रीलोड करें"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleStartCreate}
            className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 shadow-lg shadow-orange-900/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>नया लेख जोड़ें (Add Article)</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="कीवर्ड, शीर्षक या विषय खोजें..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'सभी (All)' },
            { id: 'services', label: 'सेवाएं' },
            { id: 'pricing', label: 'दरें/रेट' },
            { id: 'booking_process', label: 'बुकिंग' },
            { id: 'cancellation_rules', label: 'कैंसिलेशन' },
            { id: 'payment_info', label: 'पेमेंट' },
            { id: 'service_areas', label: 'क्षेत्र' },
            { id: 'partner_info', label: 'पार्टनर' },
            { id: 'franchise_info', label: 'फ्रेंचाइजी' },
            { id: 'support_info', label: 'सपोर्ट' },
            { id: 'faqs', label: 'FAQs' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map((art) => (
          <div
            key={art.id}
            className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-orange-300 transition shadow-xs flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-stone-100 shrink-0">
                    {categoryIcons[art.category] || <BookOpen className="w-4 h-4 text-stone-500" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">
                      {art.category.replace('_', ' ')}
                    </span>
                    <h3 className="text-sm font-black text-stone-900 group-hover:text-orange-950 leading-tight">
                      {art.hindiTitle || art.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(art)}
                    className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-900 transition cursor-pointer"
                    title="संपादित करें (Edit)"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(art.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 transition cursor-pointer"
                    title="हटाएं (Delete)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                {art.hindiContent || art.content}
              </p>

              {/* Highlights */}
              {(art.hindiBullets || art.bullets) && (
                <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100 space-y-1">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-wider block">मुख्य बिंदु</span>
                  <div className="space-y-0.5">
                    {(art.hindiBullets || art.bullets)?.slice(0, 3).map((b, i) => (
                      <div key={i} className="text-[11px] text-stone-700 truncate font-medium">
                        • {b}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords chips */}
              <div className="flex flex-wrap gap-1 pt-1">
                {art.keywords.slice(0, 5).map((kw, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200/60 flex items-center gap-0.5"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                {art.verifiedBy}
              </span>
              <span>अंतिम अपडेट: {art.lastUpdated}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black text-stone-900">
                  {isCreatingNew ? 'नया ज्ञान लेख जोड़ें (New Article)' : 'ज्ञान लेख संपादित करें (Edit Article)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingArticle(null)}
                className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">श्रेणी (Category)</label>
                  <select
                    value={editingArticle.category}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, category: e.target.value as KnowledgeCategory })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500 bg-white"
                  >
                    <option value="services">Services (सेवाएं)</option>
                    <option value="pricing">Pricing (दरें व रेट कार्ड)</option>
                    <option value="booking_process">Booking Process (बुकिंग प्रक्रिया)</option>
                    <option value="cancellation_rules">Cancellation Rules (कैंसिलेशन नियम)</option>
                    <option value="payment_info">Payment Info (पेमेंट जानकारी)</option>
                    <option value="service_areas">Service Areas (सेवा क्षेत्र)</option>
                    <option value="partner_info">Partner Info (पार्टनर ऑनबोर्डिंग)</option>
                    <option value="franchise_info">Franchise Info (फ्रेंचाइजी)</option>
                    <option value="support_info">Support Info (सपोर्ट हेल्पलाइन)</option>
                    <option value="faqs">FAQs (अक्सर पूछे जाने वाले सवाल)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1">आर्टिकल आईडी (Unique ID)</label>
                  <input
                    type="text"
                    disabled={!isCreatingNew}
                    value={editingArticle.id}
                    onChange={(e) => setEditingArticle({ ...editingArticle, id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden bg-stone-50 font-mono text-stone-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">हिंदी शीर्षक (Hindi Title)</label>
                <input
                  type="text"
                  required
                  placeholder="उदा. पारदर्शी मूल्य निर्धारण व रेट कार्ड"
                  value={editingArticle.hindiTitle || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, hindiTitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">अंग्रेजी शीर्षक (English Title)</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Transparent Pricing & Rate Cards"
                  value={editingArticle.title}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">हिंदी विवरण (Hindi Content / Answer)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="KaamDost AI द्वारा ग्राहक को दिया जाने वाला सत्यापित उत्तर..."
                  value={editingArticle.hindiContent || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, hindiContent: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">अंग्रेजी विवरण (English Content)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Verified response provided to English queries..."
                  value={editingArticle.content}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-stone-700 block mb-1">
                  कीवर्ड्स (Keywords — कॉमा लगाकर लिखें)
                </label>
                <input
                  type="text"
                  placeholder="price, cost, rate, rate card, fees, खर्च, दाम"
                  value={editingArticle.keywords.join(', ')}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      keywords: e.target.value
                        .split(',')
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{isLoading ? 'सुरक्षित हो रहा है...' : 'सुरक्षित करें (Save Article)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

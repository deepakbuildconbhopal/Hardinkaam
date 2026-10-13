import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Search,
  Filter,
  Calendar,
  User,
  ArrowLeft,
  Eye,
  Star,
  RefreshCw,
  AlertCircle,
  X,
  Share2,
  Plus,
  Radio,
  ExternalLink,
  MapPin,
  Sparkles,
  Check
} from 'lucide-react';
import { Article } from '../../types/blog';
import { blogService } from '../../services/blogService';
import { rssNewsService, RSSNewsItem, INDIAN_STATES_FOR_NEWS, NewsStateName } from '../../services/rssNewsService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { AdSenseBanner } from '../ads/AdSenseBanner';

interface Props {
  onBackToHome: () => void;
}

export const PublicBlogView: React.FC<Props> = ({ onBackToHome }) => {
  const { currentUser, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [activeViewTab, setActiveViewTab] = useState<'rss_state_news' | 'franchise_articles'>('rss_state_news');
  const [selectedState, setSelectedState] = useState<NewsStateName>('Madhya Pradesh');

  // RSS News state
  const [rssItems, setRssItems] = useState<RSSNewsItem[]>([]);
  const [rssLoading, setRssLoading] = useState(false);
  const [selectedRssItem, setSelectedRssItem] = useState<RSSNewsItem | null>(null);

  // Custom Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Publish Modal state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [pubTitleHi, setPubTitleHi] = useState('');
  const [pubTitleEn, setPubTitleEn] = useState('');
  const [pubCategory, setPubCategory] = useState('Bhopal News');
  const [pubState, setPubState] = useState('Madhya Pradesh');
  const [pubContentHi, setPubContentHi] = useState('');
  const [pubContentEn, setPubContentEn] = useState('');
  const [pubShortDesc, setPubShortDesc] = useState('');
  const [pubImageUrl, setPubImageUrl] = useState('');
  const [pubAuthor, setPubAuthor] = useState('Deepak Buildcon Franchise Board');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadPublicArticles();
  }, []);

  useEffect(() => {
    loadStateRssNews(selectedState);
  }, [selectedState]);

  const loadPublicArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await blogService.getArticles();
      setArticles(data.filter((a) => a.status === 'published'));
    } catch (err: any) {
      setError(err.message || 'Failed to load blog articles');
    } finally {
      setLoading(false);
    }
  };

  const loadStateRssNews = async (stateName: string) => {
    setRssLoading(true);
    try {
      const items = await rssNewsService.fetchStateNews(stateName);
      setRssItems(items);
    } catch (err) {
      console.error('Error fetching state RSS news:', err);
    } finally {
      setRssLoading(false);
    }
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitleHi.trim() && !pubTitleEn.trim()) {
      addToast('कृपया समाचार का शीर्षक दर्ज करें', 'warning');
      return;
    }

    setPublishing(true);
    try {
      const slug = (pubTitleEn || pubTitleHi)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-') || `news-${Date.now()}`;

      await blogService.createArticle({
        titleEn: pubTitleEn.trim() || pubTitleHi.trim(),
        titleHi: pubTitleHi.trim() || pubTitleEn.trim(),
        slug,
        category: pubCategory,
        contentEn: pubContentEn.trim() || pubContentHi.trim(),
        contentHi: pubContentHi.trim() || pubContentEn.trim(),
        shortDescEn: pubShortDesc.trim() || 'नवीनतम राज्य समाचार एवं अपडेट',
        shortDescHi: pubShortDesc.trim() || 'नवीनतम राज्य समाचार एवं अपडेट',
        imageUrl: pubImageUrl.trim() || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80',
        author: pubAuthor.trim() || 'Hardinkaam Editorial Board',
        publishedAt: new Date().toISOString(),
        status: 'published',
        isFeatured: false,
        state: pubState
      });

      addToast('समाचार / ब्लॉग पोस्ट सफलतापूर्वक प्रकाशित हो गया!', 'success');
      setIsPublishModalOpen(false);
      resetPublishForm();
      loadPublicArticles();
    } catch (err: any) {
      addToast('पोस्ट प्रकाशित करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const resetPublishForm = () => {
    setPubTitleHi('');
    setPubTitleEn('');
    setPubContentHi('');
    setPubContentEn('');
    setPubShortDesc('');
    setPubImageUrl('');
  };

  const featuredArticle = articles.find((a) => a.isFeatured) || articles[0];

  const filteredArticles = articles.filter((a) => {
    const matchesCat = selectedCategory === 'all' || a.category === selectedCategory;
    const matchesState = !selectedState || selectedState === 'All India' || a.state === selectedState || !a.state;
    const matchesSearch =
      !searchQuery ||
      a.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.titleHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.contentEn.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && matchesState;
  });

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans antialiased pb-24">
      {/* Header Bar */}
      <header className="bg-stone-900 border-b border-stone-800 sticky top-0 z-40 px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>होम (Home)</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                HARDINKAAM न्यूज़ व ब्लॉग पोर्टल
              </h1>
              <p className="text-[10px] text-amber-300 font-bold">
                लाइव राज्य समाचार RSS एवं फ्रैंचाइज़ी अपडेट्स
              </p>
            </div>
          </div>
        </div>

        {/* Publish Article Button (For Admin / Franchise / All Users) */}
        <button
          onClick={() => setIsPublishModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs rounded-2xl shadow-lg flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>✍️ नया पोस्ट / ब्लॉग प्रकाशित करें</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* State Selection Bar */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <MapPin className="w-4 h-4 text-orange-500 animate-bounce" />
              <span>राज्य चुनें (Select State for Live RSS & Local News):</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400 font-medium">चयनित राज्य:</span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/30">
                {selectedState}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {INDIAN_STATES_FOR_NEWS.map((st) => (
              <button
                key={st}
                onClick={() => setSelectedState(st)}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition cursor-pointer border ${
                  selectedState === st
                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-102 font-black'
                    : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white'
                }`}
              >
                {st === 'Madhya Pradesh' ? '🔴 मध्य प्रदेश (Bhopal/MP)' :
                 st === 'Uttar Pradesh' ? '🟡 उत्तर प्रदेश (UP)' :
                 st === 'Maharashtra' ? '🟠 महाराष्ट्र (MH)' :
                 st === 'Rajasthan' ? '🟣 राजस्थान (RJ)' : st}
              </button>
            ))}
          </div>
        </div>

        {/* View Switcher Tabs: RSS State News VS Official Franchise Articles */}
        <div className="flex flex-wrap items-center gap-2 bg-stone-900 p-2 rounded-2xl border border-stone-800 shadow-md">
          <button
            onClick={() => setActiveViewTab('rss_state_news')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              activeViewTab === 'rss_state_news'
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg scale-102'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Radio className="w-4 h-4 text-amber-200" />
            <span>🔴 {selectedState} - लाइव राज्य समाचार (RSS Feed)</span>
          </button>

          <button
            onClick={() => setActiveViewTab('franchise_articles')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer ${
              activeViewTab === 'franchise_articles'
                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg scale-102'
                : 'text-stone-300 hover:bg-stone-800'
            }`}
          >
            <Newspaper className="w-4 h-4 text-teal-200" />
            <span>📢 ऑफ़िशियल फ्रैंचाइज़ी ब्लॉग व समाचार ({articles.length})</span>
          </button>
        </div>

        {/* AdSense In-Feed Leaderboard */}
        <AdSenseBanner
          slot="3948572019"
          format="leaderboard"
          category="services"
          label="गूगल एडसेंस • NEWS PORTAL SPONSOR"
        />

        {/* TAB 1: LIVE STATE RSS NEWS */}
        {activeViewTab === 'rss_state_news' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-stone-900/60 p-3 rounded-2xl border border-stone-800">
              <span className="text-xs text-stone-400">
                {selectedState} के लिए सीधे लाइव राष्ट्रीय एवं क्षेत्रीय RSS समाचार फ़ीड
              </span>
              <button
                onClick={() => loadStateRssNews(selectedState)}
                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${rssLoading ? 'animate-spin' : ''}`} />
                <span>अपडेट फ़ीड</span>
              </button>
            </div>

            {rssLoading ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
                <p className="text-xs text-stone-400">{selectedState} के लाइव समाचार लोडिंग में हैं...</p>
              </div>
            ) : rssItems.length === 0 ? (
              <div className="py-16 text-center space-y-2 bg-stone-900 rounded-3xl border border-stone-800">
                <AlertCircle className="w-8 h-8 text-stone-500 mx-auto" />
                <p className="text-xs text-stone-400">इस राज्य हेतु समाचार प्राप्त नहीं हुए।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {rssItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedRssItem(item)}
                    className="bg-stone-900 border border-stone-800 hover:border-amber-500/50 rounded-3xl p-5 flex flex-col justify-between space-y-3 shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
                  >
                    <div className="space-y-2.5">
                      {item.imageUrl && (
                        <div className="h-40 rounded-2xl overflow-hidden border border-stone-800 relative">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-stone-950/80 backdrop-blur-xs text-amber-400 font-bold text-[10px] uppercase border border-amber-500/30">
                            {item.state}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-stone-400">
                        <span className="font-bold text-amber-300">{item.source}</span>
                        <span>•</span>
                        <span>{new Date(item.pubDate).toLocaleDateString('hi-IN')}</span>
                      </div>

                      <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-stone-400 line-clamp-3 leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-amber-400 font-bold">
                      <span>विस्तृत समाचार पढ़ें</span>
                      <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FRANCHISE & OFFICIAL ARTICLES */}
        {activeViewTab === 'franchise_articles' && (
          <div className="space-y-6">
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="समाचार एवं ब्लॉग खोजें..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl bg-stone-900 border border-stone-800 text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2.5 text-xs rounded-2xl bg-stone-900 border border-stone-800 font-medium text-white"
              >
                <option value="all">सभी श्रेणियाँ (All Categories)</option>
                <option value="Bhopal News">Bhopal News</option>
                <option value="Service Tips">Service Tips</option>
                <option value="Franchise Update">Franchise Update</option>
                <option value="Company News">Company News</option>
              </select>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticle(art)}
                  className="bg-stone-900 hover:bg-stone-850 rounded-3xl border border-stone-800 hover:border-teal-500/50 shadow-xl overflow-hidden cursor-pointer group flex flex-col justify-between transition-all"
                >
                  <div className="space-y-3">
                    <div className="relative h-44 overflow-hidden">
                      <img src={art.imageUrl} alt={art.titleEn} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-stone-900/90 backdrop-blur-xs text-teal-300 font-bold text-[10px] uppercase border border-stone-700">
                        {art.category}
                      </div>
                    </div>

                    <div className="px-5 space-y-1.5">
                      <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2">
                        {art.titleHi || art.titleEn}
                      </h3>
                      <p className="text-[11px] text-stone-400 line-clamp-2">{art.shortDescHi || art.shortDescEn}</p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 mt-4 border-t border-stone-800 flex items-center justify-between text-xs text-stone-400">
                    <span className="text-[11px]">{new Date(art.publishedAt).toLocaleDateString('hi-IN')}</span>
                    <span className="font-bold text-teal-400 group-hover:translate-x-1 transition-transform">पूरा पढ़ें →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* RSS NEWS READER MODAL */}
      {selectedRssItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-stone-800 space-y-4 my-auto relative text-stone-100">
            <button
              onClick={() => setSelectedRssItem(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-stone-700 cursor-pointer shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                {selectedRssItem.source} • {selectedRssItem.state}
              </span>
              <h2 className="text-xl font-bold text-white leading-snug">{selectedRssItem.title}</h2>
              <p className="text-xs text-stone-400">{new Date(selectedRssItem.pubDate).toLocaleString('hi-IN')}</p>
            </div>

            {selectedRssItem.imageUrl && (
              <div className="rounded-2xl overflow-hidden max-h-72 border border-stone-800">
                <img src={selectedRssItem.imageUrl} alt={selectedRssItem.title} className="w-full h-full object-cover" />
              </div>
            )}

            <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedRssItem.description}</p>

            <div className="flex items-center justify-between pt-4 border-t border-stone-800">
              <a
                href={selectedRssItem.link}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>मूल समाचार स्रोत पर खोलें</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${selectedRssItem.title}\n${selectedRssItem.link}`);
                  addToast('समाचार लिंक कॉपी हो गया!', 'success');
                }}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>शेयर करें</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ARTICLE READER MODAL */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-stone-900 rounded-3xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 border border-stone-800 space-y-5 my-auto relative text-stone-100">
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-stone-800 text-stone-300 flex items-center justify-center hover:bg-stone-700 cursor-pointer shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs uppercase border border-teal-500/30">
                {selectedArticle.category}
              </span>
              <h2 className="text-2xl font-black text-white">{selectedArticle.titleHi || selectedArticle.titleEn}</h2>
              <p className="text-xs text-stone-400">लेखक: {selectedArticle.author} • {new Date(selectedArticle.publishedAt).toLocaleDateString('hi-IN')}</p>
            </div>

            {selectedArticle.imageUrl && (
              <div className="rounded-2xl overflow-hidden max-h-80 border border-stone-800">
                <img src={selectedArticle.imageUrl} alt={selectedArticle.titleEn} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-4 text-sm text-stone-300 leading-relaxed border-t border-stone-800 pt-4">
              <p className="whitespace-pre-line">{selectedArticle.contentHi || selectedArticle.contentEn}</p>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH ARTICLE MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-amber-500/40 text-stone-100 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                <Sparkles className="w-5 h-5" />
                <span>नया ब्लॉग / समाचार प्रकाशित करें</span>
              </div>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-xl bg-stone-800 hover:bg-stone-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishArticle} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-bold mb-1">समाचार/लेख का शीर्षक (Hindi Title) *</label>
                <input
                  type="text"
                  required
                  value={pubTitleHi}
                  onChange={(e) => setPubTitleHi(e.target.value)}
                  placeholder="उदा. भोपाल में हार्डिनकाम होम सर्विसेज और रोजगार हब का नया विस्तार"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">अंग्रेजी शीर्षक (English Title)</label>
                <input
                  type="text"
                  value={pubTitleEn}
                  onChange={(e) => setPubTitleEn(e.target.value)}
                  placeholder="e.g. Hardinkaam Home Services Expands in Bhopal"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">राज्य (Target State)</label>
                  <select
                    value={pubState}
                    onChange={(e) => setPubState(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  >
                    {INDIAN_STATES_FOR_NEWS.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-300 font-bold mb-1">कैटेगरी</label>
                  <select
                    value={pubCategory}
                    onChange={(e) => setPubCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Bhopal News">भोपाल समाचार (Bhopal News)</option>
                    <option value="Service Tips">सर्विस गाइड (Service Tips)</option>
                    <option value="Franchise Update">फ्रैंचाइज़ी अपडेट (Franchise Update)</option>
                    <option value="Company News">कंपनी न्यूज़ (Company News)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">संक्षिप्त सारांश (Short Summary)</label>
                <input
                  type="text"
                  value={pubShortDesc}
                  onChange={(e) => setPubShortDesc(e.target.value)}
                  placeholder="मुख्य बिंदु जो कार्ड पर दिखेंगे..."
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-bold mb-1">समाचार का पूरा विवरण (Full Article Content) *</label>
                <textarea
                  rows={4}
                  required
                  value={pubContentHi}
                  onChange={(e) => setPubContentHi(e.target.value)}
                  placeholder="विस्तृत समाचार सामग्री लिखें..."
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-300 font-bold mb-1">इमेज URL (Image URL)</label>
                  <input
                    type="url"
                    value={pubImageUrl}
                    onChange={(e) => setPubImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-bold mb-1">लेखक का नाम (Author)</label>
                  <input
                    type="text"
                    value={pubAuthor}
                    onChange={(e) => setPubAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold rounded-xl transition cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-xl shadow-lg transition cursor-pointer"
                >
                  {publishing ? 'प्रकाशित हो रहा है...' : 'लाइव प्रकाशित करें'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

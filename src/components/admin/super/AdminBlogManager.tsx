import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  X,
  Globe,
  Tag,
  Calendar,
  User,
  Star,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { Article } from '../../../types/blog';
import { blogService } from '../../../services/blogService';

interface Props {
  onBack?: () => void;
}

export const AdminBlogManager: React.FC<Props> = ({ onBack }) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formTitleHi, setFormTitleHi] = useState('');
  const [formCategory, setFormCategory] = useState('Service Tips');
  const [formContentEn, setFormContentEn] = useState('');
  const [formContentHi, setFormContentHi] = useState('');
  const [formShortEn, setFormShortEn] = useState('');
  const [formShortHi, setFormShortHi] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formAuthor, setFormAuthor] = useState('Deepak Buildcon Team');
  const [formStatus, setFormStatus] = useState<'draft' | 'published'>('published');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formSlug, setFormSlug] = useState('');
  const [formSeoTitle, setFormSeoTitle] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');

  const loadArticles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await blogService.getArticles();
      setArticles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const openCreateModal = () => {
    setEditingArticle(null);
    setFormTitleEn('');
    setFormTitleHi('');
    setFormCategory('Service Tips');
    setFormContentEn('');
    setFormContentHi('');
    setFormShortEn('');
    setFormShortHi('');
    setFormImage('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80');
    setFormAuthor('Deepak Buildcon Team');
    setFormStatus('published');
    setFormFeatured(false);
    setFormSlug('');
    setFormSeoTitle('');
    setFormMetaDesc('');
    setIsCreating(true);
  };

  const openEditModal = (article: Article) => {
    setEditingArticle(article);
    setFormTitleEn(article.titleEn);
    setFormTitleHi(article.titleHi);
    setFormCategory(article.category);
    setFormContentEn(article.contentEn);
    setFormContentHi(article.contentHi);
    setFormShortEn(article.shortDescEn);
    setFormShortHi(article.shortDescHi);
    setFormImage(article.imageUrl);
    setFormAuthor(article.author);
    setFormStatus(article.status);
    setFormFeatured(article.isFeatured);
    setFormSlug(article.slug);
    setFormSeoTitle(article.seoTitle || '');
    setFormMetaDesc(article.metaDesc || '');
    setIsCreating(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleEn || !formContentEn) {
      alert('Please enter at least English Title and Content.');
      return;
    }

    const slugVal = formSlug.trim() || formTitleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const articlePayload = {
      titleEn: formTitleEn,
      titleHi: formTitleHi || formTitleEn,
      slug: slugVal,
      category: formCategory,
      contentEn: formContentEn,
      contentHi: formContentHi || formContentEn,
      shortDescEn: formShortEn || formContentEn.slice(0, 120),
      shortDescHi: formShortHi || formContentHi.slice(0, 120),
      imageUrl: formImage || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
      author: formAuthor,
      publishedAt: new Date().toISOString(),
      status: formStatus,
      isFeatured: formFeatured,
      seoTitle: formSeoTitle || formTitleEn,
      metaDesc: formMetaDesc || formShortEn,
      keywords: [formCategory.toLowerCase(), 'bhopal services', 'hardinkaam'],
    };

    try {
      if (editingArticle) {
        await blogService.updateArticle(editingArticle.id, articlePayload);
        setSuccessMessage('Article updated successfully!');
      } else {
        await blogService.createArticle(articlePayload);
        setSuccessMessage('New article published successfully!');
      }
      setIsCreating(false);
      loadArticles();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert('Error saving article: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await blogService.deleteArticle(id);
      loadArticles();
    } catch (err: any) {
      alert('Failed to delete article');
    }
  };

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredArticles = articles.filter((a) => {
    const matchesCat = selectedCategory === 'all' || a.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      a.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.titleHi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-stone-900 p-6 sm:p-8 rounded-3xl border border-stone-800 space-y-6 shadow-xl text-stone-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Blog & News Center</h2>
            <p className="text-xs text-stone-400">Manage Articles, Bhopal News, Service Tips, and SEO Settings</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-lg flex items-center gap-2 cursor-pointer transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Article</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title or keyword..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-stone-800 border border-stone-700 text-white focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="p-2 text-xs rounded-xl bg-stone-800 border border-stone-700 font-medium text-white"
        >
          <option value="all">All Categories</option>
          <option value="Service Tips">Service Tips</option>
          <option value="Bhopal News">Bhopal News</option>
          <option value="Current Affairs">Current Affairs</option>
          <option value="Technology">Technology</option>
          <option value="HARDINKAAM Tips">HARDINKAAM Tips</option>
        </select>
      </div>

      {/* Loading & Error States */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <p className="text-xs text-stone-400">Loading articles from Firestore...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-200">{error}</p>
          <button onClick={loadArticles} className="px-4 py-2 bg-stone-800 text-xs font-bold rounded-xl hover:bg-stone-700">
            Retry Loading
          </button>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-stone-800/40 rounded-3xl border border-stone-800">
          <Newspaper className="w-10 h-10 text-stone-600 mx-auto" />
          <p className="text-xs text-stone-400">No articles found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((art) => (
            <div key={art.id} className="bg-stone-800/60 p-5 rounded-3xl border border-stone-700/80 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                    {art.category}
                  </span>
                  <div className="flex items-center gap-2">
                    {art.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[9px] font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-rose-300" /> Featured
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${art.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-300'}`}>
                      {art.status}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <img src={art.imageUrl} alt={art.titleEn} className="w-20 h-20 rounded-xl object-cover border border-stone-700 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white line-clamp-1">{art.titleEn}</h3>
                    <div className="text-[11px] text-amber-200 font-medium line-clamp-1">{art.titleHi}</div>
                    <p className="text-[11px] text-stone-400 line-clamp-2">{art.shortDescEn}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-700/60 text-[11px] text-stone-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> {art.author}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {art.viewsCount || 0}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(art)}
                    className="p-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-200 cursor-pointer"
                    title="Edit Article"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(art.id)}
                    className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 cursor-pointer"
                    title="Delete Article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-stone-700 space-y-6 my-8 relative">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-stone-800 text-stone-400 flex items-center justify-center hover:bg-stone-700"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-lg font-black text-white">{editingArticle ? 'Edit Article' : 'Create New Article'}</h3>
              <p className="text-xs text-stone-400">Publish bilingual news and maintenance tips for Bhopal customers</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Title (English):</label>
                  <input
                    type="text"
                    value={formTitleEn}
                    onChange={(e) => setFormTitleEn(e.target.value)}
                    placeholder="e.g. Top 5 Home Maintenance Tips"
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Title (Hindi):</label>
                  <input
                    type="text"
                    value={formTitleHi}
                    onChange={(e) => setFormTitleHi(e.target.value)}
                    placeholder="शीर्ष 5 होम मेंटेनेंस टिप्स"
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Category:</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white font-medium"
                  >
                    <option value="Service Tips">Service Tips</option>
                    <option value="Bhopal News">Bhopal News</option>
                    <option value="Current Affairs">Current Affairs</option>
                    <option value="Technology">Technology</option>
                    <option value="HARDINKAAM Tips">HARDINKAAM Tips</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white font-medium"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 bg-stone-800 border-stone-700"
                    />
                    <span className="font-bold text-stone-200">Featured Article</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-300 block mb-1">Featured Image URL:</label>
                <input
                  type="text"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Short Summary (English):</label>
                  <textarea
                    value={formShortEn}
                    onChange={(e) => setFormShortEn(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Short Summary (Hindi):</label>
                  <textarea
                    value={formShortHi}
                    onChange={(e) => setFormShortHi(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Full Content (English):</label>
                  <textarea
                    value={formContentEn}
                    onChange={(e) => setFormContentEn(e.target.value)}
                    rows={5}
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-stone-300 block mb-1">Full Content (Hindi):</label>
                  <textarea
                    value={formContentHi}
                    onChange={(e) => setFormContentHi(e.target.value)}
                    rows={5}
                    className="w-full p-2.5 bg-stone-800 border border-stone-700 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* SEO Fields */}
              <div className="pt-2 border-t border-stone-800 space-y-3">
                <h4 className="font-black text-amber-400 uppercase tracking-wider text-[11px]">SEO & URL Settings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-stone-300 block mb-1">Slug:</label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="e.g. top-5-home-tips"
                      className="w-full p-2 bg-stone-800 border border-stone-700 rounded-xl text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-300 block mb-1">SEO Title:</label>
                    <input
                      type="text"
                      value={formSeoTitle}
                      onChange={(e) => setFormSeoTitle(e.target.value)}
                      className="w-full p-2 bg-stone-800 border border-stone-700 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-stone-300 block mb-1">Meta Description:</label>
                    <input
                      type="text"
                      value={formMetaDesc}
                      onChange={(e) => setFormMetaDesc(e.target.value)}
                      className="w-full p-2 bg-stone-800 border border-stone-700 rounded-xl text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-2.5 rounded-xl text-stone-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black shadow-lg cursor-pointer"
                >
                  {editingArticle ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

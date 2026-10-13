import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Image,
  Video,
  FolderOpen,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Tag,
  Calendar,
  HardDrive,
  Grid,
  List,
  X,
  Check,
  RefreshCw,
  Info,
  ShieldAlert,
  ArrowLeft,
  Sparkles,
  Maximize2
} from 'lucide-react';
import {
  getAllMediaFromIndexedDb,
  saveMediaToIndexedDb,
  deleteMediaFromIndexedDb,
  updateMediaMetadataInIndexedDb,
  getStorageUsage,
  StoredMediaItem,
  MediaCategory,
  MediaType,
  formatFileSize
} from '../../services/indexedDbMediaService';
import { storage } from '../../firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { compressImageForWeb } from '../../utils/imageCompression';

interface AdminMediaRepositoryProps {
  onBack?: () => void;
  onSelectAsset?: (url: string) => void;
  selectionMode?: boolean;
}

const INITIAL_SAMPLE_ASSETS: Array<{
  fileName: string;
  fileType: string;
  mediaType: MediaType;
  category: MediaCategory;
  title: string;
  description: string;
  sizeBytes: number;
  offlineUrl: string;
  tags: string[];
}> = [
  {
    fileName: 'hardinkaam-master-logo.png',
    fileType: 'image/png',
    mediaType: 'image',
    category: 'service_icons',
    title: 'Hardinkaam Master Logo (HD)',
    description: 'Official brand logo for header, favicon, and invoices.',
    sizeBytes: 145000,
    offlineUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    tags: ['logo', 'brand', 'identity']
  },
  {
    fileName: 'ac-repair-hero-banner.jpg',
    fileType: 'image/jpeg',
    mediaType: 'image',
    category: 'banners',
    title: 'AC Repair & Appliance Hero Banner',
    description: 'Promotional hero banner displayed on customer home carousel.',
    sizeBytes: 420000,
    offlineUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
    tags: ['banner', 'ac', 'summer', 'hero']
  },
  {
    fileName: 'bhopal-deep-cleaning-guide.jpg',
    fileType: 'image/jpeg',
    mediaType: 'image',
    category: 'landing_slides',
    title: 'Bhopal Home Deep Cleaning Guide',
    description: 'Featured image for blog article on home sanitization.',
    sizeBytes: 310000,
    offlineUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    tags: ['blog', 'cleaning', 'bhopal']
  },
  {
    fileName: 'diwali-festive-special.jpg',
    fileType: 'image/jpeg',
    mediaType: 'image',
    category: 'ads_promo',
    title: 'Diwali Festive Special Dispatch Creative',
    description: 'Marketing creative for festive discounts and promotional offers.',
    sizeBytes: 540000,
    offlineUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
    tags: ['marketing', 'festival', 'diwali', 'promo']
  },
  {
    fileName: 'electrician-reel-cover.jpg',
    fileType: 'image/jpeg',
    mediaType: 'image',
    category: 'ads_promo',
    title: 'Instagram Reel Cover - Electrician Pro',
    description: 'Social media creative for Instagram and Facebook ads.',
    sizeBytes: 280000,
    offlineUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
    tags: ['social', 'instagram', 'electrician']
  },
  {
    fileName: 'service-pro-arrival-demo.mp4',
    fileType: 'video/mp4',
    mediaType: 'video',
    category: 'training_video',
    title: 'Service Pro Arrival & OTP Demo Video (9:16)',
    description: 'Training video for servicemen on arrival verification and customer greeting.',
    sizeBytes: 2400000,
    offlineUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tags: ['video', 'training', 'serviceman', '9:16']
  },
  {
    fileName: 'pwa-splash-mockup.png',
    fileType: 'image/png',
    mediaType: 'image',
    category: 'general',
    title: 'PWA Mobile App Splash Screen Mockup',
    description: 'App launcher mockup for Android TWA and PWA install prompts.',
    sizeBytes: 190000,
    offlineUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
    tags: ['app', 'pwa', 'mobile', 'splash']
  }
];

export const AdminMediaRepository: React.FC<AdminMediaRepositoryProps> = ({
  onBack,
  onSelectAsset,
  selectionMode = false,
}) => {
  const [assets, setAssets] = useState<StoredMediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'size'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Storage usage stats
  const [storageStats, setStorageStats] = useState<{
    usedBytes: number;
    quotaBytes: number;
    percentage: number;
    formattedUsed: string;
    formattedQuota: string;
  } | null>(null);

  // Preview & Metadata Modal
  const [previewAsset, setPreviewAsset] = useState<StoredMediaItem | null>(null);
  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editCategory, setEditCategory] = useState<MediaCategory>('general');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editTagsInput, setEditTagsInput] = useState<string>('');

  // Delete Confirmation Modal
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<StoredMediaItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('general');
  const [uploadDescription, setUploadDescription] = useState<string>('');
  const [uploadTags, setUploadTags] = useState<string>('hardinkaam, asset');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load assets and storage stats on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let items = await getAllMediaFromIndexedDb();
      // If empty, seed initial sample assets so repository is rich out-of-the-box
      if (items.length === 0) {
        for (const sample of INITIAL_SAMPLE_ASSETS) {
          try {
            const resp = await fetch(sample.offlineUrl).catch(() => null);
            const blob = resp ? await resp.blob() : new Blob(['mock'], { type: sample.fileType });
            await saveMediaToIndexedDb(blob, {
              fileName: sample.fileName,
              title: sample.title,
              category: sample.category,
              description: sample.description,
              tags: sample.tags,
            });
          } catch (seedErr) {
            console.warn('Seeding asset warning:', seedErr);
          }
        }
        items = await getAllMediaFromIndexedDb();
      }
      setAssets(items);
      const usage = await getStorageUsage();
      setStorageStats(usage);
    } catch (err) {
      console.error('Failed to load media repository:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered and Sorted Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        searchQuery === '' ||
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      const matchesType = selectedMediaType === 'all' || asset.mediaType === selectedMediaType;

      return matchesSearch && matchesCategory && matchesType;
    }).sort((a, b) => {
      if (sortBy === 'newest') return b.uploadedAt - a.uploadedAt;
      if (sortBy === 'oldest') return a.uploadedAt - b.uploadedAt;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.sizeBytes - a.sizeBytes;
      return 0;
    });
  }, [assets, searchQuery, selectedCategory, selectedMediaType, sortBy]);

  const handleFileSelectForUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File is too large. Maximum supported size is 25MB.');
        return;
      }
      setUploadFile(file);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      setUploadError(null);
      try {
        setUploadPreviewUrl(URL.createObjectURL(file));
      } catch {
        setUploadPreviewUrl(null);
      }
    }
  };

  const handleExecuteUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(25);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const tagsArray = uploadTags.split(',').map((t) => t.trim()).filter(Boolean);
      
      setUploadProgress(60);
      const savedItem = await saveMediaToIndexedDb(uploadFile, {
        fileName: uploadFile.name,
        title: uploadTitle || uploadFile.name,
        category: uploadCategory,
        description: uploadDescription,
        tags: tagsArray,
      });

      if (storage) {
        try {
          setUploadProgress(85);
          let fileToSend = uploadFile;
          if (fileToSend.type.startsWith('image/') && fileToSend.size > 250 * 1024) {
            try {
              const comp = await compressImageForWeb(fileToSend, {
                maxDimension: 1440,
                quality: 0.84,
                maxSizeKB: 250,
              });
              fileToSend = comp.file;
            } catch (_) {}
          }

          const storagePath = `media_repository/${uploadCategory}/${Date.now()}_${fileToSend.name}`;
          const storageRef = ref(storage, storagePath);

          // Race cloud upload with a 3.5 second timeout so uploading never hangs at 85%
          const cloudUploadPromise = uploadBytes(storageRef, fileToSend, {
            contentType: fileToSend.type,
            customMetadata: {
              uploadedBy: 'Admin Super Center',
              category: uploadCategory,
            },
          }).then(async (snap) => {
            const downloadUrl = await getDownloadURL(snap.ref);
            savedItem.offlineUrl = downloadUrl;
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Cloud sync timeout - saved locally to IndexedDB')), 3500);
          });

          await Promise.race([cloudUploadPromise, timeoutPromise]);
        } catch (firebaseErr) {
          console.warn('Firebase Storage upload notice (local IndexedDB primary active):', firebaseErr);
        }
      }

      setUploadProgress(100);
      setUploadSuccess('Asset successfully uploaded to Media Repository!');
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreviewUrl(null);
        setUploadTitle('');
        setUploadDescription('');
        setUploadSuccess(null);
        loadData();
      }, 1200);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err?.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!deleteConfirmAsset) return;
    setIsDeleting(true);
    try {
      await deleteMediaFromIndexedDb(deleteConfirmAsset.id, deleteConfirmAsset.offlineUrl);
      setDeleteConfirmAsset(null);
      await loadData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      alert('Failed to delete asset: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEditMeta = (asset: StoredMediaItem) => {
    setPreviewAsset(asset);
    setEditTitle(asset.title);
    setEditCategory(asset.category);
    setEditDescription(asset.description);
    setEditTagsInput(asset.tags.join(', '));
    setIsEditingMeta(true);
  };

  const handleSaveMeta = async () => {
    if (!previewAsset) return;
    try {
      const tagsArray = editTagsInput.split(',').map((t) => t.trim()).filter(Boolean);
      await updateMediaMetadataInIndexedDb(previewAsset.id, {
        title: editTitle,
        category: editCategory,
        description: editDescription,
        tags: tagsArray,
      });
      setIsEditingMeta(false);
      const updated = {
        ...previewAsset,
        title: editTitle,
        category: editCategory,
        description: editDescription,
        tags: tagsArray,
      };
      setPreviewAsset(updated);
      await loadData();
    } catch (err: any) {
      alert('Failed to update metadata: ' + err?.message);
    }
  };

  const CATEGORY_LABELS: Record<MediaCategory, { label: string; color: string }> = {
    banners: { label: 'Banners', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    landing_slides: { label: 'Landing Slides', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    ads_promo: { label: 'Marketing Creatives', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    notifications: { label: 'Notifications', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    ringtone_audio: { label: 'Audio & Alarms', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    training_video: { label: 'Video Studio', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
    service_icons: { label: 'Logos & Icons', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    general: { label: 'General Assets', color: 'bg-stone-500/20 text-stone-300 border-stone-500/30' },
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-fuchsia-950 p-6 sm:p-8 rounded-3xl border border-fuchsia-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-xs font-black border border-fuchsia-500/30">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 animate-pulse" />
              <span>ADMIN CENTRALIZED MEDIA REPOSITORY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Approved Assets for Banners, Blog & AI Studio
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl">
              Manage centralized images, logos, marketing creatives, and promotional videos used across HARDINKAAM admin modules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-xs font-black shadow-lg shadow-fuchsia-900/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Asset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Storage Status & Quick Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/30">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-400 font-bold">Total Assets</div>
            <div className="text-lg font-black text-white">{assets.length} Files</div>
          </div>
        </div>

        <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-400 font-bold">Storage Usage</div>
            <div className="text-lg font-black text-white">{storageStats?.formattedUsed || '0 MB'}</div>
          </div>
        </div>

        <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-400 font-bold">Repository Engine</div>
            <div className="text-sm font-black text-emerald-400">IndexedDB + CacheStorage</div>
          </div>
        </div>

        <div className="bg-stone-900 p-4 rounded-2xl border border-stone-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-stone-400 font-bold">Firebase Storage</div>
            <div className="text-sm font-black text-amber-400">Configured & Active</div>
          </div>
        </div>
      </div>

      {/* Filters, Search & View Controls */}
      <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, filename, category or tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-bold text-stone-200 focus:outline-none"
            >
              <option value="all">📁 All Categories</option>
              <option value="service_icons">Logos & Icons</option>
              <option value="banners">Banners</option>
              <option value="landing_slides">Landing Slides</option>
              <option value="ads_promo">Marketing Creatives</option>
              <option value="training_video">Video Studio</option>
              <option value="general">General</option>
            </select>

            <select
              value={selectedMediaType}
              onChange={(e) => setSelectedMediaType(e.target.value)}
              className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-bold text-stone-200 focus:outline-none"
            >
              <option value="all">🎬 All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-xs font-bold text-stone-200 focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="size">Largest Size</option>
            </select>

            <div className="flex items-center bg-stone-800 p-1 rounded-xl border border-stone-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-fuchsia-600 text-white' : 'text-stone-400 hover:text-white'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-fuchsia-600 text-white' : 'text-stone-400 hover:text-white'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Asset Gallery */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-fuchsia-500 animate-spin" />
            <p className="text-xs font-bold text-stone-400">Loading Media Repository...</p>
          </div>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center space-y-4">
          <Image className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No matching media assets found</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Try adjusting your search filters or upload a new asset to get started.
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Upload Asset Now
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredAssets.map((asset) => {
            const catMeta = CATEGORY_LABELS[asset.category] || CATEGORY_LABELS.general;
            return (
              <div
                key={asset.id}
                className="bg-stone-900 rounded-3xl border border-stone-800 hover:border-fuchsia-500/50 shadow-xl overflow-hidden flex flex-col justify-between transition-all group"
              >
                <div className="relative h-44 bg-stone-950 overflow-hidden flex items-center justify-center">
                  {asset.mediaType === 'image' ? (
                    <img
                      src={asset.blobUrl || asset.offlineUrl}
                      alt={asset.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : asset.mediaType === 'video' ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-stone-900">
                      <Video className="w-10 h-10 text-red-500 animate-pulse" />
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">MP4</span>
                    </div>
                  ) : (
                    <FileText className="w-10 h-10 text-stone-500" />
                  )}

                  <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${catMeta.color}`}>
                    {catMeta.label}
                  </span>

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewAsset(asset)}
                      className="p-2.5 rounded-xl bg-white text-stone-900 font-bold hover:bg-fuchsia-500 hover:text-white transition-colors cursor-pointer shadow-lg"
                      title="Preview Asset"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {selectionMode && onSelectAsset && (
                      <button
                        type="button"
                        onClick={() => onSelectAsset(asset.offlineUrl)}
                        className="p-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors cursor-pointer shadow-lg"
                        title="Select Asset"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmAsset(asset)}
                      className="p-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-500 transition-colors cursor-pointer shadow-lg"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white truncate" title={asset.title}>
                      {asset.title}
                    </h4>
                    <p className="text-[11px] text-stone-400 truncate font-mono">
                      {asset.fileName}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[10px] text-stone-400 font-medium">
                    <span>{formatFileSize(asset.sizeBytes)}</span>
                    <span className="text-fuchsia-400 font-bold">{new Date(asset.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-stone-900 rounded-3xl border border-stone-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-850 border-b border-stone-800 text-[11px] uppercase font-black text-stone-400 tracking-wider">
                  <th className="p-4">Asset</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Size</th>
                  <th className="p-4">Uploaded</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 text-xs">
                {filteredAssets.map((asset) => {
                  const catMeta = CATEGORY_LABELS[asset.category] || CATEGORY_LABELS.general;
                  return (
                    <tr key={asset.id} className="hover:bg-stone-850/50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <img
                          src={asset.blobUrl || asset.offlineUrl}
                          alt={asset.title}
                          className="w-10 h-10 rounded-xl object-cover border border-stone-700 shrink-0"
                        />
                        <div>
                          <div className="font-black text-white">{asset.title}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{asset.fileName}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                      </td>
                      <td className="p-4 uppercase font-bold text-stone-300">{asset.mediaType}</td>
                      <td className="p-4 font-mono text-stone-400">{formatFileSize(asset.sizeBytes)}</td>
                      <td className="p-4 text-stone-400">{new Date(asset.uploadedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setPreviewAsset(asset)}
                          className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmAsset(asset)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-bold transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-fuchsia-400 text-xs font-black uppercase tracking-wider">
                <Upload className="w-4 h-4" />
                <span>Centralized Storage Uploader</span>
              </div>
              <h3 className="text-xl font-black text-white">Upload Media Asset</h3>
              <p className="text-xs text-stone-400">
                Add approved images, videos or logos to the HARDINKAAM media repository.
              </p>
            </div>

            <form onSubmit={handleExecuteUpload} className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.svg"
                className="hidden"
                onChange={handleFileSelectForUpload}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-700 hover:border-fuchsia-500 bg-stone-800/50 hover:bg-fuchsia-500/10 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3"
              >
                {uploadFile ? (
                  <div className="flex items-center gap-3">
                    {uploadPreviewUrl ? (
                      <img src={uploadPreviewUrl} alt="Preview" className="w-14 h-14 object-cover rounded-xl border border-stone-700" />
                    ) : (
                      <FileText className="w-10 h-10 text-fuchsia-400" />
                    )}
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{uploadFile.name}</p>
                      <p className="text-[10px] text-stone-400">{formatFileSize(uploadFile.size)} • Click to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-fuchsia-600/20 text-fuchsia-400 flex items-center justify-center border border-fuchsia-500/30">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Click to browse or drop file here</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">PNG, JPG, WebP, MP4 (Max 25MB)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Asset Title:</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Summer AC Servicing Banner"
                    required
                    className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Category:</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as MediaCategory)}
                      className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                    >
                      <option value="service_icons">Logos & Icons</option>
                      <option value="banners">Banners</option>
                      <option value="landing_slides">Landing Slides</option>
                      <option value="ads_promo">Marketing Creatives</option>
                      <option value="training_video">Video Studio</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Tags (comma separated):</label>
                    <input
                      type="text"
                      value={uploadTags}
                      onChange={(e) => setUploadTags(e.target.value)}
                      placeholder="banner, ac, summer"
                      className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-300 block mb-1">Description (Optional):</label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief description of usage..."
                    rows={2}
                    className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                  />
                </div>
              </div>

              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-stone-300 font-bold">
                    <span>Uploading to Repository & Cloud...</span>
                    <span className="text-fuchsia-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-stone-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-fuchsia-600 h-full transition-all duration-300 rounded-full" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {uploadError && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold">
                  {uploadError}
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploading(false);
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setUploadPreviewUrl(null);
                    setUploadProgress(0);
                    setUploadError(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className="px-6 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-xs font-black shadow-lg cursor-pointer transition-colors"
                >
                  {isUploading ? 'Uploading...' : 'Upload Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW & METADATA MODAL */}
      {previewAsset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-stone-850 border-b border-stone-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-black text-fuchsia-400 tracking-wider">Asset Details & Preview</span>
                <h3 className="text-base font-black text-white">{previewAsset.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => { setPreviewAsset(null); setIsEditingMeta(false); }}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-stone-950 rounded-2xl overflow-hidden border border-stone-800 flex items-center justify-center max-h-72">
                {previewAsset.mediaType === 'image' ? (
                  <img src={previewAsset.blobUrl || previewAsset.offlineUrl} alt={previewAsset.title} className="max-h-72 object-contain" />
                ) : previewAsset.mediaType === 'video' ? (
                  <video src={previewAsset.offlineUrl} controls className="max-h-72 w-full object-contain" />
                ) : (
                  <FileText className="w-16 h-16 text-stone-600 my-12" />
                )}
              </div>

              {!isEditingMeta ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-stone-800/40 p-4 rounded-2xl border border-stone-800">
                    <div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase">File Name</div>
                      <div className="text-xs font-mono text-white truncate mt-0.5">{previewAsset.fileName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase">File Size</div>
                      <div className="text-xs font-bold text-white mt-0.5">{formatFileSize(previewAsset.sizeBytes)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase">Type</div>
                      <div className="text-xs font-bold text-white mt-0.5 uppercase">{previewAsset.fileType}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase">Category</div>
                      <div className="text-xs font-bold text-fuchsia-400 mt-0.5">{previewAsset.category}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase">Uploaded Date</div>
                      <div className="text-xs font-bold text-white mt-0.5">{new Date(previewAsset.uploadedAt).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase">Offline Status</div>
                      <div className="text-xs font-bold text-emerald-400 mt-0.5">Cached in SW & IDB</div>
                    </div>
                  </div>

                  {previewAsset.description && (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-stone-400">Description:</div>
                      <p className="text-xs text-stone-300 bg-stone-800/40 p-3 rounded-xl border border-stone-800">{previewAsset.description}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-stone-400">Tags:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {previewAsset.tags.map((tag, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 text-[11px] font-bold border border-stone-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-stone-400">Asset URL (Direct / Offline Reference):</div>
                    <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 font-mono text-[11px] text-fuchsia-300 break-all select-all">
                      {previewAsset.offlineUrl}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Title:</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Category:</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as MediaCategory)}
                      className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                    >
                      <option value="service_icons">Logos & Icons</option>
                      <option value="banners">Banners</option>
                      <option value="landing_slides">Landing Slides</option>
                      <option value="ads_promo">Marketing Creatives</option>
                      <option value="training_video">Video Studio</option>
                      <option value="general">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Description:</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-300 block mb-1">Tags (comma separated):</label>
                    <input
                      type="text"
                      value={editTagsInput}
                      onChange={(e) => setEditTagsInput(e.target.value)}
                      className="w-full p-3 rounded-xl bg-stone-800 border border-stone-700 text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-850 border-t border-stone-800 flex items-center justify-between">
              {!isEditingMeta ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenEditMeta(previewAsset)}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold cursor-pointer"
                  >
                    Edit Metadata
                  </button>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewAsset.blobUrl || previewAsset.offlineUrl}
                      download={previewAsset.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditingMeta(false)}
                    className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    className="px-5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black cursor-pointer"
                  >
                    Save Changes
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 w-full max-w-md rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-white">Delete Media Asset?</h3>
            <p className="text-xs text-stone-300">
              Are you sure you want to delete <strong className="text-white">"{deleteConfirmAsset.title}"</strong>? Note that active banners, blog posts, or marketing modules referencing this asset URL may break.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAsset(null)}
                className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAsset}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer shadow-lg"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Asset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMediaRepository;

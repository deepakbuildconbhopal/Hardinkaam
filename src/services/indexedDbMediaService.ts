/**
 * IndexedDB Media Repository Service
 * Provides local offline-first storage and CacheStorage integration for Images, Audio, and Video files.
 */

export type MediaType = 'image' | 'audio' | 'video' | 'other';

export type MediaCategory =
  | 'banners'
  | 'landing_slides'
  | 'ads_promo'
  | 'notifications'
  | 'ringtone_audio'
  | 'training_video'
  | 'service_icons'
  | 'general';

export interface StoredMediaItem {
  id: string;
  fileName: string;
  fileType: string;
  mediaType: MediaType;
  category: MediaCategory;
  title: string;
  description: string;
  sizeBytes: number;
  uploadedAt: number;
  tags: string[];
  offlineUrl: string; // Synthetic URL cached in CacheStorage: /offline-media/{id}/{fileName}
  blob?: Blob;
  blobUrl?: string; // Runtime ObjectURL (URL.createObjectURL)
  isCachedInSw: boolean;
}

const DB_NAME = 'HardinkaamMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_assets';
const CACHE_NAME = 'hardinkaam-media-v1';

/**
 * Open and initialize IndexedDB database
 */
export const openMediaDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('mediaType', 'mediaType', { unique: false });
        store.createIndex('uploadedAt', 'uploadedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
};

/**
 * Determine media type from MIME type
 */
export const detectMediaType = (mimeType: string): MediaType => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'other';
};

/**
 * Format bytes into human readable format (KB, MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Store a file in IndexedDB and replicate into Cache Storage for instant offline HTTP interception
 */
export const saveMediaToIndexedDb = async (
  file: File | Blob,
  meta: {
    fileName?: string;
    title?: string;
    category?: MediaCategory;
    description?: string;
    tags?: string[];
  }
): Promise<StoredMediaItem> => {
  const db = await openMediaDatabase();
  const id = `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fileName = meta.fileName || (file instanceof File ? file.name : `asset_${id}`);
  const fileType = file.type || 'application/octet-stream';
  const mediaType = detectMediaType(fileType);
  const category = meta.category || 'general';
  const sizeBytes = file.size;
  const uploadedAt = Date.now();
  const offlineUrl = `/offline-media/${id}/${encodeURIComponent(fileName)}`;

  const itemToStore = {
    id,
    fileName,
    fileType,
    mediaType,
    category,
    title: meta.title || fileName.replace(/\.[^/.]+$/, ''),
    description: meta.description || '',
    sizeBytes,
    uploadedAt,
    tags: meta.tags || [],
    offlineUrl,
    blob: file,
  };

  // 1. Put into IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(itemToStore);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to store file in IndexedDB'));
  });

  // 2. Put into Cache Storage for offline fetch / HTTP URL mapping
  let isCachedInSw = false;
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(file, {
        headers: {
          'Content-Type': fileType,
          'Content-Length': sizeBytes.toString(),
          'X-Hardinkaam-Offline-Asset': 'true',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
      await cache.put(offlineUrl, response);
      isCachedInSw = true;
    } catch (cacheErr) {
      console.warn('CacheStorage save warning:', cacheErr);
    }
  }

  const blobUrl = URL.createObjectURL(file);

  return {
    ...itemToStore,
    blobUrl,
    isCachedInSw,
  };
};

/**
 * Fetch all media assets stored in IndexedDB
 */
export const getAllMediaFromIndexedDb = async (): Promise<StoredMediaItem[]> => {
  const db = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const rawItems = (req.result || []) as Array<any>;
      const items: StoredMediaItem[] = rawItems.map((raw) => {
        let blobUrl = '';
        if (raw.blob) {
          try {
            blobUrl = URL.createObjectURL(raw.blob);
          } catch {
            blobUrl = raw.offlineUrl;
          }
        }
        return {
          id: raw.id,
          fileName: raw.fileName,
          fileType: raw.fileType,
          mediaType: raw.mediaType,
          category: raw.category,
          title: raw.title,
          description: raw.description,
          sizeBytes: raw.sizeBytes,
          uploadedAt: raw.uploadedAt,
          tags: raw.tags || [],
          offlineUrl: raw.offlineUrl,
          blob: raw.blob,
          blobUrl,
          isCachedInSw: true,
        };
      });

      // Sort newest first
      items.sort((a, b) => b.uploadedAt - a.uploadedAt);
      resolve(items);
    };

    req.onerror = () => reject(req.error || new Error('Failed to retrieve items from IndexedDB'));
  });
};

/**
 * Delete a media item from IndexedDB and CacheStorage
 */
export const deleteMediaFromIndexedDb = async (id: string, offlineUrl: string): Promise<boolean> => {
  const db = await openMediaDatabase();

  // 1. Delete from IndexedDB
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error || new Error('Failed to delete item from IndexedDB'));
  });

  // 2. Delete from CacheStorage
  if ('caches' in window && offlineUrl) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(offlineUrl);
    } catch (err) {
      console.warn('CacheStorage delete warning:', err);
    }
  }

  return true;
};

/**
 * Update media item metadata (title, category, description, tags)
 */
export const updateMediaMetadataInIndexedDb = async (
  id: string,
  updates: Partial<Pick<StoredMediaItem, 'title' | 'category' | 'description' | 'tags'>>
): Promise<boolean> => {
  const db = await openMediaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result;
      if (!existing) {
        reject(new Error('Media item not found'));
        return;
      }

      const updated = {
        ...existing,
        ...updates,
      };

      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => reject(putReq.error);
    };

    getReq.onerror = () => reject(getReq.error);
  });
};

/**
 * Calculate browser storage usage (IndexedDB + CacheStorage quota)
 */
export const getStorageUsage = async (): Promise<{
  usedBytes: number;
  quotaBytes: number;
  percentage: number;
  formattedUsed: string;
  formattedQuota: string;
}> => {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      const percentage = quotaBytes > 0 ? parseFloat(((usedBytes / quotaBytes) * 100).toFixed(2)) : 0;
      return {
        usedBytes,
        quotaBytes,
        percentage,
        formattedUsed: formatFileSize(usedBytes),
        formattedQuota: formatFileSize(quotaBytes),
      };
    } catch (err) {
      console.warn('Storage estimate failed:', err);
    }
  }

  return {
    usedBytes: 0,
    quotaBytes: 0,
    percentage: 0,
    formattedUsed: 'N/A',
    formattedQuota: 'N/A',
  };
};

/**
 * Export metadata as JSON for backup
 */
export const exportMediaCatalogJson = async (): Promise<string> => {
  const all = await getAllMediaFromIndexedDb();
  const catalog = all.map(({ id, fileName, fileType, mediaType, category, title, description, sizeBytes, uploadedAt, tags, offlineUrl }) => ({
    id,
    fileName,
    fileType,
    mediaType,
    category,
    title,
    description,
    sizeBytes,
    uploadedAt: new Date(uploadedAt).toISOString(),
    tags,
    offlineUrl,
  }));

  return JSON.stringify(catalog, null, 2);
};

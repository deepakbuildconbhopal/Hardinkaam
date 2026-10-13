import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, ProOfflineJobRecord } from '../types';

const DB_NAME = 'Hardinkaam_ProOfflineDB_v1';
const STORE_NAME = 'pro_cached_jobs';
const DB_VERSION = 1;

type ProSyncState = 'online' | 'offline' | 'changes_pending' | 'syncing' | 'synced' | 'sync_failed';
type ProSyncListener = (state: ProSyncState, jobs: ProOfflineJobRecord[]) => void;

class ProLowNetworkService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryJobs: Map<string, ProOfflineJobRecord> = new Map();
  private listeners: Set<ProSyncListener> = new Set();
  private currentState: ProSyncState = 'online';

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
      this.initListeners();
    }
  }

  private isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB not supported'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
          const dbInstance = (e.target as IDBOpenDBRequest).result;
          if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
            dbInstance.createObjectStore(STORE_NAME, { keyPath: 'bookingId' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });

    return this.dbPromise;
  }

  private initListeners() {
    const updateStatus = () => {
      const online = this.isOnline();
      this.hasPendingDrafts().then((hasPending) => {
        if (!online) {
          this.currentState = 'offline';
        } else if (hasPending) {
          this.currentState = 'changes_pending';
        } else {
          this.currentState = 'online';
        }
        this.notify();
      });
    };

    window.addEventListener('online', async () => {
      console.info('[ProLowNetwork] Connection restored! Triggering auto-sync...');
      await this.syncPendingDrafts();
    });

    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  public subscribe(listener: ProSyncListener): () => void {
    this.listeners.add(listener);
    this.getAllCachedJobs().then((jobs) => listener(this.currentState, jobs));
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    const jobs = await this.getAllCachedJobs();
    this.listeners.forEach((l) => l(this.currentState, jobs));
  }

  /**
   * Caches an assigned upcoming job into local IndexedDB for low-network resilience
   */
  public async cacheAssignedJob(booking: Booking): Promise<void> {
    const record: ProOfflineJobRecord = {
      bookingId: booking.id,
      serviceName: booking.serviceName,
      categoryName: booking.categoryName,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      address: booking.address,
      scheduledDate: booking.scheduledDate,
      scheduledTime: booking.scheduledTime,
      amount: booking.amount || booking.totalAmount || 0,
      status: booking.status,
      taskChecklist: [
        { id: 'chk_1', title: 'आगमन पर ग्राहक सत्यापन व शिष्टाचार', completed: false },
        { id: 'chk_2', title: 'उपकरण एवं वायरिंग प्रारंभिक जांच', completed: false },
        { id: 'chk_3', title: 'मुख्य रिपेयर व पार्ट्स प्रतिस्थापन', completed: false },
        { id: 'chk_4', title: 'कार्यस्थल सफाई एवं परीक्षण', completed: false },
      ],
      draftWorkNotes: '',
      cachedAt: new Date().toISOString(),
      pendingSyncDraft: false,
      syncStatus: 'synced',
    };

    try {
      const dbInstance = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.memoryJobs.set(record.bookingId, record);
    }

    await this.notify();
  }

  /**
   * Returns all cached offline jobs
   */
  public async getAllCachedJobs(): Promise<ProOfflineJobRecord[]> {
    try {
      const dbInstance = await this.initDB();
      return await new Promise<ProOfflineJobRecord[]>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return Array.from(this.memoryJobs.values());
    }
  }

  /**
   * Updates offline draft notes & checklist for a job
   */
  public async saveDraftWorkNotes(
    bookingId: string,
    notes: string,
    checklist?: ProOfflineJobRecord['taskChecklist']
  ): Promise<void> {
    const jobs = await this.getAllCachedJobs();
    const job = jobs.find((j) => j.bookingId === bookingId);
    if (!job) return;

    job.draftWorkNotes = notes;
    if (checklist) job.taskChecklist = checklist;
    job.pendingSyncDraft = true;
    job.syncStatus = 'pending';

    try {
      const dbInstance = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(job);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.memoryJobs.set(bookingId, job);
    }

    this.currentState = this.isOnline() ? 'changes_pending' : 'offline';
    await this.notify();
  }

  /**
   * Checks whether any pending drafts exist
   */
  public async hasPendingDrafts(): Promise<boolean> {
    const jobs = await this.getAllCachedJobs();
    return jobs.some((j) => j.pendingSyncDraft);
  }

  /**
   * Authoritatively pushes draft notes to Firestore when connectivity is restored
   */
  public async syncPendingDrafts(): Promise<{ syncedCount: number; errors: number }> {
    if (!this.isOnline()) {
      this.currentState = 'offline';
      await this.notify();
      return { syncedCount: 0, errors: 0 };
    }

    this.currentState = 'syncing';
    await this.notify();

    const jobs = await this.getAllCachedJobs();
    const pending = jobs.filter((j) => j.pendingSyncDraft);

    let syncedCount = 0;
    let errors = 0;

    for (const item of pending) {
      try {
        const bookingRef = doc(db, 'bookings', item.bookingId);
        const snap = await getDoc(bookingRef);
        if (snap.exists()) {
          // Authoritatively save technician work notes & checklist progress
          await updateDoc(bookingRef, {
            technicianNotes: item.draftWorkNotes,
            checklistCompletedCount: item.taskChecklist.filter((c) => c.completed).length,
            lastProSyncAt: new Date().toISOString(),
          });
        }

        item.pendingSyncDraft = false;
        item.syncStatus = 'synced';
        delete item.lastSyncError;

        // Update local DB
        const dbInstance = await this.initDB();
        await new Promise<void>((resolve) => {
          const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(item);
          tx.oncomplete = () => resolve();
        });

        syncedCount++;
      } catch (err: any) {
        errors++;
        item.syncStatus = 'failed';
        item.lastSyncError = err.message || 'Sync failed';
      }
    }

    this.currentState = errors > 0 ? 'sync_failed' : 'synced';
    await this.notify();

    return { syncedCount, errors };
  }
}

export const proLowNetworkService = new ProLowNetworkService();

import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking } from '../types';
import { recordTaxAuditLog } from './indianTaxEngineService';
import { bookingOfferService } from './bookingOfferService';
import { notifyBookingCreated } from './bookingNotificationIntegrationService';

export interface OfflineBookingRecord {
  id: string;
  booking: Booking;
  extraData?: {
    taxCalculation?: any;
    customerPhone?: string;
    customerName?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    serviceName?: string;
    totalAmount?: number;
    effectivePaymentMethod?: string;
    isUsingRewards?: boolean;
    effectivePointsToUse?: number;
    source?: 'booking_modal' | 'conversational_ai' | 'quick_book';
  };
  queuedAt: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  lastError?: string;
}

export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  isOnline: boolean;
  timestamp: string;
}

const DB_NAME = 'Hardinkaam_OfflineStore_v1';
const DB_VERSION = 1;
const STORE_NAME = 'pending_bookings';

type Listener = (queue: OfflineBookingRecord[], isOnline: boolean) => void;

class OfflineBookingSyncService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback: Map<string, OfflineBookingRecord> = new Map();
  private listeners: Set<Listener> = new Set();
  private isSyncingInProgress = false;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB().catch((err) => {
        console.warn('[OfflineSync] Early initDB notice:', err);
      });
      // Automatically register navigator.onLine & online/offline window listeners
      this.initOfflineSyncListeners();
    }
  }

  /**
   * Safe check for current online status
   */
  public isOnline(): boolean {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Initializes IndexedDB with automatic schema creation
   */
  private initDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not supported in this runtime environment'));
    }

    this.dbPromise = new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (evt: IDBVersionChangeEvent) => {
          const dbInstance = (evt.target as IDBOpenDBRequest).result;
          if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
            const store = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            console.log('[OfflineSync] IndexedDB object store created:', STORE_NAME);
          }
        };

        req.onsuccess = () => {
          resolve(req.result);
        };

        req.onerror = () => {
          console.warn('[OfflineSync] Failed to open IndexedDB, falling back to memory store:', req.error);
          reject(req.error || new Error('Failed to open IndexedDB'));
        };
      } catch (err) {
        console.warn('[OfflineSync] Exception opening IndexedDB:', err);
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Subscribe to queue and connectivity state changes
   */
  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    this.getAllPendingBookings().then((queue) => {
      listener(queue, this.isOnline());
    }).catch(() => {
      listener(Array.from(this.memoryFallback.values()), this.isOnline());
    });

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(queue: OfflineBookingRecord[]) {
    const online = this.isOnline();
    this.listeners.forEach((listener) => {
      try {
        listener(queue, online);
      } catch (e) {
        console.error('[OfflineSync] Error in listener callback:', e);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hardinkaam:offline-queue-changed', {
          detail: { queue, count: queue.length, isOnline: online },
        })
      );
    }
  }

  /**
   * Saves a booking attempt into the IndexedDB offline queue
   */
  public async savePendingBooking(
    booking: Booking,
    extraData?: OfflineBookingRecord['extraData']
  ): Promise<OfflineBookingRecord> {
    const nowIso = new Date().toISOString();
    const timestamp = Date.now();

    const record: OfflineBookingRecord = {
      id: booking.id,
      booking: {
        ...booking,
        isOfflinePending: true,
        offlineQueuedAt: nowIso,
        offlineSyncStatus: 'pending',
      },
      extraData,
      queuedAt: nowIso,
      timestamp,
      retryCount: 0,
      status: 'pending',
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
    } catch (dbErr) {
      console.warn('[OfflineSync] IndexedDB write failed; saving in memory fallback:', dbErr);
      this.memoryFallback.set(record.id, record);
    }

    const all = await this.getAllPendingBookings();
    this.notifyListeners(all);

    console.info(`[OfflineSync] Booking #${booking.id} stored in Pending Synchronization queue.`);
    return record;
  }

  /**
   * Returns all pending bookings stored locally in IndexedDB
   */
  public async getAllPendingBookings(): Promise<OfflineBookingRecord[]> {
    try {
      const dbInstance = await this.initDB();
      return await new Promise<OfflineBookingRecord[]>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const results: OfflineBookingRecord[] = req.result || [];
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      const list = Array.from(this.memoryFallback.values());
      list.sort((a, b) => b.timestamp - a.timestamp);
      return list;
    }
  }

  /**
   * Deletes a record from the offline queue (after successful sync or cancellation)
   */
  public async deletePendingBooking(id: string): Promise<void> {
    try {
      const dbInstance = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.memoryFallback.delete(id);
    }

    const all = await this.getAllPendingBookings();
    this.notifyListeners(all);
  }

  /**
   * Updates status of an item in the queue
   */
  public async updatePendingBookingStatus(
    id: string,
    status: OfflineBookingRecord['status'],
    lastError?: string
  ): Promise<void> {
    try {
      const dbInstance = await this.initDB();
      await new Promise<void>((resolve, reject) => {
        const tx = dbInstance.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          const item: OfflineBookingRecord | undefined = getReq.result;
          if (!item) {
            resolve();
            return;
          }
          item.status = status;
          if (status === 'syncing') {
            item.retryCount = (item.retryCount || 0) + 1;
          }
          if (lastError) {
            item.lastError = lastError;
          }
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    } catch {
      const item = this.memoryFallback.get(id);
      if (item) {
        item.status = status;
        if (status === 'syncing') item.retryCount++;
        if (lastError) item.lastError = lastError;
      }
    }

    const all = await this.getAllPendingBookings();
    this.notifyListeners(all);
  }

  /**
   * Synchronizes a single booking record to Firestore
   */
  public async syncSingleBooking(record: OfflineBookingRecord): Promise<{ success: boolean; error?: string }> {
    if (!this.isOnline()) {
      return { success: false, error: 'Device is currently offline' };
    }

    try {
      await this.updatePendingBookingStatus(record.id, 'syncing');

      const nowIso = new Date().toISOString();
      const cleanBooking: Booking = {
        ...record.booking,
        isOfflinePending: false,
        offlineSyncStatus: 'synced',
        updatedAt: nowIso,
      };

      // 1. Write booking to Firestore
      const bookingDocRef = doc(db, 'bookings', record.id);
      await setDoc(bookingDocRef, cleanBooking);

      // 2. Aux tasks - all wrapped safely so they don't abort successful sync
      try {
        if (record.extraData?.taxCalculation) {
          recordTaxAuditLog(record.id, record.extraData.taxCalculation, {
            customerId: cleanBooking.customerId,
            serviceManId: cleanBooking.serviceManId,
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('[OfflineSync] Tax audit log notice:', e);
      }

      try {
        bookingOfferService.createBookingOffersForBooking(cleanBooking).catch((err) => {
          console.warn('[OfflineSync] Pro offer generation notice:', err);
        });
      } catch (e) {
        console.warn('[OfflineSync] Offer generation notice:', e);
      }

      try {
        fetch('/api/bookings/dispatch-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: record.id }),
        }).catch(() => {});
      } catch {}

      try {
        if (cleanBooking.customerPhone) {
          await addDoc(collection(db, 'whatsapp_logs'), {
            recipientPhone: cleanBooking.customerPhone,
            recipientName: cleanBooking.customerName || 'Customer',
            type: 'booking_confirmation',
            messageBody: `Namaste ${cleanBooking.customerName}! Your HARDINKAAM booking #${record.id} for ${cleanBooking.serviceName} was synchronized and confirmed for ${cleanBooking.scheduledDate} (${cleanBooking.scheduledTime}).`,
            status: 'sent',
            timestamp: nowIso,
            syncedFromOfflineQueue: true,
          });
        }
      } catch {}

      try {
        await notifyBookingCreated(cleanBooking);
      } catch {}

      try {
        await addDoc(collection(db, 'audit_logs'), {
          userId: cleanBooking.customerId || 'offline_sync',
          userEmail: cleanBooking.customerPhone || 'offline_sync',
          action: 'offline_booking_synced',
          details: `Booking ${record.id} synced from IndexedDB queue to Firestore (${cleanBooking.serviceName})`,
          timestamp: nowIso,
        });
      } catch {}

      // 3. Remove from offline queue
      await this.deletePendingBooking(record.id);

      console.info(`[OfflineSync] Successfully pushed booking #${record.id} to Firestore!`);
      return { success: true };
    } catch (err: any) {
      const errMsg = err?.message || 'Firestore write failed';
      console.error(`[OfflineSync] Failed to sync booking #${record.id}:`, err);
      await this.updatePendingBookingStatus(record.id, 'failed', errMsg);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Synchronizes all pending bookings currently in IndexedDB
   */
  public async syncAllPendingBookings(): Promise<SyncResult> {
    if (this.isSyncingInProgress) {
      console.log('[OfflineSync] Sync is already running. Skipping concurrent trigger.');
      const current = await this.getAllPendingBookings();
      return {
        total: current.length,
        succeeded: 0,
        failed: 0,
        isOnline: this.isOnline(),
        timestamp: new Date().toISOString(),
      };
    }

    if (!this.isOnline()) {
      console.log('[OfflineSync] Offline: cannot sync queue.');
      const current = await this.getAllPendingBookings();
      return {
        total: current.length,
        succeeded: 0,
        failed: 0,
        isOnline: false,
        timestamp: new Date().toISOString(),
      };
    }

    this.isSyncingInProgress = true;
    try {
      const queue = await this.getAllPendingBookings();
      if (queue.length === 0) {
        return {
          total: 0,
          succeeded: 0,
          failed: 0,
          isOnline: true,
          timestamp: new Date().toISOString(),
        };
      }

      console.info(`[OfflineSync] Starting synchronization of ${queue.length} pending booking(s)...`);

      let succeeded = 0;
      let failed = 0;

      for (const item of queue) {
        const res = await this.syncSingleBooking(item);
        if (res.success) {
          succeeded++;
        } else {
          failed++;
        }
      }

      const summary: SyncResult = {
        total: queue.length,
        succeeded,
        failed,
        isOnline: true,
        timestamp: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('hardinkaam:offline-sync-completed', {
            detail: summary,
          })
        );
      }

      return summary;
    } finally {
      this.isSyncingInProgress = false;
    }
  }

  /**
   * Initializes listeners on `navigator.onLine` and `window` online/offline events
   */
  public initOfflineSyncListeners(): () => void {
    if (typeof window === 'undefined' || this.isInitialized) {
      return () => {};
    }
    this.isInitialized = true;

    const handleOnline = async () => {
      console.info('[OfflineSync] 🌐 Connectivity restored (navigator.onLine: true). Triggering sync...');
      const queue = await this.getAllPendingBookings();
      this.notifyListeners(queue);

      if (queue.length > 0) {
        const result = await this.syncAllPendingBookings();
        console.info('[OfflineSync] Auto-sync result after reconnection:', result);
      }
    };

    const handleOffline = async () => {
      console.warn('[OfflineSync] 📵 Connection lost. System operating in offline queue mode.');
      const queue = await this.getAllPendingBookings();
      this.notifyListeners(queue);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check: if online and queue has items, process them
    if (this.isOnline()) {
      this.getAllPendingBookings().then((queue) => {
        if (queue.length > 0) {
          console.info(`[OfflineSync] Found ${queue.length} pending offline bookings on boot. Syncing...`);
          this.syncAllPendingBookings();
        }
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      this.isInitialized = false;
    };
  }
}

export const offlineBookingSyncService = new OfflineBookingSyncService();

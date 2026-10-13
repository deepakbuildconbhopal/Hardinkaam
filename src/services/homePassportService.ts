import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { HomePassportAsset, AssetServiceHistoryItem, Booking } from '../types';

export const APPLIANCE_CATEGORIES = [
  { id: 'air_conditioner', name: 'Air Conditioner (एसी)', defaultIntervalMonths: 6 },
  { id: 'refrigerator', name: 'Refrigerator (फ्रिज)', defaultIntervalMonths: 12 },
  { id: 'washing_machine', name: 'Washing Machine (वाशिंग मशीन)', defaultIntervalMonths: 6 },
  { id: 'ro_purifier', name: 'RO Water Purifier (वाटर प्यूरीफायर)', defaultIntervalMonths: 3 },
  { id: 'geyser', name: 'Geyser / Water Heater (गीजर)', defaultIntervalMonths: 12 },
  { id: 'chimney', name: 'Kitchen Chimney / Hob (चिमनी)', defaultIntervalMonths: 4 },
  { id: 'electrical', name: 'Electrical Panel / Wiring (वायरिंग)', defaultIntervalMonths: 12 },
  { id: 'plumbing', name: 'Plumbing & Water Motor (मोटर एवं प्लंबिंग)', defaultIntervalMonths: 6 },
  { id: 'other', name: 'Other Equipment (अन्य उपकरण)', defaultIntervalMonths: 6 },
];

class HomePassportService {
  /**
   * Fetches all registered household assets for a customer
   */
  public async getAssetsForCustomer(customerId: string): Promise<HomePassportAsset[]> {
    try {
      const q = query(
        collection(db, 'home_passports'),
        where('customerId', '==', customerId),
        firestoreLimit(50)
      );
      const snap = await getDocs(q);
      const list: HomePassportAsset[] = [];
      snap.forEach((d) => list.push(d.data() as HomePassportAsset));
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return list;
    } catch (e) {
      console.warn('[HomePassportService] Error fetching customer assets:', e);
      return [];
    }
  }

  /**
   * Creates a new asset in Home Passport
   */
  public async createAsset(
    assetData: Omit<HomePassportAsset, 'id' | 'createdAt' | 'updatedAt' | 'serviceHistory'>
  ): Promise<HomePassportAsset> {
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    // Calculate default next maintenance date if not provided
    const catConfig = APPLIANCE_CATEGORIES.find((c) => c.name === assetData.category || c.id === assetData.category);
    const months = catConfig?.defaultIntervalMonths || 6;
    const defaultNextDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newAsset: HomePassportAsset = {
      ...assetData,
      id: assetId,
      serviceHistory: [],
      nextMaintenanceDate: assetData.nextMaintenanceDate || defaultNextDate,
      reminderEnabled: assetData.reminderEnabled ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await setDoc(doc(db, 'home_passports', assetId), newAsset);
    return newAsset;
  }

  /**
   * Updates an existing asset
   */
  public async updateAsset(id: string, updates: Partial<HomePassportAsset>): Promise<void> {
    await updateDoc(doc(db, 'home_passports', id), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Deletes an asset
   */
  public async deleteAsset(id: string): Promise<void> {
    await deleteDoc(doc(db, 'home_passports', id));
  }

  /**
   * Appends service history item from a real completed booking
   */
  public async linkBookingToAsset(
    assetId: string,
    booking: Booking,
    workDone: string[] = [],
    partsReplaced: string[] = []
  ): Promise<void> {
    const assetRef = doc(db, 'home_passports', assetId);
    const snap = await getDoc(assetRef);
    if (!snap.exists()) return;

    const asset = snap.data() as HomePassportAsset;
    const historyItem: AssetServiceHistoryItem = {
      bookingId: booking.id,
      serviceName: booking.serviceName,
      date: booking.completedAt || booking.scheduledDate || new Date().toISOString(),
      technicianName: booking.serviceManName || 'Hardinkaam Technician',
      workDone: workDone.length > 0 ? workDone : [booking.serviceName, 'सामान्य सर्विस एवं जांच'],
      partsReplaced,
      cost: booking.amount || booking.totalAmount || 0,
      guaranteeExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    // Calculate next suggested maintenance interval
    const catConfig = APPLIANCE_CATEGORIES.find((c) => c.name === asset.category || c.id === asset.category);
    const months = catConfig?.defaultIntervalMonths || 6;
    const nextDate = new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    await updateDoc(assetRef, {
      serviceHistory: [historyItem, ...(asset.serviceHistory || [])],
      lastServiceDate: historyItem.date,
      nextMaintenanceDate: nextDate,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Returns upcoming maintenance reminders for a customer
   */
  public async getUpcomingMaintenanceReminders(customerId: string): Promise<HomePassportAsset[]> {
    const assets = await this.getAssetsForCustomer(customerId);
    const now = Date.now();
    const thresholdDays30 = 30 * 24 * 60 * 60 * 1000;

    return assets.filter((a) => {
      if (!a.reminderEnabled || !a.nextMaintenanceDate) return false;
      const dueDate = new Date(a.nextMaintenanceDate).getTime();
      // Due within next 30 days or already overdue
      return dueDate - now <= thresholdDays30;
    });
  }
}

export const homePassportService = new HomePassportService();

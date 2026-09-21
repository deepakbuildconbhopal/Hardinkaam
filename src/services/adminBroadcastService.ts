/**
 * HARDINKAAM ADMINISTRATIVE & FESTIVAL BROADCAST SERVICE
 * Enables Super Admin to broadcast festival greetings, welcome popups,
 * and critical administrative messages directly to:
 * - Customer App
 * - ServiceMan (Pro) App
 * - Franchise (District Admin) App
 * - Brand Promoter (Business Partner) App
 * - All Apps simultaneously
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  AdminBroadcastMessage,
  BroadcastAudience,
  BroadcastMessageType,
  BroadcastTheme,
  BroadcastPreset,
} from '../types/broadcast';

const STORAGE_KEY_DISMISSED = 'hardinkaam_dismissed_broadcasts_v1';
const STORAGE_KEY_CACHE = 'hardinkaam_cached_broadcasts_v1';

export const FESTIVAL_AND_ADMIN_PRESETS: BroadcastPreset[] = [
  {
    id: 'diwali',
    name: '🪔 दीपावली महोत्सव (Diwali)',
    type: 'festival',
    theme: 'golden',
    emoji: '🪔',
    defaultAudience: 'all',
    defaultTitle: '🪔 शुभ दीपावली - हरदिनकाम परिवार की ओर से हार्दिक बधाई!',
    defaultBody:
      'दीपावली के इस पावन पर्व पर आपके और आपके परिवार के सुख, समृद्धि व उत्तम स्वास्थ्य की मंगलकामना करते हैं! हरदिनकाम हमेशा आपकी सेवा में तत्पर है। त्योहार के अवसर पर विशेष सेवा उपलब्धता व बोनस चालू है।',
    defaultActionLabel: 'शुभकामनाएं स्वीकार करें',
  },
  {
    id: 'holi',
    name: '🎨 होली पर्व (Holi)',
    type: 'festival',
    theme: 'crimson',
    emoji: '🎨',
    defaultAudience: 'all',
    defaultTitle: '🎨 रंगों के पावन पर्व होली की हार्दिक शुभकामनाएं!',
    defaultBody:
      'होली का पावन त्योहार आपके जीवन में सुख, शांति, सौहार्द और खुशहाली के नए रंग भरे। त्योहार के अवसर पर त्वरित होम सर्विस उपलब्ध है। सुरक्षित व उल्लासपूर्ण होली मनाएं!',
    defaultActionLabel: 'धन्यवाद व शुभकामनाएं',
  },
  {
    id: 'eid',
    name: '🌙 ईद मुबारक (Eid Ul-Fitr)',
    type: 'festival',
    theme: 'emerald',
    emoji: '🌙',
    defaultAudience: 'all',
    defaultTitle: '🌙 ईद-उल-फ़ित्र की दिली मुबारकबाद!',
    defaultBody:
      'आपको और आपके पूरे परिवार को ईद की बहुत-बहुत मुबारकबाद। अमन, खुशहाली, बरकत और भाईचारा आपके जीवन में सदैव बना रहे। हरदिनकाम परिवार की ओर से हार्दिक शुभकामनाएं।',
    defaultActionLabel: 'ईद मुबारक',
  },
  {
    id: 'national_day',
    name: '🇮🇳 स्वतंत्रता दिवस / गणतंत्र दिवस',
    type: 'festival',
    theme: 'saffron',
    emoji: '🇮🇳',
    defaultAudience: 'all',
    defaultTitle: '🇮🇳 राष्ट्रीय पर्व की हार्दिक शुभकामनाएं - जय हिंद!',
    defaultBody:
      'राष्ट्र निर्माण और स्थानीय रोजगार के सशक्तिकरण में हरदिनकाम परिवार का प्रत्येक सदस्य समर्पित है। आइए मिलकर एक आत्मनिर्भर, सशक्त और विकसित भारत का निर्माण करें।',
    defaultActionLabel: 'जय हिंद!',
  },
  {
    id: 'pro_bonus',
    name: '🎁 सर्विसमैन विशेष बोनस व इंसेंटिव',
    type: 'offer',
    theme: 'golden',
    emoji: '🎁',
    defaultAudience: 'service_man',
    defaultTitle: '🎁 त्योहार विशेष: हर पूर्ण कार्य पर अतिरिक्त ₹50 बोनस!',
    defaultBody:
      'प्रिय सर्विसमैन साथी, इस त्योहारी सीजन में ऑन-ड्यूटी रहने और 5-स्टार रेटिंग प्राप्त करने पर आपको हर कार्य पर कंपनी की ओर से अतिरिक्त नकद प्रोत्साहन दिया जा रहा है। तुरंत अधिक से अधिक काम स्वीकार करें!',
    defaultActionLabel: 'काम देखें व शुरू करें',
  },
  {
    id: 'franchise_meet',
    name: '🏢 फ्रेंचाइजी प्रशासनिक परिपत्र',
    type: 'announcement',
    theme: 'royal_blue',
    emoji: '🏢',
    defaultAudience: 'franchise',
    defaultTitle: '📢 जिला फ्रेंचाइजी सूचना: मासिक समीक्षा बैठक व विस्तार',
    defaultBody:
      'समस्त जिला फ्रेंचाइजी पार्टनर्स को सूचित किया जाता है कि अपने जिले में सर्विसमैन ऑनबोर्डिंग और एक्टिवेशन की समीक्षा डैशबोर्ड पर तुरंत जांचें। मुख्यालय से नए जिलों हेतु विशेष सहायता पैकेज जारी किया गया है।',
    defaultActionLabel: 'रिपोर्ट देखें',
  },
  {
    id: 'brand_promoter_incentive',
    name: '🤝 ब्रांड प्रमोटर कमीशन बंपर ऑफर',
    type: 'offer',
    theme: 'saffron',
    emoji: '🤝',
    defaultAudience: 'brand_promoter',
    defaultTitle: '💰 ब्रांड प्रमोटर विशेष: डायरेक्ट रेफरल पर 20% अतिरिक्त शेयर!',
    defaultBody:
      'हार्दिक बधाई! नए व्यापारियों, सर्विसमैन और ग्राहकों को हरदिनकाम से जोड़ने पर ब्रांड प्रमोटर्स को तत्काल वॉलेट क्रेडिट व आकर्षक मासिक इंसेंटिव दिया जा रहा है। अपनी रेफरल लिंक अभी साझा करें।',
    defaultActionLabel: 'रेफरल लिंक देखें',
  },
  {
    id: 'system_maintenance',
    name: '⚡ सिस्टम रखरखाव व तकनीकी नोटिस',
    type: 'alert',
    theme: 'royal_blue',
    emoji: '⚡',
    defaultAudience: 'all',
    defaultTitle: '📢 प्रशासनिक सूचना: प्लेटफॉर्म अपडेट व तकनीकी सुधार',
    defaultBody:
      'प्लेटफॉर्म को और अधिक तेज़, सुरक्षित व सुचारू बनाने के लिए सिस्टम में नया अपडेट लागू किया गया है। कृपया अपने ऐप को रीफ्रेश रखें। किसी भी तकनीकी सहायता के लिए हेल्पलाइन 0755-4000000 पर संपर्क करें।',
    defaultActionLabel: 'अवगत हैं',
  },
];

class AdminBroadcastService {
  private memoryCache: AdminBroadcastMessage[] = [];
  private dismissedIds: Set<string> = new Set();

  constructor() {
    this.loadDismissedIds();
    this.loadLocalCache();
  }

  private loadDismissedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DISMISSED);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          this.dismissedIds = new Set(arr);
        }
      }
    } catch (e) {
      console.warn('Error loading dismissed broadcasts:', e);
    }
  }

  public markDismissed(messageId: string): void {
    this.dismissedIds.add(messageId);
    if (typeof window !== 'undefined') {
      try {
        const arr = Array.from(this.dismissedIds).slice(-100);
        localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(arr));
      } catch (e) {
        console.warn('Error saving dismissed broadcast:', e);
      }
    }
  }

  public isDismissed(messageId: string): boolean {
    return this.dismissedIds.has(messageId);
  }

  public resetDismissed(messageId?: string): void {
    if (messageId) {
      this.dismissedIds.delete(messageId);
    } else {
      this.dismissedIds.clear();
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(Array.from(this.dismissedIds)));
      } catch {}
    }
  }

  private loadLocalCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CACHE);
      if (raw) {
        this.memoryCache = JSON.parse(raw);
      }
    } catch {}
  }

  private saveLocalCache(list: AdminBroadcastMessage[]): void {
    this.memoryCache = list;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(list.slice(0, 30)));
      } catch {}
    }
  }

  /**
   * Create and broadcast an administrative or festival greeting
   */
  public async createBroadcast(
    params: Omit<AdminBroadcastMessage, 'id' | 'createdAt' | 'isActive'> & {
      isActive?: boolean;
    }
  ): Promise<AdminBroadcastMessage> {
    const id = `bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: AdminBroadcastMessage = {
      id,
      title: params.title.trim(),
      body: params.body.trim(),
      audience: params.audience,
      type: params.type,
      theme: params.theme,
      emoji: params.emoji || '📢',
      actionLabel: params.actionLabel?.trim() || 'धन्यवाद',
      actionUrlOrTab: params.actionUrlOrTab || '',
      displayMode: params.displayMode || 'popup_and_banner',
      isActive: params.isActive !== false,
      priority: params.priority || 'normal',
      createdAt: now,
      createdBy: params.createdBy || 'Super Admin',
      expiresAt: params.expiresAt,
    };

    // 1. Optimistically update local cache
    const updated = [record, ...this.memoryCache.filter((m) => m.id !== id)];
    this.saveLocalCache(updated);

    // 2. Persist to Firestore collection `broadcast_announcements`
    try {
      await setDoc(doc(db, 'broadcast_announcements', id), record);
      // Also update settings/active_broadcast for low-overhead global lookup
      await setDoc(
        doc(db, 'settings', 'active_broadcast'),
        { latest: record, updatedAt: now },
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore broadcast save note (using local cache):', err);
    }

    return record;
  }

  /**
   * Fetch all broadcast records for Super Admin list
   */
  public async getAllBroadcasts(): Promise<AdminBroadcastMessage[]> {
    try {
      const q = query(collection(db, 'broadcast_announcements'), limit(50));
      const snap = await getDocs(q);
      const items: AdminBroadcastMessage[] = [];
      snap.forEach((d) => {
        items.push({ id: d.id, ...d.data() } as AdminBroadcastMessage);
      });

      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (items.length > 0) {
        this.saveLocalCache(items);
        return items;
      }
    } catch (err) {
      console.warn('Error fetching all broadcasts from Firestore:', err);
    }

    return this.memoryCache;
  }

  /**
   * Real-time listener for active broadcasts targeted to an audience
   * Audience can be 'customer', 'service_man', 'franchise', 'brand_promoter' or 'all'
   */
  public listenActiveBroadcasts(
    userRoleAudience: BroadcastAudience,
    callback: (messages: AdminBroadcastMessage[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'broadcast_announcements'),
        where('isActive', '==', true),
        limit(20)
      );

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const raw: AdminBroadcastMessage[] = [];
          snap.forEach((d) => {
            raw.push({ id: d.id, ...d.data() } as AdminBroadcastMessage);
          });

          // Filter matching audience
          const filtered = raw.filter(
            (msg) =>
              msg.isActive &&
              (msg.audience === 'all' || msg.audience === userRoleAudience)
          );

          filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.saveLocalCache(raw);
          callback(filtered);
        },
        (err) => {
          console.warn('Broadcast listener note (falling back to cache):', err.message);
          const fallback = this.memoryCache.filter(
            (m) =>
              m.isActive &&
              (m.audience === 'all' || m.audience === userRoleAudience)
          );
          callback(fallback);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('Error establishing broadcast listener:', err);
      const fallback = this.memoryCache.filter(
        (m) =>
          m.isActive &&
          (m.audience === 'all' || m.audience === userRoleAudience)
      );
      callback(fallback);
      return () => {};
    }
  }

  /**
   * Toggle broadcast active/inactive
   */
  public async toggleBroadcastActive(id: string, isActive: boolean): Promise<void> {
    const updated = this.memoryCache.map((m) => (m.id === id ? { ...m, isActive } : m));
    this.saveLocalCache(updated);

    try {
      await updateDoc(doc(db, 'broadcast_announcements', id), { isActive });
    } catch (err) {
      console.warn('Error toggling broadcast:', err);
    }
  }

  /**
   * Delete broadcast
   */
  public async deleteBroadcast(id: string): Promise<void> {
    const updated = this.memoryCache.filter((m) => m.id !== id);
    this.saveLocalCache(updated);

    try {
      await deleteDoc(doc(db, 'broadcast_announcements', id));
    } catch (err) {
      console.warn('Error deleting broadcast:', err);
    }
  }
}

export const adminBroadcastService = new AdminBroadcastService();

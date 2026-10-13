/**
 * HARDINKAAM SERVICE PROFESSIONAL APP
 * Serviceman Alarm Settings & Deduplication Manager
 * 
 * Manages:
 * 1. Alarm toggling, volume, vibration, and tones
 * 2. Strict Deduplication using composite key: bookingId + serviceManId + offerId
 * 3. 4-environment alarm strategies:
 *    - App Open (Web Audio loop, vibration, visible modal)
 *    - App Background (Page visibility, Notification API, tab title alert)
 *    - Installed PWA (Service Worker background notifications, app badge)
 *    - Android / Native App (Notification Channel 'hardinkaam_booking_alerts', high priority heads-up, vibration)
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AlarmToneType, bookingAlarmSoundService } from './bookingAlarmSoundService';

export interface ServicemanAlarmPersonalSettings {
  alarmEnabled: boolean;
  volume: number; // 0.1 to 1.0
  vibrationEnabled: boolean;
  soundType: AlarmToneType;
}

export interface AdminGlobalAlarmSettings {
  globalAlarmEnabled: boolean;
  countdownDurationSeconds: number; // e.g. 60s
  maxAlertAttempts: number; // e.g. 3 attempts
  selectedAlarmTone: AlarmToneType;
  alarmVolumeDefault: number; // 0.1 to 1.0 (default 0.85)
  alarmSoundLoop: boolean;
  vibrationDefault: boolean;
  vibrationPattern: 'standard' | 'heavy' | 'pulse';
  notificationTitle: string;
  notificationSubtitle: string;
  defaultNotificationBody?: string;
  strictEligibility: boolean;
  requireKycVerified?: boolean;
  requireActiveGps?: boolean;
  minRatingThreshold?: number; // 0, 3.5, 4.0, 4.5
  maxActiveJobsCap?: number; // e.g. 1, 2, 3
  autoReassignOnExpiry: boolean;
  enabledDistricts?: string[]; // e.g. ['all'] or array of district IDs
  eligibleCategories?: string[]; // e.g. ['all'] or array of category IDs
  updatedAt?: string;
  updatedBy?: string;
}

export const ANDROID_NOTIFICATION_CHANNEL = {
  id: 'hardinkaam_booking_alerts',
  name: 'HARDINKAAM New Booking Alerts (नया काम)',
  description: 'Urgent on-demand booking alerts with high priority audible ringtone and heads-up dispatch',
  importance: 'high',
  sound: 'booking_chime',
  vibrationPattern: [0, 500, 250, 500],
};

const LOCAL_STORAGE_KEY_PRO_SETTINGS = 'hardinkaam_pro_alarm_settings_v1';
const LOCAL_STORAGE_KEY_ACKNOWLEDGED = 'hardinkaam_acknowledged_alarms_v2';

export const DEFAULT_PRO_SETTINGS: ServicemanAlarmPersonalSettings = {
  alarmEnabled: true,
  volume: 0.85,
  vibrationEnabled: true,
  soundType: 'harmonic_bells',
};

export const DEFAULT_ADMIN_SETTINGS: AdminGlobalAlarmSettings = {
  globalAlarmEnabled: true,
  countdownDurationSeconds: 60,
  maxAlertAttempts: 3,
  selectedAlarmTone: 'harmonic_bells',
  alarmVolumeDefault: 0.85,
  alarmSoundLoop: true,
  vibrationDefault: true,
  vibrationPattern: 'standard',
  notificationTitle: '🔔 नया काम आया है!',
  notificationSubtitle: 'New Service Request Received',
  defaultNotificationBody: 'आपके क्षेत्र में नई बुकिंग प्राप्त हुई है। विवरण देखें और तुरंत स्वीकार करें।',
  strictEligibility: true,
  requireKycVerified: true,
  requireActiveGps: false,
  minRatingThreshold: 0,
  maxActiveJobsCap: 2,
  autoReassignOnExpiry: true,
  enabledDistricts: ['all'],
  eligibleCategories: ['all'],
};

class ServicemanAlarmSettingsService {
  private acknowledgedIds: Set<string> = new Set();
  private personalSettings: ServicemanAlarmPersonalSettings = { ...DEFAULT_PRO_SETTINGS };
  private adminSettings: AdminGlobalAlarmSettings = { ...DEFAULT_ADMIN_SETTINGS };
  private adminLoaded: boolean = false;
  private tabBlinkIntervalId: number | null = null;
  private originalDocumentTitle: string = '';

  constructor() {
    this.loadPersonalSettings();
    this.loadAcknowledgedIds();
  }

  /**
   * Load personal pro settings from localStorage
   */
  public loadPersonalSettings(): ServicemanAlarmPersonalSettings {
    if (typeof window === 'undefined') return this.personalSettings;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_PRO_SETTINGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.personalSettings = {
          ...DEFAULT_PRO_SETTINGS,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Error reading pro alarm settings:', e);
    }
    return this.personalSettings;
  }

  /**
   * Save personal pro settings
   */
  public savePersonalSettings(settings: Partial<ServicemanAlarmPersonalSettings>): ServicemanAlarmPersonalSettings {
    this.personalSettings = {
      ...this.personalSettings,
      ...settings,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_PRO_SETTINGS, JSON.stringify(this.personalSettings));
      } catch (e) {
        console.warn('Error saving pro alarm settings:', e);
      }
    }
    return this.personalSettings;
  }

  public getPersonalSettings(): ServicemanAlarmPersonalSettings {
    return { ...this.personalSettings };
  }

  /**
   * Build unique composite alarm key:
   * bookingId + serviceManId + offerId
   */
  public getAlarmKey(bookingId: string, serviceManId: string, offerId?: string): string {
    const bId = (bookingId || '').trim();
    const proId = (serviceManId || '').trim();
    const offId = (offerId || '').trim() || 'direct';
    return `${bId}__${proId}__${offId}`;
  }

  /**
   * Load acknowledged IDs to prevent duplicate alarms
   */
  private loadAcknowledgedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY_ACKNOWLEDGED);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.acknowledgedIds = new Set(list.slice(-500)); // retain last 500
        }
      }
    } catch (e) {
      console.warn('Error loading acknowledged alarm IDs:', e);
    }
  }

  private persistAcknowledgedIds(): void {
    if (typeof window === 'undefined') return;
    try {
      const arr = Array.from(this.acknowledgedIds).slice(-500);
      localStorage.setItem(LOCAL_STORAGE_KEY_ACKNOWLEDGED, JSON.stringify(arr));
    } catch (e) {
      console.warn('Error saving acknowledged alarm IDs:', e);
    }
  }

  /**
   * Prevent duplicate alarms using composite key:
   * bookingId + serviceManId + offerId
   */
  public isAlarmAcknowledged(bookingId: string, serviceManId: string, offerId?: string): boolean {
    const compositeKey = this.getAlarmKey(bookingId, serviceManId, offerId);
    if (this.acknowledgedIds.has(compositeKey)) return true;
    if (offerId && this.acknowledgedIds.has(offerId)) return true;
    if (this.acknowledgedIds.has(bookingId)) return true;
    return false;
  }

  /**
   * Mark composite alarm as acknowledged (accepted, rejected, dismissed, or expired)
   */
  public markAlarmAcknowledged(bookingId: string, serviceManId: string, offerId?: string): void {
    const compositeKey = this.getAlarmKey(bookingId, serviceManId, offerId);
    this.acknowledgedIds.add(compositeKey);
    if (offerId) this.acknowledgedIds.add(offerId);
    if (bookingId) this.acknowledgedIds.add(bookingId);
    this.persistAcknowledgedIds();
  }

  /**
   * Clear composite alarm acknowledgement (for testing/simulation)
   */
  public clearAlarmAcknowledged(bookingId: string, serviceManId: string, offerId?: string): void {
    const compositeKey = this.getAlarmKey(bookingId, serviceManId, offerId);
    this.acknowledgedIds.delete(compositeKey);
    if (offerId) this.acknowledgedIds.delete(offerId);
    if (bookingId) this.acknowledgedIds.delete(bookingId);
    this.persistAcknowledgedIds();
  }

  /**
   * Backwards compatible single ID check
   */
  public isAcknowledged(bookingId: string): boolean {
    return this.acknowledgedIds.has(bookingId);
  }

  /**
   * Backwards compatible single ID mark
   */
  public markAcknowledged(bookingId: string): void {
    this.acknowledgedIds.add(bookingId);
    this.persistAcknowledgedIds();
  }

  /**
   * Backwards compatible clear
   */
  public clearAcknowledged(bookingId: string): void {
    this.acknowledgedIds.delete(bookingId);
    this.persistAcknowledgedIds();
  }

  /**
   * Detect current platform environment
   */
  public detectPlatformMode(): {
    isAndroidNative: boolean;
    isPWA: boolean;
    isBackground: boolean;
    isBrowser: boolean;
    channelId: string;
  } {
    if (typeof window === 'undefined') {
      return {
        isAndroidNative: false,
        isPWA: false,
        isBackground: false,
        isBrowser: true,
        channelId: ANDROID_NOTIFICATION_CHANNEL.id,
      };
    }

    const userAgent = (navigator.userAgent || '').toLowerCase();
    const isStandaloneDisplay =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    // Check for native bridge or TWA/Android app indicators
    const hasAndroidBridge =
      typeof (window as any).AndroidBridge !== 'undefined' ||
      typeof (window as any).HARDINKAAM_NATIVE !== 'undefined' ||
      userAgent.includes('hardinkaam_android') ||
      userAgent.includes('twa');

    const isBackground = typeof document !== 'undefined' ? document.hidden : false;

    return {
      isAndroidNative: hasAndroidBridge,
      isPWA: isStandaloneDisplay,
      isBackground,
      isBrowser: !hasAndroidBridge && !isStandaloneDisplay,
      channelId: ANDROID_NOTIFICATION_CHANNEL.id,
    };
  }

  /**
   * Fetch Global Admin Alarm Settings from Firestore
   */
  public async loadAdminGlobalSettings(): Promise<AdminGlobalAlarmSettings> {
    if (this.adminLoaded) {
      bookingAlarmSoundService.setTone(this.adminSettings.selectedAlarmTone || 'harmonic_bells');
      return this.adminSettings;
    }
    try {
      const snap = await getDoc(doc(db, 'settings', 'booking_alarm'));
      if (snap.exists()) {
        const data = snap.data();
        this.adminSettings = {
          ...DEFAULT_ADMIN_SETTINGS,
          ...data,
        };
        this.adminLoaded = true;
      }
    } catch (err) {
      console.warn('Admin alarm settings fetch note (using defaults):', err);
    }
    bookingAlarmSoundService.setTone(this.adminSettings.selectedAlarmTone || 'harmonic_bells');
    return this.adminSettings;
  }

  /**
   * Update Admin Global Alarm Settings in Firestore
   */
  public async saveAdminGlobalSettings(settings: Partial<AdminGlobalAlarmSettings>): Promise<void> {
    this.adminSettings = {
      ...this.adminSettings,
      ...settings,
    };
    if (this.adminSettings.selectedAlarmTone) {
      bookingAlarmSoundService.setTone(this.adminSettings.selectedAlarmTone);
    }
    try {
      await setDoc(doc(db, 'settings', 'booking_alarm'), this.adminSettings, { merge: true });
    } catch (err) {
      console.error('Failed to save global alarm settings to Firestore:', err);
      throw err;
    }
  }

  public getAdminSettings(): AdminGlobalAlarmSettings {
    return { ...this.adminSettings };
  }

  /**
   * Request system notification permission with clear status return
   */
  public async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
      return 'denied';
    }
  }

  /**
   * Check current Notification permission status
   */
  public getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Start flashing browser tab title when alert is active in background
   */
  public startTabTitleBlink(serviceName: string): void {
    if (typeof document === 'undefined') return;
    if (this.tabBlinkIntervalId !== null) return;

    this.originalDocumentTitle = document.title;
    let toggle = false;

    this.tabBlinkIntervalId = window.setInterval(() => {
      toggle = !toggle;
      document.title = toggle
        ? `🔔 नया काम आया है! (${serviceName})`
        : `⚡ HARDINKAAM Service Alert`;
    }, 900);
  }

  /**
   * Stop tab title flashing and restore original title
   */
  public stopTabTitleBlink(): void {
    if (typeof document === 'undefined') return;
    if (this.tabBlinkIntervalId !== null) {
      clearInterval(this.tabBlinkIntervalId);
      this.tabBlinkIntervalId = null;
    }
    if (this.originalDocumentTitle) {
      document.title = this.originalDocumentTitle;
    }
  }

  /**
   * Dispatch system notification when the app is in background or installed PWA
   */
  public showBackgroundBookingNotification(
    bookingId: string,
    serviceName: string,
    locality: string,
    amount: number,
    approxDistance?: string
  ): void {
    if (typeof window === 'undefined') return;

    // Start title blinking for background awareness
    this.startTabTitleBlink(serviceName);

    // If native Android bridge is available, notify via Android Channel
    const nativeBridge = (window as any).AndroidBridge || (window as any).HARDINKAAM_NATIVE;
    if (nativeBridge && typeof nativeBridge.triggerBookingAlarm === 'function') {
      try {
        nativeBridge.triggerBookingAlarm(
          JSON.stringify({
            bookingId,
            serviceName,
            locality,
            amount,
            channelId: ANDROID_NOTIFICATION_CHANNEL.id,
            channelName: ANDROID_NOTIFICATION_CHANNEL.name,
          })
        );
      } catch (e) {
        console.warn('Android bridge notification note:', e);
      }
    }

    // Set badge if supported
    if ('setAppBadge' in navigator) {
      try {
        (navigator as any).setAppBadge(1);
      } catch {}
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const title = this.adminSettings.notificationTitle || '🔔 नया काम आया है! - New Service Request';
      const proShare = Math.round(amount * 0.85);
      const distInfo = approxDistance ? `\n🚗 दूरी: ${approxDistance}` : '';
      const customBodyPrefix = this.adminSettings.defaultNotificationBody ? `${this.adminSettings.defaultNotificationBody}\n` : '';
      const body = `${customBodyPrefix}सेवा: ${serviceName}\n📍 स्थान: ${locality || 'Bhopal'}${distInfo}\n💰 अनुमानित आय: ₹${proShare}\n⏱️ तुरंत स्वीकार करें (Action Required)`;

      let vibrateArr: number[] = [];
      if (this.adminSettings.vibrationDefault !== false) {
        if (this.adminSettings.vibrationPattern === 'heavy') {
          vibrateArr = [800, 200, 800, 200, 800];
        } else if (this.adminSettings.vibrationPattern === 'pulse') {
          vibrateArr = [200, 100, 200, 100, 200, 100, 200];
        } else {
          vibrateArr = [500, 250, 500, 250, 500];
        }
      }

      const options: any = {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon-32x32.png',
        tag: `hardinkaam-booking-${bookingId}`,
        renotify: true,
        requireInteraction: true,
        silent: false,
        vibrate: vibrateArr,
        data: {
          bookingId,
          url: '/#serviceman',
          channelId: ANDROID_NOTIFICATION_CHANNEL.id,
        },
      };

      // ServiceWorker notification with click focus
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, options).catch(() => {
            new Notification(title, options);
          });
        });
      } else {
        const notif = new Notification(title, options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Error triggering system notification:', err);
    }
  }

  /**
   * Clear background notification and reset badge / tab title
   */
  public clearBackgroundBookingNotification(): void {
    this.stopTabTitleBlink();
    if (typeof navigator !== 'undefined' && 'clearAppBadge' in navigator) {
      try {
        (navigator as any).clearAppBadge();
      } catch {}
    }
  }
}

export const servicemanAlarmSettingsService = new ServicemanAlarmSettingsService();


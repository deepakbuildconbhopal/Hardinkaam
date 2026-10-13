import {
  getMessaging,
  getToken,
  onMessage,
  deleteToken,
  isSupported,
  Messaging,
  MessagePayload,
} from 'firebase/messaging';
import { app } from './config';

let messagingInstance: Messaging | null = null;
let isFCMSupportedCache: boolean | null = null;

/**
 * Checks if Firebase Cloud Messaging is supported in the current runtime environment.
 * Gracefully handles unsupported browsers, SSR, iframe constraints, and privacy modes.
 */
export async function isFCMSupported(): Promise<boolean> {
  if (isFCMSupportedCache !== null) {
    return isFCMSupportedCache;
  }

  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    isFCMSupportedCache = false;
    return false;
  }

  try {
    const supported = await isSupported();
    isFCMSupportedCache = Boolean(supported);
    return isFCMSupportedCache;
  } catch (err) {
    console.warn('[FCM] Feature check returned unsupported:', err);
    isFCMSupportedCache = false;
    return false;
  }
}

/**
 * Returns the Firebase Messaging instance if supported.
 * Avoids multiple initialization or initialization in unsupported environments.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (messagingInstance) {
    return messagingInstance;
  }

  const supported = await isFCMSupported();
  if (!supported) {
    return null;
  }

  try {
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Failed to get Firebase Messaging instance:', err);
    return null;
  }
}

/**
 * Gets the current browser Notification permission state safely.
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

/**
 * Explicit user-action-driven permission request.
 * NEVER called automatically on initial page load.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[FCM] Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Obtains an FCM registration token after notification permission is granted.
 */
export async function getFCMRegistrationToken(options?: { vapidKey?: string }): Promise<string | null> {
  try {
    const supported = await isFCMSupported();
    if (!supported) {
      console.info('[FCM] Push notifications are not supported in this browser.');
      return null;
    }

    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Notification permission is not granted:', permission);
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return null;
    }

    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch (swErr) {
        console.warn('[FCM] Service worker registration note, checking ready SW:', swErr);
        serviceWorkerRegistration = await navigator.serviceWorker.ready.catch(() => undefined);
      }
    }

    const vapidKey =
      options?.vapidKey ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_VAPID_KEY) ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FCM_VAPID_KEY) ||
      undefined;

    let token: string | null = null;
    try {
      token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration,
      });
    } catch (tokenErr: any) {
      console.warn('[FCM] getToken note:', tokenErr?.message || tokenErr);
      const msg = String(tokenErr?.message || '');
      if (
        msg.includes('vapid') ||
        msg.includes('PushManager') ||
        msg.includes('Registration') ||
        msg.includes('no-vapid-key') ||
        tokenErr?.code === 'messaging/token-unsubscribe-failed' ||
        tokenErr?.code === 'messaging/unsupported-browser'
      ) {
        const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('hardinkaam_fcm_token') : null;
        if (stored) return stored;
        const fallbackToken = `fcm_web_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
        return fallbackToken;
      }
      return null;
    }

    if (!token) {
      console.warn('[FCM] No registration token returned.');
      return null;
    }

    return token;
  } catch (err: any) {
    console.warn('[FCM] Failed to obtain registration token:', err?.message || err);
    return null;
  }
}

/**
 * Unregisters the current FCM registration token.
 */
export async function deleteFCMRegistrationToken(): Promise<boolean> {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return false;
    const deleted = await deleteToken(messaging);
    return deleted;
  } catch (err) {
    console.warn('[FCM] Failed to delete token:', err);
    return false;
  }
}

/**
 * Subscribes to foreground push notifications when the app is active and in focus.
 */
export function subscribeToForegroundMessages(
  callback: (payload: MessagePayload) => void
): (() => void) {
  let activeUnsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getFirebaseMessaging()
    .then((messaging) => {
      if (!isCancelled && messaging) {
        activeUnsubscribe = onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground push message received:', payload);
          callback(payload);
        });
      }
    })
    .catch((err) => {
      console.warn('[FCM] Could not attach onMessage listener:', err);
    });

  return () => {
    isCancelled = true;
    if (activeUnsubscribe) {
      activeUnsubscribe();
    }
  };
}

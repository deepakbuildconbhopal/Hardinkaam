import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, addDoc, limit } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useAuth } from './AuthContext';
import { isResourceExhausted, checkAndHandleQuotaError } from '../utils/sparkQuotaGuard';
import { Notification } from '../types';
import {
  BookingNotificationPayload,
  dispatchBookingNotification,
  generateNotificationDocId,
} from '../services/bookingNotificationIntegrationService';
import {
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getPushNotificationStatus,
  subscribeToForegroundMessages,
  sendTestPushNotification,
  PushSubscriptionResult,
} from '../services/fcmService';
import { bookingAlarmSoundService } from '../services/bookingAlarmSoundService';
import { Bell, X, ExternalLink } from 'lucide-react';

export interface PushBannerNotification {
  title: string;
  body: string;
  url?: string;
  bookingId?: string;
  eventType?: string;
  receivedAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (
    notif: Omit<Notification, 'id' | 'createdAt' | 'read'>,
    customDocId?: string
  ) => Promise<void>;
  notifyBookingEvent: (payload: BookingNotificationPayload) => Promise<void>;
  // FCM Push Notifications state and methods
  isPushSupported: boolean;
  pushPermission: NotificationPermission;
  isPushSubscribed: boolean;
  fcmToken: string | null;
  enablePushNotifications: () => Promise<PushSubscriptionResult>;
  disablePushNotifications: () => Promise<boolean>;
  refreshPushStatus: () => Promise<void>;
  sendTestPush: () => Promise<{ success: boolean; message: string }>;
  activePushBanner: PushBannerNotification | null;
  dismissPushBanner: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, activeRole } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [activePushBanner, setActivePushBanner] = useState<PushBannerNotification | null>(null);

  // Check FCM push capability and local registration status safely
  const refreshPushStatus = useCallback(async () => {
    try {
      const status = await getPushNotificationStatus();
      setIsPushSupported(status.isSupported);
      setPushPermission(status.permission);
      setIsPushSubscribed(status.isSubscribed);
      setFcmToken(status.token);
    } catch {
      setIsPushSupported(false);
    }
  }, []);

  useEffect(() => {
    refreshPushStatus();
  }, [refreshPushStatus, currentUser]);

  // Auto-detect when user returns from browser site settings (unblock detection)
  useEffect(() => {
    const handleRecheck = () => {
      refreshPushStatus();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleRecheck);
      document.addEventListener('visibilitychange', handleRecheck);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleRecheck);
        document.removeEventListener('visibilitychange', handleRecheck);
      }
    };
  }, [refreshPushStatus]);

  const dismissPushBanner = useCallback(() => {
    setActivePushBanner(null);
  }, []);

  // Foreground push message listener (active if push is supported & granted)
  useEffect(() => {
    if (!isPushSubscribed || pushPermission !== 'granted') {
      return;
    }

    const unsubscribe = subscribeToForegroundMessages((payload) => {
      console.log('[NotificationContext] Foreground FCM message received:', payload);

      const title = payload.notification?.title || (payload.data?.title as string) || '🔔 HARDINKAAM Booking Update';
      const body = payload.notification?.body || (payload.data?.body as string) || (payload.data?.message as string) || 'New update regarding your booking.';
      const url = (payload.data?.url as string) || (payload.data?.link as string) || (payload.data?.bookingId ? `/#booking_${payload.data.bookingId}` : undefined);
      const bookingId = payload.data?.bookingId as string | undefined;
      const eventType = payload.data?.eventType as string | undefined;

      // Play soft distinctive chime and trigger hardware vibration
      try {
        bookingAlarmSoundService.playTonePreview('harmonic_bells', 0.8);
      } catch (e) {
        console.warn('Notification sound note:', e);
      }

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([150, 80, 150]);
        } catch {}
      }

      setActivePushBanner({
        title,
        body,
        url,
        bookingId,
        eventType,
        receivedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      });

      // Auto-dismiss banner after 8 seconds
      setTimeout(() => {
        setActivePushBanner((current) => (current?.title === title ? null : current));
      }, 8000);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isPushSubscribed, pushPermission]);

  // In-app Firestore notifications listener
  useEffect(() => {
    if (!auth.currentUser || !currentUser?.uid || isResourceExhausted()) {
      setNotifications([]);
      return;
    }

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: Notification[] = [];
          snapshot.forEach((d) => {
            items.push({ id: d.id, ...d.data() } as Notification);
          });
          // Sort client-side by date desc
          items.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
          setNotifications(items);
        },
        (error) => {
          console.warn('Notifications listener notice:', error.message);
          checkAndHandleQuotaError(error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Notification query error:', err);
      checkAndHandleQuotaError(err);
    }
  }, [
    currentUser?.uid,
    userProfile?.id,
    userProfile?.franchisePartnerId,
    userProfile?.assignedDistrictId,
    userProfile?.districtId,
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      const ref = doc(db, 'notifications', id);
      await updateDoc(ref, { read: true });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const sendNotification = async (
    notif: Omit<Notification, 'id' | 'createdAt' | 'read'>,
    customDocId?: string
  ) => {
    try {
      const docId =
        customDocId ||
        (notif.bookingId && notif.type
          ? generateNotificationDocId(
              (notif.type as any) || 'booking_created',
              notif.bookingId,
              notif.userId
            )
          : undefined);

      const payload = {
        ...notif,
        read: false,
        createdAt: new Date().toISOString(),
      };

      if (docId) {
        await setDoc(doc(db, 'notifications', docId), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'notifications'), payload);
      }
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  const notifyBookingEvent = async (payload: BookingNotificationPayload) => {
    try {
      await dispatchBookingNotification(payload);
    } catch (err) {
      console.error('Error dispatching booking notification event:', err);
    }
  };

  // User-action-driven push notification enabling
  const enablePushNotifications = async (): Promise<PushSubscriptionResult> => {
    if (!currentUser) {
      return {
        success: false,
        permission: 'denied',
        error: 'Please sign in to enable push notifications on your account.',
      };
    }

    const result = await subscribeToPushNotifications({
      uid: currentUser.uid,
      role: activeRole || userProfile?.role || 'customer',
    });

    await refreshPushStatus();
    return result;
  };

  const disablePushNotifications = async (): Promise<boolean> => {
    const success = await unsubscribeFromPushNotifications(
      currentUser ? { uid: currentUser.uid } : undefined
    );
    await refreshPushStatus();
    return success;
  };

  const sendTestPush = async (): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) {
      return { success: false, message: 'Please sign in to test push notifications.' };
    }
    return sendTestPushNotification(currentUser.uid, activeRole || 'customer');
  };

  const contextValue = React.useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      sendNotification,
      notifyBookingEvent,
      isPushSupported,
      pushPermission,
      isPushSubscribed,
      fcmToken,
      enablePushNotifications,
      disablePushNotifications,
      refreshPushStatus,
      sendTestPush,
      activePushBanner,
      dismissPushBanner,
    }),
    [
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      sendNotification,
      notifyBookingEvent,
      isPushSupported,
      pushPermission,
      isPushSubscribed,
      fcmToken,
      enablePushNotifications,
      disablePushNotifications,
      refreshPushStatus,
      activePushBanner,
      dismissPushBanner,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Real-time Heads-up Foreground Push Toast Banner */}
      {activePushBanner && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 max-w-sm w-full mx-auto p-4 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-indigo-500/40 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-800/60">
                  FCM Push Alert
                </span>
                <span className="text-[10px] text-slate-400">{activePushBanner.receivedAt}</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-1 leading-snug line-clamp-1">
                {activePushBanner.title}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                {activePushBanner.body}
              </p>

              {activePushBanner.url && (
                <div className="mt-2.5 flex items-center gap-2">
                  <a
                    href={activePushBanner.url}
                    onClick={() => dismissPushBanner()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                  >
                    <span>View Booking</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={dismissPushBanner}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

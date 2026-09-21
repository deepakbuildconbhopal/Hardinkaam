import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    try {
      const userIds = Array.from(
        new Set(
          [
            currentUser.uid,
            userProfile?.id,
            userProfile?.franchisePartnerId,
            userProfile?.assignedDistrictId,
            userProfile?.assignedDistrictId ? `franchise_${userProfile.assignedDistrictId}` : '',
            userProfile?.districtId,
          ].filter(Boolean)
        )
      ) as string[];

      const q =
        userIds.length > 1
          ? query(
              collection(db, 'notifications'),
              where('userId', 'in', userIds.slice(0, 10)),
              limit(50)
            )
          : query(
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
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Notification query error:', err);
    }
  }, [currentUser, userProfile]);

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

  const sendNotification = async (notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    try {
      const newDoc = {
        ...notif,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'notifications'), newDoc);
    } catch (err) {
      console.error('Error sending notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        sendNotification,
      }}
    >
      {children}
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

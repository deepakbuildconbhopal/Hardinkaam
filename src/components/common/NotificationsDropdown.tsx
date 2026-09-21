import React from 'react';
import { Bell, CheckCheck, X, ExternalLink, Calendar, CreditCard, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectBooking?: (bookingId: string) => void;
}

export const NotificationsDropdown: React.FC<Props> = ({ isOpen, onClose, onSelectBooking }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'kyc':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div
      id="notifications-panel"
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-600" />
          <h3 className="font-semibold text-stone-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-orange-600 text-white">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={markAllAsRead}
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-stone-100">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-stone-600">No notifications yet</p>
            <p className="text-xs text-stone-400 mt-1">Updates on your bookings and account will appear here.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markAsRead(n.id);
                if (n.link && onSelectBooking) {
                  onSelectBooking(n.link);
                  onClose();
                }
              }}
              className={`p-3.5 hover:bg-orange-50/50 cursor-pointer transition-colors ${
                !n.read ? 'bg-orange-50/30' : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-stone-100 mt-0.5 flex-shrink-0">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className={`text-xs font-medium truncate ${!n.read ? 'text-stone-950 font-bold' : 'text-stone-800'}`}>
                      {n.title}
                    </h4>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-orange-600 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-stone-400">
                      {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                    {n.link && (
                      <span className="text-[10px] text-orange-600 font-medium flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

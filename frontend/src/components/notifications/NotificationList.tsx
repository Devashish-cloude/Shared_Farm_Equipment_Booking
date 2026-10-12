import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  CreditCard,
  Play,
  Square,
  AlertTriangle,
  Check,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api.js';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // live polling
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'payment_success':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'rental_started':
        return <Play className="w-4 h-4 text-emerald-400 fill-current" />;
      case 'rental_completed':
        return <Square className="w-4 h-4 text-blue-400 fill-current" />;
      case 'booking_accepted':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'booking_rejected':
      case 'payment_failed':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">In-App Notifications</h3>
            <p className="text-xs text-slate-400">
              {unreadCount} unread update{unreadCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            id="btn-mark-all-read"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="divide-y divide-slate-800/80 max-h-[380px] overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-400">No notifications yet</p>
            <p className="text-[11px] text-slate-500">
              Updates on booking requests, payments, and rental telemetry will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 transition-colors flex items-start gap-3 ${
                notif.is_read ? 'bg-transparent' : 'bg-emerald-950/20 border-l-2 border-emerald-500'
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 shrink-0 mt-0.5">
                {getIconForType(notif.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{notif.title}</h4>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {new Date(notif.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-300/90 leading-relaxed">{notif.message}</p>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => handleMarkAsRead(notif.id)}
                  title="Mark as read"
                  className="p-1 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-slate-800 transition shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

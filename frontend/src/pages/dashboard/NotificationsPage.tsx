import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockStore } from '../../services/mockStore';
import { NotificationItem } from '../../types';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Bell,
  CheckCheck,
  Calendar,
  Wallet,
  Tractor,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(mockStore.getNotifications());
  const [filterType, setFilterType] = useState<string>('all');

  const handleMarkAsRead = (id: string) => {
    mockStore.markNotificationAsRead(id);
    setNotifications([...mockStore.getNotifications()]);
  };

  const handleMarkAllRead = () => {
    mockStore.markAllNotificationsAsRead();
    setNotifications([...mockStore.getNotifications()]);
    toast.success('All notifications marked as read.');
  };

  const filtered = notifications.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'booking': return <KeyRound className="w-4 h-4 text-amber-600" />;
      case 'payment': return <Wallet className="w-4 h-4 text-purple-600" />;
      case 'rental': return <Tractor className="w-4 h-4 text-[#164B35]" />;
      default: return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
            Notifications &amp; Activity Alerts
          </h1>
          <p className="text-xs text-[#526058] mt-1">
            Real-time updates regarding booking requests, payments, and rental session alerts
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<CheckCheck className="w-4 h-4 text-[#347653]" />}
          onClick={handleMarkAllRead}
        >
          Mark All As Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E7DE] pb-2">
        {['all', 'booking', 'payment', 'rental'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
              filterType === cat
                ? 'bg-[#164B35] text-white shadow-xs'
                : 'text-[#526058] hover:bg-[#F7F8F2] border border-[#E2E7DE]'
            }`}
          >
            {cat === 'all' ? 'All Alerts' : cat}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications Found"
          description="You are completely up to date with all rentals and booking activity."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                item.read
                  ? 'bg-white border-[#E2E7DE]'
                  : 'bg-[#F0F5F2] border-[#BCD3C6] shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-[#CBD5C7]">
                  {getIcon(item.type)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#25312A]">{item.title}</h4>
                  <p className="text-xs text-[#526058] mt-0.5">{item.message}</p>
                  <span className="text-[10px] text-[#7C8C83] mt-1 block">{item.timestamp}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {item.link && (
                  <Link to={item.link}>
                    <Button variant="outline" size="sm" className="text-xs">
                      View
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                )}
                {!item.read && (
                  <button
                    onClick={() => handleMarkAsRead(item.id)}
                    className="p-1.5 text-xs text-[#347653] hover:underline"
                    title="Mark as read"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { bookingsService } from '../../services/bookings.service';
import { getAvatarUrl } from '../../lib/avatar';
import {
  LayoutDashboard,
  Search,
  KeyRound,
  Tractor,
  Inbox,
  Calendar,
  Navigation,
  Wallet,
  MessageSquare,
  Bell,
  UserCheck,
  Sprout,
  PlusCircle,
  X,
  ShieldAlert
} from 'lucide-react';

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onCloseMobile }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [activeRentalsCount, setActiveRentalsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      if (!user) {
        if (isMounted) {
          setActiveRentalsCount(0);
          setPendingRequestsCount(0);
          setUnreadNotifsCount(0);
        }
        return;
      }
      try {
        const [rentals, requests] = await Promise.all([
          bookingsService.getMyRentals().catch(() => []),
          bookingsService.getMyRequests().catch(() => []),
        ]);
        if (isMounted) {
          setActiveRentalsCount(rentals.filter((b) => b.status === 'active').length);
          setPendingRequestsCount(requests.filter((b) => b.status === 'pending').length);
        }
      } catch {
        // Keep zeros on failure
      }
    };
    loadCounts();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const navItems = [
    {
      group: t('dash.coreManagement'),
      items: [
        { label: t('dash.overview'), to: '/dashboard', icon: LayoutDashboard, exact: true },
        { label: t('dash.findEquipment'), to: '/equipment', icon: Search },
      ],
    },
    {
      group: t('dash.unifiedFarmerFlow'),
      items: [
        {
          label: t('dash.myRentals'),
          to: '/dashboard/rentals',
          icon: KeyRound,
          badge: activeRentalsCount > 0 ? `${activeRentalsCount} ${t('dash.activeBadge')}` : undefined,
          badgeColor: 'bg-blue-100 text-blue-800',
        },
        {
          label: t('dash.myEquipment'),
          to: '/dashboard/equipment',
          icon: Tractor,
        },
        {
          label: t('dash.bookingRequests'),
          to: '/dashboard/requests',
          icon: Inbox,
          badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} ${t('dash.newBadge')}` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 animate-pulse',
        },
        {
          label: t('dash.unifiedCalendar'),
          to: '/dashboard/calendar',
          icon: Calendar,
        },
        {
          label: t('dash.liveTracking'),
          to: '/dashboard/tracking',
          icon: Navigation,
          badge: activeRentalsCount > 0 ? t('dash.liveGpsBadge') : undefined,
          badgeColor: 'bg-emerald-100 text-[#164B35]',
        },
      ],
    },
    {
      group: t('dash.financeComms'),
      items: [
        { label: t('dash.earnings'), to: '/dashboard/earnings', icon: Wallet },
        { label: t('dash.messages'), to: '/dashboard/messages', icon: MessageSquare },
        {
          label: t('dash.notifications'),
          to: '/dashboard/notifications',
          icon: Bell,
          badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined,
          badgeColor: 'bg-red-100 text-red-700',
        },
        { label: t('dash.profile'), to: '/dashboard/profile', icon: UserCheck },
      ],
    },
    {
      group: t('dash.adminPortal'),
      items: [
        { label: t('dash.adminPortal'), to: '/admin', icon: ShieldAlert },
      ]
    }
  ];

  return (
    <aside className="w-72 bg-white border-r border-[#E2E7DE] flex flex-col h-full shrink-0">
      {/* Brand header */}
      <div className="p-5 border-b border-[#E2E7DE] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#164B35] flex items-center justify-center text-[#B8D96B] shadow-sm">
            <Sprout className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-lg text-[#164B35] leading-none">
              Shared Farm
            </span>
            <span className="text-[10px] text-[#526058] font-semibold mt-0.5">
              {t('dash.tagline')}
            </span>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-[#526058] hover:bg-[#EFF2EB]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Action: List Equipment */}
      <div className="p-4 border-b border-[#E2E7DE] bg-[#F7F8F2]/60">
        <Link
          to="/dashboard/equipment/new"
          onClick={onCloseMobile}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#164B35] hover:bg-[#235D40] text-white font-semibold text-xs transition-all shadow-xs group"
        >
          <PlusCircle className="w-4 h-4 text-[#B8D96B] group-hover:scale-110 transition-transform" />
          <span>{t('dash.addEquipmentBtn')}</span>
        </Link>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-[10px] font-bold text-[#7C8C83] uppercase tracking-wider">
              {group.group}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#164B35] text-white shadow-xs font-bold'
                        : 'text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          className={`w-4 h-4 ${
                            isActive ? 'text-[#B8D96B]' : 'text-[#347653]'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive ? 'bg-[#B8D96B] text-[#164B35]' : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* User profile footer in sidebar */}
      {user && (
        <div className="p-4 border-t border-[#E2E7DE] bg-[#F7F8F2]/70">
          <Link
            to="/dashboard/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-3 group"
          >
            <img
              src={getAvatarUrl(user.avatar, user.name)}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#B8D96B]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#25312A] truncate group-hover:text-[#164B35]">
                {user.name}
              </p>
              <p className="text-[11px] text-[#526058] truncate">
                {user.location?.village ? `${user.location.village}, ${user.location.district || ''}` : 'Farmer'}
              </p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
};

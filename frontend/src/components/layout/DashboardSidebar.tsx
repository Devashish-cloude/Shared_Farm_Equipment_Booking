import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
import { mockStore } from '../../services/mockStore';

interface DashboardSidebarProps {
  onCloseMobile?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ onCloseMobile }) => {
  const { user } = useAuth();

  // Dynamic counts for badges
  const pendingRequestsCount = mockStore
    .getBookings()
    .filter(b => b.ownerId === user?.id && b.status === 'pending').length;

  const activeRentalsCount = mockStore
    .getBookings()
    .filter(b => b.renterId === user?.id && b.status === 'active').length;

  const unreadNotifsCount = mockStore.getNotifications().filter(n => !n.read).length;

  const navItems = [
    {
      group: 'Core Management',
      items: [
        { label: 'Overview', to: '/dashboard', icon: LayoutDashboard, exact: true },
        { label: 'Find Equipment', to: '/equipment', icon: Search },
      ],
    },
    {
      group: 'Unified Farmer Flow',
      items: [
        {
          label: 'My Rentals (Renting)',
          to: '/dashboard/rentals',
          icon: KeyRound,
          badge: activeRentalsCount > 0 ? `${activeRentalsCount} Active` : undefined,
          badgeColor: 'bg-blue-100 text-blue-800',
        },
        {
          label: 'My Equipment (Sharing)',
          to: '/dashboard/equipment',
          icon: Tractor,
        },
        {
          label: 'Booking Requests',
          to: '/dashboard/requests',
          icon: Inbox,
          badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} New` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 animate-pulse',
        },
        {
          label: 'Unified Calendar',
          to: '/dashboard/calendar',
          icon: Calendar,
        },
        {
          label: 'Live Rental Tracking',
          to: '/dashboard/tracking',
          icon: Navigation,
          badge: activeRentalsCount > 0 ? 'Live GPS' : undefined,
          badgeColor: 'bg-emerald-100 text-[#164B35]',
        },
      ],
    },
    {
      group: 'Finance & Comms',
      items: [
        { label: 'Earnings & Payouts', to: '/dashboard/earnings', icon: Wallet },
        { label: 'Messages', to: '/dashboard/messages', icon: MessageSquare },
        {
          label: 'Notifications',
          to: '/dashboard/notifications',
          icon: Bell,
          badge: unreadNotifsCount > 0 ? `${unreadNotifsCount}` : undefined,
          badgeColor: 'bg-red-100 text-red-700',
        },
        { label: 'Profile & Farm Details', to: '/dashboard/profile', icon: UserCheck },
      ],
    },
    {
      group: 'Platform Administration',
      items: [
        { label: 'Admin Portal (Preview)', to: '/admin', icon: ShieldAlert },
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
              Unified Farmer Dashboard
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
          <span>+ Add Equipment to Share</span>
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
              src={user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-[#B8D96B]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#25312A] truncate group-hover:text-[#164B35]">
                {user.name}
              </p>
              <p className="text-[11px] text-[#526058] truncate">
                {user.location.village}, {user.location.district}
              </p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
};

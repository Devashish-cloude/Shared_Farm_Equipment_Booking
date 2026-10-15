import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  Bell,
  Search,
  PlusCircle,
  KeyRound,
  ChevronDown,
  User,
  LogOut,
  CalendarDays
} from 'lucide-react';
import { Button } from '../ui/Button';

interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E7DE] h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile hamburger & Greeting */}
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#25312A] hover:bg-[#EFF2EB]"
          aria-label="Open sidebar"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-base sm:text-xl font-bold font-heading text-[#164B35] leading-tight">
            Namaste, {user?.name?.split(' ')[0] || 'Farmer'}!
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#526058] mt-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#347653]" />
            <span>{today}</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-[#347653] font-medium">
              {user?.location.village || 'Anand'}, {user?.location.district || 'Gujarat'}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Two equally prominent quick actions as required by section 8 */}
        <div className="hidden lg:flex items-center gap-2.5">
          <Link to="/equipment">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<KeyRound className="w-3.5 h-3.5 text-[#347653]" />}
            >
              Find Equipment
            </Button>
          </Link>
          <Link to="/dashboard/equipment/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5 text-[#B8D96B]" />}
            >
              List Equipment
            </Button>
          </Link>
        </div>

        {/* Search quick button */}
        <Link
          to="/equipment"
          className="p-2.5 rounded-xl text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35] transition-colors"
          title="Search marketplace"
        >
          <Search className="w-5 h-5" />
        </Link>

        {/* Notifications */}
        <Link
          to="/dashboard/notifications"
          className="p-2.5 rounded-xl text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35] transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
        </Link>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-full border border-[#E2E7DE] hover:border-[#164B35] transition-all bg-white"
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
              alt={user?.name || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#B8D96B]"
            />
            <ChevronDown className="w-3.5 h-3.5 text-[#7C8C83] mr-1 hidden sm:inline" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#E2E7DE] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2 border-b border-[#E2E7DE]">
                <p className="text-xs font-bold text-[#25312A]">{user?.name}</p>
                <p className="text-[11px] text-[#526058]">{user?.email}</p>
              </div>
              <div className="py-1">
                <Link
                  to="/dashboard/profile"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                >
                  <User className="w-4 h-4 text-[#347653]" />
                  Profile &amp; Settings
                </Link>
                <Link
                  to="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                >
                  <Search className="w-4 h-4 text-[#347653]" />
                  Public Marketplace
                </Link>
              </div>
              <div className="pt-1 border-t border-[#E2E7DE]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

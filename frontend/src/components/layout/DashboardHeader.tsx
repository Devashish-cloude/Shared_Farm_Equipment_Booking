import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../../context/LanguageContext';
import {
  Menu,
  Bell,
  Search,
  PlusCircle,
  KeyRound,
  ChevronDown,
  User,
  LogOut,
  CalendarDays,
  Globe
} from 'lucide-react';
import { Button } from '../ui/Button';
import { getAvatarUrl } from '../../lib/avatar';

interface DashboardHeaderProps {
  onOpenMobileMenu: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const today = new Date().toLocaleDateString(
    language === 'hi' ? 'hi-IN' : language === 'gu' ? 'gu-IN' : language === 'pa' ? 'pa-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
    {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  );

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
            {t('dash.greeting')}, {user?.name?.split(' ')[0] || t('dash.farmer')}!
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-[#526058] mt-0.5">
            <CalendarDays className="w-3.5 h-3.5 text-[#347653]" />
            <span>{today}</span>
            <span className="hidden sm:inline">&bull;</span>
            <span className="hidden sm:inline text-[#347653] font-medium">
              {user?.location?.village ? `${user.location.village}, ${user.location.district || ''}` : t('dash.verifiedCommunity')}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Quick Actions, Language, & Profile */}
      <div className="flex items-center gap-3">
        {/* Two equally prominent quick actions as required by section 8 */}
        <div className="hidden lg:flex items-center gap-2.5">
          <Link to="/equipment">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<KeyRound className="w-3.5 h-3.5 text-[#347653]" />}
            >
              {t('dash.findBtn')}
            </Button>
          </Link>
          <Link to="/dashboard/equipment/new">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5 text-[#B8D96B]" />}
            >
              {t('dash.listBtn')}
            </Button>
          </Link>
        </div>

        {/* Search quick button */}
        <Link
          to="/equipment"
          className="p-2.5 rounded-xl text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35] transition-colors"
          title={t('dash.searchMarketplace')}
        >
          <Search className="w-5 h-5" />
        </Link>

        {/* Notifications */}
        <Link
          to="/dashboard/notifications"
          className="p-2.5 rounded-xl text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35] transition-colors relative"
          title={t('dash.notifications')}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
        </Link>

        {/* Language selector in dashboard */}
        <div className="relative">
          <button
            onClick={() => {
              setLangOpen(!langOpen);
              setProfileOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E7DE] hover:border-[#164B35] bg-white text-xs font-semibold text-[#25312A] transition-colors"
            title={t('dash.language')}
            aria-label="Select Language"
          >
            <Globe className="w-3.5 h-3.5 text-[#347653]" />
            <span className="hidden sm:inline">{currentLang.nativeName}</span>
            <span className="sm:hidden uppercase">{currentLang.code}</span>
            <ChevronDown className="w-3 h-3 text-[#7C8C83]" />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E2E7DE] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1 text-[10px] font-bold text-[#7C8C83] uppercase tracking-wider border-b border-[#E2E7DE]">
                {t('dash.language')}
              </div>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#F7F8F2] transition-colors ${
                    language === lang.code ? 'font-bold text-[#164B35] bg-[#F0F5F2]' : 'text-[#25312A]'
                  }`}
                >
                  <span>{lang.nativeName}</span>
                  <span className="text-[10px] text-[#7C8C83] uppercase">{lang.code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setLangOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-full border border-[#E2E7DE] hover:border-[#164B35] transition-all bg-white"
          >
            <img
              src={getAvatarUrl(user?.avatar, user?.name)}
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
                  {t('nav.profile')}
                </Link>
                <Link
                  to="/"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                >
                  <Search className="w-4 h-4 text-[#347653]" />
                  {t('nav.explore')}
                </Link>
              </div>
              <div className="pt-1 border-t border-[#E2E7DE]">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

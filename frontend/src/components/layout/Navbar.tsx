import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sprout,
  Menu,
  X,
  Globe,
  ChevronDown,
  LayoutDashboard,
  PlusCircle,
  Search,
  LogOut,
  User,
  Bell
} from 'lucide-react';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const languages = ['English', 'हिन्दी (Hindi)', 'ગુજરાતી (Gujarati)', 'ਪੰਜਾਬੀ (Punjabi)', 'मराठी (Marathi)'];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setProfileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E7DE] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Tagline */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-[#164B35] flex items-center justify-center text-[#B8D96B] shadow-sm group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-extrabold text-xl sm:text-2xl text-[#164B35] tracking-tight leading-none">
                Shared Farm
              </span>
              <span className="text-[11px] text-[#526058] font-medium tracking-wide mt-0.5">
                Share Equipment. Grow Together.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              to="/equipment"
              className={`text-sm font-semibold transition-colors hover:text-[#164B35] flex items-center gap-1.5 ${
                isActive('/equipment') ? 'text-[#164B35]' : 'text-[#526058]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Explore Equipment</span>
            </Link>

            <a
              href="/#how-it-works"
              className="text-sm font-semibold text-[#526058] hover:text-[#164B35] transition-colors"
            >
              How It Works
            </a>

            <Link
              to={isAuthenticated ? '/dashboard/equipment/new' : '/login'}
              className="text-sm font-semibold text-[#164B35] hover:text-[#347653] transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-[#347653]" />
              <span>List Equipment</span>
            </Link>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#526058] hover:text-[#164B35] px-2.5 py-1.5 rounded-lg border border-[#E2E7DE] hover:border-[#CBD5C7] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-[#347653]" />
                <span>{selectedLang.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-[#7C8C83]" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-[#E2E7DE] py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLang(lang);
                        setLangMenuOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35] font-medium transition-colors"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* User Auth Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard/notifications"
                  className="p-2 rounded-xl text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35] transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-[#E2E7DE] hover:border-[#164B35] bg-white transition-all shadow-xs"
                  >
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-[#B8D96B]"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-bold text-[#25312A] leading-tight">
                        {user.name.split(' ')[0]}
                      </span>
                      <span className="block text-[10px] text-[#526058]">Farmer Account</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#7C8C83]" />
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E2E7DE] py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-[#E2E7DE]">
                        <p className="text-xs font-bold text-[#25312A]">{user.name}</p>
                        <p className="text-[11px] text-[#526058] truncate">{user.email}</p>
                        <p className="text-[10px] text-[#347653] font-semibold mt-0.5">
                          {user.location.village}, {user.location.district}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                        >
                          <LayoutDashboard className="w-4 h-4 text-[#347653]" />
                          Unified Dashboard
                        </Link>
                        <Link
                          to="/dashboard/rentals"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                        >
                          <Search className="w-4 h-4 text-[#347653]" />
                          My Rentals (Renting)
                        </Link>
                        <Link
                          to="/dashboard/equipment"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                        >
                          <PlusCircle className="w-4 h-4 text-[#347653]" />
                          My Equipment (Sharing)
                        </Link>
                        <Link
                          to="/dashboard/profile"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#25312A] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                        >
                          <User className="w-4 h-4 text-[#347653]" />
                          Profile &amp; Farm Settings
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-[#E2E7DE]">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <Link to="/dashboard">
                  <Button variant="primary" size="sm" className="hidden lg:inline-flex">
                    Dashboard
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu hamburger button */}
          <div className="flex items-center md:hidden gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-[#25312A] hover:bg-[#EFF2EB] transition-colors"
              aria-label="Toggle navigation drawer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E2E7DE] px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2">
            <Link
              to="/equipment"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#25312A] hover:bg-[#F7F8F2] flex items-center gap-2"
            >
              <Search className="w-4 h-4 text-[#347653]" />
              Explore Equipment
            </Link>
            <a
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#25312A] hover:bg-[#F7F8F2]"
            >
              How It Works
            </a>
            <Link
              to={isAuthenticated ? '/dashboard/equipment/new' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#164B35] hover:bg-[#F0F5F2] flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-[#347653]" />
              List Equipment to Share
            </Link>
          </div>

          <div className="pt-3 border-t border-[#E2E7DE]">
            {isAuthenticated && user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2 bg-[#F7F8F2] rounded-xl">
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100'}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold text-[#25312A]">{user.name}</p>
                    <p className="text-xs text-[#526058]">{user.location.village}, {user.location.district}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Dashboard
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-rose-600 border-rose-200"
                    onClick={handleLogout}
                  >
                    Log Out
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

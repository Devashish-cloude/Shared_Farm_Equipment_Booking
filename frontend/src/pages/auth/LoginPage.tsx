import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sprout, Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const LoginPage: React.FC = () => {
  const { login, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('ramesh.patel@sharedfarm.demo');
  const [password, setPassword] = useState('demo-password-123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail('ramesh.patel@sharedfarm.demo');
    setPassword('demo-farmer');
    setIsLoading(true);
    try {
      await login('ramesh.patel@sharedfarm.demo', 'demo-farmer');
      navigate(from, { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2E7DE] shadow-medium p-8 sm:p-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#164B35] items-center justify-center text-[#B8D96B] shadow-sm mb-1">
            <Sprout className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-[#164B35]">
            Welcome Back to Shared Farm
          </h1>
          <p className="text-xs text-[#526058]">
            Sign in to your unified farmer account to manage rentals &amp; listings
          </p>
        </div>

        {/* Demo Mode Notice & 1-Click Login */}
        {isDemoMode && (
          <div className="bg-[#F0F5F2] border border-[#BCD3C6] p-3.5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#164B35]">
              <Sparkles className="w-4 h-4 text-[#347653]" />
              <span>Interactive Demo Mode Active</span>
            </div>
            <p className="text-[11px] text-[#526058] leading-tight">
              Preloaded with <strong>Ramesh Patel's</strong> sample farm account (has active rentals, listed tractors, and incoming requests).
            </p>
            <Button
              type="button"
              variant="lime"
              size="sm"
              className="w-full text-xs"
              onClick={handleQuickDemoLogin}
              isLoading={isLoading}
            >
              1-Click Instant Demo Login
            </Button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              Email or Mobile Number
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com or +91..."
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-[#25312A]">Password</label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-[#164B35] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#7C8C83] hover:text-[#25312A]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2 border-t border-[#E2E7DE]">
          <p className="text-xs text-[#526058]">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-[#164B35] hover:underline">
              Create Free Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

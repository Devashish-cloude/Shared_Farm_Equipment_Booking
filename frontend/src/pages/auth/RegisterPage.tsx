import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sprout, Lock, Mail, User, Phone, MapPin, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    village: '',
    district: '',
    state: 'Gujarat',
    password: '',
    confirmPassword: '',
    agreed: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.agreed) {
      setError('Please agree to the platform community guidelines and terms.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: {
          village: formData.village,
          district: formData.district,
          state: formData.state,
        },
        password: formData.password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E2E7DE] shadow-medium p-8 sm:p-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-[#164B35] items-center justify-center text-[#B8D96B] shadow-sm mb-1">
            <Sprout className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold font-heading text-[#164B35]">
            Create Unified Farmer Account
          </h1>
          <p className="text-xs text-[#526058] max-w-md mx-auto">
            One account to both <strong>rent equipment from neighbors</strong> and <strong>list your own machinery</strong> for extra income.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Mobile Phone *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="farmer@example.com"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
                />
              </div>
            </div>

            {/* Farm Location */}
            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Village / Town *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="e.g. Mogri"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">District &amp; State *</label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="e.g. Anand, Gujarat"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 6 chars"
                  className="w-full text-xs pl-9 pr-10 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-[#7C8C83]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Confirm Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/60 text-[#25312A]"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#526058] select-none">
              <input
                type="checkbox"
                checked={formData.agreed}
                onChange={(e) => setFormData({ ...formData, agreed: e.target.checked })}
                className="w-4 h-4 rounded text-[#164B35] focus:ring-[#164B35] mt-0.5 accent-[#164B35]"
              />
              <span>
                I agree to the peer-to-peer machinery sharing terms, safety protocols, and escrow deposit guidelines.
              </span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Farmer Account
          </Button>
        </form>

        <div className="text-center pt-2 border-t border-[#E2E7DE]">
          <p className="text-xs text-[#526058]">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-[#164B35] hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

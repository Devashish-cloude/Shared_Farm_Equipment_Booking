import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import {
  User,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Sprout,
  Globe,
  Lock,
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { setLanguage } = useLanguage();

  const [formData, setFormData] = useState({
    name: user?.name || 'Ramesh Patel',
    email: user?.email || 'ramesh.patel@sharedfarm.demo',
    phone: user?.phone || '+91 98251 34890',
    village: user?.location.village || 'Mogri',
    district: user?.location.district || 'Anand',
    state: user?.location.state || 'Gujarat',
    farmSizeAcres: user?.farmDetails?.farmSizeAcres || 18,
    primaryCrops: user?.farmDetails?.primaryCrops?.join(', ') || 'Wheat, Bt Cotton, Mustard',
    preferredLanguage: user?.preferredLanguage || 'English',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      updateUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: {
          village: formData.village,
          district: formData.district,
          state: formData.state,
        },
        farmDetails: {
          farmSizeAcres: Number(formData.farmSizeAcres),
          primaryCrops: formData.primaryCrops.split(',').map((s) => s.trim()),
        },
        preferredLanguage: formData.preferredLanguage,
      });
      setLanguage(formData.preferredLanguage);
      setIsSaving(false);
      toast.success('Profile and farm specifications updated!');
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E2E7DE]">
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
          Farmer Profile &amp; Farm Settings
        </h1>
        <p className="text-xs text-[#526058] mt-1">
          Maintain your personal contact information, farm land parcel acreage, and verification credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E7DE] shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
              alt={user?.name}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#B8D96B]"
            />
            <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#164B35] text-white">
              <ShieldCheck className="w-4 h-4 text-[#B8D96B]" />
            </span>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-extrabold font-heading text-[#25312A]">{user?.name}</h2>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#B8D96B]/30 text-[#164B35]">
                {user?.verificationStatus === 'verified' ? 'Verified Farmer' : 'Pending Verification'}
              </span>
            </div>
            <p className="text-xs text-[#526058]">
              {user?.location.village}, {user?.location.district}, {user?.location.state}
            </p>
            <p className="text-[11px] text-[#7C8C83]">
              Unified Farmer Member &bull; {user?.rating || 4.9} Rating ({user?.reviewCount || 24} reviews)
            </p>
          </div>
        </div>

        {/* Section 1: Contact Information */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E7DE] shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-base text-[#25312A] pb-2 border-b border-[#E2E7DE]">
            Personal &amp; Contact Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Preferred Language</label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              >
                <option value="English">English</option>
                <option value="Hindi">हिन्दी (Hindi)</option>
                <option value="Gujarati">ગુજરાતી (Gujarati)</option>
                <option value="Punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
                <option value="Marathi">मराठी (Marathi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Farm & Location Specs */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E7DE] shadow-sm space-y-4">
          <h3 className="font-heading font-bold text-base text-[#25312A] pb-2 border-b border-[#E2E7DE]">
            Farm Holding &amp; Location
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Village *</label>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">District *</label>
              <input
                type="text"
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">
                Total Land Holding (Acres)
              </label>
              <input
                type="number"
                value={formData.farmSizeAcres}
                onChange={(e) => setFormData({ ...formData, farmSizeAcres: Number(e.target.value) })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">
                Primary Crops Cultivated
              </label>
              <input
                type="text"
                value={formData.primaryCrops}
                onChange={(e) => setFormData({ ...formData, primaryCrops: e.target.value })}
                placeholder="e.g. Wheat, Bt Cotton, Mustard, Bajra"
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A]"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Profile Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

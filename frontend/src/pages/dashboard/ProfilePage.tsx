import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import { getAvatarUrl } from '../../lib/avatar';
import { INDIAN_STATES, getDistrictsForState } from '../../lib/indianLocations';
import { storageService } from '../../services/storage.service';
import { isSupabaseConfigured } from '../../lib/supabase';
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
  CheckCircle2,
  Camera,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { setLanguage, t } = useLanguage();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    village: user?.location?.village || '',
    district: user?.location?.district || '',
    state: user?.location?.state || 'Maharashtra',
    farmSizeAcres: user?.farmDetails?.farmSizeAcres || 0,
    primaryCrops: user?.farmDetails?.primaryCrops?.join(', ') || '',
    preferredLanguage: user?.preferredLanguage || 'English',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever the authenticated user updates
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        village: user.location?.village || '',
        district: user.location?.district || '',
        state: user.location?.state || 'Maharashtra',
        farmSizeAcres: user.farmDetails?.farmSizeAcres || 0,
        primaryCrops: user.farmDetails?.primaryCrops?.join(', ') || '',
        preferredLanguage: user.preferredLanguage || 'English',
      });
    }
  }, [user]);

  const availableDistricts = getDistrictsForState(formData.state);

  const handleStateChange = (newState: string) => {
    const districts = getDistrictsForState(newState);
    setFormData((prev) => ({
      ...prev,
      state: newState,
      district: districts.includes(prev.district) ? prev.district : districts[0] || '',
    }));
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar file size must be under 2MB.');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      if (isSupabaseConfigured() && user) {
        const uploadRes = await storageService.uploadEquipmentImage(file, user.id);
        setFormData((prev) => ({ ...prev, avatar: uploadRes.url }));
        await updateUser({ avatar: uploadRes.url });
        toast.success('Profile photo uploaded and saved!');
      } else {
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result === 'string') {
            const dataUrl = reader.result as string;
            setFormData((prev) => ({ ...prev, avatar: dataUrl }));
            await updateUser({ avatar: dataUrl });
            toast.success('Profile photo updated!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        avatar: formData.avatar || undefined,
        location: {
          village: formData.village.trim(),
          district: formData.district.trim(),
          state: formData.state.trim(),
        },
        farmDetails: {
          farmSizeAcres: Number(formData.farmSizeAcres) || undefined,
          primaryCrops: formData.primaryCrops
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
        preferredLanguage: formData.preferredLanguage,
      });
      setLanguage(formData.preferredLanguage);
      toast.success(t('profile.updateSuccess') || 'Profile and farm specifications updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="pb-4 border-b border-[#E2E7DE]">
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
          {t('dash.profile')}
        </h1>
        <p className="text-xs text-[#526058] mt-1">
          Maintain your personal contact information, farm land parcel acreage, and verification credentials
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Card Header */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E7DE] shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <img
              src={getAvatarUrl(formData.avatar || user?.avatar, formData.name || user?.name)}
              alt={user?.name || 'User'}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-[#B8D96B]"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[#164B35] text-white hover:bg-[#235D40] transition-colors shadow-md"
              title="Upload new profile photo"
              aria-label="Upload profile photo"
            >
              <Camera className="w-4 h-4 text-[#B8D96B]" />
            </button>
            <input
              type="file"
              ref={avatarInputRef}
              onChange={handleAvatarFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-xl font-extrabold font-heading text-[#25312A]">{user?.name}</h2>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#B8D96B]/30 text-[#164B35]">
                {user?.verificationStatus === 'verified' ? 'Verified Farmer' : 'Registered Member'}
              </span>
            </div>
            <p className="text-xs text-[#526058]">
              {user?.location?.village ? `${user.location.village}, ` : ''}
              {user?.location?.district ? `${user.location.district}, ` : ''}
              {user?.location?.state || ''}
            </p>
            <p className="text-[11px] text-[#7C8C83]">
              Unified Farmer Member &bull; {user?.rating || 5.0} Rating ({user?.reviewCount || 0} reviews)
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
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">{t('dash.language')}</label>
              <select
                value={formData.preferredLanguage}
                onChange={(e) => {
                  setFormData({ ...formData, preferredLanguage: e.target.value });
                  setLanguage(e.target.value);
                }}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
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
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">State *</label>
              <select
                required
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">District *</label>
              <select
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
              >
                {availableDistricts.map((dst) => (
                  <option key={dst} value={dst}>
                    {dst}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">Village / Town *</label>
              <input
                type="text"
                required
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                placeholder="e.g. Dindori, Mogri, Malerkotla"
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#25312A] mb-1.5">
                Total Land Holding (Acres)
              </label>
              <input
                type="number"
                min={0}
                value={formData.farmSizeAcres || ''}
                onChange={(e) => setFormData({ ...formData, farmSizeAcres: Number(e.target.value) })}
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
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
                placeholder="e.g. Wheat, Cotton, Soybean, Onion, Sugarcane"
                className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
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
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Equipment, EquipmentCategory, EquipmentCondition } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2, Image as ImageIcon, Sparkles, MapPin, Wrench, Upload } from 'lucide-react';
import { storageService } from '../../services/storage.service';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getEquipmentCategoryPlaceholder } from '../../lib/equipmentImages';
import { INDIAN_STATES_DISTRICTS } from '../../lib/indianLocations';
import { toast } from 'sonner';

const equipmentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  category: z.enum([
    'Tractors',
    'Harvesters',
    'Rotavators',
    'Seed Drills',
    'Sprayers',
    'Cultivators',
    'Threshers',
    'Ploughs',
  ]),
  description: z.string().min(15, 'Please provide at least 15 characters describing the machinery'),
  make: z.string().min(2, 'Manufacturer/Make is required'),
  model: z.string().min(2, 'Model name is required'),
  year: z.number().min(2000).max(new Date().getFullYear()),
  powerHp: z.number().min(5).max(500).optional(),
  condition: z.enum(['Excellent', 'Good', 'Fair']),
  pricePerHour: z.number().min(50, 'Minimum hourly rate is ₹50'),
  pricePerDay: z.number().min(300, 'Minimum daily rate is ₹300'),
  securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
  operatorAvailable: z.boolean(),
  operatorCostPerHour: z.number().min(0),
  minRentalHours: z.number().min(1).max(24),
  village: z.string().min(2, 'Village is required'),
  district: z.string().min(2, 'District is required'),
  state: z.string().min(2, 'State is required'),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

interface EquipmentFormProps {
  initialData?: Equipment | null;
  onSubmit: (data: Partial<Equipment>) => Promise<void>;
  isLoading?: boolean;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const states = Object.keys(INDIAN_STATES_DISTRICTS);

  const defaultState = initialData?.location?.state || user?.location?.state || states[0] || 'Maharashtra';
  const defaultDistrict =
    initialData?.location?.district ||
    user?.location?.district ||
    INDIAN_STATES_DISTRICTS[defaultState]?.[0] ||
    'Pune';
  const defaultVillage = initialData?.location?.village || user?.location?.village || '';

  const initialCat = (initialData?.category as EquipmentCategory) || 'Tractors';

  const [images, setImages] = useState<string[]>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : [getEquipmentCategoryPlaceholder(initialCat)]
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      title: initialData?.title || '',
      category: initialCat,
      description: initialData?.description || '',
      make: initialData?.make || '',
      model: initialData?.model || '',
      year: initialData?.year || new Date().getFullYear() - 1,
      powerHp: initialData?.powerHp || 45,
      condition: initialData?.condition || 'Excellent',
      pricePerHour: initialData?.pricePerHour || 450,
      pricePerDay: initialData?.pricePerDay || 3200,
      securityDeposit: initialData?.securityDeposit || 2000,
      operatorAvailable: initialData?.operatorAvailable ?? true,
      operatorCostPerHour: initialData?.operatorCostPerHour || 120,
      minRentalHours: initialData?.minRentalHours || 4,
      village: defaultVillage,
      district: defaultDistrict,
      state: defaultState,
    },
  });

  const watchOperator = watch('operatorAvailable');
  const watchState = watch('state');
  const watchCategory = watch('category');

  // Update default placeholder image if user changes category and hasn't uploaded custom images
  useEffect(() => {
    if ((!initialData || !initialData.images || initialData.images.length === 0) && images.length <= 1) {
      setImages([getEquipmentCategoryPlaceholder(watchCategory as EquipmentCategory)]);
    }
  }, [watchCategory]);

  const availableDistricts = INDIAN_STATES_DISTRICTS[watchState] || [];

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextState = e.target.value;
    setValue('state', nextState);
    const districts = INDIAN_STATES_DISTRICTS[nextState] || [];
    setValue('district', districts[0] || '');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setIsUploading(true);
    try {
      if (isSupabaseConfigured()) {
        const sessionRes = await supabase.auth.getSession();
        const userId = user?.id || sessionRes.data.session?.user?.id;
        if (!userId) {
          toast.error('Please sign in to upload equipment photos.');
          return;
        }
        const res = await storageService.uploadEquipmentImage(file, userId);
        setImages((prev) => [...prev.filter((img) => !img.includes('images.unsplash.com/photo-1592982537447')), res.url]);
        toast.success('Equipment photo uploaded successfully!');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setImages((prev) => [...prev.filter((img) => !img.includes('images.unsplash.com/photo-1592982537447')), reader.result as string]);
            toast.success('Photo added!');
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      toast.error(err.message || 'Image upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    if (next.length === 0) {
      setImages([getEquipmentCategoryPlaceholder(watchCategory as EquipmentCategory)]);
    } else {
      setImages(next);
    }
  };

  const handleFormSubmit = async (data: EquipmentFormData) => {
    const finalImages =
      images.length > 0 ? images : [getEquipmentCategoryPlaceholder(data.category as EquipmentCategory)];

    const payload: Partial<Equipment> = {
      title: data.title,
      category: data.category as EquipmentCategory,
      description: data.description,
      make: data.make,
      model: data.model,
      year: data.year,
      powerHp: data.powerHp,
      condition: data.condition as EquipmentCondition,
      pricePerHour: data.pricePerHour,
      pricePerDay: data.pricePerDay,
      securityDeposit: data.securityDeposit,
      operatorAvailable: data.operatorAvailable,
      operatorCostPerHour: data.operatorCostPerHour,
      minRentalHours: data.minRentalHours,
      images: finalImages,
      location: {
        village: data.village,
        district: data.district,
        state: data.state,
        approximateCoordinates: initialData?.location?.approximateCoordinates || [18.5204, 73.8567],
      },
      specifications: initialData?.specifications || {
        Engine: `${data.powerHp || 45} HP Diesel`,
        Condition: data.condition,
        Model: `${data.make} ${data.model} (${data.year})`,
      },
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Section A: Basic Info */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E7DE]">
          <span className="w-6 h-6 rounded-full bg-[#164B35] text-[#B8D96B] font-bold text-xs flex items-center justify-center">
            1
          </span>
          <h3 className="font-heading font-bold text-base text-[#25312A]">
            {t('equipForm.basicInfo')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.titleLabel')}
            </label>
            <input
              {...register('title')}
              placeholder={t('equipForm.titlePlaceholder')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.title && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.title')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.categoryLabel')}
            </label>
            <select
              {...register('category')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              <option value="Tractors">{t('cat.tractors')}</option>
              <option value="Harvesters">{t('cat.harvesters')}</option>
              <option value="Rotavators">{t('cat.rotavators')}</option>
              <option value="Seed Drills">{t('cat.seedDrills')}</option>
              <option value="Sprayers">{t('cat.sprayers')}</option>
              <option value="Cultivators">{t('cat.cultivators')}</option>
              <option value="Threshers">{t('cat.threshers')}</option>
              <option value="Ploughs">{t('cat.ploughs')}</option>
            </select>
            {errors.category && <p className="text-xs text-rose-600 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.conditionLabel')}
            </label>
            <select
              {...register('condition')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              <option value="Excellent">{t('equipForm.conditionExcellent')}</option>
              <option value="Good">{t('equipForm.conditionGood')}</option>
              <option value="Fair">{t('equipForm.conditionFair')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.makeLabel')}
            </label>
            <input
              {...register('make')}
              placeholder={t('equipForm.makePlaceholder')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.make && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.make')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.modelLabel')}
            </label>
            <input
              {...register('model')}
              placeholder={t('equipForm.modelPlaceholder')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.model && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.model')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.yearLabel')}
            </label>
            <input
              type="number"
              {...register('year', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.year && <p className="text-xs text-rose-600 mt-1">{errors.year.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.powerLabel')}
            </label>
            <input
              type="number"
              {...register('powerHp', { valueAsNumber: true })}
              placeholder={t('equipForm.powerPlaceholder')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.descLabel')}
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder={t('equipForm.descPlaceholder')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.description && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.desc')}</p>}
          </div>
        </div>
      </div>

      {/* Section B: Photos */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E7DE]">
          <span className="w-6 h-6 rounded-full bg-[#164B35] text-[#B8D96B] font-bold text-xs flex items-center justify-center">
            2
          </span>
          <h3 className="font-heading font-bold text-base text-[#25312A]">
            {t('equipForm.photosTitle')}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative group rounded-xl overflow-hidden h-28 border border-[#E2E7DE]">
              <img src={img} alt="Machinery" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isUploading}
            leftIcon={<Upload className="w-4 h-4" />}
            className="border-[#164B35] text-[#164B35] hover:bg-[#F0F5F2]"
          >
            {t('equipForm.uploadBtn')}
          </Button>

          <div className="flex-1 flex gap-2">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Or paste an image URL (e.g. https://...)"
              className="flex-1 text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            <Button type="button" variant="ghost" size="sm" onClick={addImage} leftIcon={<Plus className="w-4 h-4" />}>
              Add URL
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-[#526058]">{t('equipForm.uploadHint')}</p>
      </div>

      {/* Section C: Pricing & Driver */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E7DE]">
          <span className="w-6 h-6 rounded-full bg-[#164B35] text-[#B8D96B] font-bold text-xs flex items-center justify-center">
            3
          </span>
          <h3 className="font-heading font-bold text-base text-[#25312A]">
            {t('equipForm.pricingTitle')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.hourlyRate')}
            </label>
            <input
              type="number"
              {...register('pricePerHour', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.pricePerHour && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.hourly')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.dailyRate')}
            </label>
            <input
              type="number"
              {...register('pricePerDay', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.pricePerDay && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.daily')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.deposit')}
            </label>
            <input
              type="number"
              {...register('securityDeposit', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.minHours')}
            </label>
            <select
              {...register('minRentalHours', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              <option value="2">2 Hours</option>
              <option value="4">4 Hours (Half Day)</option>
              <option value="8">8 Hours (Full Day)</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex flex-col justify-center">
            <label className="flex items-center gap-3 cursor-pointer text-xs font-bold text-[#25312A] select-none">
              <input
                type="checkbox"
                {...register('operatorAvailable')}
                className="w-4 h-4 rounded text-[#164B35] focus:ring-[#164B35] accent-[#164B35]"
              />
              <span>{t('equipForm.operatorToggle')}</span>
            </label>
            {watchOperator && (
              <div className="mt-2 pl-7 flex items-center gap-2">
                <label className="text-xs text-[#526058]">{t('equipForm.operatorCost')}:</label>
                <input
                  type="number"
                  {...register('operatorCostPerHour', { valueAsNumber: true })}
                  className="w-24 text-xs p-1.5 rounded-lg border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section D: Location */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E7DE]">
          <span className="w-6 h-6 rounded-full bg-[#164B35] text-[#B8D96B] font-bold text-xs flex items-center justify-center">
            4
          </span>
          <h3 className="font-heading font-bold text-base text-[#25312A]">
            {t('equipForm.locationTitle')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.stateLabel')}
            </label>
            <select
              value={watchState}
              onChange={handleStateSelect}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.state && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.state')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.districtLabel')}
            </label>
            <select
              {...register('district')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              {availableDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {errors.district && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.district')}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              {t('equipForm.villageLabel')}
            </label>
            <input
              {...register('village')}
              placeholder="e.g. Dindori"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.village && <p className="text-xs text-rose-600 mt-1">{t('equipForm.validation.village')}</p>}
          </div>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={() => window.history.back()}>
          {t('common.cancel')}
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
          {initialData ? t('equipForm.submitUpdate') : t('equipForm.submitCreate')}
        </Button>
      </div>
    </form>
  );
};

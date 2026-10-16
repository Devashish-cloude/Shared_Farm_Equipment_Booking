import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Equipment, EquipmentCategory, EquipmentCondition } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Trash2, Image as ImageIcon, Sparkles, MapPin, Wrench, Upload } from 'lucide-react';
import { storageService } from '../../services/storage.service';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
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
  const [images, setImages] = useState<string[]>(
    initialData?.images && initialData.images.length > 0
      ? initialData.images
      : ['https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800&auto=format&fit=crop&q=80']
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    setIsUploading(true);
    try {
      const userId = user?.id || 'farmer_user';
      if (isSupabaseConfigured()) {
        const res = await storageService.uploadEquipmentImage(file, userId);
        setImages((prev) => [...prev, res.url]);
        toast.success('Equipment photo uploaded successfully to Supabase Storage!');
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setImages((prev) => [...prev, reader.result as string]);
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

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      title: initialData?.title || '',
      category: initialData?.category || 'Tractors',
      description: initialData?.description || '',
      make: initialData?.make || '',
      model: initialData?.model || '',
      year: initialData?.year || 2023,
      powerHp: initialData?.powerHp || 45,
      condition: initialData?.condition || 'Excellent',
      pricePerHour: initialData?.pricePerHour || 450,
      pricePerDay: initialData?.pricePerDay || 3200,
      securityDeposit: initialData?.securityDeposit || 2000,
      operatorAvailable: initialData?.operatorAvailable ?? true,
      operatorCostPerHour: initialData?.operatorCostPerHour || 120,
      minRentalHours: initialData?.minRentalHours || 4,
      village: initialData?.location.village || 'Mogri',
      district: initialData?.location.district || 'Anand',
      state: initialData?.location.state || 'Gujarat',
    },
  });

  const watchOperator = watch('operatorAvailable');

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (data: EquipmentFormData) => {
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
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=800'],
      location: {
        village: data.village,
        district: data.district,
        state: data.state,
        approximateCoordinates: initialData?.location.approximateCoordinates || [22.5645, 72.9289],
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
            Basic Information
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              Equipment Listing Title *
            </label>
            <input
              {...register('title')}
              placeholder="e.g. Mahindra 575 DI XP Plus (47 HP Tractor)"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Category *</label>
            <select
              {...register('category')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              <option value="Tractors">Tractors</option>
              <option value="Harvesters">Harvesters</option>
              <option value="Rotavators">Rotavators</option>
              <option value="Seed Drills">Seed Drills</option>
              <option value="Sprayers">Sprayers</option>
              <option value="Cultivators">Cultivators</option>
              <option value="Threshers">Threshers</option>
              <option value="Ploughs">Ploughs</option>
            </select>
            {errors.category && <p className="text-xs text-rose-600 mt-1">{errors.category.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Condition *</label>
            <select
              {...register('condition')}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              <option value="Excellent">Excellent (Like New, Fresh Servicing)</option>
              <option value="Good">Good (Working Reliably)</option>
              <option value="Fair">Fair (Operational, Minor Wear)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Manufacturer / Make *</label>
            <input
              {...register('make')}
              placeholder="e.g. John Deere, Mahindra, Shaktiman"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.make && <p className="text-xs text-rose-600 mt-1">{errors.make.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Model Name / Number *</label>
            <input
              {...register('model')}
              placeholder="e.g. 5310 GearPro 4WD"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.model && <p className="text-xs text-rose-600 mt-1">{errors.model.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Manufacturing Year *</label>
            <input
              type="number"
              {...register('year', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.year && <p className="text-xs text-rose-600 mt-1">{errors.year.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Power / Engine Rating (HP)</label>
            <input
              type="number"
              {...register('powerHp', { valueAsNumber: true })}
              placeholder="e.g. 55"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              Equipment Description &amp; Usage Guidance *
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe what tasks this machinery is best suited for, condition of tyres/blades, and any special instructions for the renting farmer..."
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.description && <p className="text-xs text-rose-600 mt-1">{errors.description.message}</p>}
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
            Machinery Photos
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
            Upload Photo (Max 5MB)
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
      </div>

      {/* Section C: Pricing & Driver */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E2E7DE]">
          <span className="w-6 h-6 rounded-full bg-[#164B35] text-[#B8D96B] font-bold text-xs flex items-center justify-center">
            3
          </span>
          <h3 className="font-heading font-bold text-base text-[#25312A]">
            Rental Rates &amp; Driver Policy
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Hourly Rate (₹) *</label>
            <input
              type="number"
              {...register('pricePerHour', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.pricePerHour && <p className="text-xs text-rose-600 mt-1">{errors.pricePerHour.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Daily Rate (₹) *</label>
            <input
              type="number"
              {...register('pricePerDay', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.pricePerDay && <p className="text-xs text-rose-600 mt-1">{errors.pricePerDay.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Refundable Deposit (₹) *</label>
            <input
              type="number"
              {...register('securityDeposit', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Minimum Rental Duration</label>
            <select
              {...register('minRentalHours', { valueAsNumber: true })}
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2] text-[#25312A]"
            >
              <option value="2">2 Hours minimum</option>
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
              <span>Can provide trained operator/driver with this equipment</span>
            </label>
            {watchOperator && (
              <div className="mt-2 pl-7 flex items-center gap-2">
                <label className="text-xs text-[#526058]">Driver fee per hour (₹):</label>
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
            Machinery Location
          </h3>
        </div>

        <p className="text-xs text-[#526058]">
          Exact location is masked on the public marketplace. Only the approximate village/district is visible to other farmers until a booking is accepted.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">Village / Town *</label>
            <input
              {...register('village')}
              placeholder="e.g. Mogri"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.village && <p className="text-xs text-rose-600 mt-1">{errors.village.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">District *</label>
            <input
              {...register('district')}
              placeholder="e.g. Anand"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.district && <p className="text-xs text-rose-600 mt-1">{errors.district.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">State *</label>
            <input
              {...register('state')}
              placeholder="e.g. Gujarat"
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
            {errors.state && <p className="text-xs text-rose-600 mt-1">{errors.state.message}</p>}
          </div>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button variant="outline" type="button" onClick={() => window.history.back()}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
          {initialData ? 'Save Listing Changes' : 'Publish Equipment Listing'}
        </Button>
      </div>
    </form>
  );
};

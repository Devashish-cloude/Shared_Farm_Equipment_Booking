import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { equipmentService } from '../../services/equipment.service';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { EquipmentForm } from '../../components/forms/EquipmentForm';
import { Equipment } from '../../types';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export const AddEquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (formData: Partial<Equipment>) => {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error('You must be signed in to list equipment.');
      }

      await equipmentService.create({
        title: formData.title || 'Untitled Equipment',
        category: formData.category || 'Tractors',
        description: formData.description || '',
        make: formData.make || '',
        model: formData.model || '',
        year: formData.year || new Date().getFullYear(),
        powerHp: formData.powerHp,
        specifications: formData.specifications || {},
        condition: formData.condition || 'Good',
        pricePerHour: formData.pricePerHour || 400,
        pricePerDay: formData.pricePerDay || 3000,
        securityDeposit: formData.securityDeposit || 0,
        operatorAvailable: formData.operatorAvailable || false,
        operatorCostPerHour: formData.operatorCostPerHour || 0,
        minRentalHours: formData.minRentalHours || 1,
        images: formData.images || [],
        location: formData.location || {
          village: user.location?.village || '',
          district: user.location?.district || '',
          state: user.location?.state || '',
          approximateCoordinates: [20.5937, 78.9629],
        },
        ownerId: user.id,
        ownerName: user.name,
        ownerAvatar: user.avatar,
        ownerRating: user.rating || 5.0,
        ownerVerified: user.verificationStatus === 'verified',
        ownerPhone: user.phone,
        status: 'available',
      });

      toast.success('Equipment published successfully to the marketplace!');
      navigate('/dashboard/equipment');
    } catch (err: any) {
      toast.error(err.message || 'Failed to list equipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#164B35] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('equip.title')}</span>
        </button>
      </div>

      <div className="pb-3 border-b border-[#E2E7DE]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full bg-[#B8D96B]/30 text-[#164B35]">
            {t('equip.newListing')}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading mt-1">
          {t('equip.addTitle')}
        </h1>
        <p className="text-xs text-[#526058]">
          {t('equip.addSubtitle')}
        </p>
      </div>

      <EquipmentForm onSubmit={handleCreate} isLoading={isSubmitting} />
    </div>
  );
};

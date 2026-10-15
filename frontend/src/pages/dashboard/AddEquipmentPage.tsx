import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { equipmentService } from '../../services/equipment.service';
import { useAuth } from '../../context/AuthContext';
import { EquipmentForm } from '../../components/forms/EquipmentForm';
import { Equipment } from '../../types';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const AddEquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (formData: Partial<Equipment>) => {
    setIsSubmitting(true);
    try {
      await equipmentService.create({
        title: formData.title || 'Untitled Equipment',
        category: formData.category || 'Tractors',
        description: formData.description || '',
        make: formData.make || '',
        model: formData.model || '',
        year: formData.year || 2023,
        powerHp: formData.powerHp,
        specifications: formData.specifications || {},
        condition: formData.condition || 'Excellent',
        pricePerHour: formData.pricePerHour || 400,
        pricePerDay: formData.pricePerDay || 3000,
        securityDeposit: formData.securityDeposit || 2000,
        operatorAvailable: formData.operatorAvailable || false,
        operatorCostPerHour: formData.operatorCostPerHour || 0,
        minRentalHours: formData.minRentalHours || 4,
        images: formData.images || [],
        location: formData.location || {
          village: user?.location.village || 'Mogri',
          district: user?.location.district || 'Anand',
          state: user?.location.state || 'Gujarat',
          approximateCoordinates: [22.5645, 72.9289],
        },
        ownerId: user?.id || 'usr-ramesh-01',
        ownerName: user?.name || 'Ramesh Patel',
        ownerAvatar: user?.avatar,
        ownerRating: user?.rating || 4.9,
        ownerVerified: true,
        ownerPhone: user?.phone,
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
          <span>Back to My Equipment</span>
        </button>
      </div>

      <div className="pb-3 border-b border-[#E2E7DE]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full bg-[#B8D96B]/30 text-[#164B35]">
            New Listing
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading mt-1">
          Add Equipment to Share
        </h1>
        <p className="text-xs text-[#526058]">
          Fill in accurate technical details and clear photos to start receiving booking requests from neighboring farmers.
        </p>
      </div>

      <EquipmentForm onSubmit={handleCreate} isLoading={isSubmitting} />
    </div>
  );
};

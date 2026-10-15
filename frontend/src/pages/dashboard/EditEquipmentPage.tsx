import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { equipmentService } from '../../services/equipment.service';
import { EquipmentForm } from '../../components/forms/EquipmentForm';
import { Equipment } from '../../types';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export const EditEquipmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadItem = async () => {
      if (!id) return;
      try {
        const item = await equipmentService.getById(id);
        setEquipment(item);
      } catch {
        toast.error('Failed to load equipment');
      } finally {
        setIsLoading(false);
      }
    };
    loadItem();
  }, [id]);

  const handleUpdate = async (formData: Partial<Equipment>) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await equipmentService.update(id, formData);
      toast.success('Listing updated successfully!');
      navigate('/dashboard/equipment');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update equipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-[#526058]">
        <div className="w-8 h-8 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs">Loading equipment listing...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <h2 className="text-xl font-bold text-[#164B35]">Listing Not Found</h2>
      </div>
    );
  }

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
        <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
          Edit Equipment Listing
        </h1>
        <p className="text-xs text-[#526058]">
          Update rates, specifications, driver availability, or photos for {equipment.title}
        </p>
      </div>

      <EquipmentForm
        initialData={equipment}
        onSubmit={handleUpdate}
        isLoading={isSubmitting}
      />
    </div>
  );
};

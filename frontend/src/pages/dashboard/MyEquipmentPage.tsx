import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { equipmentService } from '../../services/equipment.service';
import { Equipment } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RatingDisplay } from '../../components/ui/RatingDisplay';
import { PriceDisplay } from '../../components/ui/PriceDisplay';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useLanguage } from '../../context/LanguageContext';
import {
  Tractor,
  PlusCircle,
  Edit3,
  PauseCircle,
  PlayCircle,
  Trash2,
  LayoutGrid,
  List,
  Search,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const MyEquipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchMyEquipment = async () => {
    setIsLoading(true);
    try {
      const data = await equipmentService.getMyEquipment();
      setEquipmentList(data);
    } catch {
      toast.error('Failed to load your equipment listings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEquipment();
  }, []);

  const handleToggleStatus = async (eq: Equipment) => {
    const nextStatus = eq.status === 'paused' ? 'available' : 'paused';
    try {
      await equipmentService.toggleStatus(eq.id, nextStatus);
      toast.success(`Listing ${nextStatus === 'paused' ? 'paused' : 'reactivated'}`);
      fetchMyEquipment();
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await equipmentService.delete(deleteTargetId);
      toast.success('Equipment listing removed');
      setDeleteTargetId(null);
      fetchMyEquipment();
    } catch (err: any) {
      toast.error(err.message || 'Cannot delete listing');
    }
  };

  const filtered = equipmentList.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
            {t('equip.title')}
          </h1>
          <p className="text-xs text-[#526058] mt-1">
            {t('equip.subtitle')}
          </p>
        </div>

        <Link to="/dashboard/equipment/new">
          <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4 text-[#B8D96B]" />}>
            {t('equip.addBtn')}
          </Button>
        </Link>
      </div>

      {/* Search and view toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E2E7DE]">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#7C8C83] absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`${t('common.search')}...`}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#CBD5C7] bg-[#F7F8F2] text-[#25312A] focus:outline-none focus:ring-2 focus:ring-[#164B35]"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center bg-[#F7F8F2] p-1 rounded-xl border border-[#E2E7DE]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#164B35] shadow-xs' : 'text-[#526058]'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'table' ? 'bg-white text-[#164B35] shadow-xs' : 'text-[#526058]'
              }`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-[#526058]">
          <div className="w-7 h-7 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">{t('common.loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title={t('equip.noEquipment')}
          description={t('equip.noEquipmentDesc')}
          actionText={t('equip.addBtn')}
          onAction={() => navigate('/dashboard/equipment/new')}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((eq) => (
            <div
              key={eq.id}
              className="bg-white rounded-2xl border border-[#E2E7DE] hover:border-[#CBD5C7] overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="h-44 relative bg-[#F0F5F2] overflow-hidden">
                  <img src={eq.images[0]} alt={eq.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3">
                    <StatusBadge status={eq.status} />
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-bold text-[#347653] uppercase tracking-wider">
                    {eq.category} &bull; {eq.make}
                  </span>
                  <h3 className="font-heading font-bold text-base text-[#25312A] line-clamp-1">
                    {eq.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs text-[#526058] pt-1">
                    <PriceDisplay pricePerHour={eq.pricePerHour} pricePerDay={eq.pricePerDay} size="sm" />
                    <span>{eq.completedRentalsCount} Bookings</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[#E2E7DE] flex items-center justify-between gap-2">
                <Link to={`/dashboard/equipment/${eq.id}/edit`}>
                  <Button variant="outline" size="sm" leftIcon={<Edit3 className="w-3.5 h-3.5" />}>
                    Edit
                  </Button>
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleStatus(eq)}
                    className="p-2 rounded-xl text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35]"
                    title={eq.status === 'paused' ? 'Reactivate Listing' : 'Pause Listing'}
                  >
                    {eq.status === 'paused' ? (
                      <PlayCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <PauseCircle className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => setDeleteTargetId(eq.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
                    title="Delete listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-[#E2E7DE] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F8F2] border-b border-[#E2E7DE] text-[#7C8C83] uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-4">Equipment</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Rate (₹)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Bookings</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7DE]">
                {filtered.map((eq) => (
                  <tr key={eq.id} className="hover:bg-[#F7F8F2]/50 transition-colors">
                    <td className="p-4 font-bold text-[#25312A] flex items-center gap-3">
                      <img src={eq.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      <span>{eq.title}</span>
                    </td>
                    <td className="p-4 text-[#526058]">{eq.category}</td>
                    <td className="p-4 font-bold text-[#164B35]">₹{eq.pricePerHour}/hr</td>
                    <td className="p-4">
                      <StatusBadge status={eq.status} showIcon={false} className="text-[10px] py-0.5" />
                    </td>
                    <td className="p-4 text-[#526058]">{eq.completedRentalsCount} completed</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/dashboard/equipment/${eq.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(eq)}
                          className="p-1.5 rounded-lg text-[#526058] hover:bg-[#F7F8F2]"
                        >
                          {eq.status === 'paused' ? 'Activate' : 'Pause'}
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(eq.id)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete / Deactivate Safety Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title="Deactivate &amp; Remove Equipment Listing?"
        description="Are you sure you want to remove this listing? Note: The platform prevents deactivation if there are active or confirmed bookings currently underway."
        confirmText="Remove Listing"
        variant="danger"
      />
    </div>
  );
};

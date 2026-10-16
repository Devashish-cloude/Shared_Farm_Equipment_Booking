import React, { useState, useEffect } from 'react';
import { bookingsService } from '../../services/bookings.service';
import { Booking, BookingStatus } from '../../types';
import { BookingCard } from '../../components/booking/BookingCard';
import { ReviewModal } from '../../components/booking/ReviewModal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../context/LanguageContext';
import { KeyRound, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type TabKey = 'all' | 'active' | 'upcoming' | 'completed' | 'cancelled';

export const MyRentalsPage: React.FC = () => {
  const { t } = useLanguage();
  const [rentals, setRentals] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Review Modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);

  // Cancel dialog state
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchRentals = async () => {
    setIsLoading(true);
    try {
      const data = await bookingsService.getMyRentals();
      setRentals(data);
    } catch {
      toast.error('Failed to load rentals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, []);

  const handleStartRental = async (id: string) => {
    try {
      await bookingsService.startRental(id);
      toast.success(t('rentals.startSuccess'));
      fetchRentals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start rental');
    }
  };

  const handleEndRental = async (id: string) => {
    try {
      await bookingsService.endRental(id);
      toast.success(t('rentals.endSuccess'));
      fetchRentals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete rental');
    }
  };

  const handleConfirmCancel = async (reason?: string) => {
    if (!cancelBookingId) return;
    setIsCancelling(true);
    try {
      await bookingsService.cancelBooking(cancelBookingId, reason || 'Cancelled by renter');
      toast.success(t('rentals.cancelSuccess'));
      setCancelBookingId(null);
      fetchRentals();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredRentals = rentals.filter((b) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return b.status === 'active';
    if (activeTab === 'upcoming') return b.status === 'accepted' || b.status === 'pending';
    if (activeTab === 'completed') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  const tabCounts = {
    all: rentals.length,
    active: rentals.filter((b) => b.status === 'active').length,
    upcoming: rentals.filter((b) => b.status === 'accepted' || b.status === 'pending').length,
    completed: rentals.filter((b) => b.status === 'completed').length,
    cancelled: rentals.filter((b) => b.status === 'cancelled' || b.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
            {t('rentals.title')}
          </h1>
          <p className="text-xs text-[#526058] mt-1">
            {t('rentals.subtitle')}
          </p>
        </div>
        <Link to="/equipment">
          <Button variant="primary" size="sm" leftIcon={<Search className="w-4 h-4" />}>
            {t('rentals.findMore')}
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E2E7DE]">
        {[
          { key: 'all', label: t('rentals.allRentals') },
          { key: 'active', label: t('rentals.activeTab') },
          { key: 'upcoming', label: t('rentals.upcomingTab') },
          { key: 'completed', label: t('rentals.completedTab') },
          { key: 'cancelled', label: t('rentals.cancelledTab') },
        ].map((tab) => {
          const count = tabCounts[tab.key as TabKey];
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-[#164B35] text-white shadow-xs'
                  : 'bg-white text-[#526058] hover:bg-[#F7F8F2] hover:text-[#164B35] border border-[#E2E7DE]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-[#B8D96B] text-[#164B35]' : 'bg-[#F0F5F2] text-[#526058]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content list */}
      {isLoading ? (
        <div className="text-center py-12 text-[#526058]">
          <div className="w-7 h-7 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs">Loading rental bookings...</p>
        </div>
      ) : filteredRentals.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No Rentals In This Tab"
          description="You don't have any bookings matching this status. Explore our marketplace to book equipment near your farm."
          actionText="Explore Marketplace"
          onAction={() => (window.location.href = '/equipment')}
        />
      ) : (
        <div className="space-y-4">
          {filteredRentals.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isOwnerView={false}
              onStartRental={handleStartRental}
              onEndRental={handleEndRental}
              onCancelBooking={(id) => setCancelBookingId(id)}
              onReview={(bk) => setReviewBooking(bk)}
            />
          ))}
        </div>
      )}

      {/* Review Modal */}
      <ReviewModal
        isOpen={!!reviewBooking}
        booking={reviewBooking}
        onClose={() => setReviewBooking(null)}
        onSubmitted={fetchRentals}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!cancelBookingId}
        onClose={() => setCancelBookingId(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel This Equipment Booking?"
        description="Are you sure you want to cancel this booking? If cancelled ahead of time, your full escrow deposit will be refunded."
        confirmText="Confirm Cancellation"
        variant="danger"
        withReasonInput
        reasonPlaceholder="e.g. Field wet due to heavy rain / crop delayed"
        isLoading={isCancelling}
      />
    </div>
  );
};

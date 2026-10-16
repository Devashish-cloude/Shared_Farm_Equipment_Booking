import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookings.service';
import { useLanguage } from '../../context/LanguageContext';
import { Booking } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import { resolveEquipmentImage } from '../../lib/equipmentImages';
import {
  ShieldCheck,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';

export const BookingSummaryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBooking = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const item = await bookingsService.getById(id);
        setBooking(item);
      } catch (err) {
        toast.error(t('summary.notFound', 'Booking not found'));
      } finally {
        setIsLoading(false);
      }
    };
    loadBooking();
  }, [id, t]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-[#164B35] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#526058]">
          {t('summary.loading', 'Loading booking summary...')}
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#164B35]">
          {t('summary.notFound', 'Booking Not Found')}
        </h2>
        <Link to="/equipment">
          <Button variant="primary">{t('summary.browseBtn', 'Browse Equipment')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-[#164B35] hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('summary.back', 'Back')}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <span className="text-xs font-bold text-[#347653] uppercase tracking-wider">
            {t('summary.order', 'Booking Order #')}{booking.id}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#164B35] font-heading mt-0.5">
            {t('summary.title', 'Rental Summary & Checkout')}
          </h1>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Equipment & Rental Details */}
        <div className="md:col-span-7 space-y-6">
          {/* Equipment card */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm flex items-center gap-4">
            <img
              src={resolveEquipmentImage(null, booking.equipmentImage, booking.equipmentCategory)}
              alt={booking.equipmentName}
              className="w-20 h-20 rounded-xl object-cover border border-[#E2E7DE] shrink-0"
            />
            <div>
              <span className="text-[10px] font-bold text-[#347653] uppercase tracking-wider">
                {booking.equipmentCategory}
              </span>
              <h3 className="text-base font-bold text-[#25312A] font-heading">
                {booking.equipmentName}
              </h3>
              <p className="text-xs text-[#526058] mt-1">
                {t('summary.owner', 'Owner')}: <strong>{booking.ownerName}</strong> ({booking.ownerPhone})
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E7DE] shadow-sm space-y-3">
            <h4 className="font-heading font-bold text-sm text-[#25312A]">
              {t('summary.schedule', 'Rental Schedule')}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE]">
                <span className="text-[#7C8C83] block text-[10px] uppercase font-bold">
                  {t('summary.startTime', 'Start Time')}
                </span>
                <span className="font-semibold text-[#25312A] mt-1 block">
                  {formatDate(booking.startDate)} &bull; 08:00 AM
                </span>
              </div>
              <div className="p-3 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE]">
                <span className="text-[#7C8C83] block text-[10px] uppercase font-bold">
                  {t('summary.duration', 'Duration')}
                </span>
                <span className="font-semibold text-[#25312A] mt-1 block">
                  {booking.durationHours} {t('summary.hoursSession', 'Hours Session')}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#526058] pt-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#347653]" />
              <span>
                {booking.withOperator
                  ? t('summary.withDriver', 'Includes trained machinery operator / driver')
                  : t('summary.selfOperated', 'Self-operated by renting farmer')}
              </span>
            </div>
          </div>

          {/* Cancellation & Escrow Policy */}
          <div className="bg-[#F0F5F2] p-5 rounded-2xl border border-[#BCD3C6] space-y-2 text-xs text-[#526058]">
            <h4 className="font-heading font-bold text-xs uppercase text-[#164B35]">
              {t('summary.policyTitle', 'Escrow & Cancellation Policy')}
            </h4>
            <p className="leading-relaxed">
              &bull; {t('summary.policy1', 'Free cancellation up to 12 hours prior to scheduled start time with full deposit refund.')}
            </p>
            <p className="leading-relaxed">
              &bull; {t('summary.policy2', 'Security deposit is held in protected escrow and unlocked automatically upon clean equipment handover.')}
            </p>
          </div>
        </div>

        {/* Right Column: Transparent Cost Breakdown */}
        <div className="md:col-span-5 bg-white p-6 rounded-3xl border-2 border-[#164B35]/20 shadow-xl space-y-5">
          <h3 className="font-heading font-bold text-base text-[#25312A] pb-3 border-b border-[#E2E7DE]">
            {t('summary.breakdownTitle', 'Transparent Price Breakdown')}
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[#526058]">
              <span>{t('summary.baseMachineryRent', 'Base Machinery Rent')} ({booking.durationHours} hrs):</span>
              <span className="font-semibold text-[#25312A]">{formatCurrency(booking.basePrice)}</span>
            </div>

            {booking.withOperator && (
              <div className="flex justify-between text-[#526058]">
                <span>{t('summary.trainedDriverFee', 'Trained Driver Fee')}:</span>
                <span className="font-semibold text-[#25312A]">{formatCurrency(booking.operatorPrice)}</span>
              </div>
            )}

            <div className="flex justify-between text-[#526058]">
              <span>{t('summary.platformEscrowFee', 'Platform Escrow Fee')}:</span>
              <span className="font-semibold text-[#25312A]">{formatCurrency(booking.platformFee)}</span>
            </div>

            <div className="flex justify-between text-[#526058]">
              <span>{t('summary.refundableDeposit', 'Refundable Security Deposit')}:</span>
              <span className="font-semibold text-[#25312A]">{formatCurrency(booking.securityDeposit)}</span>
            </div>

            <div className="pt-3 border-t border-[#E2E7DE] flex justify-between text-base font-extrabold text-[#164B35]">
              <span>{t('summary.totalPayable', 'Total Payable:')}</span>
              <span>{formatCurrency(booking.totalPrice)}</span>
            </div>
          </div>

          <div className="pt-3">
            {booking.paymentStatus === 'paid' ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <span className="text-xs font-bold text-emerald-800 block">
                  {t('summary.paymentConfirmed', 'Payment Confirmed')}
                </span>
                <p className="text-[11px] text-emerald-700">
                  {t('summary.paidActive', 'This booking is paid and active.')}
                </p>
                <Link to="/dashboard/rentals">
                  <Button variant="primary" size="sm" className="mt-2 w-full">
                    {t('summary.myRentalsBtn', 'Go to My Rentals')}
                  </Button>
                </Link>
              </div>
            ) : (
              <Link to={`/booking/${booking.id}/payment`}>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {t('summary.proceedPayment', 'Proceed to Secure Payment')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

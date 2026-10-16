import React from 'react';
import { Link } from 'react-router-dom';
import { Booking } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { BookingTimeline } from './BookingTimeline';
import { Button } from '../ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import {
  Calendar,
  Clock,
  Navigation,
  User,
  Phone,
  CheckCircle,
  Play,
  Star,
  FileText
} from 'lucide-react';

interface BookingCardProps {
  booking: Booking;
  isOwnerView?: boolean; // true if this is equipment owned by current user
  onStartRental?: (id: string) => void;
  onEndRental?: (id: string) => void;
  onCancelBooking?: (id: string) => void;
  onReview?: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isOwnerView = false,
  onStartRental,
  onEndRental,
  onCancelBooking,
  onReview,
}) => {
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E7DE] hover:border-[#CBD5C7] p-5 shadow-sm space-y-4">
      {/* Top row: Status and ID */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#E2E7DE]">
        <div className="flex items-center gap-2">
          <StatusBadge status={booking.status} />
          <span className="text-xs text-[#7C8C83] font-mono">#{booking.id}</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-[#164B35]">
            Total: {formatCurrency(booking.totalPrice)}
          </span>
          <span className="block text-[10px] text-[#7C8C83]">
            {booking.paymentStatus === 'paid' ? 'Paid via ' + (booking.paymentMethod?.toUpperCase() || 'UPI') : 'Payment Pending'}
          </span>
        </div>
      </div>

      {/* Main details grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        {/* Machine info */}
        <div className="md:col-span-2 flex items-center gap-3">
          <img
            src={booking.equipmentImage || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=200'}
            alt={booking.equipmentName}
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E2E7DE]"
          />
          <div>
            <span className="text-[10px] font-bold text-[#347653] uppercase tracking-wider">
              {booking.equipmentCategory}
            </span>
            <Link to={`/equipment/${booking.equipmentId}`}>
              <h4 className="text-sm font-bold text-[#25312A] hover:text-[#164B35] font-heading line-clamp-1">
                {booking.equipmentName}
              </h4>
            </Link>
            <div className="flex items-center gap-2 text-xs text-[#526058] mt-1">
              <User className="w-3.5 h-3.5 text-[#347653]" />
              <span>
                {isOwnerView ? `Rented to: ${booking.renterName}` : `Owner: ${booking.ownerName}`}
              </span>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-1 text-xs text-[#526058]">
          <div className="flex items-center gap-1.5 font-medium text-[#25312A]">
            <Calendar className="w-3.5 h-3.5 text-[#347653]" />
            <span>{formatDate(start)} – {formatDate(end)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#7C8C83]">
            <Clock className="w-3.5 h-3.5" />
            <span>{booking.durationHours} Hours duration</span>
          </div>
          {booking.withOperator && (
            <span className="inline-block text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              Driver Included
            </span>
          )}
        </div>

        {/* Contact info */}
        <div className="text-xs text-[#526058] space-y-1">
          <div className="flex items-center gap-1.5 text-[#25312A] font-medium">
            <Phone className="w-3.5 h-3.5 text-[#347653]" />
            <span>{isOwnerView ? booking.renterPhone : booking.ownerPhone}</span>
          </div>
          <p className="text-[11px] text-[#7C8C83]">
            {isOwnerView ? booking.renterVillage : 'Village location confirmed'}
          </p>
        </div>
      </div>

      {/* Progress Timeline */}
      <div className="pt-2">
        <BookingTimeline status={booking.status} />
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-[#E2E7DE] flex flex-wrap items-center justify-between gap-3">
        <Link to={`/booking/${booking.id}`}>
          <Button variant="ghost" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
            Booking Summary
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {booking.status === 'active' && (
            <>
              <Link to={`/dashboard/tracking/${booking.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Navigation className="w-3.5 h-3.5 animate-pulse" />}
                >
                  Live GPS Tracking
                </Button>
              </Link>
              {onEndRental && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEndRental(booking.id)}
                  leftIcon={<CheckCircle className="w-3.5 h-3.5 text-[#347653]" />}
                >
                  Complete Rental
                </Button>
              )}
            </>
          )}

          {booking.status === 'accepted' && onStartRental && (
            <Button
              variant="lime"
              size="sm"
              onClick={() => onStartRental(booking.id)}
              leftIcon={<Play className="w-3.5 h-3.5" />}
            >
              Start Rental Session
            </Button>
          )}

          {booking.status === 'completed' && onReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReview(booking)}
              leftIcon={<Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
            >
              Write Review
            </Button>
          )}

          {(booking.status === 'pending' || booking.status === 'accepted') && onCancelBooking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancelBooking(booking.id)}
              className="text-rose-600 hover:bg-rose-50"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

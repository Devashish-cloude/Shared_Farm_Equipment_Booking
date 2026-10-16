import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { bookingsService } from '../../services/bookings.service';
import { Booking } from '../../types';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatDate } from '../../lib/utils';
import { resolveEquipmentImage } from '../../lib/equipmentImages';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Navigation,
  FileText,
  ArrowRight,
  ShieldCheck,
  Tractor
} from 'lucide-react';

export const BookingConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const transactionId = (location.state as any)?.transactionId || `SF-PAY-DEMO-${Date.now()}`;

  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (id) {
      bookingsService.getById(id).then(setBooking);
    }
  }, [id]);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-medium p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#B8D96B]/30 text-[#164B35]">
            Booking Confirmed &bull; Escrow Secured
          </span>
          <h1 className="text-2xl font-extrabold font-heading text-[#164B35] pt-2">
            Equipment Reserved Successfully!
          </h1>
          <p className="text-xs text-[#526058]">
            Transaction Ref: <code className="font-mono font-bold text-[#25312A]">{transactionId}</code>
          </p>
        </div>

        {booking && (
          <div className="p-4 bg-[#F7F8F2] rounded-2xl border border-[#E2E7DE] text-left space-y-3">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E2E7DE]">
              <img
                src={resolveEquipmentImage(null, booking.equipmentImage, booking.equipmentCategory)}
                alt={booking.equipmentName}
                className="w-12 h-12 rounded-xl object-cover border border-[#E2E7DE]"
              />
              <div>
                <h4 className="text-xs font-bold text-[#25312A] font-heading">{booking.equipmentName}</h4>
                <p className="text-[11px] text-[#526058]">Owner: {booking.ownerName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[#7C8C83] uppercase block">Scheduled Date</span>
                <span className="font-semibold text-[#25312A]">{formatDate(booking.startDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7C8C83] uppercase block">Duration</span>
                <span className="font-semibold text-[#25312A]">{booking.durationHours} Hours</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7C8C83] uppercase block">Total Paid</span>
                <span className="font-semibold text-[#164B35]">{formatCurrency(booking.totalPrice)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#7C8C83] uppercase block">Operator Status</span>
                <span className="font-semibold text-[#25312A]">
                  {booking.withOperator ? 'Driver Included' : 'Self-Operated'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-[#F0F5F2] rounded-xl border border-[#BCD3C6] text-xs text-[#526058] flex items-center gap-2 text-left">
          <ShieldCheck className="w-5 h-5 text-[#347653] shrink-0" />
          <span>
            The machinery owner has been notified. You can track progress or message the owner inside your Unified Dashboard.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link to="/dashboard/rentals">
            <Button variant="primary" size="md" className="w-full">
              View In My Rentals
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="md" className="w-full">
              Farmer Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

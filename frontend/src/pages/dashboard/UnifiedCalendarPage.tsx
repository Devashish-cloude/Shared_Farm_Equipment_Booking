import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockStore } from '../../services/mockStore';
import { Booking } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Tractor,
  Clock,
  X,
  Info
} from 'lucide-react';

export const UnifiedCalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Booking | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'renting' | 'sharing'>('all');

  const allBookings = mockStore.getBookings();

  // Distinct events:
  // 1. I am renting (renterId === user.id) -> Blue/Emerald badge
  // 2. Someone renting my equipment (ownerId === user.id) -> Purple/Amber badge
  const events = allBookings.filter((b) => {
    if (filterType === 'renting') return b.renterId === user?.id;
    if (filterType === 'sharing') return b.ownerId === user?.id;
    return b.renterId === user?.id || b.ownerId === user?.id;
  });

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const monthName = currentMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Month grid calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanksArray = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const getEventsForDay = (day: number) => {
    return events.filter((ev) => {
      const d = new Date(ev.startDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E7DE]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#164B35] font-heading">
            Unified Machinery Schedule
          </h1>
          <p className="text-xs text-[#526058] mt-1">
            Single calendar showing both your equipment rentals and incoming bookings received
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 bg-[#F7F8F2] p-1 rounded-xl border border-[#E2E7DE]">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'all' ? 'bg-white text-[#164B35] shadow-xs' : 'text-[#526058]'
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setFilterType('renting')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'renting' ? 'bg-blue-600 text-white shadow-xs' : 'text-[#526058]'
            }`}
          >
            I am Renting
          </button>
          <button
            onClick={() => setFilterType('sharing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'sharing' ? 'bg-[#164B35] text-white shadow-xs' : 'text-[#526058]'
            }`}
          >
            My Equipment Booked
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-white p-4 rounded-2xl border border-[#E2E7DE]">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
          <span className="font-semibold text-[#25312A]">My Rental (I rented from a neighbor)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-[#164B35]" />
          <span className="font-semibold text-[#25312A]">Booking Received (Someone renting my machinery)</span>
        </div>
      </div>

      {/* Calendar Card */}
      <div className="bg-white rounded-3xl border border-[#E2E7DE] shadow-sm overflow-hidden p-6 space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-[#164B35] flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#347653]" />
            <span>{monthName}</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl text-[#526058] hover:bg-[#F7F8F2] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonthDate(new Date())}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#F7F8F2] hover:bg-[#EFF2EB]"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl text-[#526058] hover:bg-[#F7F8F2] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#7C8C83] uppercase pb-2 border-b border-[#E2E7DE]">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {blanksArray.map((_, idx) => (
            <div key={`blank-${idx}`} className="h-28 rounded-xl bg-[#F7F8F2]/40" />
          ))}

          {daysArray.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday =
              new Date().getDate() === day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <div
                key={day}
                className={`h-28 p-2 rounded-xl border transition-all flex flex-col justify-between overflow-hidden ${
                  isToday
                    ? 'border-[#164B35] bg-[#F0F5F2]'
                    : 'border-[#E2E7DE] bg-white hover:border-[#CBD5C7]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-[#164B35] text-white flex items-center justify-center'
                        : 'text-[#25312A]'
                    }`}
                  >
                    {day}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto">
                  {dayEvents.map((ev) => {
                    const isMyRental = ev.renterId === user?.id;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left px-1.5 py-1 rounded-md text-[10px] font-bold truncate block transition-transform hover:scale-[1.02] ${
                          isMyRental
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#164B35] text-[#B8D96B]'
                        }`}
                        title={`${ev.equipmentName} (${ev.durationHours} hrs)`}
                      >
                        {isMyRental ? '🚜 Renting: ' : '📥 Booked: '}
                        {ev.equipmentName.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E2E7DE] relative space-y-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#526058] hover:bg-[#EFF2EB]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  selectedEvent.renterId === user?.id
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-[#164B35]'
                }`}
              >
                {selectedEvent.renterId === user?.id ? 'I am Renting' : 'My Equipment Booked'}
              </span>
              <StatusBadge status={selectedEvent.status} showIcon={false} />
            </div>

            <h3 className="font-heading font-bold text-lg text-[#25312A]">
              {selectedEvent.equipmentName}
            </h3>

            <div className="p-3 bg-[#F7F8F2] rounded-xl text-xs space-y-2 border border-[#E2E7DE]">
              <div className="flex justify-between">
                <span className="text-[#7C8C83]">Scheduled Start:</span>
                <span className="font-bold text-[#25312A]">{formatDate(selectedEvent.startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8C83]">Duration:</span>
                <span className="font-bold text-[#25312A]">{selectedEvent.durationHours} Hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7C8C83]">Partner:</span>
                <span className="font-bold text-[#25312A]">
                  {selectedEvent.renterId === user?.id
                    ? `Owner: ${selectedEvent.ownerName}`
                    : `Renter: ${selectedEvent.renterName}`}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#E2E7DE]">
                <span className="text-[#7C8C83]">Total Amount:</span>
                <span className="font-extrabold text-[#164B35]">{formatCurrency(selectedEvent.totalPrice)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

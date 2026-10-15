import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mockStore } from '../../services/mockStore';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  KeyRound,
  Tractor,
  Inbox,
  Wallet,
  Search,
  PlusCircle,
  Navigation,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const DashboardOverviewPage: React.FC = () => {
  const { user } = useAuth();

  // Metrics from mockStore
  const allBookings = mockStore.getBookings();
  const myRentals = allBookings.filter((b) => b.renterId === user?.id);
  const activeRentals = myRentals.filter((b) => b.status === 'active');
  const upcomingRentals = myRentals.filter((b) => b.status === 'accepted' || b.status === 'pending');

  const myListings = mockStore.getEquipmentList().filter((e) => e.ownerId === user?.id);
  const pendingRequests = allBookings.filter((b) => b.ownerId === user?.id && b.status === 'pending');

  const transactions = mockStore.getTransactions();
  const netEarnings = transactions
    .filter((t) => t.type === 'earning')
    .reduce((sum, t) => sum + t.netAmount, 0);

  // Sample analytics data for Recharts
  const chartData = [
    { month: 'Sep', rentalHours: 14, earnings: 4200 },
    { month: 'Oct', rentalHours: 28, earnings: 8900 },
    { month: 'Nov', rentalHours: 36, earnings: 11400 },
    { month: 'Dec', rentalHours: 22, earnings: 6800 },
    { month: 'Jan', rentalHours: 32, earnings: 9248 },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Dual Prominent Quick Actions Header */}
      <div className="bg-gradient-to-r from-[#164B35] to-[#235D40] text-white p-6 sm:p-8 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#B8D96B] text-[#164B35] inline-block mb-2">
              Single Unified Farmer Account
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading">
              Welcome, {user?.name}!
            </h1>
            <p className="text-xs text-[#DCE8E2] mt-1">
              Farm Location: {user?.location.village}, {user?.location.district} &bull; {user?.farmDetails?.farmSizeAcres || 18} Acres
            </p>
          </div>

          {/* TWO EQUALLY PROMINENT ACTIONS */}
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/equipment">
              <Button
                variant="lime"
                size="md"
                leftIcon={<Search className="w-4 h-4 text-[#164B35]" />}
                className="font-bold shadow-sm"
              >
                Find Equipment (Rent)
              </Button>
            </Link>

            <Link to="/dashboard/equipment/new">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<PlusCircle className="w-4 h-4 text-[#B8D96B]" />}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/20 font-bold"
              >
                List Equipment (Share)
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Four Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Rentals (I am renting) */}
        <Link
          to="/dashboard/rentals"
          className="bg-white p-5 rounded-2xl border border-[#E2E7DE] hover:border-[#164B35] shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full">
              Renting
            </span>
          </div>
          <p className="text-xs text-[#7C8C83] font-medium">My Active Rentals</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-extrabold font-heading text-[#25312A]">
              {activeRentals.length}
            </h3>
            <span className="text-xs text-[#526058]">in-field right now</span>
          </div>
        </Link>

        {/* Card 2: Listed Equipment (I am sharing) */}
        <Link
          to="/dashboard/equipment"
          className="bg-white p-5 rounded-2xl border border-[#E2E7DE] hover:border-[#164B35] shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#164B35] flex items-center justify-center">
              <Tractor className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-[#164B35] bg-emerald-50 px-2 py-0.5 rounded-full">
              Sharing
            </span>
          </div>
          <p className="text-xs text-[#7C8C83] font-medium">My Listed Machinery</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-extrabold font-heading text-[#25312A]">
              {myListings.length}
            </h3>
            <span className="text-xs text-[#526058]">active implements</span>
          </div>
        </Link>

        {/* Card 3: Pending Booking Requests */}
        <Link
          to="/dashboard/requests"
          className="bg-white p-5 rounded-2xl border border-[#E2E7DE] hover:border-[#164B35] shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            {pendingRequests.length > 0 && (
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                Needs Action
              </span>
            )}
          </div>
          <p className="text-xs text-[#7C8C83] font-medium">Pending Requests</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-extrabold font-heading text-[#25312A]">
              {pendingRequests.length}
            </h3>
            <span className="text-xs text-[#526058]">incoming farmer requests</span>
          </div>
        </Link>

        {/* Card 4: Net Earnings */}
        <Link
          to="/dashboard/earnings"
          className="bg-white p-5 rounded-2xl border border-[#E2E7DE] hover:border-[#164B35] shadow-sm hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full">
              Payouts
            </span>
          </div>
          <p className="text-xs text-[#7C8C83] font-medium">Net Rental Earnings</p>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-extrabold font-heading text-[#164B35]">
              {formatCurrency(netEarnings)}
            </h3>
          </div>
        </Link>
      </div>

      {/* 3. Urgent Activity Alerts (Pending Requests or Live Telemetry) */}
      {activeRentals.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-900 font-heading">
                Live Rental in Progress: {activeRentals[0].equipmentName}
              </h4>
              <p className="text-xs text-blue-700">
                Operating with driver &bull; Simulated GPS telemetry active
              </p>
            </div>
          </div>
          <Link to={`/dashboard/tracking/${activeRentals[0].id}`}>
            <Button variant="primary" size="sm" className="bg-blue-700 hover:bg-blue-800">
              Open Live GPS Tracker
            </Button>
          </Link>
        </div>
      )}

      {/* 4. Activity Columns: Upcoming Rentals (Renting) & Incoming Requests (Sharing) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: My Rentals (Renting) */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E7DE] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7DE]">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#347653]" />
              <h3 className="font-heading font-bold text-base text-[#25312A]">
                My Upcoming &amp; Active Rentals
              </h3>
            </div>
            <Link
              to="/dashboard/rentals"
              className="text-xs font-bold text-[#164B35] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingRentals.length === 0 && activeRentals.length === 0 ? (
            <p className="text-xs text-[#7C8C83] py-6 text-center">
              No active or upcoming equipment rentals.
            </p>
          ) : (
            <div className="space-y-3">
              {[...activeRentals, ...upcomingRentals].slice(0, 3).map((bk) => (
                <div
                  key={bk.id}
                  className="p-3.5 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={bk.equipmentImage}
                      alt={bk.equipmentName}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#25312A] truncate">
                        {bk.equipmentName}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#526058] mt-0.5">
                        <Calendar className="w-3 h-3 text-[#347653]" />
                        <span>{formatDate(bk.startDate)}</span>
                        <span>&bull; {bk.durationHours} hrs</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <StatusBadge status={bk.status} showIcon={false} className="text-[10px] py-0.5 px-2" />
                    <p className="text-xs font-bold text-[#164B35] mt-1">
                      {formatCurrency(bk.totalPrice)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Incoming Requests (Sharing my equipment) */}
        <div className="bg-white p-6 rounded-3xl border border-[#E2E7DE] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E7DE]">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-[#347653]" />
              <h3 className="font-heading font-bold text-base text-[#25312A]">
                Incoming Booking Requests
              </h3>
            </div>
            <Link
              to="/dashboard/requests"
              className="text-xs font-bold text-[#164B35] hover:underline flex items-center gap-1"
            >
              <span>Manage Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-xs text-[#7C8C83] py-6 text-center">
              No pending booking requests right now. Your machinery is ready for new dates!
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.slice(0, 3).map((req) => (
                <div
                  key={req.id}
                  className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#25312A]">{req.renterName}</span>
                      <span className="text-[10px] text-[#7C8C83]">({req.renterVillage})</span>
                    </div>
                    <p className="text-xs text-[#526058] truncate">
                      Requested: <strong>{req.equipmentName}</strong>
                    </p>
                    <p className="text-[11px] text-[#347653] font-medium">
                      {formatDate(req.startDate)} &bull; {req.durationHours} Hours {req.withOperator ? '(With Driver)' : ''}
                    </p>
                  </div>

                  <Link to="/dashboard/requests">
                    <Button variant="primary" size="sm" className="text-xs">
                      Review &amp; Accept
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Recharts Analytics Chart */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E7DE] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E7DE]">
          <div>
            <h3 className="font-heading font-bold text-base text-[#25312A]">
              Farm Equipment Activity &amp; Earnings
            </h3>
            <p className="text-xs text-[#7C8C83]">Monthly machine hours shared vs. net payout</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#164B35]">
            <TrendingUp className="w-4 h-4" />
            <span>+34% Utilization</span>
          </div>
        </div>

        <div className="h-64 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F5F2" />
              <XAxis dataKey="month" stroke="#7C8C83" fontSize={11} />
              <YAxis stroke="#7C8C83" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E7DE',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="rentalHours" fill="#B8D96B" radius={[4, 4, 0, 0]} name="Rental Hours" />
              <Bar dataKey="earnings" fill="#164B35" radius={[4, 4, 0, 0]} name="Net Earnings (₹)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

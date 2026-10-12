import { useState, useEffect } from 'react';
import {
  Tractor,
  Navigation,
  CreditCard,
  Star,
  Bell,
  Layers,
  UserCheck,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api, getActiveUser, setActiveUser, DEMO_USERS, UserSession } from './services/api.js';
import { RentalTrackingMap } from './components/tracking/RentalTrackingMap.js';
import { TrackingStatus } from './components/tracking/TrackingStatus.js';
import { RentalSessionControls } from './components/tracking/RentalSessionControls.js';
import { PaymentCheckout } from './components/payments/PaymentCheckout.js';
import { PaymentStatus } from './components/payments/PaymentStatus.js';
import { NotificationList } from './components/notifications/NotificationList.js';
import { ReviewForm } from './components/reviews/ReviewForm.js';
import { ReviewList } from './components/reviews/ReviewList.js';

export function App() {
  const [currentUser, setCurrentUserState] = useState<UserSession>(getActiveUser());
  const [activeTab, setActiveTab] = useState<'tracking' | 'payment' | 'reviews' | 'bookings'>('tracking');
  const [showNotifications, setShowNotifications] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Active tracking state for Demo Booking
  const [trackingData, setTrackingData] = useState<{
    booking: any;
    equipment: any;
    latestLocation: any;
    history: any[];
    sessionStatus: string;
    isStale: boolean;
    staleMinutes: number;
    activeSession: any;
  } | null>(null);

  // Active payment state for Demo Booking
  const [paymentBooking, setPaymentBooking] = useState<any>(null);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);

  // Completed booking for reviews
  const [completedBooking, setCompletedBooking] = useState<any>(null);

  // Fetch data for the active demo booking
  const loadDashboardData = async () => {
    try {
      // 1. Fetch live tracking for confirmed/active booking
      const trackRes = await api.getLatestLocation('booking_demo_confirmed');
      const histRes = await api.getLocationHistory('booking_demo_confirmed');
      const bookRes = await api.getBookingDetails('booking_demo_confirmed');

      setTrackingData({
        booking: bookRes.data.booking,
        equipment: bookRes.data.equipment,
        latestLocation: trackRes.data.latestLocation,
        history: histRes.data.history || [],
        sessionStatus: trackRes.data.sessionStatus,
        isStale: trackRes.data.isStale,
        staleMinutes: trackRes.data.staleMinutes,
        activeSession: trackRes.data.activeSession,
      });

      // 2. Fetch accepted booking for payment
      const payBookRes = await api.getBookingDetails('booking_demo_accepted');
      setPaymentBooking(payBookRes.data);
      const payHist = await api.getBookingPayments('booking_demo_accepted');
      if (payHist.data.payments.length > 0) {
        setPaymentRecord(payHist.data.payments[0]);
      }

      // 3. Fetch completed booking for reviews
      const compBookRes = await api.getBookingDetails('booking_demo_completed');
      setCompletedBooking(compBookRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser, refreshCounter]);

  const handleUserChange = (user: UserSession) => {
    setActiveUser(user);
    setCurrentUserState(user);
    setRefreshCounter((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Agricultural Brand Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-950">
              <Tractor className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white font-display">
                  SHARED FARM
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded-full font-bold">
                  Person 3 Modules
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Equipment Tracking • Razorpay Sandbox • Notifications • Reviews
              </p>
            </div>
          </div>

          {/* Right Action Bar: Role Persona Switcher & Notification Bell */}
          <div className="flex items-center gap-3">
            {/* Active User Switcher */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left hidden md:block">
                <span className="text-[10px] uppercase text-slate-500 block leading-none font-semibold">
                  Active Persona
                </span>
                <select
                  id="user-persona-select"
                  aria-label="Active Persona Selector"
                  value={currentUser.id}
                  onChange={(e) => {
                    const found = DEMO_USERS.find((u) => u.id === e.target.value);
                    if (found) handleUserChange(found);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  {DEMO_USERS.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-slate-100">
                      {u.fullName} ({u.id === 'user_amit' ? 'Renter' : u.id === 'user_rahul' ? 'Owner' : 'Admin'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notification Toggle Button */}
            <button
              id="btn-toggle-notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 rounded-xl border transition-all ${
                showNotifications
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/40'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
              title="Toggle In-App Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title="Refresh Telemetry Data"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>

        {/* Feature Navigation Bar */}
        <div className="border-t border-slate-800/80 bg-slate-900/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 overflow-x-auto py-2">
            <button
              id="nav-tab-tracking"
              onClick={() => setActiveTab('tracking')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'tracking'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>1. Equipment Tracking & GPS</span>
            </button>

            <button
              id="nav-tab-payment"
              onClick={() => setActiveTab('payment')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'payment'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>2. Razorpay Payments</span>
            </button>

            <button
              id="nav-tab-reviews"
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'reviews'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>3. Verified Reviews</span>
            </button>

            <button
              id="nav-tab-bookings"
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'bookings'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>4. My Rentals & Bookings</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Notifications Slide-Over Drawer if active */}
        {showNotifications && (
          <div className="mb-6 animate-fadeIn">
            <NotificationList />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: EQUIPMENT TRACKING & RENTAL SESSIONS */}
        {/* ========================================================================= */}
        {activeTab === 'tracking' && trackingData && (
          <div className="space-y-6">
            {/* Context Header Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-mono text-emerald-400 font-bold">
                    ACTIVE BOOKING: {trackingData.booking.id}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-300 font-medium">
                    Rented by <strong className="text-white">Amit Patel</strong> from{' '}
                    <strong className="text-white">Rahul Sharma</strong>
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-100 font-display">
                  🚜 {trackingData.equipment.title}
                </h2>
                <p className="text-xs text-slate-400">
                  Approximate Location: {trackingData.equipment.location_name} • Rate: ₹
                  {trackingData.equipment.hourly_rate}/hr
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold font-mono">
                  Booking Status: {trackingData.booking.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Split Grid: Interactive Map + Status & Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Map Column (7 Cols) */}
              <div className="lg:col-span-7 space-y-4">
                <RentalTrackingMap
                  latestLocation={trackingData.latestLocation}
                  history={trackingData.history}
                  equipmentTitle={trackingData.equipment.title}
                  isStale={trackingData.isStale}
                  staleMinutes={trackingData.staleMinutes}
                  sessionStatus={trackingData.sessionStatus}
                />
              </div>

              {/* Telemetry Status & Controls Column (5 Cols) */}
              <div className="lg:col-span-5 space-y-5">
                <RentalSessionControls
                  bookingId={trackingData.booking.id}
                  bookingStatus={trackingData.booking.status}
                  sessionStatus={trackingData.sessionStatus}
                  onSessionStateChanged={loadDashboardData}
                />

                <TrackingStatus
                  latestLocation={trackingData.latestLocation}
                  sessionStatus={trackingData.sessionStatus}
                  isStale={trackingData.isStale}
                  staleMinutes={trackingData.staleMinutes}
                  equipmentLocationName={trackingData.equipment.location_name}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: RAZORPAY TEST PAYMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'payment' && paymentBooking && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-extrabold text-slate-100 font-display">
                Razorpay Test Payment Gateway
              </h2>
              <p className="text-xs text-slate-400">
                Authoritative order generation, cryptographic signature verification, and idempotent booking transition
              </p>
            </div>

            <PaymentCheckout
              bookingId={paymentBooking.booking.id}
              totalPrice={paymentBooking.booking.total_price}
              hourlyRate={paymentBooking.booking.hourly_rate}
              totalHours={paymentBooking.booking.total_hours}
              equipmentTitle={paymentBooking.equipment.title}
              bookingStatus={paymentBooking.booking.status}
              onPaymentSuccess={(data) => {
                setPaymentRecord(data.payment);
                loadDashboardData();
              }}
            />

            <PaymentStatus payment={paymentRecord} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VERIFIED REVIEWS & RATINGS */}
        {/* ========================================================================= */}
        {activeTab === 'reviews' && completedBooking && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-4">
              <ReviewForm
                bookingId={completedBooking.booking.id}
                bookingStatus={completedBooking.booking.status}
                equipmentTitle={completedBooking.equipment.title}
                onReviewSubmitted={loadDashboardData}
              />
            </div>

            <div className="md:col-span-7 space-y-4">
              <ReviewList
                equipmentId={completedBooking.equipment.id}
                refreshTrigger={refreshCounter}
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: MY RENTALS & BOOKINGS OVERVIEW */}
        {/* ========================================================================= */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-100 font-display">
                  Unified Account Dashboard
                </h2>
                <p className="text-xs text-slate-400">
                  Showing bookings for current persona: <strong>{currentUser.fullName}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* My Rentals (Equipment I Rent) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-emerald-400">My Rentals (Renter Role)</h3>
                  <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
                    Machinery I am hiring
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-white">Mahindra 575 DI (45 HP)</h4>
                        <span className="text-[10px] text-slate-400">Provider: Rahul Sharma</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                        {trackingData?.booking?.status || 'confirmed'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                      <span>Total: ₹3,780.00 (4 hrs)</span>
                      <button
                        onClick={() => setActiveTab('tracking')}
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open Live Tracking</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* My Equipment (Equipment I Provide) */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-sm text-blue-400">My Equipment (Owner Role)</h3>
                  <span className="text-[10px] font-mono bg-blue-950 text-blue-400 px-2 py-0.5 rounded border border-blue-800">
                    Machinery I list
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-white">Mahindra 575 DI (45 HP)</h4>
                        <span className="text-[10px] text-slate-400">Listed by Rahul Sharma • ₹900/hr</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                        ACTIVE LISTING
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 pt-1 border-t border-slate-900">
                      <span>Avg Rating: 4.8 ★ (5 reviews)</span>
                      <span className="text-slate-300">Location: Dindori, Nashik</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          Shared Farm Platform • Person 3 Implementation: Rental Sessions, GPS Tracking, Razorpay
          Gateway, Notifications & Reviews
        </p>
      </footer>
    </div>
  );
}

export default App;

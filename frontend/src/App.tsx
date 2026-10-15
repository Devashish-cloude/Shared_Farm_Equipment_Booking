import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { MarketplacePage } from './pages/marketplace/MarketplacePage';
import { EquipmentDetailsPage } from './pages/marketplace/EquipmentDetailsPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { BookingSummaryPage } from './pages/booking/BookingSummaryPage';
import { BookingPaymentPage } from './pages/booking/BookingPaymentPage';
import { BookingConfirmationPage } from './pages/booking/BookingConfirmationPage';

// Dashboard Pages
import { DashboardOverviewPage } from './pages/dashboard/DashboardOverviewPage';
import { MyRentalsPage } from './pages/dashboard/MyRentalsPage';
import { MyEquipmentPage } from './pages/dashboard/MyEquipmentPage';
import { AddEquipmentPage } from './pages/dashboard/AddEquipmentPage';
import { EditEquipmentPage } from './pages/dashboard/EditEquipmentPage';
import { BookingRequestsPage } from './pages/dashboard/BookingRequestsPage';
import { UnifiedCalendarPage } from './pages/dashboard/UnifiedCalendarPage';
import { LiveTrackingPage } from './pages/dashboard/LiveTrackingPage';
import { EarningsPage } from './pages/dashboard/EarningsPage';
import { MessagesPage } from './pages/dashboard/MessagesPage';
import { NotificationsPage } from './pages/dashboard/NotificationsPage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

function App() {
  return (
    <BrowserRouter>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: '16px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/equipment" element={<MarketplacePage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          {/* Booking checkout flow */}
          <Route path="/booking/:id" element={<BookingSummaryPage />} />
          <Route path="/booking/:id/payment" element={<BookingPaymentPage />} />
          <Route path="/booking/:id/confirmation" element={<BookingConfirmationPage />} />
        </Route>

        {/* Unified Farmer Dashboard (Protected Single-Account Workspace) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardOverviewPage />} />
          <Route path="rentals" element={<MyRentalsPage />} />
          <Route path="equipment" element={<MyEquipmentPage />} />
          <Route path="equipment/new" element={<AddEquipmentPage />} />
          <Route path="equipment/:id/edit" element={<EditEquipmentPage />} />
          <Route path="requests" element={<BookingRequestsPage />} />
          <Route path="calendar" element={<UnifiedCalendarPage />} />
          <Route path="tracking" element={<LiveTrackingPage />} />
          <Route path="tracking/:bookingId" element={<LiveTrackingPage />} />
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin Console Route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

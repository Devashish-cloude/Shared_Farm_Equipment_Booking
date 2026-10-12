const API_BASE = '/api';

export interface UserSession {
  id: string;
  fullName: string;
  email: string;
  roleDescription: string;
}

export const DEMO_USERS: UserSession[] = [
  {
    id: 'user_amit',
    fullName: 'Amit Patel',
    email: 'amit@example.com',
    roleDescription: 'Active Renter (Rented Rahul\'s Mahindra Tractor)',
  },
  {
    id: 'user_rahul',
    fullName: 'Rahul Sharma',
    email: 'rahul@example.com',
    roleDescription: 'Equipment Owner & Provider (Owns Mahindra Tractor)',
  },
  {
    id: 'user_admin',
    fullName: 'Farm Admin',
    email: 'admin@sharedfarm.org',
    roleDescription: 'Platform Administrator (Full Oversight)',
  },
];

let currentActiveUser = DEMO_USERS[0];

export const setActiveUser = (user: UserSession) => {
  currentActiveUser = user;
  localStorage.setItem('shared_farm_user_id', user.id);
};

export const getActiveUser = (): UserSession => {
  const savedId = localStorage.getItem('shared_farm_user_id');
  if (savedId) {
    const found = DEMO_USERS.find((u) => u.id === savedId);
    if (found) return found;
  }
  return currentActiveUser;
};

// Base fetcher with automatic auth injection
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const activeUser = getActiveUser();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  // Pass demo user header for seamless role switching during evaluation
  headers.set('x-demo-user-id', activeUser.id);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // --- Tracking & Rental Sessions ---
  startRentalSession: (bookingId: string, notes?: string) =>
    request<{ success: boolean; message: string; data: any }>(
      `/rental-sessions/${bookingId}/start`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    ),

  endRentalSession: (bookingId: string, notes?: string) =>
    request<{ success: boolean; message: string; data: any }>(
      `/rental-sessions/${bookingId}/end`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    ),

  sendLocationTelemetry: (payload: {
    bookingId: string;
    latitude: number;
    longitude: number;
    source: 'simulated_gps' | 'device_gps' | 'manual';
    speed_kmh?: number;
    heading_deg?: number;
  }) =>
    request<{ success: boolean; data: any }>(`/tracking/location`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getLatestLocation: (bookingId: string) =>
    request<{ success: boolean; data: any }>(`/tracking/bookings/${bookingId}/latest`),

  getLocationHistory: (bookingId: string) =>
    request<{ success: boolean; data: any }>(`/tracking/bookings/${bookingId}/history`),

  // --- Payments ---
  createPaymentOrder: (bookingId: string) =>
    request<{ success: boolean; data: any }>(`/payments/create-order`, {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),

  verifyPayment: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    is_demo_simulated?: boolean;
  }) =>
    request<{ success: boolean; message: string; data: any }>(`/payments/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getBookingPayments: (bookingId: string) =>
    request<{ success: boolean; data: { payments: any[] } }>(`/payments/booking/${bookingId}`),

  // --- Notifications ---
  getNotifications: () =>
    request<{ success: boolean; data: { notifications: any[]; unreadCount: number } }>(
      `/notifications`
    ),

  getUnreadNotificationCount: () =>
    request<{ success: boolean; data: { unreadCount: number } }>(`/notifications/unread-count`),

  markNotificationRead: (id: string) =>
    request<{ success: boolean; data: any }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean; message: string; data: { unreadCount: number } }>(
      `/notifications/mark-all-read`,
      { method: 'PATCH' }
    ),

  // --- Reviews ---
  createReview: (payload: { bookingId: string; rating: number; comment: string }) =>
    request<{ success: boolean; message: string; data: any }>(`/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getEquipmentReviews: (equipmentId: string) =>
    request<{ success: boolean; data: any }>(`/equipment/${equipmentId}/reviews`),

  // --- Baseline Bookings & Equipment ---
  getEquipmentList: () =>
    request<{ success: boolean; data: { equipment: any[] } }>(`/equipment`),

  getEquipmentDetails: (id: string) =>
    request<{ success: boolean; data: { equipment: any; owner: any } }>(`/equipment/${id}`),

  getMyRentals: () =>
    request<{ success: boolean; data: { bookings: any[] } }>(`/bookings/my-rentals`),

  getMyEquipment: () =>
    request<{ success: boolean; data: { bookings: any[] } }>(`/bookings/my-equipment`),

  getBookingDetails: (id: string) =>
    request<{ success: boolean; data: { booking: any; equipment: any; renter: any; owner: any } }>(
      `/bookings/${id}`
    ),

  updateBookingStatus: (id: string, status: string) =>
    request<{ success: boolean; data: { booking: any } }>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

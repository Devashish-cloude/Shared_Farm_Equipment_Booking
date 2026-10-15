import axios from 'axios';

// Configurable API URL through environment variable
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:5001/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token and demo user ID if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shared_farm_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const savedUserId = localStorage.getItem('shared_farm_user_id') || 'user_amit';
    if (savedUserId && !config.headers['x-demo-user-id']) {
      config.headers['x-demo-user-id'] = savedUserId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified response unwrapping and error formatting
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && body.success && body.data !== undefined) {
      const data = body.data;
      if (data && typeof data === 'object') {
        if (Array.isArray(data.equipment)) {
          response.data = data.equipment;
          return response;
        }
        if (data.equipment && !Array.isArray(data.equipment)) {
          response.data = { ...data.equipment, owner: data.owner };
          return response;
        }
        if (Array.isArray(data.bookings)) {
          response.data = data.bookings;
          return response;
        }
        if (data.booking) {
          response.data = data.booking;
          return response;
        }
        if (data.user && !data.token) {
          response.data = data.user;
          return response;
        }
      }
      response.data = data;
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected server error occurred. Please check backend connection.';
    return Promise.reject(new Error(message));
  }
);

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

// Base fetcher with automatic auth injection for person 3 components
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const activeUser = getActiveUser();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('x-demo-user-id', activeUser.id);

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
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

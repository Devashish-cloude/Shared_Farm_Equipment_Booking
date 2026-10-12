import { Request } from 'express';

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  location_name?: string;
  farm_size_acres?: number;
  address?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = 'active' | 'paused' | 'reserved' | 'in_use' | 'maintenance' | 'inactive';

export interface Equipment {
  id: string;
  owner_id: string;
  category_id?: string;
  title: string;
  description?: string;
  hourly_rate: number;
  daily_rate?: number;
  location_name: string;
  approx_lat?: number;
  approx_lng?: number;
  status: EquipmentStatus;
  rating_avg: number;
  rating_count: number;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'payment_pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'payment_failed'
  | 'disputed';

export interface Booking {
  id: string;
  renter_id: string;
  equipment_id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  hourly_rate: number;
  base_price: number;
  platform_fee: number;
  total_price: number;
  status: BookingStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface RentalSession {
  id: string;
  booking_id: string;
  started_by: string;
  start_time: string;
  end_time?: string;
  session_status: SessionStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type TrackingSource = 'simulated_gps' | 'device_gps' | 'manual';

export interface EquipmentTracking {
  id: string;
  session_id: string;
  booking_id: string;
  latitude: number;
  longitude: number;
  source: TrackingSource;
  speed_kmh?: number;
  heading_deg?: number;
  recorded_at: string;
  created_at: string;
}

export type PaymentStatus = 'created' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method?: string;
  error_code?: string;
  error_description?: string;
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'booking_request'
  | 'booking_accepted'
  | 'booking_rejected'
  | 'payment_success'
  | 'payment_failed'
  | 'rental_started'
  | 'rental_completed'
  | 'tracking_alert';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}

export type ReviewType = 'renter_to_owner' | 'owner_to_renter';

export interface Review {
  id: string;
  booking_id: string;
  equipment_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment: string;
  review_type: ReviewType;
  created_at: string;
  updated_at: string;
}

export interface AuthUserPayload {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
  rawBody?: string;
}

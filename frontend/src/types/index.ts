export type UserRole = 'user' | 'admin';

export interface FarmDetails {
  farmSizeAcres?: number;
  primaryCrops?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  location: {
    village: string;
    district: string;
    state: string;
  };
  verificationStatus: 'verified' | 'pending' | 'unverified';
  memberSince: string;
  farmDetails?: FarmDetails;
  preferredLanguage: string;
  rating: number;
  reviewCount: number;
  role: UserRole;
}

export type EquipmentCategory =
  | 'Tractors'
  | 'Harvesters'
  | 'Rotavators'
  | 'Seed Drills'
  | 'Sprayers'
  | 'Cultivators'
  | 'Threshers'
  | 'Ploughs';

export type EquipmentCondition = 'Excellent' | 'Good' | 'Fair';

export type EquipmentStatus = 'available' | 'in-use' | 'maintenance' | 'paused' | 'draft';

export interface Equipment {
  id: string;
  title: string;
  category: EquipmentCategory;
  description: string;
  make: string;
  model: string;
  year: number;
  powerHp?: number;
  specifications: Record<string, string>;
  condition: EquipmentCondition;
  pricePerHour: number;
  pricePerDay: number;
  securityDeposit: number;
  operatorAvailable: boolean;
  operatorCostPerHour: number;
  minRentalHours: number;
  images: string[];
  location: {
    village: string;
    district: string;
    state: string;
    approximateCoordinates: [number, number]; // [lat, lng]
  };
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerRating: number;
  ownerVerified: boolean;
  ownerPhone?: string;
  status: EquipmentStatus;
  rating: number;
  reviewCount: number;
  completedRentalsCount: number;
  blockedDates?: string[];
  isFeatured?: boolean;
  createdAt: string;
}

export type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export interface TelemetryData {
  lat: number;
  lng: number;
  speedKmph: number;
  fuelLevelPercent: number;
  engineStatus: 'running' | 'idle' | 'off';
  lastUpdated: string;
  batteryVoltage: number;
  hoursWorkedToday: number;
  isSimulated: boolean;
}

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCategory: EquipmentCategory;
  equipmentImage: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterVillage: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  startDate: string; // ISO string
  endDate: string; // ISO string
  durationHours: number;
  withOperator: boolean;
  basePrice: number;
  operatorPrice: number;
  platformFee: number;
  securityDeposit: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'pay_on_delivery';
  createdAt: string;
  telemetryActive?: boolean;
  currentTelemetry?: TelemetryData;
  renterNotes?: string;
  cancellationReason?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  equipmentId: string;
  equipmentName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedRental: boolean;
}

export interface Transaction {
  id: string;
  bookingId: string;
  equipmentTitle: string;
  type: 'earning' | 'refund' | 'deposit_release' | 'payout';
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: 'completed' | 'processing' | 'held';
  date: string;
  referenceNo: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'rental' | 'system';
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  equipmentTitle?: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
}

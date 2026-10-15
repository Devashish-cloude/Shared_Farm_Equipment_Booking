import bcrypt from 'bcryptjs';
import {
  User,
  UserProfile,
  Equipment,
  Booking,
  RentalSession,
  EquipmentTracking,
  EquipmentAvailabilityWindow,
  EquipmentBlockedPeriod,
  Payment,
  Notification,
  Review,
  EquipmentCategory,
} from '../types/index.js';

class InMemoryStore {
  public users: Map<string, User> = new Map();
  public userProfiles: Map<string, UserProfile> = new Map();
  public equipment: Map<string, Equipment> = new Map();
  public availabilityWindows: Map<string, EquipmentAvailabilityWindow> = new Map();
  public blockedPeriods: Map<string, EquipmentBlockedPeriod> = new Map();
  public bookings: Map<string, Booking> = new Map();
  public rentalSessions: Map<string, RentalSession> = new Map();
  public trackingPoints: EquipmentTracking[] = [];
  public payments: Map<string, Payment> = new Map();
  public notifications: Map<string, Notification> = new Map();
  public reviews: Map<string, Review> = new Map();
  public categories: EquipmentCategory[] = [
    { id: 'cat_tractor', name: 'Tractors', description: 'Tractors and tractor-mounted equipment.' },
    { id: 'cat_harvester', name: 'Harvesters', description: 'Harvesters and harvesting machinery.' },
    { id: 'cat_tillage', name: 'Tillage', description: 'Rotavators, cultivators, ploughs and similar tools.' },
    { id: 'cat_seeding', name: 'Seeding', description: 'Seed drills and planting equipment.' },
    { id: 'cat_sprayer', name: 'Sprayers', description: 'Crop spraying equipment.' },
  ];

  constructor() {
    this.seed();
  }

  public reset() {
    this.users.clear();
    this.userProfiles.clear();
    this.equipment.clear();
    this.bookings.clear();
    this.availabilityWindows.clear();
    this.blockedPeriods.clear();
    this.rentalSessions.clear();
    this.trackingPoints = [];
    this.payments.clear();
    this.notifications.clear();
    this.reviews.clear();
    this.seed();
  }

  private seed() {
    const passwordHash = bcrypt.hashSync('password123', 10);
    const now = new Date().toISOString();

    // 1. Users
    const rahul: User = {
      id: 'user_rahul',
      email: 'rahul@example.com',
      password_hash: passwordHash,
      full_name: 'Rahul Sharma',
      phone: '+91 9876543210',
      is_admin: false,
      created_at: now,
      updated_at: now,
    };
    const amit: User = {
      id: 'user_amit',
      email: 'amit@example.com',
      password_hash: passwordHash,
      full_name: 'Amit Patel',
      phone: '+91 9123456780',
      is_admin: false,
      created_at: now,
      updated_at: now,
    };
    const admin: User = {
      id: 'user_admin',
      email: 'admin@sharedfarm.org',
      password_hash: passwordHash,
      full_name: 'Farm Admin',
      phone: '+91 9999900000',
      is_admin: true,
      created_at: now,
      updated_at: now,
    };

    this.users.set(rahul.id, rahul);
    this.users.set(amit.id, amit);
    this.users.set(admin.id, admin);

    // 2. User Profiles
    this.userProfiles.set('user_rahul', {
      id: 'prof_rahul',
      user_id: 'user_rahul',
      location_name: 'Nashik, Maharashtra',
      farm_size_acres: 12.5,
      address: 'Farm No. 4, Dindori Road, Nashik',
      bio: 'Progressive farmer with tractor and harvester available for local sharing.',
      created_at: now,
      updated_at: now,
    });
    this.userProfiles.set('user_amit', {
      id: 'prof_amit',
      user_id: 'user_amit',
      location_name: 'Nashik, Maharashtra',
      farm_size_acres: 6.0,
      address: 'Village Niphad, Nashik',
      bio: 'Organic vegetable grower; frequently rents high-power machinery.',
      created_at: now,
      updated_at: now,
    });

    // 3. Equipment
    const tractor: Equipment = {
      id: 'eq_tractor_rahul',
      owner_id: 'user_rahul',
      category_id: 'cat_tractor',
      title: 'Mahindra 575 DI (45 HP Tractor)',
      description: 'Reliable 45 HP Mahindra tractor with modern fuel efficiency. Perfect for tilling and haulage. Operator available.',
      hourly_rate: 900.0,
      daily_rate: 6500.0,
      location_name: 'Dindori, Nashik',
      approx_lat: 20.1983,
      approx_lng: 73.8342,
      status: 'active',
      rating_avg: 4.8,
      rating_count: 5,
      image_url: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
      created_at: now,
      updated_at: now,
    };
    const rotavator: Equipment = {
      id: 'eq_rotavator_amit',
      owner_id: 'user_amit',
      category_id: 'cat_tillage',
      title: 'Shaktiman 7ft Rotavator',
      description: 'Heavy duty multi-speed rotavator, well-maintained blades for smooth seedbed preparation.',
      hourly_rate: 450.0,
      daily_rate: 3200.0,
      location_name: 'Niphad, Nashik',
      approx_lat: 20.08,
      approx_lng: 74.11,
      status: 'active',
      rating_avg: 4.9,
      rating_count: 3,
      image_url: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80',
      created_at: now,
      updated_at: now,
    };

    this.equipment.set(tractor.id, tractor);
    this.equipment.set(rotavator.id, rotavator);

    // 4. Bookings
    // Demo Booking 1: Confirmed - Amit books Rahul's tractor (Ready to start rental & track)
    const bookingConfirmed: Booking = {
      id: 'booking_demo_confirmed',
      renter_id: 'user_amit',
      equipment_id: 'eq_tractor_rahul',
      start_date: new Date(Date.now() - 30 * 60000).toISOString(),
      end_date: new Date(Date.now() + 3.5 * 3600000).toISOString(),
      total_hours: 4.0,
      hourly_rate: 900.0,
      base_price: 3600.0,
      platform_fee: 180.0,
      total_price: 3780.0,
      status: 'confirmed',
      notes: 'Field preparation for wheat sowing at Dindori field.',
      created_at: now,
      updated_at: now,
    };

    // Demo Booking 2: Accepted - Amit books Rahul's tractor (Ready for payment checkout)
    const bookingAccepted: Booking = {
      id: 'booking_demo_accepted',
      renter_id: 'user_amit',
      equipment_id: 'eq_tractor_rahul',
      start_date: new Date(Date.now() + 24 * 3600000).toISOString(),
      end_date: new Date(Date.now() + 28 * 3600000).toISOString(),
      total_hours: 4.0,
      hourly_rate: 900.0,
      base_price: 3600.0,
      platform_fee: 180.0,
      total_price: 3780.0,
      status: 'accepted',
      notes: 'Pending payment confirmation.',
      created_at: now,
      updated_at: now,
    };

    // Demo Booking 3: Completed - Amit rented Rahul's tractor (Ready for reviews)
    const bookingCompleted: Booking = {
      id: 'booking_demo_completed',
      renter_id: 'user_amit',
      equipment_id: 'eq_tractor_rahul',
      start_date: new Date(Date.now() - 48 * 3600000).toISOString(),
      end_date: new Date(Date.now() - 44 * 3600000).toISOString(),
      total_hours: 4.0,
      hourly_rate: 900.0,
      base_price: 3600.0,
      platform_fee: 180.0,
      total_price: 3780.0,
      status: 'completed',
      notes: 'Completed soil leveling work smoothly.',
      created_at: new Date(Date.now() - 50 * 3600000).toISOString(),
      updated_at: new Date(Date.now() - 44 * 3600000).toISOString(),
    };

    this.bookings.set(bookingConfirmed.id, bookingConfirmed);
    this.bookings.set(bookingAccepted.id, bookingAccepted);
    this.bookings.set(bookingCompleted.id, bookingCompleted);

    // Initial Notifications
    this.notifications.set('notif_1', {
      id: 'notif_1',
      user_id: 'user_amit',
      title: 'Booking Confirmed',
      message: 'Your booking for Mahindra 575 DI is confirmed! You can start rental tracking once ready.',
      type: 'booking_accepted',
      reference_id: 'booking_demo_confirmed',
      reference_type: 'booking',
      is_read: false,
      created_at: now,
    });
  }

  // --- Users ---
  public getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUserByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return undefined;
  }

  public createUser(user: User): User {
    this.users.set(user.id, user);
    return user;
  }

  // --- Equipment ---
  public getEquipmentById(id: string): Equipment | undefined {
    return this.equipment.get(id);
  }

  public getAllEquipment(): Equipment[] {
    return Array.from(this.equipment.values());
  }

  public getCategories(): EquipmentCategory[] {
    return this.categories.map((category) => ({ ...category }));
  }

  public listAvailability(equipmentId: string): EquipmentAvailabilityWindow[] {
    return Array.from(this.availabilityWindows.values())
      .filter((window) => window.equipment_id === equipmentId)
      .sort((left, right) => left.start_date.localeCompare(right.start_date));
  }

  public listBlockedPeriods(equipmentId: string): EquipmentBlockedPeriod[] {
    return Array.from(this.blockedPeriods.values())
      .filter((period) => period.equipment_id === equipmentId)
      .sort((left, right) => left.start_date.localeCompare(right.start_date));
  }

  public updateEquipmentRating(id: string, avgRating: number, count: number): void {
    const eq = this.equipment.get(id);
    if (eq) {
      eq.rating_avg = avgRating;
      eq.rating_count = count;
      eq.updated_at = new Date().toISOString();
    }
  }

  // --- Bookings ---
  public getBookingById(id: string): Booking | undefined {
    return this.bookings.get(id);
  }

  public updateBookingStatus(id: string, status: Booking['status']): Booking | undefined {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.status = status;
      booking.updated_at = new Date().toISOString();
      return booking;
    }
    return undefined;
  }

  public listBookingsByUser(userId: string): { myRentals: Booking[]; myEquipment: Booking[] } {
    const myRentals: Booking[] = [];
    const myEquipment: Booking[] = [];

    for (const booking of this.bookings.values()) {
      if (booking.renter_id === userId) {
        myRentals.push(booking);
      }
      const eq = this.equipment.get(booking.equipment_id);
      if (eq && eq.owner_id === userId) {
        myEquipment.push(booking);
      }
    }
    return { myRentals, myEquipment };
  }

  // --- Rental Sessions ---
  public createRentalSession(session: RentalSession): RentalSession {
    this.rentalSessions.set(session.id, session);
    return session;
  }

  public getRentalSessionById(id: string): RentalSession | undefined {
    return this.rentalSessions.get(id);
  }

  public getActiveRentalSession(bookingId: string): RentalSession | undefined {
    for (const session of this.rentalSessions.values()) {
      if (session.booking_id === bookingId && session.session_status === 'active') {
        return session;
      }
    }
    return undefined;
  }

  public getRentalSessionsByBookingId(bookingId: string): RentalSession[] {
    return Array.from(this.rentalSessions.values()).filter((s) => s.booking_id === bookingId);
  }

  public updateRentalSession(session: RentalSession): RentalSession {
    session.updated_at = new Date().toISOString();
    this.rentalSessions.set(session.id, session);
    return session;
  }

  // --- Equipment Tracking ---
  public addTrackingPoint(point: EquipmentTracking): EquipmentTracking {
    this.trackingPoints.push(point);
    return point;
  }

  public getLatestTrackingPoint(bookingId: string): EquipmentTracking | undefined {
    const points = this.trackingPoints
      .filter((p) => p.booking_id === bookingId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
    return points[0];
  }

  public getTrackingHistory(bookingId: string): EquipmentTracking[] {
    return this.trackingPoints
      .filter((p) => p.booking_id === bookingId)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  }

  // --- Payments ---
  public createPayment(payment: Payment): Payment {
    this.payments.set(payment.id, payment);
    return payment;
  }

  public getPaymentByOrderId(orderId: string): Payment | undefined {
    for (const payment of this.payments.values()) {
      if (payment.razorpay_order_id === orderId) {
        return payment;
      }
    }
    return undefined;
  }

  public getPaymentByPaymentId(paymentId: string): Payment | undefined {
    for (const payment of this.payments.values()) {
      if (payment.razorpay_payment_id === paymentId) {
        return payment;
      }
    }
    return undefined;
  }

  public getPaymentByIdempotencyKey(key: string): Payment | undefined {
    for (const payment of this.payments.values()) {
      if (payment.idempotency_key === key) {
        return payment;
      }
    }
    return undefined;
  }

  public getPaymentById(id: string): Payment | undefined {
    return this.payments.get(id);
  }

  public getPaymentsByBookingId(bookingId: string): Payment[] {
    return Array.from(this.payments.values()).filter((p) => p.booking_id === bookingId);
  }

  public updatePayment(payment: Payment): Payment {
    payment.updated_at = new Date().toISOString();
    this.payments.set(payment.id, payment);
    return payment;
  }

  // --- Notifications ---
  public createNotification(notification: Notification): Notification {
    this.notifications.set(notification.id, notification);
    return notification;
  }

  public getNotificationsByUserId(userId: string): Notification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getUnreadNotificationCount(userId: string): number {
    return Array.from(this.notifications.values()).filter(
      (n) => n.user_id === userId && !n.is_read
    ).length;
  }

  public markNotificationAsRead(id: string, userId: string): Notification | undefined {
    const notif = this.notifications.get(id);
    if (notif && notif.user_id === userId) {
      notif.is_read = true;
      return notif;
    }
    return undefined;
  }

  public markAllNotificationsAsRead(userId: string): number {
    let count = 0;
    for (const notif of this.notifications.values()) {
      if (notif.user_id === userId && !notif.is_read) {
        notif.is_read = true;
        count++;
      }
    }
    return count;
  }

  // --- Reviews ---
  public createReview(review: Review): Review {
    this.reviews.set(review.id, review);
    return review;
  }

  public getReviewByBookingAndReviewer(bookingId: string, reviewerId: string): Review | undefined {
    for (const review of this.reviews.values()) {
      if (review.booking_id === bookingId && review.reviewer_id === reviewerId) {
        return review;
      }
    }
    return undefined;
  }

  public getReviewsByEquipmentId(equipmentId: string): Review[] {
    return Array.from(this.reviews.values())
      .filter((r) => r.equipment_id === equipmentId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public calculateEquipmentRating(equipmentId: string): { avg: number; count: number } {
    const eqReviews = this.getReviewsByEquipmentId(equipmentId);
    if (eqReviews.length === 0) {
      return { avg: 0, count: 0 };
    }
    const sum = eqReviews.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / eqReviews.length) * 10) / 10;
    return { avg, count: eqReviews.length };
  }
}

export const store = new InMemoryStore();

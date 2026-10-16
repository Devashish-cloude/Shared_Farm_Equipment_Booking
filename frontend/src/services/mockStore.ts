import {
  MOCK_EQUIPMENT,
  MOCK_BOOKINGS,
  MOCK_REVIEWS,
  MOCK_TRANSACTIONS,
  MOCK_NOTIFICATIONS,
  MOCK_CONVERSATIONS,
  MOCK_MESSAGES,
  CURRENT_USER
} from '../mocks/mockData';
import { Equipment, Booking, Review, Transaction, NotificationItem, Conversation, ChatMessage, User } from '../types';

const STORAGE_KEYS = {
  USER: 'sf_mock_user',
  EQUIPMENT: 'sf_mock_equipment',
  BOOKINGS: 'sf_mock_bookings',
  REVIEWS: 'sf_mock_reviews',
  TRANSACTIONS: 'sf_mock_transactions',
  NOTIFICATIONS: 'sf_mock_notifications',
  CONVERSATIONS: 'sf_mock_conversations',
  MESSAGES: 'sf_mock_messages',
};

class MockDataStore {
  private user: User;
  private equipment: Equipment[];
  private bookings: Booking[];
  private reviews: Review[];
  private transactions: Transaction[];
  private notifications: NotificationItem[];
  private conversations: Conversation[];
  private messages: Record<string, ChatMessage[]>;

  constructor() {
    this.user = this.load(STORAGE_KEYS.USER, CURRENT_USER);
    this.equipment = this.load(STORAGE_KEYS.EQUIPMENT, MOCK_EQUIPMENT);
    this.bookings = this.load(STORAGE_KEYS.BOOKINGS, MOCK_BOOKINGS);
    this.reviews = this.load(STORAGE_KEYS.REVIEWS, MOCK_REVIEWS);
    this.transactions = this.load(STORAGE_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
    this.notifications = this.load(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
    this.conversations = this.load(STORAGE_KEYS.CONVERSATIONS, MOCK_CONVERSATIONS);
    this.messages = this.load(STORAGE_KEYS.MESSAGES, MOCK_MESSAGES);
  }

  private load<T>(key: string, fallback: T): T {
    try {
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  }

  private save<T>(key: string, data: T) {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to sessionStorage', e);
    }
  }

  public resetToDefaults() {
    this.user = { ...CURRENT_USER };
    this.equipment = [...MOCK_EQUIPMENT];
    this.bookings = [...MOCK_BOOKINGS];
    this.reviews = [...MOCK_REVIEWS];
    this.transactions = [...MOCK_TRANSACTIONS];
    this.notifications = [...MOCK_NOTIFICATIONS];
    this.conversations = [...MOCK_CONVERSATIONS];
    this.messages = { ...MOCK_MESSAGES };

    sessionStorage.clear();
  }

  // Active User Session Management (Ensures account isolation)
  public getActiveUser(): User | null {
    const raw = sessionStorage.getItem('sf_active_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  }

  public setActiveUser(user: User | null): void {
    if (user) {
      sessionStorage.setItem('sf_active_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('sf_active_user');
    }
  }

  public registerNewUser(data: Partial<User>): User {
    const newUser: User = {
      id: data.id || `usr-farmer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name || 'New Farmer',
      email: data.email || 'farmer@sharedfarm.local',
      phone: data.phone || '',
      avatar: data.avatar || '',
      location: data.location || { village: '', district: '', state: '' },
      verificationStatus: 'unverified',
      memberSince: new Date().getFullYear().toString(),
      preferredLanguage: data.preferredLanguage || 'English',
      rating: 5.0,
      reviewCount: 0,
      role: 'user',
      farmDetails: data.farmDetails || { farmSizeAcres: undefined, primaryCrops: [] },
    };
    this.setActiveUser(newUser);
    return newUser;
  }

  // User (Legacy fallback)
  public getUser(): User {
    return this.getActiveUser() || this.user;
  }

  public updateUser(updates: Partial<User>): User {
    const current = this.getActiveUser() || this.user;
    const updated = { ...current, ...updates };
    this.setActiveUser(updated);
    this.user = updated;
    this.save(STORAGE_KEYS.USER, updated);
    return updated;
  }

  // Equipment
  public getEquipmentList(): Equipment[] {
    return this.equipment;
  }

  public getEquipmentById(id: string): Equipment | undefined {
    return this.equipment.find(e => e.id === id);
  }

  public addEquipment(item: Omit<Equipment, 'id' | 'createdAt' | 'rating' | 'reviewCount' | 'completedRentalsCount'>): Equipment {
    const newEquip: Equipment = {
      ...item,
      id: `eq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      rating: 5.0,
      reviewCount: 0,
      completedRentalsCount: 0,
      status: 'available',
    };
    this.equipment = [newEquip, ...this.equipment];
    this.save(STORAGE_KEYS.EQUIPMENT, this.equipment);
    return newEquip;
  }

  public updateEquipment(id: string, updates: Partial<Equipment>): Equipment {
    this.equipment = this.equipment.map(e => (e.id === id ? { ...e, ...updates } : e));
    this.save(STORAGE_KEYS.EQUIPMENT, this.equipment);
    const updated = this.equipment.find(e => e.id === id);
    if (!updated) throw new Error('Equipment not found');
    return updated;
  }

  public deleteEquipment(id: string): void {
    // Check if equipment has active bookings
    const hasActiveBookings = this.bookings.some(
      b => b.equipmentId === id && (b.status === 'active' || b.status === 'accepted')
    );
    if (hasActiveBookings) {
      throw new Error('Cannot delete equipment with active or confirmed bookings. Please complete or cancel them first.');
    }
    this.equipment = this.equipment.filter(e => e.id !== id);
    this.save(STORAGE_KEYS.EQUIPMENT, this.equipment);
  }

  // Bookings
  public getBookings(): Booking[] {
    return this.bookings;
  }

  public getBookingById(id: string): Booking | undefined {
    return this.bookings.find(b => b.id === id);
  }

  public createBooking(bookingData: Omit<Booking, 'id' | 'createdAt' | 'status' | 'paymentStatus'>): Booking {
    const newBooking: Booking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      paymentStatus: 'pending',
    };
    this.bookings = [newBooking, ...this.bookings];
    this.save(STORAGE_KEYS.BOOKINGS, this.bookings);

    // Notify owner
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'New Booking Request',
      message: `${newBooking.renterName} requested ${newBooking.equipmentName} for ${newBooking.durationHours} hours.`,
      type: 'booking',
      read: false,
      timestamp: 'Just now',
      link: '/dashboard/requests',
    };
    this.notifications = [newNotif, ...this.notifications];
    this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);

    return newBooking;
  }

  public updateBookingStatus(
    id: string,
    status: Booking['status'],
    extras?: { cancellationReason?: string; paymentStatus?: Booking['paymentStatus'] }
  ): Booking {
    this.bookings = this.bookings.map(b => {
      if (b.id === id) {
        return {
          ...b,
          status,
          ...(extras?.cancellationReason ? { cancellationReason: extras.cancellationReason } : {}),
          ...(extras?.paymentStatus ? { paymentStatus: extras.paymentStatus } : {}),
          ...(status === 'active' ? { telemetryActive: true } : {}),
          ...(status === 'completed' ? { telemetryActive: false } : {}),
        };
      }
      return b;
    });
    this.save(STORAGE_KEYS.BOOKINGS, this.bookings);
    const updated = this.bookings.find(b => b.id === id);
    if (!updated) throw new Error('Booking not found');
    return updated;
  }

  // Reviews
  public getReviews(): Review[] {
    return this.reviews;
  }

  public getReviewsForEquipment(equipmentId: string): Review[] {
    return this.reviews.filter(r => r.equipmentId === equipmentId);
  }

  public addReview(review: Omit<Review, 'id' | 'createdAt'>): Review {
    const newRev: Review = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    this.reviews = [newRev, ...this.reviews];
    this.save(STORAGE_KEYS.REVIEWS, this.reviews);
    return newRev;
  }

  // Transactions
  public getTransactions(): Transaction[] {
    return this.transactions;
  }

  // Notifications
  public getNotifications(): NotificationItem[] {
    return this.notifications;
  }

  public markNotificationAsRead(id: string): void {
    this.notifications = this.notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  public markAllNotificationsAsRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.save(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
  }

  // Messages
  public getConversations(): Conversation[] {
    return this.conversations;
  }

  public getMessages(convId: string): ChatMessage[] {
    return this.messages[convId] || [];
  }

  public sendMessage(convId: string, text: string): ChatMessage {
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversationId: convId,
      senderId: this.user.id,
      senderName: this.user.name,
      receiverId: 'usr-other',
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: true,
    };

    if (!this.messages[convId]) {
      this.messages[convId] = [];
    }
    this.messages[convId] = [...this.messages[convId], msg];
    this.save(STORAGE_KEYS.MESSAGES, this.messages);

    // Update conversation snippet
    this.conversations = this.conversations.map(c => {
      if (c.id === convId) {
        return {
          ...c,
          lastMessage: text,
          lastMessageTimestamp: 'Just now',
        };
      }
      return c;
    });
    this.save(STORAGE_KEYS.CONVERSATIONS, this.conversations);

    return msg;
  }
}

export const mockStore = new MockDataStore();

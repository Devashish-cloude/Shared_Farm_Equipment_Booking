import { v4 as uuidv4 } from 'uuid';
import { store } from './store.js';
import { Notification, NotificationType } from '../types/index.js';

export type NotificationWrite = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  referenceType?: string;
};

export function paymentSuccessWrites(
  bookingId: string,
  equipmentTitle: string,
  amount: number,
  renterId: string,
  ownerId: string
): NotificationWrite[] {
  return [
    {
      userId: renterId,
      title: 'Payment Successful',
      message: `Your payment of ₹${amount.toFixed(2)} for "${equipmentTitle}" was verified. Booking is now confirmed!`,
      type: 'payment_success',
      referenceId: bookingId,
      referenceType: 'booking',
    },
    {
      userId: ownerId,
      title: 'Payment Received',
      message: `Payment of ₹${amount.toFixed(2)} received for "${equipmentTitle}". Booking is confirmed.`,
      type: 'payment_success',
      referenceId: bookingId,
      referenceType: 'booking',
    },
  ];
}

export function paymentFailedWrite(
  bookingId: string,
  equipmentTitle: string,
  renterId: string,
  reason?: string
): NotificationWrite {
  return {
    userId: renterId,
    title: 'Payment Failed',
    message: `Payment for "${equipmentTitle}" could not be completed.${reason ? ` Reason: ${reason}` : ' Please retry.'}`,
    type: 'payment_failed',
    referenceId: bookingId,
    referenceType: 'booking',
  };
}

export function rentalStartedWrites(
  bookingId: string,
  equipmentTitle: string,
  renterId: string,
  ownerId: string
): NotificationWrite[] {
  return [
    {
      userId: renterId,
      title: 'Rental Session Started',
      message: `Your active rental session for "${equipmentTitle}" has started. Live telemetry is now active.`,
      type: 'rental_started',
      referenceId: bookingId,
      referenceType: 'booking',
    },
    {
      userId: ownerId,
      title: 'Equipment In Use',
      message: `The rental session for your equipment "${equipmentTitle}" has been started by the renter.`,
      type: 'rental_started',
      referenceId: bookingId,
      referenceType: 'booking',
    },
  ];
}

export function rentalCompletedWrites(
  bookingId: string,
  equipmentTitle: string,
  renterId: string,
  ownerId: string
): NotificationWrite[] {
  return [
    {
      userId: renterId,
      title: 'Rental Session Completed',
      message: `Your rental session for "${equipmentTitle}" has completed. Please leave a review for the equipment owner!`,
      type: 'rental_completed',
      referenceId: bookingId,
      referenceType: 'booking',
    },
    {
      userId: ownerId,
      title: 'Equipment Returned',
      message: `The rental session for "${equipmentTitle}" has been completed. Check your earnings and submit a renter review.`,
      type: 'rental_completed',
      referenceId: bookingId,
      referenceType: 'booking',
    },
  ];
}

export class NotificationService {
  public static sendNotification(params: NotificationWrite): Notification {
    const notification: Notification = {
      id: `notif_${uuidv4().substring(0, 8)}`,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      reference_id: params.referenceId,
      reference_type: params.referenceType,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    return store.createNotification(notification);
  }

  public static notifyRentalStarted(bookingId: string, equipmentTitle: string, renterId: string, ownerId: string) {
    rentalStartedWrites(bookingId, equipmentTitle, renterId, ownerId).forEach((write) => this.sendNotification(write));
  }

  public static notifyRentalCompleted(bookingId: string, equipmentTitle: string, renterId: string, ownerId: string) {
    rentalCompletedWrites(bookingId, equipmentTitle, renterId, ownerId).forEach((write) => this.sendNotification(write));
  }

  public static notifyPaymentSuccess(bookingId: string, equipmentTitle: string, amount: number, renterId: string, ownerId: string) {
    paymentSuccessWrites(bookingId, equipmentTitle, amount, renterId, ownerId).forEach((write) => this.sendNotification(write));
  }

  public static notifyPaymentFailed(bookingId: string, equipmentTitle: string, renterId: string, reason?: string) {
    this.sendNotification(paymentFailedWrite(bookingId, equipmentTitle, renterId, reason));
  }
}

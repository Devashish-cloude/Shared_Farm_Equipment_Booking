import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { NotificationService } from '../services/notificationService.js';
import { AuthenticatedRequest, Booking, BookingStatus } from '../types/index.js';

export class BookingController {
  public static createBooking(req: AuthenticatedRequest, res: Response): void {
    const { equipment_id, start_date, end_date, total_hours, notes } = req.body;

    if (!equipment_id || !start_date || !end_date || !total_hours) {
      res.status(400).json({
        success: false,
        error: 'equipment_id, start_date, end_date, and total_hours are required.',
      });
      return;
    }

    const equipment = store.getEquipmentById(equipment_id);
    if (!equipment) {
      res.status(404).json({ success: false, error: 'Equipment not found.' });
      return;
    }

    if (equipment.owner_id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: 'You cannot book your own equipment.',
      });
      return;
    }

    const hours = parseFloat(total_hours);
    const basePrice = hours * equipment.hourly_rate;
    const platformFee = Math.round(basePrice * 0.05 * 100) / 100; // 5% platform fee
    const totalPrice = basePrice + platformFee;

    const newBooking: Booking = {
      id: `book_${uuidv4().substring(0, 8)}`,
      renter_id: req.user!.id,
      equipment_id,
      start_date,
      end_date,
      total_hours: hours,
      hourly_rate: equipment.hourly_rate,
      base_price: basePrice,
      platform_fee: platformFee,
      total_price: totalPrice,
      status: 'pending',
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.bookings.set(newBooking.id, newBooking);

    // Notify equipment owner
    NotificationService.sendNotification({
      userId: equipment.owner_id,
      title: 'New Booking Request',
      message: `${req.user!.full_name} requested to book "${equipment.title}" for ${hours} hours.`,
      type: 'booking_request',
      referenceId: newBooking.id,
      referenceType: 'booking',
    });

    res.status(201).json({
      success: true,
      message: 'Booking request submitted to owner.',
      data: { booking: newBooking },
    });
  }

  public static getMyRentals(req: AuthenticatedRequest, res: Response): void {
    const { myRentals } = store.listBookingsByUser(req.user!.id);
    const enriched = myRentals.map((b) => {
      const eq = store.getEquipmentById(b.equipment_id);
      return {
        ...b,
        equipment: eq ? { id: eq.id, title: eq.title, location: eq.location_name, image: eq.image_url } : null,
      };
    });

    res.status(200).json({ success: true, data: { bookings: enriched } });
  }

  public static getMyEquipment(req: AuthenticatedRequest, res: Response): void {
    const { myEquipment } = store.listBookingsByUser(req.user!.id);
    const enriched = myEquipment.map((b) => {
      const renter = store.getUserById(b.renter_id);
      const eq = store.getEquipmentById(b.equipment_id);
      return {
        ...b,
        renter: renter ? { id: renter.id, fullName: renter.full_name, phone: renter.phone } : null,
        equipment: eq ? { id: eq.id, title: eq.title, location: eq.location_name } : null,
      };
    });

    res.status(200).json({ success: true, data: { bookings: enriched } });
  }

  public static getBookingById(req: AuthenticatedRequest, res: Response): void {
    const { id } = req.params;
    const booking = store.getBookingById(id);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    const eq = store.getEquipmentById(booking.equipment_id);
    const renter = store.getUserById(booking.renter_id);
    const owner = eq ? store.getUserById(eq.owner_id) : undefined;

    // Check authorization: must be renter, owner, or admin
    if (
      req.user!.id !== booking.renter_id &&
      (!eq || eq.owner_id !== req.user!.id) &&
      !req.user!.is_admin
    ) {
      res.status(403).json({ success: false, error: 'Forbidden: unauthorized booking access.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        booking,
        equipment: eq,
        renter: renter ? { id: renter.id, fullName: renter.full_name, phone: renter.phone } : null,
        owner: owner ? { id: owner.id, fullName: owner.full_name, phone: owner.phone } : null,
      },
    });
  }

  public static updateBookingStatus(req: AuthenticatedRequest, res: Response): void {
    const { id } = req.params;
    const { status } = req.body as { status: BookingStatus };

    const booking = store.getBookingById(id);
    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found.' });
      return;
    }

    const eq = store.getEquipmentById(booking.equipment_id);
    const isOwner = eq && eq.owner_id === req.user!.id;
    const isRenter = booking.renter_id === req.user!.id;
    const isAdmin = req.user!.is_admin;

    if (!isOwner && !isRenter && !isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized to change booking status.' });
      return;
    }

    // Owner actions
    if (status === 'accepted' || status === 'rejected') {
      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, error: 'Only the equipment owner can accept or reject bookings.' });
        return;
      }

      booking.status = status;
      store.bookings.set(booking.id, booking);

      // Trigger notification
      NotificationService.sendNotification({
        userId: booking.renter_id,
        title: status === 'accepted' ? 'Booking Accepted!' : 'Booking Declined',
        message:
          status === 'accepted'
            ? `Your booking for "${eq?.title}" was accepted. Please proceed with payment.`
            : `Your booking for "${eq?.title}" was declined by the owner.`,
        type: status === 'accepted' ? 'booking_accepted' : 'booking_rejected',
        referenceId: booking.id,
        referenceType: 'booking',
      });
    } else if (status === 'cancelled') {
      booking.status = 'cancelled';
      store.bookings.set(booking.id, booking);
    } else {
      booking.status = status;
      store.bookings.set(booking.id, booking);
    }

    res.status(200).json({
      success: true,
      message: `Booking status transitioned to '${booking.status}'.`,
      data: { booking },
    });
  }
}

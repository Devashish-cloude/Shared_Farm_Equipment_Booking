import { NextFunction, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { NotificationService } from '../services/notificationService.js';
import { config } from '../config/env.js';
import {
  assertBookingTransition,
  BookingService,
  BookingServiceError,
  parseBookingPeriod,
} from '../services/bookingService.js';
import { AvailabilityService } from '../services/availabilityService.js';
import { RESERVED_BOOKING_STATUSES } from '../repositories/bookingRepository.js';
import { AuthenticatedRequest, Booking, BookingStatus } from '../types/index.js';

function usePostgres(): boolean {
  return Boolean(config.databaseUrl);
}

function createBookingService(): BookingService {
  return new BookingService();
}

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class BookingController {
  public static async createBooking(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (!isRequestBody(req.body)) {
      res.status(400).json({
        success: false,
        error: 'Request body must be an object.',
      });
      return;
    }
    const { equipment_id, start_date, end_date, notes } = req.body;

    if (
      typeof equipment_id !== 'string' ||
      typeof start_date !== 'string' ||
      typeof end_date !== 'string' ||
      !equipment_id.trim() ||
      !start_date.trim() ||
      !end_date.trim()
    ) {
      res.status(400).json({
        success: false,
        error: 'equipment_id, start_date, and end_date are required.',
      });
      return;
    }
    if (notes !== undefined && typeof notes !== 'string') {
      res.status(400).json({
        success: false,
        error: 'notes must be a string.',
      });
      return;
    }

    if (usePostgres()) {
      try {
        const result = await createBookingService().createPending({
          renterId: req.user!.id,
          equipmentId: equipment_id,
          startDate: start_date,
          endDate: end_date,
          notes,
        });
        res.status(201).json({
          success: true,
          message: 'Booking request submitted to owner.',
          data: { booking: result.booking },
        });
      } catch (error) {
        if (error instanceof BookingServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
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

    if (equipment.status !== 'active') {
      res.status(400).json({
        success: false,
        error: 'Equipment is not available for booking.',
      });
      return;
    }

    let period: ReturnType<typeof parseBookingPeriod>;
    try {
      period = parseBookingPeriod(start_date, end_date);
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      next(error);
      return;
    }

    const hours = period.hours;
    const basePrice = Math.round(hours * equipment.hourly_rate * 100) / 100;
    const platformFee = Math.round(basePrice * 0.05 * 100) / 100; // 5% platform fee
    const totalPrice = Math.round((basePrice + platformFee) * 100) / 100;

    const newBooking: Booking = {
      id: `book_${uuidv4().substring(0, 8)}`,
      renter_id: req.user!.id,
      equipment_id,
      start_date: period.start,
      end_date: period.end,
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

  public static async getMyRentals(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (usePostgres()) {
      try {
        const results = await createBookingService().getByUser(req.user!.id, 'renter');
        res.status(200).json({
          success: true,
          data: {
            bookings: results.map(({ booking, equipment }) => ({
              ...booking,
              equipment: {
                id: equipment.id,
                title: equipment.title,
                location: equipment.location_name,
                image: equipment.image_url,
              },
            })),
          },
        });
      } catch (error) {
        next(error);
      }
      return;
    }
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

  public static async getMyEquipment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (usePostgres()) {
      try {
        const results = await createBookingService().getByUser(req.user!.id, 'owner');
        res.status(200).json({
          success: true,
          data: {
            bookings: results.map(({ booking, equipment, renter }) => ({
              ...booking,
              renter,
              equipment: {
                id: equipment.id,
                title: equipment.title,
                location: equipment.location_name,
              },
            })),
          },
        });
      } catch (error) {
        next(error);
      }
      return;
    }
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

  public static async getBookingById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    if (usePostgres()) {
      try {
        const result = await createBookingService().getById(id);
        if (!result) {
          res.status(404).json({ success: false, error: 'Booking not found.' });
          return;
        }
        if (
          req.user!.id !== result.booking.renter_id &&
          result.equipment.owner_id !== req.user!.id &&
          !req.user!.is_admin
        ) {
          res.status(403).json({ success: false, error: 'Forbidden: unauthorized booking access.' });
          return;
        }
        res.status(200).json({
          success: true,
          data: {
            booking: result.booking,
            equipment: result.equipment,
            renter: result.renter,
            owner: result.owner,
          },
        });
      } catch (error) {
        next(error);
      }
      return;
    }
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

  public static async updateBookingStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    const { status } = req.body as { status: BookingStatus };

    if (usePostgres()) {
      try {
        const result = await createBookingService().transition(
          id,
          status,
          req.user!.id,
          Boolean(req.user!.is_admin)
        );
        res.status(200).json({
          success: true,
          message: `Booking status transitioned to '${result.booking.status}'.`,
          data: { booking: result.booking },
        });
      } catch (error) {
        if (error instanceof BookingServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }

    try {
      assertBookingTransition('pending', status);
    } catch {
      if (!['accepted', 'rejected', 'cancelled'].includes(status)) {
        res.status(400).json({
          success: false,
          error: `Booking status '${status}' cannot be changed through this endpoint.`,
        });
        return;
      }
    }

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

    try {
      assertBookingTransition(booking.status, status);
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      next(error);
      return;
    }

    // Owner actions
    if (status === 'accepted' || status === 'rejected') {
      if (!isOwner && !isAdmin) {
        res.status(403).json({ success: false, error: 'Only the equipment owner can accept or reject bookings.' });
        return;
      }

      if (status === 'accepted') {
        const bookable = await new AvailabilityService().isBookableInMemory(
          booking.equipment_id,
          booking.start_date,
          booking.end_date
        );
        if (!bookable) {
          res.status(409).json({
            success: false,
            error: 'The booking is outside the equipment availability or falls in a blocked period.',
          });
          return;
        }

        const hasReservedOverlap = Array.from(store.bookings.values()).some(
          (existingBooking) =>
            existingBooking.id !== booking.id &&
            existingBooking.equipment_id === booking.equipment_id &&
            RESERVED_BOOKING_STATUSES.includes(existingBooking.status) &&
            existingBooking.start_date < booking.end_date &&
            existingBooking.end_date > booking.start_date
        );
        if (hasReservedOverlap) {
          res.status(409).json({
            success: false,
            error: 'The equipment is already reserved for an overlapping period.',
          });
          return;
        }
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
    }

    res.status(200).json({
      success: true,
      message: `Booking status transitioned to '${booking.status}'.`,
      data: { booking },
    });
  }
}

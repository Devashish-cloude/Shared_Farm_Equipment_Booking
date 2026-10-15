import { v4 as uuidv4 } from 'uuid';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { TransactionClient, TransactionPool, withTransaction } from '../db/transaction.js';
import {
  BookingContext,
  BookingRepository,
} from '../repositories/bookingRepository.js';
import { AvailabilityRepository } from '../repositories/availabilityRepository.js';
import { Booking, BookingStatus } from '../types/index.js';

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['payment_pending', 'cancelled'],
  payment_pending: ['confirmed', 'payment_failed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'disputed'],
  completed: [],
  rejected: [],
  cancelled: [],
  payment_failed: ['payment_pending', 'cancelled'],
  disputed: ['completed'],
};

export class BookingServiceError extends Error {
  public constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'BookingServiceError';
  }
}

export type CreateBookingInput = {
  renterId: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  notes?: string;
};

export function parseBookingPeriod(startDate: string, endDate: string): {
  start: string;
  end: string;
  hours: number;
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new BookingServiceError('end_date must be later than start_date.', 400);
  }
  const hours = Math.round(((end.getTime() - start.getTime()) / 3600000) * 100) / 100;
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new BookingServiceError('Booking duration must be positive.', 400);
  }
  return { start: start.toISOString(), end: end.toISOString(), hours };
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export const PUBLIC_BOOKING_STATUSES: readonly BookingStatus[] = [
  'accepted',
  'rejected',
  'cancelled',
];

export function assertBookingTransition(from: BookingStatus, to: BookingStatus): void {
  if (!PUBLIC_BOOKING_STATUSES.includes(to) || !TRANSITIONS[from]?.includes(to)) {
    throw new BookingServiceError(
      `Booking cannot transition from '${from}' to '${to}'.`,
      400
    );
  }
}

function notify(
  client: TransactionClient,
  userId: string,
  title: string,
  message: string,
  type: 'booking_request' | 'booking_accepted' | 'booking_rejected',
  bookingId: string
): Promise<unknown> {
  return client.query(
    `INSERT INTO notifications
     (id, user_id, title, message, type, reference_id, reference_type, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'booking', FALSE, CURRENT_TIMESTAMP)`,
    [`notif_${uuidv4().substring(0, 8)}`, userId, title, message, type, bookingId]
  );
}

export class BookingService {
  private readonly pool: DatabasePool;
  private readonly repository: BookingRepository;
  private readonly availabilityRepository: AvailabilityRepository;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
    this.repository = new BookingRepository(pool);
    this.availabilityRepository = new AvailabilityRepository(pool);
  }

  public async createPending(input: CreateBookingInput): Promise<BookingContext> {
    const period = parseBookingPeriod(input.startDate, input.endDate);
    return withTransaction(
      this.pool as TransactionPool,
      async (client) => {
        const equipment = await this.repository.findEquipmentForUpdate(input.equipmentId, client);
        if (!equipment) {
          throw new BookingServiceError('Equipment not found.', 404);
        }
        if (equipment.owner_id === input.renterId) {
          throw new BookingServiceError('You cannot book your own equipment.', 400);
        }
        if (equipment.status !== 'active') {
          throw new BookingServiceError('Equipment is not available for booking.', 400);
        }

        const basePrice = roundCents(period.hours * Number(equipment.hourly_rate));
        const platformFee = roundCents(basePrice * 0.05);
        const now = new Date().toISOString();
        const booking: Booking = {
          id: `book_${uuidv4().substring(0, 8)}`,
          renter_id: input.renterId,
          equipment_id: input.equipmentId,
          start_date: period.start,
          end_date: period.end,
          total_hours: period.hours,
          hourly_rate: Number(equipment.hourly_rate),
          base_price: basePrice,
          platform_fee: platformFee,
          total_price: roundCents(basePrice + platformFee),
          status: 'pending',
          notes: input.notes,
          created_at: now,
          updated_at: now,
        };
        await this.repository.create(booking, client);
        await notify(
          client,
          equipment.owner_id,
          'New Booking Request',
          `${input.renterId} requested to book "${equipment.title}" for ${period.hours} hours.`,
          'booking_request',
          booking.id
        );
        return {
          booking,
          equipment: {
            id: equipment.id,
            owner_id: equipment.owner_id,
            category_id: equipment.category_id ?? undefined,
            title: equipment.title,
            description: equipment.description ?? undefined,
            hourly_rate: Number(equipment.hourly_rate),
            daily_rate: equipment.daily_rate === null ? undefined : Number(equipment.daily_rate),
            location_name: equipment.location_name,
            approx_lat: equipment.approx_lat === null ? undefined : Number(equipment.approx_lat),
            approx_lng: equipment.approx_lng === null ? undefined : Number(equipment.approx_lng),
            status: equipment.status,
            rating_avg: Number(equipment.rating_avg),
            rating_count: Number(equipment.rating_count),
            image_url: equipment.image_url ?? undefined,
            created_at: new Date(equipment.created_at).toISOString(),
            updated_at: new Date(equipment.updated_at).toISOString(),
          },
          owner: { id: equipment.owner_id, fullName: equipment.owner_full_name },
          renter: { id: input.renterId, fullName: input.renterId },
        };
      }
    );
  }

  public async getById(id: string): Promise<BookingContext | undefined> {
    return this.repository.findById(id);
  }

  public async getByUser(
    userId: string,
    role: 'renter' | 'owner'
  ): Promise<BookingContext[]> {
    return this.repository.findByUser(userId, role);
  }

  public async transition(
    id: string,
    requestedStatus: BookingStatus,
    actorId: string,
    isAdmin: boolean
  ): Promise<BookingContext> {
    return withTransaction(
      this.pool as TransactionPool,
      async (client) => {
        const initial = await this.repository.findById(id, client);
        if (!initial) {
          throw new BookingServiceError('Booking not found.', 404);
        }

        const isOwner = initial.equipment.owner_id === actorId;
        const isRenter = initial.booking.renter_id === actorId;
        if (!isOwner && !isRenter && !isAdmin) {
          throw new BookingServiceError('Unauthorized to change booking status.', 403);
        }
        if ((requestedStatus === 'accepted' || requestedStatus === 'rejected') &&
            !isOwner && !isAdmin) {
          throw new BookingServiceError(
            'Only the equipment owner can accept or reject bookings.',
            403
          );
        }
        assertBookingTransition(initial.booking.status, requestedStatus);

        if (requestedStatus === 'accepted') {
          const equipment = await this.repository.findEquipmentForUpdate(
            initial.booking.equipment_id,
            client
          );
          if (!equipment || equipment.status !== 'active') {
            throw new BookingServiceError('Equipment is not available for booking.', 409);
          }
          if (
            !(await this.availabilityRepository.isBookable(
              initial.booking.equipment_id,
              initial.booking.start_date,
              initial.booking.end_date,
              client
            ))
          ) {
            throw new BookingServiceError(
              'The booking is outside the equipment availability or falls in a blocked period.',
              409
            );
          }
          if (
            await this.repository.hasReservedOverlap(
              initial.booking.equipment_id,
              initial.booking.start_date,
              initial.booking.end_date,
              client
            )
          ) {
            throw new BookingServiceError(
              'The booking overlaps an existing reservation.',
              409
            );
          }
        }

        const updated = await this.repository.updateStatus(
          id,
          initial.booking.status,
          requestedStatus,
          client
        );
        if (!updated) {
          throw new BookingServiceError(
            'Booking changed before this request completed.',
            409
          );
        }
        if (requestedStatus === 'accepted' || requestedStatus === 'rejected') {
          await notify(
            client,
            updated.renter_id,
            requestedStatus === 'accepted' ? 'Booking Accepted!' : 'Booking Declined',
            requestedStatus === 'accepted'
              ? `Your booking for "${initial.equipment.title}" was accepted. Please proceed with payment.`
              : `Your booking for "${initial.equipment.title}" was declined by the owner.`,
            requestedStatus === 'accepted' ? 'booking_accepted' : 'booking_rejected',
            updated.id
          );
        }
        const result = await this.repository.findById(id, client);
        if (!result) {
          throw new BookingServiceError('Booking not found after update.', 500);
        }
        return result;
      }
    );
  }
}

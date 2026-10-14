import { v4 as uuidv4 } from 'uuid';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { TransactionPool, withTransaction } from '../db/transaction.js';
import { EquipmentTracking, RentalSession, TrackingSource } from '../types/index.js';
import { BookingContext, BookingRepository } from '../repositories/bookingRepository.js';
import { NotificationQueryClient, NotificationRepository } from '../repositories/notificationRepository.js';
import { RentalSessionRepository } from '../repositories/rentalSessionRepository.js';
import { TrackingRepository } from '../repositories/trackingRepository.js';
import { rentalCompletedWrites, rentalStartedWrites } from './notificationService.js';

export class TrackingServiceError extends Error {
  public constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'TrackingServiceError';
  }
}

function assertCoordinates(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new TrackingServiceError(
      'Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.',
      400
    );
  }
  return { latitude: lat, longitude: lng };
}

function participant(context: BookingContext, userId: string, isAdmin: boolean): boolean {
  return isAdmin || context.booking.renter_id === userId || context.equipment.owner_id === userId;
}

export class TrackingService {
  private readonly pool: DatabasePool;
  private readonly bookings: BookingRepository;
  private readonly sessions: RentalSessionRepository;
  private readonly tracking: TrackingRepository;
  private readonly notifications: NotificationRepository;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
    this.bookings = new BookingRepository(pool);
    this.sessions = new RentalSessionRepository(pool);
    this.tracking = new TrackingRepository(pool);
    this.notifications = new NotificationRepository(pool);
  }

  private async persistRentalNotifications(
    writes: ReturnType<typeof rentalStartedWrites>,
    client: NotificationQueryClient
  ): Promise<void> {
    await this.notifications.createAllIfAbsent(writes, client);
  }

  private async context(bookingId: string, userId: string, isAdmin: boolean, client?: Parameters<typeof this.bookings.findById>[1]): Promise<BookingContext> {
    const result = await this.bookings.findById(bookingId, client);
    if (!result) throw new TrackingServiceError('Booking not found', 404);
    if (!participant(result, userId, isAdmin)) {
      throw new TrackingServiceError('Forbidden: You are not authorized to access or manage tracking for this rental.', 403);
    }
    return result;
  }

  public async start(
    bookingId: string,
    userId: string,
    isAdmin: boolean,
    notes?: string
  ): Promise<{ session: RentalSession; bookingStatus: string }> {
    return withTransaction(this.pool as TransactionPool, async (client) => {
      await client.query('SELECT id FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
      const context = await this.context(bookingId, userId, isAdmin, client);
      if (!['confirmed', 'in_progress'].includes(context.booking.status)) {
        throw new TrackingServiceError(
          `Cannot start rental session. Booking is currently in '${context.booking.status}' state. It must be 'confirmed'.`,
          400
        );
      }
      const active = await this.sessions.findActive(bookingId, client);
      if (active) {
        throw new TrackingServiceError('An active rental tracking session already exists for this booking.', 409);
      }
      const now = new Date().toISOString();
      const session = await this.sessions.create({
        id: `sess_${uuidv4().substring(0, 8)}`,
        booking_id: bookingId,
        started_by: userId,
        start_time: now,
        session_status: 'active',
        notes: notes || 'Rental tracking session initiated.',
        created_at: now,
        updated_at: now,
      }, client);
      let status = context.booking.status;
      if (status === 'confirmed') {
        const updated = await client.query(
          `UPDATE bookings SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1 AND status = 'confirmed' RETURNING id`,
          [bookingId]
        );
        if (updated.rows.length !== 1) {
          throw new TrackingServiceError('Booking changed before rental session started.', 409);
        }
        status = 'in_progress';
      }
      if (context.equipment.approx_lat !== undefined && context.equipment.approx_lng !== undefined) {
        await this.tracking.create({
          id: `trk_${uuidv4().substring(0, 8)}`,
          session_id: session.id,
          booking_id: bookingId,
          latitude: context.equipment.approx_lat,
          longitude: context.equipment.approx_lng,
          source: 'simulated_gps',
          speed_kmh: 0,
          heading_deg: 0,
          recorded_at: now,
          created_at: now,
        }, client);
      }
      await this.persistRentalNotifications(
        rentalStartedWrites(
          bookingId,
          context.equipment.title,
          context.booking.renter_id,
          context.equipment.owner_id
        ),
        client
      );
      return { session, bookingStatus: status };
    });
  }

  public async end(
    bookingId: string,
    userId: string,
    isAdmin: boolean,
    notes?: string
  ): Promise<{ session: RentalSession; bookingStatus: string }> {
    return withTransaction(this.pool as TransactionPool, async (client) => {
      await client.query('SELECT id FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
      const context = await this.context(bookingId, userId, isAdmin, client);
      const active = await this.sessions.findActive(bookingId, client);
      if (!active) {
        throw new TrackingServiceError('No active rental session found for this booking to terminate.', 404);
      }
      if (!['in_progress', 'confirmed'].includes(context.booking.status)) {
        throw new TrackingServiceError(`Booking cannot be completed from status '${context.booking.status}'.`, 400);
      }
      const session = await this.sessions.complete(active.id, notes, client);
      if (!session) throw new TrackingServiceError('Rental session changed before it could be completed.', 409);
      const updated = await client.query(
        `UPDATE bookings SET status = 'completed', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status IN ('in_progress', 'confirmed') RETURNING id`,
        [bookingId]
      );
      if (updated.rows.length !== 1) {
        throw new TrackingServiceError('Booking changed before rental session ended.', 409);
      }
      await this.persistRentalNotifications(
        rentalCompletedWrites(
          bookingId,
          context.equipment.title,
          context.booking.renter_id,
          context.equipment.owner_id
        ),
        client
      );
      return { session, bookingStatus: 'completed' };
    });
  }

  public async ingest(
    bookingId: string,
    userId: string,
    isAdmin: boolean,
    input: { latitude: unknown; longitude: unknown; source?: TrackingSource; speed_kmh?: unknown; heading_deg?: unknown }
  ): Promise<EquipmentTracking> {
    const coordinates = assertCoordinates(input.latitude, input.longitude);
    const validSources: TrackingSource[] = ['simulated_gps', 'device_gps', 'manual'];
    const source = input.source && validSources.includes(input.source) ? input.source : 'simulated_gps';
    return withTransaction(this.pool as TransactionPool, async (client) => {
      const context = await this.context(bookingId, userId, isAdmin, client);
      const session = await this.sessions.findActive(bookingId, client);
      if (!session) {
        throw new TrackingServiceError(
          'Cannot record location update. No active rental session is currently running for this booking.',
          400
        );
      }
      const speed = input.speed_kmh === undefined ? 0 : Number(input.speed_kmh);
      const heading = input.heading_deg === undefined ? 0 : Number(input.heading_deg);
      if (!Number.isFinite(speed) || speed < 0 || !Number.isFinite(heading)) {
        throw new TrackingServiceError('Invalid speed or heading.', 400);
      }
      return this.tracking.create({
        id: `trk_${uuidv4().substring(0, 8)}`,
        session_id: session.id,
        booking_id: context.booking.id,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        source,
        speed_kmh: speed,
        heading_deg: heading,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }, client);
    });
  }

  public async latest(bookingId: string, userId: string, isAdmin: boolean) {
    const context = await this.context(bookingId, userId, isAdmin);
    const [activeSession, latestPoint] = await Promise.all([
      this.sessions.findActive(bookingId),
      this.tracking.latest(bookingId),
    ]);
    return { context, activeSession, latestPoint };
  }

  public async history(bookingId: string, userId: string, isAdmin: boolean) {
    const context = await this.context(bookingId, userId, isAdmin);
    const [activeSession, history] = await Promise.all([
      this.sessions.findActive(bookingId),
      this.tracking.history(bookingId),
    ]);
    return { context, activeSession, history };
  }
}

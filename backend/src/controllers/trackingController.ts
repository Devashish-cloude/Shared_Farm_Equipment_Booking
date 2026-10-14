import { NextFunction, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { NotificationService } from '../services/notificationService.js';
import { config } from '../config/env.js';
import {
  AuthenticatedRequest,
  RentalSession,
  EquipmentTracking,
  TrackingSource,
  Booking,
  Equipment,
} from '../types/index.js';
import { getDatabasePool } from '../db/pool.js';
import { TrackingService, TrackingServiceError } from '../services/trackingService.js';

function usePostgres(): boolean {
  return Boolean(config.databaseUrl);
}

function trackingService(): TrackingService {
  return new TrackingService(getDatabasePool());
}

type AuthorizedBookingResult =
  | { success: false; error: string; status: number }
  | {
      success: true;
      booking: Booking;
      equipment: Equipment;
      isRenter: boolean;
      isOwner: boolean;
      isAdmin: boolean | undefined;
    };

export class TrackingController {
  /**
   * Helper to verify if the authenticated user is an authorized participant
   * (renter, equipment owner, or administrator) of the booking.
   */
  private static getAuthorizedBooking(
    req: AuthenticatedRequest,
    bookingId: string
  ): AuthorizedBookingResult {
    const booking = store.getBookingById(bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found', status: 404 };
    }

    const equipment = store.getEquipmentById(booking.equipment_id);
    if (!equipment) {
      return { success: false, error: 'Associated equipment not found', status: 404 };
    }

    const currentUserId = req.user?.id;
    const isAdmin = req.user?.is_admin;

    const isRenter = currentUserId === booking.renter_id;
    const isOwner = currentUserId === equipment.owner_id;

    if (!isAdmin && !isRenter && !isOwner) {
      return {
        success: false,
        error: 'Forbidden: You are not authorized to access or manage tracking for this rental.',
        status: 403,
      };
    }

    return { success: true, booking, equipment, isRenter, isOwner, isAdmin };
  }

  /**
   * POST /api/rental-sessions/:bookingId/start
   * Start a rental session and activate tracking.
   */
  public static async startSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { bookingId } = req.params;
    const { notes } = req.body;

    if (usePostgres()) {
      try {
        const result = await trackingService().start(
          bookingId,
          req.user!.id,
          Boolean(req.user!.is_admin),
          notes
        );
        res.status(201).json({
          success: true,
          message: 'Rental session started successfully. Live tracking telemetry is now active.',
          data: result,
        });
      } catch (error) {
        if (error instanceof TrackingServiceError) {
          res.status(error.status).json({
            success: false,
            error: error.message,
            ...(error.status === 409 ? { data: undefined } : {}),
          });
          return;
        }
        next(error);
      }
      return;
    }

    const authCheck = TrackingController.getAuthorizedBooking(req, bookingId);
    if (!authCheck.success) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const { booking, equipment } = authCheck;

    // Check valid booking state
    if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
      res.status(400).json({
        success: false,
        error: `Cannot start rental session. Booking is currently in '${booking.status}' state. It must be 'confirmed'.`,
      });
      return;
    }

    // Check if an active session already exists
    const existingActiveSession = store.getActiveRentalSession(booking.id);
    if (existingActiveSession) {
      res.status(409).json({
        success: false,
        error: 'An active rental tracking session already exists for this booking.',
        data: { session: existingActiveSession },
      });
      return;
    }

    // Create new rental session
    const session: RentalSession = {
      id: `sess_${uuidv4().substring(0, 8)}`,
      booking_id: booking.id,
      started_by: req.user!.id,
      start_time: new Date().toISOString(),
      session_status: 'active',
      notes: notes || 'Rental tracking session initiated.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.createRentalSession(session);
    store.updateBookingStatus(booking.id, 'in_progress');

    // Record initial location if equipment has base coordinates
    if (equipment.approx_lat && equipment.approx_lng) {
      const initialPoint: EquipmentTracking = {
        id: `trk_${uuidv4().substring(0, 8)}`,
        session_id: session.id,
        booking_id: booking.id,
        latitude: equipment.approx_lat,
        longitude: equipment.approx_lng,
        source: 'simulated_gps',
        speed_kmh: 0,
        heading_deg: 0,
        recorded_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      store.addTrackingPoint(initialPoint);
    }

    // Trigger in-app notifications
    NotificationService.notifyRentalStarted(
      booking.id,
      equipment.title,
      booking.renter_id,
      equipment.owner_id
    );

    res.status(201).json({
      success: true,
      message: 'Rental session started successfully. Live tracking telemetry is now active.',
      data: {
        session,
        bookingStatus: 'in_progress',
      },
    });
  }

  /**
   * POST /api/rental-sessions/:bookingId/end
   * End an active rental session and conclude tracking.
   */
  public static async endSession(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { bookingId } = req.params;
    const { notes } = req.body;

    if (usePostgres()) {
      try {
        const result = await trackingService().end(
          bookingId,
          req.user!.id,
          Boolean(req.user!.is_admin),
          notes
        );
        res.status(200).json({
          success: true,
          message: 'Rental session ended successfully. Location tracking has ceased.',
          data: result,
        });
      } catch (error) {
        if (error instanceof TrackingServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }

    const authCheck = TrackingController.getAuthorizedBooking(req, bookingId);
    if (!authCheck.success) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const { booking, equipment } = authCheck;

    const activeSession = store.getActiveRentalSession(booking.id);
    if (!activeSession) {
      res.status(404).json({
        success: false,
        error: 'No active rental session found for this booking to terminate.',
      });
      return;
    }

    // Mark session as completed
    activeSession.session_status = 'completed';
    activeSession.end_time = new Date().toISOString();
    if (notes) {
      activeSession.notes = `${activeSession.notes || ''} | End note: ${notes}`;
    }
    store.updateRentalSession(activeSession);

    // Transition booking status to completed
    store.updateBookingStatus(booking.id, 'completed');

    // Trigger in-app notifications
    NotificationService.notifyRentalCompleted(
      booking.id,
      equipment.title,
      booking.renter_id,
      equipment.owner_id
    );

    res.status(200).json({
      success: true,
      message: 'Rental session ended successfully. Location tracking has ceased.',
      data: {
        session: activeSession,
        bookingStatus: 'completed',
      },
    });
  }

  /**
   * POST /api/tracking/location
   * Ingest GPS / simulated telemetry point for an active rental session.
   */
  public static async ingestLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { bookingId, latitude, longitude, source, speed_kmh, heading_deg } = req.body;

    if (!bookingId || latitude === undefined || longitude === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: bookingId, latitude, longitude are mandatory.',
      });
      return;
    }

    if (usePostgres()) {
      try {
        const point = await trackingService().ingest(
          bookingId,
          req.user!.id,
          Boolean(req.user!.is_admin),
          { latitude, longitude, source, speed_kmh, heading_deg }
        );
        res.status(201).json({
          success: true,
          message: 'Telemetry point recorded successfully.',
          data: { point },
        });
      } catch (error) {
        if (error instanceof TrackingServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }

    const authCheck = TrackingController.getAuthorizedBooking(req, bookingId);
    if (!authCheck.success) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const { booking } = authCheck;

    // Check if there is an active session
    const activeSession = store.getActiveRentalSession(booking.id);
    if (!activeSession) {
      res.status(400).json({
        success: false,
        error: 'Cannot record location update. No active rental session is currently running for this booking.',
      });
      return;
    }

    const validSources: TrackingSource[] = ['simulated_gps', 'device_gps', 'manual'];
    const chosenSource: TrackingSource = validSources.includes(source) ? source : 'simulated_gps';

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({
        success: false,
        error: 'Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.',
      });
      return;
    }

    const point: EquipmentTracking = {
      id: `trk_${uuidv4().substring(0, 8)}`,
      session_id: activeSession.id,
      booking_id: booking.id,
      latitude: lat,
      longitude: lng,
      source: chosenSource,
      speed_kmh: speed_kmh !== undefined ? parseFloat(speed_kmh) : 0,
      heading_deg: heading_deg !== undefined ? parseFloat(heading_deg) : 0,
      recorded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    store.addTrackingPoint(point);

    res.status(201).json({
      success: true,
      message: 'Telemetry point recorded successfully.',
      data: { point },
    });
  }

  /**
   * GET /api/tracking/bookings/:bookingId/latest
   * Retrieve latest reported location for authorized participants.
   */
  public static async getLatestLocation(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { bookingId } = req.params;

    if (usePostgres()) {
      try {
        const result = await trackingService().latest(
          bookingId,
          req.user!.id,
          Boolean(req.user!.is_admin)
        );
        const latestPoint = result.latestPoint;
        const diffMs = latestPoint ? Date.now() - new Date(latestPoint.recorded_at).getTime() : 0;
        const staleMinutes = latestPoint ? Math.floor(diffMs / 60000) : 0;
        res.status(200).json({
          success: true,
          data: {
            bookingId: result.context.booking.id,
            equipment: {
              id: result.context.equipment.id,
              title: result.context.equipment.title,
              locationName: result.context.equipment.location_name,
            },
            sessionStatus: result.activeSession
              ? 'active'
              : (result.context.booking.status === 'completed' ? 'completed' : 'inactive'),
            activeSession: result.activeSession || null,
            latestLocation: latestPoint || null,
            isStale: staleMinutes >= config.trackingStaleThresholdMinutes,
            staleMinutes,
            trackingActive: Boolean(result.activeSession),
          },
        });
      } catch (error) {
        if (error instanceof TrackingServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }

    const authCheck = TrackingController.getAuthorizedBooking(req, bookingId);
    if (!authCheck.success) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const { booking, equipment } = authCheck;
    const activeSession = store.getActiveRentalSession(booking.id);
    const latestPoint = store.getLatestTrackingPoint(booking.id);

    let isStale = false;
    let staleMinutes = 0;

    if (latestPoint) {
      const diffMs = Date.now() - new Date(latestPoint.recorded_at).getTime();
      staleMinutes = Math.floor(diffMs / 60000);
      isStale = staleMinutes >= config.trackingStaleThresholdMinutes;
    }

    res.status(200).json({
      success: true,
      data: {
        bookingId: booking.id,
        equipment: {
          id: equipment.id,
          title: equipment.title,
          locationName: equipment.location_name,
        },
        sessionStatus: activeSession ? 'active' : (booking.status === 'completed' ? 'completed' : 'inactive'),
        activeSession: activeSession || null,
        latestLocation: latestPoint || null,
        isStale,
        staleMinutes,
        trackingActive: !!activeSession,
      },
    });
  }

  /**
   * GET /api/tracking/bookings/:bookingId/history
   * Retrieve full coordinate route history for authorized participants.
   */
  public static async getLocationHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const { bookingId } = req.params;

    if (usePostgres()) {
      try {
        const result = await trackingService().history(
          bookingId,
          req.user!.id,
          Boolean(req.user!.is_admin)
        );
        res.status(200).json({
          success: true,
          data: {
            bookingId: result.context.booking.id,
            equipmentId: result.context.equipment.id,
            totalPoints: result.history.length,
            sessionStatus: result.activeSession ? 'active' : 'inactive',
            history: result.history,
          },
        });
      } catch (error) {
        if (error instanceof TrackingServiceError) {
          res.status(error.status).json({ success: false, error: error.message });
          return;
        }
        next(error);
      }
      return;
    }

    const authCheck = TrackingController.getAuthorizedBooking(req, bookingId);
    if (!authCheck.success) {
      res.status(authCheck.status).json({ success: false, error: authCheck.error });
      return;
    }

    const { booking, equipment } = authCheck;
    const history = store.getTrackingHistory(booking.id);
    const activeSession = store.getActiveRentalSession(booking.id);

    res.status(200).json({
      success: true,
      data: {
        bookingId: booking.id,
        equipmentId: equipment.id,
        totalPoints: history.length,
        sessionStatus: activeSession ? 'active' : 'inactive',
        history,
      },
    });
  }
}

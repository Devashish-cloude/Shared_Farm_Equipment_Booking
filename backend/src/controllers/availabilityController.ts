import { NextFunction, Response } from 'express';
import { classifyDatabaseError } from '../db/errors.js';
import { AvailabilityService } from '../services/availabilityService.js';
import { BookingServiceError } from '../services/bookingService.js';
import { AuthenticatedRequest } from '../types/index.js';

function service(): AvailabilityService {
  return new AvailabilityService();
}

function periodBody(req: AuthenticatedRequest): { startDate: string; endDate: string } {
  return {
    startDate: req.body?.start_date,
    endDate: req.body?.end_date,
  };
}

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof BookingServiceError) {
    res.status(error.status).json({ success: false, error: error.message });
    return;
  }
  if (classifyDatabaseError(error) === 'unique_violation') {
    res.status(409).json({ success: false, error: 'This availability period already exists.' });
    return;
  }
  next(error);
}

export class AvailabilityController {
  public static async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await service().list(req.params.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      handleError(error, res, next);
    }
  }

  public static async createAvailability(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const window = await service().createAvailability(
        req.params.id,
        periodBody(req),
        req.user!.id,
        Boolean(req.user!.is_admin)
      );
      res.status(201).json({ success: true, data: { availability: window } });
    } catch (error) {
      handleError(error, res, next);
    }
  }

  public static async deleteAvailability(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await service().deleteAvailability(
        req.params.id,
        req.params.windowId,
        req.user!.id,
        Boolean(req.user!.is_admin)
      );
      res.status(200).json({ success: true, message: 'Availability window deleted.' });
    } catch (error) {
      handleError(error, res, next);
    }
  }

  public static async createBlockedPeriod(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const blocked = await service().createBlockedPeriod(
        req.params.id,
        periodBody(req),
        req.user!.id,
        Boolean(req.user!.is_admin)
      );
      res.status(201).json({ success: true, data: { blockedPeriod: blocked } });
    } catch (error) {
      handleError(error, res, next);
    }
  }

  public static async deleteBlockedPeriod(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await service().deleteBlockedPeriod(
        req.params.id,
        req.params.periodId,
        req.user!.id,
        Boolean(req.user!.is_admin)
      );
      res.status(200).json({ success: true, message: 'Blocked period deleted.' });
    } catch (error) {
      handleError(error, res, next);
    }
  }
}

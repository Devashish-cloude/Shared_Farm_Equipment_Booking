import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { config } from '../config/env.js';
import { classifyDatabaseError } from '../db/errors.js';
import { getDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { AuthenticatedRequest, Equipment, EquipmentStatus } from '../types/index.js';
import { BookingServiceError, parseBookingPeriod } from '../services/bookingService.js';

function usePostgres(): boolean {
  return Boolean(config.databaseUrl);
}

function createEquipmentRepository(): EquipmentRepository {
  return new EquipmentRepository(getDatabasePool());
}

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const allowedStatuses: EquipmentStatus[] = [
  'active',
  'paused',
  'reserved',
  'in_use',
  'maintenance',
  'inactive',
];

function parseNumber(value: unknown, field: string, options: { min?: number; max?: number } = {}): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) ||
      (options.min !== undefined && parsed < options.min) ||
      (options.max !== undefined && parsed > options.max)) {
    throw new BookingServiceError(`Invalid ${field}.`, 400);
  }
  return parsed;
}

function validateEquipmentFields(body: unknown, partial = false): Record<string, unknown> {
  if (!isRequestBody(body)) {
    throw new BookingServiceError('Request body must be an object.', 400);
  }
  const fields: Record<string, unknown> = {};
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.trim().length > 255) {
      throw new BookingServiceError('Title must be a non-empty string of at most 255 characters.', 400);
    }
    fields.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (body.description !== null && (typeof body.description !== 'string' || body.description.length > 5000)) {
      throw new BookingServiceError('Description must be at most 5000 characters.', 400);
    }
    fields.description = body.description;
  }
  if (!partial || body.hourly_rate !== undefined) {
    const hourlyRate = parseNumber(body.hourly_rate, 'hourly_rate', { min: Number.EPSILON });
    if (hourlyRate === undefined) {
      throw new BookingServiceError('hourly_rate is required.', 400);
    }
    fields.hourly_rate = hourlyRate;
  }
  if (body.daily_rate !== undefined) {
    fields.daily_rate = parseNumber(body.daily_rate, 'daily_rate', { min: Number.EPSILON });
  }
  if (!partial || body.location_name !== undefined) {
    if (typeof body.location_name !== 'string' ||
        body.location_name.trim().length === 0 ||
        body.location_name.trim().length > 255) {
      throw new BookingServiceError('Location must be a non-empty string of at most 255 characters.', 400);
    }
    fields.location_name = body.location_name.trim();
  }
  if (body.approx_lat !== undefined) {
    fields.approx_lat = parseNumber(body.approx_lat, 'approx_lat', { min: -90, max: 90 });
  }
  if (body.approx_lng !== undefined) {
    fields.approx_lng = parseNumber(body.approx_lng, 'approx_lng', { min: -180, max: 180 });
  }
  if (body.image_url !== undefined) {
    if (body.image_url !== null &&
        (typeof body.image_url !== 'string' || body.image_url.length > 2048)) {
      throw new BookingServiceError('image_url must be at most 2048 characters.', 400);
    }
    fields.image_url = body.image_url;
  }
  if (body.category_id !== undefined) {
    if (body.category_id !== null &&
        (typeof body.category_id !== 'string' || body.category_id.trim().length === 0)) {
      throw new BookingServiceError('category_id must identify a valid category.', 400);
    }
    fields.category_id = body.category_id;
  }
  return fields;
}

function parseSearchFilters(query: Request['query']): {
  categoryId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: EquipmentStatus;
  startDate?: string;
  endDate?: string;
} {
  const status = query.status as string | undefined;
  if (status && !allowedStatuses.includes(status as EquipmentStatus)) {
    throw new BookingServiceError('Invalid equipment status filter.', 400);
  }
  const minPrice = parseNumber(query.min_price, 'min_price', { min: 0 });
  const maxPrice = parseNumber(query.max_price, 'max_price', { min: 0 });
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new BookingServiceError('min_price cannot exceed max_price.', 400);
  }
  const categoryId = query.category_id as string | undefined;
  const location = query.location as string | undefined;
  if (categoryId !== undefined && (typeof categoryId !== 'string' || categoryId.trim() === '')) {
    throw new BookingServiceError('Invalid category_id filter.', 400);
  }
  if (location !== undefined && (typeof location !== 'string' || location.trim().length > 255)) {
    throw new BookingServiceError('Invalid location filter.', 400);
  }
  const startDate = query.start_date as string | undefined;
  const endDate = query.end_date as string | undefined;
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new BookingServiceError('start_date and end_date must be provided together.', 400);
  }
  if (startDate && endDate) {
    const period = parseBookingPeriod(startDate, endDate);
    return {
      categoryId,
      location: location?.trim(),
      minPrice,
      maxPrice,
      status: status as EquipmentStatus | undefined,
      startDate: period.start,
      endDate: period.end,
    };
  }
  return {
    categoryId,
    location: location?.trim(),
    minPrice,
    maxPrice,
    status: status as EquipmentStatus | undefined,
  };
}

export class EquipmentController {
  public static async getAllEquipment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (usePostgres()) {
      try {
        const results = await createEquipmentRepository().findAvailable(
          undefined,
          parseSearchFilters(req.query)
        );
        res.status(200).json({
          success: true,
          data: { equipment: results.map((result) => result.equipment) },
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
    let filters: ReturnType<typeof parseSearchFilters>;
    try {
      filters = parseSearchFilters(req.query);
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      next(error);
      return;
    }
    const list = store.getAllEquipment().filter((equipment) =>
      (!filters.status ? equipment.status === 'active' : equipment.status === filters.status) &&
      (!filters.categoryId || equipment.category_id === filters.categoryId) &&
      (!filters.location || equipment.location_name.toLowerCase().includes(filters.location.toLowerCase())) &&
      (filters.minPrice === undefined || equipment.hourly_rate >= filters.minPrice) &&
      (filters.maxPrice === undefined || equipment.hourly_rate <= filters.maxPrice) &&
      (!filters.startDate || (() => {
        const windows = store.listAvailability(equipment.id);
        const blocked = store.listBlockedPeriods(equipment.id);
        const withinWindow = windows.length === 0 || windows.some((window) =>
          window.start_date <= filters.startDate! && window.end_date >= filters.endDate!
        );
        const blockedOverlap = blocked.some((period) =>
          period.start_date < filters.endDate! && period.end_date > filters.startDate!
        );
        return withinWindow && !blockedOverlap;
      })())
    );
    res.status(200).json({
      success: true,
      data: {
        equipment: list,
      },
    });
  }

  public static async getEquipmentById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    if (usePostgres()) {
      try {
        const result = await createEquipmentRepository().findById(id);
        if (!result) {
          res.status(404).json({ success: false, error: 'Equipment not found.' });
          return;
        }

        res.status(200).json({
          success: true,
          data: { equipment: result.equipment, owner: result.owner },
        });
      } catch (error) {
        next(error);
      }
      return;
    }
    const eq = store.getEquipmentById(id);
    if (!eq) {
      res.status(404).json({ success: false, error: 'Equipment not found.' });
      return;
    }
    const owner = store.getUserById(eq.owner_id);
    res.status(200).json({
      success: true,
      data: {
        equipment: eq,
        owner: owner ? { id: owner.id, fullName: owner.full_name } : null,
      },
    });
  }

  public static async getCategories(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (usePostgres()) {
      try {
        const categories = await createEquipmentRepository().findCategories();
        res.status(200).json({ success: true, data: { categories } });
      } catch (error) {
        next(error);
      }
      return;
    }
    res.status(200).json({ success: true, data: { categories: store.getCategories() } });
  }

  public static async createEquipment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let fields: Record<string, unknown>;
    try {
      fields = validateEquipmentFields(req.body);
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      next(error);
      return;
    }

    const newEq: Equipment = {
      id: `eq_${uuidv4().substring(0, 8)}`,
      owner_id: req.user!.id,
      title: fields.title as string,
      description: fields.description as string | undefined,
      hourly_rate: fields.hourly_rate as number,
      daily_rate: fields.daily_rate as number | undefined,
      location_name: fields.location_name as string,
      category_id: fields.category_id as string | undefined,
      approx_lat: fields.approx_lat as number | undefined,
      approx_lng: fields.approx_lng as number | undefined,
      status: 'active',
      rating_avg: 5.0,
      rating_count: 0,
      image_url: fields.image_url as string | undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (usePostgres()) {
      try {
        if (fields.category_id !== undefined &&
            fields.category_id !== null &&
            !(await createEquipmentRepository().categoryExists(fields.category_id as string))) {
          res.status(400).json({ success: false, error: 'Category not found.' });
          return;
        }
        const equipment = await createEquipmentRepository().create(newEq);
        res.status(201).json({ success: true, data: { equipment } });
      } catch (error) {
        if (classifyDatabaseError(error) === 'foreign_key_violation') {
          res.status(400).json({
            success: false,
            error: 'Authenticated user or category not found.',
          });
          return;
        }
        next(error);
      }
      return;
    }

    if (fields.category_id !== undefined && fields.category_id !== null &&
        !store.getCategories().some((category) => category.id === fields.category_id)) {
      res.status(400).json({ success: false, error: 'Category not found.' });
      return;
    }
    store.equipment.set(newEq.id, newEq);
    res.status(201).json({ success: true, data: { equipment: newEq } });
  }

  public static async updateEquipment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let fields: Record<string, unknown>;
    try {
      fields = validateEquipmentFields(req.body, true);
    } catch (error) {
      if (error instanceof BookingServiceError) {
        res.status(error.status).json({ success: false, error: error.message });
        return;
      }
      next(error);
      return;
    }
    const id = req.params.id;
    if (usePostgres()) {
      try {
        const repository = createEquipmentRepository();
        const existing = await repository.findById(id);
        if (!existing) {
          res.status(404).json({ success: false, error: 'Equipment not found.' });
          return;
        }
        if (!req.user!.is_admin && existing.equipment.owner_id !== req.user!.id) {
          res.status(403).json({ success: false, error: 'Only the equipment owner or an admin can update equipment.' });
          return;
        }
        if (fields.category_id !== undefined && fields.category_id !== null &&
            !(await repository.categoryExists(fields.category_id as string))) {
          res.status(400).json({ success: false, error: 'Category not found.' });
          return;
        }
        const equipment = await repository.update(id, fields);
        res.status(200).json({ success: true, data: { equipment } });
      } catch (error) {
        if (classifyDatabaseError(error) === 'foreign_key_violation') {
          res.status(400).json({ success: false, error: 'Category not found.' });
          return;
        }
        next(error);
      }
      return;
    }
    const existing = store.getEquipmentById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Equipment not found.' });
      return;
    }
    if (!req.user!.is_admin && existing.owner_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Only the equipment owner or an admin can update equipment.' });
      return;
    }
    if (fields.category_id !== undefined && fields.category_id !== null &&
        !store.getCategories().some((category) => category.id === fields.category_id)) {
      res.status(400).json({ success: false, error: 'Category not found.' });
      return;
    }
    Object.assign(existing, fields);
    existing.updated_at = new Date().toISOString();
    res.status(200).json({ success: true, data: { equipment: existing } });
  }

  public static async deactivateEquipment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const id = req.params.id;
    if (usePostgres()) {
      try {
        const repository = createEquipmentRepository();
        const existing = await repository.findById(id);
        if (!existing) {
          res.status(404).json({ success: false, error: 'Equipment not found.' });
          return;
        }
        if (!req.user!.is_admin && existing.equipment.owner_id !== req.user!.id) {
          res.status(403).json({ success: false, error: 'Only the equipment owner or an admin can deactivate equipment.' });
          return;
        }
        const equipment = await repository.deactivate(id);
        res.status(200).json({ success: true, data: { equipment } });
      } catch (error) {
        next(error);
      }
      return;
    }
    const existing = store.getEquipmentById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Equipment not found.' });
      return;
    }
    if (!req.user!.is_admin && existing.owner_id !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Only the equipment owner or an admin can deactivate equipment.' });
      return;
    }
    existing.status = 'inactive';
    existing.updated_at = new Date().toISOString();
    res.status(200).json({ success: true, data: { equipment: existing } });
  }
}

import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { config } from '../config/env.js';
import { classifyDatabaseError } from '../db/errors.js';
import { getDatabasePool } from '../db/pool.js';
import { EquipmentRepository } from '../repositories/equipmentRepository.js';
import { AuthenticatedRequest, Equipment } from '../types/index.js';

function usePostgres(): boolean {
  return Boolean(config.databaseUrl);
}

function createEquipmentRepository(): EquipmentRepository {
  return new EquipmentRepository(getDatabasePool());
}

export class EquipmentController {
  public static async getAllEquipment(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    if (usePostgres()) {
      try {
        const results = await createEquipmentRepository().findAvailable();
        res.status(200).json({
          success: true,
          data: { equipment: results.map((result) => result.equipment) },
        });
      } catch (error) {
        next(error);
      }
      return;
    }
    const list = store.getAllEquipment();
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

  public static async createEquipment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { title, description, hourly_rate, daily_rate, location_name, approx_lat, approx_lng, image_url } = req.body;
    if (!title || !hourly_rate || !location_name) {
      res.status(400).json({ success: false, error: 'Title, hourly_rate, and location_name are required.' });
      return;
    }

    const newEq: Equipment = {
      id: `eq_${uuidv4().substring(0, 8)}`,
      owner_id: req.user!.id,
      title,
      description,
      hourly_rate: parseFloat(hourly_rate),
      daily_rate: daily_rate ? parseFloat(daily_rate) : undefined,
      location_name,
      approx_lat: approx_lat ? parseFloat(approx_lat) : 20.1983,
      approx_lng: approx_lng ? parseFloat(approx_lng) : 73.8342,
      status: 'active',
      rating_avg: 5.0,
      rating_count: 0,
      image_url: image_url || 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (usePostgres()) {
      try {
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

    store.equipment.set(newEq.id, newEq);
    res.status(201).json({ success: true, data: { equipment: newEq } });
  }
}

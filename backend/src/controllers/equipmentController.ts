import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { AuthenticatedRequest, Equipment } from '../types/index.js';

export class EquipmentController {
  public static getAllEquipment(req: Request, res: Response): void {
    const list = store.getAllEquipment();
    res.status(200).json({
      success: true,
      data: {
        equipment: list,
      },
    });
  }

  public static getEquipmentById(req: Request, res: Response): void {
    const { id } = req.params;
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

  public static createEquipment(req: AuthenticatedRequest, res: Response): void {
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

    store.equipment.set(newEq.id, newEq);
    res.status(201).json({ success: true, data: { equipment: newEq } });
  }
}

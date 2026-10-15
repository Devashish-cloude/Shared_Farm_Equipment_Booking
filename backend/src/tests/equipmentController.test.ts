import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { config } from '../config/env.js';
import { store } from '../services/store.js';

const app = createApp();

function auth(userId: string, isAdmin = false): string {
  return `Bearer ${jwt.sign({
    id: userId,
    email: `${userId}@example.test`,
    full_name: userId,
    is_admin: isAdmin,
  }, config.jwtSecret)}`;
}

describe('equipment marketplace controller', () => {
  beforeEach(() => {
    store.reset();
  });

  it('lists categories and validates category assignment and fields', async () => {
    const categories = await request(app).get('/api/equipment/categories');
    expect(categories.status).toBe(200);
    expect(categories.body.data.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'cat_tractor' })])
    );

    const invalid = await request(app)
      .post('/api/equipment')
      .set('Authorization', auth('user_amit'))
      .send({
        title: 'Invalid',
        hourly_rate: -1,
        location_name: 'Nashik',
      });
    expect(invalid.status).toBe(400);

    const unknownCategory = await request(app)
      .post('/api/equipment')
      .set('Authorization', auth('user_amit'))
      .send({
        title: 'Unknown Category',
        hourly_rate: 500,
        location_name: 'Nashik',
        category_id: 'cat_missing',
      });
    expect(unknownCategory.status).toBe(400);

    const created = await request(app)
      .post('/api/equipment')
      .set('Authorization', auth('user_amit'))
      .send({
        title: 'Category Assigned',
        hourly_rate: 500,
        location_name: 'Nashik',
        category_id: 'cat_sprayer',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.equipment.category_id).toBe('cat_sprayer');
  });

  it('supports owner/admin updates and prevents ownership changes', async () => {
    const ownerUpdate = await request(app)
      .patch('/api/equipment/eq_tractor_rahul')
      .set('Authorization', auth('user_rahul'))
      .send({
        title: 'Updated Tractor',
        hourly_rate: 950,
        owner_id: 'user_amit',
        category_id: 'cat_tractor',
      });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.data.equipment.owner_id).toBe('user_rahul');
    expect(ownerUpdate.body.data.equipment.title).toBe('Updated Tractor');

    const denied = await request(app)
      .patch('/api/equipment/eq_tractor_rahul')
      .set('Authorization', auth('user_amit'))
      .send({ title: 'Unauthorized' });
    expect(denied.status).toBe(403);

    const adminUpdate = await request(app)
      .patch('/api/equipment/eq_tractor_rahul')
      .set('Authorization', auth('user_admin', true))
      .send({ location_name: 'Admin Farm' });
    expect(adminUpdate.status).toBe(200);
    expect(adminUpdate.body.data.equipment.location_name).toBe('Admin Farm');
  });

  it('deactivates without deleting history and filters the fallback marketplace', async () => {
    const deactivated = await request(app)
      .post('/api/equipment/eq_rotavator_amit/deactivate')
      .set('Authorization', auth('user_amit'))
      .send();
    expect(deactivated.status).toBe(200);
    expect(store.getEquipmentById('eq_rotavator_amit')).toBeDefined();
    expect(store.getEquipmentById('eq_rotavator_amit')?.status).toBe('inactive');

    const filtered = await request(app).get(
      '/api/equipment?category_id=cat_tractor&location=Dindori&min_price=800&max_price=1000&status=active'
    );
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.equipment).toEqual([
      expect.objectContaining({ id: 'eq_tractor_rahul' }),
    ]);

    const invalidFilter = await request(app).get('/api/equipment?min_price=1000&max_price=10');
    expect(invalidFilter.status).toBe(400);
  });
});

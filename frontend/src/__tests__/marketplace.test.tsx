import { describe, it, expect } from 'vitest';
import { equipmentService } from '../services/equipment.service';
import { formatCurrency } from '../lib/utils';
import { mockStore } from '../services/mockStore';

describe('Equipment Marketplace Filtering & Calculation', () => {
  it('correctly filters machinery by category', async () => {
    const tractors = await equipmentService.getAll({ category: 'Tractors' });
    expect(tractors.length).toBeGreaterThan(0);
    tractors.forEach((t) => {
      expect(t.category).toBe('Tractors');
    });
  });

  it('correctly searches machinery by keyword', async () => {
    const results = await equipmentService.getAll({ search: 'Mahindra' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain('Mahindra');
  });

  it('correctly filters by operator availability', async () => {
    const withDriver = await equipmentService.getAll({ operatorAvailable: true });
    expect(withDriver.length).toBeGreaterThan(0);
    withDriver.forEach((item) => {
      expect(item.operatorAvailable).toBe(true);
    });
  });

  it('formats Indian Rupee currency correctly', () => {
    const formatted = formatCurrency(4500);
    expect(formatted).toContain('4,500');
  });
});

import { apiClient } from './api';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { Equipment, EquipmentCategory } from '../types';

export interface EquipmentFilterParams {
  search?: string;
  category?: EquipmentCategory | 'All';
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  operatorAvailable?: boolean;
  minRating?: number;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating';
}

export const equipmentService = {
  async getAll(params?: EquipmentFilterParams): Promise<Equipment[]> {
    if (isDemoModeActive()) {
      let list = mockStore.getEquipmentList();

      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          e =>
            e.title.toLowerCase().includes(q) ||
            e.category.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            e.make.toLowerCase().includes(q) ||
            e.model.toLowerCase().includes(q)
        );
      }

      if (params?.category && params.category !== 'All') {
        list = list.filter(e => e.category === params.category);
      }

      if (params?.minPrice !== undefined) {
        list = list.filter(e => e.pricePerHour >= params.minPrice!);
      }

      if (params?.maxPrice !== undefined && params.maxPrice > 0) {
        list = list.filter(e => e.pricePerHour <= params.maxPrice!);
      }

      if (params?.operatorAvailable !== undefined && params.operatorAvailable) {
        list = list.filter(e => e.operatorAvailable);
      }

      if (params?.minRating !== undefined && params.minRating > 0) {
        list = list.filter(e => e.rating >= params.minRating!);
      }

      if (params?.location) {
        const loc = params.location.toLowerCase();
        list = list.filter(
          e =>
            e.location.village.toLowerCase().includes(loc) ||
            e.location.district.toLowerCase().includes(loc) ||
            e.location.state.toLowerCase().includes(loc)
        );
      }

      if (params?.sortBy === 'price_low') {
        list = [...list].sort((a, b) => a.pricePerHour - b.pricePerHour);
      } else if (params?.sortBy === 'price_high') {
        list = [...list].sort((a, b) => b.pricePerHour - a.pricePerHour);
      } else if (params?.sortBy === 'rating') {
        list = [...list].sort((a, b) => b.rating - a.rating);
      }

      return list;
    }

    const res = await apiClient.get<Equipment[]>('/equipment', { params });
    return res.data;
  },

  async getById(id: string): Promise<Equipment | null> {
    if (isDemoModeActive()) {
      const item = mockStore.getEquipmentById(id);
      return item || null;
    }
    const res = await apiClient.get<Equipment>(`/equipment/${id}`);
    return res.data;
  },

  async getMyEquipment(): Promise<Equipment[]> {
    if (isDemoModeActive()) {
      const user = mockStore.getUser();
      return mockStore.getEquipmentList().filter(e => e.ownerId === user.id);
    }
    const res = await apiClient.get<Equipment[]>('/equipment/my-listings');
    return res.data;
  },

  async create(data: Omit<Equipment, 'id' | 'createdAt' | 'rating' | 'reviewCount' | 'completedRentalsCount'>): Promise<Equipment> {
    if (isDemoModeActive()) {
      return mockStore.addEquipment(data);
    }
    const res = await apiClient.post<Equipment>('/equipment', data);
    return res.data;
  },

  async update(id: string, updates: Partial<Equipment>): Promise<Equipment> {
    if (isDemoModeActive()) {
      return mockStore.updateEquipment(id, updates);
    }
    const res = await apiClient.put<Equipment>(`/equipment/${id}`, updates);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    if (isDemoModeActive()) {
      mockStore.deleteEquipment(id);
      return;
    }
    await apiClient.delete(`/equipment/${id}`);
  },

  async toggleStatus(id: string, status: Equipment['status']): Promise<Equipment> {
    return this.update(id, { status });
  },
};

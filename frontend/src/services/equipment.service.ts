import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockStore } from './mockStore';
import { isDemoModeActive } from './auth.service';
import { Equipment, EquipmentCategory } from '../types';
import { getEquipmentCategoryPlaceholder } from '../lib/equipmentImages';

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

/**
 * Maps a Supabase equipment row (and optional joined profile) to the application Equipment type.
 */
export function mapSupabaseEquipment(row: any): Equipment {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : (row.profiles || {});
  const images = Array.isArray(row.images) && row.images.length > 0
    ? row.images
    : (Array.isArray(row.image_urls) && row.image_urls.length > 0 ? row.image_urls : []);

  return {
    id: row.id,
    title: row.title || row.name || 'Untitled Equipment',
    category: row.category as EquipmentCategory,
    description: row.description || '',
    make: row.make || '',
    model: row.model || '',
    year: row.year ? Number(row.year) : new Date().getFullYear(),
    powerHp: row.power_hp ? Number(row.power_hp) : undefined,
    specifications: row.specifications || {
      Engine: row.power_hp ? `${row.power_hp} HP Diesel` : 'Diesel',
      Condition: row.condition || 'Good',
      Model: `${row.make || ''} ${row.model || ''} (${row.year || ''})`.trim(),
    },
    condition: row.condition || 'Good',
    pricePerHour: Number(row.price_per_hour ?? row.hourly_rate ?? 0),
    pricePerDay: Number(row.price_per_day ?? row.daily_rate ?? (row.price_per_hour ? Number(row.price_per_hour) * 8 : 0)),
    securityDeposit: Number(row.security_deposit ?? 0),
    operatorAvailable: Boolean(row.operator_available),
    operatorCostPerHour: Number(row.operator_cost_per_hour ?? 0),
    minRentalHours: Number(row.min_rental_hours ?? 1),
    images: images.length > 0 ? images : [getEquipmentCategoryPlaceholder(row.category)],
    location: {
      village: row.location_village || 'Mogri',
      district: row.location_district || 'Anand',
      state: row.location_state || 'Gujarat',
      approximateCoordinates: [
        row.approx_lat ? Number(row.approx_lat) : 22.5645,
        row.approx_lng ? Number(row.approx_lng) : 72.9289,
      ],
    },
    ownerId: row.owner_id,
    ownerName: profile.full_name || 'Equipment Owner',
    ownerAvatar: profile.avatar_url,
    ownerRating: Number(profile.rating ?? 5.0),
    ownerVerified: profile.verification_status === 'verified',
    ownerPhone: profile.phone,
    status: (row.availability_status || row.status || 'available') as any,
    rating: Number(row.rating ?? row.rating_avg ?? 5.0),
    reviewCount: Number(row.review_count ?? 0),
    completedRentalsCount: Number(row.completed_rentals_count ?? 0),
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export const DEMO_EQUIPMENT_SLUG_MAP: Record<string, string> = {
  'eq-tractor-01': '11111111-1111-4111-8111-111111111101',
  'eq-tractor-02': '11111111-1111-4111-8111-111111111102',
  'eq-harvester-01': '11111111-1111-4111-8111-111111111103',
  'eq-rotavator-01': '11111111-1111-4111-8111-111111111104',
  'eq-seeddrill-01': '11111111-1111-4111-8111-111111111105',
  'eq-sprayer-01': '11111111-1111-4111-8111-111111111106',
  'eq-cultivator-01': '11111111-1111-4111-8111-111111111107',
  'eq-plough-01': '11111111-1111-4111-8111-111111111108',
};

export const DEMO_EQUIPMENT_UUID_TO_SLUG: Record<string, string> = Object.entries(
  DEMO_EQUIPMENT_SLUG_MAP
).reduce((acc, [slug, uuid]) => ({ ...acc, [uuid]: slug }), {});

export const equipmentService = {
  async getAll(params?: EquipmentFilterParams): Promise<Equipment[]> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
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

    try {
      let query = supabase
        .from('equipment')
        .select('*, profiles:owner_id(id, full_name, avatar_url, rating, verification_status, phone)');

      if (params?.category && params.category !== 'All') {
        query = query.eq('category', params.category);
      }
      if (params?.minPrice !== undefined) {
        query = query.gte('price_per_hour', params.minPrice);
      }
      if (params?.maxPrice !== undefined && params.maxPrice > 0) {
        query = query.lte('price_per_hour', params.maxPrice);
      }
      if (params?.operatorAvailable) {
        query = query.eq('operator_available', true);
      }
      if (params?.minRating !== undefined && params.minRating > 0) {
        query = query.gte('rating', params.minRating);
      }
      if (params?.search) {
        const s = params.search.trim();
        query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,make.ilike.%${s}%,model.ilike.%${s}%`);
      }
      if (params?.location) {
        const loc = params.location.trim();
        query = query.or(`location_village.ilike.%${loc}%,location_district.ilike.%${loc}%,location_state.ilike.%${loc}%`);
      }

      if (params?.sortBy === 'price_low') {
        query = query.order('price_per_hour', { ascending: true });
      } else if (params?.sortBy === 'price_high') {
        query = query.order('price_per_hour', { ascending: false });
      } else if (params?.sortBy === 'rating') {
        query = query.order('rating', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map(mapSupabaseEquipment);
      }

      // If Supabase table is empty, smoothly fallback to mock store listings
      if (!error && (!data || data.length === 0)) {
        return mockStore.getEquipmentList();
      }

      if (error) {
        // Fallback to select without profile join if foreign key naming differs
        const simpleQuery = await supabase.from('equipment').select('*');
        if (!simpleQuery.error && simpleQuery.data && simpleQuery.data.length > 0) {
          return simpleQuery.data.map(mapSupabaseEquipment);
        }
        return mockStore.getEquipmentList();
      }

      return (data || []).map(mapSupabaseEquipment);
    } catch (err: any) {
      console.warn('Notice: falling back to demo equipment:', err?.message || err);
      return mockStore.getEquipmentList();
    }
  },

  async getById(id: string): Promise<Equipment | null> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      const item = mockStore.getEquipmentById(id);
      return item || null;
    }

    const resolvedId = DEMO_EQUIPMENT_SLUG_MAP[id] || id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedId);

    if (isUuid) {
      try {
        const { data, error } = await supabase
          .from('equipment')
          .select('*, profiles:owner_id(id, full_name, avatar_url, rating, verification_status, phone)')
          .eq('id', resolvedId)
          .maybeSingle();

        if (data) {
          return mapSupabaseEquipment(data);
        }

        if (error) {
          const simple = await supabase.from('equipment').select('*').eq('id', resolvedId).maybeSingle();
          if (simple.data) {
            return mapSupabaseEquipment(simple.data);
          }
        }
      } catch (err) {
        console.warn(`Notice: query for equipment ${resolvedId}:`, err);
      }
    }

    // Gracefully fallback to mockStore demo item if not found in Supabase
    const fallbackSlug = DEMO_EQUIPMENT_UUID_TO_SLUG[id] || id;
    const fallbackItem = mockStore.getEquipmentById(fallbackSlug);
    if (fallbackItem) {
      return fallbackItem;
    }

    return null;
  },

  async getMyEquipment(ownerId?: string): Promise<Equipment[]> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      const user = mockStore.getActiveUser();
      const targetId = ownerId || user?.id;
      if (!targetId) return [];
      return mockStore.getEquipmentList().filter(e => e.ownerId === targetId);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = ownerId || sessionData?.session?.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('equipment')
        .select('*, profiles:owner_id(id, full_name, avatar_url, rating, verification_status, phone)')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        const fallback = await supabase
          .from('equipment')
          .select('*')
          .eq('owner_id', userId)
          .order('created_at', { ascending: false });
        if (fallback.error) throw new Error(fallback.error.message);
        return (fallback.data || []).map(mapSupabaseEquipment);
      }

      return (data || []).map(mapSupabaseEquipment);
    } catch (err: any) {
      console.error('Failed to fetch user equipment from Supabase:', err);
      throw new Error(err.message || 'Failed to load your equipment');
    }
  },

  async create(data: Omit<Equipment, 'id' | 'createdAt' | 'rating' | 'reviewCount' | 'completedRentalsCount'>): Promise<Equipment> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      const activeUser = mockStore.getActiveUser();
      const payload = {
        ...data,
        ownerId: activeUser?.id || data.ownerId || 'usr-farmer',
        ownerName: activeUser?.name || data.ownerName || 'Equipment Owner',
      };
      return mockStore.addEquipment(payload);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) {
      throw new Error('Authentication required to create an equipment listing.');
    }

    const dbPayload = {
      owner_id: userId,
      title: data.title,
      name: data.title,
      category: data.category,
      description: data.description,
      make: data.make,
      model: data.model,
      year: data.year,
      power_hp: data.powerHp || null,
      condition: data.condition,
      price_per_hour: data.pricePerHour,
      hourly_rate: data.pricePerHour,
      price_per_day: data.pricePerDay || data.pricePerHour * 8,
      daily_rate: data.pricePerDay || data.pricePerHour * 8,
      security_deposit: data.securityDeposit || 0,
      operator_available: Boolean(data.operatorAvailable),
      operator_cost_per_hour: data.operatorCostPerHour || 0,
      min_rental_hours: data.minRentalHours || 1,
      images: data.images || [],
      image_urls: data.images || [],
      location_village: data.location?.village || null,
      location_district: data.location?.district || null,
      location_state: data.location?.state || null,
      location_name: `${data.location?.village || ''}, ${data.location?.district || ''}`.replace(/^,\s*|,\s*$/g, ''),
      approx_lat: data.location?.approximateCoordinates?.[0] || null,
      approx_lng: data.location?.approximateCoordinates?.[1] || null,
      availability_status: data.status || 'available',
      status: data.status || 'available',
    };

    const { data: inserted, error } = await supabase
      .from('equipment')
      .insert(dbPayload)
      .select('*, profiles:owner_id(id, full_name, avatar_url, rating, verification_status, phone)')
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return mapSupabaseEquipment(inserted);
  },

  async update(id: string, updates: Partial<Equipment>): Promise<Equipment> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      return mockStore.updateEquipment(id, updates);
    }

    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) {
      dbUpdates.title = updates.title;
      dbUpdates.name = updates.title;
    }
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.make !== undefined) dbUpdates.make = updates.make;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.year !== undefined) dbUpdates.year = updates.year;
    if (updates.powerHp !== undefined) dbUpdates.power_hp = updates.powerHp;
    if (updates.condition !== undefined) dbUpdates.condition = updates.condition;
    if (updates.pricePerHour !== undefined) {
      dbUpdates.price_per_hour = updates.pricePerHour;
      dbUpdates.hourly_rate = updates.pricePerHour;
    }
    if (updates.pricePerDay !== undefined) {
      dbUpdates.price_per_day = updates.pricePerDay;
      dbUpdates.daily_rate = updates.pricePerDay;
    }
    if (updates.securityDeposit !== undefined) dbUpdates.security_deposit = updates.securityDeposit;
    if (updates.operatorAvailable !== undefined) dbUpdates.operator_available = updates.operatorAvailable;
    if (updates.operatorCostPerHour !== undefined) dbUpdates.operator_cost_per_hour = updates.operatorCostPerHour;
    if (updates.minRentalHours !== undefined) dbUpdates.min_rental_hours = updates.minRentalHours;
    if (updates.images !== undefined) {
      dbUpdates.images = updates.images;
      dbUpdates.image_urls = updates.images;
    }
    if (updates.status !== undefined) {
      dbUpdates.status = updates.status;
      dbUpdates.availability_status = updates.status;
    }
    if (updates.location !== undefined) {
      if (updates.location.village) dbUpdates.location_village = updates.location.village;
      if (updates.location.district) dbUpdates.location_district = updates.location.district;
      if (updates.location.state) dbUpdates.location_state = updates.location.state;
      if (updates.location.approximateCoordinates) {
        dbUpdates.approx_lat = updates.location.approximateCoordinates[0];
        dbUpdates.approx_lng = updates.location.approximateCoordinates[1];
      }
    }

    const { data: updated, error } = await supabase
      .from('equipment')
      .update(dbUpdates)
      .eq('id', id)
      .select('*, profiles:owner_id(id, full_name, avatar_url, rating, verification_status, phone)')
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return mapSupabaseEquipment(updated);
  },

  async delete(id: string): Promise<void> {
    if (isDemoModeActive() || !isSupabaseConfigured()) {
      mockStore.deleteEquipment(id);
      return;
    }

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  },

  async toggleStatus(id: string, status: Equipment['status']): Promise<Equipment> {
    return this.update(id, { status });
  },
};

import { describe, it, expect } from 'vitest';
import { normalizeLanguageCode, translations, SUPPORTED_LANGUAGES } from '../i18n/translations';
import { isSupabaseConfigured, getSupabaseMissingError } from '../lib/supabase';
import { mapSupabaseEquipment } from '../services/equipment.service';
import { mapSupabaseBooking } from '../services/bookings.service';
import { storageService } from '../services/storage.service';

describe('Internationalization & Multi-language System', () => {
  it('correctly normalizes language codes from English, Hindi, Gujarati, Punjabi, and Marathi inputs', () => {
    expect(normalizeLanguageCode('English')).toBe('en');
    expect(normalizeLanguageCode('en')).toBe('en');
    expect(normalizeLanguageCode('हिन्दी (Hindi)')).toBe('hi');
    expect(normalizeLanguageCode('Hindi')).toBe('hi');
    expect(normalizeLanguageCode('hi')).toBe('hi');
    expect(normalizeLanguageCode('ગુજરાતી (Gujarati)')).toBe('gu');
    expect(normalizeLanguageCode('Gujarati')).toBe('gu');
    expect(normalizeLanguageCode('gu')).toBe('gu');
    expect(normalizeLanguageCode('ਪੰਜਾਬੀ (Punjabi)')).toBe('pa');
    expect(normalizeLanguageCode('Punjabi')).toBe('pa');
    expect(normalizeLanguageCode('pa')).toBe('pa');
    expect(normalizeLanguageCode('मराठी (Marathi)')).toBe('mr');
    expect(normalizeLanguageCode('Marathi')).toBe('mr');
    expect(normalizeLanguageCode('mr')).toBe('mr');
  });

  it('contains essential keys across all 5 supported languages without empty values', () => {
    const requiredKeys = [
      'nav.explore',
      'nav.howItWorks',
      'nav.listEquipment',
      'nav.login',
      'nav.getStarted',
      'hero.badge',
      'hero.title',
      'hero.subtitle',
      'hero.location',
      'hero.machineryType',
      'hero.allCategories',
      'cat.tractors',
      'cat.harvesters',
      'how.title',
    ];

    const langCodes: Array<'en' | 'hi' | 'gu' | 'pa' | 'mr'> = ['en', 'hi', 'gu', 'pa', 'mr'];

    for (const code of langCodes) {
      const dict = translations[code];
      expect(dict, `Dictionary for ${code} must exist`).toBeDefined();
      for (const key of requiredKeys) {
        expect(dict[key], `Missing translation key "${key}" in language "${code}"`).toBeTruthy();
        expect(dict[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('lists all 5 official languages in SUPPORTED_LANGUAGES', () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(5);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('hi');
    expect(codes).toContain('gu');
    expect(codes).toContain('pa');
    expect(codes).toContain('mr');
  });
});

describe('Supabase Client & Data Harmonization', () => {
  it('correctly reports configuration state and actionable setup message', () => {
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe('boolean');

    const err = getSupabaseMissingError();
    expect(err).toContain('VITE_SUPABASE_URL');
    expect(err).toContain('VITE_SUPABASE_ANON_KEY');
  });

  it('safely maps raw Supabase equipment rows to application Equipment type', () => {
    const rawRow = {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      title: 'John Deere 5050 D',
      category: 'Tractors',
      description: '50 HP heavy tractor',
      make: 'John Deere',
      model: '5050 D',
      year: 2022,
      power_hp: 50,
      condition: 'Excellent',
      price_per_hour: 520,
      price_per_day: 3800,
      security_deposit: 2500,
      operator_available: true,
      operator_cost_per_hour: 150,
      min_rental_hours: 4,
      images: ['https://images.unsplash.com/tractor1.jpg'],
      location_village: 'Mogri',
      location_district: 'Anand',
      location_state: 'Gujarat',
      approx_lat: 22.5645,
      approx_lng: 72.9289,
      availability_status: 'available',
      rating: 4.9,
      review_count: 8,
      completed_rentals_count: 14,
      profiles: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        full_name: 'Suresh Patel',
        avatar_url: 'https://images.unsplash.com/owner.jpg',
        rating: 4.9,
        verification_status: 'verified',
        phone: '+91 98250 11223',
      },
    };

    const mapped = mapSupabaseEquipment(rawRow);
    expect(mapped.id).toBe(rawRow.id);
    expect(mapped.title).toBe('John Deere 5050 D');
    expect(mapped.category).toBe('Tractors');
    expect(mapped.pricePerHour).toBe(520);
    expect(mapped.pricePerDay).toBe(3800);
    expect(mapped.ownerName).toBe('Suresh Patel');
    expect(mapped.ownerVerified).toBe(true);
    expect(mapped.location.village).toBe('Mogri');
    expect(mapped.location.approximateCoordinates).toEqual([22.5645, 72.9289]);
  });

  it('safely maps raw Supabase booking rows with disambiguated renter and owner profiles', () => {
    const rawBooking = {
      id: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      equipment_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      renter_id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
      owner_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      start_date: '2026-10-20T08:00:00Z',
      end_date: '2026-10-20T16:00:00Z',
      duration_hours: 8,
      with_operator: true,
      base_price: 4160,
      operator_price: 1200,
      platform_fee: 268,
      security_deposit: 2500,
      total_price: 8128,
      status: 'pending',
      payment_status: 'pending',
      equipment: {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        title: 'John Deere 5050 D',
        category: 'Tractors',
        images: ['https://images.unsplash.com/tractor1.jpg'],
      },
      renter: {
        id: 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
        full_name: 'Devashish Farmer',
        phone: '+91 99000 11222',
        village: 'Navli',
      },
      owner: {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        full_name: 'Suresh Patel',
        phone: '+91 98250 11223',
      },
    };

    const mapped = mapSupabaseBooking(rawBooking);
    expect(mapped.id).toBe(rawBooking.id);
    expect(mapped.equipmentName).toBe('John Deere 5050 D');
    expect(mapped.renterName).toBe('Devashish Farmer');
    expect(mapped.ownerName).toBe('Suresh Patel');
    expect(mapped.durationHours).toBe(8);
    expect(mapped.withOperator).toBe(true);
    expect(mapped.totalPrice).toBe(8128);
    expect(mapped.status).toBe('pending');
  });

  it('rejects image files exceeding 5MB or invalid mime types', async () => {
    // Large file test
    const oversizedFile = new File(['a'.repeat(6 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    await expect(storageService.uploadEquipmentImage(oversizedFile, 'test-uid')).rejects.toThrow();

    // Invalid mime type test
    const invalidFile = new File(['executable'], 'script.exe', { type: 'application/octet-stream' });
    await expect(storageService.uploadEquipmentImage(invalidFile, 'test-uid')).rejects.toThrow();
  });
});

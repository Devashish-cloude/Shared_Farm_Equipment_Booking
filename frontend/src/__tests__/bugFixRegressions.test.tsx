import { describe, it, expect, beforeEach } from 'vitest';
import { authService, isDemoModeActive, mapProfileToUser } from '../services/auth.service';
import { mockStore } from '../services/mockStore';
import { equipmentService } from '../services/equipment.service';
import { bookingsService } from '../services/bookings.service';
import { paymentsService } from '../services/payments.service';
import { translations, SUPPORTED_LANGUAGES } from '../i18n/translations';
import { getAvatarUrl } from '../lib/avatar';
import {
  CATEGORY_IMAGE_MAP,
  getEquipmentCategoryPlaceholder,
  resolveEquipmentImage,
} from '../lib/equipmentImages';
import { INDIAN_STATES_DISTRICTS, getDistrictsForState } from '../lib/indianLocations';

describe('Production Bug Fixes & Regression Test Suite', () => {
  beforeEach(async () => {
    // Clear storage before each test to simulate fresh state
    localStorage.clear();
    sessionStorage.clear();
    mockStore.setActiveUser(null);
  });

  // --------------------------------------------------------------------------
  // TEST A: FIRST-TIME VISITOR (BUG 1)
  // --------------------------------------------------------------------------
  describe('Test A: First-Time Visitor Experience (Bug 1)', () => {
    it('ensures a clean visitor session does NOT automatically sign in as Ramesh or any demo user', async () => {
      // No token in localStorage
      expect(localStorage.getItem('shared_farm_token')).toBeNull();

      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('defaults demo mode to inactive so live visitors are guests', () => {
      expect(isDemoModeActive()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // TEST B & C: USER A & USER B ISOLATION AND CLEAN DASHBOARD (BUGS 2 & 3)
  // --------------------------------------------------------------------------
  describe('Test B & C: Multi-User Data Isolation (Bugs 2 & 3)', () => {
    it('registers User A (Rajesh Patil) with isolated, empty dashboard records', async () => {
      const userA = await authService.register({
        name: 'Rajesh Patil',
        email: 'rajesh.patil@test.farm',
        phone: '+91 98220 12345',
        location: { village: 'Dindori', district: 'Nashik', state: 'Maharashtra' },
        password: 'password123',
      });

      expect(userA).toBeDefined();
      expect(userA.name).toBe('Rajesh Patil');
      expect(userA.id).not.toBe('usr-ramesh-01');

      // Newly registered user must NOT inherit old demo equipment
      const userAEquipment = await equipmentService.getMyEquipment(userA.id);
      expect(userAEquipment).toEqual([]);

      // Newly registered user must NOT inherit old demo rentals or requests
      const userARentals = await bookingsService.getMyRentals(userA.id);
      expect(userARentals).toEqual([]);

      const userARequests = await bookingsService.getMyRequests(userA.id);
      expect(userARequests).toEqual([]);
    });

    it('ensures User B does not see User A equipment or private bookings', async () => {
      // 1. Create User A and add an equipment listing
      const userA = await authService.register({
        name: 'User A',
        email: 'user.a@test.farm',
        phone: '+91 98220 11111',
        location: { village: 'Village A', district: 'Pune', state: 'Maharashtra' },
        password: 'password123',
      });

      const userAEquip = await equipmentService.create({
        title: 'User A Rotavator 7 Feet',
        category: 'Rotavators',
        description: 'Heavy duty rotary tiller for soil preparation',
        make: 'Shaktiman',
        model: 'Semi Champion',
        year: 2024,
        condition: 'Excellent',
        pricePerHour: 350,
        pricePerDay: 2500,
        securityDeposit: 1500,
        operatorAvailable: false,
        operatorCostPerHour: 0,
        minRentalHours: 2,
        images: [],
        specifications: { Engine: '45 HP', Condition: 'Excellent' },
        location: { village: 'Village A', district: 'Pune', state: 'Maharashtra', approximateCoordinates: [18.5204, 73.8567] },
        ownerId: userA.id,
        ownerName: userA.name,
        ownerRating: 5.0,
        ownerVerified: true,
        status: 'available',
      });

      expect(userAEquip.ownerId).toBe(userA.id);

      // Verify User A has 1 listing
      const aListings = await equipmentService.getMyEquipment(userA.id);
      expect(aListings.length).toBe(1);
      expect(aListings[0].id).toBe(userAEquip.id);

      // 2. Create independent User B
      await authService.logout();
      const userB = await authService.register({
        name: 'User B',
        email: 'user.b@test.farm',
        phone: '+91 98220 22222',
        location: { village: 'Village B', district: 'Satara', state: 'Maharashtra' },
        password: 'password123',
      });

      // User B must start completely empty
      const bListings = await equipmentService.getMyEquipment(userB.id);
      expect(bListings).toEqual([]);

      const bRentals = await bookingsService.getMyRentals(userB.id);
      expect(bRentals).toEqual([]);

      const bRequests = await bookingsService.getMyRequests(userB.id);
      expect(bRequests).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // TEST D: COMPREHENSIVE TRANSLATIONS & FORMS (BUGS 6 & 7)
  // --------------------------------------------------------------------------
  describe('Test D: Internationalization & Form Translations (Bugs 6 & 7)', () => {
    it('contains all auth and equipment form keys in Marathi (mr)', () => {
      const mr = translations.mr;
      expect(mr).toBeDefined();

      // Login form keys
      expect(mr['auth.login.title']).toBe('शेअर्ड फार्मवर पुन्हा स्वागत आहे');
      expect(mr['auth.login.emailLabel']).toBe('ईमेल किंवा मोबाईल नंबर');
      expect(mr['auth.login.passwordLabel']).toBe('पासवर्ड');
      expect(mr['auth.login.submitBtn']).toBe('शेतकरी खात्यात साइन इन करा');
      expect(mr['auth.login.forgotPassword']).toBe('पासवर्ड विसरलात?');

      // Register form keys
      expect(mr['auth.register.title']).toBe('संयुक्त शेतकरी खाते तयार करा');
      expect(mr['auth.register.fullName']).toBe('पूर्ण नाव *');
      expect(mr['auth.register.phone']).toBe('मोबाईल नंबर *');
      expect(mr['auth.register.email']).toBe('ईमेल पत्ता *');
      expect(mr['auth.register.submitBtn']).toBe('विनामूल्य शेतकरी खाते तयार करा');

      // Equipment form keys
      expect(mr['equipForm.basicInfo']).toBe('मूलभूत माहिती');
      expect(mr['equipForm.titleLabel']).toBe('उपकरण सूचीचे शीर्षक *');
      expect(mr['equipForm.categoryLabel']).toBe('प्रवर्ग *');
      expect(mr['equipForm.conditionLabel']).toBe('स्थिती *');
      expect(mr['equipForm.makeLabel']).toBe('उत्पादक / कंपनी *');
      expect(mr['equipForm.modelLabel']).toBe('मॉडेल नाव / क्रमांक *');
      expect(mr['equipForm.hourlyRate']).toBe('तासाचा दर (₹/तास) *');
      expect(mr['equipForm.dailyRate']).toBe('दैनिक दर (₹/दिवस) *');
      expect(mr['equipForm.submitCreate']).toBe('बाजारपेठेत उपकरण प्रकाशित करा');
      expect(mr['equip.addTitle']).toBe('भाड्याने देण्यासाठी उपकरण जोडा');
    });

    it('contains all auth and equipment form keys in Hindi (hi)', () => {
      const hi = translations.hi;
      expect(hi).toBeDefined();

      expect(hi['auth.login.title']).toBe('शेअर्ड फार्म पर पुनः स्वागत है');
      expect(hi['auth.register.title']).toBe('एकीकृत किसान खाता बनाएं');
      expect(hi['equipForm.titleLabel']).toBe('उपकरण सूची शीर्षक *');
      expect(hi['equip.addTitle']).toBe('साझा करने के लिए उपकरण जोड़ें');
    });

    it('contains all auth and equipment form keys across all 5 languages without empty keys', () => {
      const keysToCheck = [
        'auth.login.title',
        'auth.login.emailLabel',
        'auth.login.passwordLabel',
        'auth.login.submitBtn',
        'auth.register.title',
        'auth.register.fullName',
        'auth.register.phone',
        'auth.register.submitBtn',
        'equipForm.titleLabel',
        'equipForm.categoryLabel',
        'equipForm.conditionLabel',
        'equipForm.makeLabel',
        'equipForm.hourlyRate',
        'equipForm.dailyRate',
        'equipForm.submitCreate',
        'equip.addTitle',
      ];

      for (const lang of SUPPORTED_LANGUAGES) {
        const dict = translations[lang.code as keyof typeof translations];
        expect(dict, `Translation dictionary for ${lang.code} should exist`).toBeDefined();
        for (const key of keysToCheck) {
          expect(dict[key], `Language ${lang.code} missing key "${key}"`).toBeDefined();
          expect(dict[key].trim().length, `Language ${lang.code} key "${key}" is empty`).toBeGreaterThan(0);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // TEST E: EQUIPMENT IMAGES CATEGORY RESOLUTION (BUG 8)
  // --------------------------------------------------------------------------
  describe('Test E: Equipment Category Image Resolution (Bug 8)', () => {
    it('provides category-specific verified placeholder images that do NOT show tractors for rotavators or sprayers', () => {
      const tractorImg = getEquipmentCategoryPlaceholder('Tractors');
      const rotavatorImg = getEquipmentCategoryPlaceholder('Rotavators');
      const sprayerImg = getEquipmentCategoryPlaceholder('Sprayers');
      const harvesterImg = getEquipmentCategoryPlaceholder('Harvesters');

      expect(rotavatorImg).not.toEqual(tractorImg);
      expect(sprayerImg).not.toEqual(tractorImg);
      expect(harvesterImg).not.toEqual(tractorImg);

      expect(rotavatorImg).toBe(CATEGORY_IMAGE_MAP.Rotavators);
      expect(sprayerImg).toBe(CATEGORY_IMAGE_MAP.Sprayers);
      expect(harvesterImg).toBe(CATEGORY_IMAGE_MAP.Harvesters);
      expect(tractorImg).toBe(CATEGORY_IMAGE_MAP.Tractors);
    });

    it('resolves equipment images correctly using resolveEquipmentImage', () => {
      // 1. Explicit photo provided -> returns that photo
      const customUrl = 'https://custom-storage.supabase.co/my-rotavator.jpg';
      expect(resolveEquipmentImage([customUrl], 'Rotavators')).toBe(customUrl);

      // 2. Empty photos array -> returns category placeholder
      expect(resolveEquipmentImage([], 'Rotavators')).toBe(CATEGORY_IMAGE_MAP.Rotavators);
      expect(resolveEquipmentImage([], 'Sprayers')).toBe(CATEGORY_IMAGE_MAP.Sprayers);
    });
  });

  // --------------------------------------------------------------------------
  // TEST F: NEUTRAL AVATAR RESOLUTION (BUG 5)
  // --------------------------------------------------------------------------
  describe('Test F: Neutral Initials Avatar Resolution (Bug 5)', () => {
    it('generates an SVG data URI with user initials when avatar is undefined or empty', () => {
      const avatarUrl = getAvatarUrl(undefined, 'Rajesh Patil');
      expect(avatarUrl).toContain('data:image/svg+xml;utf8');
      expect(avatarUrl).toContain('RP'); // Rajesh Patil initials
      expect(avatarUrl).not.toContain('images.unsplash.com'); // Never leaks Ramesh's photo!
    });

    it('preserves user uploaded avatar when one is provided', () => {
      const customPhoto = 'https://supabase.co/storage/v1/object/public/avatars/user123/avatar.png';
      expect(getAvatarUrl(customPhoto, 'Rajesh Patil')).toBe(customPhoto);
    });

    it('handles single-word names and empty names gracefully', () => {
      const singleWord = getAvatarUrl('', 'Farmer');
      expect(singleWord).toContain('FA');

      const emptyName = getAvatarUrl('', '');
      expect(emptyName).toContain('FA'); // Defaults to Farmer -> FA
    });
  });

  // --------------------------------------------------------------------------
  // TEST G: LOCATION CASCADE VALIDATION (BUG 9)
  // --------------------------------------------------------------------------
  describe('Test G: Indian State & District Location Hierarchy (Bug 9)', () => {
    it('provides valid districts for major agricultural states', () => {
      const mhDistricts = getDistrictsForState('Maharashtra');
      expect(mhDistricts).toContain('Nashik');
      expect(mhDistricts).toContain('Pune');
      expect(mhDistricts).toContain('Kolhapur');
      expect(mhDistricts).not.toContain('Anand'); // Anand is Gujarat!

      const gjDistricts = getDistrictsForState('Gujarat');
      expect(gjDistricts).toContain('Anand');
      expect(gjDistricts).toContain('Kheda');
      expect(gjDistricts).not.toContain('Nashik');

      const pbDistricts = getDistrictsForState('Punjab');
      expect(pbDistricts).toContain('Ludhiana');
      expect(pbDistricts).toContain('Sangrur');
    });

    it('falls back to default districts if an unknown state is passed', () => {
      const fallback = getDistrictsForState('Unknown State');
      expect(fallback.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // TEST I: UNDEFINED USER PROPERTIES & SAFE SPLIT FALLBACKS
  // --------------------------------------------------------------------------
  describe('Test I: Safe User Properties & Split Fallbacks', () => {
    it('gracefully handles user with undefined name and location in mapProfileToUser', () => {
      const user = mapProfileToUser({}, {});
      expect(user.name).toBe('Farmer');
      expect(user.name.split(' ')[0]).toBe('Farmer');
      expect(user.location).toBeDefined();
      expect(user.location.village).toBe('Farm Village');
    });

    it('gracefully handles reversed args in mapProfileToUser', () => {
      const profile = { id: 'prof-123', full_name: 'Harpreet Singh', village: 'Khanna' };
      const user = mapProfileToUser(profile, 'harpreet@test.farm');
      expect(user.name).toBe('Harpreet Singh');
      expect(user.location.village).toBe('Khanna');
      expect(user.name.split(' ')[0]).toBe('Harpreet');
    });

    it('getAvatarUrl never throws when name is undefined or empty', () => {
      expect(() => getAvatarUrl(undefined, undefined)).not.toThrow();
      expect(() => getAvatarUrl('', '')).not.toThrow();
      const svg = getAvatarUrl(null, undefined);
      expect(svg).toContain('data:image/svg+xml');
    });

    it('mockStore ensures safe name and location even if raw session storage is corrupted', () => {
      sessionStorage.setItem('sf_active_user', JSON.stringify({ id: 'usr-empty' }));
      const active = mockStore.getActiveUser();
      expect(active).not.toBeNull();
      expect(active?.name).toBe('Farmer');
      expect(active?.name.split(' ')[0]).toBe('Farmer');
      expect(active?.location.village).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // TEST J: PLATFORM FALLBACK AUTH & BOOKING FLOW (JANHAVI RATE LIMIT RECOVERY)
  // --------------------------------------------------------------------------
  describe('Test J: Platform Fallback Auth & Booking Flow', () => {
    it('allows a user registered via fallback platform session to create bookings and pay without authentication errors', async () => {
      // Simulate user Janhavi registered via platform fallback session
      const janhavi = await authService.register({
        name: 'Janhavi',
        email: 'janhavi@test.farm',
        phone: '+91 98220 99999',
        location: { village: 'Dindori', district: 'Nashik', state: 'Maharashtra' },
        password: 'password123',
      });

      expect(janhavi).toBeDefined();
      expect(janhavi.name).toBe('Janhavi');

      // Create a booking as Janhavi
      const booking = await bookingsService.createBooking({
        equipmentId: 'eq-tractor-john-deere-5050d',
        equipmentName: 'John Deere 5050D 4WD Tractor',
        equipmentCategory: 'Tractors',
        equipmentImage: '/images/tractor.jpg',
        renterId: janhavi.id,
        renterName: janhavi.name,
        renterPhone: janhavi.phone,
        renterVillage: `${janhavi.location.village}, ${janhavi.location.district}`,
        ownerId: 'usr-ramesh-01',
        ownerName: 'Ramesh Patel',
        ownerPhone: '+91 98765 43210',
        startDate: '2026-10-20T08:00:00Z',
        endDate: '2026-10-20T14:00:00Z',
        durationHours: 6,
        withOperator: true,
        basePrice: 2700,
        operatorPrice: 720,
        platformFee: 137,
        securityDeposit: 2000,
        totalPrice: 5557,
        renterNotes: 'Need 6 hours for plowing.',
      });

      expect(booking).toBeDefined();
      expect(booking.id).toBeDefined();
      expect(booking.renterId).toBe(janhavi.id);
      expect(booking.totalPrice).toBe(5557);

      // Verify the booking is retrieved in Janhavi's rentals
      const myRentals = await bookingsService.getMyRentals(janhavi.id);
      expect(myRentals.length).toBeGreaterThan(0);
      expect(myRentals.some(b => b.id === booking.id)).toBe(true);

      // Verify Janhavi can authorize escrow payment
      const paymentRes = await paymentsService.simulatePayment(booking.id, 'upi');
      expect(paymentRes.success).toBe(true);
      expect(paymentRes.paymentStatus).toBe('paid');
    });

    it('allows a user registered via fallback platform session to list equipment', async () => {
      const activeUser = await authService.register({
        name: 'Janhavi',
        email: 'janhavi.owner@test.farm',
        phone: '+91 98220 99999',
        location: { village: 'Dindori', district: 'Nashik', state: 'Maharashtra' },
        password: 'password123',
      });
      expect(activeUser).toBeDefined();

      const newListing = await equipmentService.create({
        title: 'Mahindra 575 DI Tractor',
        category: 'Tractors',
        description: 'Dependable workhorse',
        make: 'Mahindra',
        model: '575 DI',
        year: 2023,
        condition: 'Excellent',
        pricePerHour: 450,
        pricePerDay: 3200,
        securityDeposit: 2000,
        operatorAvailable: true,
        operatorCostPerHour: 120,
        minRentalHours: 2,
        images: [],
        specifications: {},
        location: { ...activeUser.location, approximateCoordinates: [20.0063, 73.7898] },
        ownerId: activeUser.id,
        ownerName: activeUser.name,
        ownerRating: 5.0,
        ownerVerified: true,
        status: 'available',
      });

      expect(newListing.id).toBeDefined();
      expect(newListing.title).toBe('Mahindra 575 DI Tractor');

      const myListings = await equipmentService.getMyEquipment(activeUser.id);
      expect(myListings.some(e => e.id === newListing.id)).toBe(true);
    });
  });
});

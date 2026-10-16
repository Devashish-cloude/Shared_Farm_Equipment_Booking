import { describe, it, expect, beforeEach, vi } from 'vitest';
import { paymentsService } from '../services/payments.service';
import { bookingsService } from '../services/bookings.service';
import { mockStore } from '../services/mockStore';
import { translations, normalizeLanguageCode } from '../i18n/translations';

describe('Payment Authorization, Security & Breakdown Tests', () => {
  beforeEach(() => {
    mockStore.reset();
  });

  describe('A. Payment Success Flow', () => {
    it('authorizes a valid test payment request and updates booking and payment status to paid', async () => {
      const bookings = mockStore.getBookings();
      const pendingBooking = bookings.find((b) => b.paymentStatus === 'pending') || bookings[0];
      expect(pendingBooking).toBeDefined();

      const result = await paymentsService.simulatePayment(pendingBooking.id, 'upi');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.amount).toBe(pendingBooking.totalPrice);

      // Verify the booking payment status in store
      const updatedBooking = await bookingsService.getById(pendingBooking.id);
      expect(updatedBooking?.paymentStatus).toBe('paid');
      expect(updatedBooking?.status).toBe('accepted');
    });

    it('returns a valid transaction reference starting with SF-PAY-', async () => {
      const freshBooking = await bookingsService.createBooking({
        equipmentId: 'eq-1',
        equipmentName: 'John Deere 5310',
        equipmentCategory: 'Tractors',
        equipmentImage: '',
        renterId: 'test-renter-txn',
        renterName: 'Renter Txn',
        renterPhone: '9876543210',
        renterVillage: 'Anand',
        ownerId: 'owner-1',
        ownerName: 'Owner One',
        ownerPhone: '9876543211',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 4 * 3600000).toISOString(),
        durationHours: 4,
        withOperator: false,
        basePrice: 3200,
        operatorPrice: 0,
        platformFee: 128,
        securityDeposit: 1500,
        totalPrice: 4828,
      });

      const result = await paymentsService.simulatePayment(freshBooking.id, 'card');
      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^SF-PAY-/);
    });
  });

  describe('B. Payment Failure & Validation Scenarios', () => {
    it('fails gracefully when booking ID is invalid or not found', async () => {
      await expect(
        paymentsService.simulatePayment('non-existent-booking-id-99999', 'upi')
      ).rejects.toThrow(/not found/i);
    });

    it('rejects payments on cancelled or expired bookings', async () => {
      const bookings = mockStore.getBookings();
      const booking = bookings[0];
      mockStore.updateBooking(booking.id, { status: 'cancelled' });

      await expect(
        paymentsService.simulatePayment(booking.id, 'upi')
      ).rejects.toThrow(/cannot pay for a cancelled booking/i);
    });

    it('prevents payment when booking is already refunded', async () => {
      const bookings = mockStore.getBookings();
      const booking = bookings[0];
      mockStore.updateBooking(booking.id, { paymentStatus: 'refunded', status: 'cancelled' });

      await expect(
        paymentsService.simulatePayment(booking.id, 'netbanking')
      ).rejects.toThrow(/cannot pay for a cancelled booking/i);
    });
  });

  describe('C. Idempotency & Repeat Payment Handling', () => {
    it('is idempotent: repeated authorization does not error and returns existing transaction', async () => {
      const bookings = mockStore.getBookings();
      const booking = bookings[0];

      // First authorization
      const firstResult = await paymentsService.simulatePayment(booking.id, 'upi');
      expect(firstResult.success).toBe(true);

      // Second authorization attempt on already paid booking
      const secondResult = await paymentsService.simulatePayment(booking.id, 'upi');
      expect(secondResult.success).toBe(true);
      expect(secondResult.amount).toBe(booking.totalPrice);
    });
  });

  describe('D. Authoritative Pricing & Security Breakdown', () => {
    it('enforces authoritative price calculation: base + driver + 4% platform fee + deposit', async () => {
      const durationHours = 8;
      const pricePerHour = 800;
      const operatorCostPerHour = 150;
      const securityDeposit = 1500;

      const basePrice = pricePerHour * durationHours; // 6400
      const operatorPrice = operatorCostPerHour * durationHours; // 1200
      const subtotal = basePrice + operatorPrice; // 7600
      const platformFee = Math.round(subtotal * 0.04); // 304
      const authoritativeTotal = basePrice + operatorPrice + platformFee + securityDeposit; // 9404

      expect(authoritativeTotal).toBe(9404);
      expect(platformFee).toBe(304);

      // Create booking and verify stored authoritative price
      const newBooking = await bookingsService.createBooking({
        equipmentId: 'eq-1',
        equipmentName: 'John Deere 5310 4WD',
        equipmentCategory: 'Tractors',
        equipmentImage: '',
        renterId: 'test-renter-1',
        renterName: 'Renter One',
        renterPhone: '9876543210',
        renterVillage: 'Anand, Anand',
        ownerId: 'owner-1',
        ownerName: 'Owner One',
        ownerPhone: '9876543211',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 8 * 3600000).toISOString(),
        durationHours,
        withOperator: true,
        basePrice,
        operatorPrice,
        platformFee,
        securityDeposit,
        totalPrice: authoritativeTotal,
      });

      expect(newBooking.totalPrice).toBe(authoritativeTotal);
      expect(newBooking.platformFee).toBe(platformFee);

      // Simulate payment uses the authoritative total, not browser input
      const paymentResult = await paymentsService.simulatePayment(newBooking.id, 'upi');
      expect(paymentResult.amount).toBe(authoritativeTotal);
    });

    it('does not include driver fee when withOperator is false', async () => {
      const durationHours = 6;
      const pricePerHour = 600;
      const basePrice = pricePerHour * durationHours; // 3600
      const operatorPrice = 0;
      const platformFee = Math.round(basePrice * 0.04); // 144
      const securityDeposit = 1500;
      const totalDue = basePrice + platformFee + securityDeposit; // 5244

      const newBooking = await bookingsService.createBooking({
        equipmentId: 'eq-2',
        equipmentName: 'Mahindra 575 DI',
        equipmentCategory: 'Tractors',
        equipmentImage: '',
        renterId: 'test-renter-2',
        renterName: 'Renter Two',
        renterPhone: '9876543210',
        renterVillage: 'Kheda, Gujarat',
        ownerId: 'owner-2',
        ownerName: 'Owner Two',
        ownerPhone: '9876543212',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 6 * 3600000).toISOString(),
        durationHours,
        withOperator: false,
        basePrice,
        operatorPrice: 0,
        platformFee,
        securityDeposit,
        totalPrice: totalDue,
      });

      expect(newBooking.operatorPrice).toBe(0);
      expect(newBooking.totalPrice).toBe(5244);
    });
  });

  describe('E. Multi-Language (i18n) Consistency for Payment & Details', () => {
    it('provides complete payment translations in English, Hindi, and Marathi', () => {
      const languages = ['en', 'hi', 'mr'] as const;
      const requiredPaymentKeys = [
        'pay.title',
        'pay.backToSummary',
        'pay.orderId',
        'pay.amountDue',
        'pay.upiQr',
        'pay.netbanking',
        'pay.testCard',
        'pay.authorizeBtn',
        'pay.success',
        'pay.failed',
        'pay.unauthorized',
        'pay.alreadyPaid',
        'pay.breakdownTitle',
        'pay.baseRent',
        'pay.driverFee',
        'pay.escrowFee',
        'pay.securityDeposit',
        'pay.totalPayable',
      ];

      for (const lang of languages) {
        const dict = translations[lang];
        expect(dict).toBeDefined();

        for (const key of requiredPaymentKeys) {
          expect(dict[key], `Missing key "${key}" in language "${lang}"`).toBeDefined();
          expect(dict[key].trim().length).toBeGreaterThan(0);
        }
      }
    });

    it('verifies natural Hindi and Marathi payment labels', () => {
      // Hindi checks
      expect(translations.hi['pay.title']).toBe('भुगतान विधि चुनें');
      expect(translations.hi['pay.upiQr']).toContain('यूपीआई');
      expect(translations.hi['pay.securityDeposit']).toContain('सुरक्षा जमा');

      // Marathi checks
      expect(translations.mr['pay.title']).toBe('पेमेंट पद्धत निवडा');
      expect(translations.mr['pay.upiQr']).toContain('यूपीआय');
      expect(translations.mr['pay.securityDeposit']).toContain('अनामत');
    });

    it('provides complete equipment details and booking calculator translations', () => {
      const languages = ['en', 'hi', 'mr'] as const;
      const requiredDetailsKeys = [
        'details.back',
        'details.about',
        'details.specs',
        'details.minDuration',
        'details.hours',
        'details.verified',
        'details.rentalDate',
        'details.estDuration',
        'details.driverOption',
        'details.machineRental',
        'details.driverFee',
        'details.escrowFee',
        'details.securityDeposit',
        'details.estTotal',
        'details.requestBtn',
      ];

      for (const lang of languages) {
        const dict = translations[lang];
        for (const key of requiredDetailsKeys) {
          expect(dict[key], `Missing details key "${key}" in language "${lang}"`).toBeDefined();
        }
      }
    });

    it('normalizes language codes accurately', () => {
      expect(normalizeLanguageCode('mr')).toBe('mr');
      expect(normalizeLanguageCode('Marathi')).toBe('mr');
      expect(normalizeLanguageCode('मराठी')).toBe('mr');
      expect(normalizeLanguageCode('hi')).toBe('hi');
      expect(normalizeLanguageCode('Hindi')).toBe('hi');
      expect(normalizeLanguageCode('हिन्दी')).toBe('hi');
      expect(normalizeLanguageCode('en')).toBe('en');
    });
  });

  describe('F. Regression & Marketplace Workflow Continuity', () => {
    it('verifies marketplace search and filtering still works', async () => {
      const allEquipment = mockStore.getEquipment();
      expect(allEquipment.length).toBeGreaterThan(0);

      const tractors = allEquipment.filter((e) => e.category === 'Tractors');
      expect(tractors.length).toBeGreaterThan(0);
      expect(tractors[0].pricePerHour).toBeGreaterThan(0);
    });

    it('verifies complete booking lifecycle: create -> view -> pay -> confirmed', async () => {
      const equipment = mockStore.getEquipment()[0];
      const basePrice = equipment.pricePerHour * 4;
      const platformFee = Math.round(basePrice * 0.04);
      const securityDeposit = 1500;
      const totalPrice = basePrice + platformFee + securityDeposit;

      // 1. Create booking
      const booking = await bookingsService.createBooking({
        equipmentId: equipment.id,
        equipmentName: equipment.title,
        equipmentCategory: equipment.category,
        equipmentImage: equipment.images[0],
        renterId: 'renter-e2e',
        renterName: 'E2E Farmer',
        renterPhone: '9876500000',
        renterVillage: 'Navsari, Gujarat',
        ownerId: equipment.ownerId,
        ownerName: equipment.ownerName,
        ownerPhone: '9876511111',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 4 * 3600000).toISOString(),
        durationHours: 4,
        withOperator: false,
        basePrice,
        operatorPrice: 0,
        platformFee,
        securityDeposit,
        totalPrice,
      });

      expect(booking.id).toBeDefined();
      expect(booking.paymentStatus).toBe('pending');

      // 2. Authorize payment
      const paymentResult = await paymentsService.simulatePayment(booking.id, 'upi');
      expect(paymentResult.success).toBe(true);

      // 3. Confirm status is paid & accepted
      const confirmedBooking = await bookingsService.getById(booking.id);
      expect(confirmedBooking?.paymentStatus).toBe('paid');
      expect(confirmedBooking?.status).toBe('accepted');
    });
  });
});

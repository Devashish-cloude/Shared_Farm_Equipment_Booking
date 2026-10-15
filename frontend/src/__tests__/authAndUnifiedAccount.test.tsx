import { describe, it, expect } from 'vitest';
import { mockStore } from '../services/mockStore';
import { authService } from '../services/auth.service';

describe('Unified Single Farmer Account Architecture', () => {
  it('enforces ONE single account that both rents and lists machinery', async () => {
    const user = await authService.getCurrentUser();
    expect(user).toBeDefined();
    expect(user?.name).toBe('Ramesh Patel');

    // 1. Check user has equipment rentals (Ramesh is renting from others)
    const allBookings = mockStore.getBookings();
    const myRentals = allBookings.filter((b) => b.renterId === user?.id);
    expect(myRentals.length).toBeGreaterThan(0);

    // 2. Check user ALSO has equipment listings (Ramesh is sharing his Mahindra tractor)
    const allEquipment = mockStore.getEquipmentList();
    const myListings = allEquipment.filter((e) => e.ownerId === user?.id);
    expect(myListings.length).toBeGreaterThan(0);

    // 3. Check user receives incoming booking requests for his listed machinery
    const incomingRequests = allBookings.filter((b) => b.ownerId === user?.id);
    expect(incomingRequests.length).toBeGreaterThan(0);
  });

  it('supports transparent login without role bifurcation', async () => {
    const loggedUser = await authService.login('ramesh.patel@sharedfarm.demo', 'demo');
    expect(loggedUser.id).toBe('usr-ramesh-01');
    expect(loggedUser.role).toBe('user'); // Single user role, no permanent 'renter' vs 'owner' split
  });
});

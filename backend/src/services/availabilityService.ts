import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { DatabasePool, getDatabasePool } from '../db/pool.js';
import { TransactionPool, withTransaction } from '../db/transaction.js';
import {
  AvailabilityQueryClient,
  AvailabilityRepository,
} from '../repositories/availabilityRepository.js';
import {
  EquipmentAvailabilityWindow,
  EquipmentBlockedPeriod,
} from '../types/index.js';
import { store } from './store.js';
import { BookingServiceError, parseBookingPeriod } from './bookingService.js';

export type AvailabilityPeriodInput = {
  startDate: string;
  endDate: string;
};

export type EquipmentAvailability = {
  availability: EquipmentAvailabilityWindow[];
  blockedPeriods: EquipmentBlockedPeriod[];
};

function usePostgres(): boolean {
  return Boolean(config.databaseUrl);
}

function overlaps(
  leftStart: string,
  leftEnd: string,
  rightStart: string,
  rightEnd: string
): boolean {
  return new Date(leftStart) < new Date(rightEnd) &&
    new Date(leftEnd) > new Date(rightStart);
}

export class AvailabilityService {
  private readonly pool?: DatabasePool;
  private readonly repository?: AvailabilityRepository;

  public constructor(pool?: DatabasePool) {
    if (pool || usePostgres()) {
      this.pool = pool || getDatabasePool();
      this.repository = new AvailabilityRepository(this.pool);
    }
  }

  public async list(equipmentId: string): Promise<EquipmentAvailability> {
    if (!usePostgres()) {
      if (!store.getEquipmentById(equipmentId)) {
        throw new BookingServiceError('Equipment not found.', 404);
      }
      return {
        availability: store.listAvailability(equipmentId),
        blockedPeriods: store.listBlockedPeriods(equipmentId),
      };
    }

    if (!(await this.requireRepository().equipmentExists(equipmentId))) {
      throw new BookingServiceError('Equipment not found.', 404);
    }
    return {
      availability: await this.requireRepository().findWindows(equipmentId),
      blockedPeriods: await this.requireRepository().findBlockedPeriods(equipmentId),
    };
  }

  public async createAvailability(
    equipmentId: string,
    input: AvailabilityPeriodInput,
    actorId: string,
    isAdmin: boolean
  ): Promise<EquipmentAvailabilityWindow> {
    const period = parseBookingPeriod(input.startDate, input.endDate);
    if (!usePostgres()) {
      this.assertInMemoryOwner(equipmentId, actorId, isAdmin);
      const existing = store.listAvailability(equipmentId);
      if (existing.some((window) =>
        overlaps(window.start_date, window.end_date, period.start, period.end))) {
        throw new BookingServiceError('Availability windows cannot overlap.', 409);
      }
      const window: EquipmentAvailabilityWindow = {
        id: `availability_${uuidv4().substring(0, 8)}`,
        equipment_id: equipmentId,
        start_date: period.start,
        end_date: period.end,
        created_at: new Date().toISOString(),
      };
      store.availabilityWindows.set(window.id, window);
      return window;
    }

    return withTransaction(this.requirePool() as TransactionPool, async (client) => {
      await this.assertPostgresOwner(equipmentId, actorId, isAdmin, client);
      if (await this.requireRepository().hasWindowOverlap(equipmentId, period.start, period.end, client)) {
        throw new BookingServiceError('Availability windows cannot overlap.', 409);
      }
      return this.requireRepository().createWindow({
        id: `availability_${uuidv4().substring(0, 8)}`,
        equipment_id: equipmentId,
        start_date: period.start,
        end_date: period.end,
        created_at: new Date().toISOString(),
      }, client);
    });
  }

  public async createBlockedPeriod(
    equipmentId: string,
    input: AvailabilityPeriodInput,
    actorId: string,
    isAdmin: boolean
  ): Promise<EquipmentBlockedPeriod> {
    const period = parseBookingPeriod(input.startDate, input.endDate);
    if (!usePostgres()) {
      this.assertInMemoryOwner(equipmentId, actorId, isAdmin);
      const existing = store.listBlockedPeriods(equipmentId);
      if (existing.some((blocked) =>
        overlaps(blocked.start_date, blocked.end_date, period.start, period.end))) {
        throw new BookingServiceError('Blocked periods cannot overlap.', 409);
      }
      const blocked: EquipmentBlockedPeriod = {
        id: `blocked_${uuidv4().substring(0, 8)}`,
        equipment_id: equipmentId,
        start_date: period.start,
        end_date: period.end,
        created_at: new Date().toISOString(),
      };
      store.blockedPeriods.set(blocked.id, blocked);
      return blocked;
    }

    return withTransaction(this.requirePool() as TransactionPool, async (client) => {
      await this.assertPostgresOwner(equipmentId, actorId, isAdmin, client);
      if (await this.requireRepository().hasBlockedOverlap(equipmentId, period.start, period.end, client)) {
        throw new BookingServiceError('Blocked periods cannot overlap.', 409);
      }
      return this.requireRepository().createBlockedPeriod({
        id: `blocked_${uuidv4().substring(0, 8)}`,
        equipment_id: equipmentId,
        start_date: period.start,
        end_date: period.end,
        created_at: new Date().toISOString(),
      }, client);
    });
  }

  public async deleteAvailability(
    equipmentId: string,
    id: string,
    actorId: string,
    isAdmin: boolean
  ): Promise<void> {
    if (!usePostgres()) {
      this.assertInMemoryOwner(equipmentId, actorId, isAdmin);
      const window = store.availabilityWindows.get(id);
      if (!window || window.equipment_id !== equipmentId) {
        throw new BookingServiceError('Availability window not found.', 404);
      }
      store.availabilityWindows.delete(id);
      return;
    }
    await withTransaction(this.requirePool() as TransactionPool, async (client) => {
      await this.assertPostgresOwner(equipmentId, actorId, isAdmin, client);
      if (!(await this.requireRepository().deleteWindow(equipmentId, id, client))) {
        throw new BookingServiceError('Availability window not found.', 404);
      }
    });
  }

  public async deleteBlockedPeriod(
    equipmentId: string,
    id: string,
    actorId: string,
    isAdmin: boolean
  ): Promise<void> {
    if (!usePostgres()) {
      this.assertInMemoryOwner(equipmentId, actorId, isAdmin);
      const blocked = store.blockedPeriods.get(id);
      if (!blocked || blocked.equipment_id !== equipmentId) {
        throw new BookingServiceError('Blocked period not found.', 404);
      }
      store.blockedPeriods.delete(id);
      return;
    }
    await withTransaction(this.requirePool() as TransactionPool, async (client) => {
      await this.assertPostgresOwner(equipmentId, actorId, isAdmin, client);
      if (!(await this.requireRepository().deleteBlockedPeriod(equipmentId, id, client))) {
        throw new BookingServiceError('Blocked period not found.', 404);
      }
    });
  }

  public async isBookableInMemory(
    equipmentId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    const windows = store.listAvailability(equipmentId);
    const blocked = store.listBlockedPeriods(equipmentId);
    const withinConfiguredWindow = windows.length === 0 || windows.some((window) =>
      new Date(window.start_date) <= new Date(startDate) &&
      new Date(window.end_date) >= new Date(endDate)
    );
    return withinConfiguredWindow && !blocked.some((period) =>
      overlaps(period.start_date, period.end_date, startDate, endDate)
    );
  }

  private assertInMemoryOwner(equipmentId: string, actorId: string, isAdmin: boolean): void {
    const equipment = store.getEquipmentById(equipmentId);
    if (!equipment) {
      throw new BookingServiceError('Equipment not found.', 404);
    }
    if (!isAdmin && equipment.owner_id !== actorId) {
      throw new BookingServiceError('Only the equipment owner or an admin can modify availability.', 403);
    }
  }

  private async assertPostgresOwner(
    equipmentId: string,
    actorId: string,
    isAdmin: boolean,
    client: AvailabilityQueryClient
  ): Promise<void> {
    const ownerId = await this.requireRepository().findEquipmentOwner(equipmentId, client);
    if (!ownerId) {
      throw new BookingServiceError('Equipment not found.', 404);
    }
    if (!isAdmin && ownerId !== actorId) {
      throw new BookingServiceError('Only the equipment owner or an admin can modify availability.', 403);
    }
  }

  private requirePool(): DatabasePool {
    if (!this.pool) {
      throw new Error('Availability database pool is not configured.');
    }
    return this.pool;
  }

  private requireRepository(): AvailabilityRepository {
    if (!this.repository) {
      throw new Error('Availability repository is not configured.');
    }
    return this.repository;
  }
}

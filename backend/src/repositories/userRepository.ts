import { QueryResultRow } from 'pg';
import { getDatabasePool, DatabasePool } from '../db/pool.js';
import { withTransaction, TransactionClient, TransactionPool } from '../db/transaction.js';
import { User, UserProfile } from '../types/index.js';

type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  is_admin: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProfileRow = {
  id: string;
  user_id: string;
  location_name: string | null;
  farm_size_acres: string | number | null;
  address: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export interface UserQueryClient {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[] }>;
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function optionalString(value: string | null): string | undefined {
  return value ?? undefined;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    full_name: row.full_name,
    phone: optionalString(row.phone),
    is_admin: row.is_admin,
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function toProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    location_name: optionalString(row.location_name),
    farm_size_acres:
      row.farm_size_acres === null ? undefined : Number(row.farm_size_acres),
    address: optionalString(row.address),
    bio: optionalString(row.bio),
    avatar_url: optionalString(row.avatar_url),
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

export class UserRepository {
  private readonly pool: DatabasePool;

  public constructor(pool: DatabasePool = getDatabasePool()) {
    this.pool = pool;
  }

  public async findById(id: string, client: UserQueryClient = this.pool): Promise<User | undefined> {
    const result = await client.query<UserRow>(
      `SELECT id, email, password_hash, full_name, phone, is_admin, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  public async findByEmail(
    email: string,
    client: UserQueryClient = this.pool
  ): Promise<User | undefined> {
    const result = await client.query<UserRow>(
      `SELECT id, email, password_hash, full_name, phone, is_admin, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    return result.rows[0] ? toUser(result.rows[0]) : undefined;
  }

  public async createUser(
    user: User,
    client: UserQueryClient = this.pool
  ): Promise<User> {
    const result = await client.query<UserRow>(
      `INSERT INTO users
       (id, email, password_hash, full_name, phone, is_admin, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, password_hash, full_name, phone, is_admin, created_at, updated_at`,
      [
        user.id,
        user.email,
        user.password_hash,
        user.full_name,
        user.phone ?? null,
        user.is_admin,
        user.created_at,
        user.updated_at,
      ]
    );
    return toUser(result.rows[0]);
  }

  public async findProfileByUserId(
    userId: string,
    client: UserQueryClient = this.pool
  ): Promise<UserProfile | undefined> {
    const result = await client.query<ProfileRow>(
      `SELECT id, user_id, location_name, farm_size_acres, address, bio, avatar_url, created_at, updated_at
       FROM user_profiles
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ? toProfile(result.rows[0]) : undefined;
  }

  public async createProfile(
    profile: UserProfile,
    client: UserQueryClient = this.pool
  ): Promise<UserProfile> {
    const result = await client.query<ProfileRow>(
      `INSERT INTO user_profiles
       (id, user_id, location_name, farm_size_acres, address, bio, avatar_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, user_id, location_name, farm_size_acres, address, bio, avatar_url, created_at, updated_at`,
      [
        profile.id,
        profile.user_id,
        profile.location_name ?? null,
        profile.farm_size_acres ?? null,
        profile.address ?? null,
        profile.bio ?? null,
        profile.avatar_url ?? null,
        profile.created_at,
        profile.updated_at,
      ]
    );
    return toProfile(result.rows[0]);
  }

  public async updateProfile(
    profile: UserProfile,
    client: UserQueryClient = this.pool
  ): Promise<UserProfile> {
    const result = await client.query<ProfileRow>(
      `UPDATE user_profiles
       SET location_name = $2, farm_size_acres = $3, address = $4, bio = $5,
           avatar_url = $6, updated_at = $7
       WHERE id = $1
       RETURNING id, user_id, location_name, farm_size_acres, address, bio, avatar_url, created_at, updated_at`,
      [
        profile.id,
        profile.location_name ?? null,
        profile.farm_size_acres ?? null,
        profile.address ?? null,
        profile.bio ?? null,
        profile.avatar_url ?? null,
        profile.updated_at,
      ]
    );
    return toProfile(result.rows[0]);
  }

  public async createUserWithProfile(user: User, profile: UserProfile): Promise<{
    user: User;
    profile: UserProfile;
  }> {
    return withTransaction(
      this.pool as TransactionPool,
      async (client: TransactionClient) => ({
        user: await this.createUser(user, client),
        profile: await this.createProfile(profile, client),
      })
    );
  }
}

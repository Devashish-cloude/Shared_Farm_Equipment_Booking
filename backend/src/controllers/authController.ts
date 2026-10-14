import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest, User, UserProfile } from '../types/index.js';
import { classifyDatabaseError } from '../db/errors.js';
import { getDatabasePool } from '../db/pool.js';
import { UserRepository } from '../repositories/userRepository.js';

function usePostgres(): boolean {
  return Boolean(config.databaseUrl);
}

function createUserRepository(): UserRepository {
  return new UserRepository(getDatabasePool());
}

function createToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      is_admin: user.is_admin,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export class AuthController {
  public static async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    let user: User | undefined;
    try {
      user = usePostgres()
        ? await createUserRepository().findByEmail(email)
        : store.getUserByEmail(email);
    } catch (error) {
      next(error);
      return;
    }
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = createToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          phone: user.phone,
          isAdmin: user.is_admin,
        },
      },
    });
  }

  public static async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { email, password, full_name, phone, location_name } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({ success: false, error: 'Email, password, and full name are required.' });
      return;
    }

    if (!usePostgres() && store.getUserByEmail(email)) {
      res.status(409).json({ success: false, error: 'User with this email already exists.' });
      return;
    }

    const userId = `user_${uuidv4().substring(0, 8)}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      email,
      password_hash: passwordHash,
      full_name,
      phone,
      is_admin: false,
      created_at: now,
      updated_at: now,
    };

    const newProfile: UserProfile = {
      id: `prof_${uuidv4().substring(0, 8)}`,
      user_id: userId,
      location_name: location_name || 'Maharashtra, India',
      farm_size_acres: 5.0,
      created_at: now,
      updated_at: now,
    };
    try {
      if (usePostgres()) {
        await createUserRepository().createUserWithProfile(newUser, newProfile);
      } else {
        store.createUser(newUser);
        store.userProfiles.set(userId, newProfile);
      }
    } catch (error) {
      if (classifyDatabaseError(error) === 'unique_violation') {
        res.status(409).json({ success: false, error: 'User with this email already exists.' });
        return;
      }
      next(error);
      return;
    }

    const token = createToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          phone: newUser.phone,
          isAdmin: false,
        },
      },
    });
  }

  public static async getMe(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const repository = usePostgres() ? createUserRepository() : undefined;
    let user: User | undefined;
    let profile: UserProfile | undefined;
    try {
      user = repository
        ? await repository.findById(req.user!.id)
        : store.getUserById(req.user!.id);
      if (user) {
        profile = repository
          ? await repository.findProfileByUserId(user.id)
          : store.userProfiles.get(user.id);
      }
    } catch (error) {
      next(error);
      return;
    }
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        isAdmin: user.is_admin,
        profile,
      },
    });
  }
}

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../services/store.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest, User, UserProfile } from '../types/index.js';

export class AuthController {
  public static login(req: Request, res: Response): void {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const user = store.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

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

  public static register(req: Request, res: Response): void {
    const { email, password, full_name, phone, location_name } = req.body;

    if (!email || !password || !full_name) {
      res.status(400).json({ success: false, error: 'Email, password, and full name are required.' });
      return;
    }

    if (store.getUserByEmail(email)) {
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

    store.createUser(newUser);

    const newProfile: UserProfile = {
      id: `prof_${uuidv4().substring(0, 8)}`,
      user_id: userId,
      location_name: location_name || 'Maharashtra, India',
      farm_size_acres: 5.0,
      created_at: now,
      updated_at: now,
    };
    store.userProfiles.set(userId, newProfile);

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        is_admin: newUser.is_admin,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

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

  public static getMe(req: AuthenticatedRequest, res: Response): void {
    const user = store.getUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const profile = store.userProfiles.get(user.id);

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

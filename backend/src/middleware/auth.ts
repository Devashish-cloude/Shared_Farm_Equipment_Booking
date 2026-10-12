import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { store } from '../services/store.js';
import { AuthenticatedRequest, AuthUserPayload } from '../types/index.js';

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Allow demo user header for testing if present
  const demoUserId = req.headers['x-demo-user-id'] as string;
  if (demoUserId) {
    const user = store.getUserById(demoUserId);
    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_admin: user.is_admin,
      };
      return next();
    }
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Bearer token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.',
    });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || !req.user.is_admin) {
    res.status(403).json({
      success: false,
      error: 'Access denied. Administrator privileges required.',
    });
    return;
  }
  next();
};

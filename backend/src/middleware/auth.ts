import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department_id: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
    const result = await query(
      'SELECT id, email, name, role, department_id FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    if (!result.rows[0]) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }
    req.user = result.rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: string };
    const result = await query(
      'SELECT id, email, name, role, department_id FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );
    if (result.rows[0]) req.user = result.rows[0];
  } catch {
    // Optional auth - silently ignore
  }
  next();
};

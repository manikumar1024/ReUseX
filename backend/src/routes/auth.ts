import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// SECURITY: Only safe, self-assignable roles. Admin roles are granted by existing admins only.
const SELF_REGISTRATION_ROLES = ['student', 'faculty', 'lab_manager', 'club_org'] as const;

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  role: z.enum(SELF_REGISTRATION_ROLES).default('student'),
  department_id: z.string().uuid().optional().nullable().or(z.literal('')).transform(v => v || null),
  contact_number: z.string().optional().nullable().transform(v => v || null),
  building: z.string().optional().nullable().transform(v => v || null)
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// POST /api/auth/register
router.post('/register', asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const { email, password, name, role, department_id, contact_number, building } = parsed.data;

  // Check existing email
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows[0]) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO users (email, password_hash, name, role, department_id, contact_number, building, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, name, role, department_id, created_at`,
    [email.toLowerCase(), passwordHash, name, role, department_id || null, contact_number || null, building || null, true]
  );

  const user = result.rows[0];
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

  res.status(201).json({
    message: 'Registration successful',
    user: { id: user.id, email: user.email, name: user.name, role: user.role, department_id: user.department_id },
    token
  });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid credentials format' });
    return;
  }

  const { email, password } = parsed.data;
  const result = await query(
    'SELECT id, email, name, role, department_id, password_hash, is_active FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  const user = result.rows[0];
  if (!user || !user.is_active) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

  res.json({
    message: 'Login successful',
    user: { id: user.id, email: user.email, name: user.name, role: user.role, department_id: user.department_id },
    token
  });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.department_id, u.avatar_url, u.bio,
            u.contact_number, u.building, u.room_number, u.reliability_score,
            u.total_loans, u.successful_returns, u.created_at,
            d.name as department_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     WHERE u.id = $1`,
    [req.user!.id]
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: result.rows[0] });
}));

// PATCH /api/auth/me
router.patch('/me', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, bio, contact_number, building, room_number } = req.body;
  const result = await query(
    `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio),
     contact_number = COALESCE($3, contact_number), building = COALESCE($4, building),
     room_number = COALESCE($5, room_number), updated_at = NOW()
     WHERE id = $6
     RETURNING id, email, name, role, department_id, bio, contact_number, building`,
    [name, bio, contact_number, building, room_number, req.user!.id]
  );
  res.json({ user: result.rows[0] });
}));

export { router as authRoutes };

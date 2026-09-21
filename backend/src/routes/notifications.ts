import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { unread_only = 'false', page = '1', limit = '20' } = req.query as Record<string, string>;

  const params: unknown[] = [req.user!.id];
  const where = ['user_id = $1'];

  if (unread_only === 'true') {
    where.push('is_read = false');
  }

  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const result = await query(`
    SELECT * FROM notifications
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const countRes = await query(
    'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
    [req.user!.id]
  );

  res.json({
    notifications: result.rows,
    unread_count: parseInt(countRes.rows[0].count)
  });
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user!.id]
  );
  res.json({ message: 'Notification marked as read' });
}));

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user!.id]);
  res.json({ message: 'All notifications marked as read' });
}));

export { router as notificationRoutes };

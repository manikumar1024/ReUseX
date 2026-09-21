import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { semanticSearch } from '../services/matchingEngine';

const router = Router();

// POST /api/search/semantic
router.post('/semantic', asyncHandler(async (req: any, res: Response) => {
  const { q, category, mode, condition, status, limit = 20 } = req.body;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: 'Search query too short' });
    return;
  }

  const results = await semanticSearch(
    q,
    { category, mode, condition, status },
    req.user?.id,
    Math.min(parseInt(limit) || 20, 50)
  );

  res.json({ results, query: q, count: results.length });
}));

// GET /api/search — keyword + semantic hybrid
router.get('/', asyncHandler(async (req: any, res: Response) => {
  const { q = '', category, mode, condition, page = '1', limit = '20' } = req.query as Record<string, string>;

  if (!q.trim()) {
    const params: unknown[] = [];
    const where: string[] = ["r.status = 'available'", "r.available_quantity > 0"];

    if (category) {
      params.push(category);
      where.push(`rc.slug = $${params.length}`);
    }
    if (mode) {
      params.push(mode);
      where.push(`r.mode = $${params.length}`);
    }
    if (condition) {
      params.push(condition);
      where.push(`r.condition = $${params.length}`);
    }

    const countResult = await query(
      `SELECT COUNT(*) FROM resources r
       LEFT JOIN resource_categories rc ON rc.id = r.category_id
       WHERE ${where.join(' AND ')}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const result = await query(`
      SELECT r.id, r.title, r.description, r.resource_type, r.condition, r.status,
             r.location, r.building, r.mode, r.available_quantity, r.created_at,
             rc.slug as category_slug, rc.name as category_name,
             u.name as owner_name, u.reliability_score,
             d.name as department_name,
             (SELECT url FROM resource_images ri WHERE ri.resource_id = r.id AND ri.is_primary = true LIMIT 1) as primary_image
      FROM resources r
      LEFT JOIN resource_categories rc ON rc.id = r.category_id
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN departments d ON d.id = r.department_id
      WHERE ${where.join(' AND ')}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      results: result.rows,
      query: '',
      count: result.rows.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    return;
  }

  // Semantic search with filters
  const results = await semanticSearch(
    q,
    { category, mode, condition },
    req.user?.id,
    Math.min(parseInt(limit), 50)
  );

  res.json({ results, query: q, count: results.length });
}));

export { router as searchRoutes };

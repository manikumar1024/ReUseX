import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getAIProvider } from '../ai';

const router = Router();
const adminRoles = ['campus_admin', 'department_admin'];

// GET /api/admin/analytics
router.get('/analytics', authenticate, authorize(...adminRoles), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [
    resourceStats,
    loanStats,
    impactStats,
    categoryStats,
    recentActivity
  ] = await Promise.all([
    query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COUNT(*) FILTER (WHERE status = 'borrowed') as borrowed,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'underutilized') as underutilized,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as added_last_30d
      FROM resources WHERE status != 'retired'
    `),
    query(`
      SELECT
        COUNT(*) as total_loans,
        COUNT(*) FILTER (WHERE status = 'returned') as completed,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30d
      FROM loans
    `),
    query(`
      SELECT
        COALESCE(SUM(estimated_value), 0) as total_value_saved,
        COALESCE(SUM(estimated_co2_kg), 0) as total_co2_saved,
        COUNT(*) as total_reuse_events,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as events_last_30d
      FROM impact_records
    `),
    query(`
      SELECT rc.name as category, rc.slug, COUNT(r.id) as count
      FROM resource_categories rc
      LEFT JOIN resources r ON r.category_id = rc.id AND r.status != 'retired'
      GROUP BY rc.id, rc.name, rc.slug
      ORDER BY count DESC
      LIMIT 10
    `),
    query(`
      SELECT r.id, r.title, r.status, r.created_at, u.name as owner_name
      FROM resources r JOIN users u ON u.id = r.owner_id
      WHERE r.created_at > NOW() - INTERVAL '7 days'
      ORDER BY r.created_at DESC LIMIT 10
    `)
  ]);

  // Monthly reuse trend
  const trendRes = await query(`
    SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as count
    FROM loans WHERE status = 'returned' AND created_at > NOW() - INTERVAL '6 months'
    GROUP BY month ORDER BY month ASC
  `);

  // Department resource distribution
  const deptRes = await query(`
    SELECT d.name as department, COUNT(r.id) as resource_count
    FROM departments d
    LEFT JOIN resources r ON r.department_id = d.id AND r.status != 'retired'
    GROUP BY d.id, d.name
    ORDER BY resource_count DESC
  `);

  res.json({
    resources: resourceStats.rows[0],
    loans: loanStats.rows[0],
    impact: impactStats.rows[0],
    categories: categoryStats.rows,
    recent_activity: recentActivity.rows,
    monthly_trend: trendRes.rows,
    departments: deptRes.rows
  });
}));

// GET /api/admin/underutilized
router.get('/underutilized', authenticate, authorize(...adminRoles), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await query(`
    SELECT r.id, r.title, r.description, r.condition, r.borrow_count, r.last_borrowed_at,
           r.created_at, r.location, r.building,
           EXTRACT(DAY FROM NOW() - COALESCE(r.last_borrowed_at, r.created_at)) as idle_days,
           (SELECT COUNT(*) FROM requirements req 
            WHERE req.resource_type ILIKE '%' || r.resource_type || '%' 
            AND req.status = 'active') as pending_requests,
           u.name as owner_name, d.name as department_name,
           rc.name as category_name
    FROM resources r
    LEFT JOIN users u ON u.id = r.owner_id
    LEFT JOIN departments d ON d.id = r.department_id
    LEFT JOIN resource_categories rc ON rc.id = r.category_id
    WHERE r.status = 'available'
      AND r.borrow_count < 3
      AND r.created_at < NOW() - INTERVAL '30 days'
    ORDER BY idle_days DESC
    LIMIT 20
  `);

  const ai = getAIProvider();

  // Add AI insights for each resource
  const withInsights = await Promise.all(result.rows.map(async (resource) => {
    const insight = await ai.detectUnderutilization(resource, {
      idle_days: resource.idle_days,
      pending_requests: resource.pending_requests,
      borrow_count: resource.borrow_count
    });
    return { ...resource, ai_insight: insight };
  }));

  res.json({ resources: withInsights.filter(r => r.ai_insight) });
}));

// GET /api/admin/users
router.get('/users', authenticate, authorize('campus_admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', role, search } = req.query as Record<string, string>;
  const params: unknown[] = [];
  const where: string[] = [];

  if (role) { params.push(role); where.push(`u.role = $${params.length}`); }
  if (search) { params.push(`%${search}%`); where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const result = await query(`
    SELECT u.id, u.email, u.name, u.role, u.is_active, u.reliability_score,
           u.total_loans, u.successful_returns, u.created_at,
           d.name as department_name,
           (SELECT COUNT(*) FROM resources WHERE owner_id = u.id AND status != 'retired') as resource_count
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY u.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  res.json({ users: result.rows });
}));

// GET /api/admin/circularity-score
router.get('/circularity-score', authenticate, authorize(...adminRoles), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [resourceRes, loanRes, impactRes] = await Promise.all([
    query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE borrow_count > 0) as reused
      FROM resources WHERE status != 'retired'
    `),
    query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'returned') as completed,
             COUNT(*) FILTER (WHERE status = 'overdue') as overdue
      FROM loans
    `),
    query(`SELECT COALESCE(SUM(estimated_value), 0) as saved, COUNT(*) as events FROM impact_records`)
  ]);

  const r = resourceRes.rows[0];
  const l = loanRes.rows[0];
  const i = impactRes.rows[0];

  const reuseRate = r.total > 0 ? (r.reused / r.total) * 100 : 0;
  const returnRate = l.total > 0 ? (l.completed / Math.max(l.total, 1)) * 100 : 100;
  const impactScore = Math.min(100, i.events * 2);

  const score = Math.round(
    reuseRate * 0.4 + returnRate * 0.35 + impactScore * 0.25
  );

  res.json({
    score: Math.max(0, Math.min(100, score)),
    components: {
      reuse_rate: Math.round(reuseRate),
      return_rate: Math.round(returnRate),
      impact_score: Math.round(impactScore)
    },
    raw: { resources: r, loans: l, impact: i },
    description: score >= 80 ? 'Excellent campus circularity' :
                 score >= 60 ? 'Good progress — keep sharing resources' :
                 score >= 40 ? 'Moderate — encourage more listings' :
                 'Early stage — grow the community'
  });
}));

// PATCH /api/admin/users/:id
router.patch('/users/:id', authenticate, authorize('campus_admin'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { is_active, role } = req.body;

  await query(
    'UPDATE users SET is_active = COALESCE($1, is_active), role = COALESCE($2, role), updated_at = NOW() WHERE id = $3',
    [is_active, role, id]
  );

  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
     VALUES ($1,'user_updated','users',$2,$3)`,
    [req.user!.id, id, JSON.stringify({ is_active, role })]
  );

  res.json({ message: 'User updated' });
}));

// GET /api/admin/knowledge-base
router.get('/knowledge-base', authenticate, authorize(...adminRoles), asyncHandler(async (_req: AuthRequest, res: Response) => {
  const result = await query(
    'SELECT * FROM knowledge_documents WHERE is_active = true ORDER BY created_at DESC'
  );
  res.json({ documents: result.rows });
}));

// POST /api/admin/knowledge-base
router.post('/knowledge-base', authenticate, authorize(...adminRoles), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, content, type, tags } = req.body;

  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }

  const docResult = await query(
    'INSERT INTO knowledge_documents (title, content, type, tags, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [title, content, type || 'policy', tags || [], req.user!.id]
  );

  const docId = docResult.rows[0].id;

  // Chunk and embed document
  const chunks = chunkText(content, 500);
  const ai = getAIProvider();

  for (let i = 0; i < chunks.length; i++) {
    const { embedding } = await ai.generateEmbedding(chunks[i]);
    await query(
      'INSERT INTO knowledge_chunks (document_id, chunk_index, content, embedding) VALUES ($1,$2,$3,$4::vector)',
      [docId, i, chunks[i], `[${embedding.join(',')}]`]
    ).catch(() => {
      // Store without embedding if vector not available
      return query(
        'INSERT INTO knowledge_chunks (document_id, chunk_index, content) VALUES ($1,$2,$3)',
        [docId, i, chunks[i]]
      );
    });
  }

  res.status(201).json({ message: 'Document added to knowledge base', document_id: docId });
}));

function chunkText(text: string, maxLength: number): string[] {
  const sentences = text.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += ' ' + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export { router as adminRoutes };

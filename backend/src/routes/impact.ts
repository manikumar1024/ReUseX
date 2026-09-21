import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/impact — campus-wide impact
router.get('/', asyncHandler(async (_req, res: Response) => {
  const [impactRes, loanRes, resourceRes] = await Promise.all([
    query(`
      SELECT
        COALESCE(SUM(estimated_value), 0)::NUMERIC as total_value_saved,
        COALESCE(SUM(estimated_co2_kg), 0)::NUMERIC as total_co2_kg,
        COALESCE(SUM(estimated_material_kg), 0)::NUMERIC as total_material_kg,
        COUNT(*) as total_reuse_events
      FROM impact_records
    `),
    query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = 'returned') as completed
      FROM loans
    `),
    query(`
      SELECT COUNT(*) FILTER (WHERE borrow_count > 0) as reused,
             COUNT(*) as total
      FROM resources WHERE status != 'retired'
    `)
  ]);

  const impact = impactRes.rows[0];
  const loans = loanRes.rows[0];
  const resources = resourceRes.rows[0];

  res.json({
    summary: {
      total_value_saved_inr: parseFloat(impact.total_value_saved),
      total_co2_kg_avoided: parseFloat(impact.total_co2_kg),
      total_material_kg_saved: parseFloat(impact.total_material_kg),
      resources_reused: parseInt(resources.reused),
      total_resources: parseInt(resources.total),
      loans_completed: parseInt(loans.completed),
      total_loans: parseInt(loans.total),
      purchases_avoided: parseInt(loans.completed),
      items_diverted_from_disposal: parseInt(resources.reused)
    },
    note: 'Environmental impact values are estimates based on typical resource costs and carbon factors. Not scientifically precise.'
  });
}));

// GET /api/impact/my — personal impact
router.get('/my', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(`
    SELECT
      COALESCE(SUM(estimated_value), 0)::NUMERIC as value_saved,
      COALESCE(SUM(estimated_co2_kg), 0)::NUMERIC as co2_kg,
      COUNT(*) as reuse_events,
      COUNT(DISTINCT resource_id) as unique_resources
    FROM impact_records WHERE user_id = $1
  `, [req.user!.id]);

  const loans = await query(
    `SELECT COUNT(*) as count FROM loans WHERE borrower_id = $1 AND status = 'returned'`,
    [req.user!.id]
  );

  const sharing = await query(
    `SELECT COUNT(DISTINCT l.borrower_id) as helped_users
     FROM loans l WHERE l.owner_id = $1 AND l.status = 'returned'`,
    [req.user!.id]
  );

  res.json({
    personal_impact: {
      value_saved_inr: parseFloat(result.rows[0].value_saved),
      co2_kg_avoided: parseFloat(result.rows[0].co2_kg),
      reuse_events: parseInt(result.rows[0].reuse_events),
      unique_resources_reused: parseInt(result.rows[0].unique_resources),
      successful_borrows: parseInt(loans.rows[0].count),
      users_helped: parseInt(sharing.rows[0].helped_users || '0')
    }
  });
}));

// GET /api/impact/trend
router.get('/trend', asyncHandler(async (_req, res: Response) => {
  const result = await query(`
    SELECT DATE_TRUNC('month', created_at) as month,
           COUNT(*) as events,
           COALESCE(SUM(estimated_value), 0)::NUMERIC as value_saved
    FROM impact_records
    WHERE created_at > NOW() - INTERVAL '6 months'
    GROUP BY month ORDER BY month ASC
  `);

  res.json({ trend: result.rows });
}));

export { router as impactRoutes };

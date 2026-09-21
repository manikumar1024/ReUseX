import { Router } from 'express';
import { query } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/stats — public platform statistics
// Returns REAL numbers from the database. Shows 0 when no data exists.
router.get('/', asyncHandler(async (_req, res) => {
  const [resourceRes, loanRes, impactRes, userRes] = await Promise.all([
    query(`
      SELECT
        COUNT(*) FILTER (WHERE status != 'retired') as total_resources,
        COUNT(*) FILTER (WHERE status = 'available') as available_resources
      FROM resources
    `),
    query(`
      SELECT
        COUNT(*) as total_loans,
        COUNT(*) FILTER (WHERE status = 'returned') as completed_loans
      FROM loans
    `),
    query(`
      SELECT COALESCE(SUM(estimated_value), 0)::NUMERIC as total_savings
      FROM impact_records
    `),
    query(`SELECT COUNT(*) as total_users FROM users WHERE is_active = true`)
  ]);

  const r = resourceRes.rows[0];
  const l = loanRes.rows[0];
  const i = impactRes.rows[0];
  const u = userRes.rows[0];

  res.json({
    total_resources: parseInt(r.total_resources) || 0,
    available_resources: parseInt(r.available_resources) || 0,
    total_loans: parseInt(l.total_loans) || 0,
    completed_loans: parseInt(l.completed_loans) || 0,
    total_savings_inr: parseFloat(i.total_savings) || 0,
    total_users: parseInt(u.total_users) || 0
  });
}));

export { router as statsRoutes };

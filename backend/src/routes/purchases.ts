import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { semanticSearch } from '../services/matchingEngine';

const router = Router();

// POST /api/purchases/check — duplicate purchase prevention
router.post('/check', authenticate, authorize('campus_admin', 'department_admin', 'lab_manager', 'faculty'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { item_name, description, quantity = 1, estimated_cost, purpose } = req.body;

  if (!item_name) {
    res.status(400).json({ error: 'Item name is required' });
    return;
  }

  // Search for existing campus resources
  const searchQuery = `${item_name} ${description || ''}`;
  const existingResources = await semanticSearch(searchQuery, {}, req.user!.id, 5);

  const alternatives = existingResources.map(r => ({
    resource_id: r.id,
    title: r.title,
    condition: r.condition,
    location: r.location,
    building: r.building,
    owner_name: r.owner_name,
    department_name: r.department_name,
    status: r.status,
    mode: r.mode,
    semantic_score: Math.round(r.semantic_score * 100),
    compatibility_percent: Math.min(99, Math.round(r.semantic_score * 100) + Math.floor(Math.random() * 10))
  }));

  const potentialSavings = alternatives.length > 0 && estimated_cost
    ? parseFloat(estimated_cost) * Math.min(quantity, alternatives.reduce((sum, r) => sum + 1, 0))
    : 0;

  // Store the purchase request
  const prResult = await query(
    `INSERT INTO purchase_requests (department_id, requested_by, item_name, description, quantity,
      estimated_cost, purpose, alternatives_found, estimated_savings, campus_check_done, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
     RETURNING id`,
    [req.user!.department_id || null, req.user!.id, item_name, description || null, quantity,
     estimated_cost || null, purpose || null, JSON.stringify(alternatives),
     potentialSavings,
     alternatives.length > 0 ? 'alternatives_found' : 'approved']
  );

  // Notify if alternatives found
  if (alternatives.length > 0) {
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1,'duplicate_purchase_alert','Campus Resources Found',$2,$3)`,
      [req.user!.id,
       `Found ${alternatives.length} existing campus resource(s) that may meet your requirement for "${item_name}". Consider requesting these before purchasing.`,
       JSON.stringify({ purchase_request_id: prResult.rows[0].id, alternatives_count: alternatives.length })]
    );
  }

  res.json({
    purchase_request_id: prResult.rows[0].id,
    alternatives_found: alternatives.length,
    alternatives,
    estimated_new_purchase_cost: estimated_cost ? parseFloat(estimated_cost) * quantity : null,
    potential_savings: potentialSavings,
    recommendation: alternatives.length > 0
      ? `${alternatives.length} potential campus resource(s) found. Consider requesting existing resources before purchasing.`
      : 'No exact matches found. You may proceed with the purchase request.',
    campus_check_complete: true
  });
}));

// GET /api/purchases — list purchase requests
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const isAdmin = ['campus_admin', 'department_admin'].includes(req.user!.role);

  const result = await query(`
    SELECT pr.*, u.name as requested_by_name, d.name as department_name
    FROM purchase_requests pr
    LEFT JOIN users u ON u.id = pr.requested_by
    LEFT JOIN departments d ON d.id = pr.department_id
    WHERE ${isAdmin ? '1=1' : 'pr.requested_by = $1'}
    ORDER BY pr.created_at DESC
    LIMIT 50
  `, isAdmin ? [] : [req.user!.id]);

  res.json({ purchase_requests: result.rows });
}));

export { router as purchaseRoutes };

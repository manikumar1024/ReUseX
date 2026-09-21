import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/users/:id — public profile
router.get('/:id', asyncHandler(async (req, res: Response) => {
  const result = await query(`
    SELECT u.id, u.name, u.role, u.reliability_score, u.total_loans, u.successful_returns,
           u.created_at, d.name as department_name, u.building,
           (SELECT COUNT(*) FROM resources WHERE owner_id = u.id AND status = 'available') as active_resources
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = $1 AND u.is_active = true
  `, [req.params.id]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const reviews = await query(`
    SELECT rev.rating, rev.comment, rev.created_at, u.name as reviewer_name
    FROM reviews rev
    LEFT JOIN users u ON u.id = rev.reviewer_id
    WHERE rev.reviewee_id = $1
    ORDER BY rev.created_at DESC LIMIT 10
  `, [req.params.id]);

  res.json({
    user: result.rows[0],
    reviews: reviews.rows
  });
}));

// POST /api/users/reviews
router.post('/reviews', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { loan_id, rating, comment, condition_accuracy, type } = req.body;

  if (!loan_id || !rating) {
    res.status(400).json({ error: 'Loan ID and rating are required' });
    return;
  }

  const loanRes = await query(
    "SELECT * FROM loans WHERE id = $1 AND (borrower_id = $2 OR owner_id = $2) AND status = 'returned'",
    [loan_id, req.user!.id]
  );

  if (!loanRes.rows[0]) {
    res.status(404).json({ error: 'Completed loan not found' });
    return;
  }

  const loan = loanRes.rows[0];
  const revieweeId = req.user!.id === loan.borrower_id ? loan.owner_id : loan.borrower_id;
  const reviewType = req.user!.id === loan.borrower_id ? 'owner_review' : 'borrower_review';

  // Check duplicate review
  const existing = await query(
    'SELECT id FROM reviews WHERE loan_id = $1 AND reviewer_id = $2',
    [loan_id, req.user!.id]
  );
  if (existing.rows[0]) {
    res.status(409).json({ error: 'You have already reviewed this loan' });
    return;
  }

  await query(
    `INSERT INTO reviews (loan_id, reviewer_id, reviewee_id, resource_id, rating, comment, condition_accuracy, type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [loan_id, req.user!.id, revieweeId, loan.resource_id, rating, comment || null, condition_accuracy || null, reviewType]
  );

  // Update reliability score
  const avgRes = await query(
    'SELECT AVG(rating)::NUMERIC as avg FROM reviews WHERE reviewee_id = $1',
    [revieweeId]
  );
  const newScore = parseFloat(avgRes.rows[0].avg || '5');
  await query('UPDATE users SET reliability_score = $1 WHERE id = $2', [newScore, revieweeId]);

  res.status(201).json({ message: 'Review submitted successfully' });
}));

export { router as userRoutes };

import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getAIProvider } from '../ai';
import { findMatches } from '../services/matchingEngine';

const router = Router();

// POST /api/requirements — create requirement and immediately find matches
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { raw_query, duration_days, required_from, required_until, budget_max, preferred_location, urgency } = req.body;

  if (!raw_query || raw_query.trim().length < 5) {
    res.status(400).json({ error: 'Please provide a more detailed description of what you need' });
    return;
  }

  const ai = getAIProvider();

  // Extract structured requirements using AI
  const structured = await ai.extractRequirement(raw_query);

  // Override AI values with explicit user inputs
  if (duration_days) structured.duration_days = duration_days;
  if (urgency) structured.urgency = urgency;
  if (budget_max) structured.budget_preference = 'specified';
  if (preferred_location) structured.preferred_location = preferred_location;

  // Store the requirement
  const reqResult = await query(
    `INSERT INTO requirements (user_id, raw_query, structured_data, category, resource_type,
      purpose, duration_days, urgency, budget_max, preferred_location, required_from, required_until)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [req.user!.id, raw_query, JSON.stringify(structured), structured.category,
     structured.resource_type, structured.purpose, structured.duration_days || duration_days || null,
     structured.urgency, budget_max || null, preferred_location || structured.preferred_location || null,
     required_from || null, required_until || null]
  );

  const requirement = reqResult.rows[0];

  // Find matches immediately
  const matches = await findMatches(structured, req.user!.id, 10);

  // Store top matches
  if (matches.length > 0) {
    for (const match of matches.slice(0, 5)) {
      await query(
        `INSERT INTO matches (requirement_id, resource_id, score, score_breakdown, explanation, explanation_points, limitations, ai_model)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT DO NOTHING`,
        [requirement.id, match.id, match.score, JSON.stringify(match.score_breakdown),
         match.explanation, match.explanation_points, match.limitations, getAIProvider().name]
      ).catch(() => {}); // Non-critical
    }

    // Notify user of matches
    await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1,'new_match','New Matches Found',$2,$3)`,
      [req.user!.id,
       `Found ${matches.length} campus resources matching your request for "${structured.resource_type}"`,
       JSON.stringify({ requirement_id: requirement.id, match_count: matches.length })]
    );
  }

  res.status(201).json({
    requirement,
    structured_understanding: structured,
    matches,
    message: matches.length > 0
      ? `Found ${matches.length} matching resources on campus`
      : 'No exact matches found. Your requirement has been saved — you\'ll be notified when matching resources become available.'
  });
}));

// GET /api/requirements
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT r.*, 
      (SELECT COUNT(*) FROM matches m WHERE m.requirement_id = r.id) as match_count
     FROM requirements r
     WHERE r.user_id = $1
     ORDER BY r.created_at DESC`,
    [req.user!.id]
  );
  res.json({ requirements: result.rows });
}));

// GET /api/requirements/:id/matches
router.get('/:id/matches', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { refresh = 'false' } = req.query as { refresh: string };

  // Verify ownership
  const reqResult = await query('SELECT * FROM requirements WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
  if (!reqResult.rows[0]) {
    res.status(404).json({ error: 'Requirement not found' });
    return;
  }

  const requirement = reqResult.rows[0];

  if (refresh === 'true') {
    // Re-run matching
    const ai = getAIProvider();
    const structured = await ai.extractRequirement(requirement.raw_query);
    const matches = await findMatches(structured, req.user!.id, 10);
    res.json({ requirement, matches, refreshed: true });
    return;
  }

  // Return stored matches
  const matchResult = await query(`
    SELECT m.*, r.title, r.description, r.condition, r.status, r.location, r.building,
           r.mode, r.available_quantity, r.available_from, r.available_until,
           u.name as owner_name, u.reliability_score,
           d.name as department_name,
           (SELECT url FROM resource_images ri WHERE ri.resource_id = r.id AND ri.is_primary = true LIMIT 1) as primary_image
    FROM matches m
    JOIN resources r ON r.id = m.resource_id
    LEFT JOIN users u ON u.id = r.owner_id
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE m.requirement_id = $1
    ORDER BY m.score DESC
  `, [id]);

  res.json({
    requirement,
    matches: matchResult.rows
  });
}));

export { router as requirementRoutes };

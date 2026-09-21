import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../config/database';
import { authenticate, optionalAuth, authorize, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';
import { getAIProvider } from '../ai';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const router = Router();

// GET /api/resources/categories — list all resource categories
router.get('/categories', asyncHandler(async (_req, res: Response) => {
  const result = await query(
    'SELECT id, name, slug, icon, description FROM resource_categories ORDER BY name ASC'
  );
  res.json({ categories: result.rows });
}));

// GET /api/resources/mine — authenticated user's own resources
router.get('/mine', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const result = await query(`
    SELECT r.id, r.title, r.description, r.resource_type, r.condition, r.status,
           r.location, r.building, r.mode, r.price, r.available_quantity, r.quantity,
           r.borrow_count, r.view_count, r.created_at, r.tags, r.lifecycle_stage,
           rc.name as category_name, rc.slug as category_slug,
           (SELECT url FROM resource_images ri WHERE ri.resource_id = r.id AND ri.is_primary = true LIMIT 1) as primary_image,
           (SELECT COUNT(*) FROM loans l WHERE l.resource_id = r.id AND l.status = 'requested') as pending_requests
    FROM resources r
    LEFT JOIN resource_categories rc ON rc.id = r.category_id
    WHERE r.owner_id = $1 AND r.status != 'retired'
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `, [req.user!.id, parseInt(limit), offset]);

  const countRes = await query(
    "SELECT COUNT(*) FROM resources WHERE owner_id = $1 AND status != 'retired'",
    [req.user!.id]
  );

  res.json({
    resources: result.rows,
    total: parseInt(countRes.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit)
  });
}));

const ResourceSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().min(10),
  category_id: z.string().optional().nullable(),
  resource_type: z.string().optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'poor']).default('good'),
  quantity: z.number().int().min(1).default(1),
  location: z.string().optional(),
  building: z.string().optional(),
  room_number: z.string().optional(),
  mode: z.enum(['borrow', 'give', 'exchange', 'low_cost_sale', 'department_transfer']).default('borrow'),
  price: z.number().optional().nullable(),
  specifications: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  available_from: z.string().optional().nullable(),
  available_until: z.string().optional().nullable(),
  is_hazardous: z.boolean().default(false),
  requires_approval: z.boolean().default(false)
});

// GET /api/resources
router.get('/', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const {
    category, status = 'available', mode, condition, department_id,
    page = '1', limit = '20', sort = 'created_at'
  } = req.query as Record<string, string>;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params: unknown[] = [];
  const where: string[] = ["r.status != 'retired'"];

  if (status) { params.push(status); where.push(`r.status = $${params.length}`); }
  if (category) { params.push(category); where.push(`rc.slug = $${params.length}`); }
  if (mode) { params.push(mode); where.push(`r.mode = $${params.length}`); }
  if (condition) { params.push(condition); where.push(`r.condition = $${params.length}`); }
  if (department_id) { params.push(department_id); where.push(`r.department_id = $${params.length}`); }

  params.push(parseInt(limit), offset);

  const sortMap: Record<string, string> = {
    created_at: 'r.created_at DESC',
    title: 'r.title ASC',
    borrow_count: 'r.borrow_count DESC'
  };
  const orderBy = sortMap[sort] || 'r.created_at DESC';

  const q = `
    SELECT r.id, r.title, r.description, r.resource_type, r.condition, r.status,
           r.location, r.building, r.mode, r.price, r.available_quantity, r.quantity,
           r.available_from, r.available_until, r.borrow_count, r.view_count,
           r.created_at, r.tags, r.is_hazardous,
           rc.name as category_name, rc.slug as category_slug,
           u.id as owner_id, u.name as owner_name, u.reliability_score,
           d.name as department_name,
           (SELECT url FROM resource_images ri WHERE ri.resource_id = r.id AND ri.is_primary = true LIMIT 1) as primary_image
    FROM resources r
    LEFT JOIN resource_categories rc ON rc.id = r.category_id
    LEFT JOIN users u ON u.id = r.owner_id
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const [resourcesRes, countRes] = await Promise.all([
    query(q, params),
    query(`SELECT COUNT(*) FROM resources r LEFT JOIN resource_categories rc ON rc.id = r.category_id WHERE ${where.join(' AND ')}`, params.slice(0, -2))
  ]);

  res.json({
    resources: resourcesRes.rows,
    total: parseInt(countRes.rows[0].count),
    page: parseInt(page),
    limit: parseInt(limit)
  });
}));

// GET /api/resources/:id
router.get('/:id', optionalAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Increment view count
  await query('UPDATE resources SET view_count = view_count + 1 WHERE id = $1', [id]);

  const result = await query(`
    SELECT r.*, rc.name as category_name, rc.slug as category_slug,
           u.id as owner_id, u.name as owner_name, u.email as owner_email,
           u.reliability_score, u.successful_returns, u.total_loans,
           u.building as owner_building, u.contact_number as owner_contact,
           d.name as department_name
    FROM resources r
    LEFT JOIN resource_categories rc ON rc.id = r.category_id
    LEFT JOIN users u ON u.id = r.owner_id
    LEFT JOIN departments d ON d.id = r.department_id
    WHERE r.id = $1
  `, [id]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  const images = await query('SELECT * FROM resource_images WHERE resource_id = $1 ORDER BY is_primary DESC', [id]);
  const reviews = await query(`
    SELECT rev.*, u.name as reviewer_name 
    FROM reviews rev 
    LEFT JOIN users u ON u.id = rev.reviewer_id 
    WHERE rev.resource_id = $1 
    ORDER BY rev.created_at DESC LIMIT 5
  `, [id]);

  res.json({
    resource: { ...result.rows[0], images: images.rows, recent_reviews: reviews.rows }
  });
}));

// POST /api/resources
router.post('/', authenticate, upload.array('images', 5), asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
  const parsed = ResourceSchema.safeParse(body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    return;
  }

  const data = parsed.data;

  // Restrict sale/transfer for non-admin roles
  if (['department_transfer', 'low_cost_sale'].includes(data.mode)) {
    const allowedRoles = ['campus_admin', 'department_admin', 'faculty', 'lab_manager'];
    if (!allowedRoles.includes(req.user!.role)) {
      res.status(403).json({ error: 'Only department admins and faculty can create sale or transfer listings' });
      return;
    }
  }

  let resolvedCategoryId = data.category_id || null;
  if (resolvedCategoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedCategoryId)) {
    const catLookup = await query(
      'SELECT id FROM resource_categories WHERE slug ILIKE $1 OR name ILIKE $1 LIMIT 1',
      [resolvedCategoryId]
    );
    resolvedCategoryId = catLookup.rows[0]?.id || null;
  }

  const resourceId = uuidv4();

  await query(
    `INSERT INTO resources (id, title, description, category_id, resource_type, owner_id, department_id,
      condition, quantity, available_quantity, location, building, room_number, mode, price,
      specifications, tags, available_from, available_until, is_hazardous, requires_approval, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,'available')`,
    [resourceId, data.title, data.description, resolvedCategoryId, data.resource_type || null,
     req.user!.id, req.user!.department_id || null, data.condition, data.quantity,
     data.location || null, data.building || null, data.room_number || null,
     data.mode, data.price || null,
     JSON.stringify(data.specifications || {}),
     data.tags || [],
     data.available_from || null, data.available_until || null,
     data.is_hazardous, data.requires_approval]
  );

  // Handle uploaded images
  const files = req.files as Express.Multer.File[];
  if (files?.length) {
    for (let i = 0; i < files.length; i++) {
      await query(
        'INSERT INTO resource_images (resource_id, url, is_primary) VALUES ($1, $2, $3)',
        [resourceId, `/uploads/${files[i].filename}`, i === 0]
      );
    }
  }

  // Generate QR code for the resource
  const qrCode = uuidv4();
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ type: 'resource', id: resourceId, code: qrCode }));
  await query(
    'INSERT INTO qr_codes (resource_id, code, type, data) VALUES ($1, $2, $3, $4)',
    [resourceId, qrCode, 'resource', JSON.stringify({ qr_image: qrDataUrl })]
  );

  // Generate embedding asynchronously
  generateAndStoreEmbedding(resourceId, data.title + ' ' + data.description + ' ' + (data.tags || []).join(' ')).catch(console.error);

  res.status(201).json({
    message: 'Resource created successfully',
    resource_id: resourceId
  });
}));

// PATCH /api/resources/:id
router.patch('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const resource = await query('SELECT owner_id FROM resources WHERE id = $1', [id]);
  if (!resource.rows[0]) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  const isOwner = resource.rows[0].owner_id === req.user!.id;
  const isAdmin = ['campus_admin', 'department_admin'].includes(req.user!.role);

  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: 'Not authorized to edit this resource' });
    return;
  }

  const allowed = ['title', 'description', 'condition', 'location', 'building', 'mode', 'price',
    'available_from', 'available_until', 'status', 'specifications', 'tags', 'available_quantity'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      values.push(req.body[field]);
      updates.push(`${field} = $${values.length}`);
    }
  }

  if (!updates.length) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  values.push(id);
  await query(
    `UPDATE resources SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length}`,
    values
  );

  res.json({ message: 'Resource updated successfully' });
}));

// DELETE /api/resources/:id
router.delete('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const resource = await query('SELECT owner_id FROM resources WHERE id = $1', [id]);

  if (!resource.rows[0]) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  const isOwner = resource.rows[0].owner_id === req.user!.id;
  const isAdmin = ['campus_admin'].includes(req.user!.role);

  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  await query("UPDATE resources SET status = 'retired', lifecycle_stage = 'retired' WHERE id = $1", [id]);
  res.json({ message: 'Resource retired successfully' });
}));

// POST /api/resources/:id/request
router.post('/:id/request', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { quantity = 1, requested_from, requested_until, notes, requirement_id } = req.body;

  const resource = await query(
    "SELECT id, owner_id, title, available_quantity, requires_approval, mode FROM resources WHERE id = $1 AND status = 'available'",
    [id]
  );

  if (!resource.rows[0]) {
    res.status(404).json({ error: 'Resource not available' });
    return;
  }

  const r = resource.rows[0];
  if (r.owner_id === req.user!.id) {
    res.status(400).json({ error: 'You cannot request your own resource' });
    return;
  }

  if (r.available_quantity < quantity) {
    res.status(400).json({ error: 'Requested quantity not available' });
    return;
  }

  // Check for duplicate pending request
  const existing = await query(
    "SELECT id FROM loans WHERE resource_id = $1 AND borrower_id = $2 AND status IN ('requested','approved','active')",
    [id, req.user!.id]
  );
  if (existing.rows[0]) {
    res.status(409).json({ error: 'You already have an active request for this resource' });
    return;
  }

  const autoApprove = r.mode === 'give' && !r.requires_approval;
  const loanStatus = autoApprove ? 'approved' : 'requested';

  const loanResult = await query(
    `INSERT INTO loans (resource_id, borrower_id, owner_id, requirement_id, status, quantity,
      requested_from, requested_until, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [id, req.user!.id, r.owner_id, requirement_id || null, loanStatus, quantity,
     requested_from || null, requested_until || null, notes || null]
  );

  // Send notification to owner
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1,'request_received','New Resource Request','${'Someone has requested your resource: ' + r.title}', $2)`,
    [r.owner_id, JSON.stringify({ loan_id: loanResult.rows[0].id, resource_id: id })]
  );

  res.status(201).json({
    message: autoApprove ? 'Request automatically approved' : 'Request submitted for approval',
    loan_id: loanResult.rows[0].id,
    status: loanStatus
  });
}));

// GET /api/resources/:id/qr
router.get('/:id/qr', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const qr = await query("SELECT * FROM qr_codes WHERE resource_id = $1 AND type = 'resource' LIMIT 1", [id]);

  if (!qr.rows[0]) {
    res.status(404).json({ error: 'QR code not found' });
    return;
  }

  res.json({ qr_code: qr.rows[0] });
}));

async function generateAndStoreEmbedding(resourceId: string, text: string) {
  try {
    const ai = getAIProvider();
    const { embedding, model } = await ai.generateEmbedding(text);
    // Delete existing embedding first, then insert fresh
    await query('DELETE FROM resource_embeddings WHERE resource_id = $1', [resourceId]);
    await query(
      `INSERT INTO resource_embeddings (resource_id, embedding, embedding_text, model_used)
       VALUES ($1, $2::vector, $3, $4)`,
      [resourceId, `[${embedding.join(',')}]`, text, model]
    );
  } catch (err) {
    console.error('Failed to generate embedding:', err);
  }
}

export { router as resourceRoutes };

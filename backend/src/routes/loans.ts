import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const router = Router();

// GET /api/loans
router.get('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { type = 'borrowing', status } = req.query as { type: string; status?: string };

  let userFilter = 'l.borrower_id = $1';
  if (type === 'lending') {
    userFilter = 'l.owner_id = $1';
  } else if (type === 'all') {
    userFilter = '(l.borrower_id = $1 OR l.owner_id = $1)';
  }
  const params: unknown[] = [req.user!.id];

  if (status) { params.push(status); }

  const result = await query(`
    SELECT l.*, 
           r.title as resource_title, r.condition, r.location,
           (SELECT url FROM resource_images ri WHERE ri.resource_id = r.id AND ri.is_primary = true LIMIT 1) as resource_image,
           borrower.name as borrower_name, borrower.email as borrower_email,
           owner.name as owner_name, owner.email as owner_email
    FROM loans l
    JOIN resources r ON r.id = l.resource_id
    JOIN users borrower ON borrower.id = l.borrower_id
    JOIN users owner ON owner.id = l.owner_id
    WHERE ${userFilter}
    ${status ? `AND l.status = $2` : ''}
    ORDER BY l.created_at DESC
  `, params);

  res.json({ loans: result.rows });
}));

// GET /api/loans/:id
router.get('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query(`
    SELECT l.*, 
           r.title as resource_title, r.description as resource_description,
           r.condition, r.location, r.building, r.mode,
           (SELECT url FROM resource_images ri WHERE ri.resource_id = r.id AND ri.is_primary = true LIMIT 1) as resource_image,
           borrower.name as borrower_name, borrower.email as borrower_email, borrower.contact_number as borrower_contact,
           owner.name as owner_name, owner.email as owner_email, owner.contact_number as owner_contact
    FROM loans l
    JOIN resources r ON r.id = l.resource_id
    JOIN users borrower ON borrower.id = l.borrower_id
    JOIN users owner ON owner.id = l.owner_id
    WHERE l.id = $1 AND (l.borrower_id = $2 OR l.owner_id = $2)
  `, [id, req.user!.id]);

  if (!result.rows[0]) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }

  res.json({ loan: result.rows[0] });
}));

// PATCH /api/loans/:id — approve, reject, cancel
router.patch('/:id', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { action, notes } = req.body;

  const loanRes = await query(
    'SELECT l.*, r.title as resource_title, r.available_quantity FROM loans l JOIN resources r ON r.id = l.resource_id WHERE l.id = $1',
    [id]
  );
  const loan = loanRes.rows[0];
  if (!loan) {
    res.status(404).json({ error: 'Loan not found' });
    return;
  }

  const isOwner = loan.owner_id === req.user!.id;
  const isBorrower = loan.borrower_id === req.user!.id;
  const isAdmin = ['campus_admin', 'department_admin'].includes(req.user!.role);

  switch (action) {
    case 'approve':
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Only the resource owner can approve' });
        return;
      }
      if (loan.status !== 'requested') {
        res.status(400).json({ error: 'Can only approve pending requests' });
        return;
      }

      // Generate handover QR
      const handoverCode = uuidv4();
      const handoverQr = await QRCode.toDataURL(JSON.stringify({
        type: 'handover', loan_id: id, code: handoverCode, resource_id: loan.resource_id
      }));

      await query(
        `UPDATE loans SET status = 'approved', owner_notes = $1, qr_handover_code = $2, updated_at = NOW() WHERE id = $3`,
        [notes || null, handoverCode, id]
      );
      await query(
        'INSERT INTO qr_codes (resource_id, loan_id, code, type, data) VALUES ($1,$2,$3,$4,$5)',
        [loan.resource_id, id, handoverCode, 'handover', JSON.stringify({ qr_image: handoverQr })]
      );

      // Notify borrower
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1,'request_approved','Request Approved',$2,$3)`,
        [loan.borrower_id,
         `Your request for "${loan.resource_title}" has been approved! Please pick it up.`,
         JSON.stringify({ loan_id: id, qr_code: handoverCode })]
      );
      res.json({ message: 'Request approved', handover_qr: handoverQr });
      break;

    case 'reject':
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: 'Only the resource owner can reject' });
        return;
      }
      await query(
        `UPDATE loans SET status = 'rejected', owner_notes = $1, updated_at = NOW() WHERE id = $2`,
        [notes || null, id]
      );
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data)
         VALUES ($1,'request_rejected','Request Declined',$2,$3)`,
        [loan.borrower_id,
         `Your request for "${loan.resource_title}" was declined.${notes ? ' Reason: ' + notes : ''}`,
         JSON.stringify({ loan_id: id })]
      );
      res.json({ message: 'Request rejected' });
      break;

    case 'cancel':
      if (!isBorrower) {
        res.status(403).json({ error: 'Only the borrower can cancel' });
        return;
      }
      if (!['requested', 'approved'].includes(loan.status)) {
        res.status(400).json({ error: 'Cannot cancel an active or completed loan' });
        return;
      }
      await query(
        `UPDATE loans SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]
      );
      res.json({ message: 'Request cancelled' });
      break;

    default:
      res.status(400).json({ error: 'Invalid action. Use: approve, reject, cancel' });
  }
}));

// POST /api/loans/:id/handover — QR handover verification
router.post('/:id/handover', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { qr_code } = req.body;

  const loanRes = await query(
    'SELECT l.*, r.available_quantity FROM loans l JOIN resources r ON r.id = l.resource_id WHERE l.id = $1',
    [id]
  );
  const loan = loanRes.rows[0];

  if (!loan || loan.status !== 'approved') {
    res.status(400).json({ error: 'Loan not found or not in approved state' });
    return;
  }

  if (loan.qr_handover_code !== qr_code) {
    res.status(400).json({ error: 'Invalid QR code' });
    return;
  }

  const isOwner = loan.owner_id === req.user!.id;
  const isBorrower = loan.borrower_id === req.user!.id;

  if (!isOwner && !isBorrower) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  // Generate return QR
  const returnCode = uuidv4();
  const returnQr = await QRCode.toDataURL(JSON.stringify({
    type: 'return', loan_id: id, code: returnCode
  }));

  await query(
    `UPDATE loans SET status = 'active', actual_start = NOW(), handover_verified_at = NOW(),
     qr_return_code = $1, updated_at = NOW() WHERE id = $2`,
    [returnCode, id]
  );

  // Decrease available quantity
  await query(
    'UPDATE resources SET available_quantity = available_quantity - $1 WHERE id = $2',
    [loan.quantity, loan.resource_id]
  );

  // Store return QR
  await query(
    'INSERT INTO qr_codes (resource_id, loan_id, code, type, data) VALUES ($1,$2,$3,$4,$5)',
    [loan.resource_id, id, returnCode, 'return', JSON.stringify({ qr_image: returnQr })]
  );

  res.json({ message: 'Handover verified. Loan is now active.', return_qr: returnQr });
}));

// POST /api/loans/:id/return — QR return verification
router.post('/:id/return', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { qr_code, condition_note } = req.body;

  const loanRes = await query(
    'SELECT l.*, r.title as resource_title FROM loans l JOIN resources r ON r.id = l.resource_id WHERE l.id = $1',
    [id]
  );
  const loan = loanRes.rows[0];

  if (!loan || !['active', 'overdue'].includes(loan.status)) {
    res.status(400).json({ error: 'Loan not found or not active' });
    return;
  }

  if (loan.qr_return_code !== qr_code) {
    res.status(400).json({ error: 'Invalid return QR code' });
    return;
  }

  const isOwner = loan.owner_id === req.user!.id;
  const isBorrower = loan.borrower_id === req.user!.id;
  if (!isOwner && !isBorrower) {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  await query(
    `UPDATE loans SET status = 'returned', actual_end = NOW(), return_verified_at = NOW(),
     borrower_notes = COALESCE($1, borrower_notes), updated_at = NOW() WHERE id = $2`,
    [condition_note || null, id]
  );

  // Restore available quantity
  await query(
    'UPDATE resources SET available_quantity = available_quantity + $1, borrow_count = borrow_count + 1, last_borrowed_at = NOW() WHERE id = $2',
    [loan.quantity, loan.resource_id]
  );

  // Update user stats
  await query(
    'UPDATE users SET successful_returns = successful_returns + 1, total_loans = total_loans + 1 WHERE id = $1',
    [loan.borrower_id]
  );

  // Create impact record
  const resourceRes = await query('SELECT price FROM resources WHERE id = $1', [loan.resource_id]);
  const estimatedValue = resourceRes.rows[0]?.price || 500; // default estimate

  await query(
    `INSERT INTO impact_records (loan_id, resource_id, user_id, type, estimated_value, estimated_co2_kg)
     VALUES ($1,$2,$3,'reuse',$4,$5)`,
    [id, loan.resource_id, loan.borrower_id, estimatedValue, estimatedValue * 0.001]
  );

  // Notify owner
  await query(
    `INSERT INTO notifications (user_id, type, title, message, data)
     VALUES ($1,'resource_returned','Resource Returned',$2,$3)`,
    [loan.owner_id,
     `"${loan.resource_title}" has been returned. Please verify its condition.`,
     JSON.stringify({ loan_id: id })]
  );

  res.json({ message: 'Return verified successfully! Thank you for using CampusLoop.' });
}));

export { router as loanRoutes };

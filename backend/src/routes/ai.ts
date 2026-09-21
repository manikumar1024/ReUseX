import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getAIProvider } from '../ai';
import { upload } from '../middleware/upload';
import fs from 'fs';

const router = Router();

// POST /api/ai/extract-requirement
router.post('/extract-requirement', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { query: rawQuery } = req.body;

  if (!rawQuery || rawQuery.trim().length < 5) {
    res.status(400).json({ error: 'Please provide a more detailed description' });
    return;
  }

  const ai = getAIProvider();
  const start = Date.now();
  const result = await ai.extractRequirement(rawQuery);
  const duration = Date.now() - start;

  // Log AI interaction
  await query(
    `INSERT INTO ai_interactions (user_id, type, input_summary, output_summary, model_used, duration_ms)
     VALUES ($1,'requirement_extraction',$2,$3,$4,$5)`,
    [req.user!.id, rawQuery.substring(0, 200),
     `category:${result.category} type:${result.resource_type}`,
     ai.name, duration]
  ).catch(() => {});

  res.json({ extraction: result, model: ai.name, ai_mode: process.env.AI_MODE || 'mock' });
}));

// POST /api/ai/classify-resource
router.post('/classify-resource', authenticate, upload.single('image'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  const imageFile = req.file;

  if (!text && !imageFile) {
    res.status(400).json({ error: 'Provide text description or image' });
    return;
  }

  let imageBase64: string | undefined;
  if (imageFile) {
    const buffer = fs.readFileSync(imageFile.path);
    imageBase64 = buffer.toString('base64');
  }

  const ai = getAIProvider();
  const result = await ai.classifyResource(text || 'Unknown item', imageBase64);

  // Log interaction
  await query(
    `INSERT INTO ai_interactions (user_id, type, input_summary, model_used, confidence, duration_ms)
     VALUES ($1,'resource_classification',$2,$3,$4,0)`,
    [req.user!.id, (text || 'image upload').substring(0, 200), ai.name, result.confidence]
  ).catch(() => {});

  res.json({
    classification: result,
    model: ai.name,
    responsible_ai_note: result.confidence < 0.7
      ? 'AI confidence is low. Please review and correct the classification before publishing.'
      : null
  });
}));

// POST /api/ai/project-plan
router.post('/project-plan', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { project_description } = req.body;

  if (!project_description || project_description.trim().length < 5) {
    res.status(400).json({ error: 'Please describe your project' });
    return;
  }

  const ai = getAIProvider();
  const plan = await ai.generateProjectPlan(project_description);

  // Now search campus resources for each component
  const { semanticSearch } = await import('../services/matchingEngine');

  const componentsWithMatches = await Promise.all(
    plan.components.map(async (component) => {
      const matches = await semanticSearch(
        `${component.name} ${component.category}`,
        { status: 'available' },
        req.user!.id,
        3
      );
      return {
        ...component,
        campus_matches: matches.map(m => ({
          id: m.id,
          title: m.title,
          owner_name: m.owner_name,
          location: m.location,
          condition: m.condition,
          semantic_score: m.semantic_score
        })),
        available_on_campus: matches.length > 0
      };
    })
  );

  const available = componentsWithMatches.filter(c => c.available_on_campus && c.priority === 'required');
  const missing = componentsWithMatches.filter(c => !c.available_on_campus && c.priority === 'required');
  const matchCoverage = plan.components.filter(c => c.priority === 'required').length > 0
    ? Math.round((available.length / plan.components.filter(c => c.priority === 'required').length) * 100)
    : 0;

  const estimatedSavings = available.length * 350; // avg component cost estimate

  res.json({
    plan: {
      ...plan,
      components: componentsWithMatches
    },
    summary: {
      total_required: plan.components.filter(c => c.priority === 'required').length,
      available_on_campus: available.length,
      missing_components: missing.length,
      match_coverage_percent: matchCoverage,
      estimated_purchases_avoided: available.length,
      estimated_savings_inr: estimatedSavings
    },
    model: ai.name
  });
}));

// POST /api/ai/match — get match explanation for specific resource + requirement
router.post('/match', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { requirement_text, resource_id } = req.body;

  const resourceRes = await query('SELECT * FROM resources WHERE id = $1', [resource_id]);
  if (!resourceRes.rows[0]) {
    res.status(404).json({ error: 'Resource not found' });
    return;
  }

  const ai = getAIProvider();
  const structured = await ai.extractRequirement(requirement_text);
  const explanation = await ai.generateMatchExplanation(structured, resourceRes.rows[0], 0.75);

  res.json({ match: explanation, model: ai.name });
}));

export { router as aiRoutes };

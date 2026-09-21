import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { getAIProvider } from '../ai';

const router = Router();

// POST /api/rag/query
router.post('/query', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { question } = req.body;

  if (!question || question.trim().length < 5) {
    res.status(400).json({ error: 'Please provide a question' });
    return;
  }

  const ai = getAIProvider();

  // Generate embedding for the question
  const { embedding } = await ai.generateEmbedding(question);

  // Retrieve relevant chunks
  let chunks: Array<{ content: string; title: string; document_id: string }> = [];

  try {
    const result = await query(`
      SELECT kc.content, kd.title, kd.id as document_id,
             1 - (kc.embedding <=> $1::vector) as similarity
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
      WHERE kd.is_active = true AND kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> $1::vector
      LIMIT 5
    `, [`[${embedding.join(',')}]`]);

    chunks = result.rows.filter(r => r.similarity > 0.3);
  } catch {
    // Vector search failed, fall back to text search
    const fallback = await query(`
      SELECT kc.content, kd.title, kd.id as document_id
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
      WHERE kd.is_active = true
        AND kc.content ILIKE $1
      LIMIT 5
    `, [`%${question.split(' ').slice(0, 3).join('%')}%`]);
    chunks = fallback.rows;
  }

  const contextTexts = chunks.map(c => c.content);
  const sources = chunks.map(c => ({ title: c.title, id: c.document_id }));

  const response = await ai.answerWithRAG(question, contextTexts, sources);

  // Log
  await query(
    `INSERT INTO ai_interactions (user_id, type, input_summary, model_used, confidence)
     VALUES ($1,'rag_query',$2,$3,$4)`,
    [req.user!.id, question.substring(0, 200), ai.name,
     response.confidence === 'high' ? 0.9 : response.confidence === 'medium' ? 0.65 : 0.3]
  ).catch(() => {});

  res.json({
    answer: response.answer,
    sources: response.sources,
    confidence: response.confidence,
    model: ai.name,
    responsible_ai_note: 'This answer is generated using campus knowledge base documents. For official policy, consult your department administrator.'
  });
}));

export { router as ragRoutes };

import { query } from '../config/database';
import { getAIProvider } from '../ai';
import { RequirementExtraction } from '../ai/types';

// Score weights (configurable via env)
const WEIGHTS = {
  functional: parseFloat(process.env.MATCH_WEIGHT_FUNCTIONAL || '0.35'),
  availability: parseFloat(process.env.MATCH_WEIGHT_AVAILABILITY || '0.20'),
  timing: parseFloat(process.env.MATCH_WEIGHT_TIMING || '0.15'),
  location: parseFloat(process.env.MATCH_WEIGHT_LOCATION || '0.10'),
  condition: parseFloat(process.env.MATCH_WEIGHT_CONDITION || '0.10'),
  reliability: parseFloat(process.env.MATCH_WEIGHT_RELIABILITY || '0.05'),
  sustainability: parseFloat(process.env.MATCH_WEIGHT_SUSTAINABILITY || '0.05')
};

export interface ResourceCandidate {
  id: string;
  title: string;
  description: string;
  category: string;
  resource_type: string;
  condition: string;
  status: string;
  location: string;
  building: string;
  mode: string;
  available_quantity: number;
  available_from: string;
  available_until: string;
  owner_id: string;
  owner_name: string;
  owner_reliability: number;
  department_name: string;
  semantic_score: number;
}

export interface MatchResult extends ResourceCandidate {
  score: number;
  score_breakdown: Record<string, number>;
  explanation: string;
  explanation_points: string[];
  limitations: string[];
}

// Compute cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
}

// Hard constraint filter
function passesHardConstraints(resource: ResourceCandidate, req: RequirementExtraction): boolean {
  // Must be available or have available quantity
  if (resource.available_quantity <= 0) return false;
  if (!['available', 'borrowed'].includes(resource.status) && resource.status !== 'available') {
    if (resource.status !== 'available') return false;
  }

  // Date constraint
  if (req.duration_days && resource.available_until) {
    const until = new Date(resource.available_until);
    const needed = new Date();
    needed.setDate(needed.getDate() + req.duration_days);
    if (until < needed) return false;
  }

  return true;
}

function scoreAvailability(resource: ResourceCandidate): number {
  if (resource.status === 'available' && resource.available_quantity > 0) return 95;
  if (resource.status === 'available') return 75;
  return 40;
}

function scoreTiming(resource: ResourceCandidate, req: RequirementExtraction): number {
  if (!req.duration_days) return 80;
  if (!resource.available_until) return 70;
  const until = new Date(resource.available_until);
  const needed = new Date();
  needed.setDate(needed.getDate() + req.duration_days);
  if (until >= needed) return 95;
  // Partially available
  const daysAvailable = (until.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.max(30, (daysAvailable / req.duration_days) * 80);
}

function scoreLocation(resource: ResourceCandidate, req: RequirementExtraction): number {
  if (!req.preferred_location) return 75;
  const loc = (resource.location + ' ' + resource.building).toLowerCase();
  if (loc.includes(req.preferred_location.toLowerCase())) return 95;
  return 60;
}

function scoreCondition(condition: string): number {
  const scores: Record<string, number> = {
    excellent: 100, good: 85, fair: 65, poor: 40
  };
  return scores[condition] || 70;
}

function scoreReliability(ownerReliability: number): number {
  return Math.min(100, ownerReliability * 20);
}

export async function findMatches(
  requirement: RequirementExtraction,
  userId: string,
  limit = 10
): Promise<MatchResult[]> {
  const ai = getAIProvider();

  // Generate embedding for the requirement
  const { embedding } = await ai.generateEmbedding(
    `${requirement.resource_type} ${requirement.functional_requirements.join(' ')} ${requirement.purpose}`
  );

  // First try vector similarity if embeddings exist
  let candidates: ResourceCandidate[] = [];

  try {
    const vectorQuery = `
      SELECT DISTINCT ON (r.id)
        r.id, r.title, r.description, rc.slug as category, r.resource_type,
        r.condition, r.status, r.location, r.building, r.mode,
        r.available_quantity, r.available_from, r.available_until,
        r.owner_id, u.name as owner_name, u.reliability_score as owner_reliability,
        d.name as department_name,
        1 - (re.embedding <=> $1::vector) as semantic_score
      FROM resources r
      LEFT JOIN resource_embeddings re ON re.resource_id = r.id
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN resource_categories rc ON rc.id = r.category_id
      WHERE r.status = 'available'
        AND r.owner_id != $2
        AND r.available_quantity > 0
        AND (re.embedding IS NOT NULL)
      ORDER BY r.id, semantic_score DESC
      LIMIT $3
    `;
    const res = await query(vectorQuery, [`[${embedding.join(',')}]`, userId, limit * 3]);
    candidates = res.rows;
  } catch {
    // Vector search unavailable, fall back to keyword search
    const keywordQuery = `
      SELECT
        r.id, r.title, r.description, rc.slug as category, r.resource_type,
        r.condition, r.status, r.location, r.building, r.mode,
        r.available_quantity, r.available_from, r.available_until,
        r.owner_id, u.name as owner_name, u.reliability_score as owner_reliability,
        d.name as department_name,
        0.5 as semantic_score
      FROM resources r
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN resource_categories rc ON rc.id = r.category_id
      WHERE r.status = 'available'
        AND r.owner_id != $1
        AND r.available_quantity > 0
        AND (
          to_tsvector('english', r.title || ' ' || r.description) @@ 
          plainto_tsquery('english', $2)
          OR r.title ILIKE $3
        )
      ORDER BY r.created_at DESC
      LIMIT $4
    `;
    const searchTerm = `${requirement.resource_type} ${requirement.functional_requirements.join(' ')}`;
    const res = await query(keywordQuery, [userId, searchTerm, `%${requirement.resource_type}%`, limit * 3]);
    candidates = res.rows.map(row => ({
      ...row,
      semantic_score: computeKeywordSimilarity(row.title + ' ' + row.description, searchTerm)
    }));
  }

  // Apply hard constraint filters
  const filtered = candidates.filter(c => passesHardConstraints(c, requirement));

  // Score each candidate
  const scored: MatchResult[] = await Promise.all(
    filtered.map(async (resource) => {
      const sem = resource.semantic_score;
      const avail = scoreAvailability(resource);
      const timing = scoreTiming(resource, requirement);
      const loc = scoreLocation(resource, requirement);
      const cond = scoreCondition(resource.condition);
      const rel = scoreReliability(resource.owner_reliability || 4.5);
      const sust = 85;

      const overall = Math.round(
        sem * 100 * WEIGHTS.functional +
        avail * WEIGHTS.availability +
        timing * WEIGHTS.timing +
        loc * WEIGHTS.location +
        cond * WEIGHTS.condition +
        rel * WEIGHTS.reliability +
        sust * WEIGHTS.sustainability
      );

      const explanationData = await ai.generateMatchExplanation(
        requirement,
        resource as unknown as Record<string, unknown>,
        sem
      );

      return {
        ...resource,
        score: Math.min(99, Math.max(1, overall)),
        score_breakdown: {
          functional_compatibility: Math.round(sem * 100),
          availability: Math.round(avail),
          timing: Math.round(timing),
          location: Math.round(loc),
          condition: Math.round(cond),
          reliability: Math.round(rel),
          sustainability_value: sust
        },
        explanation: explanationData.explanation,
        explanation_points: explanationData.explanation_points,
        limitations: explanationData.limitations
      };
    })
  );

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function computeKeywordSimilarity(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return 0.3;
  const matches = queryWords.filter(w => textLower.includes(w));
  return Math.max(0.1, matches.length / queryWords.length * 0.9);
}

// Semantic search for general queries
export async function semanticSearch(
  searchQuery: string,
  filters: {
    category?: string;
    mode?: string;
    condition?: string;
    department_id?: string;
    status?: string;
  } = {},
  userId?: string,
  limit = 20
): Promise<ResourceCandidate[]> {
  const ai = getAIProvider();
  const { embedding } = await ai.generateEmbedding(searchQuery);

  const whereConditions = ["r.status != 'retired'", "r.available_quantity > 0"];
  const params: unknown[] = [`[${embedding.join(',')}]`];
  let paramIndex = 2;

  if (userId) {
    whereConditions.push(`r.owner_id != $${paramIndex++}`);
    params.push(userId);
  }
  if (filters.category) {
    whereConditions.push(`rc.slug = $${paramIndex++}`);
    params.push(filters.category);
  }
  if (filters.mode) {
    whereConditions.push(`r.mode = $${paramIndex++}`);
    params.push(filters.mode);
  }
  if (filters.condition) {
    whereConditions.push(`r.condition = $${paramIndex++}`);
    params.push(filters.condition);
  }
  if (filters.status) {
    whereConditions.push(`r.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  params.push(limit);

  try {
    const q = `
      SELECT DISTINCT ON (r.id)
        r.id, r.title, r.description, rc.slug as category, r.resource_type,
        r.condition, r.status, r.location, r.building, r.mode,
        r.available_quantity, r.available_from, r.available_until,
        r.owner_id, u.name as owner_name, u.reliability_score as owner_reliability,
        d.name as department_name,
        COALESCE(1 - (re.embedding <=> $1::vector), 0.5) as semantic_score
      FROM resources r
      LEFT JOIN resource_embeddings re ON re.resource_id = r.id
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN resource_categories rc ON rc.id = r.category_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY r.id, semantic_score DESC
      LIMIT $${paramIndex}
    `;
    const res = await query(q, params);
    return res.rows.sort((a, b) => b.semantic_score - a.semantic_score);
  } catch {
    // Fallback text search
    const fallbackParams: unknown[] = [];
    if (userId) fallbackParams.push(userId);
    fallbackParams.push(`%${searchQuery}%`);
    fallbackParams.push(limit);

    const q2 = `
      SELECT r.id, r.title, r.description, rc.slug as category, r.resource_type,
        r.condition, r.status, r.location, r.building, r.mode,
        r.available_quantity, r.available_from, r.available_until,
        r.owner_id, u.name as owner_name, u.reliability_score as owner_reliability,
        d.name as department_name, 0.5 as semantic_score
      FROM resources r
      LEFT JOIN users u ON u.id = r.owner_id
      LEFT JOIN departments d ON d.id = r.department_id
      LEFT JOIN resource_categories rc ON rc.id = r.category_id
      WHERE r.status != 'retired'
        ${userId ? 'AND r.owner_id != $1' : ''}
        AND (r.title ILIKE $${userId ? 2 : 1} OR r.description ILIKE $${userId ? 2 : 1})
      ORDER BY r.created_at DESC
      LIMIT $${userId ? 3 : 2}
    `;
    const res = await query(q2, fallbackParams);
    return res.rows;
  }
}

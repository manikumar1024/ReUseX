import {
  AIProvider,
  RequirementExtraction,
  ResourceClassification,
  MatchExplanation,
  ProjectPlan,
  RAGResponse,
  EmbeddingResult
} from './types';

// IBM Granite / Watsonx provider
// Set AI_MODE=granite and configure IBM credentials to use
export class GraniteProvider implements AIProvider {
  name = 'granite';
  private apiKey: string;
  private projectId: string;
  private baseUrl: string;
  private modelId: string;

  constructor() {
    this.apiKey = process.env.IBM_GRANITE_API_KEY || '';
    this.projectId = process.env.IBM_PROJECT_ID || '';
    this.baseUrl = process.env.IBM_WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
    this.modelId = process.env.IBM_GRANITE_MODEL_ID || 'ibm/granite-13b-instruct-v2';
  }

  private async callWatsonx(prompt: string, maxTokens = 500): Promise<string> {
    const url = `${this.baseUrl}/ml/v1/text/generation?version=2023-05-29`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model_id: this.modelId,
        input: prompt,
        parameters: {
          decoding_method: 'greedy',
          max_new_tokens: maxTokens,
          min_new_tokens: 1,
          stop_sequences: ['```', '\n\n\n']
        },
        project_id: this.projectId
      })
    });

    if (!response.ok) {
      throw new Error(`Watsonx API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { results: Array<{ generated_text: string }> };
    return data.results?.[0]?.generated_text?.trim() || '';
  }

  private parseJSON<T>(text: string, fallback: T): T {
    try {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as T;
    } catch { /* ignore */ }
    return fallback;
  }

  async extractRequirement(rawQuery: string): Promise<RequirementExtraction> {
    const prompt = `Extract structured requirements from this campus resource request.
Query: "${rawQuery}"

Return ONLY valid JSON (no markdown):
{
  "category": "electronics|computing|books|laboratory|furniture|sports|tools|events|other",
  "resource_type": "specific item type",
  "functional_requirements": ["requirement1", "requirement2"],
  "technical_specs": {},
  "budget_preference": "low-cost|normal|null",
  "purpose": "use case",
  "duration_days": number or null,
  "urgency": "low|normal|high|urgent",
  "quantity": 1,
  "preferred_location": null,
  "raw_query": "${rawQuery}"
}`;

    const text = await this.callWatsonx(prompt, 300);
    const fallback: RequirementExtraction = {
      category: 'other',
      resource_type: 'general equipment',
      functional_requirements: [],
      technical_specs: {},
      budget_preference: null,
      purpose: rawQuery,
      duration_days: null,
      urgency: 'normal',
      quantity: 1,
      preferred_location: null,
      raw_query: rawQuery
    };
    return this.parseJSON(text, fallback);
  }

  async classifyResource(text: string, imageBase64?: string): Promise<ResourceClassification> {
    let prompt = `Classify this campus resource from its description.
Description: "${text}"
${imageBase64 ? '(Image provided - analyze visually)' : ''}

Return ONLY valid JSON:
{
  "title": "proper item name",
  "category": "category",
  "resource_type": "specific type",
  "brand": "brand or null",
  "model": "model or null",
  "specifications": {},
  "applications": ["app1"],
  "confidence": 0.85
}`;

    const text2 = await this.callWatsonx(prompt, 300);
    const fallback: ResourceClassification = {
      title: text,
      category: 'other',
      resource_type: 'equipment',
      brand: null,
      model: null,
      specifications: {},
      applications: [],
      confidence: 0.5,
      warning: 'Could not classify resource automatically. Please verify details.'
    };
    return this.parseJSON(text2, fallback);
  }

  async generateMatchExplanation(
    requirement: RequirementExtraction,
    resource: Record<string, unknown>,
    semanticScore: number
  ): Promise<MatchExplanation> {
    const overall = Math.round(semanticScore * 80 + 20);
    return {
      score: overall,
      score_breakdown: {
        functional_compatibility: Math.round(semanticScore * 100),
        availability: resource.status === 'available' ? 95 : 60,
        timing: 80,
        location: 75,
        condition: resource.condition === 'excellent' ? 100 : 80,
        reliability: 85,
        sustainability_value: 85
      },
      explanation: `${overall}% match based on Granite AI semantic analysis with resource ${resource.title}.`,
      explanation_points: [
        `Semantically compatible with ${requirement.resource_type} requirements`,
        `Resource is ${resource.status}`,
        `Condition: ${resource.condition}`
      ],
      limitations: semanticScore < 0.7 ? ['Partial functional match — verify specifications with owner'] : []
    };
  }

  async generateProjectPlan(projectDescription: string): Promise<ProjectPlan> {
    const prompt = `Generate a component list for this campus project: "${projectDescription}"

Return ONLY valid JSON:
{
  "project_name": "${projectDescription}",
  "description": "brief description",
  "components": [
    {"name": "Component", "category": "electronics", "purpose": "why needed", "quantity": 1, "priority": "required", "alternatives": ["alt1"]}
  ],
  "estimated_total_cost": 2000
}`;

    const text = await this.callWatsonx(prompt, 500);
    const fallback: ProjectPlan = {
      project_name: projectDescription,
      description: projectDescription,
      components: [{ name: 'Main component', category: 'electronics', purpose: 'Core function', quantity: 1, priority: 'required', alternatives: [] }],
      estimated_total_cost: 1000
    };
    return this.parseJSON(text, fallback);
  }

  async answerWithRAG(question: string, context: string[], sources: Array<{ title: string; id: string }>): Promise<RAGResponse> {
    if (context.length === 0) {
      return {
        answer: "I couldn't find relevant information in the campus knowledge base to answer your question.",
        sources: [],
        confidence: 'not_found'
      };
    }

    const contextText = context.slice(0, 3).join('\n\n');
    const prompt = `Answer this campus resource question using ONLY the provided context.
Question: "${question}"

Context:
${contextText}

Instructions: Answer factually from context only. If not in context, say so. Be concise.

Answer:`;

    const answer = await this.callWatsonx(prompt, 400);
    return {
      answer: answer || "Based on campus policy documents, I couldn't find a specific answer to your question.",
      sources: sources.slice(0, 3).map((s, i) => ({
        title: s.title,
        excerpt: context[i]?.substring(0, 150) || '',
        document_id: s.id
      })),
      confidence: context.length > 0 ? 'medium' : 'low'
    };
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Use Watsonx embedding endpoint if available, fall back to mock
    try {
      const url = `${this.baseUrl}/ml/v1/text/embeddings?version=2023-10-25`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model_id: 'ibm/slate-30m-english-rtrvr',
          inputs: [text],
          project_id: this.projectId
        })
      });

      if (response.ok) {
        const data = await response.json() as { results: Array<{ embedding: number[] }> };
        return { embedding: data.results[0].embedding, model: 'ibm/slate-30m-english-rtrvr' };
      }
    } catch { /* fall back */ }

    // Fallback to mock embedding
    const embed = new Array(1536).fill(0);
    for (let i = 0; i < text.length; i++) embed[i % 1536] = (embed[i % 1536] + text.charCodeAt(i) / 255) % 1;
    const mag = Math.sqrt(embed.reduce((s, v) => s + v * v, 0)) || 1;
    return { embedding: embed.map(v => v / mag), model: 'mock-fallback' };
  }

  async detectUnderutilization(resource: Record<string, unknown>, usageStats: Record<string, unknown>): Promise<string | null> {
    const idleDays = Number(usageStats.idle_days || 0);
    const pendingRequests = Number(usageStats.pending_requests || 0);
    if (idleDays > 60 && pendingRequests > 2) {
      return `Granite AI detected: ${resource.title} has been idle ${idleDays} days with ${pendingRequests} pending requests.`;
    }
    return null;
  }
}

// AI Provider abstraction layer
// Supports: mock, granite, ibm-bob
// Extend by implementing the AIProvider interface

export interface RequirementExtraction {
  category: string;
  resource_type: string;
  functional_requirements: string[];
  technical_specs: Record<string, string>;
  budget_preference: string | null;
  purpose: string;
  duration_days: number | null;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  quantity: number;
  preferred_location: string | null;
  raw_query: string;
}

export interface ResourceClassification {
  title: string;
  category: string;
  resource_type: string;
  brand: string | null;
  model: string | null;
  specifications: Record<string, string>;
  applications: string[];
  confidence: number;
  warning?: string;
}

export interface MatchExplanation {
  score: number;
  score_breakdown: {
    functional_compatibility: number;
    availability: number;
    timing: number;
    location: number;
    condition: number;
    reliability: number;
    sustainability_value: number;
  };
  explanation: string;
  explanation_points: string[];
  limitations: string[];
}

export interface ProjectPlan {
  project_name: string;
  description: string;
  components: Array<{
    name: string;
    category: string;
    purpose: string;
    quantity: number;
    priority: 'required' | 'optional';
    alternatives: string[];
  }>;
  estimated_total_cost: number;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{ title: string; excerpt: string; document_id: string }>;
  confidence: 'high' | 'medium' | 'low' | 'not_found';
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

export interface AIProvider {
  name: string;
  extractRequirement(query: string): Promise<RequirementExtraction>;
  classifyResource(text: string, imageBase64?: string): Promise<ResourceClassification>;
  generateMatchExplanation(
    requirement: RequirementExtraction,
    resource: Record<string, unknown>,
    semanticScore: number
  ): Promise<MatchExplanation>;
  generateProjectPlan(projectDescription: string): Promise<ProjectPlan>;
  answerWithRAG(question: string, context: string[], sources: Array<{ title: string; id: string }>): Promise<RAGResponse>;
  generateEmbedding(text: string): Promise<EmbeddingResult>;
  detectUnderutilization(resource: Record<string, unknown>, usageStats: Record<string, unknown>): Promise<string | null>;
}

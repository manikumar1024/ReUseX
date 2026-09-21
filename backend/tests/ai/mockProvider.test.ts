import { MockAIProvider } from '../../src/ai/mockProvider';

describe('MockAIProvider — Requirement Extraction', () => {
  const ai = new MockAIProvider();

  test('extracts category and resource_type for microcontroller query', async () => {
    const result = await ai.extractRequirement('I need a microcontroller with Wi-Fi for IoT project for 10 days');
    expect(result.category).toBe('electronics');
    expect(result.resource_type).toBe('microcontroller');
    expect(result.duration_days).toBe(10);
    expect(result.functional_requirements).toContain('Wi-Fi connectivity');
    expect(result.functional_requirements).toContain('IoT compatibility');
  });

  test('extracts duration in weeks', async () => {
    const result = await ai.extractRequirement('I need a laptop for two weeks');
    expect(result.duration_days).toBe(14);
    expect(result.category).toBe('computing');
  });

  test('extracts urgency level', async () => {
    const urgent = await ai.extractRequirement('I urgently need an oscilloscope for lab today');
    expect(['high', 'urgent']).toContain(urgent.urgency);
  });

  test('identifies low-cost preference', async () => {
    const result = await ai.extractRequirement('looking for a low-cost Arduino for project');
    expect(result.budget_preference).toBe('low-cost');
  });

  test('returns raw_query unchanged', async () => {
    const query = 'need something for testing circuits';
    const result = await ai.extractRequirement(query);
    expect(result.raw_query).toBe(query);
  });
});

describe('MockAIProvider — Resource Classification', () => {
  const ai = new MockAIProvider();

  test('classifies electronics correctly', async () => {
    const result = await ai.classifyResource('Arduino Uno R3 microcontroller development board');
    expect(result.category).toBe('electronics');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('classifies books correctly', async () => {
    const result = await ai.classifyResource('Introduction to Algorithms textbook');
    expect(result.category).toBe('books');
  });

  test('sets warning for low-confidence image identification', async () => {
    const result = await ai.classifyResource('unknown item', 'base64imagedata');
    expect(result.confidence).toBeLessThan(0.9);
    expect(result.warning).toBeDefined();
  });

  test('detects Arduino brand', async () => {
    const result = await ai.classifyResource('Arduino Uno board');
    expect(result.brand?.toLowerCase()).toContain('arduino');
  });
});

describe('MockAIProvider — Project Planning', () => {
  const ai = new MockAIProvider();

  test('generates project plan for irrigation system', async () => {
    const plan = await ai.generateProjectPlan('Smart irrigation system');
    expect(plan.components.length).toBeGreaterThan(3);
    expect(plan.components.some(c => c.name.toLowerCase().includes('esp32'))).toBe(true);
    expect(plan.components.some(c => c.name.toLowerCase().includes('soil'))).toBe(true);
    expect(plan.estimated_total_cost).toBeGreaterThan(0);
  });

  test('marks required components correctly', async () => {
    const plan = await ai.generateProjectPlan('weather station');
    const required = plan.components.filter(c => c.priority === 'required');
    expect(required.length).toBeGreaterThan(0);
  });
});

describe('MockAIProvider — RAG Responses', () => {
  const ai = new MockAIProvider();

  test('returns not_found when no context provided', async () => {
    const result = await ai.answerWithRAG('What is the policy?', [], []);
    expect(result.confidence).toBe('not_found');
    expect(result.sources).toHaveLength(0);
  });

  test('returns answer with context', async () => {
    const context = ['The borrowing period for students is 7 days.'];
    const sources = [{ title: 'Borrowing Policy', id: 'doc-1' }];
    const result = await ai.answerWithRAG('How long can I borrow?', context, sources);
    expect(result.answer).toBeTruthy();
    expect(result.sources.length).toBeGreaterThan(0);
  });
});

describe('MockAIProvider — Embedding Generation', () => {
  const ai = new MockAIProvider();

  test('returns embedding of correct dimension', async () => {
    const { embedding, model } = await ai.generateEmbedding('test text');
    expect(embedding).toHaveLength(1536);
    expect(model).toBeDefined();
  });

  test('different texts produce different embeddings', async () => {
    const { embedding: e1 } = await ai.generateEmbedding('microcontroller wifi iot');
    const { embedding: e2 } = await ai.generateEmbedding('textbook algorithms programming');
    const similarity = e1.reduce((s, v, i) => s + v * e2[i], 0);
    expect(similarity).toBeLessThan(0.95); // Should not be identical
  });

  test('embeddings are normalized', async () => {
    const { embedding } = await ai.generateEmbedding('test normalization');
    const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    expect(Math.abs(magnitude - 1)).toBeLessThan(0.01);
  });
});

describe('MockAIProvider — Underutilization Detection', () => {
  const ai = new MockAIProvider();

  test('flags resource with high idle days and pending requests', async () => {
    const insight = await ai.detectUnderutilization(
      { title: 'Oscilloscope', borrow_count: 1 },
      { idle_days: 80, pending_requests: 3 }
    );
    expect(insight).toBeTruthy();
    expect(insight).toContain('80');
  });

  test('does not flag recently used resource', async () => {
    const insight = await ai.detectUnderutilization(
      { title: 'Active resource', borrow_count: 10 },
      { idle_days: 5, pending_requests: 0 }
    );
    expect(insight).toBeNull();
  });
});

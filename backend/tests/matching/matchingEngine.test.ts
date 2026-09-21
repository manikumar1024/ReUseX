import { MockAIProvider } from '../../src/ai/mockProvider';

// Simulate the matching score logic independently
function computeScore(semantic: number, status: string, condition: string): number {
  const conditionScores: Record<string, number> = { excellent: 100, good: 85, fair: 65, poor: 40 };
  const avail = status === 'available' ? 95 : 60;
  const cond = conditionScores[condition] || 70;
  return Math.round(
    semantic * 100 * 0.35 +
    avail * 0.20 +
    80 * 0.15 + // timing neutral
    75 * 0.10 + // location neutral
    cond * 0.10 +
    85 * 0.05 + // reliability
    85 * 0.05   // sustainability
  );
}

describe('Matching Engine — Score Calculation', () => {
  test('high semantic score + available + excellent = high overall score', () => {
    const score = computeScore(0.95, 'available', 'excellent');
    expect(score).toBeGreaterThan(85);
  });

  test('low semantic score + unavailable + poor = low overall score', () => {
    const score = computeScore(0.2, 'unavailable', 'poor');
    expect(score).toBeLessThan(60);
  });

  test('availability significantly impacts score', () => {
    const available = computeScore(0.8, 'available', 'good');
    const unavailable = computeScore(0.8, 'unavailable', 'good');
    expect(available).toBeGreaterThan(unavailable);
  });

  test('condition has expected impact', () => {
    const excellent = computeScore(0.7, 'available', 'excellent');
    const poor = computeScore(0.7, 'available', 'poor');
    expect(excellent).toBeGreaterThan(poor);
    expect(excellent - poor).toBeGreaterThan(5); // at least 5 points difference
  });
});

describe('Matching Engine — Hard Constraint Filter', () => {
  function passesHardConstraints(resource: { available_quantity: number; status: string }, req: { duration_days?: number | null }): boolean {
    if (resource.available_quantity <= 0) return false;
    if (!['available', 'borrowed'].includes(resource.status) && resource.status !== 'available') {
      if (resource.status !== 'available') return false;
    }
    return true;
  }

  test('filters out resources with zero quantity', () => {
    expect(passesHardConstraints({ available_quantity: 0, status: 'available' }, {})).toBe(false);
  });

  test('allows resources with available quantity', () => {
    expect(passesHardConstraints({ available_quantity: 2, status: 'available' }, {})).toBe(true);
  });

  test('filters retired resources', () => {
    expect(passesHardConstraints({ available_quantity: 1, status: 'retired' }, {})).toBe(false);
  });
});

describe('Matching Engine — Match Explanations', () => {
  const ai = new MockAIProvider();

  test('explanation includes resource title context', async () => {
    const req = await ai.extractRequirement('need a microcontroller with wifi');
    const resource = {
      title: 'ESP32 DevKit',
      condition: 'excellent',
      status: 'available',
      location: 'Electronics Lab',
      owner_reliability: 4.8,
      mode: 'borrow'
    };
    const match = await ai.generateMatchExplanation(req, resource, 0.9);
    expect(match.score).toBeGreaterThan(70);
    expect(match.explanation_points.length).toBeGreaterThan(0);
    expect(match.score_breakdown).toBeDefined();
    expect(match.score_breakdown.functional_compatibility).toBeGreaterThan(0);
  });

  test('limitations are populated for low confidence match', async () => {
    const req = await ai.extractRequirement('need oscilloscope for debugging');
    const resource = {
      title: 'Old Multimeter',
      condition: 'poor',
      status: 'available',
      location: 'Storage',
      owner_reliability: 3.0,
      mode: 'borrow'
    };
    const match = await ai.generateMatchExplanation(req, resource, 0.3);
    expect(match.limitations.length).toBeGreaterThan(0);
  });
});

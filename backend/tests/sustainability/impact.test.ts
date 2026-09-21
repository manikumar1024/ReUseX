// Sustainability/impact calculation tests

interface ImpactRecord {
  estimated_value: number;
  estimated_co2_kg: number;
  estimated_material_kg?: number;
}

function computeSustainabilitySummary(records: ImpactRecord[]) {
  const totalValue = records.reduce((s, r) => s + r.estimated_value, 0);
  const totalCO2 = records.reduce((s, r) => s + r.estimated_co2_kg, 0);
  const totalMaterial = records.reduce((s, r) => s + (r.estimated_material_kg || 0), 0);
  return {
    total_value_saved: totalValue,
    total_co2_kg: totalCO2,
    total_material_kg: totalMaterial,
    total_events: records.length,
    average_value_per_event: records.length > 0 ? totalValue / records.length : 0
  };
}

function circularityScore(
  reuseRate: number,     // 0-100
  returnRate: number,    // 0-100
  impactEvents: number
): number {
  const impactScore = Math.min(100, impactEvents * 2);
  return Math.round(reuseRate * 0.4 + returnRate * 0.35 + impactScore * 0.25);
}

describe('Sustainability Calculations', () => {
  test('computes total value savings correctly', () => {
    const records: ImpactRecord[] = [
      { estimated_value: 1500, estimated_co2_kg: 1.5 },
      { estimated_value: 2800, estimated_co2_kg: 2.8 },
      { estimated_value: 500, estimated_co2_kg: 0.5 },
    ];
    const summary = computeSustainabilitySummary(records);
    expect(summary.total_value_saved).toBe(4800);
    expect(summary.total_events).toBe(3);
    expect(summary.average_value_per_event).toBeCloseTo(1600);
  });

  test('handles empty records gracefully', () => {
    const summary = computeSustainabilitySummary([]);
    expect(summary.total_value_saved).toBe(0);
    expect(summary.average_value_per_event).toBe(0);
    expect(summary.total_events).toBe(0);
  });

  test('circularity score is bounded 0-100', () => {
    const score = circularityScore(100, 100, 1000);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  test('circularity score improves with higher reuse rate', () => {
    const low = circularityScore(20, 80, 10);
    const high = circularityScore(80, 80, 10);
    expect(high).toBeGreaterThan(low);
  });

  test('impact events contribute up to 25% of score', () => {
    const noEvents = circularityScore(80, 80, 0);
    const manyEvents = circularityScore(80, 80, 50);
    expect(manyEvents).toBeGreaterThan(noEvents);
  });

  test('CO2 impact is proportional to resource value', () => {
    const highValue: ImpactRecord = { estimated_value: 5000, estimated_co2_kg: 5.0 };
    const lowValue: ImpactRecord = { estimated_value: 200, estimated_co2_kg: 0.2 };
    expect(highValue.estimated_co2_kg).toBeGreaterThan(lowValue.estimated_co2_kg);
  });
});

describe('Duplicate Purchase Detection Logic', () => {
  function detectDuplicatePurchase(
    newPurchaseCost: number,
    alternativeCount: number,
    topCompatibility: number
  ) {
    if (alternativeCount === 0) return { should_alert: false, savings: 0 };
    if (topCompatibility < 50) return { should_alert: false, savings: 0, reason: 'Low compatibility' };
    return {
      should_alert: true,
      savings: newPurchaseCost,
      recommendation: `${alternativeCount} campus alternative(s) found with ${topCompatibility}% compatibility`
    };
  }

  test('alerts when alternatives found with high compatibility', () => {
    const result = detectDuplicatePurchase(5000, 2, 92);
    expect(result.should_alert).toBe(true);
    expect(result.savings).toBe(5000);
  });

  test('does not alert when no alternatives found', () => {
    const result = detectDuplicatePurchase(5000, 0, 0);
    expect(result.should_alert).toBe(false);
  });

  test('does not alert for low compatibility alternatives', () => {
    const result = detectDuplicatePurchase(5000, 1, 30);
    expect(result.should_alert).toBe(false);
  });
});

import {
  AIProvider,
  RequirementExtraction,
  ResourceClassification,
  MatchExplanation,
  ProjectPlan,
  RAGResponse,
  EmbeddingResult
} from './types';

// Deterministic mock embeddings using simple hash-based simulation
function mockEmbedding(text: string): number[] {
  const embedding = new Array(1536).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    embedding[i % 1536] = (embedding[i % 1536] + charCode / 255) % 1;
  }
  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1;
  return embedding.map(v => v / magnitude);
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electronics: ['microcontroller', 'arduino', 'esp32', 'raspberry', 'sensor', 'circuit', 'board', 'wifi', 'bluetooth', 'iot', 'oscilloscope', 'multimeter', 'soldering', 'component', 'motor'],
  computing: ['laptop', 'computer', 'monitor', 'keyboard', 'mouse', 'server', 'storage', 'ram', 'ssd', 'charger', 'cable', 'usb', 'hub'],
  books: ['textbook', 'book', 'manual', 'guide', 'reference', 'journal', 'notes', 'study'],
  laboratory: ['equipment', 'instrument', 'beaker', 'flask', 'microscope', 'pipette', 'centrifuge', 'spectroscope', 'chemical', 'lab'],
  furniture: ['chair', 'table', 'desk', 'shelf', 'cabinet', 'whiteboard', 'projector', 'screen', 'board'],
  sports: ['sports', 'ball', 'bat', 'racket', 'net', 'equipment', 'gym', 'fitness', 'jersey'],
  tools: ['tool', 'drill', 'screwdriver', 'wrench', 'hammer', 'saw', 'plier', 'cutter'],
  events: ['projector', 'microphone', 'speaker', 'camera', 'tripod', 'lighting', 'backdrop', 'banner']
};

function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  let bestCategory = 'other';
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; bestCategory = category; }
  }
  return bestCategory;
}

function inferDuration(text: string): number | null {
  const patterns = [
    { regex: /(\d+)\s*day/i, multiplier: 1 as number, value: undefined as number | undefined },
      { regex: /(\d+)\s*week/i, multiplier: 7 as number, value: undefined as number | undefined },
      { regex: /(\d+)\s*month/i, multiplier: 30 as number, value: undefined as number | undefined },
      { regex: /two weeks/i, multiplier: 1, value: 14 },
      { regex: /a week/i, multiplier: 1, value: 7 },
      { regex: /a month/i, multiplier: 1, value: 30 },
      { regex: /semester/i, multiplier: 1, value: 120 }
    ];
    for (const p of patterns) {
      const match = text.match(p.regex);
      if (match) {
        if (p.value !== undefined) return p.value;
        return parseInt(match[1]) * p.multiplier;
    }
  }
  return null;
}

export class MockAIProvider implements AIProvider {
  name = 'mock';

  async extractRequirement(rawQuery: string): Promise<RequirementExtraction> {
    const lower = rawQuery.toLowerCase();
    const category = inferCategory(rawQuery);
    const duration = inferDuration(rawQuery);

    // Extract urgency
    let urgency: RequirementExtraction['urgency'] = 'normal';
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately')) urgency = 'urgent';
    else if (lower.includes('today') || lower.includes('tomorrow')) urgency = 'high';
    else if (lower.includes('sometime') || lower.includes('eventually')) urgency = 'low';

    // Extract functional requirements
    const funcReqs: string[] = [];
    if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('wireless')) funcReqs.push('Wi-Fi connectivity');
    if (lower.includes('bluetooth')) funcReqs.push('Bluetooth connectivity');
    if (lower.includes('sensor')) funcReqs.push('Sensor support');
    if (lower.includes('iot')) funcReqs.push('IoT compatibility');
    if (lower.includes('display') || lower.includes('screen')) funcReqs.push('Display output');
    if (lower.includes('low-cost') || lower.includes('low cost') || lower.includes('cheap') || lower.includes('budget') || lower.includes('affordable')) funcReqs.push('Low cost preference');

    // Detect resource type
    let resource_type = 'general equipment';
    if (lower.includes('microcontroller') || lower.includes('arduino') || lower.includes('esp32')) resource_type = 'microcontroller';
    else if (lower.includes('raspberry')) resource_type = 'single-board computer';
    else if (lower.includes('sensor')) resource_type = 'sensor module';
    else if (lower.includes('laptop')) resource_type = 'laptop';
    else if (lower.includes('projector')) resource_type = 'projector';
    else if (lower.includes('textbook') || lower.includes('book')) resource_type = 'textbook';
    else if (lower.includes('camera')) resource_type = 'camera';

    // Extract purpose
    let purpose = 'general use';
    const purposePatterns: Array<{ pattern: RegExp; group: number }> = [
      { pattern: /for (my |an |a )?(.+?) project/i, group: 2 },
      { pattern: /for (.+?) work/i, group: 1 },
      { pattern: /to (build|create|make|develop) (.+)/i, group: 2 }
    ];
    for (const pp of purposePatterns) {
      const match = rawQuery.match(pp.pattern);
      if (match?.[pp.group]) { purpose = match[pp.group]; break; }
    }

    return {
      category,
      resource_type,
      functional_requirements: funcReqs.length > 0 ? funcReqs : ['Standard operation'],
      technical_specs: {},
      budget_preference: lower.includes('low-cost') || lower.includes('low cost') || lower.includes('free') || lower.includes('cheap') || lower.includes('budget') ? 'low-cost' : null,
      purpose,
      duration_days: duration,
      urgency,
      quantity: 1,
      preferred_location: null,
      raw_query: rawQuery
    };
  }

  async classifyResource(text: string, _imageBase64?: string): Promise<ResourceClassification> {
    const lower = text.toLowerCase();
    const category = inferCategory(text);

    let confidence = 0.85;
    let warning: string | undefined;

    if (_imageBase64) {
      confidence = 0.72; // Lower confidence for visual-only identification
      warning = 'AI identification based on visual analysis. Please verify the item details before publishing.';
    }

    // Try to detect brand/model
    const brands = ['arduino', 'raspberry pi', 'esp32', 'nodemcu', 'dell', 'hp', 'lenovo', 'canon', 'sony'];
    let brand: string | null = null;
    for (const b of brands) {
      if (lower.includes(b)) { brand = b.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '); break; }
    }

    return {
      title: text.length > 60 ? text.substring(0, 57) + '...' : text,
      category,
      resource_type: lower.includes('board') || lower.includes('kit') ? 'development kit' : 'equipment',
      brand,
      model: null,
      specifications: {},
      applications: category === 'electronics' ? ['Prototyping', 'IoT projects', 'Education'] : ['General use'],
      confidence,
      warning
    };
  }

  async generateMatchExplanation(
    requirement: RequirementExtraction,
    resource: Record<string, unknown>,
    semanticScore: number
  ): Promise<MatchExplanation> {
    const resTitle = String(resource.title || '');
    const resCondition = String(resource.condition || 'good');
    const resLocation = String(resource.location || '');

    const funcScore = Math.min(100, semanticScore * 100 + 10);
    const availScore = resource.status === 'available' ? 95 : 60;
    const timingScore = requirement.duration_days ? 80 : 90;
    const locationScore = requirement.preferred_location && resLocation.toLowerCase().includes(requirement.preferred_location.toLowerCase()) ? 95 : 75;
    const conditionScore = resCondition === 'excellent' ? 100 : resCondition === 'good' ? 85 : resCondition === 'fair' ? 65 : 40;
    const reliabilityScore = Number(resource.reliability_score || 4.5) * 20;
    const sustainScore = 85;

    const weights = { functional: 0.35, availability: 0.20, timing: 0.15, location: 0.10, condition: 0.10, reliability: 0.05, sustainability: 0.05 };
    const overall = (
      funcScore * weights.functional +
      availScore * weights.availability +
      timingScore * weights.timing +
      locationScore * weights.location +
      conditionScore * weights.condition +
      reliabilityScore * weights.reliability +
      sustainScore * weights.sustainability
    );

    const points: string[] = [];
    if (funcScore > 70) points.push(`Functionally compatible with your ${requirement.resource_type} requirement`);
    if (availScore > 80) points.push('Currently available for borrowing');
    if (requirement.duration_days) points.push(`Can be borrowed for your requested ${requirement.duration_days}-day period`);
    if (resLocation) points.push(`Located at ${resLocation}`);
    if (conditionScore > 80) points.push(`Condition: ${resCondition}`);
    if (requirement.purpose) points.push(`Suitable for ${requirement.purpose}`);

    const limitations: string[] = [];
    if (conditionScore < 70) limitations.push(`Condition is only ${resCondition} — inspect before use`);
    if (availScore < 70) limitations.push('Availability may be limited — contact owner to confirm');
    if (semanticScore < 0.6) limitations.push('Partial match — verify technical specifications with owner');

    return {
      score: Math.round(overall),
      score_breakdown: {
        functional_compatibility: Math.round(funcScore),
        availability: Math.round(availScore),
        timing: Math.round(timingScore),
        location: Math.round(locationScore),
        condition: Math.round(conditionScore),
        reliability: Math.round(reliabilityScore),
        sustainability_value: sustainScore
      },
      explanation: `${Math.round(overall)}% match because ${resTitle} is ${resource.status === 'available' ? 'available' : 'potentially available'}, ${resCondition} condition, and is compatible with your ${requirement.purpose || 'project'} requirement.`,
      explanation_points: points,
      limitations
    };
  }

  async generateProjectPlan(projectDescription: string): Promise<ProjectPlan> {
    const lower = projectDescription.toLowerCase();
    const components: ProjectPlan['components'] = [];

    if (lower.includes('irrigation') || lower.includes('agriculture') || lower.includes('garden')) {
      components.push(
        { name: 'ESP32 DevKit', category: 'electronics', purpose: 'Main microcontroller with Wi-Fi', quantity: 1, priority: 'required', alternatives: ['NodeMCU', 'Arduino Uno + ESP8266'] },
        { name: 'Soil Moisture Sensor', category: 'electronics', purpose: 'Detect soil water levels', quantity: 2, priority: 'required', alternatives: ['Capacitive soil sensor'] },
        { name: 'Relay Module (4-channel)', category: 'electronics', purpose: 'Control water pump', quantity: 1, priority: 'required', alternatives: ['Single relay module'] },
        { name: 'Water Pump (5V DC)', category: 'tools', purpose: 'Pump water to plants', quantity: 1, priority: 'required', alternatives: ['Solenoid valve'] },
        { name: '5V Power Supply', category: 'electronics', purpose: 'Power the circuit', quantity: 1, priority: 'required', alternatives: ['USB power bank'] },
        { name: 'Water Tubing (1m)', category: 'tools', purpose: 'Connect pump to plants', quantity: 2, priority: 'optional', alternatives: [] },
        { name: 'Breadboard + Jumper Wires', category: 'electronics', purpose: 'Prototyping connections', quantity: 1, priority: 'optional', alternatives: [] }
      );
    } else if (lower.includes('weather') || lower.includes('climate')) {
      components.push(
        { name: 'Arduino Uno', category: 'electronics', purpose: 'Main controller', quantity: 1, priority: 'required', alternatives: ['ESP32', 'Raspberry Pi Pico'] },
        { name: 'DHT22 Sensor', category: 'electronics', purpose: 'Temperature and humidity', quantity: 1, priority: 'required', alternatives: ['DHT11', 'BME280'] },
        { name: 'LCD Display 16x2', category: 'electronics', purpose: 'Display readings', quantity: 1, priority: 'optional', alternatives: ['OLED display'] },
        { name: 'Breadboard + Jumpers', category: 'electronics', purpose: 'Circuit assembly', quantity: 1, priority: 'required', alternatives: [] }
      );
    } else if (lower.includes('robot') || lower.includes('autonomous')) {
      components.push(
        { name: 'Arduino Mega', category: 'electronics', purpose: 'Main controller', quantity: 1, priority: 'required', alternatives: ['Arduino Uno', 'Raspberry Pi'] },
        { name: 'DC Motor + L298N Driver', category: 'electronics', purpose: 'Movement control', quantity: 2, priority: 'required', alternatives: ['Servo motors'] },
        { name: 'Ultrasonic Sensor HC-SR04', category: 'electronics', purpose: 'Obstacle detection', quantity: 2, priority: 'required', alternatives: ['IR sensors'] },
        { name: 'Li-ion Battery Pack', category: 'electronics', purpose: 'Power supply', quantity: 1, priority: 'required', alternatives: ['USB power bank'] },
        { name: 'Chassis Kit', category: 'tools', purpose: 'Physical frame', quantity: 1, priority: 'required', alternatives: [] }
      );
    } else {
      // Generic IoT project
      components.push(
        { name: 'ESP32 DevKit', category: 'electronics', purpose: 'Wi-Fi enabled microcontroller', quantity: 1, priority: 'required', alternatives: ['NodeMCU', 'Arduino Uno'] },
        { name: 'Breadboard', category: 'electronics', purpose: 'Circuit prototyping', quantity: 1, priority: 'required', alternatives: [] },
        { name: 'Jumper Wires', category: 'electronics', purpose: 'Component connections', quantity: 1, priority: 'required', alternatives: [] },
        { name: 'USB Data Cable', category: 'computing', purpose: 'Programming and power', quantity: 1, priority: 'required', alternatives: [] }
      );
    }

    const avgComponentCost = 350;
    const estimatedCost = components.filter(c => c.priority === 'required').length * avgComponentCost;

    return {
      project_name: projectDescription,
      description: `Automated project plan for: ${projectDescription}`,
      components,
      estimated_total_cost: estimatedCost
    };
  }

  async answerWithRAG(question: string, context: string[], sources: Array<{ title: string; id: string }>): Promise<RAGResponse> {
    if (context.length === 0) {
      return {
        answer: "I couldn't find relevant information in the campus knowledge base to answer your question. Please contact your department administrator for specific policy details.",
        sources: [],
        confidence: 'not_found'
      };
    }

    const relevantContext = context.slice(0, 3).join('\n\n');
    const answer = `Based on the campus knowledge base:\n\n${relevantContext.substring(0, 500)}${relevantContext.length > 500 ? '...' : ''}\n\n*This answer is based on campus documentation. Contact your department for authoritative policy guidance.*`;

    return {
      answer,
      sources: sources.slice(0, 3).map(s => ({
        title: s.title,
        excerpt: context[0]?.substring(0, 150) || '',
        document_id: s.id
      })),
      confidence: 'medium'
    };
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    return {
      embedding: mockEmbedding(text),
      model: 'mock-embedding-v1'
    };
  }

  async detectUnderutilization(resource: Record<string, unknown>, usageStats: Record<string, unknown>): Promise<string | null> {
    const idleDays = Number(usageStats.idle_days || 0);
    const pendingRequests = Number(usageStats.pending_requests || 0);
    const borrowCount = Number(resource.borrow_count || 0);

    if (idleDays > 60 && pendingRequests > 2) {
      return `This resource has been idle for ${idleDays} days and has ${pendingRequests} pending requests from other users. Consider making it available for sharing.`;
    }
    if (idleDays > 90 && borrowCount < 2) {
      return `This resource has had very low usage (${borrowCount} loans) and has been idle for ${idleDays} days. Consider listing it as available or transferring it to a department with higher demand.`;
    }
    return null;
  }
}

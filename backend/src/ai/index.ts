import { AIProvider } from './types';
import { MockAIProvider } from './mockProvider';
import { GraniteProvider } from './graniteProvider';

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (providerInstance) return providerInstance;

  const mode = (process.env.AI_MODE || 'mock').toLowerCase();

  switch (mode) {
    case 'granite':
    case 'watsonx':
      providerInstance = new GraniteProvider();
      break;
    case 'mock':
    default:
      providerInstance = new MockAIProvider();
      break;
  }

  console.log(`🤖 AI Provider: ${providerInstance.name}`);
  return providerInstance;
}

export { AIProvider };

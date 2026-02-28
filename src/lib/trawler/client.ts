import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

export const MODELS = {
  TEXT_EXTRACTION: 'claude-sonnet-4-6',
  VISION_EXTRACTION: 'claude-sonnet-4-6',
  DEDUP_JUDGE: 'claude-haiku-4-5-20251001',
} as const;

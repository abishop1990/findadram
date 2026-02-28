import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, MODELS } from './client';
import {
  TEXT_EXTRACTION_SYSTEM,
  VISION_EXTRACTION_SYSTEM,
  REVIEW_EXTRACTION_SYSTEM,
  DEDUP_JUDGE_SYSTEM,
  ExtractedMenuSchema,
  DedupJudgmentSchema,
} from './prompts';
import type { ExtractedMenu } from '@/types/trawler';

export async function extractFromText(html: string): Promise<ExtractedMenu> {
  const client = getAnthropicClient();

  // Truncate HTML — 25K chars is plenty for menu extraction
  const truncated = html.length > 25000 ? html.slice(0, 25000) : html;

  const response = await client.messages.create({
    model: MODELS.TEXT_EXTRACTION,
    max_tokens: 8192,
    system: TEXT_EXTRACTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Extract all whiskey items from this menu content:\n\n${truncated}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ExtractedMenuSchema.parse(parsed);
      return {
        ...validated,
        whiskeys: validated.whiskeys,
        extraction_method: 'text',
        confidence: 0.8,
      };
    }
  } catch {
    // Fall through
  }

  return {
    whiskeys: [],
    extraction_method: 'text',
    confidence: 0,
  };
}

export async function extractFromImage(
  base64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<ExtractedMenu> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODELS.VISION_EXTRACTION,
    max_tokens: 8192,
    system: VISION_EXTRACTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Extract all whiskey items from this menu image. Return as JSON matching the schema.',
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ExtractedMenuSchema.parse(parsed);
      return {
        ...validated,
        whiskeys: validated.whiskeys,
        extraction_method: 'vision',
        confidence: 0.7,
      };
    }
  } catch {
    // Fall through
  }

  return {
    whiskeys: [],
    extraction_method: 'vision',
    confidence: 0,
  };
}

export async function extractFromReviews(
  reviewText: string,
  barName: string
): Promise<{ name: string; type?: string; context?: string }[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODELS.DEDUP_JUDGE, // Haiku — cheap and fast for text extraction
    max_tokens: 4096,
    system: REVIEW_EXTRACTION_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Extract specific whiskey brand names mentioned in these Google Reviews for "${barName}".

Reviews:
${reviewText.slice(0, 8000)}

Return JSON only: {"whiskeys_mentioned": [{"name": "...", "type": "bourbon|scotch|irish|rye|japanese|canadian|single_malt|blended|other", "context": "brief quote from review"}]}
If no specific brands are mentioned, return {"whiskeys_mentioned": []}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.whiskeys_mentioned || [];
    }
  } catch {
    // Fall through
  }

  return [];
}

export async function judgeDedup(nameA: string, nameB: string): Promise<boolean> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODELS.DEDUP_JUDGE,
    max_tokens: 256,
    system: DEDUP_JUDGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Are these the same whiskey?\nA: "${nameA}"\nB: "${nameB}"\n\nRespond with JSON: {"same_whiskey": boolean, "confidence": number, "reasoning": "..."}`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = DedupJudgmentSchema.parse(parsed);
      return validated.same_whiskey && validated.confidence > 0.7;
    }
  } catch {
    // Fall through
  }

  return false;
}

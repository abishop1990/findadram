import { getAnthropicClient, MODELS } from './client';
import { VISION_EXTRACTION_SYSTEM, ExtractedMenuSchema } from './prompts';
import type { ExtractedMenu } from '@/types/trawler';

/**
 * Extract whiskey data from a PDF menu using Claude's native PDF support.
 * Accepts base64-encoded PDF content.
 */
export async function extractFromPdf(base64: string): Promise<ExtractedMenu> {
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
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Extract all whiskey/whisky/bourbon/scotch/rye items from this menu PDF.

Return ONLY valid JSON with this exact shape:
{
  "bar_name": "string or null",
  "whiskeys": [
    {
      "name": "Full whiskey name",
      "distillery": "Producer name or null",
      "type": "bourbon|scotch|irish|rye|japanese|canadian|single_malt|blended|other",
      "age": null or integer,
      "abv": null or number,
      "price": null or number,
      "pour_size": "e.g. 1oz, 2oz, dram",
      "notes": "any tasting notes or menu description"
    }
  ]
}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validated = ExtractedMenuSchema.parse(parsed);
      return {
        ...validated,
        extraction_method: 'vision',
        confidence: 0.75,
      };
    }
  } catch {
    // Fall through to empty result
  }

  return {
    whiskeys: [],
    extraction_method: 'vision',
    confidence: 0,
  };
}

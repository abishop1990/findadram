import { z } from 'zod/v4';

export const ExtractedWhiskeySchema = z.object({
  name: z.string().describe('Full name of the whiskey'),
  distillery: z.string().optional().describe('Distillery or producer'),
  type: z.enum(['bourbon', 'scotch', 'irish', 'rye', 'japanese', 'canadian', 'single_malt', 'blended', 'other']).optional(),
  age: z.number().int().optional().describe('Age statement in years'),
  abv: z.number().optional().describe('Alcohol by volume percentage'),
  price: z.number().optional().describe('Price per pour in dollars'),
  pour_size: z.string().optional().describe('Pour size (e.g., "1oz", "2oz", "dram")'),
  notes: z.string().optional().describe('Tasting notes or menu description'),
});

export const ExtractedMenuSchema = z.object({
  bar_name: z.string().optional().describe('Name of the bar if found'),
  whiskeys: z.array(ExtractedWhiskeySchema).describe('List of extracted whiskeys'),
});

export const DedupJudgmentSchema = z.object({
  same_whiskey: z.boolean().describe('Whether the two names refer to the same whiskey'),
  confidence: z.number().min(0).max(1).describe('Confidence in the judgment'),
  reasoning: z.string().describe('Brief explanation'),
});

export const TEXT_EXTRACTION_SYSTEM = `You are a whiskey menu extraction expert. Given HTML or text content from a bar's website or menu, extract all whiskey/whisky/bourbon/scotch/rye entries.

Rules:
- Extract ONLY whiskey/whisky spirits (not beer, wine, cocktails, or food)
- Include bourbon, scotch, Irish whiskey, rye, Japanese whisky, Canadian whisky, single malt, blended
- Parse prices if available (convert to numeric USD)
- Parse age statements (e.g., "12 Year", "18yo" → age: 12, 18)
- Parse ABV if listed
- Identify distillery from context when possible
- Classify type based on name/origin clues
- If the content has no whiskey items, return an empty list`;

export const VISION_EXTRACTION_SYSTEM = `You are a whiskey menu extraction expert. You are looking at an image of a bar menu or drink list. Extract all whiskey/whisky/bourbon/scotch/rye entries visible in the image.

Rules:
- Extract ONLY whiskey/whisky spirits (not beer, wine, cocktails, or food)
- Read prices carefully from the image
- Parse age statements when visible
- If text is blurry or partially obscured, make your best guess and note uncertainty
- Return an empty list if no whiskey items are visible`;

export const DEDUP_JUDGE_SYSTEM = `You are a whiskey identification expert. Given two whiskey names, determine if they refer to the same whiskey product. Consider:
- Spelling variations (e.g., "whisky" vs "whiskey")
- Abbreviations (e.g., "GlenDronach" vs "The GlenDronach")
- Age statement formatting (e.g., "12yr" vs "12 Year Old")
- Common name shortenings
- BUT: different age statements = different whiskeys (e.g., Lagavulin 16 ≠ Lagavulin 8)
- Different expressions = different whiskeys (e.g., Ardbeg 10 ≠ Ardbeg Uigeadail)`;

/**
 * Quick test script to verify Claude API key and extraction pipeline.
 * Run: npx tsx scripts/test-api.ts
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Load .env.local manually (no dotenv dependency needed)
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local not found, rely on existing env vars
}

const SAMPLE_MENU_TEXT = `
WHISKEY & BOURBON
Maker's Mark .............. $9
Buffalo Trace ............. $8
Woodford Reserve .......... $11
Blanton's Single Barrel ... $16
Pappy Van Winkle 15yr ..... $85
Eagle Rare 10yr ........... $12

SCOTCH
Lagavulin 16 .............. $18
Macallan 12 Sherry Cask ... $15
Glenfiddich 18 ............ $22
Ardbeg Uigeadail ......... $17
Oban 14 ................... $14

JAPANESE WHISKY
Hibiki Harmony ............ $20
Yamazaki 12 ............... $28
Nikka From The Barrel ..... $16

RYE
Bulleit Rye ............... $9
WhistlePig 10yr ........... $15
Sazerac Rye ............... $10
`;

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.startsWith('your_')) {
    console.error('Set ANTHROPIC_API_KEY in .env.local first');
    process.exit(1);
  }

  console.log('Testing Claude API connection...\n');

  const client = new Anthropic({ apiKey });

  // Test 1: Basic connectivity
  console.log('1. Testing basic API connectivity...');
  try {
    const ping = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Respond with just "ok"' }],
    });
    const text = ping.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
    console.log(`   API responded: "${text.trim()}" (${ping.usage.input_tokens} input, ${ping.usage.output_tokens} output tokens)`);
  } catch (err) {
    console.error('   FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  }

  // Test 2: Menu text extraction
  console.log('\n2. Testing whiskey extraction from menu text...');
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: `You are a whiskey menu extraction expert. Extract all whiskey/bourbon/scotch/rye items. Return ONLY valid JSON.`,
      messages: [{
        role: 'user',
        content: `Extract whiskeys from this menu. Return JSON: { "whiskeys": [{ "name": "...", "type": "bourbon|scotch|rye|japanese|other", "price": number|null, "age": number|null }] }\n\n${SAMPLE_MENU_TEXT}`,
      }],
    });

    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`   Extracted ${parsed.whiskeys?.length || 0} whiskeys`);
      console.log(`   Tokens used: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output`);

      if (parsed.whiskeys?.length > 0) {
        console.log('\n   Sample results:');
        for (const w of parsed.whiskeys.slice(0, 5)) {
          console.log(`   - ${w.name} (${w.type}) ${w.price ? `$${w.price}` : ''} ${w.age ? `${w.age}yr` : ''}`);
        }
        if (parsed.whiskeys.length > 5) {
          console.log(`   ... and ${parsed.whiskeys.length - 5} more`);
        }
      }
    } else {
      console.error('   No JSON found in response');
      console.error('   Raw:', text.slice(0, 200));
    }
  } catch (err) {
    console.error('   FAILED:', err instanceof Error ? err.message : err);
  }

  // Test 3: Sonnet model access (used for vision/PDF)
  console.log('\n3. Testing Sonnet model access (used for image/PDF extraction)...');
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Respond with just "ok"' }],
    });
    const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
    console.log(`   Sonnet responded: "${text.trim()}" (${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens)`);
  } catch (err) {
    console.error('   FAILED:', err instanceof Error ? err.message : err);
    console.log('   (Sonnet access is needed for image/PDF extraction — Haiku will still work for text)');
  }

  console.log('\nAll tests passed. Your API setup is ready.');
}

main().catch(console.error);

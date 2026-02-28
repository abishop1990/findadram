/**
 * Seed a comprehensive whiskey reference database via Claude.
 * Generates ~200 commonly-poured whiskeys that Portland bars actually carry.
 * These are canonical reference entries — bars link to them via bar_whiskeys.
 *
 * Usage: node scripts/seed-whiskey-reference.mjs
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
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
    if (!process.env[key]) process.env[key] = value;
  }
} catch { /* rely on existing env */ }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// Use service role key for writes (bypasses RLS)
const writeKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

const sbHeaders = {
  'apikey': writeKey,
  'Authorization': `Bearer ${writeKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const CATEGORIES = [
  {
    prompt: 'List 40 bourbon whiskeys commonly poured at craft bars in Portland, Oregon. Include a range from everyday (Buffalo Trace, Maker\'s Mark) to allocated/rare (Pappy Van Winkle, George T. Stagg). Include specific expressions (e.g., "Woodford Reserve Double Oaked", not just "Woodford Reserve").',
    type: 'bourbon',
  },
  {
    prompt: 'List 30 rye whiskeys commonly found at Portland, Oregon craft bars. Include classic (Rittenhouse, Bulleit Rye) through high-end (WhistlePig 12, Sazerac 18). Include Pacific Northwest distillery ryes if any.',
    type: 'rye',
  },
  {
    prompt: 'List 35 scotch whiskies commonly poured at Portland scotch bars (like Scotch Lodge). Include single malts from Islay (Lagavulin 16, Ardbeg 10), Speyside (Macallan 12, Glenfiddich 18), Highland (Oban 14, Dalmore 12), and blends (Johnnie Walker Blue, Compass Box). Specific expressions only.',
    type: 'scotch',
  },
  {
    prompt: 'List 15 Japanese whiskies available at upscale Portland bars. Include Suntory (Yamazaki 12, Hibiki Harmony), Nikka (From The Barrel, Coffey Grain), and others.',
    type: 'japanese',
  },
  {
    prompt: 'List 15 Irish whiskeys commonly poured at Portland bars. Include Redbreast 12, Green Spot, Jameson Black Barrel, Powers, Teeling, etc.',
    type: 'irish',
  },
  {
    prompt: 'List 10 Canadian whiskies available at Portland bars. Include Crown Royal, Lot 40, Canadian Club 12, Forty Creek, etc.',
    type: 'canadian',
  },
  {
    prompt: 'List 15 Pacific Northwest craft distillery spirits commonly found at Portland bars. Include products from Westward Whiskey, Bull Run Distillery, New Deal Distillery, Freeland Spirits, Ransom Spirits, Stone Barn Brandyworks, and others from Oregon/Washington.',
    type: 'other',
  },
];

async function claudeGenerate(prompt, type) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: `${prompt}

Return ONLY valid JSON, no markdown:
{
  "whiskeys": [
    {
      "name": "Full expression name",
      "distillery": "Producer name",
      "type": "${type}",
      "age": null or integer years,
      "abv": null or number (percentage, e.g., 43.0),
      "region": "e.g., Kentucky, Islay, Speyside, Oregon",
      "country": "e.g., USA, Scotland, Japan, Ireland, Canada",
      "description": "Brief tasting notes or description (1 sentence)"
    }
  ]
}`
      }],
    }),
  });

  if (!resp.ok) throw new Error(`Claude API ${resp.status}`);
  const data = await resp.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [];
  return JSON.parse(match[0]).whiskeys || [];
}

async function getExistingNames() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys?select=name`, { headers: sbHeaders });
  const data = await resp.json();
  return new Set(data.map(w => w.name.toLowerCase().trim()));
}

async function insertWhiskey(w) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({
      name: w.name,
      distillery: w.distillery || null,
      type: w.type || 'other',
      age: w.age || null,
      abv: w.abv || null,
      description: w.description || null,
      region: w.region || null,
      country: w.country || null,
      image_url: null,
    }),
  });
  return resp.ok;
}

async function main() {
  const existingNames = await getExistingNames();
  console.log(`${existingNames.size} whiskeys already in database\n`);

  let totalGenerated = 0;
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const cat of CATEGORIES) {
    console.log(`=== Generating ${cat.type.toUpperCase()} ===`);
    try {
      const whiskeys = await claudeGenerate(cat.prompt, cat.type);
      console.log(`  Claude returned ${whiskeys.length} items`);
      totalGenerated += whiskeys.length;

      for (const w of whiskeys) {
        if (!w.name) continue;
        if (existingNames.has(w.name.toLowerCase().trim())) {
          totalSkipped++;
          continue;
        }

        const ok = await insertWhiskey(w);
        if (ok) {
          existingNames.add(w.name.toLowerCase().trim());
          totalInserted++;
        } else {
          totalSkipped++;
        }
      }

      console.log(`  Inserted: ${whiskeys.length - totalSkipped} new, ${totalSkipped} skipped\n`);
      totalSkipped = 0; // Reset per-category

      // Rate limit between categories
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.log(`  ERROR: ${err.message}\n`);
    }
  }

  console.log('========== SUMMARY ==========');
  console.log(`Total generated: ${totalGenerated}`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total in database: ${existingNames.size}`);
}

main().catch(console.error);

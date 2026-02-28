/**
 * Live trawl script for Portland bar websites.
 * Fetches real menu pages, extracts whiskey data via Claude, outputs results.
 *
 * Usage: npx tsx scripts/trawl-portland.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function buildAttribution(barName: string, url: string, date: string): string {
  const domain = new URL(url).hostname.replace(/^www\./, '');
  const path = new URL(url).pathname;
  return `Website menu at ${domain}${path}, fetched ${date}`;
}

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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch {
  // rely on existing env
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BarTarget {
  name: string;
  menuUrl: string;
  website: string;
}

interface ExtractedWhiskey {
  name: string;
  distillery?: string;
  type?: string;
  age?: number | null;
  abv?: number | null;
  price?: number | null;
  pour_size?: string;
  notes?: string;
}

interface TrawlResult {
  bar: BarTarget;
  whiskeys: ExtractedWhiskey[];
  scrapedAt: string;
  rawTextLength: number;
  contentHash: string | null;
  sourceAttribution: string | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Portland bars with known online menus
// ---------------------------------------------------------------------------

const TARGETS: BarTarget[] = [
  {
    name: 'Scotch Lodge',
    menuUrl: 'https://www.scotchlodge.com/menus',
    website: 'https://www.scotchlodge.com',
  },
  {
    name: 'Hey Love',
    menuUrl: 'https://www.heylovepdx.com/beverage',
    website: 'https://www.heylovepdx.com',
  },
  {
    name: 'Hale Pele',
    menuUrl: 'https://www.halepele.com/menu',
    website: 'https://www.halepele.com',
  },
  {
    name: 'Bible Club PDX',
    menuUrl: 'https://bibleclubpdx.com/home',
    website: 'https://bibleclubpdx.com',
  },
  {
    name: 'Bacchus Bar',
    menuUrl: 'https://bacchusbarpdx.com/menus',
    website: 'https://bacchusbarpdx.com',
  },
  // Deadshot permanently closed Nov 2025 — removed
  {
    name: 'The Old Gold',
    menuUrl: 'https://www.drinkinoregon.com',
    website: 'https://www.drinkinoregon.com',
  },
  {
    name: 'Swine Moonshine & Whiskey Bar',
    menuUrl: 'https://swinemoonshine.com/portland-swine-moonshine-and-whiskey-bar-drink-menu',
    website: 'https://swinemoonshine.com',
  },
  // Westward Whiskey tasting room temp closed Feb 2026 — removed
  {
    name: 'Interurban',
    menuUrl: 'https://www.interurbanpdx.com',
    website: 'https://www.interurbanpdx.com',
  },
  {
    name: 'Teardrop Lounge',
    menuUrl: 'https://www.teardroplounge.com',
    website: 'https://www.teardroplounge.com',
  },
];

// ---------------------------------------------------------------------------
// HTML fetch + strip
// ---------------------------------------------------------------------------

async function fetchMenuPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FindADram/1.0 (menu-data-collection; Portland OR whiskey discovery)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return stripHtml(html);
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html: string): string {
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  cleaned = cleaned.replace(/<[^>]+>/g, ' ');
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Truncate very long pages
  if (cleaned.length > 40000) {
    cleaned = cleaned.slice(0, 40000);
  }

  return cleaned;
}

// ---------------------------------------------------------------------------
// Claude extraction
// ---------------------------------------------------------------------------

async function extractWhiskeys(
  client: Anthropic,
  barName: string,
  menuText: string
): Promise<ExtractedWhiskey[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: `You are a whiskey menu extraction expert. Given text scraped from a bar's website, extract ONLY whiskey/whisky/bourbon/scotch/rye/spirits items.

Rules:
- Extract individual spirit pours, NOT cocktails (ignore mixed drinks)
- Include bourbon, scotch, Irish whiskey, rye, Japanese whisky, Canadian whisky, single malt, blended
- Also include other spirits if they appear on a spirits/neat pours list (brandy, mezcal, tequila, rum, etc.)
- Parse prices if available (convert to numeric USD)
- Parse age statements (e.g., "12 Year", "18yo" -> age: 12, 18)
- Parse ABV if listed
- Identify distillery from context when possible
- Classify type: bourbon, scotch, irish, rye, japanese, canadian, single_malt, blended, other
- If the content has no whiskey/spirits items, return an empty array
- Return ONLY valid JSON, no markdown fences`,
    messages: [
      {
        role: 'user',
        content: `Extract all whiskey and spirits items from this menu text for "${barName}".

Return JSON: { "whiskeys": [{ "name": "...", "distillery": "...", "type": "...", "age": null, "abv": null, "price": null, "pour_size": "...", "notes": "..." }] }

Menu text:
${menuText}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.whiskeys || [];
    }
  } catch (err) {
    console.error(`  JSON parse error for ${barName}:`, err instanceof Error ? err.message : err);
  }

  return [];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.error('Set ANTHROPIC_API_KEY in .env.local first');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const results: TrawlResult[] = [];
  const startTime = Date.now();

  console.log(`\nTrawling ${TARGETS.length} Portland bar websites...\n`);

  for (const bar of TARGETS) {
    const barStart = Date.now();
    console.log(`--- ${bar.name} ---`);
    console.log(`  URL: ${bar.menuUrl}`);

    try {
      // Fetch
      console.log('  Fetching page...');
      const menuText = await fetchMenuPage(bar.menuUrl);
      console.log(`  Got ${menuText.length} chars of text`);

      if (menuText.length < 50) {
        console.log('  Skipping — too little content');
        results.push({
          bar,
          whiskeys: [],
          scrapedAt: new Date().toISOString(),
          rawTextLength: menuText.length,
          contentHash: null,
          sourceAttribution: null,
          error: 'Page returned too little content',
        });
        continue;
      }

      // Extract
      console.log('  Extracting whiskeys via Claude...');
      const whiskeys = await extractWhiskeys(client, bar.name, menuText);
      console.log(`  Found ${whiskeys.length} whiskeys (${Date.now() - barStart}ms)`);

      if (whiskeys.length > 0) {
        for (const w of whiskeys.slice(0, 5)) {
          console.log(`    - ${w.name}${w.price ? ` ($${w.price})` : ''}${w.type ? ` [${w.type}]` : ''}`);
        }
        if (whiskeys.length > 5) {
          console.log(`    ... and ${whiskeys.length - 5} more`);
        }
      }

      const scrapedAt = new Date().toISOString();
      results.push({
        bar,
        whiskeys,
        scrapedAt,
        rawTextLength: menuText.length,
        contentHash: sha256(menuText),
        sourceAttribution: buildAttribution(bar.name, bar.menuUrl, scrapedAt.split('T')[0]),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${message}`);
      results.push({
        bar,
        whiskeys: [],
        scrapedAt: new Date().toISOString(),
        rawTextLength: 0,
        contentHash: null,
        sourceAttribution: null,
        error: message,
      });
    }

    // Rate limit: 3 second delay between sites
    if (TARGETS.indexOf(bar) < TARGETS.length - 1) {
      console.log('  Waiting 3s...\n');
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // Summary
  const totalWhiskeys = results.reduce((sum, r) => sum + r.whiskeys.length, 0);
  const successCount = results.filter((r) => !r.error).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========== SUMMARY ==========');
  console.log(`Bars trawled: ${results.length}`);
  console.log(`Successful: ${successCount}/${results.length}`);
  console.log(`Total whiskeys extracted: ${totalWhiskeys}`);
  console.log(`Time: ${elapsed}s`);
  console.log('');

  for (const r of results) {
    const status = r.error ? `FAILED (${r.error})` : `${r.whiskeys.length} whiskeys`;
    console.log(`  ${r.bar.name}: ${status}`);
  }

  // Write results to JSON for the seed generator to use
  const outPath = resolve(process.cwd(), 'scripts/trawl-results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${outPath}`);
}

main().catch(console.error);

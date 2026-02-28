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
  // --- Original 9 targets ---
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

  // --- New targets ---

  // Multnomah Whiskey Library — SW Portland, 1500+ bottle collection
  // Menu is served table-side; website homepage lists featured spirits
  {
    name: 'Multnomah Whiskey Library',
    menuUrl: 'https://mwlpdx.com/',
    website: 'https://mwlpdx.com',
  },

  // Pepe Le Moko — downtown speakeasy basement of Ace Hotel
  // Website may be parked/minimal; attempt the root URL
  {
    name: 'Pepe Le Moko',
    menuUrl: 'https://pepelemokopdx.com/',
    website: 'https://pepelemokopdx.com',
  },

  // Doug Fir Lounge — relocated from E Burnside; reopening delayed as of Feb 2026
  // Attempting website in case partial menu content is available
  {
    name: 'Doug Fir Lounge',
    menuUrl: 'https://www.dougfirlounge.com/',
    website: 'https://www.dougfirlounge.com',
  },

  // Horse Brass Pub — legendary SE Belmont British pub, established 1976
  {
    name: 'Horse Brass Pub',
    menuUrl: 'https://horsebrass.com/menu/',
    website: 'https://horsebrass.com',
  },

  // Expatriate — NE Portland; closed permanently Feb 2026 per Yelp
  // Kept in list to attempt and document via error
  {
    name: 'Expatriate',
    menuUrl: 'http://expatriatepdx.com/cocktails',
    website: 'http://expatriatepdx.com',
  },

  // Shift Drinks — Pearl District; closed Sep 2025 per Yelp
  // Kept in list; attempt in case website still has menu archived
  {
    name: 'Shift Drinks',
    menuUrl: 'https://shiftdrinkspdx.com/',
    website: 'https://shiftdrinkspdx.com',
  },

  // Luc Lac Vietnamese Kitchen — downtown, known for cocktail program
  {
    name: 'Luc Lac',
    menuUrl: 'https://luclackitchen.com/',
    website: 'https://luclackitchen.com',
  },

  // Raven & Rose — permanently closed 2021; kept to document via error
  {
    name: 'Raven & Rose',
    menuUrl: 'https://www.ravenandrosepdx.com/',
    website: 'https://www.ravenandrosepdx.com',
  },

  // Kachka — SE Portland, Russian-themed; 50+ vodka selections, curated spirits
  {
    name: 'Kachka',
    menuUrl: 'https://www.kachkapdx.com/drink-menu',
    website: 'https://www.kachkapdx.com',
  },

  // Bit House Saloon — SE; closed Feb 2026 per Yelp; kept to attempt/document
  {
    name: 'Bit House Saloon',
    menuUrl: 'https://www.bithousesaloon.com/',
    website: 'https://www.bithousesaloon.com',
  },

  // Victoria Bar — N Portland (Albina Ave, near Alberta); mostly-vegan cocktail bar
  // Note: website is victoriapdx.com, not victoriabarpdx.com
  {
    name: 'Victoria Bar',
    menuUrl: 'https://victoriapdx.com/menu/',
    website: 'https://victoriapdx.com',
  },

  // Park Avenue Fine Spirits — bottle shop with tasting bar, SE Portland
  // Note: "Park Avenue Fine Wines" at SW Park Ave appears closed; attempting the user-specified name
  {
    name: 'Park Avenue Fine Spirits',
    menuUrl: 'https://www.parkavenuefinespirits.com/',
    website: 'https://www.parkavenuefinespirits.com',
  },

  // Stag PDX — NE/Pearl area gay bar; craft spirits and whiskey program
  {
    name: 'Stag PDX',
    menuUrl: 'https://www.stagportland.com/',
    website: 'https://www.stagportland.com',
  },
];

// ---------------------------------------------------------------------------
// HTML fetch + smart extraction
// ---------------------------------------------------------------------------

/**
 * Attempt to fetch a URL with one retry on failure (5s delay between attempts).
 */
async function fetchWithRetry(url: string, attempt = 1): Promise<Response> {
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
    return response;
  } catch (err) {
    if (attempt < 2) {
      console.log(`  Fetch failed (attempt ${attempt}), retrying in 5s...`);
      await new Promise((res) => setTimeout(res, 5000));
      return fetchWithRetry(url, attempt + 1);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchMenuPage(url: string): Promise<string> {
  const response = await fetchWithRetry(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return extractMenuContent(html);
}

/**
 * Smart HTML extraction that:
 * 1. Removes boilerplate (scripts, styles, nav, footer)
 * 2. Prioritises menu/spirits-related sections before falling back to full body
 * 3. Converts tables to structured pipe-separated text
 * 4. Handles common menu CMS patterns (Square, Toast, BentoBox)
 */
function extractMenuContent(html: string): string {
  // Remove non-content blocks first
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert tables to structured text before stripping tags
  cleaned = convertTablesToText(cleaned);

  // Try to extract focused menu sections first
  const menuSection = extractMenuSections(cleaned);
  const workingHtml = menuSection || cleaned;

  // Strip remaining tags
  let text = workingHtml.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');

  // Collapse whitespace but preserve line breaks between items
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Truncate very long pages — keep more if we have a focused section
  const limit = menuSection ? 50000 : 40000;
  if (text.length > limit) {
    text = text.slice(0, limit);
  }

  return text;
}

/**
 * Look for menu-related sections by scanning for containers whose class or id
 * contains menu-related keywords. Returns the inner HTML of matched sections,
 * or null if nothing specific is found.
 */
function extractMenuSections(html: string): string | null {
  const menuKeywords = [
    'menu', 'spirits', 'whiskey', 'whisky', 'bourbon', 'cocktail',
    'drinks', 'beverage', 'wine-list', 'bar-menu', 'drink-list',
  ];

  const keywordPattern = menuKeywords.join('|');
  // Match div or section tags whose id or class contains a menu keyword
  const containerRe = new RegExp(
    `<(?:div|section|article|main)[^>]+(?:id|class)=["'][^"']*(?:${keywordPattern})[^"']*["'][^>]*>`,
    'gi'
  );

  const matches: string[] = [];
  let match: RegExpExecArray | null;

  containerRe.lastIndex = 0;
  while ((match = containerRe.exec(html)) !== null) {
    const openTag = match[0];
    const tagName = openTag.match(/^<(\w+)/i)?.[1]?.toLowerCase() ?? 'div';
    const startIdx = match.index;

    // Find the matching closing tag by counting nesting depth
    const openRe = new RegExp(`<${tagName}[\\s>]`, 'gi');
    const closeRe = new RegExp(`</${tagName}>`, 'gi');
    let depth = 1;
    let searchFrom = startIdx + openTag.length;
    let endIdx = -1;

    while (depth > 0 && searchFrom < html.length) {
      openRe.lastIndex = searchFrom;
      closeRe.lastIndex = searchFrom;
      const nextOpen = openRe.exec(html);
      const nextClose = closeRe.exec(html);

      if (!nextClose) break;

      if (nextOpen && nextOpen.index < nextClose.index) {
        depth++;
        searchFrom = nextOpen.index + nextOpen[0].length;
      } else {
        depth--;
        searchFrom = nextClose.index + nextClose[0].length;
        if (depth === 0) {
          endIdx = searchFrom;
        }
      }
    }

    if (endIdx !== -1) {
      const sectionHtml = html.slice(startIdx, endIdx);
      // Only keep sections with some meaningful content length
      if (sectionHtml.length > 200) {
        matches.push(sectionHtml);
      }
    }
  }

  if (matches.length === 0) return null;

  // Deduplicate — remove sections fully contained within another match
  const deduped = matches.filter(
    (m, i) => !matches.some((other, j) => j !== i && other.includes(m) && other.length > m.length)
  );

  return deduped.join('\n\n');
}

/**
 * Convert HTML tables to pipe-separated text so the AI can parse columns.
 * e.g. Scotch | Glenfarclas 25yr | $28 | 1.5oz
 */
function convertTablesToText(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/gi, (tableHtml) => {
    const rows: string[] = [];
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    let rowMatch: RegExpExecArray | null;

    rowRe.lastIndex = 0;
    while ((rowMatch = rowRe.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[0];
      const cells: string[] = [];
      const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;

      cellRe.lastIndex = 0;
      while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
        // Strip inner tags from each cell
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cellText) cells.push(cellText);
      }

      if (cells.length > 0) {
        rows.push(cells.join(' | '));
      }
    }

    return rows.length > 0 ? '\n' + rows.join('\n') + '\n' : '';
  });
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
    system: `You are a whiskey and spirits menu extraction expert. Given text scraped from a bar's website, extract ONLY individual spirit pours (not cocktails).

Rules:
- Extract individual spirit pours — NOT cocktails or mixed drinks
- Include bourbon, scotch, Irish whiskey, rye, Japanese whisky, Canadian whisky, single malt, blended, and other spirits appearing on a neat-pours/spirits list (brandy, mezcal, tequila, rum, etc.)
- Parse prices if available (convert to numeric USD). "Market price" or "MP" → price: null, add note "market price"
- Parse age statements (e.g., "12 Year", "18yo" → age: 12, 18)
- Parse ABV if listed
- Identify distillery from context when possible
- Classify type: bourbon, scotch, irish, rye, japanese, canadian, single_malt, blended, other
- Private barrel selections: extract as distinct items; include barrel number, store pick details, or cask notes in the notes field
- Flight offerings: note the flight name and price range in notes but do NOT enumerate individual whiskeys from the flight description as separate items unless they are explicitly listed with individual prices
- Happy hour pricing: if a spirit has a discounted happy hour price, note it as "Happy hour: $X" in the notes field
- Tasting room only items: add "Tasting room only" to the notes field
- If the content has no individual spirit pour items, return an empty array
- Return ONLY valid JSON, no markdown fences`,
    messages: [
      {
        role: 'user',
        content: `Extract all individual whiskey and spirits pours from this menu text for "${barName}".

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
// Summary writer
// ---------------------------------------------------------------------------

function writeSummary(results: TrawlResult[], elapsed: string, outPath: string): void {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push('Portland Bar Spirits Trawl — Summary Report');
  lines.push('='.repeat(60));
  lines.push(`Generated: ${now}`);
  lines.push(`Duration:  ${elapsed}s`);
  lines.push('');

  const successResults = results.filter((r) => !r.error);
  const failedResults = results.filter((r) => !!r.error);
  const totalWhiskeys = results.reduce((sum, r) => sum + r.whiskeys.length, 0);

  lines.push(`Bars attempted: ${results.length}`);
  lines.push(`Successful:     ${successResults.length}`);
  lines.push(`Failed:         ${failedResults.length}`);
  lines.push(`Total spirits:  ${totalWhiskeys}`);
  lines.push('');

  // Successes
  if (successResults.length > 0) {
    lines.push('SUCCESSFUL BARS');
    lines.push('-'.repeat(60));
    for (const r of successResults) {
      lines.push('');
      lines.push(`Bar:    ${r.bar.name}`);
      lines.push(`URL:    ${r.bar.menuUrl}`);
      lines.push(`Count:  ${r.whiskeys.length} spirits extracted`);
      lines.push(`Hash:   ${r.contentHash ?? 'n/a'}`);
      lines.push(`Source: ${r.sourceAttribution ?? 'n/a'}`);

      if (r.whiskeys.length > 0) {
        lines.push('Items:');
        for (const w of r.whiskeys) {
          const price = w.price != null ? ` $${w.price}` : w.notes?.includes('market price') ? ' MP' : '';
          const age = w.age != null ? ` ${w.age}yr` : '';
          const type = w.type ? ` [${w.type}]` : '';
          const distillery = w.distillery ? ` — ${w.distillery}` : '';
          const notes = w.notes ? ` (${w.notes})` : '';
          lines.push(`  - ${w.name}${age}${type}${distillery}${price}${notes}`);
        }
      }
    }
  }

  // Failures
  if (failedResults.length > 0) {
    lines.push('');
    lines.push('FAILED / SKIPPED BARS');
    lines.push('-'.repeat(60));
    for (const r of failedResults) {
      lines.push('');
      lines.push(`Bar:   ${r.bar.name}`);
      lines.push(`URL:   ${r.bar.menuUrl}`);
      lines.push(`Error: ${r.error}`);
    }
  }

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('End of report');

  writeFileSync(outPath, lines.join('\n'), 'utf-8');
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

  for (let i = 0; i < TARGETS.length; i++) {
    const bar = TARGETS[i];
    const barStart = Date.now();
    console.log(`[${i + 1}/${TARGETS.length}] ${bar.name}`);
    console.log(`  URL: ${bar.menuUrl}`);

    try {
      // Fetch (with 1 retry on failure)
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
      console.log('  Extracting spirits via Claude...');
      const whiskeys = await extractWhiskeys(client, bar.name, menuText);
      console.log(`  Found ${whiskeys.length} spirits (${Date.now() - barStart}ms)`);

      if (whiskeys.length > 0) {
        for (const w of whiskeys.slice(0, 5)) {
          console.log(`    - ${w.name}${w.price != null ? ` ($${w.price})` : ''}${w.type ? ` [${w.type}]` : ''}`);
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

    // Rate limit: 2s delay between sites (polite but faster than 3s)
    if (i < TARGETS.length - 1) {
      console.log('  Waiting 2s...\n');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Summary
  const totalWhiskeys = results.reduce((sum, r) => sum + r.whiskeys.length, 0);
  const successCount = results.filter((r) => !r.error).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========== SUMMARY ==========');
  console.log(`Bars trawled: ${results.length}`);
  console.log(`Successful: ${successCount}/${results.length}`);
  console.log(`Total spirits extracted: ${totalWhiskeys}`);
  console.log(`Time: ${elapsed}s`);
  console.log('');

  for (const r of results) {
    const status = r.error ? `FAILED (${r.error})` : `${r.whiskeys.length} spirits`;
    console.log(`  ${r.bar.name}: ${status}`);
  }

  // Write JSON results for the seed generator
  const jsonOutPath = resolve(process.cwd(), 'scripts/trawl-results.json');
  writeFileSync(jsonOutPath, JSON.stringify(results, null, 2));
  console.log(`\nJSON results written to ${jsonOutPath}`);

  // Write human-readable summary
  const summaryOutPath = resolve(process.cwd(), 'scripts/trawl-summary.txt');
  writeSummary(results, elapsed, summaryOutPath);
  console.log(`Summary written to ${summaryOutPath}`);
}

main().catch(console.error);

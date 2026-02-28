/**
 * Live trawl script for Portland bar websites.
 * Fetches real menu pages, extracts whiskey data via Claude, outputs results.
 *
 * Usage: npx tsx scripts/trawl-portland.ts
 *        npx tsx scripts/trawl-portland.ts --skip-discovery
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const writeKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const sbWriteHeaders = { 'apikey': writeKey!, 'Authorization': `Bearer ${writeKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
const sbReadHeaders = { 'apikey': SUPABASE_ANON_KEY!, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BarTarget {
  id: string;
  name: string;
  menuUrl: string | null;
  website: string | null;
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
// Database-driven target loading
// ---------------------------------------------------------------------------

async function loadTargetsFromDB(): Promise<BarTarget[]> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE env vars — cannot load bars from database');
    process.exit(1);
  }

  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/bars?select=id,name,website,metadata&state=eq.OR&website=not.is.null`,
    { headers: sbReadHeaders }
  );
  if (!resp.ok) throw new Error(`Failed to load bars: ${resp.status}`);

  const bars = await resp.json() as Array<{
    id: string;
    name: string;
    website: string | null;
    metadata: Record<string, unknown>;
  }>;

  return bars.map(bar => ({
    id: bar.id,
    name: bar.name,
    menuUrl: (bar.metadata?.menu_url as string) || null,
    website: bar.website,
  }));
}

/**
 * Crawl a bar's homepage to find the best menu/drinks page URL.
 * Scores links by keywords related to menus and spirits.
 */
async function discoverMenuUrl(website: string): Promise<string | null> {
  try {
    const response = await fetchWithRetry(website);
    if (!response.ok) return null;
    const html = await response.text();

    // Extract all links from the page
    const linkRe = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const candidates: Array<{ url: string; score: number }> = [];

    const MENU_KEYWORDS = [
      { pattern: /\bmenu\b/i, weight: 10 },
      { pattern: /\bdrinks?\b/i, weight: 8 },
      { pattern: /\bspirits?\b/i, weight: 9 },
      { pattern: /\bwhisk(?:e?y|ies)\b/i, weight: 10 },
      { pattern: /\bbourbon\b/i, weight: 8 },
      { pattern: /\bcocktails?\b/i, weight: 7 },
      { pattern: /\bbeverage\b/i, weight: 8 },
      { pattern: /\bwine.?list\b/i, weight: 5 },
      { pattern: /\bbar.?menu\b/i, weight: 9 },
      { pattern: /\bfood.?(?:and|&).?drink\b/i, weight: 7 },
    ];

    let match: RegExpExecArray | null;
    while ((match = linkRe.exec(html)) !== null) {
      const href = match[1];
      const linkText = match[2].replace(/<[^>]+>/g, '').trim();

      // Build absolute URL
      let absoluteUrl: string;
      try {
        absoluteUrl = new URL(href, website).href;
      } catch {
        continue;
      }

      // Only follow links on the same domain
      try {
        if (new URL(absoluteUrl).hostname !== new URL(website).hostname) continue;
      } catch {
        continue;
      }

      // Score this link
      let score = 0;
      const textToCheck = linkText + ' ' + href;
      for (const kw of MENU_KEYWORDS) {
        if (kw.pattern.test(textToCheck)) {
          score += kw.weight;
        }
      }

      if (score > 0) {
        candidates.push({ url: absoluteUrl, score });
      }
    }

    if (candidates.length === 0) return null;

    // Sort by score descending, return highest
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].url;
  } catch {
    return null;
  }
}

/**
 * Save discovered menu URL back to the bar's metadata for future runs.
 */
async function saveMenuUrl(barId: string, menuUrl: string): Promise<void> {
  if (!SUPABASE_URL) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/bars?id=eq.${barId}`, {
      method: 'PATCH',
      headers: sbWriteHeaders,
      body: JSON.stringify({
        metadata: { menu_url: menuUrl },
      }),
    });
  } catch {
    // Non-critical — log but don't fail
  }
}

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
// Supabase write helpers
// ---------------------------------------------------------------------------

async function getExistingWhiskeys(): Promise<Array<{ id: string; name: string }>> {
  if (!SUPABASE_URL) return [];
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys?select=id,name`, { headers: sbReadHeaders });
  return resp.json();
}

async function findOrCreateWhiskey(
  w: ExtractedWhiskey,
  existing: Array<{ id: string; name: string }>
): Promise<string | null> {
  const norm = w.name.toLowerCase().replace(/['']/g, '').trim();
  const found = existing.find(e => e.name.toLowerCase().replace(/['']/g, '').trim() === norm);
  if (found) return found.id;

  if (!SUPABASE_URL) return null;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys`, {
    method: 'POST',
    headers: sbWriteHeaders,
    body: JSON.stringify({
      name: w.name, distillery: w.distillery || null, type: w.type || 'other',
      age: w.age || null, abv: w.abv || null, description: w.notes || null,
      region: null, country: null, image_url: null,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data?.[0]) {
    existing.push({ id: data[0].id, name: w.name });
    return data[0].id;
  }
  return null;
}

async function linkWhiskeyToBar(
  barId: string,
  whiskeyId: string,
  w: ExtractedWhiskey,
): Promise<boolean> {
  if (!SUPABASE_URL) return false;
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bar_whiskeys`, {
    method: 'POST',
    headers: { ...sbWriteHeaders, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify({
      bar_id: barId, whiskey_id: whiskeyId,
      price: w.price || null, pour_size: w.pour_size || null,
      available: true, notes: w.notes || null,
      source_type: 'website_trawl', confidence: 0.75,
      is_stale: false,
    }),
  });
  return resp.ok;
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

  const skipDiscovery = process.argv.includes('--skip-discovery');
  const client = new Anthropic({ apiKey });
  const results: TrawlResult[] = [];
  const startTime = Date.now();

  // Load bars from database
  console.log('\nLoading Portland bars from database...');
  const targets = await loadTargetsFromDB();
  console.log(`Found ${targets.length} bars with websites\n`);

  if (targets.length === 0) {
    console.log('No bars with websites found. Run google-places-enrich.mjs first.');
    process.exit(0);
  }

  // Load existing whiskeys for dedup
  const existingWhiskeys = await getExistingWhiskeys();
  console.log(`${existingWhiskeys.length} existing whiskeys in DB\n`);

  // Menu URL discovery phase
  if (!skipDiscovery) {
    console.log('=== Discovering menu URLs ===\n');
    for (const target of targets) {
      if (target.menuUrl) continue; // Already has a menu URL
      if (!target.website) continue;

      console.log(`  ${target.name}: discovering menu page...`);
      const menuUrl = await discoverMenuUrl(target.website);
      if (menuUrl) {
        console.log(`    Found: ${menuUrl}`);
        target.menuUrl = menuUrl;
        await saveMenuUrl(target.id, menuUrl);
      } else {
        console.log(`    No menu page found, will use homepage`);
        target.menuUrl = target.website;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('');
  }

  // Trawl phase
  const trawlTargets = targets.filter(t => t.menuUrl || t.website);
  console.log(`Trawling ${trawlTargets.length} bar websites...\n`);

  for (let i = 0; i < trawlTargets.length; i++) {
    const bar = trawlTargets[i];
    const url = bar.menuUrl || bar.website!;
    const barStart = Date.now();
    console.log(`[${i + 1}/${trawlTargets.length}] ${bar.name}`);
    console.log(`  URL: ${url}`);

    try {
      console.log('  Fetching page...');
      const menuText = await fetchMenuPage(url);
      console.log(`  Got ${menuText.length} chars of text`);

      if (menuText.length < 50) {
        console.log('  Skipping — too little content');
        results.push({
          bar: { ...bar, menuUrl: url, website: bar.website || url },
          whiskeys: [],
          scrapedAt: new Date().toISOString(),
          rawTextLength: menuText.length,
          contentHash: null,
          sourceAttribution: null,
          error: 'Page returned too little content',
        });
        continue;
      }

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

        // Write to Supabase
        let linked = 0;
        for (const w of whiskeys) {
          if (!w.name) continue;
          const whiskeyId = await findOrCreateWhiskey(w, existingWhiskeys);
          if (!whiskeyId) continue;
          const ok = await linkWhiskeyToBar(bar.id, whiskeyId, w);
          if (ok) linked++;
        }
        console.log(`  Linked ${linked}/${whiskeys.length} to Supabase`);
      }

      const scrapedAt = new Date().toISOString();
      results.push({
        bar: { ...bar, menuUrl: url, website: bar.website || url },
        whiskeys,
        scrapedAt,
        rawTextLength: menuText.length,
        contentHash: sha256(menuText),
        sourceAttribution: buildAttribution(bar.name, url, scrapedAt.split('T')[0]),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ERROR: ${message}`);
      results.push({
        bar: { ...bar, menuUrl: url, website: bar.website || url },
        whiskeys: [],
        scrapedAt: new Date().toISOString(),
        rawTextLength: 0,
        contentHash: null,
        sourceAttribution: null,
        error: message,
      });
    }

    if (i < trawlTargets.length - 1) {
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

  // Write JSON results (secondary artifact for debugging)
  const jsonOutPath = resolve(process.cwd(), 'scripts/trawl-results.json');
  writeFileSync(jsonOutPath, JSON.stringify(results, null, 2));
  console.log(`\nJSON results written to ${jsonOutPath}`);

  // Write human-readable summary
  const summaryOutPath = resolve(process.cwd(), 'scripts/trawl-summary.txt');
  writeSummary(results, elapsed, summaryOutPath);
  console.log(`Summary written to ${summaryOutPath}`);
}

main().catch(console.error);

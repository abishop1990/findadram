/**
 * Enrich empty Portland bars with whiskey data using Claude's knowledge.
 *
 * For each bar with 0 whiskeys, asks Claude what spirits that bar is known
 * to carry based on public knowledge (reviews, articles, press).
 * Results are inserted with source_type='ai_knowledge' and lower confidence.
 *
 * Usage: node scripts/enrich-portland-bars.mjs
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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !ANTHROPIC_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

// Use service role key for writes (bypasses RLS), anon key for reads
const writeKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;

const sbHeaders = {
  'apikey': writeKey,
  'Authorization': `Bearer ${writeKey}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const sbReadHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Bar context for Claude — what each bar is known for
const BAR_CONTEXT = {
  'Multnomah Whiskey Library': 'Premier Portland whiskey bar with 1,500+ bottles. Reservations-only, leather-and-wood aesthetic. Known for rare and allocated bourbons, extensive scotch selection, and Japanese whisky. High-end pours. Located SW Alder St.',
  'Scotch Lodge': 'SE Portland bar specializing in scotch whisky with 300+ selections. Strong Islay and Highland representation. Also carries bourbon and Japanese whisky. Craft cocktails. 215 SE 9th Ave.',
  'Pope House Bourbon Lounge': 'NW Portland bar focused on bourbon with 150+ selections. American whiskey specialist. Victorian house setting. Strong Kentucky bourbon and rye selection. 2075 NW Glisan.',
  'Paydirt': 'NE Portland whiskey bar inside Zipper food hall with 250+ whiskies. Democratic pricing, good selection across all categories. Casual atmosphere.',
  'Loyal Legion': 'SE Portland beer hall that also carries 130+ whiskies. Good bourbon and rye selection alongside 99 taps. Broad American whiskey focus.',
  'Teardrop Lounge': 'Pearl District craft cocktail bar. Curated spirit selection focused on cocktail-worthy bottles. Known for creative cocktails but carries quality neat-pour spirits too.',
  'Angel Face': 'SE Portland cocktail bar by the team behind Clyde Common. Small but curated spirits list. European spirits focus alongside American whiskey.',
  'Hey Love': 'Central Eastside cocktail bar and restaurant. Contemporary Asian-influenced drinks. Moderate spirits selection with quality picks.',
  'Bible Club PDX': 'Inner SE Portland speakeasy-style bar. Prohibition-era theme. Curated whiskey and cocktail selection.',
  'Hale Pele': 'NE Portland tiki bar. Primarily rum-focused but carries select whiskeys for non-tiki drinkers. Extensive rum collection.',
  'Bacchus Bar': 'Downtown Portland hotel bar (Hotel deLuxe). Classic cocktails, moderate whiskey selection. Old Hollywood glamour theme.',
  'Swine Moonshine & Whiskey Bar': 'Downtown Portland (Paramount Hotel). Moonshine and whiskey specialist. Southern spirits focus, craft moonshine alongside bourbon and rye.',
  'Holy Ghost Bar': 'SE Portland neighborhood bar. Curated selection of spirits. Known for quality cocktails and approachable whiskey picks.',
  'The Eastburn': 'SE Portland neighborhood pub. Solid back bar with mainstream and craft whiskeys. Good value pours.',
  'Rum Club': 'NE Portland bar. Primarily rum-focused but carries bourbon and rye. Known as a bartender hangout.',
  'The Sapphire Hotel': 'SE Portland lounge. Intimate bar with curated cocktails. Moderate spirits selection.',
  'Too Soon': 'SE Portland bar and venue. Cocktail-forward with a good whiskey back bar.',
  'Bull Run Distillery': 'NW Portland distillery tasting room. Makes their own bourbon, rye, and other spirits. Bull Run Straight Bourbon, Temperance Trader Bourbon, etc.',
  'New Deal Distillery': 'SE Portland craft distillery. Known for vodka and gin but also makes whiskey. Hot Monkey Pepper Vodka, Portland Dry Gin. Tasting room.',
  'Stone Barn Brandyworks': 'SE Portland brandy and spirits distillery. Makes grape brandy, apple brandy, and aged spirits. Tasting room open limited hours.',
  'Freeland Spirits': 'NE Portland woman-owned distillery. Makes bourbon, gin, and other spirits. Freeland Bourbon, Freeland Gin. Tasting room.',

  // New Portland bars — added for enrichment
  '2NW5': 'NW Portland bar/restaurant. Neighborhood spot with cocktails and a moderate spirits back bar. American whiskey and craft cocktails.',
  '503 Distilling': 'Portland craft distillery. Small-batch spirits producer making vodka, gin, whiskey, and other spirits. Tasting room with their own products.',
  'ASYLUM SPIRITS': 'Portland craft distillery or spirits bar. Small-batch distilling operation in Portland. Produces craft spirits including whiskey.',
  'Aviation American Gin': 'Portland-born gin brand with a tasting room. Famous for Aviation American Gin. Also carries other House Spirits products and select whiskeys. House Spirits Distillery tasting room.',
  'Bird Creek Distillery': 'Portland craft distillery. Small-batch producer of whiskey and other spirits. Tasting room featuring their own products.',
  'Dirty Pretty': 'Portland cocktail bar. Craft cocktail-focused with a curated back bar. Known for creative drinks and quality spirits selection.',
  'Fabrika: Kachka Distillery & Zakuski Bar': 'Portland bar and distillery by the team behind Kachka restaurant. Eastern European spirits focus. House-made vodkas and infusions, plus select whiskeys and other spirits. Zakuski (small bites) menu.',
  'Fools and horses': 'Portland neighborhood bar. Cocktail-forward with a solid spirits selection. Approachable drinks and friendly atmosphere.',
  'MALPRACTICE': 'Portland bar. Cocktail bar with a curated spirits menu. Mixed drinks and quality pours.',
  'Martin Ryan Distilling Co.': 'Portland craft distillery. Makes gin, vodka, and whiskey. Known for their Aviation American Gin heritage. Tasting room with house-made spirits.',
  'Proof\u2022Reader Whiskey + Craft + Kitchen, Restaurant & Bar': 'Portland whiskey-focused restaurant and bar. Dedicated whiskey menu with craft selections. Restaurant with a strong spirits program featuring bourbon, rye, and other whiskeys.',
  'Raven\'s Manor': 'Portland gothic/horror-themed cocktail bar. Unique themed drinks and atmosphere. Curated spirits selection with creative cocktails.',
  'RIVERSIDE TAPROOM': 'Portland taproom. Beer-focused but carries spirits including whiskey. Casual atmosphere with a bar selection.',
  'Secret Grove': 'Portland bar. Cocktail-focused neighborhood spot. Moderate spirits selection with quality picks.',
  'Sip City Spirits + Wine + Beer (Uptown)': 'Portland spirits, wine, and beer bar in the Uptown area. Broad selection of spirits for tasting. Whiskey flights and pours alongside wine and beer.',
  'Speakeasy Saloon': 'Portland speakeasy-themed bar. Prohibition-era inspired cocktails and atmosphere. Whiskey-forward back bar with bourbon and rye selections.',
  'Speakeasy Tavern': 'Portland speakeasy-style tavern. Classic cocktails and whiskey selection. Vintage atmosphere with a solid spirits program.',
  'Spirit of 77': 'NE Portland sports bar. Known for watching games with craft drinks. Carries a selection of whiskeys alongside beer. Casual, fun atmosphere.',
  'Spirits Pub': 'Portland pub with a spirits-forward approach. Good whiskey selection alongside pub fare. Neighborhood bar with quality pours.',
  'Sugar Hill': 'Portland cocktail bar. Creative cocktails and a curated spirits menu. Known for quality drinks and a good back bar.',
  'The Civic Taproom and Bottle Shop': 'Portland taproom and bottle shop. Beer-focused but carries whiskey and other spirits. Bottle shop allows retail purchases.',
  'The Green Room': 'Portland bar and venue. Cocktail bar with music and events. Moderate spirits selection.',
  'The Westgate Bourbon Bar & Taphouse': 'Portland bourbon bar and taphouse. Bourbon-focused with a dedicated American whiskey selection. Also carries beer on tap. Bourbon flights and quality pours.',
  'Voysey': 'Portland cocktail bar. Craft cocktail-focused with a curated spirits program. Quality ingredients and creative drinks.',
  'Whiskey Barrel Lounge': 'Portland whiskey bar/lounge. Dedicated whiskey program with a wide selection of bourbon, rye, scotch, and other whiskeys. Whiskey flights and quality pours.',
  'Wild Roots': 'Portland-area spirits producer known for fruit-infused vodkas and other spirits. Wild Roots Vodka flavors. Tasting room with their own products.',
};

async function claudeExtract(barName, context) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `You are a Portland, Oregon spirits expert. Based on your knowledge of "${barName}", list the whiskeys/spirits this bar is known to carry or has been documented carrying in reviews, articles, and public posts.

Bar context: ${context}

IMPORTANT RULES:
- Only list spirits you have reasonable confidence this specific bar carries
- For dedicated whiskey bars, list 15-30 items
- For cocktail bars, list 8-15 items
- For distillery tasting rooms, list their own products (4-8 items)
- For bars where you're unsure, list 5-10 common Portland bar staples
- Include realistic Portland bar pricing (Portland pours are typically $8-22 for standard, $25-60+ for rare/allocated)
- Pour sizes: most Portland bars pour 1.5oz or 2oz
- Be specific with expressions (e.g., "Buffalo Trace" not just "bourbon")

Return ONLY valid JSON, no markdown:
{
  "whiskeys": [
    {
      "name": "Full whiskey name with expression",
      "distillery": "Producer/distillery name",
      "type": "bourbon|scotch|irish|rye|japanese|canadian|single_malt|blended|other",
      "age": null or integer,
      "abv": null or number,
      "price": null or number (USD per pour),
      "pour_size": "1.5oz or 2oz",
      "notes": "any relevant notes"
    }
  ],
  "confidence_note": "Brief note on how confident you are about this list"
}`
      }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Claude API error ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return { whiskeys: [] };

  return JSON.parse(jsonMatch[0]);
}

async function getExistingWhiskeys() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys?select=id,name,normalized_name`, { headers: sbReadHeaders });
  return resp.json();
}

async function getEmptyPortlandBars() {
  // Get all Portland bars
  const barsResp = await fetch(`${SUPABASE_URL}/rest/v1/bars?select=id,name,city,state&state=eq.OR&order=name`, { headers: sbReadHeaders });
  const bars = await barsResp.json();

  // Get all bar_whiskeys
  const linksResp = await fetch(`${SUPABASE_URL}/rest/v1/bar_whiskeys?select=bar_id`, { headers: sbReadHeaders });
  const links = await linksResp.json();

  const barsWithWhiskeys = new Set(links.map(l => l.bar_id));
  return bars.filter(b => !barsWithWhiskeys.has(b.id));
}

function normalize(name) {
  return name.toLowerCase()
    .replace(/['']/g, '')
    .replace(/\s+/g, ' ')
    .replace(/year old|yr old|years? ?old|yo\b/gi, 'yr')
    .trim();
}

async function findOrCreateWhiskey(w, existingWhiskeys) {
  const norm = normalize(w.name);

  // Check if exists
  const existing = existingWhiskeys.find(e =>
    normalize(e.name) === norm ||
    (e.normalized_name && e.normalized_name === norm)
  );

  if (existing) return existing.id;

  // Create new
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys`, {
    method: 'POST',
    headers: sbHeaders,
    body: JSON.stringify({
      name: w.name,
      distillery: w.distillery || null,
      type: w.type || 'other',
      age: w.age || null,
      abv: w.abv || null,
      description: w.notes || null,
      region: null,
      country: null,
      image_url: null,
    }),
  });

  if (!resp.ok) {
    // Might be duplicate normalized_name — try to find it
    const retryResp = await fetch(
      `${SUPABASE_URL}/rest/v1/whiskeys?name=eq.${encodeURIComponent(w.name)}&select=id`,
      { headers: sbHeaders }
    );
    const retryData = await retryResp.json();
    if (retryData.length > 0) return retryData[0].id;
    return null;
  }

  const created = await resp.json();
  if (Array.isArray(created) && created.length > 0) {
    existingWhiskeys.push({ id: created[0].id, name: w.name, normalized_name: norm });
    return created[0].id;
  }
  return null;
}

async function linkWhiskeyToBar(barId, whiskeyId, w) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bar_whiskeys`, {
    method: 'POST',
    headers: { ...sbHeaders, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify({
      bar_id: barId,
      whiskey_id: whiskeyId,
      price: w.price || null,
      pour_size: w.pour_size || null,
      available: true,
      notes: w.notes || null,
      source_type: 'ai_knowledge',
      confidence: 0.60,
      is_stale: false,
    }),
  });
  return resp.ok;
}

async function main() {
  console.log('Fetching empty Portland bars...');
  const emptyBars = await getEmptyPortlandBars();
  console.log(`Found ${emptyBars.length} bars with zero whiskeys\n`);

  let existingWhiskeys = await getExistingWhiskeys();
  console.log(`${existingWhiskeys.length} whiskeys already in database\n`);

  let totalAdded = 0;
  let totalLinked = 0;

  for (const bar of emptyBars) {
    const context = BAR_CONTEXT[bar.name];
    if (!context) {
      console.log(`--- ${bar.name} --- SKIPPED (no context)`);
      continue;
    }

    console.log(`--- ${bar.name} ---`);
    console.log('  Asking Claude...');

    try {
      const result = await claudeExtract(bar.name, context);
      const whiskeys = result.whiskeys || [];
      console.log(`  Got ${whiskeys.length} spirits`);
      if (result.confidence_note) {
        console.log(`  Confidence: ${result.confidence_note}`);
      }

      let linked = 0;
      for (const w of whiskeys) {
        if (!w.name) continue;

        const whiskeyId = await findOrCreateWhiskey(w, existingWhiskeys);
        if (!whiskeyId) {
          console.log(`  SKIP: Could not create whiskey "${w.name}"`);
          continue;
        }

        const ok = await linkWhiskeyToBar(bar.id, whiskeyId, w);
        if (ok) {
          linked++;
        }
      }

      totalAdded += whiskeys.length;
      totalLinked += linked;
      console.log(`  Linked ${linked}/${whiskeys.length} spirits to bar\n`);

      // Rate limit
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.log(`  ERROR: ${err.message}\n`);
    }
  }

  console.log('========== SUMMARY ==========');
  console.log(`Bars enriched: ${emptyBars.filter(b => BAR_CONTEXT[b.name]).length}`);
  console.log(`Total spirits generated: ${totalAdded}`);
  console.log(`Total links created: ${totalLinked}`);
  console.log(`Existing whiskeys in DB: ${existingWhiskeys.length}`);
}

main().catch(console.error);

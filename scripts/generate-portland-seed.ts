/**
 * Generate Portland-specific seed SQL from trawl results + bar data.
 * Run AFTER trawl-portland.ts has produced trawl-results.json.
 *
 * Usage: npx tsx scripts/generate-portland-seed.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';

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
} catch { /* ignore */ }

// ---------------------------------------------------------------------------
// Pacific Northwest service area geofence
// Covers: Portland OR, Vancouver WA, Olympia WA, Tacoma WA, Seattle WA,
//         Bellevue WA, Beaverton OR, Hillsboro OR, Gresham OR, Oregon City OR
// Excludes: Portland ME, Vancouver BC (49.28°N — well north of 47.75), Salem, Eugene
// ---------------------------------------------------------------------------

const SERVICE_AREA_BOUNDS = {
  north: 47.75,    // north edge of Seattle metro / Everett area
  south: 45.35,    // south of Oregon City
  east:  -122.10,  // east of Bellevue / Issaquah
  west:  -122.90,  // west of Hillsboro / Tacoma
};

function isInServiceArea(lat: number, lng: number): boolean {
  return (
    lat >= SERVICE_AREA_BOUNDS.south &&
    lat <= SERVICE_AREA_BOUNDS.north &&
    lng >= SERVICE_AREA_BOUNDS.west &&
    lng <= SERVICE_AREA_BOUNDS.east
  );
}

/** Backwards-compatible alias. */
const isInPortlandMetro = isInServiceArea;

// ---------------------------------------------------------------------------
// Portland bar data (coordinates + metadata)
// ---------------------------------------------------------------------------

interface BarSeed {
  name: string;
  lat: number;
  lng: number;
  address: string;
  phone: string | null;
  website: string | null;
  tier: string;
  metadata: Record<string, unknown>;
}

// Verified coordinates + open/closed status as of Feb 2026
// Removed: Clyde Common (closed Jan 2022), Pepe Le Moko (closed late 2025),
//          Deadshot (closed Nov 2025), Eastside Distilling tasting room (closed 2020),
//          Westward Whiskey tasting room (temp closed Feb 2026)
const PORTLAND_BARS: BarSeed[] = [
  // Tier 1: Dedicated Whiskey Bars
  { name: 'Multnomah Whiskey Library', lat: 45.5209, lng: -122.6831, address: '1124 SW Alder St, Portland, OR 97205', phone: '+1 503-954-1381', website: 'https://mwlpdx.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Downtown', whiskey_count: 1500, reservations: true } },
  { name: 'Scotch Lodge', lat: 45.5214, lng: -122.6569, address: '215 SE 9th Ave, Ste 102, Portland, OR 97214', phone: '+1 503-208-2039', website: 'https://www.scotchlodge.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Central Eastside', whiskey_count: 300, half_pours: true } },
  { name: 'The Old Gold', lat: 45.5629, lng: -122.6892, address: '2105 N Killingsworth St, Portland, OR 97217', phone: '+1 503-894-8937', website: 'https://www.drinkinoregon.com', tier: 'whiskey_bar', metadata: { neighborhood: 'North Portland', single_barrel_selections: true } },
  { name: 'Paydirt', lat: 45.5285, lng: -122.6369, address: '2724 NE Pacific St, Portland, OR 97232', phone: null, website: 'https://www.paydirtbar.com', tier: 'whiskey_bar', metadata: { neighborhood: 'The Zipper', whiskey_count: 250, sister_bar: 'The Old Gold' } },
  { name: 'Pope House Bourbon Lounge', lat: 45.5265, lng: -122.6940, address: '2075 NW Glisan St, Portland, OR 97209', phone: '+1 503-222-1056', website: 'https://www.popehouselounge.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Nob Hill', bourbon_count: 150, historic_building: true, year_built: 1890 } },
  { name: 'Swine Moonshine & Whiskey Bar', lat: 45.5187, lng: -122.6801, address: '808 SW Taylor St, Portland, OR 97205', phone: '+1 503-943-5844', website: 'https://swinemoonshine.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Downtown', hotel: 'Paramount Hotel', prohibition_aesthetic: true } },
  { name: 'Loyal Legion', lat: 45.5189, lng: -122.6600, address: '710 SE 6th Ave, Portland, OR 97214', phone: '+1 503-235-8272', website: 'https://loyallegionbeerhall.com/portland/', tier: 'whiskey_bar', metadata: { neighborhood: 'Central Eastside', beers_on_tap: 99, whiskey_count: 130 } },
  { name: 'The Eastburn', lat: 45.5237, lng: -122.6457, address: '1800 E Burnside St, Portland, OR 97214', phone: '+1 503-236-2876', website: 'https://theeastburn.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Buckman', whisky_wednesday: true } },
  { name: 'Interurban', lat: 45.5530, lng: -122.6757, address: '4057 N Mississippi Ave, Portland, OR 97227', phone: '+1 503-284-6669', website: 'https://www.interurbanpdx.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Mississippi', pre_prohibition_cocktails: true } },
  { name: 'Holy Ghost Bar', lat: 45.4988, lng: -122.6340, address: '4107 SE 28th Ave, Portland, OR 97202', phone: '+1 503-235-0969', website: 'https://www.holyghostbar.com', tier: 'whiskey_bar', metadata: { neighborhood: 'Woodstock', whiskey_and_mezcal: true } },

  // Tier 2: Craft Cocktail Bars (only bars confirmed OPEN as of Feb 2026)
  { name: 'Teardrop Lounge', lat: 45.5264, lng: -122.6821, address: '1015 NW Everett St, Portland, OR 97209', phone: '+1 503-445-8109', website: 'https://www.teardroplounge.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Pearl District', specialty_cocktails: 30 } },
  { name: 'Angel Face', lat: 45.5231, lng: -122.6366, address: '14 NE 28th Ave, Portland, OR 97232', phone: '+1 503-239-3804', website: 'https://www.angelfaceportland.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Kerns', no_menu: true, bartender_driven: true } },
  { name: 'Hey Love', lat: 45.5232, lng: -122.6512, address: '920 E Burnside St, Portland, OR 97214', phone: '+1 503-206-6223', website: 'https://www.heylovepdx.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Buckman', hotel: 'Jupiter NEXT Hotel', best_hotel_bar: true } },
  { name: 'Bible Club PDX', lat: 45.4849, lng: -122.6507, address: '6716 SE 16th Ave, Portland, OR 97202', phone: '+1 971-279-2198', website: 'https://bibleclubpdx.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Sellwood', speakeasy: true, year_built: 1922 } },
  { name: 'Hale Pele', lat: 45.5353, lng: -122.6374, address: '2733 NE Broadway, Portland, OR 97232', phone: '+1 503-662-8454', website: 'https://www.halepele.com', tier: 'cocktail_bar', metadata: { neighborhood: "Sullivan's Gulch", tiki_bar: true, cocktail_count: 50 } },
  { name: 'Rum Club', lat: 45.5234, lng: -122.6548, address: '720 SE Sandy Blvd, Portland, OR 97214', phone: '+1 503-265-8807', website: 'https://rumclubpdx.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Buckman' } },
  { name: 'The Sapphire Hotel', lat: 45.5119, lng: -122.6113, address: '5008 SE Hawthorne Blvd, Portland, OR 97215', phone: '+1 503-232-6333', website: 'https://thesapphirehotel.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Hawthorne' } },
  { name: 'Bacchus Bar', lat: 45.5196, lng: -122.6793, address: '422 SW Broadway, Portland, OR 97205', phone: '+1 503-228-1212', website: 'https://www.bacchusbarpdx.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Downtown', hotel: 'Kimpton Hotel Vintage' } },
  { name: 'Too Soon', lat: 45.5231, lng: -122.6367, address: '18 NE 28th Ave, Portland, OR 97232', phone: '+1 971-380-0548', website: 'https://toosoonpdx.com', tier: 'cocktail_bar', metadata: { neighborhood: 'Kerns', esquire_top_50: true } },

  // Tier 3: Distillery Tasting Rooms (only open ones)
  { name: 'Bull Run Distillery', lat: 45.5311, lng: -122.6999, address: '2259 NW Quimby St, Portland, OR 97210', phone: '+1 503-224-3483', website: 'https://www.bullrundistillery.com', tier: 'distillery', metadata: { neighborhood: 'Slabtown', products: ['Oregon Single Malt'], hours: 'Fri-Sun 12-6pm' } },
  { name: 'New Deal Distillery', lat: 45.5144, lng: -122.6567, address: '900 SE Salmon St, Portland, OR 97214', phone: '+1 503-234-2513', website: 'https://newdealdistillery.com', tier: 'distillery', metadata: { neighborhood: 'Central Eastside', distillery_row: true, bottle_shop: true } },
  { name: 'Stone Barn Brandyworks', lat: 45.5013, lng: -122.6494, address: '3315 SE 19th Ave, Ste B, Portland, OR 97202', phone: '+1 503-341-2227', website: 'https://www.stonebarnbrandyworks.com', tier: 'distillery', metadata: { neighborhood: 'Brooklyn', products: ['Rye Whiskey', 'Fruit Brandies'] } },
  { name: 'Freeland Spirits', lat: 45.5330, lng: -122.7011, address: '2671 NW Vaughn St, Portland, OR 97210', phone: '+1 971-279-5692', website: 'https://freelandspirits.com', tier: 'distillery', metadata: { neighborhood: 'Slabtown', female_founded: true, products: ['Bourbon', 'Gin'] } },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrawlResult {
  bar: { name: string; menuUrl: string; website: string };
  whiskeys: {
    name: string;
    distillery?: string;
    type?: string;
    age?: number | null;
    abv?: number | null;
    price?: number | null;
    pour_size?: string;
    notes?: string;
  }[];
  scrapedAt: string;
  rawTextLength: number;
  error?: string;
}

interface WhiskeySeed {
  name: string;
  distillery: string | null;
  type: string;
  age: number | null;
  abv: number | null;
  description: string | null;
}

// ---------------------------------------------------------------------------
// Normalize + deduplicate whiskeys using Claude
// ---------------------------------------------------------------------------

async function normalizeWhiskeys(
  client: Anthropic,
  rawWhiskeys: { name: string; distillery?: string; type?: string; age?: number | null; abv?: number | null; notes?: string }[]
): Promise<WhiskeySeed[]> {
  if (rawWhiskeys.length === 0) return [];

  // Batch normalize via Claude
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: `Given these raw whiskey extractions from bar menus, normalize and deduplicate them.

For each unique whiskey, return:
- name: The canonical/correct full name (e.g., "Maker's Mark" not "Makers", "Lagavulin 16 Year" not "Lagavulin 16")
- distillery: The producing distillery
- type: One of: bourbon, scotch, irish, rye, japanese, canadian, single_malt, blended, other
- age: Integer age statement or null
- abv: ABV percentage or null
- description: A brief 1-sentence tasting note

Rules:
- Merge duplicates (e.g., "Buffalo Trace" appearing from 3 bars = 1 entry)
- Fix obvious misspellings
- Use standard type classifications (Islay/Speyside/Highland scotch = "scotch" or "single_malt")
- Return ONLY valid JSON, no markdown fences

Raw data:
${JSON.stringify(rawWhiskeys, null, 2)}

Return JSON: { "whiskeys": [{ "name": "...", "distillery": "...", "type": "...", "age": null, "abv": null, "description": "..." }] }`,
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
  } catch {
    console.error('Failed to parse normalization response');
  }

  return [];
}

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

function escSql(s: string | null): string {
  if (s === null) return 'NULL';
  return `'${s.replace(/'/g, "''")}'`;
}

function generateSeedSql(
  bars: BarSeed[],
  whiskeys: WhiskeySeed[],
  barWhiskeyLinks: { barName: string; whiskeyName: string; price: number | null; pourSize: string | null }[]
): string {
  let sql = `-- =============================================================================
-- findadram Portland seed data
-- Generated ${new Date().toISOString()} by scripts/generate-portland-seed.ts
-- =============================================================================

`;

  // Bar inserts
  sql += `-- BARS (${bars.length} Portland establishments)\n`;
  sql += `INSERT INTO bars (id, name, location, address, city, state, country, phone, website, metadata) VALUES\n`;

  const barIdMap = new Map<string, string>();
  const barRows: string[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const id = `'aaaaaaaa-pdx-0000-0000-${String(i + 1).padStart(12, '0')}'`;
    barIdMap.set(bar.name, id);

    barRows.push(`(
  ${id},
  ${escSql(bar.name)},
  ST_MakePoint(${bar.lng}, ${bar.lat})::geography,
  ${escSql(bar.address)},
  'Portland',
  'OR',
  'US',
  ${escSql(bar.phone)},
  ${escSql(bar.website)},
  ${escSql(JSON.stringify(bar.metadata))}
)`);
  }

  sql += barRows.join(',\n') + ';\n\n';

  // Whiskey inserts
  sql += `-- WHISKEYS (${whiskeys.length} unique whiskeys found in Portland)\n`;
  sql += `INSERT INTO whiskeys (id, name, distillery, region, country, type, age, abv, description) VALUES\n`;

  const whiskeyIdMap = new Map<string, string>();
  const whiskeyRows: string[] = [];

  for (let i = 0; i < whiskeys.length; i++) {
    const w = whiskeys[i];
    const id = `'bbbbbbbb-pdx-0000-0000-${String(i + 1).padStart(12, '0')}'`;
    whiskeyIdMap.set(w.name, id);

    // Infer country/region from type
    let country = 'US';
    let region: string | null = null;
    if (w.type === 'scotch' || w.type === 'single_malt' || w.type === 'blended') {
      country = 'GB';
      region = w.distillery ? null : 'Scotland'; // distillery often implies region
    } else if (w.type === 'irish') {
      country = 'IE';
      region = null;
    } else if (w.type === 'japanese') {
      country = 'JP';
      region = null;
    } else if (w.type === 'canadian') {
      country = 'CA';
      region = null;
    } else if (w.type === 'bourbon' || w.type === 'rye') {
      country = 'US';
      region = 'Kentucky'; // default, most are
    }

    whiskeyRows.push(`(
  ${id},
  ${escSql(w.name)},
  ${escSql(w.distillery)},
  ${escSql(region)},
  ${escSql(country)},
  ${escSql(w.type)},
  ${w.age ?? 'NULL'},
  ${w.abv ?? 'NULL'},
  ${escSql(w.description)}
)`);
  }

  sql += whiskeyRows.join(',\n') + ';\n\n';

  // Bar-whiskey links
  sql += `-- BAR_WHISKEYS (${barWhiskeyLinks.length} links)\n`;

  // Group by bar for readability
  const linksByBar = new Map<string, typeof barWhiskeyLinks>();
  for (const link of barWhiskeyLinks) {
    const existing = linksByBar.get(link.barName) || [];
    existing.push(link);
    linksByBar.set(link.barName, existing);
  }

  let linkIndex = 0;
  for (const [barName, links] of linksByBar) {
    const barId = barIdMap.get(barName);
    if (!barId) continue;

    sql += `\n-- ${barName} (${links.length} whiskeys)\n`;
    sql += `INSERT INTO bar_whiskeys (id, bar_id, whiskey_id, price, pour_size, available, notes) VALUES\n`;

    const linkRows: string[] = [];
    for (const link of links) {
      const whiskeyId = whiskeyIdMap.get(link.whiskeyName);
      if (!whiskeyId) continue;

      linkIndex++;
      const id = `'cccccccc-pdx-0000-0000-${String(linkIndex).padStart(12, '0')}'`;
      linkRows.push(`(${id}, ${barId}, ${whiskeyId}, ${link.price ?? 'NULL'}, ${escSql(link.pourSize)}, true, NULL)`);
    }

    if (linkRows.length > 0) {
      sql += linkRows.join(',\n') + ';\n';
    }
  }

  return sql;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.error('Set ANTHROPIC_API_KEY in .env.local');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  // Load trawl results
  const resultsPath = resolve(process.cwd(), 'scripts/trawl-results.json');
  let trawlResults: TrawlResult[];
  try {
    trawlResults = JSON.parse(readFileSync(resultsPath, 'utf-8'));
  } catch {
    console.error(`No trawl results found at ${resultsPath}`);
    console.error('Run: npx tsx scripts/trawl-portland.ts first');
    process.exit(1);
  }

  console.log(`Loaded trawl results: ${trawlResults.length} bars`);

  // Validate all bars are within Portland metro geofence
  const validBars = PORTLAND_BARS.filter((bar) => {
    const inBounds = isInPortlandMetro(bar.lat, bar.lng);
    if (!inBounds) {
      console.warn(`WARNING: ${bar.name} (${bar.lat}, ${bar.lng}) is OUTSIDE Portland metro bounds — skipping`);
    }
    return inBounds;
  });
  console.log(`${validBars.length}/${PORTLAND_BARS.length} bars pass geofence check`);

  // Collect all raw whiskeys
  const allRaw: { name: string; distillery?: string; type?: string; age?: number | null; abv?: number | null; notes?: string; barName: string; price?: number | null; pourSize?: string }[] = [];

  for (const result of trawlResults) {
    if (result.error) continue;
    for (const w of result.whiskeys) {
      allRaw.push({
        ...w,
        barName: result.bar.name,
        price: w.price,
        pourSize: w.pour_size,
      });
    }
  }

  console.log(`Total raw whiskey entries: ${allRaw.length}`);

  // Normalize + dedup via Claude
  console.log('Normalizing whiskeys via Claude Sonnet...');
  const normalized = await normalizeWhiskeys(
    client,
    allRaw.map((w) => ({ name: w.name, distillery: w.distillery, type: w.type, age: w.age, abv: w.abv, notes: w.notes }))
  );
  console.log(`Normalized to ${normalized.length} unique whiskeys`);

  // Build bar-whiskey links
  // For each raw whiskey, find its normalized match and link to the bar
  const links: { barName: string; whiskeyName: string; price: number | null; pourSize: string | null }[] = [];

  for (const raw of allRaw) {
    // Find best match in normalized list
    const normalizedName = raw.name.toLowerCase().trim();
    let bestMatch = normalized[0];
    let bestScore = 0;

    for (const n of normalized) {
      const nLower = n.name.toLowerCase();
      if (nLower === normalizedName || normalizedName.includes(nLower) || nLower.includes(normalizedName)) {
        bestMatch = n;
        bestScore = 1;
        break;
      }
      // Simple word overlap score
      const rawWords = new Set(normalizedName.split(/\s+/));
      const nWords = nLower.split(/\s+/);
      const overlap = nWords.filter((w) => rawWords.has(w)).length;
      const score = overlap / Math.max(rawWords.size, nWords.length);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = n;
      }
    }

    if (bestScore > 0.3 && bestMatch) {
      links.push({
        barName: raw.barName,
        whiskeyName: bestMatch.name,
        price: raw.price ?? null,
        pourSize: raw.pourSize ?? null,
      });
    }
  }

  console.log(`Generated ${links.length} bar-whiskey links`);

  // Generate SQL (only geofenced bars)
  const sql = generateSeedSql(validBars, normalized, links);
  const outPath = resolve(process.cwd(), 'supabase/seed-portland.sql');
  writeFileSync(outPath, sql);
  console.log(`\nPortland seed SQL written to ${outPath}`);
  console.log(`  ${PORTLAND_BARS.length} bars`);
  console.log(`  ${normalized.length} whiskeys`);
  console.log(`  ${links.length} bar-whiskey links`);
}

main().catch(console.error);

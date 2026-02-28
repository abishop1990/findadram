/**
 * Multi-source trawl orchestrator — FULLY DYNAMIC.
 *
 * Phase 1: Discover bars/restaurants via Google Places across the Portland/Vancouver metro
 * Phase 2: Load all existing bars from Supabase
 * Phase 3: For every bar, hit Google Photos → Reviews → Website (Puppeteer + fetch)
 * Phase 4: Write results to Supabase (whiskeys + bar_whiskeys)
 *
 * Usage: npx tsx scripts/trawl-all-sources.ts
 *        npx tsx scripts/trawl-all-sources.ts --skip-discovery   # skip Phase 1, trawl DB bars only
 *        npx tsx scripts/trawl-all-sources.ts --discovery-only    # only discover, don't trawl
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { normalizeWhiskeyName, similarityRatio } from '../src/lib/trawler/normalize';

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

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ANTHROPIC_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const writeKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const sbWriteHeaders = {
  apikey: writeKey!,
  Authorization: `Bearer ${writeKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};
const sbReadHeaders = {
  apikey: SUPABASE_ANON_KEY!,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Portland / Vancouver metro geofence
// ---------------------------------------------------------------------------

const METRO_BOUNDS = {
  north: 45.75, // north Vancouver WA
  south: 45.35, // south of Oregon City
  east: -122.40,
  west: -122.90,
};

function isInMetro(lat: number, lng: number): boolean {
  return (
    lat >= METRO_BOUNDS.south &&
    lat <= METRO_BOUNDS.north &&
    lng >= METRO_BOUNDS.west &&
    lng <= METRO_BOUNDS.east
  );
}

// Search grid centers — Portland downtown, SE, NE, NW, Vancouver WA, Beaverton, Lake Oswego
const SEARCH_CENTERS = [
  { lat: 45.5152, lng: -122.6784, label: 'Downtown Portland' },
  { lat: 45.5051, lng: -122.6157, label: 'SE Portland' },
  { lat: 45.5585, lng: -122.6384, label: 'NE Portland' },
  { lat: 45.5350, lng: -122.7000, label: 'NW Portland / Pearl' },
  { lat: 45.6387, lng: -122.6615, label: 'Vancouver WA' },
  { lat: 45.4871, lng: -122.8037, label: 'Beaverton' },
  { lat: 45.4207, lng: -122.6706, label: 'Lake Oswego' },
  { lat: 45.4520, lng: -122.7710, label: 'Tigard' },
  { lat: 45.5001, lng: -122.5710, label: 'Milwaukie / SE' },
];

// Discovery queries — cast the widest net
const DISCOVERY_QUERIES = [
  'whiskey bar',
  'bourbon bar',
  'scotch bar',
  'cocktail bar',
  'speakeasy',
  'steakhouse',
  'pub with whiskey',
  'gastropub',
  'Irish pub',
  'craft cocktail lounge',
  'restaurant bar spirits',
  'hotel bar',
  'distillery tasting room',
  'wine bar spirits',
  'lounge bar',
  'dive bar',
  'sports bar whiskey',
  'fine dining restaurant',
  'upscale restaurant bar',
  'brewery taproom spirits',
];

// Google Places types to exclude
const EXCLUDED_TYPES = new Set([
  'liquor_store',
  'grocery_store',
  'supermarket',
  'convenience_store',
  'gas_station',
  'department_store',
  'shopping_mall',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbBar {
  id: string;
  name: string;
  website: string | null;
  google_place_id: string | null;
  location: string | null;
  lat?: number;
  lng?: number;
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

interface SourceResult {
  source: 'google_photo' | 'google_review' | 'website';
  whiskeys: ExtractedWhiskey[];
  confidence: number;
  details?: string;
}

interface BarResult {
  barId: string;
  barName: string;
  sources: SourceResult[];
  mergedWhiskeys: ExtractedWhiskey[];
  totalFound: number;
  linkedToSupabase: number;
}

// ---------------------------------------------------------------------------
// Phase 1: Dynamic discovery via Google Places
// ---------------------------------------------------------------------------

async function discoverBars(): Promise<number> {
  if (!GOOGLE_KEY) {
    console.log('  SKIPPED — no GOOGLE_PLACES_API_KEY');
    return 0;
  }

  const discovered = new Map<string, {
    placeId: string;
    name: string;
    lat: number;
    lng: number;
    address: string;
    website: string | null;
    phone: string | null;
    rating: number | null;
    reviewCount: number | null;
    types: string[];
    businessStatus: string;
  }>();

  // Load existing bars to dedup
  const existingBars = await loadBarsFromDB();
  const existingPlaceIds = new Set(existingBars.filter((b) => b.google_place_id).map((b) => b.google_place_id));
  const existingNames = new Set(existingBars.map((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

  let searchCount = 0;

  for (const query of DISCOVERY_QUERIES) {
    for (const center of SEARCH_CENTERS) {
      searchCount++;
      process.stdout.write(`  [${searchCount}] "${query}" @ ${center.label}...`);

      try {
        const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_KEY,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.websiteUri,places.nationalPhoneNumber,places.types',
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias: {
              circle: {
                center: { latitude: center.lat, longitude: center.lng },
                radius: 15000,
              },
            },
            maxResultCount: 20,
          }),
        });

        if (!resp.ok) {
          console.log(` API error ${resp.status}`);
          continue;
        }

        const data = await resp.json();
        const places = data.places || [];
        let newCount = 0;

        for (const place of places) {
          const placeId = place.id;
          if (!placeId || discovered.has(placeId) || existingPlaceIds.has(placeId)) continue;

          const lat = place.location?.latitude;
          const lng = place.location?.longitude;
          if (!lat || !lng || !isInMetro(lat, lng)) continue;
          if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;

          const placeTypes: string[] = place.types || [];
          if (placeTypes.some((t: string) => EXCLUDED_TYPES.has(t))) continue;

          const name = place.displayName?.text || '';
          const nameNorm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (existingNames.has(nameNorm)) continue;

          discovered.set(placeId, {
            placeId,
            name,
            lat,
            lng,
            address: place.formattedAddress || '',
            website: place.websiteUri || null,
            phone: place.nationalPhoneNumber || null,
            rating: place.rating || null,
            reviewCount: place.userRatingCount || null,
            types: placeTypes,
            businessStatus: place.businessStatus || 'UNKNOWN',
          });
          newCount++;
        }

        console.log(` ${places.length} results, ${newCount} new`);
        await sleep(300);
      } catch (err) {
        console.log(` ERROR: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Insert discovered bars into Supabase
  console.log(`\n  Discovered ${discovered.size} new venues. Inserting into Supabase...\n`);
  let inserted = 0;

  for (const bar of discovered.values()) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/bars`, {
        method: 'POST',
        headers: sbWriteHeaders,
        body: JSON.stringify({
          name: bar.name,
          location: `SRID=4326;POINT(${bar.lng} ${bar.lat})`,
          address: bar.address || null,
          city: bar.lat >= 45.58 ? 'Vancouver' : 'Portland',
          state: bar.lat >= 45.58 ? 'WA' : 'OR',
          country: 'US',
          phone: bar.phone || null,
          website: bar.website || null,
          google_place_id: bar.placeId,
          metadata: {
            google_rating: bar.rating,
            google_review_count: bar.reviewCount,
            google_business_status: bar.businessStatus,
            google_types: bar.types,
            discovered_via: 'trawl_all_sources',
            discovered_at: new Date().toISOString(),
          },
        }),
      });
      if (resp.ok) {
        inserted++;
        console.log(`    + ${bar.name} (${bar.address})`);
      } else {
        const errText = await resp.text().catch(() => '');
        if (inserted === 0 && errText) {
          console.log(`    INSERT FAILED (${resp.status}): ${errText.slice(0, 200)}`);
        }
      }
    } catch (err) {
      console.log(`    INSERT ERROR: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(100);
  }

  console.log(`\n  Inserted ${inserted}/${discovered.size} new bars\n`);
  return inserted;
}

// ---------------------------------------------------------------------------
// Phase 2: Load bars from Supabase
// ---------------------------------------------------------------------------

async function loadBarsFromDB(): Promise<DbBar[]> {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/bars?select=id,name,website,google_place_id,location&or=(state.eq.OR,state.eq.WA)`,
    { headers: sbReadHeaders }
  );
  if (!resp.ok) throw new Error(`Failed to load bars: ${resp.status}`);
  return resp.json();
}

// ---------------------------------------------------------------------------
// Supabase write helpers
// ---------------------------------------------------------------------------

async function getExistingWhiskeys(): Promise<Array<{ id: string; name: string }>> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys?select=id,name`, {
    headers: sbReadHeaders,
  });
  return resp.json();
}

async function findOrCreateWhiskey(
  w: ExtractedWhiskey,
  existing: Array<{ id: string; name: string }>
): Promise<string | null> {
  const normalized = normalizeWhiskeyName(w.name);
  if (!normalized) return null;

  // Tier 1: exact normalized match
  const exactMatch = existing.find(
    (e) => normalizeWhiskeyName(e.name) === normalized
  );
  if (exactMatch) return exactMatch.id;

  // Tier 2: fuzzy match (catches typos, minor OCR errors)
  const fuzzyMatch = existing.find(
    (e) => similarityRatio(w.name, e.name) >= 0.85
  );
  if (fuzzyMatch) return fuzzyMatch.id;

  // No match — create new whiskey
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys`, {
    method: 'POST',
    headers: sbWriteHeaders,
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
  sourceType: string,
  confidence: number
): Promise<boolean> {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bar_whiskeys`, {
    method: 'POST',
    headers: {
      ...sbWriteHeaders,
      Prefer: 'return=minimal,resolution=merge-duplicates',
    },
    body: JSON.stringify({
      bar_id: barId,
      whiskey_id: whiskeyId,
      price: w.price || null,
      pour_size: w.pour_size || null,
      available: true,
      notes: w.notes || null,
      source_type: sourceType,
      confidence,
      is_stale: false,
    }),
  });
  return resp.ok;
}

// ---------------------------------------------------------------------------
// Google Places: photos + reviews
// ---------------------------------------------------------------------------

async function getPlaceIdForBar(bar: DbBar): Promise<string | null> {
  if (bar.google_place_id) return bar.google_place_id;
  if (!GOOGLE_KEY) return null;

  // Try to find via name search
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify({
      textQuery: `${bar.name} Portland OR`,
      locationBias: {
        circle: {
          center: { latitude: 45.52, longitude: -122.67 },
          radius: 30000,
        },
      },
      maxResultCount: 1,
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  const placeId = data.places?.[0]?.id ?? null;

  // Cache the place ID back to Supabase
  if (placeId) {
    await fetch(`${SUPABASE_URL}/rest/v1/bars?id=eq.${bar.id}`, {
      method: 'PATCH',
      headers: sbWriteHeaders,
      body: JSON.stringify({ google_place_id: placeId }),
    }).catch(() => {});
  }

  return placeId;
}

async function fetchPlacePhotosAndReviews(placeId: string): Promise<{
  photos: Array<{ name: string; authorAttributions?: Array<{ displayName: string }> }>;
  reviews: Array<{ rating: number; text?: { text: string }; publishTime?: string }>;
}> {
  if (!GOOGLE_KEY) return { photos: [], reviews: [] };

  const resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'photos,reviews',
    },
  });

  if (!resp.ok) return { photos: [], reviews: [] };
  const data = await resp.json();
  return { photos: data.photos ?? [], reviews: data.reviews ?? [] };
}

async function downloadPhotoAsBase64(
  photoName: string
): Promise<{ base64: string; mimeType: string } | null> {
  if (!GOOGLE_KEY) return null;

  const uriResp = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&key=${GOOGLE_KEY}&skipHttpRedirect=true`
  );
  if (!uriResp.ok) return null;
  const uriData = await uriResp.json();
  const photoUri: string | undefined = uriData.photoUri;
  if (!photoUri) return null;

  const imgResp = await fetch(photoUri);
  if (!imgResp.ok) return null;

  // Detect actual mime type from response headers — fixes the PNG-as-JPEG bug
  const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
  const mimeType = contentType.split(';')[0].trim();

  const buffer = Buffer.from(await imgResp.arrayBuffer());
  return { base64: buffer.toString('base64'), mimeType };
}

// ---------------------------------------------------------------------------
// Claude extraction
// ---------------------------------------------------------------------------

function toClaudeMime(
  mime: string
): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  if (mime.includes('png')) return 'image/png';
  if (mime.includes('gif')) return 'image/gif';
  if (mime.includes('webp')) return 'image/webp';
  return 'image/jpeg';
}

async function classifyPhoto(
  client: Anthropic,
  base64: string,
  mimeType: string
): Promise<{ isUseful: boolean; photoType: string; description: string }> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: toClaudeMime(mimeType), data: base64 },
          },
          {
            type: 'text',
            text: `Classify this photo from a bar/restaurant. Is it useful for identifying whiskey/spirits?

Categories:
- "menu": A printed/displayed menu, drink list, spirits list, or chalkboard menu
- "shelf": A back bar shelf, bottle display, or liquor wall
- "bottles": A close-up of bottles or bottle collection
- "irrelevant": Food, people, decor, exterior, or anything without identifiable spirits

Respond with JSON only: {"isUseful": true/false, "photoType": "menu"|"shelf"|"bottles"|"irrelevant", "description": "brief description"}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {
    /* fall through */
  }
  return { isUseful: false, photoType: 'irrelevant', description: 'Classification failed' };
}

async function extractWhiskeysFromPhoto(
  client: Anthropic,
  base64: string,
  mimeType: string,
  barName: string
): Promise<ExtractedWhiskey[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: toClaudeMime(mimeType), data: base64 },
          },
          {
            type: 'text',
            text: `Extract ALL whiskey/whisky/bourbon/scotch/rye/spirits visible in this image from "${barName}".

Rules:
- Extract individual spirit names, NOT cocktails
- For menus: read prices, age statements, pour sizes carefully
- For shelf/backbar photos: identify every readable bottle label
- Be thorough — extract every single spirit you can identify

Name formatting — CRITICAL:
- Put AGE as a number in the "age" field, NOT in the name. "Macallan 12 Year Old" → name: "Macallan 12", age: 12
- Put ABV as a number in the "abv" field, NOT in the name. "Ardbeg 10 46%" → name: "Ardbeg 10", abv: 46
- Strip legal suffixes: remove "Kentucky Straight Bourbon Whiskey", "Single Malt Scotch Whisky", etc.
- Use canonical names: "The Macallan" → "Macallan", "The GlenDronach" → "GlenDronach"
- Keep expression names: "Ardbeg Uigeadail", "Lagavulin 16", "Buffalo Trace Single Barrel"
- Do NOT put proof in name: "Wild Turkey 101" is correct (product name), but "Maker's Mark 90 Proof" → name: "Maker's Mark"

- Return ONLY valid JSON, no markdown:
{"whiskeys": [{"name": "...", "distillery": "...", "type": "bourbon|scotch|irish|rye|japanese|canadian|single_malt|blended|other", "age": null, "abv": null, "price": null, "pour_size": "...", "notes": "..."}]}
If no spirits are identifiable, return {"whiskeys": []}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]).whiskeys || [];
  } catch {
    /* fall through */
  }
  return [];
}

async function extractWhiskeysFromReviews(
  client: Anthropic,
  reviews: Array<{ rating: number; text?: { text: string }; publishTime?: string }>,
  barName: string
): Promise<ExtractedWhiskey[]> {
  const reviewTexts = reviews
    .filter((r) => r.text?.text)
    .map((r) => `[${r.rating}/5, ${r.publishTime?.split('T')[0] || '?'}] ${r.text!.text}`)
    .join('\n\n');

  if (reviewTexts.length < 50) return [];

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Extract specific whiskey/bourbon/scotch/rye brand names mentioned in these Google Reviews for "${barName}".

Only extract SPECIFIC brand/expression names (e.g., "Lagavulin 16", "Buffalo Trace"), NOT generic references like "great whiskey selection".

Reviews:
${reviewTexts.slice(0, 10000)}

Return JSON only: {"whiskeys_mentioned": [{"name": "...", "type": "bourbon|scotch|irish|rye|japanese|canadian|other", "context": "brief quote"}]}
If no specific brands mentioned, return {"whiskeys_mentioned": []}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const mentioned = JSON.parse(match[0]).whiskeys_mentioned || [];
      return mentioned.map((w: { name: string; type?: string; context?: string }) => ({
        name: w.name,
        type: w.type || 'other',
        notes: w.context ? `Mentioned in review: "${w.context}"` : undefined,
      }));
    }
  } catch {
    /* fall through */
  }
  return [];
}

// ---------------------------------------------------------------------------
// Website scraping (Puppeteer + fetch fallback)
// ---------------------------------------------------------------------------

async function scrapeWebsite(
  client: Anthropic,
  barName: string,
  website: string
): Promise<ExtractedWhiskey[]> {
  let pageText: string;

  // Try Puppeteer first for JS-rendered content
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.goto(website, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2000));

      // Also look for menu/drinks links and follow them
      const menuLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const menuKeywords = /menu|drinks?|spirits?|whisk|bourbon|cocktails?|beverage/i;
        for (const link of links) {
          const text = (link.textContent || '') + ' ' + (link.href || '');
          if (menuKeywords.test(text) && link.href && link.href.startsWith('http')) {
            return link.href;
          }
        }
        return null;
      });

      // Get text from current page
      pageText = await page.evaluate(() => {
        document
          .querySelectorAll('script, style, nav, footer, header, noscript')
          .forEach((el) => el.remove());
        return document.body?.innerText || '';
      });

      // If we found a menu link, also scrape that page
      if (menuLink && menuLink !== website) {
        try {
          await page.goto(menuLink, { waitUntil: 'networkidle2', timeout: 20000 });
          await new Promise((r) => setTimeout(r, 2000));
          const menuText = await page.evaluate(() => {
            document
              .querySelectorAll('script, style, nav, footer, header, noscript')
              .forEach((el) => el.remove());
            return document.body?.innerText || '';
          });
          pageText += '\n\n--- MENU PAGE ---\n\n' + menuText;
        } catch {
          // Menu page failed, use homepage text
        }
      }
    } finally {
      await browser.close();
    }
  } catch {
    // Puppeteer not available — fall back to fetch
    try {
      const resp = await fetch(website, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!resp.ok) return [];
      const html = await resp.text();
      pageText = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } catch {
      return [];
    }
  }

  if (pageText.length < 100) return [];

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: `You are a whiskey/spirits menu extraction expert. Given text from a bar or restaurant website, extract ALL individual spirit pours.

Rules:
- Extract individual spirit pours — NOT cocktails or mixed drinks
- Include bourbon, scotch, Irish whiskey, rye, Japanese whisky, Canadian whisky, single malt, blended, and other spirits
- Parse prices if available (convert to numeric USD)
- Identify distillery from context when possible
- Be thorough — extract every single spirit you can find
- If no spirits are found, return an empty array
- Return ONLY valid JSON, no markdown fences

Name formatting — CRITICAL:
- Put AGE as a number in the "age" field, NOT in the name. "Macallan 12 Year Old" → name: "Macallan 12", age: 12
- Put ABV as a number in the "abv" field, NOT in the name. "Ardbeg 10 46%" → name: "Ardbeg 10", abv: 46
- Strip legal suffixes: remove "Kentucky Straight Bourbon Whiskey", "Single Malt Scotch Whisky", etc.
- Use canonical names: "The Macallan" → "Macallan", "The GlenDronach" → "GlenDronach"
- Keep expression names: "Ardbeg Uigeadail", "Lagavulin 16", "Buffalo Trace Single Barrel"
- Do NOT put proof in name: "Wild Turkey 101" is correct (product name), but "Maker's Mark 90 Proof" → name: "Maker's Mark"`,
    messages: [
      {
        role: 'user',
        content: `Extract all whiskey/spirits from this website text for "${barName}":

${pageText.slice(0, 25000)}

Return JSON: {"whiskeys": [{"name": "...", "distillery": "...", "type": "...", "age": null, "abv": null, "price": null, "pour_size": "...", "notes": "..."}]}`,
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]).whiskeys || [];
  } catch {
    /* fall through */
  }
  return [];
}

// ---------------------------------------------------------------------------
// Website image extraction (for menu images embedded in pages)
// ---------------------------------------------------------------------------

async function scrapeWebsiteImages(
  client: Anthropic,
  barName: string,
  website: string
): Promise<ExtractedWhiskey[]> {
  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      await page.goto(website, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise((r) => setTimeout(r, 2000));

      // Find large images that might be menus
      const imageUrls = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs
          .filter((img) => {
            const src = img.src || '';
            const alt = (img.alt || '').toLowerCase();
            const width = img.naturalWidth || img.width || 0;
            const height = img.naturalHeight || img.height || 0;
            // Large images or images with menu-related alt text
            return (
              src.startsWith('http') &&
              ((width > 400 && height > 400) ||
                /menu|spirit|whiskey|bourbon|drink|list|infirmary/i.test(alt) ||
                /menu|spirit|whiskey|bourbon|drink|list/i.test(src))
            );
          })
          .map((img) => img.src);
      });

      if (imageUrls.length === 0) return [];

      const allWhiskeys: ExtractedWhiskey[] = [];

      for (const imgUrl of imageUrls.slice(0, 5)) {
        try {
          const imgResp = await fetch(imgUrl);
          if (!imgResp.ok) continue;
          const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
          const buffer = Buffer.from(await imgResp.arrayBuffer());
          const base64 = buffer.toString('base64');

          // Classify first
          const classification = await classifyPhoto(client, base64, contentType);
          if (!classification.isUseful) continue;

          console.log(`      Website image: ${classification.photoType} (${classification.description})`);
          const whiskeys = await extractWhiskeysFromPhoto(client, base64, contentType, barName);
          allWhiskeys.push(...whiskeys);
          await sleep(1000);
        } catch {
          // Skip failed images
        }
      }

      return allWhiskeys;
    } finally {
      await browser.close();
    }
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Deduplication
// ---------------------------------------------------------------------------

function deduplicateWhiskeys(sources: SourceResult[]): ExtractedWhiskey[] {
  const seen = new Map<string, { whiskey: ExtractedWhiskey; confidence: number }>();

  for (const source of sources) {
    for (const w of source.whiskeys) {
      if (!w.name) continue;
      const normalized = normalizeWhiskeyName(w.name);
      if (!normalized) continue;

      // Tier 1: exact normalized match
      const exact = seen.get(normalized);
      if (exact) {
        if (source.confidence > exact.confidence) {
          seen.set(normalized, { whiskey: w, confidence: source.confidence });
        }
        continue;
      }

      // Tier 2: fuzzy match against existing entries (catches typos, minor variations)
      let matched = false;
      for (const [key, entry] of seen) {
        if (similarityRatio(normalized, key) >= 0.85) {
          if (source.confidence > entry.confidence) {
            seen.delete(key);
            seen.set(normalized, { whiskey: w, confidence: source.confidence });
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        seen.set(normalized, { whiskey: w, confidence: source.confidence });
      }
    }
  }

  return Array.from(seen.values()).map((v) => v.whiskey);
}

// ---------------------------------------------------------------------------
// Process a single bar through all sources
// ---------------------------------------------------------------------------

async function processBar(
  client: Anthropic,
  bar: DbBar,
  existingWhiskeys: Array<{ id: string; name: string }>
): Promise<BarResult> {
  const sources: SourceResult[] = [];

  // Source 1: Google Photos + Reviews
  if (GOOGLE_KEY) {
    try {
      const placeId = await getPlaceIdForBar(bar);
      if (placeId) {
        await sleep(500);
        const { photos, reviews } = await fetchPlacePhotosAndReviews(placeId);

        // Photos (up to 10)
        if (photos.length > 0) {
          const photoWhiskeys: ExtractedWhiskey[] = [];
          let menuCount = 0;
          let shelfCount = 0;

          for (const photo of photos.slice(0, 10)) {
            const downloaded = await downloadPhotoAsBase64(photo.name);
            if (!downloaded) continue;

            const classification = await classifyPhoto(
              client,
              downloaded.base64,
              downloaded.mimeType
            );

            if (classification.isUseful) {
              const author = photo.authorAttributions?.[0]?.displayName || 'unknown';
              console.log(
                `      Photo: ${classification.photoType} (${classification.description}) by ${author}`
              );

              const whiskeys = await extractWhiskeysFromPhoto(
                client,
                downloaded.base64,
                downloaded.mimeType,
                bar.name
              );
              photoWhiskeys.push(...whiskeys);

              if (classification.photoType === 'menu') menuCount++;
              else shelfCount++;

              await sleep(1000);
            }
            await sleep(500);
          }

          if (photoWhiskeys.length > 0) {
            sources.push({
              source: 'google_photo',
              whiskeys: photoWhiskeys,
              confidence: menuCount > 0 ? 0.75 : 0.65,
              details: `${menuCount} menu + ${shelfCount} shelf photos, ${photoWhiskeys.length} spirits`,
            });
          }
        }

        // Reviews
        if (reviews.length > 0) {
          const reviewWhiskeys = await extractWhiskeysFromReviews(client, reviews, bar.name);
          if (reviewWhiskeys.length > 0) {
            sources.push({
              source: 'google_review',
              whiskeys: reviewWhiskeys,
              confidence: 0.5,
              details: `${reviews.length} reviews, ${reviewWhiskeys.length} mentions`,
            });
          }
        }
      }
    } catch (err) {
      console.log(`    Google error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Source 2: Website scrape (text)
  if (bar.website) {
    try {
      const websiteWhiskeys = await scrapeWebsite(client, bar.name, bar.website);
      if (websiteWhiskeys.length > 0) {
        sources.push({
          source: 'website',
          whiskeys: websiteWhiskeys,
          confidence: 0.8,
          details: `${websiteWhiskeys.length} spirits from website text`,
        });
      }

      // Source 3: Website images (menu photos embedded in pages)
      const imageWhiskeys = await scrapeWebsiteImages(client, bar.name, bar.website);
      if (imageWhiskeys.length > 0) {
        sources.push({
          source: 'website' as const,
          whiskeys: imageWhiskeys,
          confidence: 0.75,
          details: `${imageWhiskeys.length} spirits from website menu images`,
        });
      }
    } catch (err) {
      console.log(`    Website error: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Deduplicate
  const merged = deduplicateWhiskeys(sources);

  // Write to Supabase
  let linked = 0;
  for (const w of merged) {
    if (!w.name) continue;
    const whiskeyId = await findOrCreateWhiskey(w, existingWhiskeys);
    if (!whiskeyId) continue;

    // Use the highest confidence source for this whiskey
    const wNorm = normalizeWhiskeyName(w.name);
    const bestSource = sources.find((s) =>
      s.whiskeys.some(
        (sw) => normalizeWhiskeyName(sw.name) === wNorm
      )
    );
    const sourceType =
      bestSource?.source === 'google_photo'
        ? 'google_photo'
        : bestSource?.source === 'google_review'
          ? 'google_review'
          : 'website_trawl';

    const ok = await linkWhiskeyToBar(bar.id, whiskeyId, w, sourceType, bestSource?.confidence ?? 0.5);
    if (ok) linked++;
  }

  return {
    barId: bar.id,
    barName: bar.name,
    sources,
    mergedWhiskeys: merged,
    totalFound: merged.length,
    linkedToSupabase: linked,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();
  const skipDiscovery = process.argv.includes('--skip-discovery');
  const discoveryOnly = process.argv.includes('--discovery-only');
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });

  console.log('=== Multi-Source Trawl — Portland/Vancouver Metro ===\n');
  console.log(`Google Places: ${GOOGLE_KEY ? 'enabled' : 'DISABLED (no API key)'}`);

  let hasPuppeteer = false;
  try {
    await import('puppeteer');
    hasPuppeteer = true;
  } catch {
    /* not available */
  }
  console.log(`Puppeteer: ${hasPuppeteer ? 'available' : 'not available (fetch fallback)'}\n`);

  // Phase 1: Discovery
  if (!skipDiscovery && GOOGLE_KEY) {
    console.log('=== PHASE 1: Discovering bars via Google Places ===\n');
    const newBars = await discoverBars();
    console.log(`Discovery complete: ${newBars} new bars added\n`);
  } else if (!GOOGLE_KEY) {
    console.log('Skipping discovery (no GOOGLE_PLACES_API_KEY)\n');
  } else {
    console.log('Skipping discovery (--skip-discovery)\n');
  }

  if (discoveryOnly) {
    console.log('--discovery-only flag set, stopping here.');
    return;
  }

  // Phase 2: Load all bars
  console.log('=== PHASE 2: Loading bars from Supabase ===\n');
  const bars = await loadBarsFromDB();
  console.log(`Loaded ${bars.length} bars from database\n`);

  // Load existing whiskeys for dedup
  const existingWhiskeys = await getExistingWhiskeys();
  console.log(`${existingWhiskeys.length} existing whiskeys in DB\n`);

  // Phase 3: Trawl all bars
  console.log(`=== PHASE 3: Trawling ${bars.length} bars (all sources) ===\n`);
  const results: BarResult[] = [];

  const BAR_TIMEOUT_MS = 90_000; // 90s max per bar — prevents any single bar from blocking

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    console.log(`[${i + 1}/${bars.length}] ${bar.name}`);

    try {
      const result = await Promise.race([
        processBar(client, bar, existingWhiskeys),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Bar timeout (90s)')), BAR_TIMEOUT_MS)
        ),
      ]);
      results.push(result);

      if (result.sources.length === 0) {
        console.log(`    No data found`);
      } else {
        for (const s of result.sources) {
          console.log(`    ${s.source}: ${s.whiskeys.length} spirits (${s.details})`);
        }
        console.log(`    TOTAL: ${result.totalFound} whiskeys → ${result.linkedToSupabase} linked to Supabase`);
      }
    } catch (err) {
      console.log(`    SKIPPED: ${err instanceof Error ? err.message : err}`);
      results.push({
        barId: bar.id,
        barName: bar.name,
        sources: [],
        mergedWhiskeys: [],
        totalFound: 0,
        linkedToSupabase: 0,
      });
    }

    console.log('');

    if (i < bars.length - 1) {
      await sleep(1000); // 1s between bars (reduced from 2s)
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalMerged = results.reduce((sum, r) => sum + r.totalFound, 0);
  const totalLinked = results.reduce((sum, r) => sum + r.linkedToSupabase, 0);
  const barsWithData = results.filter((r) => r.totalFound > 0).length;

  const bySource = {
    google_photo: results.reduce(
      (sum, r) =>
        sum +
        r.sources
          .filter((s) => s.source === 'google_photo')
          .reduce((s2, sr) => s2 + sr.whiskeys.length, 0),
      0
    ),
    google_review: results.reduce(
      (sum, r) =>
        sum +
        r.sources
          .filter((s) => s.source === 'google_review')
          .reduce((s2, sr) => s2 + sr.whiskeys.length, 0),
      0
    ),
    website: results.reduce(
      (sum, r) =>
        sum +
        r.sources
          .filter((s) => s.source === 'website')
          .reduce((s2, sr) => s2 + sr.whiskeys.length, 0),
      0
    ),
  };

  console.log('========== SUMMARY ==========');
  console.log(`Time: ${elapsed}s`);
  console.log(`Bars processed: ${bars.length}`);
  console.log(`Bars with data: ${barsWithData}/${bars.length}`);
  console.log(`Total whiskeys found (deduplicated): ${totalMerged}`);
  console.log(`Total linked to Supabase: ${totalLinked}`);
  console.log('');
  console.log('By source (before dedup):');
  console.log(`  Google Photos: ${bySource.google_photo}`);
  console.log(`  Google Reviews: ${bySource.google_review}`);
  console.log(`  Website scrape: ${bySource.website}`);
  console.log('');

  const sorted = [...results].sort((a, b) => b.totalFound - a.totalFound);
  console.log('Top bars by whiskey count:');
  for (const r of sorted.slice(0, 15)) {
    if (r.totalFound === 0) break;
    const sourceSummary = r.sources.map((s) => `${s.source}:${s.whiskeys.length}`).join(', ');
    console.log(`  ${r.bar.name}: ${r.totalFound} (${sourceSummary})`);
  }

  // Whiskeys in DB after this run
  const finalWhiskeys = await getExistingWhiskeys();
  console.log(`\nWhiskeys in DB: ${existingWhiskeys.length} → ${finalWhiskeys.length}`);

  // Write results
  const outPath = resolve(process.cwd(), 'scripts/trawl-results-v2.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Results written to ${outPath}`);
}

main().catch(console.error);

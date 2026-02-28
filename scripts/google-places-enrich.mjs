/**
 * Google Places enrichment + discovery + photo OCR pipeline.
 *
 * 1. Validates/enriches all existing Portland bars against Google Places
 * 2. Discovers new whiskey bars via search queries
 * 3. Downloads photos and uses Claude Vision to extract whiskey data from menu photos
 * 4. Parses reviews for whiskey mentions
 *
 * Usage: node scripts/google-places-enrich.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
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

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_KEY || !ANTHROPIC_KEY || !SUPABASE_URL) {
  console.error('Missing env vars (GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY, SUPABASE)');
  process.exit(1);
}

const writeKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
const sbWriteHeaders = { 'apikey': writeKey, 'Authorization': `Bearer ${writeKey}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };
const sbReadHeaders = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` };

// Portland metro bounding box
const PORTLAND_BOUNDS = { north: 45.70, south: 45.35, east: -122.40, west: -122.90 };

function isInPortland(lat, lng) {
  return lat >= PORTLAND_BOUNDS.south && lat <= PORTLAND_BOUNDS.north &&
         lng >= PORTLAND_BOUNDS.west && lng <= PORTLAND_BOUNDS.east;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Google Places API helpers
// ---------------------------------------------------------------------------

async function searchPlaces(query, maxResults = 5) {
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours',
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: 45.5152, longitude: -122.6784 },
          radius: 30000,
        },
      },
      maxResultCount: maxResults,
    }),
  });
  if (!resp.ok) throw new Error(`Places search failed: ${resp.status}`);
  const data = await resp.json();
  return data.places || [];
}

async function getPlaceDetails(placeId) {
  const resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,businessStatus,websiteUri,nationalPhoneNumber,photos,reviews,regularOpeningHours',
    },
  });
  if (!resp.ok) throw new Error(`Place details failed: ${resp.status}`);
  return resp.json();
}

async function getPhotoUri(photoName, maxWidth = 1200) {
  const resp = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_KEY}&skipHttpRedirect=true`);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.photoUri || null;
}

async function downloadPhotoAsBase64(photoUri) {
  const resp = await fetch(photoUri);
  if (!resp.ok) return null;
  const buffer = Buffer.from(await resp.arrayBuffer());
  return buffer.toString('base64');
}

// ---------------------------------------------------------------------------
// Claude Vision — classify and extract from photos
// ---------------------------------------------------------------------------

async function classifyPhoto(base64) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: 'Is this a photo of a menu, spirits list, whiskey list, bottle shelf/wall, or drink menu at a bar? Answer with JSON: {"is_menu": true/false, "description": "brief description of what the image shows"}' },
        ],
      }],
    }),
  });
  if (!resp.ok) return { is_menu: false, description: 'API error' };
  const data = await resp.json();
  const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { is_menu: false, description: text.slice(0, 100) };
  } catch { return { is_menu: false, description: text.slice(0, 100) }; }
}

async function extractWhiskeysFromPhoto(base64, barName) {
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
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: `Extract all whiskey/whisky/bourbon/scotch/rye/spirits items visible in this image from "${barName}".

Rules:
- Extract individual spirit names, NOT cocktails
- Parse prices if visible
- Parse age statements
- Return ONLY valid JSON, no markdown:
{"whiskeys": [{"name": "...", "distillery": "...", "type": "bourbon|scotch|irish|rye|japanese|canadian|single_malt|blended|other", "age": null, "price": null, "pour_size": "...", "notes": "..."}]}

If no spirits are identifiable, return {"whiskeys": []}` },
        ],
      }],
    }),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]).whiskeys || [];
  } catch { /* fall through */ }
  return [];
}

// ---------------------------------------------------------------------------
// Review parsing — extract whiskey mentions
// ---------------------------------------------------------------------------

async function extractWhiskeysFromReviews(reviews, barName) {
  if (!reviews || reviews.length === 0) return [];

  const reviewTexts = reviews
    .filter(r => r.text?.text)
    .map(r => `[${r.rating}/5 stars, ${r.publishTime?.split('T')[0] || 'unknown date'}] ${r.text.text}`)
    .join('\n\n');

  if (reviewTexts.length < 50) return [];

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Extract any specific whiskey/bourbon/scotch/rye brand names mentioned in these Google reviews for "${barName}".

Only extract SPECIFIC brand/expression names (e.g., "Lagavulin 16", "Buffalo Trace"), NOT generic references like "great whiskey selection".

Reviews:
${reviewTexts.slice(0, 8000)}

Return JSON only: {"whiskeys_mentioned": [{"name": "...", "type": "bourbon|scotch|irish|rye|japanese|other", "context": "brief quote from review"}]}
If no specific brands are mentioned, return {"whiskeys_mentioned": []}`,
      }],
    }),
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || '';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]).whiskeys_mentioned || [];
  } catch { /* fall through */ }
  return [];
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function getExistingBars() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bars?select=id,name,city,state,google_place_id&state=eq.OR`, { headers: sbReadHeaders });
  return resp.json();
}

async function getExistingWhiskeys() {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/whiskeys?select=id,name`, { headers: sbReadHeaders });
  return resp.json();
}

async function updateBar(barId, updates) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bars?id=eq.${barId}`, {
    method: 'PATCH',
    headers: sbWriteHeaders,
    body: JSON.stringify(updates),
  });
  return resp.ok;
}

async function insertBar(bar) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bars`, {
    method: 'POST',
    headers: sbWriteHeaders,
    body: JSON.stringify(bar),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data?.[0] || null;
}

async function findOrCreateWhiskey(w, existing) {
  const norm = w.name.toLowerCase().replace(/['']/g, '').trim();
  const found = existing.find(e => e.name.toLowerCase().replace(/['']/g, '').trim() === norm);
  if (found) return found.id;

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

async function linkWhiskeyToBar(barId, whiskeyId, w, sourceType) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/bar_whiskeys`, {
    method: 'POST',
    headers: { ...sbWriteHeaders, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
    body: JSON.stringify({
      bar_id: barId, whiskey_id: whiskeyId,
      price: w.price || null, pour_size: w.pour_size || null,
      available: true, notes: w.notes || null,
      source_type: sourceType, confidence: sourceType === 'google_photo' ? 0.70 : 0.50,
      is_stale: false,
    }),
  });
  return resp.ok;
}

// ---------------------------------------------------------------------------
// Phase 1: Validate and enrich existing bars
// ---------------------------------------------------------------------------

async function enrichExistingBars(bars) {
  console.log('\n=== PHASE 1: Enriching existing bars via Google Places ===\n');
  let enriched = 0;
  let closed = 0;

  for (const bar of bars) {
    console.log(`  ${bar.name}...`);
    try {
      const results = await searchPlaces(`${bar.name} Portland OR bar`, 1);
      if (results.length === 0) {
        console.log(`    NOT FOUND on Google`);
        continue;
      }
      const place = results[0];
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;

      if (lat && lng && !isInPortland(lat, lng)) {
        console.log(`    OUTSIDE Portland metro (${lat}, ${lng}) — skipping`);
        continue;
      }

      const status = place.businessStatus || 'UNKNOWN';
      if (status === 'CLOSED_PERMANENTLY') {
        console.log(`    PERMANENTLY CLOSED — flagging`);
        closed++;
      }

      await updateBar(bar.id, {
        google_place_id: place.id,
        website: place.websiteUri || bar.website,
        phone: place.nationalPhoneNumber || bar.phone,
        metadata: {
          google_rating: place.rating,
          google_review_count: place.userRatingCount,
          google_business_status: status,
          google_address: place.formattedAddress,
          enriched_at: new Date().toISOString(),
        },
      });

      console.log(`    ${place.displayName?.text} — ${place.rating}/5 (${place.userRatingCount} reviews) [${status}]`);
      enriched++;
      await sleep(300);
    } catch (err) {
      console.log(`    ERROR: ${err.message}`);
    }
  }

  console.log(`\n  Enriched: ${enriched}/${bars.length}, Closed: ${closed}\n`);
}

// ---------------------------------------------------------------------------
// Phase 2: Discover new bars
// ---------------------------------------------------------------------------

async function discoverNewBars(existingNames) {
  console.log('=== PHASE 2: Discovering new Portland whiskey bars ===\n');

  const queries = [
    'whiskey bar Portland Oregon',
    'bourbon bar Portland OR',
    'scotch bar Portland Oregon',
    'cocktail bar whiskey Portland OR',
    'distillery tasting room Portland Oregon',
    'craft spirits bar Portland OR',
    'speakeasy Portland Oregon',
  ];

  const discovered = new Map(); // placeId -> place

  for (const q of queries) {
    console.log(`  Searching: "${q}"...`);
    try {
      const results = await searchPlaces(q, 10);
      for (const place of results) {
        if (discovered.has(place.id)) continue;
        const lat = place.location?.latitude;
        const lng = place.location?.longitude;
        if (!lat || !lng || !isInPortland(lat, lng)) continue;
        if (place.businessStatus === 'CLOSED_PERMANENTLY') continue;

        const name = place.displayName?.text || '';
        const nameNorm = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const isExisting = existingNames.some(n => {
          const norm = n.toLowerCase().replace(/[^a-z0-9]/g, '');
          return norm === nameNorm || norm.includes(nameNorm) || nameNorm.includes(norm);
        });

        if (!isExisting) {
          discovered.set(place.id, place);
        }
      }
      await sleep(300);
    } catch (err) {
      console.log(`    ERROR: ${err.message}`);
    }
  }

  console.log(`\n  Found ${discovered.size} new bars not in our database:\n`);

  const newBars = [];
  for (const place of discovered.values()) {
    const name = place.displayName?.text || 'Unknown';
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    console.log(`    + ${name} — ${place.formattedAddress} (${place.rating}/5, ${place.userRatingCount} reviews)`);

    const inserted = await insertBar({
      name,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      address: place.formattedAddress || null,
      city: 'Portland',
      state: 'OR',
      country: 'US',
      phone: place.nationalPhoneNumber || null,
      website: place.websiteUri || null,
      google_place_id: place.id,
      metadata: {
        google_rating: place.rating,
        google_review_count: place.userRatingCount,
        google_business_status: place.businessStatus,
        discovered_via: 'google_places_search',
        discovered_at: new Date().toISOString(),
      },
    });

    if (inserted) {
      newBars.push({ id: inserted.id, name, placeId: place.id });
    }
    await sleep(200);
  }

  return newBars;
}

// ---------------------------------------------------------------------------
// Phase 3: Photo OCR pipeline
// ---------------------------------------------------------------------------

async function processBarPhotos(barId, barName, placeId, existingWhiskeys) {
  let extracted = 0;
  try {
    const details = await getPlaceDetails(placeId);
    const photos = details.photos || [];
    const reviews = details.reviews || [];

    if (photos.length === 0 && reviews.length === 0) return 0;

    // Process up to 5 photos per bar
    const photosToProcess = photos.slice(0, 5);
    for (let i = 0; i < photosToProcess.length; i++) {
      const photo = photosToProcess[i];
      const photoUri = await getPhotoUri(photo.name, 1200);
      if (!photoUri) continue;

      const base64 = await downloadPhotoAsBase64(photoUri);
      if (!base64) continue;

      // Classify first (cheap Haiku call)
      const classification = await classifyPhoto(base64);
      const author = photo.authorAttributions?.[0]?.displayName || 'unknown';

      if (!classification.is_menu) {
        continue;
      }

      console.log(`      Photo ${i + 1}: MENU detected (${classification.description}) by ${author}`);

      // Extract whiskeys (Sonnet call)
      const whiskeys = await extractWhiskeysFromPhoto(base64, barName);
      console.log(`        Extracted ${whiskeys.length} spirits`);

      for (const w of whiskeys) {
        if (!w.name) continue;
        const whiskeyId = await findOrCreateWhiskey(w, existingWhiskeys);
        if (!whiskeyId) continue;
        const ok = await linkWhiskeyToBar(barId, whiskeyId, w, 'google_photo');
        if (ok) extracted++;
      }

      await sleep(1000); // Rate limit between photo extractions
    }

    // Process reviews for whiskey mentions
    const reviewWhiskeys = await extractWhiskeysFromReviews(reviews, barName);
    if (reviewWhiskeys.length > 0) {
      console.log(`      Reviews: ${reviewWhiskeys.length} whiskey mentions`);
      for (const w of reviewWhiskeys) {
        const whiskeyId = await findOrCreateWhiskey(
          { name: w.name, type: w.type, notes: w.context },
          existingWhiskeys
        );
        if (!whiskeyId) continue;
        const ok = await linkWhiskeyToBar(barId, whiskeyId,
          { price: null, pour_size: null, notes: `Mentioned in Google review: "${w.context}"` },
          'google_review'
        );
        if (ok) extracted++;
      }
    }
  } catch (err) {
    console.log(`      Photo/review ERROR: ${err.message}`);
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startTime = Date.now();

  // Get existing data
  let bars = await getExistingBars();
  let existingWhiskeys = await getExistingWhiskeys();
  console.log(`Starting with ${bars.length} Portland bars, ${existingWhiskeys.length} whiskeys\n`);

  // Phase 1: Enrich existing bars with Google data
  await enrichExistingBars(bars);

  // Phase 2: Discover new bars
  const existingNames = bars.map(b => b.name);
  const newBars = await discoverNewBars(existingNames);
  console.log(`\n  Added ${newBars.length} new bars\n`);

  // Phase 3: Photo OCR + review extraction for all bars with place IDs
  // Refresh bar list after discovery
  bars = await getExistingBars();
  const barsWithPlaceIds = bars.filter(b => b.google_place_id);

  console.log(`=== PHASE 3: Photo OCR + review extraction (${barsWithPlaceIds.length} bars) ===\n`);

  let totalPhotoExtracts = 0;
  for (const bar of barsWithPlaceIds) {
    console.log(`  ${bar.name} (${bar.google_place_id})...`);
    const count = await processBarPhotos(bar.id, bar.name, bar.google_place_id, existingWhiskeys);
    if (count > 0) {
      console.log(`    +${count} spirits from photos/reviews`);
      totalPhotoExtracts += count;
    } else {
      console.log(`    No menu photos or whiskey mentions found`);
    }
    await sleep(500);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n========== SUMMARY ==========');
  console.log(`Time: ${elapsed}s`);
  console.log(`Bars enriched with Google data: ${bars.length}`);
  console.log(`New bars discovered: ${newBars.length}`);
  console.log(`Spirits extracted from photos/reviews: ${totalPhotoExtracts}`);
  console.log(`Total whiskeys in DB: ${existingWhiskeys.length}`);
}

main().catch(console.error);

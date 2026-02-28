# findadram — Data Collection Plan

## Overview

Portland has **30+ whiskey-focused establishments** (dedicated whiskey bars, craft cocktail bars, distillery tasting rooms) but **no single source publishes structured whiskey-by-the-glass data**. Most bars publish cocktail menus online but keep their full bottle/pour lists in-house only. This is the gap findadram fills.

**Core insight:** There is no API that answers "what whiskeys does this bar carry." We have to build that dataset ourselves.

---

## Phase 1: Bar Discovery (Day 1)

Build the venue database — names, locations, hours, websites.

### Data Sources

| Source | What We Get | Access Method | Cost |
|--------|-------------|---------------|------|
| **Google Places API (New)** | Name, address, lat/lng, hours, website, photos, rating | Text Search + Place Details | Free tier: 10K/month |
| **Yelp Fusion API** | Name, address, rating, review count, photos, categories | Business Search | $7.99/1K calls |
| **Manual seed list** | 30+ known Portland whiskey bars (see below) | Hardcoded | Free |

### Discovery Pipeline

```
1. Google Text Search: "whiskey bar in Portland OR" (within 15km of 45.5152, -122.6784)
2. Google Text Search: "cocktail bar Portland Oregon"
3. Google Text Search: "bourbon bar Portland"
4. Google Text Search: "distillery tasting room Portland"
5. Deduplicate by place_id / address
6. Enrich each venue with Place Details (hours, website, photos)
7. Cross-reference with Yelp for additional metadata
8. Store in Supabase `bars` table with PostGIS point geometry
```

### Seed List — Known Portland Whiskey Bars

**Tier 1: Dedicated Whiskey Bars**
1. Multnomah Whiskey Library — 1124 SW Alder St (~1,500 labels)
2. Scotch Lodge — 215 SE 9th Ave (~300 whiskeys)
3. The Old Gold — 2105 N Killingsworth
4. Paydirt — NE Portland (Zipper food hall, 250+ whiskies)
5. Pope House Bourbon Lounge — 2075 NW Glisan St (150+ bourbons)
6. Swine Moonshine & Whiskey Bar — Downtown (Paramount Hotel)
7. The RedRoom — SE Portland
8. Proof Reader Whiskey + Craft + Kitchen
9. Whiskey Barrel Lounge — Happy Valley
10. Loyal Legion (~130 whiskies)
11. The Eastburn — SE Portland
12. Interurban — N Mississippi Ave
13. Holy Ghost Bar — 28th & Gladstone

**Tier 2: Craft Cocktail Bars (strong whiskey programs)**
14. Teardrop Lounge
15. Clyde Common (Jeffrey Morgenthaler)
16. Pepe Le Moko
17. Angel Face
18. Hey Love
19. Deadshot
20. Bible Club PDX
21. Hale Pele
22. Rum Club
23. The Sapphire Hotel
24. Bacchus Bar
25. Too Soon

**Tier 3: Distillery Tasting Rooms**
26. Westward Whiskey — 65 SE Washington St
27. Bull Run Distillery — 2259 NW Quimby St
28. New Deal Distillery — 900 SE Salmon St
29. Stone Barn Brandyworks — 3315 SE 19th
30. Eastside Distilling (Burnside Whiskey)
31. Bird Creek Whiskey
32. Freeland Spirits

### Database Schema for Crawl Tracking

```sql
-- Add to bars table
ALTER TABLE bars ADD COLUMN website_url TEXT;
ALTER TABLE bars ADD COLUMN google_place_id TEXT UNIQUE;
ALTER TABLE bars ADD COLUMN yelp_id TEXT UNIQUE;
ALTER TABLE bars ADD COLUMN last_menu_crawl TIMESTAMPTZ;
ALTER TABLE bars ADD COLUMN menu_content_hash TEXT;
ALTER TABLE bars ADD COLUMN crawl_failures INTEGER DEFAULT 0;
ALTER TABLE bars ADD COLUMN next_crawl_at TIMESTAMPTZ;
ALTER TABLE bars ADD COLUMN menu_source TEXT; -- 'website', 'google_photos', 'pdf', 'manual', 'user_submitted'
ALTER TABLE bars ADD COLUMN tier TEXT; -- 'whiskey_bar', 'cocktail_bar', 'distillery'

-- Crawl history log
CREATE TABLE crawl_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID REFERENCES bars(id) ON DELETE CASCADE,
  crawled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL, -- 'website', 'google_photo', 'pdf', 'yelp_photo'
  source_url TEXT,
  content_hash TEXT,
  items_extracted INTEGER DEFAULT 0,
  extraction_model TEXT, -- 'claude-haiku-4-5', 'claude-sonnet-4-5', 'manual'
  confidence_avg FLOAT,
  raw_content TEXT, -- stored for reprocessing
  status TEXT DEFAULT 'success' -- 'success', 'failed', 'partial', 'review_needed'
);

-- Per-drink extraction provenance
ALTER TABLE bar_drinks ADD COLUMN first_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bar_drinks ADD COLUMN last_confirmed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bar_drinks ADD COLUMN source_crawl_id UUID REFERENCES crawl_log(id);
ALTER TABLE bar_drinks ADD COLUMN extraction_confidence FLOAT;
ALTER TABLE bar_drinks ADD COLUMN is_stale BOOLEAN DEFAULT FALSE;
```

---

## Phase 2: Menu Data Extraction (Days 2-3)

Three parallel extraction pipelines, all feeding into the same `drinks` + `bar_drinks` tables.

### Pipeline A: Bar Website Scraping

**Tool: Crawlee with Playwright backend** (TypeScript, fits our stack)

```
Target: ~15 bars with known online menus
Flow:
  1. Fetch bar's website_url from Supabase
  2. Check robots.txt compliance (Crawlee built-in)
  3. Find menu pages (link text matching /menu|drinks|whiskey|spirits|cocktails/i)
  4. Extract HTML content from menu pages
  5. Check for PDF links (a[href$=".pdf"])
  6. Send extracted text to Claude for structured extraction
  7. Store results + crawl metadata
```

**Known online menus to target:**

| Bar | URL | Format |
|-----|-----|--------|
| Scotch Lodge | scotchlodge.com/menus | HTML (Squarespace) |
| Multnomah Whiskey Library | mwlpdx.com (PDF link) | PDF |
| Swine | swinemoonshine.com/.../drink-menu | HTML |
| Hey Love | heylovepdx.com/beverage | HTML |
| Hale Pele | halepele.com/menu | HTML |
| Bible Club PDX | bibleclubpdx.com/home | HTML |
| Bacchus Bar | bacchusbarpdx.com/menus | HTML |
| Whiskey Barrel Lounge | whiskeybarrellounge.com/kitchen/ | HTML |
| Deadshot | deadshotpdx.com | HTML |
| The Old Gold | drinkinoregon.com | HTML |

**Safety measures:**
- Rate limit: max 6 requests/minute per domain
- User-Agent: `FindADram/1.0 (menu-data-collection)`
- URL validation: HTTPS only, no private IPs (SSRF prevention)
- Content-type allowlist: text/html, application/pdf, image/jpeg, image/png
- Max response size: 50MB
- Redirect limit: 3 hops max
- Playwright: block fonts, stylesheets, media to reduce attack surface
- Sanitize all scraped text before storing (prevent stored XSS)

### Pipeline B: Google Maps Photo OCR

**Tool: Google Places Photos API + Claude Vision**

```
Target: All bars, especially those without websites
Flow:
  1. For each bar, fetch photo references via Place Details
  2. Download photos (up to 10 per bar initially)
  3. Use Claude Haiku to classify: "Is this a menu photo?" (yes/no)
  4. For menu photos: extract structured drink data with Claude
  5. Store results + link to source photo
```

**Cost estimate:** ~300 bars × 10 photos × $0.003/image = ~$9 for classification. Menu photos only (~10-20% of photos) go through full extraction.

### Pipeline C: PDF Menu Processing

**Tool: Claude native PDF support** (send PDF directly to API)

```
Target: Bars that post PDF menus
Flow:
  1. Download PDF from bar website or Google Business Profile
  2. Send directly to Claude API as document type
  3. Extract structured drink data
  4. Store results + original PDF hash for change detection
```

No need for pymupdf or pdf-parse — Claude handles PDFs natively.

### Extraction Schema (all pipelines)

Every extraction call uses the same prompt and returns the same shape:

```typescript
interface ExtractedDrink {
  name: string;               // "Lagavulin 16"
  type: WhiskeyType;          // "scotch"
  distillery: string | null;  // "Lagavulin"
  age: string | null;         // "16yr"
  price: number | null;       // 18
  pour_size: string | null;   // "2oz"
  abv: string | null;         // "43%"
  region: string | null;      // "Islay"
  notes: string | null;       // "Peated, smoky"
  confidence: number;         // 0.0-1.0
}

type WhiskeyType =
  | "bourbon" | "rye" | "scotch" | "irish" | "japanese"
  | "canadian" | "other_whiskey" | "brandy" | "rum" | "gin"
  | "vodka" | "tequila" | "mezcal" | "other";
```

### Model Selection for Extraction

Using hackathon Claude API credits — no need to optimize for cost. Optimize for accuracy.

| Input | Model | Why |
|-------|-------|-----|
| Clean HTML menu text | Haiku 4.5 | Fast, accurate for structured text |
| Menu photos | **Sonnet 4.5** | Better vision accuracy on noisy bar photos, chalk boards, dim lighting |
| Complex/ambiguous PDFs | **Sonnet 4.5** | Better reasoning for messy layouts, multi-column menus |
| Validation/dedup pass | Haiku 4.5 | Simple comparison task |
| Whiskey name normalization | **Sonnet 4.5** | Knows whiskey brands, distilleries, can resolve ambiguous abbreviations |

**All extraction costs covered by hackathon credits.**

### Validation Strategy

- **Dual extraction:** Run extraction twice with different prompt variants, flag discrepancies
- **Confidence threshold:** Items with confidence < 0.7 go to a review queue
- **Whiskey name normalization:** Match extracted names against reference databases (see Phase 3)

---

## Phase 3: Whiskey Name Normalization

Raw menu extractions will have inconsistent naming: "Makers 46" vs "Maker's Mark 46" vs "Maker's 46". We need a canonical whiskey reference.

### Reference Data Sources

| Source | Size | Cost | Use |
|--------|------|------|-----|
| **TTB Federal Data** (US gov) | All US distilleries/producers | Free | Canonical distillery names |
| **WineVybe Liquor API** | Thousands of bottles | ~$0.02/req via RapidAPI | Bottle-level normalization |
| **WhiskyHunter API** | Auction data | Free, no key | Price/market data supplement |
| **WhiskeyProject API** (GitHub) | ~370 whiskeys with taste profiles | Free, open source | Prototype/seed data |
| **TheCocktailDB** | 636 cocktails, 489 ingredients | Free | Cocktail recipe cross-reference |

### Normalization Pipeline

Since Claude API credits are free, use Claude Sonnet as the primary normalizer instead of relying on paid third-party APIs:

```
1. Build local `whiskey_reference` table in Supabase
   - Seed with TTB distillery data (free, federal gov) + WhiskeyProject API (free, open source)
   - Fields: canonical_name, distillery, type, age, region, aliases[]

2. For each extracted drink:
   a. Ask Claude Sonnet: "Given this menu text '{name}', what is the canonical whiskey?
      Return: canonical name, distillery, type, age, region, confidence."
      Claude already knows virtually every commercial whiskey brand.
   b. Fuzzy match Claude's answer against whiskey_reference (pg_trgm as backup)
   c. If match confidence > 0.85 → auto-link to canonical entry
   d. If match confidence 0.5-0.85 → flag for review
   e. If no match → Claude suggests a new canonical entry, add to reference table

3. Over time, aliases[] grows as we see more menu variations
```

This approach is better than WineVybe API because Claude:
- Already knows every major whiskey brand, distillery, and expression
- Can resolve abbreviations ("BT" → "Buffalo Trace", "WR" → "Woodford Reserve")
- Understands context ("Pappy 15" → "Pappy Van Winkle's Family Reserve 15 Year")
- Costs $0 with hackathon credits

```sql
-- Normalization support
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE whiskey_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name TEXT NOT NULL,         -- "Maker's Mark 46"
  distillery TEXT,                       -- "Maker's Mark"
  type TEXT NOT NULL,                    -- "bourbon"
  age TEXT,                              -- null (NAS)
  region TEXT,                           -- "Kentucky"
  country TEXT,                          -- "USA"
  abv TEXT,                              -- "47%"
  aliases TEXT[] DEFAULT '{}',           -- {"Makers 46", "Maker's 46", "MM46"}
  tasting_notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whiskey_ref_name_trgm ON whiskey_reference USING GIN (canonical_name gin_trgm_ops);
CREATE INDEX idx_whiskey_ref_aliases ON whiskey_reference USING GIN (aliases);
```

---

## Phase 4: Freshness & Ongoing Updates

### Menu Change Frequency

| Menu Type | Typical Change Rate | Re-crawl Interval |
|-----------|--------------------|--------------------|
| Whiskey/spirits pour list | Monthly-quarterly | Every 4 weeks |
| Craft cocktail menu | Weekly-monthly | Every 2 weeks |
| Seasonal specials | Seasonally | Every 2 weeks |
| Distillery tasting menus | Quarterly | Every 6 weeks |

### Change Detection

```
For each bar on its re-crawl schedule:
  1. HTTP HEAD request → check ETag / Last-Modified headers
  2. If headers unchanged → skip full crawl, push next_crawl_at
  3. If headers changed (or no headers) → full crawl
  4. Hash new content → compare to stored menu_content_hash
  5. If hash unchanged → no re-extraction needed
  6. If hash changed → run extraction pipeline, diff against existing data
```

### Adaptive Scheduling

```typescript
function calculateNextCrawl(bar: Bar): Date {
  const now = new Date();

  // Menu changed on last crawl → check sooner
  if (bar.menuChangedOnLastCrawl) return addDays(now, 7);

  // Unchanged for 3+ consecutive crawls → slow down
  if (bar.unchangedCrawlCount >= 3) return addDays(now, 42);

  // Default: every 4 weeks
  return addDays(now, 28);
}
```

### Staleness Signals

- **Automated:** Crawl scheduler detects changes
- **User-reported:** "This menu is outdated" button in the app
- **Social signals:** Monitor for "new menu" mentions in Google reviews (future enhancement)
- **Seasonal triggers:** Re-crawl all bars at start of each season (cocktail menus rotate)

### Data Timestamping

Every piece of drink data carries provenance:

| Field | Purpose |
|-------|---------|
| `bar_drinks.first_seen_at` | When we first found this drink at this bar |
| `bar_drinks.last_confirmed_at` | Last crawl that confirmed this drink is still there |
| `bar_drinks.source_crawl_id` | Links to `crawl_log` for full audit trail |
| `bar_drinks.is_stale` | Set TRUE if drink not found in latest crawl |
| `crawl_log.crawled_at` | Exact timestamp of each crawl |
| `crawl_log.source` | How we got the data (website, photo, pdf, manual) |
| `crawl_log.extraction_model` | Which Claude model processed it |

**Display in app:** Show users "Menu last verified: 2 weeks ago" per bar. Color-code freshness (green < 2 weeks, yellow < 6 weeks, red > 6 weeks).

---

## Phase 4b: Source Citation & Provenance

Every piece of data in findadram must be traceable back to its origin. We track **two separate timestamps** for each data point:

| Timestamp | Column | Meaning | Example |
|-----------|--------|---------|---------|
| **Date found** | `scraped_at` / `first_seen_at` | When *we* fetched/scraped/received this data | 2026-02-28T14:30:00Z |
| **Date of source** | `source_date` | When the *source itself* was created/published | 2025-11-15T00:00:00Z (photo upload date) |

### Why Both Dates Matter

A Google Maps photo of a whiskey menu might have been **uploaded November 2025** but **discovered by us February 2026**. The source date tells users how fresh the actual menu data is. The scrape date tells us when we last checked.

### Source Attribution Format

Every trawl job stores a human-readable `source_attribution` string. Format by pipeline:

| Pipeline | Attribution Pattern | Example |
|----------|-------------------|---------|
| **Website scrape** | `"Website menu at {domain}/{path}, fetched {date}"` | `"Website menu at scotchlodge.com/menus, fetched 2026-02-28"` |
| **Google photo** | `"Google Maps photo by {author}, uploaded {date}"` | `"Google Maps photo by @whiskeylover42, uploaded 2025-11-15"` |
| **PDF menu** | `"PDF menu from {domain}, downloaded {date}"` | `"PDF menu from mwlpdx.com, downloaded 2026-02-28"` |
| **User submission** | `"User-submitted photo via /submit by {user}, {date}"` | `"User-submitted photo via /submit by djab1, 2026-03-01"` |
| **Manual entry** | `"Manual entry by {user}, {date}"` | `"Manual entry by admin, 2026-02-28"` |

### Google Places Photos — Date Tracking

The Google Places API (New) returns photo metadata that includes upload timestamps and author attributions. This is critical for knowing how old a menu photo actually is.

```
Google Places API → Place Details (photos field)
  Each photo returns:
    - name: "places/{place_id}/photos/{photo_ref}"
    - widthPx / heightPx
    - authorAttributions[]: { displayName, uri, photoUri }

Google Places API → Photo Media endpoint
  Returns the actual image bytes

Note: The "New" Places API does not directly return upload timestamps in
the photo metadata. To approximate source_date:
  1. Use Google Maps review dates as a proxy (reviews containing photos
     have a publish_time field)
  2. Check EXIF data in the downloaded photo (DateTimeOriginal tag)
  3. Use the photo's position in the photo list as a rough ordering signal
  4. Fall back to NULL source_date if no date signal is available
```

### Extraction Pipeline — Provenance Flow

```
Fetch/Download source
  │
  ├─ Record: scraped_at = NOW()
  ├─ Record: source_date = (from API metadata / EXIF / NULL)
  ├─ Record: source_attribution = (formatted string)
  ├─ Record: content_hash = SHA-256(raw content)
  │
  ▼
Claude extraction
  │
  ├─ Record: confidence = (model's extraction confidence)
  ├─ Record: source_type = 'website_scrape' | 'google_photo' | 'pdf_menu' | 'user_submitted' | 'manual'
  │
  ▼
Store bar_whiskeys
  │
  ├─ first_seen_at = NOW() (only on first insert)
  ├─ source_trawl_id = (link to trawl_jobs row)
  ├─ confidence = (from extraction)
  └─ is_stale = false (reset on confirmation)
```

### Content Hashing for Change Detection

Every raw source gets a SHA-256 hash stored in `trawl_jobs.content_hash`. This enables:

- **Skip re-extraction:** If hash matches previous crawl, the menu hasn't changed — no need to re-run Claude
- **Diff detection:** When hash changes, we know the menu updated and can compare old vs new extractions
- **Dedup across sources:** If the same menu PDF appears on multiple URLs, the hash catches it

### Display in App

Citations appear in the UI as contextual metadata:

```
Scotch Lodge — Whiskey List
  Last verified: 2 days ago ✓
  Source: Website menu at scotchlodge.com/menus
  26 whiskeys found (confidence: 92%)

  Lagavulin 16 — $18/2oz
    Source: Website scrape, Feb 28 2026
    First seen: Jan 15 2026

Pope House Bourbon Lounge — Whiskey List
  Last verified: 3 weeks ago ⚠
  Source: Google Maps photo by @bourbonfan, uploaded Nov 2025
  ⚠ Source is 3+ months old — menu may have changed
```

### Staleness Rules

| Condition | Action | UI Signal |
|-----------|--------|-----------|
| Confirmed within 2 weeks | None | Green "verified" badge |
| Confirmed 2-6 weeks ago | Schedule re-crawl | Yellow "aging" badge |
| Confirmed 6+ weeks ago | Priority re-crawl | Red "stale" badge |
| Source date 3+ months old | Show warning to user | "Source may be outdated" |
| Re-crawl doesn't find item | Set `is_stale = true` | Gray out / move to "possibly removed" |

---

## Phase 5: Architecture & Implementation

### System Diagram

```
┌─────────────────────────────────────────────────────┐
│                    DATA SOURCES                      │
│                                                     │
│  Google Places API    Bar Websites    User Submissions│
│  ├─ Text Search       ├─ HTML menus   ├─ Photo upload │
│  ├─ Place Details     ├─ PDF menus    └─ Manual entry │
│  └─ Place Photos      └─ (Crawlee)                   │
└──────────────┬──────────────┬──────────────┬─────────┘
               │              │              │
               ▼              ▼              ▼
┌─────────────────────────────────────────────────────┐
│              EXTRACTION LAYER                        │
│                                                     │
│  Claude Haiku/Sonnet                                │
│  ├─ Text → structured JSON                          │
│  ├─ Image → structured JSON                         │
│  ├─ PDF → structured JSON                           │
│  └─ Validation (dual-extraction, confidence scores) │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              NORMALIZATION                           │
│                                                     │
│  Fuzzy match against whiskey_reference table         │
│  ├─ Auto-link (confidence > 0.85)                   │
│  ├─ Review queue (0.5 - 0.85)                       │
│  └─ New candidate (< 0.5)                           │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              STORAGE (Supabase + PostGIS)            │
│                                                     │
│  bars ←→ bar_drinks ←→ drinks                       │
│  whiskey_reference (canonical names + aliases)       │
│  crawl_log (full audit trail)                       │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              FRESHNESS SCHEDULER                     │
│                                                     │
│  Cron job (Vercel Cron or pg-boss)                  │
│  ├─ Adaptive re-crawl intervals                     │
│  ├─ Change detection (HTTP HEAD + content hashing)  │
│  └─ User-reported staleness                         │
└─────────────────────────────────────────────────────┘
```

### Implementation Order

1. **Supabase schema** — migrations for bars, drinks, bar_drinks, crawl_log, whiskey_reference
2. **Google Places discovery script** — find + store all Portland bars
3. **Crawlee scraper** — scrape known bar websites for menu data
4. **Claude extraction API route** — `/api/extract` endpoint that processes text/image/PDF
5. **Normalization pipeline** — seed whiskey_reference, build fuzzy matching
6. **Freshness scheduler** — cron job for re-crawling stale bars
7. **Admin review UI** — for low-confidence extractions

### API Keys & Credits

- **Claude API:** Hackathon credits available — use aggressively for all extraction, classification, normalization, and validation. No need to penny-pinch on model selection; use Sonnet freely for better accuracy, Haiku for bulk/simple tasks.
- **Google Places API:** Requires separate API key — use free tier (10K requests/month) which is plenty for Portland scale.
- **Yelp Fusion:** Requires separate API key — use starter tier if needed.

Since Claude credits are pre-paid, the strategy shifts: **maximize Claude usage to reduce dependency on other paid APIs.** For example:
- Use Claude to classify Google Photos instead of building a custom classifier
- Use Claude for whiskey name normalization instead of paying for WineVybe API
- Use Claude Sonnet for tricky extractions without worrying about cost
- Run dual-extraction validation on everything (not just low-confidence items)

### Estimated Costs (Portland Scale: ~300 bars)

| Component | Initial Build | Monthly Ongoing |
|-----------|--------------|-----------------|
| Google Places API | $5-10 | $2-5 |
| Claude extraction | **$0 (hackathon credits)** | **$0 (hackathon credits)** |
| Supabase (free tier) | $0 | $0 |
| Vercel (free tier) | $0 | $0 |
| **Total** | **~$5-10** | **~$2-5/month** |

---

## Appendix: Safety Checklist

- [ ] SSRF prevention: validate all URLs before fetching (no private IPs, HTTPS only)
- [ ] Content-type allowlist: only fetch text/html, application/pdf, image/*
- [ ] Max response size: 50MB cap on all fetched content
- [ ] Rate limiting: max 6 req/min per domain, identify with User-Agent
- [ ] robots.txt: always check before scraping (Crawlee handles this)
- [ ] Redirect limit: max 3 hops, block cross-domain redirects
- [ ] Input sanitization: sanitize all scraped text before Supabase storage
- [ ] No executable downloads: never save .exe, .js, .sh etc from crawled sites
- [ ] Playwright sandboxing: run in Docker with limited network access
- [ ] API keys: never expose Google/Yelp/Claude keys in client-side code

# Find a Dram

**Know what's on the shelf before you walk through the door.**

Find a Dram is a whiskey discovery platform for the Pacific Northwest. Search 60+ bars across Portland, Seattle, and Vancouver, browse 380+ whiskeys, compare prices, and find your next pour — all in one place.

**Live demo:** [findadram.vercel.app](https://findadram.vercel.app)

---

## The Problem

The Pacific Northwest has one of the best whiskey scenes in the country — Portland's Multnomah Whiskey Library, Seattle's Canon (4,000+ bottles), Scotch Lodge, Pope House, and dozens more. But there's no good way to answer simple questions:

- *"Which bars near me carry Blanton's?"*
- *"What's the whiskey list at that new bar on Division?"*
- *"Where can I get a pour of Yamazaki 12 for under $25?"*

You'd have to call each bar, check scattered websites, or just show up and hope for the best.

## The Solution

Find a Dram aggregates whiskey menus from bars into a single searchable database. You can:

- **Search by whiskey** — find every bar carrying a specific bottle, with prices and pour sizes
- **Search by bar** — see the full whiskey menu for any bar before you visit
- **Search nearby** — use your location to find whiskey bars within walking distance
- **Buy a bottle** — search Oregon OLCC liquor store inventory for retail bottles
- **Submit menus** — upload a bar's menu URL or photo and our AI extracts every whiskey automatically
- **Verify availability** — confirm or flag whiskeys as "not found" to keep data fresh
- **Claim your bar** — bar owners can claim their listing and manage their own whiskey menu

## How It Works

### AI-Powered Menu Extraction

The most technically interesting piece. Given a bar's website URL or a photo of their menu:

```
URL / Photo / PDF  →  Crawl + OCR  →  Claude Extraction  →  Normalize  →  Deduplicate  →  Database
```

1. **Crawl** — Puppeteer (headless Chrome) for JS-rendered menus, plain fetch fallback. SSRF protection blocks private IPs and validates content types.
2. **Extract** — Claude parses unstructured menu text into structured JSON: whiskey name, distillery, type, price, pour size, confidence score. Three input modes: HTML text (Haiku), menu photos/back-bar shots (Sonnet vision), and native PDF documents.
3. **Normalize** — 10-step pure TypeScript pipeline: Unicode normalization, distillery alias resolution (150+ aliases), ABV/proof stripping, legal category removal, age statement normalization ("12yo" / "12 Year Old" / "12yr" all become "12 year"), and private barrel detection ("Eagle Rare — Private Barrel" separates the pick metadata from the base whiskey).
4. **Deduplicate** — three-tier matching: exact normalized name match, Levenshtein fuzzy match (85% threshold), then Claude AI as a final judge for ambiguous near-matches ("Are these the same whiskey?").
5. **Ingest** — upserts to Supabase with full provenance: source URL, source type, extraction confidence, content hash (SHA-256) for change detection, and dual timestamps (when we scraped vs. when the source was published).

Supports batch processing (up to 20 URLs), PDF menus, and camera photos of physical menus.

### Google Places Discovery

We also built a pipeline that uses the Google Places API to automatically discover whiskey bars in the Portland metro area, pull ratings and review counts, and download menu photos for OCR extraction.

### Data Pipeline

Multiple enrichment strategies run together:

| Source | Method | Confidence |
|--------|--------|------------|
| Bar websites | AI menu extraction (Claude Vision + text) | High |
| Google Places | Photo OCR + review mining | Medium |
| AI knowledge | Claude's knowledge of Portland bars | Lower |
| Crowdsourced | User-submitted sightings and confirmations | Varies |

Every entry tracks its source type, confidence score, and when it was last verified.

### Data Freshness & Crowd Verification

Bar menus change constantly. We built multiple systems to keep data accurate:

- **Staleness warnings** — listings not verified in 90+ days, or sourced from data over 90 days old, show an amber warning badge so users know to take pricing with a grain of salt
- **Crowd confirmations** — any user can tap "Still here" or "Not found" on a whiskey listing. Two "not found" reports within 7 days automatically marks the whiskey as unavailable (via Postgres trigger).
- **Provenance chain** — every bar-whiskey link traces back to its source: the original URL or photo, when we scraped it, when the source was published, and a content hash for change detection on re-crawls
- **Bar owner management** — verified bar owners can claim their listing and directly update prices, availability, and pour sizes through a dashboard, with RLS policies enforcing ownership at the database level

### OLCC Liquor Store Integration

Oregon's liquor stores are state-controlled with uniform pricing. We reverse-engineered the OLCC (Oregon Liquor and Cannabis Commission) web servlet to query their product catalog directly — POSTing through the age gate to establish a session cookie, then parsing the HTML product table for item codes, descriptions, sizes, proof, and bottle prices. The integration handles cookie extraction differences across Node.js runtimes (Vercel vs. local) and defaults to a statewide search when no ZIP code is provided.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16** (App Router, Server Components) |
| Database | **Supabase** (PostgreSQL + PostGIS for geo-queries) |
| AI | **Claude API** — Haiku for classification, Sonnet for extraction and vision |
| External Data | **Google Places API** — bar discovery, ratings, photo OCR |
| Maps | **Leaflet** + react-leaflet |
| Styling | **Tailwind CSS v4** with custom whiskey/oak color palette |
| Validation | **Zod v4** |
| Language | **TypeScript** (strict mode) |
| Hosting | **Vercel** |

## Architecture

```
src/
  app/                    Next.js App Router
    api/                  REST endpoints (search, trawl, geocode, sightings)
    bars/[id]/            Bar detail — full whiskey menu, map, activity feed
    whiskeys/[id]/        Whiskey detail — where to find it, pricing, OLCC search
    search/               Full-text + geo search across bars and whiskeys
    submit/               Upload a bar menu (URL, image, or PDF)
    bottles/              Oregon OLCC liquor store bottle search
    dashboard/            Bar owner portal — claim bars, manage whiskey menus
    auth/                 Email/password sign-in, sign-up, OAuth callback
  components/
    features/             BarCard, WhiskeyCard, MapView, NearbyBars, SearchBar, ...
    ui/                   Design system primitives (Button, Input, Badge, Card)
  lib/
    trawler/              AI extraction pipeline (crawl → extract → normalize → ingest)
    liquor-search/        OLCC state liquor store integration (extensible to other states)
    supabase/             DB clients, server/client helpers
    geo.ts                Pacific NW geofencing, Haversine distance, region detection
  hooks/                  useLocation, useDebounce
  types/                  Shared TypeScript types (database, trawler, geo)

scripts/
  google-places-enrich    Google Places discovery + photo OCR pipeline
  enrich-portland-bars    AI knowledge-based enrichment
  seed-whiskey-reference  Comprehensive whiskey catalog seeder
  trawl-portland          Batch website trawler for Portland bars
  audit-data              Data quality audit tool

supabase/
  migrations/             Sequential SQL migrations (schema, engagement, RLS, seeds)
```

## Database

```
bars ──────────── bar_whiskeys ──────────── whiskeys
  PostGIS location    price, pour_size          type (bourbon, scotch, rye, ...)
  Google place_id     confidence, source_type   distillery, region, country
  rating, reviews     available, last_verified  age, abv, normalized_name

sightings ─── user reports: "I saw X at Y for $Z" (triggers auto bar_whiskey upsert)
confirmations ─── crowdsourced "still here" / "not found" verification
trawl_jobs ─── extraction pipeline tracking with provenance + content hashes
user_profiles ─── session + optional auth linkage, roles (user/bar_owner/admin)
bar_claims ─── bar ownership requests (pending → approved/rejected)
```

- Row Level Security on all tables — public reads, service role for core data writes, session-based ownership for user-generated content
- PostGIS `GIST` spatial indexes for geo-queries (`ST_DWithin`)
- Full-text search via `tsvector` + `GIN` indexes on bars and whiskeys
- Trigram indexes (`pg_trgm`) for fuzzy name matching
- Custom PostgreSQL RPCs: `search_bars` and `search_whiskeys` combine full-text + geospatial sorting; `nearby_bars` for pure geo; `bar_activity` for UNION ALL activity feeds
- `normalize_whiskey_name()` — an `IMMUTABLE` SQL function mirroring the TypeScript normalization pipeline, used in a `GENERATED ALWAYS` column for index-backed deduplication

## Current Data

| Metric | Count |
|--------|-------|
| Bars (Portland, Seattle, Vancouver) | 63 |
| Whiskeys cataloged | 378 |
| Bar–whiskey links | 715 |
| Whiskey types | bourbon, scotch, rye, irish, japanese, canadian, single malt, blended, PNW craft |
| Venue categories | whiskey bar, cocktail bar, restaurant, pub, hotel bar, distillery, brewery, lounge |

In a production trawl run, the pipeline crawled 39 Portland bar websites in 185 seconds, extracting structured whiskey data including private barrel picks (e.g., Interurban's private barrel Eagle Rare on draft at $13, E.H. Taylor at $21).

## Security

- **SSRF protection** — URL validation before any crawl (blocks private IPs, non-HTTP schemes)
- **Input validation** — Zod schemas at all API boundaries; coordinate bounds checking
- **File limits** — 25MB max upload, mime type validation
- **RLS** — all Supabase tables have Row Level Security; public users are read-only
- **No secrets in client** — service role key used only server-side

## Getting Started

```bash
npm install

# Set up environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#          SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, GOOGLE_PLACES_API_KEY

# Push schema to Supabase
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# Run
npm run dev        # → http://localhost:3000
```

## How It Was Built

This project was built using **Claude Code** with parallel AI agents, each owning a domain (database, API, UI, geo/search, auth). Agents coordinate through file ownership boundaries and a shared collaboration protocol defined in `CLAUDE.md`.

An autonomous [**overseer agent**](https://github.com/abishop1990/claude-overseer) ran alongside the domain agents — triaging the codebase, picking the highest-value next action, executing it, and committing. This kept the project moving forward without manual task assignment.

The trawler pipeline and Google Places enrichment pipeline both use Claude's vision and text capabilities to extract structured whiskey data from unstructured sources — bar websites, menu photos, and Google reviews.

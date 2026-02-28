# Find a Dram

**Whiskey discovery for Portland, OR.** Search bars near you, see what's on the shelf, track prices, and share discoveries with the community.

> Built for the hackathon — 4-6 parallel AI agents collaborating via Claude Code.

## What It Does

- **Geo-aware bar search** — find whiskey bars near your location using PostGIS spatial queries
- **AI-powered menu trawler** — point it at a bar's website or upload a menu photo/PDF; Claude extracts every whiskey, price, and pour size automatically
- **Crowdsourced sightings** — users report what they find, confirm availability, and rate pours. No account required (session-based).
- **Full-text search** — search across bars and whiskeys by name, distillery, type, or style
- **Interactive map** — Leaflet-based map view of all bars in the Portland metro area

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, Server Components) |
| Database | Supabase (PostgreSQL + PostGIS) |
| AI | Claude API (Haiku for text extraction, Sonnet for vision/PDF) |
| Maps | Leaflet + react-leaflet |
| Validation | Zod v4 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript (strict) |

## Architecture

```
src/
  app/                    Pages & API routes (Next.js App Router)
    api/                  REST endpoints (search, trawl, sightings, confirmations)
    bars/[id]/            Bar detail — menu, activity feed, map
    whiskeys/[id]/        Whiskey detail — where to find it, pricing
    search/               Full-text + geo search
    submit/               Upload a bar menu (URL, image, or PDF)
  components/
    features/             BarCard, WhiskeyCard, MapView, NearbyBars, SightingForm, ...
    ui/                   Primitives (buttons, inputs, badges)
  lib/
    trawler/              AI extraction pipeline (crawl → extract → normalize → ingest)
    supabase/             DB clients & types
    geo.ts                Portland metro geofencing, distance helpers
supabase/
  migrations/             3 sequential migrations (schema, engagement, RLS)
  seed.sql                12 bars, 35 whiskeys, 82 bar-whiskey links
```

## The Trawler Pipeline

The most interesting piece. Given a bar's website URL or menu image:

```
URL/Image → Crawl/OCR → Claude Extraction → Normalize → Deduplicate → Upsert to DB
```

1. **Crawl** — fetches the page with SSRF protection (blocks private IPs, validates content types)
2. **Extract** — Claude parses the menu into structured JSON: whiskey name, distillery, type, price, pour size, confidence score
3. **Normalize** — standardizes names (e.g., "Maker's Mark 46" → consistent format) for dedup
4. **Ingest** — upserts bars, whiskeys, and bar_whiskeys with source attribution

Supports batch processing (up to 20 URLs), PDF menus, and camera photos.

## Database Schema

```
bars ──────────── bar_whiskeys ──────────── whiskeys
  PostGIS location    price, pour_size          type (bourbon, scotch, ...)
  full-text search    availability              distillery, region, age
  city, state         last_verified             normalized_name

sightings ─── user reports: "I saw X at Y for $Z"
confirmations ─── crowdsourced verification of availability
trawl_jobs ─── tracks extraction pipeline runs
```

Row Level Security on all tables. PostGIS spatial indexes for geo-queries.

## Getting Started

```bash
# Install
npm install

# Set up environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, ANTHROPIC_API_KEY

# Start Supabase (Docker required)
npx supabase start
npx supabase db push

# Seed dev data
psql $DATABASE_URL < supabase/seed.sql

# Run
npm run dev        # → http://localhost:3000
```

## How It Was Built

This project was built by **4-6 parallel Claude Code agents**, each owning a domain (database, API, UI, geo, auth). Agents coordinate through file ownership boundaries and a shared collaboration protocol defined in `CLAUDE.md`. The trawler pipeline uses Claude's vision and text capabilities to extract structured data from unstructured bar menus.

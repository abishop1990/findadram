# findadram

Whiskey/spirits discovery platform — find drinks at bars near you. Hackathon project.

## Stack

- **Frontend/Backend:** Next.js 14+ (App Router)
- **Database/Auth/Realtime:** Supabase (PostGIS for geo-queries)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest
npx supabase start   # Local Supabase (Docker required)
npx supabase db push # Push migrations to remote
```

## Architecture

```
src/
  app/                  # Next.js App Router pages & layouts
    (auth)/             # Auth-gated routes
    api/                # Route handlers
  components/           # React components
    ui/                 # Primitives (buttons, inputs, cards)
    features/           # Domain components (bar-card, drink-list, map)
  lib/                  # Shared utilities
    supabase/           # Supabase client, server client, types
    geo.ts              # Geo-query helpers
  types/                # Shared TypeScript types
supabase/
  migrations/           # Sequential SQL migrations
  seed.sql              # Dev seed data
```

### Supabase Schema Patterns

- Enable PostGIS extension for location data
- Bars table: `id`, `name`, `location` (geography point), `address`, `metadata` (jsonb)
- Drinks table: `id`, `name`, `type`, `distillery`, `description`, `image_url`
- Bar-drinks join: `bar_id`, `drink_id`, `price`, `available`
- Use Row Level Security on all tables
- Geo-queries: `ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius_meters)`

### Next.js Patterns

- Server Components by default; add `'use client'` only when needed (interactivity, hooks, browser APIs)
- Data fetching in Server Components via Supabase server client
- Route handlers (`app/api/`) for mutations and external integrations
- Use `loading.tsx` and `error.tsx` for each route segment
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Multi-Agent Collaboration Protocol

This repo is built by 4-6 parallel AI agents. Follow these rules to avoid conflicts and ship fast.

### Model Selection for Subagents

Match agent cost to task complexity:

| Task | Model | Examples |
|------|-------|---------|
| Simple | `haiku` | File creation from template, renaming, adding imports, seed data |
| Moderate | `sonnet` | Component implementation, API routes, migrations, tests |
| Complex | `opus` | Architecture decisions, debugging cross-cutting issues, security review |

### File Ownership Boundaries

Each agent claims a domain. **Never edit files outside your domain without coordinating.**

| Domain | Owns | Typical files |
|--------|------|---------------|
| **Database** | Schema, migrations, seed data, Supabase types | `supabase/`, `src/lib/supabase/` |
| **API** | Route handlers, server actions | `src/app/api/` |
| **UI/Components** | All React components, styling | `src/components/`, `src/app/**/page.tsx`, `src/app/**/layout.tsx` |
| **Geo/Search** | Location logic, map integration | `src/lib/geo.ts`, map-related components |
| **Auth** | Auth flows, middleware, RLS policies | `src/app/(auth)/`, `src/middleware.ts` |
| **Shared types** | Type definitions | `src/types/` — coordinate changes with dependent domains |

### Branch & Worktree Strategy

1. Each agent works in its own worktree/branch: `feat/<domain>-<description>`
2. Keep commits small and atomic — one logical change per commit
3. Pull from `main` before starting new work
4. PR into `main` when a feature is complete and passing lint/build

### Conflict Prevention

- **Shared files** (`layout.tsx`, `package.json`, `tailwind.config.ts`): only one agent edits at a time. Announce intent before touching these.
- **Types in `src/types/`**: add new types freely, but modifying existing types requires checking with dependents.
- **Migrations**: use timestamp-prefixed filenames. Never edit a migration that's already been pushed.

### Reconciliation Workflow

After merging a feature branch:

1. `npm run build` — must pass
2. `npm run lint` — must pass
3. `npm run test` — must pass
4. Run multi-perspective code review (see below)

## Multi-Perspective Code Review

Every significant merge gets reviewed from four angles. Use an `opus` subagent for each review perspective.

### 1. Security

- SQL injection via raw queries or unparameterized inputs
- RLS policies: are all tables protected? Can users access only their own data?
- Auth checks on every API route and server action
- No secrets in client-side code
- Input validation at system boundaries

### 2. Performance

- N+1 queries — use joins or batch fetches
- Geo-query efficiency — proper spatial indexes (`CREATE INDEX ... USING GIST`)
- Client bundle size — no unnecessary `'use client'`, lazy-load heavy components
- Image optimization via `next/image`
- Proper caching headers on API responses

### 3. UX

- Mobile-first responsive design
- Loading and error states for every async operation
- Accessible: semantic HTML, ARIA labels, keyboard navigation
- Location permission handling with clear fallback
- Fast perceived performance (optimistic updates, skeleton loaders)

### 4. Correctness

- Type safety — no `any`, no type assertions without justification
- Edge cases: empty results, network errors, invalid coordinates
- Database constraints match application logic
- Tests cover happy path and key failure modes
- Environment variable validation at startup

## Conventions

- Use named exports, not default exports (except pages)
- Prefer `async/await` over `.then()` chains
- Error messages: actionable and user-facing, not technical dumps
- Commit messages: `type(scope): description` — e.g., `feat(geo): add nearby bars query`
- No `console.log` in committed code — use structured logging or remove

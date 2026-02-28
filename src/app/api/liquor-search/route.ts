/**
 * GET /api/liquor-search?q=buffalo+trace&zip=97201&state=OR
 *
 * Proxies queries to the appropriate state liquor-store search provider.
 * Results are cached in memory for 1 hour to avoid hammering third-party sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchLiquorStores } from '@/lib/liquor-search';
import type { LiquorSearchProvider, LiquorStoreResult } from '@/lib/liquor-search';

// ─── In-memory cache ──────────────────────────────────────────────────────────

interface CacheEntry {
  results: LiquorStoreResult[];
  expiresAt: number;
}

/** Simple in-memory result cache. Keyed by canonical query string. */
const cache = new Map<string, CacheEntry>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCacheKey(q: string, state: string, zip: string): string {
  return `${state}:${zip}:${q.toLowerCase().trim()}`;
}

function getCached(key: string): LiquorStoreResult[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.results;
}

function setCache(key: string, results: LiquorStoreResult[]): void {
  // Evict stale entries if the cache grows large
  if (cache.size > 200) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }
  cache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Route handler ────────────────────────────────────────────────────────────

const SUPPORTED_STATES: Set<string> = new Set<LiquorSearchProvider>(['OR']);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;

  const q = params.get('q')?.trim() ?? '';
  const zip = params.get('zip')?.trim() ?? '';
  const stateParam = (params.get('state') ?? 'OR').toUpperCase();

  // ── Input validation ───────────────────────────────────────────────────────

  if (!q) {
    return NextResponse.json(
      { error: 'Missing required parameter: q (product name)' },
      { status: 400 },
    );
  }

  if (q.length > 120) {
    return NextResponse.json(
      { error: 'Query too long. Maximum 120 characters.' },
      { status: 400 },
    );
  }

  if (!SUPPORTED_STATES.has(stateParam)) {
    return NextResponse.json(
      {
        error: `Unsupported state: ${stateParam}. Currently supported: ${[...SUPPORTED_STATES].join(', ')}.`,
      },
      { status: 400 },
    );
  }

  if (zip && !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code. Must be a 5-digit US postal code.' },
      { status: 400 },
    );
  }

  const state = stateParam as LiquorSearchProvider;

  // ── Cache lookup ───────────────────────────────────────────────────────────

  const cacheKey = getCacheKey(q, state, zip);
  const cached = getCached(cacheKey);

  if (cached) {
    return NextResponse.json(
      { results: cached, fromCache: true },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
          'X-Cache': 'HIT',
        },
      },
    );
  }

  // ── Live search ────────────────────────────────────────────────────────────

  try {
    const results = await searchLiquorStores(q, {
      state,
      zipCode: zip || undefined,
    });

    setCache(cacheKey, results);

    return NextResponse.json(
      { results, fromCache: false },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
          'X-Cache': 'MISS',
        },
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error contacting liquor search provider.';

    // Distinguish between upstream errors (502) and our own bugs (500)
    const isUpstream =
      message.includes('connect') ||
      message.includes('ECONNREFUSED') ||
      message.includes('OLCC') ||
      message.includes('Oregon Liquor Search');

    return NextResponse.json(
      { error: message },
      { status: isUpstream ? 502 : 500 },
    );
  }
}

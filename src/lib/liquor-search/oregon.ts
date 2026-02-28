/**
 * Oregon Liquor and Cannabis Commission (OLCC) search integration.
 *
 * The OLCC product list page returns an HTML table with product data including
 * item codes, descriptions, sizes, proof, and bottle prices. OLCC controls
 * all liquor pricing in Oregon, so prices are uniform across every store.
 *
 * The product list is fetched via:
 *   GET /servlet/FrontController?view=global&action=search
 *     &productSearchParam=<query>
 *     &locationSearchParam=<zip>
 *     &radiusSearchParam=<miles>
 *
 * A valid JSESSIONID is required, obtained by POSTing through the age gate.
 *
 * Product list table columns:
 *   New Item Code | Item Code | Description | Category | Size | Proof | Age | Case Price | Bottle Price
 *
 * Data freshness: OLCC updates store quantities once per day.
 */

import type { LiquorStoreResult } from './index';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = 'https://www.oregonliquorsearch.com';
const SERVLET = `${BASE_URL}/servlet/FrontController`;
const AGE_GATE = `${BASE_URL}/servlet/WelcomeController`;

/** Hard timeout for each individual HTTP request (ms). */
const REQUEST_TIMEOUT_MS = 10_000;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ─── Session management ───────────────────────────────────────────────────────

/**
 * Extract JSESSIONID value from one or more Set-Cookie header strings.
 * Returns the cookie in `JSESSIONID=<value>` format for use in a Cookie header,
 * stripping out attributes like Path, HttpOnly, Secure, etc.
 */
function extractJSessionId(setCookieValues: string[]): string {
  for (const raw of setCookieValues) {
    const match = raw.match(/JSESSIONID=([^;,\s]+)/i);
    if (match) {
      return `JSESSIONID=${match[1]}`;
    }
  }
  return '';
}

/**
 * Read all Set-Cookie values from a response, handling both the standard
 * getSetCookie() method (Node 20+) and the fallback get('set-cookie').
 */
function getSetCookieValues(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie();
    if (values.length > 0) return values;
  }
  const raw = headers.get('set-cookie');
  if (raw) return [raw];
  return [];
}

/**
 * Obtain a JSESSIONID cookie by passing through the OLCC age gate.
 * Returns a properly formatted Cookie header value (e.g. "JSESSIONID=abc123").
 */
async function getSession(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(AGE_GATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: 'btnSubmit=I%27m+21+or+older',
      redirect: 'manual',
      signal: controller.signal,
    });

    const cookie = extractJSessionId(getSetCookieValues(response.headers));
    if (cookie) {
      return cookie;
    }

    // Some environments follow the redirect automatically — try the location
    const location = response.headers.get('location');
    if (location) {
      const redirected = await fetch(location.startsWith('http') ? location : `${BASE_URL}${location}`, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'manual',
        signal: controller.signal,
      });
      return extractJSessionId(getSetCookieValues(redirected.headers));
    }

    return '';
  } finally {
    clearTimeout(timer);
  }
}

// ─── HTML parsing helpers ─────────────────────────────────────────────────────

/**
 * Extract the text content of all <td> cells in each <tr class="row|alt-row">
 * of a results table. Returns a 2D array: rows × cells.
 */
function parseTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const rowPattern = /<tr[^>]+class="(?:row|alt-row)"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      const text = cellMatch[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(text);
    }

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return rows;
}

/** Parse a price string like "$30.95" into a number. */
function parsePrice(priceStr: string): number | null {
  const match = priceStr.match(/\$([\d,.]+)/);
  if (!match) return null;
  const price = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(price) ? null : price;
}

/** Title-case a product name (e.g. "BUFFALO TRACE BOURBON" → "Buffalo Trace Bourbon"). */
function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\b(Of|And|The|In|For|On|At|To|By|Or|A|An)\b/g, (w) => w.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

async function fetchWithSession(url: string, cookie: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Cookie: cookie,
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `OLCC request failed: ${response.status} ${response.statusText} — ${url}`,
      );
    }

    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search the OLCC product catalog for bottles matching `query`.
 *
 * Returns product-level results with OLCC statewide pricing. Each result
 * represents a distinct product variant (e.g., Buffalo Trace 750ml vs 1L).
 *
 * @param query   - Spirit name, brand, or category (e.g. "Buffalo Trace")
 * @param zipCode - Oregon ZIP code (used for OLCC search context)
 * @returns       List of matching OLCC products with prices and sizes
 */
export async function searchOregonLiquor(
  query: string,
  zipCode?: string,
): Promise<LiquorStoreResult[]> {
  if (!query.trim()) {
    return [];
  }

  // ── Step 1: establish session ──────────────────────────────────────────────
  let cookie: string;
  try {
    cookie = await getSession();
  } catch (err) {
    throw new Error(
      `Failed to connect to Oregon Liquor Search: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!cookie) {
    throw new Error(
      'Oregon Liquor Search: could not establish session (no JSESSIONID received). The OLCC site may be down.',
    );
  }

  // ── Step 2: product list search ────────────────────────────────────────────
  // The OLCC servlet returns 500 when locationSearchParam is empty and
  // radiusSearchParam is 0. Default to Portland (97201) with a large radius
  // so the query still works statewide when no zip is provided.
  const effectiveZip = zipCode || '97201';
  const radius = zipCode ? '10' : '100';

  const searchUrl = new URL(SERVLET);
  searchUrl.searchParams.set('view', 'global');
  searchUrl.searchParams.set('action', 'search');
  searchUrl.searchParams.set('productSearchParam', query.trim());
  searchUrl.searchParams.set('locationSearchParam', effectiveZip);
  searchUrl.searchParams.set('radiusSearchParam', radius);

  let productListHtml: string;
  try {
    productListHtml = await fetchWithSession(searchUrl.toString(), cookie);
  } catch (err) {
    throw new Error(
      `Oregon Liquor Search product query failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Check for server error page
  if (productListHtml.includes('500 Error') || productListHtml.includes('Server Error')) {
    throw new Error(
      'Oregon Liquor Search returned a server error. The site may be temporarily unavailable.',
    );
  }

  // Check for no results
  if (
    productListHtml.includes('no results') ||
    productListHtml.includes('No products found') ||
    !productListHtml.includes('productRowNum')
  ) {
    return [];
  }

  // ── Step 3: parse product list table ───────────────────────────────────────
  // Product list columns:
  //   [0] New Item Code  [1] Item Code  [2] Description
  //   [3] Category       [4] Size       [5] Proof
  //   [6] Age            [7] Case Price [8] Bottle Price
  const rows = parseTableRows(productListHtml);

  const results: LiquorStoreResult[] = [];

  for (const cells of rows) {
    if (cells.length < 9) continue;

    const description = cells[2] ?? '';
    const category = cells[3] ?? '';
    const size = cells[4] ?? '';
    const proofStr = cells[5] ?? '';
    const bottlePrice = parsePrice(cells[8] ?? '');
    const itemCode = cells[1] ?? '';

    const proof = parseFloat(proofStr);

    results.push({
      storeName: 'OLCC — All Oregon Liquor Stores',
      storeAddress: category.replace(/\|/g, ' / '),
      city: '',
      state: 'OR',
      zipCode: '',
      price: bottlePrice,
      bottleSize: size,
      inStock: true, // Listed in the OLCC catalog
      productName: titleCase(description),
      category: category.replace(/\|/g, ' / '),
      proof: isNaN(proof) ? undefined : proof,
      itemCode,
    });
  }

  // Sort by price ascending (cheapest first), nulls last
  results.sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });

  return results;
}

/**
 * Oregon Liquor and Cannabis Commission (OLCC) search integration.
 *
 * The OLCC does not expose a public JSON API. This module reverse-engineers
 * their HTML-based servlet to perform a two-step search:
 *
 *   Step 1 — Product list:
 *     GET /servlet/FrontController?view=global&action=search
 *       &productSearchParam=<query>
 *       &locationSearchParam=<zip>
 *       &radiusSearchParam=10
 *
 *     Returns an HTML table of matching products with item codes.
 *
 *   Step 2 — Store locations for each matching product:
 *     Session is already established after step 1; the server stores query
 *     context in a server-side session keyed by productRowNum.
 *     GET /servlet/FrontController?view=productlocation&action=search
 *       &productRowNum=<n>&column=Distance
 *
 *     Returns an HTML table of stores carrying that product, with quantities
 *     and distances.
 *
 * Important: The OLCC site requires a valid Java session cookie (JSESSIONID).
 * We obtain it by first hitting the age-gate POST, then carrying the cookie
 * through subsequent requests.
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

/** Maximum number of matching products to fetch store details for. */
const MAX_PRODUCTS = 5;

// ─── Session management ───────────────────────────────────────────────────────

/**
 * Obtain a JSESSIONID cookie by passing through the OLCC age gate.
 * Returns the raw Set-Cookie value(s) to replay in subsequent requests.
 */
async function getSession(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(AGE_GATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent':
          'Mozilla/5.0 (compatible; findadram/1.0; +https://findadram.com)',
      },
      body: 'btnSubmit=I%27m+21+or+older',
      redirect: 'manual', // capture the redirect without following it
      signal: controller.signal,
    });

    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      return setCookie;
    }

    // Some environments follow the redirect automatically — try the location
    const location = response.headers.get('location');
    if (location) {
      // The session may be embedded in a subsequent request; try the redirected URL
      const redirected = await fetch(location.startsWith('http') ? location : `${BASE_URL}${location}`, {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; findadram/1.0; +https://findadram.com)',
        },
        redirect: 'manual',
        signal: controller.signal,
      });
      return redirected.headers.get('set-cookie') ?? '';
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
  // Match table rows that are data rows (row or alt-row classes)
  const rowPattern = /<tr[^>]+class="(?:row|alt-row)"[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cells: string[] = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      // Strip all HTML tags and decode basic entities
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

/**
 * Pull productRowNum and item codes out of the onclick handlers in the
 * product list page so we can request store details for each match.
 */
function parseProductLinks(html: string): Array<{ rowNum: number; itemCode: string; newItemCode: string }> {
  const products: Array<{ rowNum: number; itemCode: string; newItemCode: string }> = [];
  const pattern =
    /productRowNum=(\d+)&(?:amp;)?columnParam=Description&(?:amp;)?itemCode=([^&"]+)&(?:amp;)?newItemCode=([^'"]+)/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = pattern.exec(html)) !== null) {
    const key = `${match[1]}-${match[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      products.push({
        rowNum: parseInt(match[1], 10),
        itemCode: match[2],
        newItemCode: match[3],
      });
    }
  }

  return products;
}

/**
 * Extract bottle price from a product-details page.
 * Returns the retail bottle price in USD, or null if not found.
 */
function parseBottlePrice(html: string): number | null {
  const match = html.match(/Bottle Price.*?\$([\d.]+)/i);
  if (match) {
    const price = parseFloat(match[1]);
    return isNaN(price) ? null : price;
  }
  return null;
}

/**
 * Extract bottle size from a product-details page.
 */
function parseBottleSize(html: string): string {
  const match = html.match(/<th>Size:<\/th>\s*<td>([^<]+)<\/td>/i);
  return match ? match[1].trim() : '';
}

/** Convert a distance string like "1.2 Miles" to meters. */
function milesToMeters(milesStr: string): number | undefined {
  const match = milesStr.match(/([\d.]+)\s*miles?/i);
  if (!match) return undefined;
  return Math.round(parseFloat(match[1]) * 1609.34);
}

// ─── Main fetch functions ─────────────────────────────────────────────────────

async function fetchWithSession(url: string, cookie: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Cookie: cookie,
        'User-Agent':
          'Mozilla/5.0 (compatible; findadram/1.0; +https://findadram.com)',
        Accept: 'text/html,application/xhtml+xml',
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
 * Search the OLCC product locator for bottles matching `query`, optionally
 * filtered to stores within 10 miles of the given ZIP code.
 *
 * @param query   - Spirit name, brand, or category (e.g. "Buffalo Trace")
 * @param zipCode - Oregon ZIP code to center the radius search around
 * @returns       Deduplicated list of stores with stock info, sorted by distance
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

  // ── Step 2: product list search ────────────────────────────────────────────
  const searchUrl = new URL(SERVLET);
  searchUrl.searchParams.set('view', 'global');
  searchUrl.searchParams.set('action', 'search');
  searchUrl.searchParams.set('productSearchParam', query.trim());
  searchUrl.searchParams.set('locationSearchParam', zipCode ?? '');
  searchUrl.searchParams.set('radiusSearchParam', zipCode ? '10' : '0');

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

  // ── Step 3: parse product list and extract item codes ──────────────────────
  const products = parseProductLinks(productListHtml).slice(0, MAX_PRODUCTS);

  if (products.length === 0) {
    return [];
  }

  // We need to re-issue the search so that the server stores the session context
  // for productRowNum lookups. The first GET above established this context.
  // Now fetch store details for each product in parallel.

  // ── Step 4: fetch store locations for each product ─────────────────────────
  const storeResults = await Promise.allSettled(
    products.map(async (product) => {
      // Fetch the product-details page which includes store list
      const detailsUrl = new URL(SERVLET);
      detailsUrl.searchParams.set('view', 'productlocation');
      detailsUrl.searchParams.set('action', 'search');
      detailsUrl.searchParams.set('productRowNum', String(product.rowNum));
      detailsUrl.searchParams.set('column', 'Distance');

      const detailsHtml = await fetchWithSession(detailsUrl.toString(), cookie);

      const bottlePrice = parseBottlePrice(detailsHtml);
      const bottleSize = parseBottleSize(detailsHtml);

      // Parse store table rows
      // Columns: Store No | City | Address | ZIP | Phone | Hours | Qty | Distance
      const rows = parseTableRows(detailsHtml);

      return rows.map((cells): LiquorStoreResult => {
        const city = cells[1] ?? '';
        const address = cells[2] ?? '';
        const zip = cells[3] ?? '';
        const phone = cells[4] ?? '';
        const hours = cells[5] ?? '';
        const qtyStr = cells[6] ?? '0';
        const distanceStr = cells[7] ?? '';

        const quantity = parseInt(qtyStr.replace(/,/g, ''), 10);

        return {
          storeName: `Oregon Liquor Store #${cells[0] ?? ''}`.trim(),
          storeAddress: address,
          city,
          state: 'OR',
          zipCode: zip,
          price: bottlePrice,
          bottleSize,
          inStock: !isNaN(quantity) && quantity > 0,
          distanceMeters: milesToMeters(distanceStr),
          quantity: isNaN(quantity) ? undefined : quantity,
          phone: phone || undefined,
          storeHours: hours || undefined,
        };
      });
    }),
  );

  // ── Step 5: flatten, deduplicate, sort ─────────────────────────────────────
  const allStores: LiquorStoreResult[] = [];
  const seenKeys = new Set<string>();

  for (const result of storeResults) {
    if (result.status === 'fulfilled') {
      for (const store of result.value) {
        // Deduplicate by address + zip + bottleSize
        const key = `${store.storeAddress}|${store.zipCode}|${store.bottleSize}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allStores.push(store);
        }
      }
    }
    // Silently swallow per-product failures so partial results still return
  }

  // Sort: in-stock first, then by distance ascending
  allStores.sort((a, b) => {
    if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
    const da = a.distanceMeters ?? Infinity;
    const db = b.distanceMeters ?? Infinity;
    return da - db;
  });

  return allStores;
}

/**
 * OLCC (Oregon Liquor and Cannabis Commission) whiskey importer.
 *
 * Downloads the OLCC monthly pricing CSV from the Oregon Open Data portal,
 * filters to whiskey/bourbon/scotch/rye categories, normalises the data using
 * the existing normalizeWhiskeyName pipeline, deduplicates by normalized name,
 * and writes a ready-to-apply SQL file at supabase/seed-olcc.sql.
 *
 * Usage:
 *   npx tsx scripts/import-olcc.ts
 *
 * No extra dependencies required — uses only Node built-ins + the local
 * normalizeWhiskeyName function from src/lib/trawler/normalize.ts.
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { normalizeWhiskeyName } from '../src/lib/trawler/normalize';
import type { WhiskeyType } from '../src/types/database';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OLCC_CSV_URL =
  'https://data.oregon.gov/api/views/vmf2-f83h/rows.csv?accessType=DOWNLOAD';

const OUT_PATH = resolve(process.cwd(), 'supabase/seed-olcc.sql');

// Category substrings → WhiskeyType
// Keys are tested with .includes() against the upper-cased Category value.
const CATEGORY_TYPE_MAP: Array<{ pattern: string; type: WhiskeyType }> = [
  { pattern: 'SINGLE MALT SCOTCH',   type: 'single_malt' },
  { pattern: 'BLENDED SCOTCH',       type: 'blended'     },
  { pattern: 'SCOTCH',               type: 'scotch'      },
  { pattern: 'BOURBON',              type: 'bourbon'     },
  { pattern: 'TENNESSEE',            type: 'bourbon'     }, // Tennessee whiskey is bourbon-adjacent
  { pattern: 'STRAIGHT RYE',         type: 'rye'         },
  { pattern: 'RYE WHISK',            type: 'rye'         },
  { pattern: 'CANADIAN WHISK',       type: 'canadian'    },
  { pattern: 'IRISH WHISK',          type: 'irish'       },
  { pattern: 'JAPANESE WHISK',       type: 'japanese'    },
  { pattern: 'SINGLE MALT',          type: 'single_malt' },
  { pattern: 'BLENDED WHISK',        type: 'blended'     },
  { pattern: 'AMERICAN WHISK',       type: 'other'       }, // catch-all American
  { pattern: 'WHISK',                type: 'other'       }, // anything else with whisk
];

// Distillery inference rules: regex pattern → canonical distillery name.
// Tested against the upper-cased description after brand-name extraction.
const DISTILLERY_PATTERNS: Array<{ pattern: RegExp; distillery: string }> = [
  { pattern: /\bBUFFALO\s+TRACE\b/i,         distillery: 'Buffalo Trace'         },
  { pattern: /\bWOODFORD\s+RESERVE\b/i,       distillery: 'Woodford Reserve'      },
  { pattern: /\bMAKER'?S?\s+MARK\b/i,         distillery: "Maker's Mark"          },
  { pattern: /\bWILD\s+TURKEY\b/i,            distillery: 'Wild Turkey'           },
  { pattern: /\bFOUR\s+ROSES\b/i,             distillery: 'Four Roses'            },
  { pattern: /\bKNOB\s+CREEK\b/i,             distillery: 'Knob Creek'            },
  { pattern: /\bBOOKER'?S?\b/i,               distillery: "Booker's"              },
  { pattern: /\bBASIL\s+HAYDEN'?S?\b/i,       distillery: 'Basil Hayden'          },
  { pattern: /\bJIM\s+BEAM\b/i,               distillery: 'Jim Beam'              },
  { pattern: /\bEVAN\s+WILLIAMS\b/i,          distillery: 'Heaven Hill'           },
  { pattern: /\bELIJAH\s+CRAIG\b/i,           distillery: 'Heaven Hill'           },
  { pattern: /\bLARCENY\b/i,                  distillery: 'Heaven Hill'           },
  { pattern: /\bHEAVEN\s+HILL\b/i,            distillery: 'Heaven Hill'           },
  { pattern: /\bOLD\s+FORESTER\b/i,           distillery: 'Brown-Forman'          },
  { pattern: /\bEARLY\s+TIMES\b/i,            distillery: 'Brown-Forman'          },
  { pattern: /\bWELLER\b/i,                   distillery: 'Buffalo Trace'         },
  { pattern: /\bBLANTON'?S?\b/i,              distillery: 'Buffalo Trace'         },
  { pattern: /\bEAGLE\s+RARE\b/i,             distillery: 'Buffalo Trace'         },
  { pattern: /\bPAPY\s+VAN\s+WINKLE\b/i,      distillery: 'Buffalo Trace'         },
  { pattern: /\bVAN\s+WINKLE\b/i,             distillery: 'Buffalo Trace'         },
  { pattern: /\bANGEL'?S?\s+ENVY\b/i,         distillery: "Angel's Envy"          },
  { pattern: /\b1792\b/,                       distillery: 'Barton 1792'           },
  { pattern: /\bMICHTER'?S?\b/i,               distillery: "Michter's"             },
  { pattern: /\bRUSSELL'?S?\b/i,               distillery: 'Wild Turkey'           },
  { pattern: /\bTEMPLETON\s+RYE\b/i,          distillery: 'Templeton Rye'         },
  { pattern: /\bSAZERAC\b/i,                   distillery: 'Sazerac'               },
  { pattern: /\bTHOMAS\s+H\.?\s*HANDY\b/i,     distillery: 'Buffalo Trace'         },
  { pattern: /\bGEORGE\s+T\.?\s*STAGG\b/i,     distillery: 'Buffalo Trace'         },
  { pattern: /\bGLENLIVET\b/i,                 distillery: 'The Glenlivet'         },
  { pattern: /\bGLENFIDDICH\b/i,               distillery: 'Glenfiddich'           },
  { pattern: /\bMACCALLAN\b|MACALLAN\b/i,      distillery: 'The Macallan'          },
  { pattern: /\bLAGAVULIN\b/i,                 distillery: 'Lagavulin'             },
  { pattern: /\bLAPHROAIG\b/i,                 distillery: 'Laphroaig'             },
  { pattern: /\bARDBEG\b/i,                    distillery: 'Ardbeg'                },
  { pattern: /\bBRUILCHLADDICH\b|BRUICHLADDICH\b/i, distillery: 'Bruichladdich'  },
  { pattern: /\bBALVENIE\b/i,                  distillery: 'The Balvenie'          },
  { pattern: /\bDALMORE\b/i,                   distillery: 'The Dalmore'           },
  { pattern: /\bGLENMORANGIE\b/i,              distillery: 'Glenmorangie'          },
  { pattern: /\bHIGHLAND\s+PARK\b/i,           distillery: 'Highland Park'         },
  { pattern: /\bBOWMORE\b/i,                   distillery: 'Bowmore'               },
  { pattern: /\bOBAN\b/i,                      distillery: 'Oban'                  },
  { pattern: /\bDEWAR'?S?\b/i,                 distillery: "Dewar's"               },
  { pattern: /\bJOHNNIE\s+WALKER\b/i,          distillery: 'Johnnie Walker'        },
  { pattern: /\bCHIVAS\s+REGAL\b/i,            distillery: 'Chivas Regal'          },
  { pattern: /\bGRANT'?S?\b/i,                 distillery: "Grant's"               },
  { pattern: /\bBUSHMILL'?S?\b/i,              distillery: 'Bushmills'             },
  { pattern: /\bJAMESON\b/i,                   distillery: 'Jameson'               },
  { pattern: /\bTULLAMORE\b/i,                 distillery: 'Tullamore D.E.W.'      },
  { pattern: /\bPOWERS\b/i,                    distillery: 'Powers'                },
  { pattern: /\bREDWOOD\s+EMPIRE\b/i,          distillery: 'Redwood Empire'        },
  { pattern: /\bWESTWARD\b/i,                  distillery: 'Westward Whiskey'      },
  { pattern: /\bBULL\s+RUN\b/i,               distillery: 'Bull Run Distillery'   },
  { pattern: /\bNEW\s+DEAL\b/i,               distillery: 'New Deal Distillery'   },
  { pattern: /\bSTONE\s+BARN\b/i,             distillery: 'Stone Barn Brandyworks'},
  { pattern: /\bFREELAND\b/i,                 distillery: 'Freeland Spirits'      },
  { pattern: /\bHOUSE\s+SPIRITS\b/i,          distillery: 'House Spirits'         },
  { pattern: /\bMCCARTHY'?S?\b/i,             distillery: 'Clear Creek Distillery'},
  { pattern: /\bCLEAR\s+CREEK\b/i,            distillery: 'Clear Creek Distillery'},
  { pattern: /\bNIKKA\b/i,                    distillery: 'Nikka'                 },
  { pattern: /\bSUNTORY\b/i,                  distillery: 'Suntory'               },
  { pattern: /\bYAMAZAKI\b/i,                 distillery: 'Suntory'               },
  { pattern: /\bHAKUSHU\b/i,                  distillery: 'Suntory'               },
  { pattern: /\bHIBIKI\b/i,                   distillery: 'Suntory'               },
  { pattern: /\bCROWN\s+ROYAL\b/i,            distillery: 'Crown Royal'           },
  { pattern: /\bCLYDE\s+MAY'?S?\b/i,          distillery: "Clyde May's"           },
  { pattern: /\bPICHT\b|PICHTS\b/i,           distillery: 'Prichard\'s'           },
];

// Country lookup by type
const TYPE_COUNTRY: Partial<Record<WhiskeyType, string>> = {
  bourbon:     'US',
  rye:         'US',
  scotch:      'GB',
  single_malt: 'GB',
  blended:     'GB',
  irish:       'IE',
  japanese:    'JP',
  canadian:    'CA',
  other:       'US',
};

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

/** Very simple RFC-4180-compatible CSV parser (handles quoted fields). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCsvRow(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvRow(line);
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = values[j] ?? '';
    }
    records.push(record);
  }

  return records;
}

/** Parse one CSV row into an array of field values. */
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;

  while (i < line.length) {
    if (line[i] === '"') {
      // Quoted field
      let field = '';
      i++; // skip opening quote
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          field += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          field += line[i];
          i++;
        }
      }
      fields.push(field);
      // Skip trailing comma
      if (line[i] === ',') i++;
    } else {
      // Unquoted field
      const start = i;
      while (i < line.length && line[i] !== ',') i++;
      fields.push(line.slice(start, i));
      if (line[i] === ',') i++;
    }
  }

  // Handle trailing comma (empty last field)
  if (line.endsWith(',')) fields.push('');

  return fields;
}

// ---------------------------------------------------------------------------
// Type inference
// ---------------------------------------------------------------------------

function inferType(category: string): WhiskeyType | null {
  const upper = category.toUpperCase();
  for (const { pattern, type } of CATEGORY_TYPE_MAP) {
    if (upper.includes(pattern)) return type;
  }
  return null;
}

function inferDistillery(description: string): string | null {
  for (const { pattern, distillery } of DISTILLERY_PATTERNS) {
    if (pattern.test(description)) return distillery;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Name cleaning
// ---------------------------------------------------------------------------

/**
 * Produce a display-quality name from the OLCC Description field.
 *
 * OLCC descriptions are ALL-CAPS with trailing size and other noise:
 *   "BUFFALO TRACE BOURBON WHSKY 750ML" → "Buffalo Trace Bourbon"
 *   "LAPHROAIG 10 YR SINGLE MALT SCOTCH 750ML" → "Laphroaig 10 Year Single Malt Scotch"
 *
 * Strategy:
 *  1. Strip the size suffix (e.g., "1.75L", "750ML", "375ML", "1L", "50ML").
 *  2. Convert to title case.
 *  3. Fix common abbreviations (YR → Year, etc.).
 *  4. Strip obvious filler suffixes.
 */
function cleanName(raw: string): string {
  let s = raw.trim();

  // 1. Strip trailing size: 1.75L, 1L, 750ML, 375ML, 200ML, 100ML, 50ML
  s = s.replace(/\s+\d+(?:\.\d+)?\s*(?:ML|L)\s*$/i, '');

  // 2. Strip trailing "W/" followed by anything (e.g., "W/ GLASSES")
  s = s.replace(/\s+W\/.*$/i, '');

  // 3. Strip trailing parenthetical size codes, like "(750)" or "(1.75)"
  s = s.replace(/\s*\(\d+(?:\.\d+)?\)\s*$/, '');

  // 4. Title-case
  s = s
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());

  // 5. Fix abbreviations
  s = s
    .replace(/\bYr\b/g, 'Year')
    .replace(/\bYrs\b/g, 'Years')
    .replace(/\bYo\b/g, 'Year Old')
    .replace(/\bSgl\b/g, 'Single')
    .replace(/\bSm\b/g, 'Single Malt')
    .replace(/\bSt\b/g, 'Straight')
    .replace(/\bBrbn\b/g, 'Bourbon')
    .replace(/\bBbn\b/g, 'Bourbon')
    .replace(/\bAmrcn\b/g, 'American')
    .replace(/\bWhsky\b/g, 'Whiskey')
    .replace(/\bWhskey\b/g, 'Whiskey')
    .replace(/\bScotch Whsky\b/g, 'Scotch Whisky')
    .replace(/\bKy\b/g, 'Kentucky')
    .replace(/\bSb\b/g, 'Single Barrel');

  return s.trim();
}

// ---------------------------------------------------------------------------
// Age extraction
// ---------------------------------------------------------------------------

function extractAge(rawAge: string, description: string): number | null {
  // Try the dedicated Age column first
  if (rawAge && rawAge.trim()) {
    const n = parseInt(rawAge.trim(), 10);
    if (!isNaN(n) && n > 0 && n < 100) return n;
  }

  // Fall back to parsing from description
  const ageMatch = description.match(/\b(\d{1,2})\s*(?:yr|yrs|year|years|yo|y\.o\.)\b/i);
  if (ageMatch) {
    const n = parseInt(ageMatch[1], 10);
    if (n > 0 && n < 100) return n;
  }

  return null;
}

// ---------------------------------------------------------------------------
// ABV extraction
// ---------------------------------------------------------------------------

function extractAbv(rawProof: string): number | null {
  if (!rawProof || !rawProof.trim()) return null;
  const n = parseFloat(rawProof.trim());
  if (isNaN(n) || n <= 0) return null;
  // OLCC Proof column is actual proof (double the ABV)
  return Math.round((n / 2) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Size normalisation
// ---------------------------------------------------------------------------

function normalizeSize(rawSize: string): string | null {
  if (!rawSize || !rawSize.trim()) return null;
  const s = rawSize.trim().toUpperCase();
  // Common OLCC size values: "750ML", "1.75L", "1L", "375ML", "200ML", "50ML"
  return s;
}

// ---------------------------------------------------------------------------
// Price extraction
// ---------------------------------------------------------------------------

function extractPrice(rawPrice: string): number | null {
  if (!rawPrice || !rawPrice.trim()) return null;
  // Strip leading dollar sign
  const n = parseFloat(rawPrice.replace(/[$,]/g, '').trim());
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// SQL escaping
// ---------------------------------------------------------------------------

function escSql(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

// ---------------------------------------------------------------------------
// Structured item type
// ---------------------------------------------------------------------------

interface OlccItem {
  olccItemCode: string;
  name: string;
  normalizedName: string;
  distillery: string | null;
  type: WhiskeyType;
  age: number | null;
  abv: number | null;
  country: string;
  size: string | null;
  price: number | null;
  category: string;
}

// ---------------------------------------------------------------------------
// Deduplication key
// ---------------------------------------------------------------------------

/** Returns the dedup key matching the DB unique index: (normalized_name, coalesce(distillery, '')) */
function dedupKey(normalizedName: string, distillery: string | null): string {
  return `${normalizedName}||${distillery ?? ''}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Fetching OLCC pricing CSV...');
  console.log(`  URL: ${OLCC_CSV_URL}`);

  let csvText: string;
  try {
    const response = await fetch(OLCC_CSV_URL, {
      headers: {
        'User-Agent': 'findadram/1.0 (Portland whiskey discovery app; github.com/findadram)',
        Accept: 'text/csv,text/plain,*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    csvText = await response.text();
    console.log(`  Downloaded ${(csvText.length / 1024).toFixed(1)} KB`);
  } catch (err) {
    console.error('Failed to download OLCC CSV:', err);
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Parse CSV
  // ---------------------------------------------------------------------------

  console.log('Parsing CSV...');
  const records = parseCsv(csvText);
  console.log(`  ${records.length.toLocaleString()} total rows`);

  if (records.length === 0) {
    console.error('CSV parsed to 0 records — check URL or format');
    process.exit(1);
  }

  // Log headers for diagnostics
  const headers = Object.keys(records[0]);
  console.log(`  Columns: ${headers.join(', ')}`);

  // ---------------------------------------------------------------------------
  // Filter to whiskey categories + active items
  // ---------------------------------------------------------------------------

  const whiskeyRecords = records.filter((row) => {
    // Must be active
    const status = (row['ItemStatus'] ?? row['Status'] ?? '').trim().toUpperCase();
    if (status && status !== 'A' && status !== 'LISTED' && status !== 'ACTIVE') return false;

    // Must match a whiskey category
    const category = (row['Category'] ?? row['CategoryName'] ?? '').toUpperCase();
    return inferType(category) !== null;
  });

  console.log(`  ${whiskeyRecords.length.toLocaleString()} whiskey/spirits rows after filtering`);

  if (whiskeyRecords.length === 0) {
    // Dump the first few categories to help diagnose
    const categories = [...new Set(records.slice(0, 200).map((r) => r['Category'] ?? r['CategoryName'] ?? ''))];
    console.error('No whiskey rows matched. Sample categories:');
    categories.slice(0, 20).forEach((c) => console.error('  ', JSON.stringify(c)));
    process.exit(1);
  }

  // ---------------------------------------------------------------------------
  // Transform rows → structured items
  // ---------------------------------------------------------------------------

  const items: OlccItem[] = [];

  for (const row of whiskeyRecords) {
    const rawCode    = row['ItemCode'] ?? row['item_code'] ?? '';
    const rawDesc    = row['Description'] ?? row['description'] ?? '';
    const rawCat     = row['Category'] ?? row['CategoryName'] ?? '';
    const rawAge     = row['Age'] ?? '';
    const rawProof   = row['Proof'] ?? '';
    const rawPrice   = row['PricePerBottle'] ?? row['SPA1'] ?? '';
    const rawSize    = row['Size'] ?? '';

    if (!rawCode || !rawDesc) continue;

    const type = inferType(rawCat);
    if (!type) continue;

    const name            = cleanName(rawDesc);
    const normalizedName  = normalizeWhiskeyName(name);
    const distillery      = inferDistillery(rawDesc);
    const age             = extractAge(rawAge, rawDesc);
    const abv             = extractAbv(rawProof);
    const country         = TYPE_COUNTRY[type] ?? 'US';
    const size            = normalizeSize(rawSize);
    const price           = extractPrice(rawPrice);

    items.push({
      olccItemCode: rawCode.trim(),
      name,
      normalizedName,
      distillery,
      type,
      age,
      abv,
      country,
      size,
      price,
      category: rawCat,
    });
  }

  console.log(`  ${items.length.toLocaleString()} items structured`);

  // ---------------------------------------------------------------------------
  // Deduplicate: prefer 750ml bottle; keep richest metadata
  // ---------------------------------------------------------------------------

  const deduped = new Map<string, OlccItem>();

  for (const item of items) {
    const key = dedupKey(item.normalizedName, item.distillery);
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, item);
      continue;
    }

    // Prefer 750ml entry as the canonical record
    const currentIs750  = item.size?.includes('750') ?? false;
    const existingIs750 = existing.size?.includes('750') ?? false;

    if (currentIs750 && !existingIs750) {
      // New entry is the better representative — keep it but preserve item code
      deduped.set(key, { ...item, olccItemCode: existing.olccItemCode });
    } else {
      // Fill in any missing fields from the current item
      if (!existing.age   && item.age)   existing.age = item.age;
      if (!existing.abv   && item.abv)   existing.abv = item.abv;
      if (!existing.price && item.price) existing.price = item.price;
    }
  }

  const canonical = [...deduped.values()];
  console.log(`  ${canonical.length.toLocaleString()} unique whiskeys after deduplication`);

  // ---------------------------------------------------------------------------
  // Summary by type
  // ---------------------------------------------------------------------------

  const byType = new Map<WhiskeyType, number>();
  for (const item of canonical) {
    byType.set(item.type, (byType.get(item.type) ?? 0) + 1);
  }
  console.log('\nBreakdown by type:');
  [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, n]) => console.log(`  ${t.padEnd(12)}: ${n.toLocaleString()}`));

  // ---------------------------------------------------------------------------
  // Generate SQL
  // ---------------------------------------------------------------------------

  console.log(`\nGenerating SQL → ${OUT_PATH}`);

  const now = new Date().toISOString();
  const asOfDate = whiskeyRecords[0]?.['AsOfDate'] ?? 'unknown';

  let sql = `-- =============================================================================
-- findadram OLCC whiskey seed data
-- Source: Oregon Liquor and Cannabis Commission (OLCC) monthly pricing list
-- Download URL: ${OLCC_CSV_URL}
-- OLCC data as-of date: ${asOfDate}
-- Generated: ${now} by scripts/import-olcc.ts
--
-- This file was auto-generated from real Oregon state liquor authority data.
-- The OLCC publishes retail price lists for all licensed products sold in Oregon.
-- Using this data ensures findadram has accurate, canonical whiskey records
-- for every bottle legally sold in Oregon.
--
-- Usage:
--   psql "$DATABASE_URL" -f supabase/seed-olcc.sql
--   OR apply via Supabase dashboard → SQL editor
--
-- The whiskeys table has a unique index on (normalized_name, coalesce(distillery, ''))
-- so this file is safe to re-run — existing rows are updated, new rows inserted.
-- =============================================================================

-- Ensure the whiskeys table has a metadata column for external IDs.
-- This is idempotent — no-op if the column already exists.
ALTER TABLE whiskeys ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- =============================================================================
-- WHISKEYS (${canonical.length.toLocaleString()} unique bottles from OLCC data)
-- =============================================================================

`;

  // Build individual INSERT ... ON CONFLICT ... DO UPDATE statements.
  // We use individual statements (not multi-row) so each can be diagnosed
  // independently if there is a conflict or error.
  //
  // The upsert key matches the DB unique index:
  //   UNIQUE INDEX whiskeys_dedup_idx ON whiskeys (normalized_name, coalesce(distillery, ''))

  for (const item of canonical) {
    const metadata = JSON.stringify({
      olcc_item_code: item.olccItemCode,
      olcc_category:  item.category,
      olcc_size:      item.size,
      olcc_price:     item.price,
      source:         'olcc_monthly_price_list',
      imported_at:    now,
    }).replace(/'/g, "''");

    sql += `INSERT INTO whiskeys (name, distillery, country, type, age, abv, metadata)\n`;
    sql += `VALUES (\n`;
    sql += `  ${escSql(item.name)},\n`;
    sql += `  ${escSql(item.distillery)},\n`;
    sql += `  ${escSql(item.country)},\n`;
    sql += `  ${escSql(item.type)}::whiskey_type,\n`;
    sql += `  ${item.age !== null ? item.age : 'NULL'},\n`;
    sql += `  ${item.abv !== null ? item.abv : 'NULL'},\n`;
    sql += `  '${metadata}'\n`;
    sql += `)\n`;
    sql += `ON CONFLICT (normalized_name, coalesce(distillery, ''))\n`;
    sql += `DO UPDATE SET\n`;
    sql += `  abv        = COALESCE(EXCLUDED.abv, whiskeys.abv),\n`;
    sql += `  age        = COALESCE(EXCLUDED.age, whiskeys.age),\n`;
    sql += `  country    = COALESCE(EXCLUDED.country, whiskeys.country),\n`;
    sql += `  metadata   = whiskeys.metadata || EXCLUDED.metadata,\n`;
    sql += `  updated_at = now();\n\n`;
  }

  sql += `-- End of OLCC seed data (${canonical.length.toLocaleString()} whiskeys)\n`;

  // ---------------------------------------------------------------------------
  // Write output
  // ---------------------------------------------------------------------------

  writeFileSync(OUT_PATH, sql, 'utf-8');

  const sizeKb = (sql.length / 1024).toFixed(1);
  console.log(`\nDone!`);
  console.log(`  Output: ${OUT_PATH}`);
  console.log(`  Size:   ${sizeKb} KB`);
  console.log(`  Rows:   ${canonical.length.toLocaleString()} whiskeys`);
  console.log(`\nApply with:`);
  console.log(`  npx supabase db push`);
  console.log(`  -- or --`);
  console.log(`  psql "$DATABASE_URL" -f supabase/seed-olcc.sql`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

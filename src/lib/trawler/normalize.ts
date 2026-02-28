// ---------------------------------------------------------------------------
// Whiskey name normalization utilities
// Pure TypeScript — no external dependencies.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. Private barrel / store-pick detection
// ---------------------------------------------------------------------------

export interface PrivateBarrelResult {
  baseName: string;
  pickInfo: string | null;
}

/**
 * Separates the base whiskey name from any private-barrel / store-pick
 * designation.  The pick designation is preserved verbatim so it can be
 * stored as metadata on the whiskey record.
 */
export function parsePrivateBarrel(name: string): PrivateBarrelResult {
  // Normalise unicode dashes before matching so separators are consistent.
  const cleaned = name
    .replace(/[\u2014\u2013]/g, ' \u2014 ')
    .trim();

  // Try the inline separator pattern first (most common in menus).
  const inlineMatch = cleaned.match(
    /^(.+?)\s*[\u2014\u2013\-\|]\s*(.+?\b(?:private\s+barrel|private\s+selection|store\s+pick|single\s+barrel\s+select|barrel\s+pick|cask\s+select(?:ion)?)\b.*)$/i
  );
  if (inlineMatch) {
    return {
      baseName: inlineMatch[1].trim(),
      pickInfo: inlineMatch[2].trim(),
    };
  }

  // Try parenthesised / bracketed pick block.
  const parenMatch = cleaned.match(
    /^(.+?)\s*([(\[].*?\b(?:pick|private|selection|barrel\s+select)\b.*?[)\]])\s*(.*)$/i
  );
  if (parenMatch) {
    const trailing = parenMatch[3].trim();
    return {
      baseName: (parenMatch[1] + (trailing ? ' ' + trailing : '')).trim(),
      pickInfo: parenMatch[2].trim(),
    };
  }

  return { baseName: name.trim(), pickInfo: null };
}

// ---------------------------------------------------------------------------
// 2. Distillery name aliases
// ---------------------------------------------------------------------------

/**
 * Map from every known variant (already lowercased) to its canonical form.
 * Order matters only within the replacement pass — longer phrases first to
 * avoid partial matches.
 */
const DISTILLERY_ALIASES: ReadonlyArray<[pattern: RegExp, canonical: string]> =
  [
    [/\bbuffalo\s+trace\s+distillery\b/g, 'buffalo trace'],
    [/\bthe\s+macallan\b/g, 'macallan'],
    [/\bthe\s+glenlivet\b/g, 'glenlivet'],
    [/\bthe\s+glenfarclas\b/g, 'glenfarclas'],
    [/\bthe\s+dalmore\b/g, 'dalmore'],
    [/\bthe\s+balvenie\b/g, 'balvenie'],
    [/\bthe\s+glenrothes\b/g, 'glenrothes'],
    [/\bthe\s+glendronach\b/g, 'glendronach'],
    [/\bthe\s+glenmorangie\b/g, 'glenmorangie'],
    [/\bthe\s+singleton\b/g, 'singleton'],
    [/\bmaker[''`]?s\s+mark\b/g, "maker's mark"],
    [/\bwild\s+turkey\s+distillery\b/g, 'wild turkey'],
    [/\bjack\s+daniel[''`]?s\b/g, "jack daniel's"],
    [/\bwoodford\s+reserve\s+distillery\b/g, 'woodford reserve'],
    [/\bfour\s+roses\s+distillery\b/g, 'four roses'],
    [/\bbrown[- ]forman\b/g, 'brown-forman'],
    [/\blaphroaig\s+distillery\b/g, 'laphroaig'],
    [/\bhighland\s+park\s+distillery\b/g, 'highland park'],
  ];

function normalizeDistilleryNames(s: string): string {
  let out = s;
  for (const [pattern, canonical] of DISTILLERY_ALIASES) {
    out = out.replace(pattern, canonical);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3. Age statement normalization
// ---------------------------------------------------------------------------

/**
 * Collapses all age-statement variants into "<n> year".
 *
 * Handled patterns (case-insensitive):
 *   "12 Year Old", "12 YO", "12yr", "12-year", "12 Yr Old",
 *   "Aged 12 Years", "12-Year-Old"
 */
function normalizeAgeStatements(s: string): string {
  // "Aged N Years/Year/Yr" → "N year"
  s = s.replace(/\baged\s+(\d+)\s*(?:years?|yrs?|yo)\b/gi, '$1 year');

  // "N[-\s]Year[-\s]Old", "N YO", "N yr(s)", "N-yr" → "N year"
  s = s.replace(
    /\b(\d+)[-\s]?(?:year[s]?[-\s]?old|years?|yrs?|yo)\b/gi,
    '$1 year'
  );

  return s;
}

// ---------------------------------------------------------------------------
// 4. ABV / proof stripping
// ---------------------------------------------------------------------------

/**
 * Removes proof and ABV annotations from a name.
 *
 * Examples removed:
 *   "100 Proof", "86.4 Proof", "46%", "46.0% ABV", "ABV 46%"
 */
function stripAbvProof(s: string): string {
  // "100 proof" / "86.4 proof"
  s = s.replace(/\b\d+(?:\.\d+)?\s*proof\b/gi, '');
  // "ABV 46%", "ABV 46" (must come before bare % to avoid leaving orphan "abv")
  s = s.replace(/\babv\s+\d+(?:\.\d+)?\s*%?\s*/gi, '');
  // Standalone "abv" (left over if % was already stripped by another rule)
  s = s.replace(/\babv\b\s*/gi, '');
  // "46%", "46.0% ABV", "46% abv"
  s = s.replace(/\b\d+(?:\.\d+)?\s*%\s*(?:abv)?\s*/gi, '');
  return s;
}

// ---------------------------------------------------------------------------
// 5. Marketing suffix stripping
// ---------------------------------------------------------------------------

/**
 * Suffixes that carry no product-differentiating information on a bar menu.
 * We strip these after age/abv normalisation so patterns don't interfere.
 *
 * Suffixes to KEEP (meaningful): Cask Strength, Barrel Proof, Single Barrel,
 * Single Malt (when not followed by the full legal description), Peated, etc.
 */
const STRIP_SUFFIXES: ReadonlyArray<RegExp> = [
  // Full legal category descriptions
  /\bkentucky\s+straight\s+bourbon\s+whis(?:key|ky)\b/gi,
  /\bstraight\s+bourbon\s+whis(?:key|ky)\b/gi,
  /\bblended\s+(?:scotch\s+)?whis(?:key|ky)\b/gi,
  /\bsingle\s+malt\s+scotch\s+whis(?:key|ky)\b/gi,
  /\birish\s+whis(?:key|ky)\b/gi,
  /\bamerican\s+whis(?:key|ky)\b/gi,
  /\btennessee\s+whis(?:key|ky)\b/gi,
  /\bjapanese\s+whis(?:key|ky)\b/gi,
  /\bcanadian\s+whis(?:key|ky)\b/gi,
  /\bscotch\s+whis(?:key|ky)\b/gi,
  // Standalone "whiskey/whisky" at the end (likely redundant)
  /\bwhis(?:key|ky)\b$/gi,
  // "Distillery" trailing
  /\bdistillery\b$/gi,
];

function stripMarketingSuffixes(s: string): string {
  let out = s;
  for (const re of STRIP_SUFFIXES) {
    out = out.replace(re, '');
  }
  return out;
}

// ---------------------------------------------------------------------------
// 6. Punctuation & unicode normalisation
// ---------------------------------------------------------------------------

function normalizePunctuation(s: string): string {
  // Em dash / en dash → plain hyphen-minus with spaces
  s = s.replace(/\s*[\u2014\u2013]\s*/g, ' - ');
  // Fancy single quotes / apostrophes → straight apostrophe
  s = s.replace(/[\u2018\u2019\u201a\u201b\u2032\u2035`]/g, "'");
  // Fancy double quotes → straight double quote
  s = s.replace(/[\u201c\u201d\u201e\u201f\u2033\u2036]/g, '"');
  // Strip trademark / registered symbols
  s = s.replace(/[\u2122\u00ae\u00a9]/g, '');
  // Multiple hyphens → single hyphen
  s = s.replace(/-{2,}/g, '-');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ');
  return s;
}

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

/**
 * Full normalisation pipeline applied in dependency order:
 *
 *  1. Unicode / punctuation normalisation
 *  2. Strip trademarks & fancy quotes
 *  3. Lowercase
 *  4. Strip leading "The "
 *  5. Distillery alias resolution
 *  6. Strip ABV / proof annotations
 *  7. Strip marketing suffixes (legal category names)
 *  8. Age statement normalisation
 *  9. Strip straight/curly quote characters
 * 10. Collapse whitespace & trim
 */
export function normalizeWhiskeyName(name: string): string {
  let s = name;

  // Step 1 — unicode & punctuation
  s = normalizePunctuation(s);

  // Step 2 — lowercase (after punctuation so unicode replacements fire correctly)
  s = s.toLowerCase();

  // Step 3 — strip leading "the "
  s = s.replace(/^the\s+/i, '');

  // Step 4 — distillery aliases
  s = normalizeDistilleryNames(s);

  // Step 5 — strip ABV / proof
  s = stripAbvProof(s);

  // Step 6 — strip marketing suffixes
  s = stripMarketingSuffixes(s);

  // Step 7 — age statements
  s = normalizeAgeStatements(s);

  // Step 8 — strip remaining quote characters
  s = s.replace(/['"]/g, '');

  // Step 9 — collapse whitespace & trailing punctuation
  s = s
    .replace(/[-\s]+$/, '')   // trailing dashes / spaces
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

// ---------------------------------------------------------------------------
// 7. Similarity functions
// ---------------------------------------------------------------------------

function levenshteinDistance(a: string, b: string): number {
  // Use a single-row rolling approach for memory efficiency.
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: m + 1 }, (_, i) => i);
  let curr = new Array<number>(m + 1);

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1,       // deletion
        curr[i - 1] + 1,   // insertion
        prev[i - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}

/**
 * Returns a similarity score in [0, 1] based on normalised Levenshtein
 * edit distance between the two normalised whiskey names.
 * 1.0 = identical, 0.0 = completely different.
 */
export function similarityRatio(a: string, b: string): number {
  const s1 = normalizeWhiskeyName(a);
  const s2 = normalizeWhiskeyName(b);

  if (s1 === s2) return 1;
  if (s1.length === 0 && s2.length === 0) return 1;

  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length >= s2.length ? s2 : s1;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Returns a similarity score in [0, 1] based on shared word tokens
 * (order-independent).  Two names that share 80 %+ of their tokens are
 * likely the same product.
 *
 * Algorithm:
 *   - Split both normalised names into word tokens
 *   - Score = 2 × |intersection| / (|tokens_a| + |tokens_b|)   (Sørensen–Dice)
 *
 * Short filler words ("a", "of", "and", "in") are excluded from scoring to
 * avoid inflating similarity between unrelated names.
 */
const STOP_WORDS = new Set(['a', 'an', 'of', 'and', 'in', 'the', 'by', 'for']);

export function tokenSimilarity(a: string, b: string): number {
  const tokensA = tokenize(normalizeWhiskeyName(a));
  const tokensB = tokenize(normalizeWhiskeyName(b));

  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Build a frequency map for B so we handle duplicate tokens correctly.
  const freqB = new Map<string, number>();
  for (const t of tokensB) {
    freqB.set(t, (freqB.get(t) ?? 0) + 1);
  }

  let intersection = 0;
  for (const t of tokensA) {
    const count = freqB.get(t) ?? 0;
    if (count > 0) {
      intersection++;
      freqB.set(t, count - 1);
    }
  }

  // Sørensen–Dice coefficient
  return (2 * intersection) / (tokensA.length + tokensB.length);
}

function tokenize(s: string): string[] {
  return s
    .split(/[\s\-]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

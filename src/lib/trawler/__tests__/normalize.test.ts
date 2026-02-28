import { describe, it, expect } from 'vitest';
import {
  normalizeWhiskeyName,
  parsePrivateBarrel,
  tokenSimilarity,
  similarityRatio,
} from '../normalize';

// ---------------------------------------------------------------------------
// normalizeWhiskeyName
// ---------------------------------------------------------------------------

describe('normalizeWhiskeyName', () => {
  describe('basic lowercasing and trimming', () => {
    it('lowercases all characters', () => {
      expect(normalizeWhiskeyName('BUFFALO TRACE')).toBe('buffalo trace');
    });

    it('trims leading and trailing whitespace', () => {
      expect(normalizeWhiskeyName('  Maker\'s Mark  ')).toBe("maker's mark");
    });

    it('collapses internal whitespace', () => {
      expect(normalizeWhiskeyName('Wild   Turkey   101')).toBe('wild turkey 101');
    });

    it('returns empty string for blank input', () => {
      expect(normalizeWhiskeyName('   ')).toBe('');
    });
  });

  describe('leading "The" removal', () => {
    it('strips leading "The " (case-insensitive)', () => {
      // "12" has no age-statement word, so it is not converted to "12 year".
      expect(normalizeWhiskeyName('The Macallan 12')).toBe('macallan 12');
    });

    it('strips "THE " uppercase', () => {
      // Same reasoning — bare numbers without an age keyword are preserved as-is.
      expect(normalizeWhiskeyName('THE Balvenie 14')).toBe('balvenie 14');
    });

    it('does not strip "The" when not at the start', () => {
      // The leading-"The" strip only fires on /^the\s+/; mid-string "the" is preserved.
      const result = normalizeWhiskeyName('Glenlivet The Edition');
      expect(result).toBe('glenlivet the edition');
    });
  });

  describe('ABV / proof stripping', () => {
    it('strips integer proof annotation (including the proof number)', () => {
      // The regex \b\d+(?:\.\d+)?\s*proof\b matches "101 proof" in its entirety,
      // so "Wild Turkey 101 Proof" becomes "Wild Turkey".
      expect(normalizeWhiskeyName('Wild Turkey 101 Proof')).toBe('wild turkey');
    });

    it('strips decimal proof annotation (including the proof number)', () => {
      expect(normalizeWhiskeyName("Booker's 127.4 Proof")).toBe("booker's");
    });

    it('strips percentage ABV annotation', () => {
      // "10" has no age-statement word following it; stays as bare "10".
      expect(normalizeWhiskeyName('Laphroaig 10 46%')).toBe('laphroaig 10');
    });

    it('strips "% ABV" annotation', () => {
      expect(normalizeWhiskeyName('Ardbeg 10 46.0% ABV')).toBe('ardbeg 10');
    });

    it('strips "ABV N%" prefix form', () => {
      expect(normalizeWhiskeyName('ABV 46% Ardbeg')).toBe('ardbeg');
    });
  });

  describe('age statement normalization', () => {
    it('normalises "12 Year Old" → "12 year"', () => {
      expect(normalizeWhiskeyName('Glenfiddich 12 Year Old')).toBe('glenfiddich 12 year');
    });

    it('normalises "18 YO" → "18 year"', () => {
      expect(normalizeWhiskeyName('Macallan 18 YO')).toBe('macallan 18 year');
    });

    it('normalises "12yr" → "12 year"', () => {
      expect(normalizeWhiskeyName('Glenlivet 12yr')).toBe('glenlivet 12 year');
    });

    it('normalises "12-year" → "12 year"', () => {
      expect(normalizeWhiskeyName('Oban 14-Year')).toBe('oban 14 year');
    });

    it('normalises "Aged 12 Years" → "12 year"', () => {
      expect(normalizeWhiskeyName('Aged 12 Years Single Malt')).toBe('12 year single malt');
    });

    it('normalises "12-Year-Old" → "12 year"', () => {
      expect(normalizeWhiskeyName('Highland Park 12-Year-Old')).toBe('highland park 12 year');
    });

    it('normalises "12 Years" → "12 year"', () => {
      expect(normalizeWhiskeyName('Glenmorangie 10 Years')).toBe('glenmorangie 10 year');
    });
  });

  describe('marketing suffix removal', () => {
    it('strips "Kentucky Straight Bourbon Whiskey"', () => {
      expect(normalizeWhiskeyName('Buffalo Trace Kentucky Straight Bourbon Whiskey')).toBe(
        'buffalo trace'
      );
    });

    it('strips "Straight Bourbon Whiskey"', () => {
      expect(normalizeWhiskeyName('Maker\'s Mark Straight Bourbon Whiskey')).toBe("maker's mark");
    });

    it('strips "Single Malt Scotch Whisky"', () => {
      expect(normalizeWhiskeyName('Glenfiddich 12 Year Old Single Malt Scotch Whisky')).toBe(
        'glenfiddich 12 year'
      );
    });

    it('strips "Irish Whiskey"', () => {
      // "12" has no age-statement word following it, so it is not converted to "12 year".
      expect(normalizeWhiskeyName('Redbreast 12 Irish Whiskey')).toBe('redbreast 12');
    });

    it('strips "Scotch Whisky" suffix', () => {
      expect(normalizeWhiskeyName('Johnnie Walker Black Scotch Whisky')).toBe(
        'johnnie walker black'
      );
    });

    it('strips trailing "Distillery"', () => {
      expect(normalizeWhiskeyName('Springbank Distillery')).toBe('springbank');
    });

    it('strips "Blended Scotch Whisky"', () => {
      // "12" has no age-statement word after it, so it is not converted to "12 year".
      expect(normalizeWhiskeyName("Dewar's 12 Blended Scotch Whisky")).toBe("dewar's 12");
    });
  });

  describe('distillery alias resolution', () => {
    it('resolves "Buffalo Trace Distillery" → "buffalo trace"', () => {
      expect(normalizeWhiskeyName('Buffalo Trace Distillery Single Barrel')).toBe(
        'buffalo trace single barrel'
      );
    });

    it('resolves "The Macallan" → "macallan" (via leading-The strip)', () => {
      // Leading "the " is removed in step 3; bare number 18 has no age keyword.
      expect(normalizeWhiskeyName('The Macallan 18')).toBe('macallan 18');
    });

    it('resolves "The Glenlivet" → "glenlivet" (via leading-The strip)', () => {
      expect(normalizeWhiskeyName('The Glenlivet 12')).toBe('glenlivet 12');
    });

    it('resolves "The Balvenie" → "balvenie" (via leading-The strip)', () => {
      expect(normalizeWhiskeyName('The Balvenie 14')).toBe('balvenie 14');
    });

    it('resolves curly-apostrophe variant of Maker\'s Mark', () => {
      expect(normalizeWhiskeyName('Maker\u2019s Mark')).toBe("maker's mark");
    });

    it('resolves "Wild Turkey Distillery" → "wild turkey"', () => {
      expect(normalizeWhiskeyName('Wild Turkey Distillery 101')).toBe('wild turkey 101');
    });

    it('resolves "Brown-Forman" hyphen variant', () => {
      expect(normalizeWhiskeyName('Brown-Forman Select')).toBe('brown-forman select');
    });
  });

  describe('unicode and punctuation normalization', () => {
    it('converts em dash to spaced hyphen', () => {
      // em dash U+2014 between words should become " - "
      const result = normalizeWhiskeyName('Booker\u2019s\u2014Batch 2024');
      expect(result).toContain('-');
    });

    it('strips trademark symbol', () => {
      expect(normalizeWhiskeyName('Jack Daniel\u2019s\u2122 Old No. 7')).toBe(
        "jack daniel's old no. 7"
      );
    });

    it('strips registered symbol', () => {
      expect(normalizeWhiskeyName('Jim Beam\u00ae')).toBe('jim beam');
    });

    it('converts fancy double quotes to plain double quotes then strips', () => {
      // After normalization, quotes are stripped in step 8
      const result = normalizeWhiskeyName('\u201cOld Forester\u201d');
      expect(result).toBe('old forester');
    });

    it('collapses multiple hyphens into one', () => {
      const result = normalizeWhiskeyName('Pappy--Van--Winkle');
      expect(result).toBe('pappy-van-winkle');
    });
  });

  describe('combined pipeline edge cases', () => {
    it('handles a complex menu entry with ABV, age, and suffix', () => {
      expect(
        normalizeWhiskeyName('Buffalo Trace Kentucky Straight Bourbon Whiskey 45% ABV')
      ).toBe('buffalo trace');
    });

    it('preserves meaningful qualifiers like "Single Barrel"', () => {
      expect(normalizeWhiskeyName('Buffalo Trace Single Barrel')).toBe(
        'buffalo trace single barrel'
      );
    });

    it('preserves "Cask Strength" qualifier', () => {
      // "10" has no age-statement word here; "Cask Strength" is not a stripped suffix.
      expect(normalizeWhiskeyName('Laphroaig 10 Cask Strength')).toBe(
        'laphroaig 10 cask strength'
      );
    });

    it('handles a minimal single-word name', () => {
      expect(normalizeWhiskeyName('Ardbeg')).toBe('ardbeg');
    });

    it('strips trailing dash after suffix removal leaves whitespace', () => {
      // Marketing suffix removal can leave trailing dashes/spaces — ensure clean result
      const result = normalizeWhiskeyName('Wild Turkey Kentucky Straight Bourbon Whiskey -');
      expect(result).not.toMatch(/[-\s]$/);
    });
  });
});

// ---------------------------------------------------------------------------
// parsePrivateBarrel
// ---------------------------------------------------------------------------

describe('parsePrivateBarrel', () => {
  describe('inline separator patterns', () => {
    it('splits "Buffalo Trace Single Barrel Select - Portland Pick"', () => {
      const result = parsePrivateBarrel('Buffalo Trace Single Barrel Select - Portland Pick');
      expect(result.baseName).toBe('Buffalo Trace Single Barrel Select');
      expect(result.pickInfo).toBe('Portland Pick');
    });

    it('splits on em dash separator', () => {
      const result = parsePrivateBarrel(
        'Wild Turkey Rare Breed \u2014 Private Barrel Selection'
      );
      expect(result.baseName).toBeTruthy();
      expect(result.pickInfo).toContain('Private Barrel Selection');
    });

    it('splits on en dash separator', () => {
      const result = parsePrivateBarrel('Elijah Craig \u2013 Single Barrel Select');
      expect(result.baseName).toBe('Elijah Craig');
      expect(result.pickInfo).toContain('Single Barrel Select');
    });

    it('splits on pipe separator with private barrel keyword', () => {
      const result = parsePrivateBarrel('Four Roses | Private Barrel');
      expect(result.baseName).toBe('Four Roses');
      expect(result.pickInfo).toBe('Private Barrel');
    });

    it('splits "store pick" designation', () => {
      const result = parsePrivateBarrel("Maker's Mark - Store Pick");
      expect(result.baseName).toBe("Maker's Mark");
      expect(result.pickInfo).toBe('Store Pick');
    });

    it('splits "private selection" designation', () => {
      const result = parsePrivateBarrel('Blanton\'s - Private Selection');
      expect(result.baseName).toBe("Blanton's");
      expect(result.pickInfo).toBe('Private Selection');
    });

    it('splits "cask selection" designation', () => {
      const result = parsePrivateBarrel('GlenDronach 15 - Cask Selection');
      expect(result.baseName).toBe('GlenDronach 15');
      expect(result.pickInfo).toBe('Cask Selection');
    });

    it('splits "barrel pick" designation', () => {
      const result = parsePrivateBarrel('Knob Creek - Barrel Pick');
      expect(result.baseName).toBe('Knob Creek');
      expect(result.pickInfo).toBe('Barrel Pick');
    });
  });

  describe('parenthesised / bracketed patterns', () => {
    it('extracts bracketed pick info', () => {
      const result = parsePrivateBarrel(
        "Buffalo Trace [Store Pick - Portland Selection] Single Barrel"
      );
      expect(result.pickInfo).toMatch(/Store Pick/i);
      expect(result.baseName).toBeTruthy();
    });

    it('extracts parenthesised pick info', () => {
      const result = parsePrivateBarrel(
        "Elijah Craig (Private Barrel)"
      );
      expect(result.pickInfo).toContain('Private Barrel');
      expect(result.baseName).toBe('Elijah Craig');
    });
  });

  describe('no pick designation', () => {
    it('returns original name as baseName with null pickInfo for regular whiskey', () => {
      const result = parsePrivateBarrel('Glenfiddich 12');
      expect(result.baseName).toBe('Glenfiddich 12');
      expect(result.pickInfo).toBeNull();
    });

    it('returns null pickInfo for a name with a hyphen but no pick keyword', () => {
      const result = parsePrivateBarrel('Johnnie Walker Black Label');
      expect(result.baseName).toBe('Johnnie Walker Black Label');
      expect(result.pickInfo).toBeNull();
    });

    it('returns null pickInfo for empty string', () => {
      const result = parsePrivateBarrel('');
      expect(result.baseName).toBe('');
      expect(result.pickInfo).toBeNull();
    });

    it('trims whitespace from baseName when no pick is found', () => {
      const result = parsePrivateBarrel('  Pappy Van Winkle 15  ');
      expect(result.baseName).toBe('Pappy Van Winkle 15');
      expect(result.pickInfo).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// tokenSimilarity
// ---------------------------------------------------------------------------

describe('tokenSimilarity', () => {
  it('returns 1.0 for identical names', () => {
    expect(tokenSimilarity('Buffalo Trace', 'Buffalo Trace')).toBe(1);
  });

  it('returns 1.0 for names that normalize to the same thing', () => {
    // "The Macallan 12 Year Old" and "Macallan 12 YO" share the same tokens
    expect(tokenSimilarity('The Macallan 12 Year Old', 'Macallan 12 YO')).toBe(1);
  });

  it('returns 0.0 for completely unrelated names', () => {
    // No shared meaningful tokens
    const score = tokenSimilarity('Buffalo Trace', 'Lagavulin');
    expect(score).toBe(0);
  });

  it('returns high score for same whiskey with minor variation', () => {
    // "Glenfiddich 12 Year Old" vs "Glenfiddich 12yr"
    const score = tokenSimilarity('Glenfiddich 12 Year Old', 'Glenfiddich 12yr');
    expect(score).toBeGreaterThanOrEqual(0.8);
  });

  it('returns a partial score for partially overlapping names', () => {
    // "Wild Turkey 101" vs "Wild Turkey Rare Breed" — share "wild" and "turkey"
    const score = tokenSimilarity('Wild Turkey 101', 'Wild Turkey Rare Breed');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns 1.0 when both strings are empty (after normalization)', () => {
    expect(tokenSimilarity('', '')).toBe(1);
  });

  it('returns 0.0 when one side is empty', () => {
    expect(tokenSimilarity('Buffalo Trace', '')).toBe(0);
  });

  it('is order-independent (commutative)', () => {
    const ab = tokenSimilarity('Ardbeg 10', 'Ardbeg Uigeadail');
    const ba = tokenSimilarity('Ardbeg Uigeadail', 'Ardbeg 10');
    expect(ab).toBe(ba);
  });

  it('excludes stop words from scoring', () => {
    // "of" and "and" are stop words — should not inflate a match between unrelated names
    const score = tokenSimilarity('Spirit of the Glen', 'Heart of the Highlands');
    // Both contain "of"/"the" but those are stop words; meaningful tokens differ
    expect(score).toBeLessThan(0.5);
  });

  it('handles duplicate tokens correctly via frequency map', () => {
    // "12 12 year" vs "12 year" — duplicate token shouldn't double-count
    const score = tokenSimilarity('12 12', '12 year');
    // They share one "12" token
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// similarityRatio
// ---------------------------------------------------------------------------

describe('similarityRatio', () => {
  it('returns 1.0 for identical strings', () => {
    expect(similarityRatio('Buffalo Trace', 'Buffalo Trace')).toBe(1);
  });

  it('returns 1.0 when names normalize to the same value', () => {
    expect(similarityRatio('The Macallan 12 Year Old', 'Macallan 12 YO')).toBe(1);
  });

  it('returns 0.0 for empty vs non-empty after normalization', () => {
    // Anything vs empty string
    // Empty normalizes to "" — distance = longer.length, ratio = 0
    const score = similarityRatio('Buffalo Trace', '');
    expect(score).toBe(0);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(similarityRatio('', '')).toBe(1);
  });

  it('returns a value in [0, 1] range for any two strings', () => {
    const pairs: [string, string][] = [
      ['Pappy Van Winkle 15', 'Pappy Van Winkle 20'],
      ['Lagavulin 16', 'Laphroaig 10'],
      ['Maker\'s Mark', 'Maker\'s 46'],
      ['GlenDronach 12', 'GlenDronach 15'],
    ];
    for (const [a, b] of pairs) {
      const ratio = similarityRatio(a, b);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    }
  });

  it('returns a high score for very similar names (same product, different label)', () => {
    // "Johnnie Walker Black" vs "Johnnie Walker Black Label" — nearly identical after normalization
    const score = similarityRatio('Johnnie Walker Black', 'Johnnie Walker Black Label');
    expect(score).toBeGreaterThan(0.8);
  });

  it('returns a low score for completely different distilleries', () => {
    const score = similarityRatio('Buffalo Trace', 'Laphroaig');
    expect(score).toBeLessThan(0.5);
  });

  it('is commutative', () => {
    const ab = similarityRatio('Glenfiddich 18', 'Glenfiddich 21');
    const ba = similarityRatio('Glenfiddich 21', 'Glenfiddich 18');
    expect(ab).toBeCloseTo(ba, 10);
  });

  it('gives higher score to same-brand different-age than cross-brand', () => {
    const sameBrand = similarityRatio('Ardbeg 10', 'Ardbeg Uigeadail');
    const crossBrand = similarityRatio('Ardbeg 10', 'Laphroaig 10');
    expect(sameBrand).toBeGreaterThan(crossBrand);
  });
});

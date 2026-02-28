import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedMenu, TrawlResult, ExtractedWhiskey } from '@/types/trawler';
import { normalizeWhiskeyName, similarityRatio, tokenSimilarity, parsePrivateBarrel } from './normalize';
import { judgeDedup } from './extract';

const FUZZY_THRESHOLD = 0.85;

export async function ingestMenu({
  barId,
  jobId,
  menu,
  supabase,
}: {
  barId: string;
  jobId?: string;
  menu: ExtractedMenu;
  supabase: SupabaseClient;
}): Promise<TrawlResult> {
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const extracted of menu.whiskeys) {
    try {
      const whiskeyId = await findOrCreateWhiskey(extracted, supabase);
      if (!whiskeyId) {
        skipped++;
        continue;
      }

      // Upsert bar_whiskey link with provenance
      const { error } = await supabase
        .from('bar_whiskeys')
        .upsert(
          {
            bar_id: barId,
            whiskey_id: whiskeyId.id,
            price: extracted.price ?? null,
            pour_size: extracted.pour_size ?? null,
            available: true,
            notes: extracted.notes ?? null,
            source_type: menu.source_type ?? null,
            source_trawl_id: jobId ?? null,
            confidence: menu.confidence,
            is_stale: false,
          },
          { onConflict: 'bar_id,whiskey_id' }
        );

      if (error) {
        skipped++;
      } else if (whiskeyId.created) {
        added++;
      } else {
        updated++;
      }
    } catch {
      skipped++;
    }
  }

  // Update trawl job with provenance if provided
  if (jobId) {
    await supabase
      .from('trawl_jobs')
      .update({
        status: 'completed',
        whiskey_count: added + updated,
        result: { menu } as unknown as Record<string, unknown>,
        scraped_at: menu.scraped_at ?? new Date().toISOString(),
        source_date: menu.source_date ?? null,
        source_attribution: menu.source_attribution ?? null,
        content_hash: menu.content_hash ?? null,
      })
      .eq('id', jobId);
  }

  return {
    success: true,
    menu,
    whiskeys_added: added,
    whiskeys_updated: updated,
    whiskeys_skipped: skipped,
  };
}

async function findOrCreateWhiskey(
  extracted: ExtractedWhiskey,
  supabase: SupabaseClient
): Promise<{ id: string; created: boolean } | null> {
  if (!extracted.name || extracted.name.trim().length === 0) return null;

  // Separate private barrel / store pick info from the base name
  const { baseName, pickInfo } = parsePrivateBarrel(extracted.name);
  const normalized = normalizeWhiskeyName(baseName);

  if (normalized.length === 0) return null;

  // Extract the first significant word for filtered fuzzy search
  const firstWord = normalized.split(/\s+/)[0] ?? '';

  // Tier 1: Exact normalized name match (uses the base name, not the pick variant)
  const { data: exactMatch } = await supabase
    .from('whiskeys')
    .select('id, name')
    .eq('normalized_name', normalized)
    .limit(1)
    .single();

  if (exactMatch) {
    return { id: exactMatch.id, created: false };
  }

  // Tier 2: Fuzzy Levenshtein match — filter by first word with ilike to
  // avoid scanning the entire whiskeys table
  if (firstWord.length > 0) {
    const { data: candidates } = await supabase
      .from('whiskeys')
      .select('id, name, normalized_name')
      .ilike('normalized_name', `${firstWord}%`)
      .limit(50);

    if (candidates && candidates.length > 0) {
      for (const candidate of candidates) {
        if (similarityRatio(normalized, candidate.normalized_name) >= FUZZY_THRESHOLD) {
          return { id: candidate.id, created: false };
        }
      }

      // Tier 2.5: Token-based similarity (catches word-order differences)
      for (const candidate of candidates) {
        if (tokenSimilarity(normalized, candidate.normalized_name) >= 0.90) {
          return { id: candidate.id, created: false };
        }
      }

      // Tier 3: Claude judge for close-but-not-exact matches
      const closeMatches = candidates.filter(
        (c) => similarityRatio(normalized, c.normalized_name) >= 0.6 ||
               tokenSimilarity(normalized, c.normalized_name) >= 0.7
      );

      for (const candidate of closeMatches.slice(0, 5)) {
        const isSame = await judgeDedup(extracted.name, candidate.name);
        if (isSame) {
          return { id: candidate.id, created: false };
        }
      }
    }
  }

  // No match found — create new whiskey
  // Store the original full name (with pick info) as the display name,
  // and attach pick metadata as notes if present.
  const insertNotes = pickInfo
    ? [extracted.notes, `Pick: ${pickInfo}`].filter(Boolean).join('; ')
    : extracted.notes ?? null;

  const { data: newWhiskey, error } = await supabase
    .from('whiskeys')
    .insert({
      name: baseName.trim(),
      distillery: extracted.distillery ?? null,
      type: extracted.type ?? 'other',
      age: extracted.age ?? null,
      abv: extracted.abv ?? null,
      description: insertNotes,
      region: null,
      country: null,
      image_url: null,
    })
    .select('id')
    .single();

  if (error || !newWhiskey) return null;
  return { id: newWhiskey.id, created: true };
}

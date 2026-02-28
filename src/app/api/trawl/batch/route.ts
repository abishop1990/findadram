import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { extractFromText } from '@/lib/trawler/extract';
import { crawlUrl } from '@/lib/trawler/crawl';
import { validateUrl } from '@/lib/trawler/safety';
import { requireEnv } from '@/lib/env';
import type { ExtractedMenu, TrawlResult } from '@/types/trawler';

const BatchRequestSchema = z.object({
  urls: z.array(z.url()).min(1).max(20),
});

interface BatchResult {
  url: string;
  result: TrawlResult;
}

export async function POST(request: NextRequest): Promise<NextResponse<{ results: BatchResult[] }>> {
  try {
    requireEnv('ANTHROPIC_API_KEY');
  } catch {
    return NextResponse.json(
      { results: [{ url: '', result: { success: false, whiskeys_added: 0, whiskeys_updated: 0, whiskeys_skipped: 0, error: 'Server misconfigured: missing ANTHROPIC_API_KEY' } }] },
      { status: 500 }
    );
  }

  let body: z.infer<typeof BatchRequestSchema>;
  try {
    const raw = await request.json();
    body = BatchRequestSchema.parse(raw);
  } catch (err) {
    const message = err instanceof z.ZodError ? z.prettifyError(err) : 'Invalid request body';
    return NextResponse.json(
      { results: [{ url: '', result: { success: false, whiskeys_added: 0, whiskeys_updated: 0, whiskeys_skipped: 0, error: String(message) } }] },
      { status: 400 }
    );
  }

  // Process URLs sequentially with a delay to be respectful
  const results: BatchResult[] = [];

  for (const url of body.urls) {
    try {
      const urlCheck = await validateUrl(url);
      if (!urlCheck.valid) {
        results.push({
          url,
          result: { success: false, whiskeys_added: 0, whiskeys_updated: 0, whiskeys_skipped: 0, error: `URL blocked: ${urlCheck.reason}` },
        });
        continue;
      }

      const html = await crawlUrl(url);
      const menu: ExtractedMenu = await extractFromText(html);
      menu.source_url = url;

      results.push({
        url,
        result: {
          success: true,
          menu,
          whiskeys_added: menu.whiskeys.length,
          whiskeys_updated: 0,
          whiskeys_skipped: 0,
        },
      });

      // Rate limit: wait 2 seconds between requests to different domains
      if (body.urls.indexOf(url) < body.urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      results.push({
        url,
        result: { success: false, whiskeys_added: 0, whiskeys_updated: 0, whiskeys_skipped: 0, error: message },
      });
    }
  }

  return NextResponse.json({ results });
}

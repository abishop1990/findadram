import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { crawlUrl, extractFromText, extractFromImage, ingestMenu } from '@/lib/trawler';
import { validateUrl } from '@/lib/trawler/safety';

const VALID_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ValidImageMime = typeof VALID_IMAGE_MIMES[number];

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, image, image_mime_type, bar_id } = body;

  if (!url && !image) {
    return NextResponse.json({ error: 'Provide either a URL or an image' }, { status: 400 });
  }

  if (!bar_id) {
    return NextResponse.json({ error: 'bar_id is required' }, { status: 400 });
  }

  // Validate URL before crawling (SSRF prevention)
  if (url) {
    const urlCheck = await validateUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: `URL blocked: ${urlCheck.reason}` }, { status: 400 });
    }
  }

  // Validate image mime type
  if (image && image_mime_type && !VALID_IMAGE_MIMES.includes(image_mime_type)) {
    return NextResponse.json({ error: 'Invalid image mime type' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Create trawl job
  const { data: job, error: jobError } = await supabase
    .from('trawl_jobs')
    .insert({
      bar_id,
      source_url: url || null,
      source_type: url ? 'url' : 'image',
      status: 'processing',
      whiskey_count: 0,
      submitted_by: null,
      result: null,
      error: null,
    })
    .select('id')
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create trawl job' }, { status: 500 });
  }

  try {
    let menu;

    if (url) {
      const html = await crawlUrl(url);
      menu = await extractFromText(html);
    } else {
      const mime: ValidImageMime = VALID_IMAGE_MIMES.includes(image_mime_type)
        ? image_mime_type
        : 'image/jpeg';
      menu = await extractFromImage(image, mime);
    }

    menu.source_url = url;

    const result = await ingestMenu({
      barId: bar_id,
      jobId: job.id,
      menu,
      supabase,
    });

    return NextResponse.json(result);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await supabase
      .from('trawl_jobs')
      .update({ status: 'failed', error: errorMessage })
      .eq('id', job.id);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

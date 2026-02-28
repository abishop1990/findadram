import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { crawlUrl, extractFromText, extractFromImage, ingestMenu } from '@/lib/trawler';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url, image, image_mime_type, bar_id } = body;

  if (!url && !image) {
    return NextResponse.json({ error: 'Provide either a URL or an image' }, { status: 400 });
  }

  if (!bar_id) {
    return NextResponse.json({ error: 'bar_id is required' }, { status: 400 });
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
      menu = await extractFromImage(
        image,
        (image_mime_type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      );
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

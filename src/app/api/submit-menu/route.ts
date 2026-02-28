import { NextRequest, NextResponse } from 'next/server';
import { crawlUrl, extractFromText, extractFromImage } from '@/lib/trawler';

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  let url: string | undefined;
  let image: string | undefined;
  let imageMimeType: string | undefined;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    url = body.url;
    image = body.image;
    imageMimeType = body.image_mime_type;
  } else if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    url = formData.get('url') as string | undefined;
    const file = formData.get('image') as File | null;

    if (file) {
      const bytes = await file.arrayBuffer();
      image = Buffer.from(bytes).toString('base64');
      imageMimeType = file.type;
    }
  }

  if (!url && !image) {
    return NextResponse.json({ error: 'Provide either a URL or an image' }, { status: 400 });
  }

  try {
    let menu;

    if (url) {
      const html = await crawlUrl(url);
      menu = await extractFromText(html);
      menu.source_url = url;
    } else if (image) {
      menu = await extractFromImage(
        image,
        (imageMimeType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      );
    } else {
      return NextResponse.json({ error: 'No content to process' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      menu,
      whiskey_count: menu?.whiskeys.length || 0,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Extraction failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

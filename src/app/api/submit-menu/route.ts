import { NextRequest, NextResponse } from 'next/server';
import { crawlUrl, extractFromText, extractFromImage } from '@/lib/trawler';
import { validateUrl } from '@/lib/trawler/safety';

const VALID_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type ValidImageMime = typeof VALID_IMAGE_MIMES[number];
const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB

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
      if (file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large (max 25MB)' }, { status: 413 });
      }
      const bytes = await file.arrayBuffer();
      image = Buffer.from(bytes).toString('base64');
      imageMimeType = file.type;
    }
  }

  if (!url && !image) {
    return NextResponse.json({ error: 'Provide either a URL or an image' }, { status: 400 });
  }

  // Validate URL before crawling (SSRF prevention)
  if (url) {
    const urlCheck = await validateUrl(url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: `URL blocked: ${urlCheck.reason}` }, { status: 400 });
    }
  }

  // Validate image mime type
  if (imageMimeType && !VALID_IMAGE_MIMES.includes(imageMimeType as ValidImageMime)) {
    return NextResponse.json({ error: 'Invalid image mime type' }, { status: 400 });
  }

  try {
    let menu;

    if (url) {
      const html = await crawlUrl(url);
      menu = await extractFromText(html);
      menu.source_url = url;
    } else if (image) {
      const mime: ValidImageMime = VALID_IMAGE_MIMES.includes(imageMimeType as ValidImageMime)
        ? (imageMimeType as ValidImageMime)
        : 'image/jpeg';
      menu = await extractFromImage(image, mime);
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

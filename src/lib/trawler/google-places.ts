/**
 * Google Places API v1 helpers for bar discovery and photo/review extraction.
 * Uses the new Places API (places.googleapis.com/v1/).
 */
import { getAnthropicClient, MODELS } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
  authorAttributions?: Array<{ displayName: string; uri?: string }>;
}

export interface PlaceReview {
  rating: number;
  text: { text: string };
  publishTime?: string;
}

export interface PhotoClassification {
  isUseful: boolean;
  photoType: 'menu' | 'shelf' | 'bottles' | 'irrelevant';
  description: string;
}

// ---------------------------------------------------------------------------
// Place lookup
// ---------------------------------------------------------------------------

/**
 * Look up a bar's Google Place ID by name + location.
 */
export async function findPlaceId(
  barName: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<string | null> {
  const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
    },
    body: JSON.stringify({
      textQuery: `${barName} bar`,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 5000,
        },
      },
      maxResultCount: 1,
    }),
  });

  if (!resp.ok) return null;
  const data = await resp.json();
  return data.places?.[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/**
 * Fetch photo references for a place.
 */
export async function fetchPlacePhotos(
  placeId: string,
  apiKey: string,
  maxPhotos = 10
): Promise<PlacePhoto[]> {
  const resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'photos',
    },
  });

  if (!resp.ok) return [];
  const data = await resp.json();
  const photos: PlacePhoto[] = data.photos ?? [];
  return photos.slice(0, maxPhotos);
}

/**
 * Download a photo as base64 via the Places Photo Media endpoint.
 */
export async function downloadPhoto(
  photoName: string,
  apiKey: string,
  maxWidth = 1200
): Promise<{ base64: string; mimeType: string } | null> {
  // Get the photo URI (skip redirect)
  const uriResp = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}&skipHttpRedirect=true`
  );
  if (!uriResp.ok) return null;
  const uriData = await uriResp.json();
  const photoUri: string | undefined = uriData.photoUri;
  if (!photoUri) return null;

  // Download the actual image
  const imgResp = await fetch(photoUri);
  if (!imgResp.ok) return null;

  const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await imgResp.arrayBuffer());
  return {
    base64: buffer.toString('base64'),
    mimeType: contentType,
  };
}

// ---------------------------------------------------------------------------
// Photo classification
// ---------------------------------------------------------------------------

/**
 * Classify a photo: menu, shelf/backbar, bottles, or irrelevant.
 * Uses Haiku for cheap, fast classification.
 */
export async function classifyPhoto(
  base64: string,
  mimeType: string
): Promise<PhotoClassification> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: MODELS.DEDUP_JUDGE, // Haiku — fast and cheap
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Classify this photo from a bar/restaurant. Is it useful for identifying whiskey/spirits?

Categories:
- "menu": A printed or displayed menu, drink list, or spirits list
- "shelf": A back bar shelf, bottle display, or liquor wall showing bottles
- "bottles": A close-up of bottles or a bottle collection
- "irrelevant": Food, people, interior decor, exterior, or anything without identifiable spirits

Respond with JSON only: {"isUseful": true/false, "photoType": "menu"|"shelf"|"bottles"|"irrelevant", "description": "brief description"}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => ('text' in block ? block.text : ''))
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isUseful: !!parsed.isUseful,
        photoType: parsed.photoType || 'irrelevant',
        description: parsed.description || '',
      };
    }
  } catch {
    // Fall through
  }

  return { isUseful: false, photoType: 'irrelevant', description: 'Classification failed' };
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

/**
 * Fetch reviews for a place from Google Places API.
 */
export async function fetchPlaceReviews(
  placeId: string,
  apiKey: string
): Promise<string[]> {
  const resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'reviews',
    },
  });

  if (!resp.ok) return [];
  const data = await resp.json();
  const reviews: PlaceReview[] = data.reviews ?? [];

  return reviews
    .filter((r) => r.text?.text)
    .map(
      (r) =>
        `[${r.rating}/5 stars, ${r.publishTime?.split('T')[0] || 'unknown date'}] ${r.text.text}`
    );
}

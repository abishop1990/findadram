import { NextRequest, NextResponse } from 'next/server';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

// Simple in-memory cache (24h TTL)
const cache = new Map<string, { data: unknown; expires: number }>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const cacheKey = q || `${lat},${lng}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    let url: string;

    if (q) {
      // Forward geocode: address/place name -> coordinates
      url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
    } else if (lat && lng) {
      // Validate coordinate bounds
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
      }
      // Reverse geocode: coordinates -> address
      url = `${NOMINATIM_BASE}/reverse?lat=${latNum}&lon=${lngNum}&format=json&addressdetails=1`;
    } else {
      return NextResponse.json({ error: 'Provide either q or lat/lng parameters' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FindADram/1.0 (https://findadram.com)',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    }

    const data = await response.json();

    // Cache for 24 hours
    cache.set(cacheKey, { data, expires: Date.now() + 24 * 60 * 60 * 1000 });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 502 });
  }
}

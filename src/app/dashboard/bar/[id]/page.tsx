import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WhiskeyMenuEditor } from '@/components/features/WhiskeyMenuEditor';
import type { Whiskey } from '@/types/database';

// ─── types ────────────────────────────────────────────────────────────────────

export interface BarWhiskeyWithDetails {
  id: string;
  bar_id: string;
  whiskey_id: string;
  price: number | null;
  pour_size: string | null;
  available: boolean;
  notes: string | null;
  last_verified: string;
  confidence: number;
  is_stale: boolean;
  whiskey: Whiskey;
}

interface RecentSighting {
  id: string;
  price: number | null;
  pour_size: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  whiskey: { id: string; name: string; type: string } | null;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function BarManagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?next=/dashboard/bar/${id}`);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    redirect(`/auth/login?next=/dashboard/bar/${id}`);
  }

  // Verify ownership: must have an approved claim for this bar
  const { data: claim } = await supabase
    .from('bar_claims')
    .select('id, status')
    .eq('bar_id', id)
    .eq('user_id', profile.id)
    .eq('status', 'approved')
    .single();

  if (!claim) {
    // Not an owner of this bar
    redirect('/dashboard');
  }

  // Fetch bar details
  const { data: bar, error: barError } = await supabase
    .from('bars')
    .select('*')
    .eq('id', id)
    .single();

  if (barError || !bar) {
    notFound();
  }

  // Fetch all bar_whiskeys (including unavailable) for management
  const { data: whiskeyEntries } = await supabase
    .from('bar_whiskeys')
    .select(`
      id,
      bar_id,
      whiskey_id,
      price,
      pour_size,
      available,
      notes,
      last_verified,
      confidence,
      is_stale,
      whiskey:whiskeys (
        id,
        name,
        normalized_name,
        distillery,
        region,
        country,
        type,
        age,
        abv,
        description,
        image_url,
        created_at,
        updated_at
      )
    `)
    .eq('bar_id', id)
    .order('available', { ascending: false })
    .order('price', { ascending: true });

  const menuItems = (whiskeyEntries ?? []).map((entry) => ({
    id: entry.id,
    bar_id: entry.bar_id,
    whiskey_id: entry.whiskey_id,
    price: entry.price,
    pour_size: entry.pour_size,
    available: entry.available,
    notes: entry.notes,
    last_verified: entry.last_verified,
    confidence: entry.confidence,
    is_stale: entry.is_stale,
    whiskey: entry.whiskey as unknown as Whiskey,
  })) as BarWhiskeyWithDetails[];

  // Fetch recent sightings for this bar
  const { data: recentSightingsRaw } = await supabase
    .from('sightings')
    .select(`
      id,
      price,
      pour_size,
      rating,
      notes,
      created_at,
      whiskey:whiskeys ( id, name, type )
    `)
    .eq('bar_id', id)
    .order('created_at', { ascending: false })
    .limit(8);

  const recentSightings = (recentSightingsRaw ?? []).map((s) => ({
    id: s.id,
    price: s.price,
    pour_size: s.pour_size,
    rating: s.rating,
    notes: s.notes,
    created_at: s.created_at,
    whiskey: s.whiskey as unknown as { id: string; name: string; type: string } | null,
  })) as RecentSighting[];

  const availableCount = menuItems.filter((m) => m.available).length;
  const totalCount = menuItems.length;
  const locationParts = [bar.city, bar.state].filter(Boolean);

  return (
    <div className="min-h-screen bg-whiskey-50">

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(212,164,86,0.12) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-14">
          {/* Back navigation */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-whiskey-300 hover:text-whiskey-100 transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-whiskey-800/60 border border-whiskey-700 px-3 py-1 mb-3 text-xs font-medium text-whiskey-300 uppercase tracking-widest">
                <svg className="h-3 w-3 text-whiskey-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
                Approved Owner
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-whiskey-50 tracking-tight">
                {bar.name}
              </h1>
              {(bar.address || locationParts.length > 0) && (
                <div className="flex items-center gap-1.5 mt-2">
                  <svg className="w-3.5 h-3.5 text-whiskey-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.28.14l.019.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                  </svg>
                  <span className="text-whiskey-400 text-sm">
                    {bar.address ?? locationParts.join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="inline-flex flex-col items-center justify-center bg-whiskey-800/60 border border-whiskey-700/50 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <span className="text-2xl font-bold text-whiskey-100">{availableCount}</span>
                <span className="text-xs text-whiskey-400 uppercase tracking-widest mt-0.5">available</span>
              </div>
              <div className="inline-flex flex-col items-center justify-center bg-whiskey-800/60 border border-whiskey-700/50 rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <span className="text-2xl font-bold text-whiskey-100">{totalCount}</span>
                <span className="text-xs text-whiskey-400 uppercase tracking-widest mt-0.5">total</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Page Body ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Menu Editor (main column) ─────────────────────────────── */}
          <div className="lg:col-span-2">
            <WhiskeyMenuEditor barId={id} initialItems={menuItems} />
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-5">

              {/* Quick links */}
              <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                  <svg className="w-4 h-4 text-whiskey-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  <h3 className="font-bold text-whiskey-900 text-sm uppercase tracking-wide">Quick Links</h3>
                </div>
                <div className="p-4 space-y-2">
                  <Link
                    href={`/bars/${id}`}
                    className="flex items-center gap-2 text-sm text-whiskey-700 hover:text-whiskey-500 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg className="h-4 w-4 text-oak-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    View public bar page
                  </Link>
                  {bar.website && (
                    <a
                      href={bar.website}
                      className="flex items-center gap-2 text-sm text-whiskey-700 hover:text-whiskey-500 transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="h-4 w-4 text-oak-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253" />
                      </svg>
                      Bar website
                    </a>
                  )}
                </div>
              </div>

              {/* Recent sightings */}
              {recentSightings.length > 0 && (
                <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
                    <svg className="w-4 h-4 text-whiskey-500" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clipRule="evenodd" />
                    </svg>
                    <h3 className="font-bold text-whiskey-900 text-sm uppercase tracking-wide">
                      Recent Sightings
                    </h3>
                  </div>
                  <ul className="divide-y divide-oak-100">
                    {recentSightings.map((sighting) => (
                      <li key={sighting.id} className="px-4 py-3">
                        {sighting.whiskey && (
                          <p className="text-sm font-medium text-whiskey-800 truncate">
                            {sighting.whiskey.name}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            {sighting.price != null && (
                              <span className="text-xs font-semibold text-whiskey-600">
                                ${(sighting.price as number).toFixed(2)}
                              </span>
                            )}
                            {sighting.pour_size && (
                              <span className="text-xs text-oak-500">{sighting.pour_size}</span>
                            )}
                            {sighting.rating != null && (
                              <span className="text-xs text-amber-500" aria-label={`${sighting.rating} out of 5 stars`}>
                                {'★'.repeat(sighting.rating as number)}{'☆'.repeat(5 - (sighting.rating as number))}
                              </span>
                            )}
                          </div>
                          <time dateTime={sighting.created_at} className="text-xs text-oak-400">
                            {timeAgo(sighting.created_at)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recentSightings.length === 0 && (
                <div className="bg-white rounded-xl border border-oak-200 shadow-sm p-5 text-center">
                  <svg className="h-8 w-8 text-oak-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-oak-500">No sightings yet</p>
                  <p className="text-xs text-oak-400 mt-1">Community sightings will appear here</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

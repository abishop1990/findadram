import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BarClaimForm } from '@/components/features/BarClaimForm';
import type { Bar, BarClaim } from '@/types/database';

// ─── types ───────────────────────────────────────────────────────────────────

interface ClaimedBar extends Bar {
  whiskey_count: number;
  recent_activity: number;
}

interface ClaimWithBar extends BarClaim {
  bar: Bar;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function oneWeekAgoISO(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

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

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login?next=/dashboard');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, display_name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/login?next=/dashboard');
  }

  // Fetch all claims for this user (all statuses)
  const { data: claims } = await supabase
    .from('bar_claims')
    .select(`
      id,
      bar_id,
      user_id,
      status,
      created_at,
      updated_at,
      bar:bars (
        id,
        name,
        address,
        city,
        state,
        country,
        phone,
        website,
        google_place_id,
        location,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  const typedClaims = (claims ?? []) as unknown as ClaimWithBar[];
  const approvedClaims = typedClaims.filter((c) => c.status === 'approved');
  const pendingClaims = typedClaims.filter((c) => c.status === 'pending');

  // For each approved bar, fetch whiskey counts and recent activity in parallel
  const approvedBarsData: ClaimedBar[] = await Promise.all(
    approvedClaims.map(async (claim) => {
      const barId = claim.bar.id;
      const [{ count: whiskeyCount }, { count: activityCount }] = await Promise.all([
        supabase
          .from('bar_whiskeys')
          .select('id', { count: 'exact', head: true })
          .eq('bar_id', barId)
          .eq('available', true),
        supabase
          .from('sightings')
          .select('id', { count: 'exact', head: true })
          .eq('bar_id', barId)
          .gte('created_at', oneWeekAgoISO()),
      ]);
      return {
        ...claim.bar,
        whiskey_count: whiskeyCount ?? 0,
        recent_activity: activityCount ?? 0,
      };
    })
  );

  const hasNoClaims = typedClaims.length === 0;
  const displayName = profile.display_name ?? user.email ?? 'Bar Owner';

  return (
    <div className="min-h-screen bg-whiskey-50">

      {/* ── Page Header ────────────────────────────────────────────────── */}
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
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-whiskey-800/60 border border-whiskey-700 px-3 py-1 mb-4 text-xs font-medium text-whiskey-300 uppercase tracking-widest">
                <svg className="h-3 w-3 text-whiskey-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Bar Owner Dashboard
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-whiskey-50 tracking-tight">
                Welcome back, {displayName}
              </h1>
              <p className="text-whiskey-400 mt-2 text-sm">
                Manage your bar listings and whiskey menus
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              <div className="inline-flex flex-col items-center justify-center bg-whiskey-800/60 border border-whiskey-700/50 rounded-xl px-5 py-3 backdrop-blur-sm">
                <span className="text-2xl font-bold text-whiskey-100">{approvedBarsData.length}</span>
                <span className="text-xs text-whiskey-400 uppercase tracking-widest mt-0.5">
                  {approvedBarsData.length === 1 ? 'claimed bar' : 'claimed bars'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">

        {/* Pending claims notice */}
        {pendingClaims.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-amber-900">
                  {pendingClaims.length === 1 ? '1 claim pending review' : `${pendingClaims.length} claims pending review`}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {pendingClaims.map((claim) => (
                    <li key={claim.id} className="text-sm text-amber-700 flex items-center gap-1.5">
                      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5H10.75V5z" clipRule="evenodd" />
                      </svg>
                      <span>{claim.bar.name} — submitted {timeAgo(claim.created_at)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-2">
                  Our team reviews all ownership requests within 1–2 business days.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approved bars grid */}
        {approvedBarsData.length > 0 && (
          <section aria-labelledby="bars-heading">
            <div className="flex items-center justify-between mb-4">
              <h2 id="bars-heading" className="text-xl font-bold text-whiskey-900">
                Your Bars
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedBarsData.map((bar) => (
                <Link key={bar.id} href={`/dashboard/bar/${bar.id}`}>
                  <Card className="border-l-4 border-l-whiskey-500 hover:border-l-whiskey-400 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer h-full">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Bar name */}
                        <h3 className="font-bold text-whiskey-900 text-lg truncate">{bar.name}</h3>

                        {/* Address */}
                        {(bar.address || bar.city) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <svg className="w-3.5 h-3.5 text-oak-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.757.433 5.737 5.737 0 00.28.14l.019.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-oak-500 truncate">
                              {bar.address ?? [bar.city, bar.state].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}

                        {/* Stats row */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="amber">
                            {bar.whiskey_count} {bar.whiskey_count === 1 ? 'whiskey' : 'whiskeys'}
                          </Badge>
                          {bar.recent_activity > 0 && (
                            <Badge variant="green">
                              {bar.recent_activity} sighting{bar.recent_activity !== 1 ? 's' : ''} this week
                            </Badge>
                          )}
                          <Badge variant="default">Claimed</Badge>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="shrink-0 flex items-center self-center">
                        <svg className="h-5 w-5 text-oak-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Manage prompt */}
                    <div className="mt-4 pt-3 border-t border-oak-100">
                      <p className="text-xs text-whiskey-600 font-medium">
                        Manage menu &rarr;
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Claim a Bar section */}
        <section aria-labelledby="claim-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="claim-heading" className="text-xl font-bold text-whiskey-900">
              {hasNoClaims ? 'Claim Your Bar' : 'Claim Another Bar'}
            </h2>
          </div>

          {hasNoClaims && (
            <div className="mb-6 rounded-xl bg-gradient-to-r from-whiskey-50 to-oak-50 border border-whiskey-200 px-5 py-5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-whiskey-100 text-whiskey-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-whiskey-900">You haven&apos;t claimed a bar yet</h3>
                  <p className="text-sm text-oak-600 mt-1 leading-relaxed">
                    Search for your bar below and submit a claim. Once approved, you&apos;ll be able to
                    manage your whiskey menu, update prices, and mark availability directly.
                  </p>
                </div>
              </div>
            </div>
          )}

          <BarClaimForm userId={profile.id} existingBarIds={typedClaims.map((c) => c.bar_id)} />
        </section>

      </div>
    </div>
  );
}

import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WhiskeyCard } from '@/components/features/WhiskeyCard';
import { SearchBar } from '@/components/features/SearchBar';

const WHISKEY_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'bourbon', label: 'Bourbon' },
  { value: 'scotch', label: 'Scotch' },
  { value: 'rye', label: 'Rye' },
  { value: 'irish', label: 'Irish' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'canadian', label: 'Canadian' },
  { value: 'single_malt', label: 'Single Malt' },
  { value: 'blended', label: 'Blended' },
];

interface WhiskeysPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function WhiskeysPage({ searchParams }: WhiskeysPageProps) {
  const { type: selectedType } = await searchParams;
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from('whiskeys')
    .select('id, name, distillery, type, age, region, country')
    .order('name');

  if (selectedType && selectedType !== 'all') {
    query = query.eq('type', selectedType);
  }

  const { data: whiskeys } = await query;

  const activeType = selectedType || 'all';

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-whiskey-100 mb-3">
            Whiskey Catalog
          </h1>
          <p className="text-whiskey-300 mb-6 max-w-lg mx-auto">
            Browse every whiskey in our database. Click any pour to find bars near you that carry it.
          </p>
          <div className="flex justify-center">
            <SearchBar defaultType="whiskey" />
          </div>
        </div>
      </section>

      {/* Type Filter Tabs */}
      <section className="border-b border-oak-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex gap-1 snap-x snap-mandatory overflow-x-auto py-3 scrollbar-none">
            {WHISKEY_TYPES.map((t) => (
              <a
                key={t.value}
                href={t.value === 'all' ? '/whiskeys' : `/whiskeys?type=${t.value}`}
                className={`snap-start flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                  activeType === t.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-oak-100 text-oak-700 hover:bg-amber-100 hover:text-amber-800'
                }`}
              >
                {t.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Whiskey Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {whiskeys && whiskeys.length > 0 ? (
          <>
            <p className="text-sm text-oak-500 mb-6">
              Showing {whiskeys.length} {whiskeys.length === 1 ? 'whiskey' : 'whiskeys'}
              {activeType !== 'all' && (
                <span className="ml-1">
                  &middot; filtered by <span className="font-medium text-oak-700">{WHISKEY_TYPES.find((t) => t.value === activeType)?.label ?? activeType}</span>
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {whiskeys.map((whiskey) => (
                <WhiskeyCard
                  key={whiskey.id}
                  id={whiskey.id}
                  name={whiskey.name}
                  distillery={whiskey.distillery}
                  type={whiskey.type}
                  age={whiskey.age}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <p className="text-whiskey-800 text-lg font-medium">No whiskeys found</p>
            <p className="text-oak-500 mt-1">
              {activeType !== 'all' ? (
                <>
                  No{' '}
                  <span className="font-medium">{WHISKEY_TYPES.find((t) => t.value === activeType)?.label ?? activeType}</span>{' '}
                  in the catalog yet.{' '}
                  <Link href="/whiskeys" className="text-amber-700 hover:underline">
                    View all whiskeys
                  </Link>
                </>
              ) : (
                'Check back soon — we&apos;re adding more whiskeys.'
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

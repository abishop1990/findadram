'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationButtons } from '@/components/features/ConfirmationButtons';
import { SightingForm } from '@/components/features/SightingForm';
import Link from 'next/link';

interface WhiskeyEntry {
  id: string;
  price: number | null;
  pour_size: string | null;
  notes: string | null;
  last_verified: string | null;
  confidence: number | null;
  source_scraped_at?: string | null;
  source_date?: string | null;
  whiskey: {
    id: string;
    name: string;
    distillery: string | null;
    type: string;
    age: number | null;
    abv: number | null;
  };
}

const STALE_DAYS = 90;

function isStale(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  return days > STALE_DAYS;
}

function getStalenessWarning(entry: WhiskeyEntry): string | null {
  const verifiedStale = isStale(entry.last_verified);
  const sourceDate = entry.source_date || entry.source_scraped_at;
  const sourceStale = isStale(sourceDate);

  if (verifiedStale && sourceStale) {
    return 'Listing and source data are over 90 days old';
  }
  if (verifiedStale) {
    return 'Not verified in over 90 days';
  }
  if (sourceStale) {
    return 'Source data is over 90 days old';
  }
  return null;
}

type SortKey = 'name' | 'price' | 'type';

function timeAgo(dateString: string | null): string {
  if (!dateString) return 'Unknown';
  const now = new Date();
  const date = new Date(dateString);
  const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function WhiskeyListWithActions({
  whiskeys,
  barId,
  barName,
}: {
  whiskeys: WhiskeyEntry[];
  barId: string;
  barName: string;
}) {
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [sightingWhiskey, setSightingWhiskey] = useState<{ id: string; name: string } | null>(null);

  const sorted = useMemo(() => {
    return [...whiskeys].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.whiskey.name.localeCompare(b.whiskey.name);
        case 'price':
          return (a.price ?? 999) - (b.price ?? 999);
        case 'type':
          return (a.whiskey.type || '').localeCompare(b.whiskey.type || '');
        default:
          return 0;
      }
    });
  }, [whiskeys, sortBy]);

  const filtered = useMemo(() => {
    if (!filterQuery.trim()) return sorted;
    const query = filterQuery.toLowerCase();
    return sorted.filter((entry) => {
      const name = entry.whiskey.name.toLowerCase();
      const distillery = (entry.whiskey.distillery || '').toLowerCase();
      const type = (entry.whiskey.type || '').toLowerCase();
      return name.includes(query) || distillery.includes(query) || type.includes(query);
    });
  }, [sorted, filterQuery]);

  if (whiskeys.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-oak-500">No whiskeys listed yet.</p>
        <p className="text-oak-400 text-sm mt-1">Know what they pour? Log a sighting!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter whiskeys..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full px-3 py-2 text-whiskey-900 border border-oak-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whiskey-500 focus:border-whiskey-500"
        />
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-oak-100">
        <span className="text-sm text-oak-500">Sort:</span>
        {(['name', 'price', 'type'] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-sm px-2.5 py-1 rounded-md transition-colors ${
              sortBy === key
                ? 'bg-whiskey-100 text-whiskey-800 font-medium'
                : 'text-oak-500 hover:bg-oak-100'
            }`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>

      {/* Sighting form (expandable) */}
      {sightingWhiskey && (
        <div className="mb-4 p-4 bg-whiskey-50 rounded-lg border border-whiskey-200">
          <SightingForm
            barId={barId}
            barName={barName}
            whiskeyId={sightingWhiskey.id}
            whiskeyName={sightingWhiskey.name}
            onSuccess={() => setSightingWhiskey(null)}
            onCancel={() => setSightingWhiskey(null)}
          />
        </div>
      )}

      {/* Filter results info */}
      {filterQuery.trim() && (
        <div className="mb-3 text-xs text-oak-500">
          Showing {filtered.length} of {whiskeys.length} whiskeys
        </div>
      )}

      {/* No matches message */}
      {filterQuery.trim() && filtered.length === 0 && (
        <div className="text-center py-8">
          <p className="text-oak-500">No matches found.</p>
          <p className="text-oak-400 text-sm mt-1">Try adjusting your filter.</p>
        </div>
      )}

      {/* Whiskey list */}
      {filtered.length > 0 && (
        <div className="divide-y divide-oak-100">
          {filtered.map((entry) => (
            <div key={entry.id} className="py-3 group">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/whiskeys/${entry.whiskey.id}`}
                    className="font-medium text-whiskey-900 hover:text-whiskey-600 transition-colors"
                  >
                    {entry.whiskey.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {entry.whiskey.distillery && (
                      <span className="text-xs text-oak-500">{entry.whiskey.distillery}</span>
                    )}
                    {entry.whiskey.type && entry.whiskey.type !== 'other' && (
                      <Badge variant="default">{entry.whiskey.type.replace('_', ' ')}</Badge>
                    )}
                    {entry.whiskey.age && (
                      <span className="text-xs text-oak-400">{entry.whiskey.age}yr</span>
                    )}
                    {(() => {
                      const warning = getStalenessWarning(entry);
                      if (warning) {
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600" title={warning}>
                            <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                            {warning}
                          </span>
                        );
                      }
                      return <span className="text-xs text-oak-300">Verified {timeAgo(entry.last_verified)}</span>;
                    })()}
                  </div>

                  {/* Confirmation buttons */}
                  <div className="mt-1.5">
                    <ConfirmationButtons
                      barWhiskeyId={entry.id}
                      whiskeyName={entry.whiskey.name}
                      compact
                    />
                  </div>
                </div>

                <div className="text-right ml-2 sm:ml-4 shrink-0 flex flex-col items-end gap-1">
                  {entry.price != null && (
                    <p className="font-semibold text-whiskey-700">${entry.price.toFixed(2)}</p>
                  )}
                  {entry.pour_size && (
                    <p className="text-xs text-oak-400">{entry.pour_size}</p>
                  )}
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity mt-1">
                    <button
                      onClick={() => setSightingWhiskey({ id: entry.whiskey.id, name: entry.whiskey.name })}
                      className="text-xs text-whiskey-500 hover:text-whiskey-400"
                    >
                      Log sighting
                    </button>
                    <span className="text-oak-300">|</span>
                    <Link
                      href={`/bottles?q=${encodeURIComponent(entry.whiskey.name)}`}
                      className="text-xs text-amber-600 hover:text-amber-500 inline-flex items-center gap-0.5"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      Find bottle
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

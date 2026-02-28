'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface WhiskeyEntry {
  id: string;
  price: number | null;
  pour_size: string | null;
  notes: string | null;
  last_verified?: string | null;
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
    return 'Listing and source over 90 days old';
  }
  if (verifiedStale) {
    return 'Not verified in over 90 days';
  }
  if (sourceStale) {
    return 'Source data over 90 days old';
  }
  return null;
}

type SortKey = 'name' | 'price' | 'type';

export function WhiskeyList({ whiskeys }: { whiskeys: WhiskeyEntry[] }) {
  const [sortBy, setSortBy] = useState<SortKey>('name');

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

  if (whiskeys.length === 0) {
    return <p className="text-oak-500 text-sm">No whiskeys listed yet.</p>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <span className="text-sm text-oak-500">Sort by:</span>
        {(['name', 'price', 'type'] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-sm px-2 py-0.5 rounded ${sortBy === key ? 'bg-amber-100 text-amber-800 font-medium' : 'text-oak-600 hover:bg-oak-100'}`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>
      <div className="divide-y divide-oak-100">
        {sorted.map((entry) => (
          <Link
            key={entry.id}
            href={`/whiskeys/${entry.whiskey.id}`}
            className="flex items-center justify-between py-3 hover:bg-amber-50/50 px-2 -mx-2 rounded transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-whiskey-900 truncate">{entry.whiskey.name}</p>
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
                {getStalenessWarning(entry) && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    {getStalenessWarning(entry)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right ml-4 shrink-0">
              {entry.price != null && (
                <p className="font-semibold text-amber-700">${entry.price.toFixed(2)}</p>
              )}
              {entry.pour_size && (
                <p className="text-xs text-oak-400">{entry.pour_size}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

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
  whiskey: {
    id: string;
    name: string;
    distillery: string | null;
    type: string;
    age: number | null;
    abv: number | null;
  };
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

      {/* Whiskey list */}
      <div className="divide-y divide-oak-100">
        {sorted.map((entry) => (
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
                  <span className="text-xs text-oak-300">Verified {timeAgo(entry.last_verified)}</span>
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

              <div className="text-right ml-4 shrink-0 flex flex-col items-end gap-1">
                {entry.price != null && (
                  <p className="font-semibold text-whiskey-700">${entry.price.toFixed(2)}</p>
                )}
                {entry.pour_size && (
                  <p className="text-xs text-oak-400">{entry.pour_size}</p>
                )}
                <button
                  onClick={() => setSightingWhiskey({ id: entry.whiskey.id, name: entry.whiskey.name })}
                  className="text-xs text-whiskey-500 hover:text-whiskey-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                >
                  Log sighting
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

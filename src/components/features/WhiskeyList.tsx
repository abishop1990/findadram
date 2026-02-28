'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface WhiskeyEntry {
  id: string;
  price: number | null;
  pour_size: string | null;
  notes: string | null;
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
    return <p className="text-stone-500 text-sm">No whiskeys listed yet.</p>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <span className="text-sm text-stone-500">Sort by:</span>
        {(['name', 'price', 'type'] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-sm px-2 py-0.5 rounded ${sortBy === key ? 'bg-amber-100 text-amber-800 font-medium' : 'text-stone-600 hover:bg-stone-100'}`}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>
      <div className="divide-y divide-stone-100">
        {sorted.map((entry) => (
          <Link
            key={entry.id}
            href={`/whiskeys/${entry.whiskey.id}`}
            className="flex items-center justify-between py-3 hover:bg-amber-50/50 px-2 -mx-2 rounded transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-900 truncate">{entry.whiskey.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {entry.whiskey.distillery && (
                  <span className="text-xs text-stone-500">{entry.whiskey.distillery}</span>
                )}
                {entry.whiskey.type && entry.whiskey.type !== 'other' && (
                  <Badge variant="default">{entry.whiskey.type.replace('_', ' ')}</Badge>
                )}
                {entry.whiskey.age && (
                  <span className="text-xs text-stone-400">{entry.whiskey.age}yr</span>
                )}
              </div>
            </div>
            <div className="text-right ml-4 shrink-0">
              {entry.price != null && (
                <p className="font-semibold text-amber-700">${entry.price.toFixed(2)}</p>
              )}
              {entry.pour_size && (
                <p className="text-xs text-stone-400">{entry.pour_size}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

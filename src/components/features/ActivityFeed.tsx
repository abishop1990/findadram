'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface Activity {
  activity_type: 'sighting' | 'confirmation';
  whiskey_name: string;
  whiskey_id: string;
  display_name: string;
  price: number | null;
  pour_size: string | null;
  rating: number | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ barId }: { barId: string }) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bars/${barId}/activity?limit=15`)
      .then(res => res.json())
      .then(data => {
        setActivity(data.activity || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [barId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse rounded-lg bg-stone-100 h-16" />
        ))}
      </div>
    );
  }

  if (activity.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-stone-400 text-sm">No activity yet. Be the first to log a sighting!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activity.map((item, index) => (
        <div
          key={index}
          className="flex items-start gap-3 rounded-lg bg-white border border-stone-100 p-3"
        >
          <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
            item.activity_type === 'sighting'
              ? 'bg-amber-100 text-amber-700'
              : item.status === 'confirmed'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
          }`}>
            {item.activity_type === 'sighting' ? '🥃' : item.status === 'confirmed' ? '✓' : '✗'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-stone-800">
              <span className="font-medium">{item.display_name}</span>
              {item.activity_type === 'sighting' ? (
                <> had <Link href={`/whiskeys/${item.whiskey_id}`} className="font-semibold text-amber-700 hover:underline">{item.whiskey_name}</Link></>
              ) : (
                <> {item.status === 'confirmed' ? 'confirmed' : 'reported'}{' '}
                  <Link href={`/whiskeys/${item.whiskey_id}`} className="font-semibold text-amber-700 hover:underline">{item.whiskey_name}</Link>
                  {item.status === 'not_found' && <span className="text-red-600"> not available</span>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {item.price != null && <Badge variant="amber">${item.price.toFixed(2)}</Badge>}
              {item.pour_size && <Badge variant="default">{item.pour_size}</Badge>}
              {item.rating && (
                <span className="text-amber-500 text-xs">
                  {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                </span>
              )}
              <span className="text-xs text-stone-400">{timeAgo(item.created_at)}</span>
            </div>
            {item.notes && (
              <p className="text-xs text-stone-500 mt-1 italic">&ldquo;{item.notes}&rdquo;</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

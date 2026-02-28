import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { DistanceBadge } from '@/components/features/DistanceBadge';

interface BarEntry {
  id: string;
  price: number | null;
  pour_size: string | null;
  last_verified?: string | null;
  source_scraped_at?: string | null;
  source_date?: string | null;
  bar: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  distance_meters?: number | null;
}

const STALE_DAYS = 90;

function isStale(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  return days > STALE_DAYS;
}

function getStalenessWarning(entry: BarEntry): string | null {
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

export function BarList({ bars }: { bars: BarEntry[] }) {
  if (bars.length === 0) {
    return <p className="text-oak-500 text-sm">No bars carry this whiskey yet.</p>;
  }

  return (
    <div className="divide-y divide-oak-100">
      {bars.map((entry) => (
        <Link
          key={entry.id}
          href={`/bars/${entry.bar.id}`}
          className="flex items-center justify-between py-3 hover:bg-amber-50/50 px-2 -mx-2 rounded transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-whiskey-900">{entry.bar.name}</p>
            <p className="text-sm text-oak-500 truncate">
              {entry.bar.address || [entry.bar.city, entry.bar.state].filter(Boolean).join(', ')}
            </p>
            {getStalenessWarning(entry) && (
              <p className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                {getStalenessWarning(entry)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 ml-4 shrink-0">
            {entry.price != null && (
              <Badge variant="amber">${entry.price.toFixed(2)}</Badge>
            )}
            {entry.distance_meters != null && (
              <DistanceBadge meters={entry.distance_meters} />
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { DistanceBadge } from '@/components/features/DistanceBadge';

interface BarEntry {
  id: string;
  price: number | null;
  pour_size: string | null;
  bar: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
  };
  distance_meters?: number | null;
}

export function BarList({ bars }: { bars: BarEntry[] }) {
  if (bars.length === 0) {
    return <p className="text-stone-500 text-sm">No bars carry this whiskey yet.</p>;
  }

  return (
    <div className="divide-y divide-stone-100">
      {bars.map((entry) => (
        <Link
          key={entry.id}
          href={`/bars/${entry.bar.id}`}
          className="flex items-center justify-between py-3 hover:bg-amber-50/50 px-2 -mx-2 rounded transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-900">{entry.bar.name}</p>
            <p className="text-sm text-stone-500 truncate">
              {entry.bar.address || [entry.bar.city, entry.bar.state].filter(Boolean).join(', ')}
            </p>
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

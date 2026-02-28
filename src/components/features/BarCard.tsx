import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DistanceBadge } from '@/components/features/DistanceBadge';

interface BarCardProps {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  distance_meters?: number | null;
  whiskey_count?: number;
}

export function BarCard({ id, name, address, city, state, distance_meters, whiskey_count }: BarCardProps) {
  return (
    <Link href={`/bars/${id}`}>
      <Card className="hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-stone-900 truncate">{name}</h3>
            {(address || city) && (
              <p className="text-sm text-stone-500 mt-1 truncate">
                {address || [city, state].filter(Boolean).join(', ')}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {whiskey_count !== undefined && whiskey_count > 0 && (
                <Badge variant="amber">{whiskey_count} whiskeys</Badge>
              )}
            </div>
          </div>
          {distance_meters != null && (
            <DistanceBadge meters={distance_meters} />
          )}
        </div>
      </Card>
    </Link>
  );
}

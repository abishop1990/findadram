import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DistanceBadge } from '@/components/features/DistanceBadge';
import type { VenueCategory } from '@/types/database';

const CATEGORY_LABELS: Record<VenueCategory, string> = {
  whiskey_bar: 'Whiskey Bar',
  cocktail_bar: 'Cocktail Bar',
  restaurant: 'Restaurant',
  pub: 'Pub',
  hotel_bar: 'Hotel Bar',
  distillery: 'Distillery',
  brewery: 'Brewery',
  wine_bar: 'Wine Bar',
  lounge: 'Lounge',
  other: 'Bar',
};

interface BarCardProps {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  category?: VenueCategory | null;
  distance_meters?: number | null;
  whiskey_count?: number;
  index?: number;
}

export function BarCard({ id, name, address, city, state, category, distance_meters, whiskey_count, index = 0 }: BarCardProps) {
  const animationDelay = `${index * 0.1}s`;

  return (
    <Link href={`/bars/${id}`}>
      <Card
        className="border-l-4 border-l-amber-500 hover:border-l-amber-400 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer animate-fade-in"
        style={{
          animation: `fade-in 0.3s ease-out ${animationDelay}`,
          animationFillMode: 'both',
        }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-whiskey-900 truncate">{name}</h3>
            {(address || city) && (
              <div className="flex items-start gap-2 mt-1">
                <svg className="w-4 h-4 text-oak-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <div className="min-w-0 flex-1">
                  {address ? (
                    <p className="text-sm text-oak-500 truncate">{address}</p>
                  ) : (
                    <p className="text-sm text-oak-500">{[city, state].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 mt-3">
              {category && category !== 'other' && (
                <Badge variant="default">{CATEGORY_LABELS[category]}</Badge>
              )}
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

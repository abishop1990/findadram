import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const typeColors: Record<string, string> = {
  bourbon: 'amber',
  scotch: 'blue',
  irish: 'green',
  rye: 'red',
  japanese: 'default',
  single_malt: 'blue',
  blended: 'default',
};

interface WhiskeyCardProps {
  id: string;
  name: string;
  distillery?: string | null;
  type?: string;
  age?: number | null;
  bar_count?: number;
  nearest_bar_name?: string | null;
  nearest_bar_distance?: number | null;
}

export function WhiskeyCard({ id, name, distillery, type, age, bar_count, nearest_bar_name, nearest_bar_distance }: WhiskeyCardProps) {
  return (
    <Link href={`/whiskeys/${id}`}>
      <Card className="hover:border-amber-300 hover:shadow-md transition-all cursor-pointer">
        <div>
          <h3 className="font-semibold text-stone-900">{name}</h3>
          {distillery && (
            <p className="text-sm text-stone-500 mt-0.5">{distillery}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {type && type !== 'other' && (
              <Badge variant={(typeColors[type] || 'default') as 'default' | 'amber' | 'green' | 'blue' | 'red'}>
                {type.replace('_', ' ')}
              </Badge>
            )}
            {age && (
              <Badge variant="default">{age}yr</Badge>
            )}
            {bar_count !== undefined && bar_count > 0 && (
              <Badge variant="green">
                {bar_count} {bar_count === 1 ? 'bar' : 'bars'}
              </Badge>
            )}
          </div>
          {nearest_bar_name && (
            <p className="text-xs text-stone-400 mt-2">
              Nearest: {nearest_bar_name}
              {nearest_bar_distance != null && ` (${(nearest_bar_distance / 1609.34).toFixed(1)} mi)`}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

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

const typeIcons: Record<string, string> = {
  bourbon: '🥃',
  scotch: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  irish: '🍀',
  rye: '🌾',
  japanese: '🎌',
  single_malt: '✨',
  blended: '🥂',
};

interface WhiskeyCardProps {
  id: string;
  name: string;
  distillery?: string | null;
  type?: string;
  age?: number | null;
  abv?: number | null;
  bar_count?: number;
  nearest_bar_name?: string | null;
  nearest_bar_distance?: number | null;
  index?: number;
}

export function WhiskeyCard({ id, name, distillery, type, age, abv, bar_count, nearest_bar_name, nearest_bar_distance, index = 0 }: WhiskeyCardProps) {
  const animationDelay = `${index * 0.1}s`;

  return (
    <Link href={`/whiskeys/${id}`}>
      <Card
        className="border-t-2 border-t-amber-500 hover:border-t-amber-400 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer animate-fade-in"
        style={{
          animation: `fade-in 0.3s ease-out ${animationDelay}`,
          animationFillMode: 'both',
        }}>
        <div>
          <h3 className="font-semibold text-whiskey-900">{name}</h3>
          {distillery && (
            <p className="text-sm text-oak-500 mt-0.5">{distillery}</p>
          )}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {type && type !== 'other' && (
              <Badge variant={(typeColors[type] || 'default') as 'default' | 'amber' | 'green' | 'blue' | 'red'}>
                {typeIcons[type] && `${typeIcons[type]} `}
                {type.replace('_', ' ')}
              </Badge>
            )}
            {age && (
              <Badge variant="default">{age}yr</Badge>
            )}
            {abv && (
              <Badge variant="default" className="bg-whiskey-100 text-whiskey-900">
                {abv}%
              </Badge>
            )}
            {bar_count !== undefined && bar_count > 0 && (
              <Badge variant="green">
                {bar_count} {bar_count === 1 ? 'bar' : 'bars'}
              </Badge>
            )}
          </div>
          {nearest_bar_name && (
            <div className="mt-3 pt-3 border-t border-oak-200">
              <p className="text-xs text-oak-600 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium text-oak-700">{nearest_bar_name}</span>
                {nearest_bar_distance != null && (
                  <span className="text-oak-500">({(nearest_bar_distance / 1609.34).toFixed(1)} mi)</span>
                )}
              </p>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

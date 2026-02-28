import { Badge } from '@/components/ui/Badge';

export function DistanceBadge({ meters }: { meters: number }) {
  const miles = meters / 1609.34;

  let display: string;
  if (miles < 0.1) {
    display = `${Math.round(meters)}m`;
  } else if (miles < 10) {
    display = `${miles.toFixed(1)} mi`;
  } else {
    display = `${Math.round(miles)} mi`;
  }

  return <Badge variant="blue">{display}</Badge>;
}

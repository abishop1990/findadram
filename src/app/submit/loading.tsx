import { Skeleton } from '@/components/ui/Skeleton';

export default function SubmitLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="h-10 w-64 mb-2" />
      <Skeleton className="h-4 w-full mb-8" />
      <Skeleton className="h-10 w-full mb-6" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

import { Skeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-whiskey-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex justify-center">
          <Skeleton className="h-10 w-full max-w-2xl bg-oak-200" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg bg-oak-200 animate-pulse" />
          ))}
        </div>
        <div className="flex justify-center mt-8">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border-4 border-oak-200 border-t-amber-500 animate-spin"></div>
            <span className="text-whiskey-600">Loading whiskeys...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

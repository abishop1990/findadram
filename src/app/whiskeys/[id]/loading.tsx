import { Skeleton } from '@/components/ui/Skeleton';

export default function WhiskeyLoading() {
  return (
    <div className="min-h-screen bg-whiskey-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Skeleton className="h-4 w-32 mb-4 bg-oak-200" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-10 w-64 mb-2 bg-oak-200" />
            <Skeleton className="h-5 w-40 mb-4 bg-oak-200" />
            <div className="flex gap-2 mb-6">
              <Skeleton className="h-6 w-20 bg-oak-200" />
              <Skeleton className="h-6 w-16 bg-oak-200" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-oak-200 animate-pulse" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-64 w-full rounded-lg bg-oak-200 animate-pulse" />
          </div>
        </div>
        <div className="flex justify-center mt-12">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border-4 border-oak-200 border-t-amber-500 animate-spin"></div>
            <span className="text-whiskey-600">Loading whiskey...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/ui/Skeleton';

export default function SubmitLoading() {
  return (
    <div className="min-h-screen bg-whiskey-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-10 w-64 mb-2 bg-oak-200" />
        <Skeleton className="h-4 w-full mb-8 bg-oak-200" />
        <Skeleton className="h-10 w-full mb-6 bg-oak-200 animate-pulse" />
        <Skeleton className="h-48 w-full rounded-lg bg-oak-200 animate-pulse" />
        <div className="flex justify-center mt-12">
          <div className="inline-flex items-center gap-2">
            <div className="h-8 w-8 rounded-full border-4 border-oak-200 border-t-amber-500 animate-spin"></div>
            <span className="text-whiskey-600">Loading submission form...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

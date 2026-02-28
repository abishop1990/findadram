export default function BottlesLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center">
          <div className="h-6 w-40 rounded-full bg-whiskey-800 animate-pulse mx-auto mb-5" />
          <div className="h-10 w-64 rounded bg-whiskey-800 animate-pulse mx-auto mb-4" />
          <div className="h-4 w-96 max-w-full rounded bg-whiskey-800 animate-pulse mx-auto mb-2" />
          <div className="h-4 w-72 max-w-full rounded bg-whiskey-800 animate-pulse mx-auto" />
        </div>
      </section>

      {/* Search form skeleton */}
      <section className="mx-auto max-w-2xl px-4 py-10">
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-oak-100 animate-pulse" />
          <div className="h-11 w-full rounded-lg bg-oak-100 animate-pulse" />
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <div className="h-4 w-20 rounded bg-oak-100 animate-pulse" />
              <div className="h-11 w-full rounded-lg bg-oak-100 animate-pulse" />
            </div>
            <div className="flex items-end">
              <div className="h-11 w-32 rounded-lg bg-whiskey-200 animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

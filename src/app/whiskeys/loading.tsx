export default function WhiskeysLoading() {
  return (
    <div className="min-h-screen bg-whiskey-50">
      {/* Hero skeleton */}
      <section className="bg-gradient-to-br from-whiskey-950 via-whiskey-900 to-whiskey-800 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex justify-center">
            <div className="h-12 w-full max-w-2xl rounded-lg bg-whiskey-800 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Filter tabs skeleton */}
      <section className="border-b border-oak-200 bg-white sticky top-16 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex gap-2 overflow-x-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-oak-100 animate-pulse shrink-0" />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-oak-200 border-t-2 border-t-amber-500 bg-white p-5 shadow-sm">
              <div className="h-5 w-3/4 rounded bg-oak-100 animate-pulse mb-2" />
              <div className="h-4 w-1/2 rounded bg-oak-100 animate-pulse mb-3" />
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-oak-100 animate-pulse" />
                <div className="h-6 w-12 rounded-full bg-oak-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

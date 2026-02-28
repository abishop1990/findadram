export default function BarsLoading() {
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

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-oak-200 bg-white p-5 shadow-sm">
              <div className="h-5 w-3/4 rounded bg-oak-100 animate-pulse mb-3" />
              <div className="h-4 w-1/2 rounded bg-oak-100 animate-pulse mb-2" />
              <div className="h-3 w-1/3 rounded bg-oak-100 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

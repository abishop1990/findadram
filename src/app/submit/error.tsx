'use client';

export default function SubmitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-stone-900 mb-2">Something went wrong</h2>
      <p className="text-stone-500 mb-4">{error.message || 'Failed to load the submission page'}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

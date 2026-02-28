'use client';

export default function SubmitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-whiskey-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg border-2 border-red-200 p-8">
        <div className="text-4xl mb-4 text-center">⚠️</div>
        <h2 className="text-2xl font-semibold text-whiskey-900 mb-2 text-center">Something went wrong</h2>
        <p className="text-whiskey-600 mb-6 text-center text-sm">{error.message || 'Failed to load the submission page'}</p>
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

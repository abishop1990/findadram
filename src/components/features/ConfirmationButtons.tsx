'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';

interface ConfirmationButtonsProps {
  barWhiskeyId: string;
  whiskeyName: string;
  compact?: boolean;
}

export function ConfirmationButtons({ barWhiskeyId, whiskeyName, compact = false }: ConfirmationButtonsProps) {
  const { sessionId } = useSession();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<'confirmed' | 'not_found' | null>(null);
  const [stats, setStats] = useState<{ confirmed: number; not_found: number } | null>(null);

  useEffect(() => {
    fetch(`/api/confirmations?bar_whiskey_id=${barWhiskeyId}&limit=50`)
      .then(res => res.json())
      .then(data => {
        if (data.stats) setStats(data.stats);
      })
      .catch(() => {});
  }, [barWhiskeyId, submitted]);

  const handleConfirmation = async (status: 'confirmed' | 'not_found') => {
    if (!sessionId || loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/confirmations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          bar_whiskey_id: barWhiskeyId,
          status,
        }),
      });

      if (res.ok) {
        setSubmitted(status);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <span className={submitted === 'confirmed' ? 'text-green-600' : 'text-red-500'}>
          {submitted === 'confirmed' ? '✓ Confirmed' : '✗ Not found'}
        </span>
        <span className="text-oak-400">— thanks!</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-1'}`}>
      <button
        onClick={() => handleConfirmation('confirmed')}
        disabled={loading}
        className={`inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 ${
          compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        }`}
        title={`Confirm ${whiskeyName} is here`}
      >
        <span>✓</span>
        <span>Still here</span>
        {stats && stats.confirmed > 0 && (
          <span className="ml-1 text-green-500">({stats.confirmed})</span>
        )}
      </button>
      <button
        onClick={() => handleConfirmation('not_found')}
        disabled={loading}
        className={`inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 ${
          compact ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
        }`}
        title={`Report ${whiskeyName} not found`}
      >
        <span>✗</span>
        <span>Not here</span>
        {stats && stats.not_found > 0 && (
          <span className="ml-1 text-red-400">({stats.not_found})</span>
        )}
      </button>
    </div>
  );
}

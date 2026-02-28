'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useSession } from '@/hooks/useSession';

const POUR_SIZES = [
  { value: '1oz', label: '1 oz' },
  { value: '1.5oz', label: '1.5 oz' },
  { value: '2oz', label: '2 oz' },
  { value: '25ml', label: '25 ml' },
  { value: '35ml', label: '35 ml' },
  { value: '50ml', label: '50 ml' },
  { value: 'dram', label: 'Dram' },
  { value: 'flight', label: 'Flight' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'other', label: 'Other' },
];

interface SightingFormProps {
  barId: string;
  barName: string;
  whiskeyId: string;
  whiskeyName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SightingForm({ barId, barName, whiskeyId, whiskeyName, onSuccess, onCancel }: SightingFormProps) {
  const { sessionId } = useSession();
  const [price, setPrice] = useState('');
  const [pourSize, setPourSize] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/sightings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          bar_id: barId,
          whiskey_id: whiskeyId,
          price: price ? parseFloat(price) : null,
          pour_size: pourSize || null,
          rating,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setSuccess(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
        <p className="text-green-800 font-medium">Sighting logged!</p>
        <p className="text-green-600 text-sm mt-1">Thanks for contributing to Find a Dram</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
        <p className="text-sm text-oak-600">
          Logging <span className="font-semibold text-amber-800">{whiskeyName}</span> at{' '}
          <span className="font-semibold text-amber-800">{barName}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-oak-700 mb-1">Price ($)</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="14.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-oak-700 mb-1">Pour Size</label>
          <select
            value={pourSize}
            onChange={(e) => setPourSize(e.target.value)}
            className="w-full rounded-lg border border-oak-300 bg-white px-3 py-2 text-whiskey-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">Select...</option>
            {POUR_SIZES.map((ps) => (
              <option key={ps.value} value={ps.value}>{ps.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-oak-700 mb-1">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(rating === star ? null : star)}
              className={`w-9 h-9 rounded-lg text-lg transition-colors ${
                rating && star <= rating
                  ? 'bg-amber-500 text-white'
                  : 'bg-oak-100 text-oak-400 hover:bg-amber-100'
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-oak-700 mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tasting notes, thoughts..."
          rows={2}
          className="w-full rounded-lg border border-oak-300 bg-white px-4 py-2 text-whiskey-900 placeholder:text-oak-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Submitting...' : 'Log Sighting'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        )}
      </div>
    </form>
  );
}

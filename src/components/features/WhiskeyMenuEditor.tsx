'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Whiskey } from '@/types/database';

interface BarWhiskeyItem {
  id: string;
  bar_id: string;
  whiskey_id: string;
  price: number | null;
  pour_size: string | null;
  available: boolean;
  notes: string | null;
  last_verified: string;
  confidence: number;
  is_stale: boolean;
  whiskey: Whiskey;
}

interface WhiskeyMenuEditorProps {
  barId: string;
  initialItems: BarWhiskeyItem[];
}

type EditingState = {
  id: string;
  price: string;
  pourSize: string;
  available: boolean;
  notes: string;
} | null;

export function WhiskeyMenuEditor({ initialItems }: WhiskeyMenuEditorProps) {
  const [items, setItems] = useState<BarWhiskeyItem[]>(initialItems);
  const [editing, setEditing] = useState<EditingState>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(true);

  const filteredItems = items.filter((item) => {
    if (!showUnavailable && !item.available) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      item.whiskey.name.toLowerCase().includes(q) ||
      (item.whiskey.distillery?.toLowerCase().includes(q) ?? false) ||
      item.whiskey.type.toLowerCase().includes(q)
    );
  });

  const startEditing = useCallback((item: BarWhiskeyItem) => {
    setEditing({
      id: item.id,
      price: item.price?.toString() ?? '',
      pourSize: item.pour_size ?? '2oz',
      available: item.available,
      notes: item.notes ?? '',
    });
  }, []);

  const cancelEditing = useCallback(() => {
    setEditing(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSaving(true);

    try {
      const res = await fetch('/api/bar-whiskeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          price: editing.price ? parseFloat(editing.price) : null,
          pour_size: editing.pourSize || null,
          available: editing.available,
          notes: editing.notes || null,
        }),
      });

      if (res.ok) {
        const { bar_whiskey } = await res.json();
        setItems((prev) =>
          prev.map((item) =>
            item.id === editing.id ? { ...item, ...bar_whiskey } : item
          )
        );
        setEditing(null);
      }
    } catch {
      // User can retry
    } finally {
      setSaving(false);
    }
  }, [editing]);

  const toggleAvailability = useCallback(async (item: BarWhiskeyItem) => {
    const newAvailable = !item.available;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, available: newAvailable } : i))
    );

    try {
      await fetch('/api/bar-whiskeys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, available: newAvailable }),
      });
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, available: item.available } : i))
      );
    }
  }, []);

  const availableCount = items.filter((i) => i.available).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-whiskey-900">Whiskey Menu</h2>
          <p className="text-sm text-oak-500 mt-0.5">
            {availableCount} available &middot; {items.length} total
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-oak-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showUnavailable}
            onChange={(e) => setShowUnavailable(e.target.checked)}
            className="rounded border-oak-300 text-whiskey-500 focus:ring-whiskey-400"
          />
          Show unavailable
        </label>
      </div>

      {/* Filter */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-oak-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Filter whiskeys..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-oak-200 bg-white py-2.5 pl-10 pr-4 text-sm text-whiskey-900 placeholder-oak-400 focus:border-whiskey-400 focus:outline-none focus:ring-1 focus:ring-whiskey-400 transition-colors"
        />
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-oak-500 text-sm">
            {filter ? `No whiskeys matching "${filter}"` : 'No whiskeys on the menu yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className={`transition-all duration-200 ${!item.available ? 'opacity-60' : ''} ${editing?.id === item.id ? 'ring-2 ring-whiskey-400' : ''}`}
            >
              {editing?.id === item.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-whiskey-900">{item.whiskey.name}</h3>
                    <Badge variant={item.whiskey.type === 'bourbon' ? 'amber' : 'default'}>
                      {item.whiskey.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-oak-600 mb-1">Price ($)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editing.price}
                        onChange={(e) => setEditing((prev) => prev ? { ...prev, price: e.target.value } : null)}
                        className="w-full rounded-md border border-oak-200 px-3 py-2 text-sm focus:border-whiskey-400 focus:outline-none focus:ring-1 focus:ring-whiskey-400"
                        placeholder="14.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-oak-600 mb-1">Pour Size</label>
                      <select
                        value={editing.pourSize}
                        onChange={(e) => setEditing((prev) => prev ? { ...prev, pourSize: e.target.value } : null)}
                        className="w-full rounded-md border border-oak-200 px-3 py-2 text-sm focus:border-whiskey-400 focus:outline-none focus:ring-1 focus:ring-whiskey-400"
                      >
                        <option value="1oz">1 oz</option>
                        <option value="1.5oz">1.5 oz</option>
                        <option value="2oz">2 oz</option>
                        <option value="25ml">25 ml</option>
                        <option value="50ml">50 ml</option>
                        <option value="dram">Dram</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-oak-600 mb-1">Notes</label>
                    <input
                      type="text"
                      value={editing.notes}
                      onChange={(e) => setEditing((prev) => prev ? { ...prev, notes: e.target.value } : null)}
                      className="w-full rounded-md border border-oak-200 px-3 py-2 text-sm focus:border-whiskey-400 focus:outline-none focus:ring-1 focus:ring-whiskey-400"
                      placeholder="e.g. Private barrel, Happy hour special..."
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.available}
                      onChange={(e) => setEditing((prev) => prev ? { ...prev, available: e.target.checked } : null)}
                      className="rounded border-oak-300 text-whiskey-500 focus:ring-whiskey-400"
                    />
                    <span className="text-sm text-oak-700">Currently available</span>
                  </label>

                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={cancelEditing}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-whiskey-900 text-sm truncate">
                        {item.whiskey.name}
                      </h3>
                      {item.is_stale && (
                        <span className="shrink-0 text-xs text-amber-600" title="Data may be outdated">
                          &#x23F0;
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.whiskey.distillery && (
                        <span className="text-xs text-oak-500">{item.whiskey.distillery}</span>
                      )}
                      <Badge variant={item.whiskey.type === 'bourbon' ? 'amber' : 'default'}>
                        {item.whiskey.type}
                      </Badge>
                      {item.price != null && (
                        <span className="text-xs font-semibold text-whiskey-700">
                          ${item.price.toFixed(2)}
                          {item.pour_size && (
                            <span className="text-oak-400 font-normal"> / {item.pour_size}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-oak-400 mt-1 truncate">{item.notes}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-whiskey-400 focus:ring-offset-1 ${
                        item.available ? 'bg-green-500' : 'bg-oak-300'
                      }`}
                      role="switch"
                      aria-checked={item.available}
                      aria-label={`${item.whiskey.name} availability`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${item.available ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      className="p-1.5 rounded-md text-oak-400 hover:text-whiskey-600 hover:bg-whiskey-50 transition-colors"
                      aria-label={`Edit ${item.whiskey.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

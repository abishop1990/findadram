'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import type { BarWhiskeyWithDetails } from '@/app/dashboard/bar/[id]/page';

// ─── types ────────────────────────────────────────────────────────────────────

interface WhiskeySearchResult {
  id: string;
  name: string;
  distillery: string | null;
  type: string;
  age: number | null;
}

interface EditingState {
  barWhiskeyId: string;
  field: 'price' | 'pour_size' | 'notes';
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface WhiskeyMenuEditorProps {
  barId: string;
  initialItems: BarWhiskeyWithDetails[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const POUR_SIZES = [
  '1oz', '1.5oz', '2oz', '25ml', '35ml', '50ml',
  'dram', 'flight', 'bottle', 'other',
] as const;

function formatType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── InlineEdit sub-component ─────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  onCancel,
  type = 'text',
  placeholder,
  prefix,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  type?: 'text' | 'number';
  placeholder?: string;
  prefix?: string;
}) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onSave(local);
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div className="flex items-center gap-1">
      {prefix && <span className="text-sm text-oak-500">{prefix}</span>}
      <input
        ref={inputRef}
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onSave(local)}
        placeholder={placeholder}
        min={type === 'number' ? '0' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        className="w-24 rounded-md border border-amber-400 bg-amber-50 px-2 py-0.5 text-sm text-whiskey-900 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
        aria-label="Edit value"
      />
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export function WhiskeyMenuEditor({ barId, initialItems }: WhiskeyMenuEditorProps) {
  const [items, setItems] = useState<BarWhiskeyWithDetails[]>(initialItems);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WhiskeySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── patch helper ────────────────────────────────────────────────────────────
  const patchItem = useCallback(
    async (barWhiskeyId: string, updates: Record<string, unknown>) => {
      setSaveStates((prev) => ({ ...prev, [barWhiskeyId]: 'saving' }));
      try {
        const res = await fetch(`/api/bars/${barId}/whiskeys`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: barWhiskeyId, ...updates }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? 'Update failed');
        }
        setSaveStates((prev) => ({ ...prev, [barWhiskeyId]: 'saved' }));
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [barWhiskeyId]: 'idle' }));
        }, 1500);
      } catch {
        setSaveStates((prev) => ({ ...prev, [barWhiskeyId]: 'error' }));
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [barWhiskeyId]: 'idle' }));
        }, 3000);
      }
    },
    [barId]
  );

  // ── availability toggle ────────────────────────────────────────────────────
  async function toggleAvailability(item: BarWhiskeyWithDetails) {
    const newVal = !item.available;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, available: newVal } : i))
    );
    await patchItem(item.id, { available: newVal });
  }

  // ── inline edit save ───────────────────────────────────────────────────────
  async function saveEdit(
    barWhiskeyId: string,
    field: 'price' | 'pour_size' | 'notes',
    rawValue: string
  ) {
    setEditing(null);
    let value: string | number | null = rawValue.trim() === '' ? null : rawValue.trim();
    if (field === 'price') {
      value = rawValue.trim() === '' ? null : parseFloat(rawValue);
      if (value !== null && isNaN(value as number)) return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === barWhiskeyId ? { ...i, [field]: value } : i))
    );
    await patchItem(barWhiskeyId, { [field]: value });
  }

  // ── whiskey search for add form ────────────────────────────────────────────
  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setAddError(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: value.trim(), type: 'whiskey', limit: '8' });
        const res = await fetch(`/api/search?${params}`);
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data.whiskeys ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  // ── add whiskey to bar ─────────────────────────────────────────────────────
  async function addWhiskey(whiskey: WhiskeySearchResult) {
    const alreadyAdded = items.some((i) => i.whiskey_id === whiskey.id);
    if (alreadyAdded) {
      setAddError('This whiskey is already on your menu. You can edit it below.');
      return;
    }
    setAddError(null);
    try {
      const res = await fetch(`/api/bars/${barId}/whiskeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whiskey_id: whiskey.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to add whiskey');
      }
      const data = await res.json();
      const newEntry: BarWhiskeyWithDetails = {
        id: data.id,
        bar_id: barId,
        whiskey_id: whiskey.id,
        price: null,
        pour_size: null,
        available: true,
        notes: null,
        last_verified: new Date().toISOString(),
        confidence: 1,
        is_stale: false,
        whiskey: {
          id: whiskey.id,
          name: whiskey.name,
          normalized_name: whiskey.name.toLowerCase(),
          distillery: whiskey.distillery,
          region: null,
          country: null,
          type: whiskey.type as BarWhiskeyWithDetails['whiskey']['type'],
          age: whiskey.age,
          abv: null,
          description: null,
          image_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
      setItems((prev) => [newEntry, ...prev]);
      setSearchQuery('');
      setSearchResults([]);
      setShowAddForm(false);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add whiskey');
    }
  }

  // ── filter ─────────────────────────────────────────────────────────────────
  const filteredItems = filterQuery.trim()
    ? items.filter(
        (i) =>
          i.whiskey.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
          (i.whiskey.distillery ?? '').toLowerCase().includes(filterQuery.toLowerCase())
      )
    : items;

  const availableCount = items.filter((i) => i.available).length;
  const unavailableCount = items.length - availableCount;

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-oak-200 shadow-sm overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-oak-100 bg-gradient-to-r from-whiskey-50 to-oak-50">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-whiskey-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <h2 className="text-lg font-bold text-whiskey-900">Whiskey Menu</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="amber">{availableCount} available</Badge>
            {unavailableCount > 0 && (
              <Badge variant="default">{unavailableCount} off-menu</Badge>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowAddForm((v) => !v);
                setAddError(null);
                setSearchQuery('');
                setSearchResults([]);
              }}
              aria-expanded={showAddForm}
            >
              <svg
                className="h-3.5 w-3.5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Whiskey
            </Button>
          </div>
        </div>

        {/* ── Add whiskey panel ────────────────────────────────────────── */}
        {showAddForm && (
          <div className="px-5 py-4 border-b border-oak-100 bg-amber-50/60">
            <label
              htmlFor="whiskey-search"
              className="block text-sm font-semibold text-whiskey-800 mb-2"
            >
              Search &amp; add a whiskey to your menu
            </label>
            <div className="relative">
              <Input
                id="whiskey-search"
                type="text"
                placeholder="Search by name or distillery..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Search whiskeys to add"
                className="pr-8"
              />
              {isSearching && (
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                >
                  <svg className="h-4 w-4 text-oak-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>

            {addError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {addError}
              </p>
            )}

            {searchResults.length > 0 && (
              <ul
                className="mt-2 rounded-lg border border-oak-200 bg-white shadow-sm divide-y divide-oak-50 max-h-56 overflow-y-auto"
                role="listbox"
                aria-label="Whiskey search results"
              >
                {searchResults.map((w) => {
                  const alreadyAdded = items.some((i) => i.whiskey_id === w.id);
                  return (
                    <li
                      key={w.id}
                      role="option"
                      aria-selected={false}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-whiskey-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-whiskey-900 truncate">{w.name}</p>
                        <p className="text-xs text-oak-500 truncate">
                          {[
                            w.distillery,
                            formatType(w.type),
                            w.age ? `${w.age}yr` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      {alreadyAdded ? (
                        <span className="ml-3 shrink-0 text-xs text-oak-400 italic">
                          Already added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addWhiskey(w)}
                          className="ml-3 shrink-0 inline-flex items-center gap-1 rounded-md bg-whiskey-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-whiskey-500 transition-colors"
                          aria-label={`Add ${w.name} to menu`}
                        >
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            aria-hidden="true"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Add
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ── Filter bar ───────────────────────────────────────────────── */}
        {items.length > 5 && (
          <div className="px-5 py-3 border-b border-oak-100">
            <Input
              type="text"
              placeholder="Filter menu..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              aria-label="Filter whiskey menu"
              className="max-w-xs text-sm py-1.5"
            />
          </div>
        )}

        {/* ── Menu items ───────────────────────────────────────────────── */}
        {filteredItems.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <svg
              className="h-10 w-10 text-oak-200 mx-auto mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            <p className="text-sm font-medium text-oak-600">
              {filterQuery
                ? `No whiskeys match "${filterQuery}"`
                : 'No whiskeys on your menu yet'}
            </p>
            {!filterQuery && (
              <p className="text-xs text-oak-400 mt-1">
                Use &ldquo;Add Whiskey&rdquo; above to build your menu
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-oak-100" aria-label="Whiskey menu items">
            {filteredItems.map((item) => {
              const saveState = saveStates[item.id] ?? 'idle';
              const isEditingPrice =
                editing?.barWhiskeyId === item.id && editing.field === 'price';
              const isEditingPourSize =
                editing?.barWhiskeyId === item.id && editing.field === 'pour_size';
              const isEditingNotes =
                editing?.barWhiskeyId === item.id && editing.field === 'notes';

              return (
                <li
                  key={item.id}
                  className={`px-5 py-4 transition-colors ${item.available ? 'bg-white' : 'bg-oak-50/60'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Availability toggle */}
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item)}
                      aria-label={
                        item.available
                          ? `Mark ${item.whiskey.name} as unavailable`
                          : `Mark ${item.whiskey.name} as available`
                      }
                      aria-pressed={item.available}
                      className={`shrink-0 mt-1 relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 ${
                        item.available ? 'bg-amber-500' : 'bg-oak-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          item.available ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`font-semibold text-sm truncate ${
                              item.available
                                ? 'text-whiskey-900'
                                : 'text-oak-500 line-through'
                            }`}
                          >
                            {item.whiskey.name}
                          </p>
                          <p className="text-xs text-oak-500 truncate mt-0.5">
                            {[
                              item.whiskey.distillery,
                              formatType(item.whiskey.type),
                              item.whiskey.age ? `${item.whiskey.age}yr` : null,
                              item.whiskey.abv ? `${item.whiskey.abv}% ABV` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>

                        {/* Save state indicator */}
                        <div
                          className="shrink-0 flex items-center h-5"
                          aria-live="polite"
                          aria-atomic="true"
                        >
                          {saveState === 'saving' && (
                            <svg
                              className="h-3.5 w-3.5 text-amber-500 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                              aria-label="Saving"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          {saveState === 'saved' && (
                            <svg
                              className="h-3.5 w-3.5 text-green-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-label="Saved"
                            >
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          )}
                          {saveState === 'error' && (
                            <svg
                              className="h-3.5 w-3.5 text-red-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-label="Save failed"
                            >
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {/* Inline-editable fields */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5">

                        {/* Price */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-oak-400 uppercase tracking-wider text-[10px] font-medium">
                            Price
                          </span>
                          {isEditingPrice ? (
                            <InlineEdit
                              value={item.price != null ? String(item.price) : ''}
                              onSave={(v) => saveEdit(item.id, 'price', v)}
                              onCancel={() => setEditing(null)}
                              type="number"
                              placeholder="0.00"
                              prefix="$"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({ barWhiskeyId: item.id, field: 'price' })
                              }
                              className="font-semibold text-whiskey-700 hover:text-whiskey-500 hover:underline transition-colors focus:outline-none focus:underline"
                              aria-label={`Edit price for ${item.whiskey.name}`}
                              title="Click to edit"
                            >
                              {item.price != null ? (
                                `$${(item.price as number).toFixed(2)}`
                              ) : (
                                <span className="text-oak-400 italic font-normal text-[11px]">
                                  Set price
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Pour size */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-oak-400 uppercase tracking-wider text-[10px] font-medium">
                            Pour
                          </span>
                          {isEditingPourSize ? (
                            <select
                              autoFocus
                              defaultValue={item.pour_size ?? ''}
                              onChange={(e) => saveEdit(item.id, 'pour_size', e.target.value)}
                              onBlur={() => setEditing(null)}
                              className="rounded-md border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-xs text-whiskey-900 focus:outline-none"
                              aria-label={`Select pour size for ${item.whiskey.name}`}
                            >
                              <option value="">None</option>
                              {POUR_SIZES.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({ barWhiskeyId: item.id, field: 'pour_size' })
                              }
                              className="font-medium text-whiskey-700 hover:text-whiskey-500 hover:underline transition-colors focus:outline-none focus:underline"
                              aria-label={`Edit pour size for ${item.whiskey.name}`}
                              title="Click to edit"
                            >
                              {item.pour_size ?? (
                                <span className="text-oak-400 italic font-normal text-[11px]">
                                  Set size
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Notes */}
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-oak-400 uppercase tracking-wider text-[10px] font-medium">
                            Notes
                          </span>
                          {isEditingNotes ? (
                            <InlineEdit
                              value={item.notes ?? ''}
                              onSave={(v) => saveEdit(item.id, 'notes', v)}
                              onCancel={() => setEditing(null)}
                              placeholder="Optional note"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setEditing({ barWhiskeyId: item.id, field: 'notes' })
                              }
                              className="text-whiskey-700 hover:text-whiskey-500 hover:underline transition-colors focus:outline-none focus:underline truncate max-w-[140px]"
                              aria-label={`Edit notes for ${item.whiskey.name}`}
                              title="Click to edit"
                            >
                              {item.notes ?? (
                                <span className="text-oak-400 italic font-normal text-[11px]">
                                  Add note
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Stale indicator */}
                        {item.is_stale && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            <svg
                              className="h-2.5 w-2.5"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                            Needs update
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Usage hint */}
      {items.length > 0 && (
        <p className="text-xs text-oak-400 text-center">
          Click any price, pour size, or note to edit inline. Use the toggle to mark items as
          available or unavailable.
        </p>
      )}
    </div>
  );
}

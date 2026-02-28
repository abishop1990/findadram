/** Safe parseInt with bounds clamping. Returns fallback on NaN. */
export function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = parseInt(value || '', 10);
  if (isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

/** Parse a coordinate string, returning undefined if invalid or out of range. */
export function parseCoord(value: string | null, min: number, max: number): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

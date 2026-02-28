const required = [
  'ANTHROPIC_API_KEY',
] as const;

const optional = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GOOGLE_PLACES_API_KEY',
] as const;

type RequiredKey = typeof required[number];
type OptionalKey = typeof optional[number];

export function validateEnv(): Record<RequiredKey, string> & Partial<Record<OptionalKey, string>> {
  const missing: string[] = [];

  for (const key of required) {
    const val = process.env[key];
    if (!val || val.startsWith('your_')) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Check your .env.local file.`
    );
  }

  return Object.fromEntries([
    ...required.map((k) => [k, process.env[k]!]),
    ...optional.filter((k) => process.env[k] && !process.env[k]!.startsWith('your_')).map((k) => [k, process.env[k]!]),
  ]) as Record<RequiredKey, string> & Partial<Record<OptionalKey, string>>;
}

export function getEnv<K extends RequiredKey | OptionalKey>(key: K): string | undefined {
  const val = process.env[key];
  if (val && val.startsWith('your_')) return undefined;
  return val;
}

export function requireEnv(key: RequiredKey): string {
  const val = getEnv(key);
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

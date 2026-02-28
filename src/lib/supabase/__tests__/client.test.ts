import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @supabase/ssr so no real Supabase connection is attempted.
// vi.mock is hoisted by vitest so this takes effect before the import below.
// ---------------------------------------------------------------------------
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({ mock: 'browser-client' }),
}));

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '../client';

describe('createClient (browser Supabase client)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Snapshot env so each test starts with a clean slate.
    process.env = { ...ORIGINAL_ENV };
    vi.clearAllMocks();
    // Re-apply default return value after clearAllMocks resets mock state.
    vi.mocked(createBrowserClient).mockReturnValue({ mock: 'browser-client' } as never);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws when both env vars are missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when env vars are empty strings', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('calls createBrowserClient with the correct URL and key when both are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key'
    );
  });

  it('returns the value from createBrowserClient', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const client = createClient();
    expect(client).toEqual({ mock: 'browser-client' });
  });

  it('does not throw when both env vars are non-empty strings', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value';

    expect(() => createClient()).not.toThrow();
  });
});

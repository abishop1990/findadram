import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// We mock @supabase/ssr so no real Supabase connection is attempted.
// ---------------------------------------------------------------------------
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn().mockReturnValue({ mock: 'browser-client' }),
}));

import { createBrowserClient } from '@supabase/ssr';

describe('createClient (browser Supabase client)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Isolate env mutations between tests
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws when both env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createClient } = await import('../client');
    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createClient } = await import('../client');
    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createClient } = await import('../client');
    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when env vars are empty strings', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const { createClient } = await import('../client');
    expect(() => createClient()).toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('calls createBrowserClient with the correct URL and key when both are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createClient } = await import('../client');
    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key'
    );
  });

  it('returns the value from createBrowserClient', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createClient } = await import('../client');
    const client = createClient();

    expect(client).toEqual({ mock: 'browser-client' });
  });
});

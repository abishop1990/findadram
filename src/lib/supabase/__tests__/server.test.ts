import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @supabase/ssr and next/headers before any imports that use them.
// ---------------------------------------------------------------------------
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn().mockReturnValue({ mock: 'server-client' }),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

import { createServerClient } from '@supabase/ssr';

describe('createServerSupabaseClient (server Supabase client)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
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

    const { createServerSupabaseClient } = await import('../server');
    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const { createServerSupabaseClient } = await import('../server');
    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { createServerSupabaseClient } = await import('../server');
    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when env vars are empty strings', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    const { createServerSupabaseClient } = await import('../server');
    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('calls createServerClient with the correct URL and key when both are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // Re-apply the mock in this module context after resetModules
    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn().mockReturnValue({ mock: 'server-client' }),
    }));
    vi.mock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      }),
    }));

    const { createServerSupabaseClient } = await import('../server');
    const { createServerClient: mockCreateServerClient } = await import('@supabase/ssr');

    await createServerSupabaseClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it('returns the value from createServerClient', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn().mockReturnValue({ mock: 'server-client' }),
    }));
    vi.mock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
      }),
    }));

    const { createServerSupabaseClient } = await import('../server');
    const result = await createServerSupabaseClient();
    expect(result).toEqual({ mock: 'server-client' });
  });

  it('calls cookies() to get the cookie store', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const mockGetAll = vi.fn().mockReturnValue([{ name: 'session', value: 'abc' }]);
    const mockCookieStore = { getAll: mockGetAll, set: vi.fn() };

    vi.mock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue(mockCookieStore),
    }));
    vi.mock('@supabase/ssr', () => ({
      createServerClient: vi.fn().mockImplementation((_url, _key, options) => {
        // Invoke getAll to verify it delegates to the cookie store
        options.cookies.getAll();
        return { mock: 'server-client' };
      }),
    }));

    const { createServerSupabaseClient } = await import('../server');
    await createServerSupabaseClient();

    expect(mockGetAll).toHaveBeenCalled();
  });
});

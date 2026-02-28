import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @supabase/ssr and next/headers before any imports that use them.
// vi.mock calls are hoisted to the top of the file by vitest.
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

// Import after mocks are registered.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '../server';

describe('createServerSupabaseClient (server Supabase client)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    // Snapshot env so each test starts clean.
    process.env = { ...ORIGINAL_ENV };
    vi.clearAllMocks();
    // Re-apply default mock return value after clearAllMocks resets call counts.
    vi.mocked(createServerClient).mockReturnValue({ mock: 'server-client' } as never);
    vi.mocked(cookies).mockResolvedValue({
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn(),
    } as never);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws when both env vars are missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('throws when env vars are empty strings', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    await expect(createServerSupabaseClient()).rejects.toThrow(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  });

  it('calls createServerClient with the correct URL and key when both are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    await createServerSupabaseClient();

    expect(createServerClient).toHaveBeenCalledWith(
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

    const result = await createServerSupabaseClient();
    expect(result).toEqual({ mock: 'server-client' });
  });

  it('calls cookies() to get the cookie store', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    await createServerSupabaseClient();

    expect(cookies).toHaveBeenCalled();
  });

  it('passes cookie getAll results through to createServerClient', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    const mockGetAll = vi.fn().mockReturnValue([{ name: 'session', value: 'abc' }]);
    vi.mocked(cookies).mockResolvedValue({
      getAll: mockGetAll,
      set: vi.fn(),
    } as never);

    // Capture the cookies options passed to createServerClient and invoke getAll
    vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
      // Invoke the adapter's getAll to confirm delegation
      (options as { cookies: { getAll: () => unknown } }).cookies.getAll();
      return { mock: 'server-client' } as never;
    });

    await createServerSupabaseClient();

    expect(mockGetAll).toHaveBeenCalled();
  });
});

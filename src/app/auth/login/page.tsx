'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError(authError.message ?? 'Sign-in failed. Please check your credentials.');
      setSubmitting(false);
      return;
    }

    router.push('/');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-whiskey-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-whiskey-200 tracking-tight">
              findadram
            </h1>
            <p className="mt-1 text-oak-400 text-sm">
              Discover the dram waiting for you
            </p>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-oak-950 border border-oak-800 rounded-2xl shadow-xl px-8 py-10">
          <h2 className="text-xl font-semibold text-whiskey-100 mb-6">
            Sign in to your account
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-oak-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="
                  w-full rounded-lg px-4 py-2.5
                  bg-oak-900 border border-oak-700 text-oak-100
                  placeholder-oak-600 text-sm
                  focus:outline-none focus:border-whiskey-400 focus:ring-1 focus:ring-whiskey-400
                  transition-colors
                "
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-oak-300"
                >
                  Password
                </label>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full rounded-lg px-4 py-2.5
                  bg-oak-900 border border-oak-700 text-oak-100
                  placeholder-oak-600 text-sm
                  focus:outline-none focus:border-whiskey-400 focus:ring-1 focus:ring-whiskey-400
                  transition-colors
                "
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="
                w-full py-2.5 px-4 rounded-lg font-semibold text-sm
                bg-whiskey-500 hover:bg-whiskey-400 active:bg-whiskey-600
                text-whiskey-950
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-oak-500">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-whiskey-400 hover:text-whiskey-300 font-medium transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

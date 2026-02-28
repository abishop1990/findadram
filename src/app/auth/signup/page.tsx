'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isBarOwner, setIsBarOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);

    const { error: authError } = await signUp(email, password, isBarOwner);

    if (authError) {
      setError(authError.message ?? 'Sign-up failed. Please try again.');
      setSubmitting(false);
      return;
    }

    // Supabase may require email confirmation depending on project settings.
    // Show a friendly message and let the user know to check their inbox.
    setInfo(
      'Account created! Check your email for a confirmation link, then sign in.',
    );
    setSubmitting(false);

    // Give the user a moment to read the message before redirecting
    setTimeout(() => router.push('/auth/login'), 3000);
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
            Create an account
          </h2>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {info && (
            <div
              role="status"
              className="mb-5 rounded-lg bg-green-950 border border-green-800 px-4 py-3 text-sm text-green-300"
            >
              {info}
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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-oak-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="
                  w-full rounded-lg px-4 py-2.5
                  bg-oak-900 border border-oak-700 text-oak-100
                  placeholder-oak-600 text-sm
                  focus:outline-none focus:border-whiskey-400 focus:ring-1 focus:ring-whiskey-400
                  transition-colors
                "
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-oak-300 mb-1.5"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Bar owner checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <span className="mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  id="bar-owner"
                  checked={isBarOwner}
                  onChange={(e) => setIsBarOwner(e.target.checked)}
                  className="
                    w-4 h-4 rounded border-oak-600
                    bg-oak-900 text-whiskey-400
                    focus:ring-whiskey-400 focus:ring-offset-oak-950
                    cursor-pointer
                  "
                />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium text-oak-200 group-hover:text-oak-100 transition-colors">
                  I&apos;m a bar owner
                </span>
                <span className="text-xs text-oak-500 mt-0.5">
                  Unlock tools to manage your bar&apos;s whiskey selection, update
                  prices, and respond to sightings.
                </span>
              </span>
            </label>

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
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {/* Footer link */}
          <p className="mt-6 text-center text-sm text-oak-500">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-whiskey-400 hover:text-whiskey-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

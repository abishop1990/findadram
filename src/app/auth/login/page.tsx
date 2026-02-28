'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

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

  async function handleGoogle() {
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError.message ?? 'Google sign-in failed. Please try again.');
    }
    // On success the browser navigates to /auth/callback automatically
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-oak-800" />
            <span className="text-xs text-oak-500 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-oak-800" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            className="
              w-full flex items-center justify-center gap-3
              py-2.5 px-4 rounded-lg
              bg-oak-900 hover:bg-oak-800 active:bg-oak-700
              border border-oak-700 hover:border-oak-600
              text-oak-200 text-sm font-medium
              transition-colors
            "
          >
            {/* Google G icon */}
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>

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

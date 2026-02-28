import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Find a Dram — Whiskey Discovery',
  description: 'Discover whiskeys at bars near you. Search, explore, and share your favorite drams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-40 border-b border-whiskey-200/60 bg-whiskey-950/95 backdrop-blur supports-[backdrop-filter]:bg-whiskey-950/90">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="text-2xl">🥃</span>
              <div>
                <span className="text-xl font-bold text-whiskey-100 group-hover:text-whiskey-300 transition-colors tracking-tight">
                  Find a Dram
                </span>
                <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-whiskey-500">
                  Whiskey Discovery
                </span>
              </div>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/search?type=whiskey"
                className="px-3 py-2 text-sm font-medium text-whiskey-300 hover:text-whiskey-100 hover:bg-whiskey-800/50 rounded-lg transition-all"
              >
                Whiskeys
              </Link>
              <Link
                href="/search?type=bar"
                className="px-3 py-2 text-sm font-medium text-whiskey-300 hover:text-whiskey-100 hover:bg-whiskey-800/50 rounded-lg transition-all"
              >
                Bars
              </Link>
              <Link
                href="/submit"
                className="ml-1 px-4 py-2 text-sm font-medium text-whiskey-950 bg-whiskey-400 hover:bg-whiskey-300 rounded-lg transition-all shadow-sm"
              >
                Submit Menu
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-oak-200 bg-whiskey-950 py-8">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <p className="text-whiskey-500 text-sm">Find a Dram — Discover whiskeys at bars near you</p>
            <p className="text-whiskey-700 text-xs mt-2">Portland, OR</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

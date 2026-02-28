'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/bars', label: 'Bars' },
  { href: '/submit', label: 'Submit Menu' },
];

function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-whiskey-800/60 bg-whiskey-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

        {/* Logo */}
        <Link
          href="/"
          className="group flex flex-col leading-none"
          onClick={() => setMenuOpen(false)}
        >
          <span
            className="text-xl font-bold tracking-wide text-whiskey-100 transition-colors duration-200 group-hover:text-whiskey-300"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Find a Dram
          </span>
          <span className="hidden sm:block text-[10px] uppercase tracking-[0.22em] text-whiskey-500 transition-colors duration-200 group-hover:text-whiskey-400">
            Portland&apos;s Whiskey Guide
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1" aria-label="Primary navigation">
          {NAV_LINKS.slice(0, 2).map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'relative px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200',
                  'after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:rounded-full',
                  'after:scale-x-0 after:transition-transform after:duration-200 after:origin-left',
                  'hover:text-whiskey-100 hover:after:scale-x-100',
                  isActive
                    ? 'text-whiskey-200 after:bg-whiskey-400 after:scale-x-100'
                    : 'text-whiskey-400 after:bg-whiskey-400',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/submit"
            className={[
              'ml-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-200 shadow-sm',
              pathname === '/submit'
                ? 'bg-whiskey-300 text-whiskey-950'
                : 'bg-whiskey-500 text-whiskey-50 hover:bg-whiskey-400 hover:text-whiskey-950',
            ].join(' ')}
          >
            Submit Menu
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="sm:hidden flex flex-col justify-center items-center w-9 h-9 gap-[5px] rounded-md text-whiskey-300 hover:text-whiskey-100 hover:bg-whiskey-800/50 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whiskey-400"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span
            className={[
              'block h-px w-5 bg-current rounded-full transition-all duration-200',
              menuOpen ? 'translate-y-[6px] rotate-45' : '',
            ].join(' ')}
          />
          <span
            className={[
              'block h-px w-5 bg-current rounded-full transition-all duration-200',
              menuOpen ? 'opacity-0' : '',
            ].join(' ')}
          />
          <span
            className={[
              'block h-px w-5 bg-current rounded-full transition-all duration-200',
              menuOpen ? '-translate-y-[6px] -rotate-45' : '',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="sm:hidden border-t border-whiskey-800/60 bg-whiskey-950/95 backdrop-blur-md px-4 pb-4 pt-2"
        >
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={[
                  'block px-3 py-3 text-sm font-medium rounded-md transition-colors duration-200 border-b border-whiskey-900/60 last:border-0',
                  isActive
                    ? 'text-whiskey-200 bg-whiskey-800/40'
                    : 'text-whiskey-400 hover:text-whiskey-100 hover:bg-whiskey-800/30',
                ].join(' ')}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-whiskey-800/50 bg-whiskey-950 text-whiskey-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">

        {/* 3-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">

          {/* About */}
          <div>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-whiskey-300"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              About
            </h3>
            <p className="text-sm leading-relaxed text-whiskey-500">
              Find a Dram helps whiskey lovers discover what&apos;s on the shelf at bars
              across the Portland metro area — before you walk through the door.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-whiskey-300"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Quick Links
            </h3>
            <ul className="space-y-2">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-whiskey-500 transition-colors duration-200 hover:text-whiskey-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portland Focus */}
          <div>
            <h3
              className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-whiskey-300"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Portland Focus
            </h3>
            <p className="text-sm leading-relaxed text-whiskey-500">
              We&apos;re focused exclusively on the Portland, OR metro area — from the Pearl
              District to Southeast, Northeast, and beyond. Hyper-local by design.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-whiskey-900/70 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-whiskey-700">
          <span>Built for the Portland whiskey community.</span>
          <span>&copy; {new Date().getFullYear()} Find a Dram. Portland, OR.</span>
        </div>
      </div>
    </footer>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from 'next';
import { LayoutShell } from '@/components/layout-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Find a Dram — Portland\'s Whiskey Guide',
  description:
    'Discover whiskies at bars near you in Portland, OR. Search by spirit, browse local bars, and share your favorite drams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Trade Rep Dashboard',
  description: 'Daily sales, group plan and receivables dashboard'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}

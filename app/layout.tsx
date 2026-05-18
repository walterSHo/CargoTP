import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'CargoTP Dashboard',
  description: 'Щоденний дашборд продажів, плану груп і дебіторської заборгованості'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body className="app-backdrop">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}

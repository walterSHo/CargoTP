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
        <div className="app-shell md:grid md:grid-cols-[280px_minmax(0,1fr)]">
          <Navigation />
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}

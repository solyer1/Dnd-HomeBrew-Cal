import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import '../globals.css';

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '600', '700', '900'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Admin Panel — D&D Calculator',
  description: 'Private admin panel for D&D Damage Calculator configuration.',
  robots: 'noindex, nofollow',
};

/** Standalone layout for admin — no AppProvider, no main nav */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased" style={{ background: '#080b12', color: '#e2e8f0', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}

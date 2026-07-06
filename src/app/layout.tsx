import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { getAdminConfig } from '@/lib/getAdminConfig';
import type { AdminConfig } from '@/types/config';

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
  title: 'D&D Damage Calculator',
  description:
    'A polished dark-fantasy damage calculator and dice roller for custom D&D combat. Features critical hit tables, resistance/vulnerability stacking, and animated dice rolls.',
  keywords: ['DnD', 'D&D', 'Damage Calculator', 'Dice Roller', 'RPG', 'Combat', 'Critical Hit'],
};

// Force this layout to always be dynamically rendered (never cached by Vercel)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch config SERVER-SIDE on every request — bypasses all client caching
  const initialConfig: AdminConfig = await getAdminConfig();

  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AppProvider initialConfig={initialConfig}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Cinzel, Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}

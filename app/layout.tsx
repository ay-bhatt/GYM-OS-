import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { GlobalPlayer } from '@/components/music/global-player';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ForgeGym — Gym Management Platform',
  description: 'Multi-tenant gym management SaaS for independent fitness businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        {/* Global gym music player — persists across all routes */}
        <GlobalPlayer />
      </body>
    </html>
  );
}

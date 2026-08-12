import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { siteConfig } from '@/config/site';
import './globals.css';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.pitch,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Header />
          {children}
          <Footer />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}

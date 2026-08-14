import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CommandPalette } from '@/components/command-palette/command-palette';
import { siteConfig } from '@/config/site';
import { getSiteUrl } from '@/lib/site-url';
import './globals.css';

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  // Every page previously rendered the identical title "Nadeem Khan", which is
  // useless in a search result and in a row of browser tabs. Pages set their own
  // and the template appends the name.
  title: {
    default: `${siteConfig.name} — ${siteConfig.role}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.pitch,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={jetBrainsMono.variable}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Header />
          {children}
          <Footer />
          <CommandPalette />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}

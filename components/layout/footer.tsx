import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8 text-xs uppercase tracking-widest font-medium text-foreground-dim">
      <div>
        {new Date().getFullYear()} {siteConfig.name}
      </div>
      <div className="mt-2">Built with Next.js, TypeScript, and Vercel</div>
    </footer>
  );
}

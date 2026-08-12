import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-4 text-sm">
      {new Date().getFullYear()} {siteConfig.name}
    </footer>
  );
}

import { siteConfig } from '@/config/site';

export function Hero() {
  return (
    <section aria-label="Introduction" className="space-y-4">
      <p className="text-accent text-xs uppercase tracking-widest font-medium">{siteConfig.role}</p>
      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">{siteConfig.name}</h1>
      <p className="text-foreground-dim leading-relaxed">{siteConfig.pitch}</p>
    </section>
  );
}

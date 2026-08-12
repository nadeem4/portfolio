import { siteConfig } from '@/config/site';

export function Hero() {
  return (
    <section aria-label="Introduction">
      <h1>{siteConfig.name}</h1>
      <p>{siteConfig.role}</p>
      <p>{siteConfig.pitch}</p>
    </section>
  );
}

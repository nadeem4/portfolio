import { siteConfig } from '@/config/site';

export function ContactSection() {
  return (
    <section aria-label="Contact">
      <h2>Contact</h2>
      <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
      <nav aria-label="Social links">
        <a href={siteConfig.socials.github} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href={siteConfig.socials.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <a href={siteConfig.socials.medium} target="_blank" rel="noreferrer">
          Medium
        </a>
      </nav>
    </section>
  );
}

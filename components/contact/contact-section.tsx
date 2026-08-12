import { siteConfig } from '@/config/site';

const buttonLinkClasses =
  'inline-block rounded border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

export function ContactSection() {
  return (
    <section aria-label="Contact" className="space-y-4">
      <h2 className="text-xs uppercase tracking-widest font-medium text-foreground-dim">Contact</h2>
      <a href={`mailto:${siteConfig.email}`} className={`${buttonLinkClasses} block w-fit`}>
        {siteConfig.email}
      </a>
      <nav aria-label="Social links" className="flex flex-wrap gap-2">
        <a href={siteConfig.socials.github} target="_blank" rel="noreferrer" className={buttonLinkClasses}>
          GitHub
        </a>
        <a href={siteConfig.socials.linkedin} target="_blank" rel="noreferrer" className={buttonLinkClasses}>
          LinkedIn
        </a>
        <a href={siteConfig.socials.medium} target="_blank" rel="noreferrer" className={buttonLinkClasses}>
          Medium
        </a>
      </nav>
    </section>
  );
}

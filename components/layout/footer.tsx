import { siteConfig } from '@/config/site';

const linkClasses =
  'link-underline inline-flex min-h-11 items-center hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-6 text-sm text-foreground-dim sm:px-10">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
        <nav aria-label="Contact" className="flex flex-wrap gap-x-6">
          <a href={`mailto:${siteConfig.email}`} className={`${linkClasses} font-mono text-[13px]`}>
            {siteConfig.email}
          </a>
          <a href={siteConfig.socials.github} target="_blank" rel="noreferrer" className={linkClasses}>
            GitHub
          </a>
          <a href={siteConfig.socials.linkedin} target="_blank" rel="noreferrer" className={linkClasses}>
            LinkedIn
          </a>
          <a href={siteConfig.socials.medium} target="_blank" rel="noreferrer" className={linkClasses}>
            Medium
          </a>
        </nav>
      </div>
    </footer>
  );
}

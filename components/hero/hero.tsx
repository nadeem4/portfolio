import { siteConfig } from '@/config/site';

const linkClasses =
  'link-underline inline-flex min-h-11 items-center hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * Who, what, and what now. The name is the heading and nothing here sells:
 * contact lives as plain links rather than a call-to-action button.
 */
export function Hero() {
  return (
    <section aria-label="Introduction" className="rise-in">
      <p className="mb-5 font-mono text-[13px] text-foreground-dim">{siteConfig.role}</p>
      <h1 className="text-5xl font-semibold leading-none tracking-tight sm:text-6xl">{siteConfig.name}</h1>
      <p className="mt-6 max-w-[38ch] text-xl leading-normal text-foreground-soft">{siteConfig.pitch}</p>
      <p className="mt-5 max-w-[46ch] text-base text-foreground-dim">
        <span className="mr-2 font-mono text-[13px] text-accent">Now</span>
        <span>{siteConfig.now}</span>
      </p>
      <p className="mt-6 flex flex-wrap gap-x-6 text-[15px]">
        <a href={siteConfig.socials.github} target="_blank" rel="noreferrer" className={linkClasses}>
          GitHub ↗
        </a>
        <a href={siteConfig.socials.linkedin} target="_blank" rel="noreferrer" className={linkClasses}>
          LinkedIn ↗
        </a>
        <a href={siteConfig.socials.medium} target="_blank" rel="noreferrer" className={linkClasses}>
          Medium ↗
        </a>
        <a href={`mailto:${siteConfig.email}`} className={linkClasses}>
          {siteConfig.email}
        </a>
      </p>
    </section>
  );
}

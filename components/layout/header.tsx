import Link from 'next/link';
import { PaletteTrigger } from '@/components/command-palette/palette-trigger';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { hasLiveProjects } from '@/config/live-projects';
import { siteConfig } from '@/config/site';

const navLinkClasses =
  'text-xs uppercase tracking-widest font-medium text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm';

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
      <Link
        href="/"
        className="text-xs uppercase tracking-widest font-semibold text-foreground transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
      >
        {siteConfig.name}
      </Link>
      <nav className="flex flex-wrap gap-4 sm:gap-6">
        <Link href="/blog" className={navLinkClasses}>
          Blog
        </Link>
        <Link href="/projects" className={navLinkClasses}>
          Projects
        </Link>
        {/* Linked unconditionally, unlike Live Projects below: there is a real
            page behind it, so the "advertises an absence" rule does not apply. */}
        <Link href="/lab/vector-index" className={navLinkClasses}>
          Lab
        </Link>
        {/* Only linked once something is actually deployed. A nav item leading
            to a "COMING SOON" page advertises an absence. */}
        {hasLiveProjects && (
          <Link href="/live-projects" className={navLinkClasses}>
            Live Projects
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2">
        <PaletteTrigger />
        <ThemeToggle />
      </div>
    </header>
  );
}

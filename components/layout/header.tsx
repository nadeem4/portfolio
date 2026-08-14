import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { hasLiveProjects } from '@/config/live-projects';

const navLinkClasses =
  'text-xs uppercase tracking-widest font-medium text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm';

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
      <Link href="/" className={navLinkClasses}>
        Home
      </Link>
      <nav className="flex flex-wrap gap-4 sm:gap-6">
        <Link href="/blog" className={navLinkClasses}>
          Blog
        </Link>
        <Link href="/projects" className={navLinkClasses}>
          Projects
        </Link>
        {/* Only linked once something is actually deployed. A nav item leading
            to a "COMING SOON" page advertises an absence. */}
        {hasLiveProjects && (
          <Link href="/live-projects" className={navLinkClasses}>
            Live Projects
          </Link>
        )}
      </nav>
      <ThemeToggle />
    </header>
  );
}

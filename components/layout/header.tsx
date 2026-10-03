import Link from 'next/link';
import { PaletteTrigger } from '@/components/command-palette/palette-trigger';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { hasLiveProjects } from '@/config/live-projects';
import { siteConfig } from '@/config/site';
import { NavLinks, type NavItem } from './nav-links';

// Live Projects is only linked once something is actually deployed. A nav item
// leading to a "COMING SOON" page advertises an absence.
const items: NavItem[] = [
  { href: '/blog', label: 'Blog' },
  { href: '/projects', label: 'Projects' },
  ...(hasLiveProjects ? [{ href: '/live-projects', label: 'Live Projects' }] : []),
];

export function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex min-h-16 max-w-page items-center justify-between gap-x-4 px-6 sm:px-10">
        <Link
          href="/"
          className="inline-flex h-11 items-center font-semibold hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          {siteConfig.name}
        </Link>
        <nav aria-label="Main" className="flex items-center gap-x-3 sm:gap-x-6">
          <NavLinks items={items} />
          <PaletteTrigger />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

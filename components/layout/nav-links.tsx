'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
}

/** Header links, with the current section marked for sighted and screen-reader users alike. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? '/';

  return (
    <>
      {items.map(({ href, label }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`inline-flex h-11 items-center px-1 text-[15px] font-medium transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
              current
                ? 'text-foreground underline decoration-accent decoration-2 underline-offset-[10px]'
                : 'text-foreground-dim'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}

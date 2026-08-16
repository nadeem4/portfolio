import Link from 'next/link';

interface ArchiveLinkProps {
  total: number;
}

/**
 * Link through to the full archive, sized so it sits opposite a section heading.
 *
 * Carries the total only. It previously also carried the date of the newest
 * post, which made the whole element a single link to /blog — so clicking a
 * date that named a specific post landed you on a list instead. The Latest
 * block on the homepage now shows those posts directly, and the line under the
 * hero carries the currency signal.
 */
export function ArchiveLink({ total }: ArchiveLinkProps) {
  return (
    <Link
      href="/blog"
      className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      All {total} posts
    </Link>
  );
}

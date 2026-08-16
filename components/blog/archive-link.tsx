import Link from 'next/link';

/**
 * Link through to the full archive, sized to sit opposite a section heading.
 *
 * Carries no count. The total is already stated in the activity line under the
 * hero and in the /blog masthead; a third copy beside the heading was
 * repetition. It previously also carried the newest post's date, which made the
 * whole element one link to /blog — so clicking a date that named a specific
 * post landed you on a list instead.
 */
export function ArchiveLink() {
  return (
    <Link
      href="/blog"
      className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    >
      All posts
    </Link>
  );
}

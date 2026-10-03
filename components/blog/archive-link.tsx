import Link from 'next/link';

/**
 * Link through to the full archive, sized to sit opposite a section heading.
 *
 * Points at /blog/archive rather than /blog: the hub shows only the latest ten,
 * so a control labelled "All posts" that landed there would be a lie.
 *
 * Carries no count or date. The total is already stated elsewhere, and a date
 * here once made the whole element one link to a list rather than to the post
 * it named.
 */
export function ArchiveLink() {
  return (
    <Link
      href="/blog/archive"
      className="link-underline inline-flex min-h-11 items-center font-mono text-sm text-foreground-dim hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      All posts
    </Link>
  );
}

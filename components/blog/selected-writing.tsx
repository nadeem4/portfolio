import Link from 'next/link';
import { Identicon } from './identicon';
import type { BlogPost } from '@/lib/blog.types';

interface SelectedWritingProps {
  posts: BlogPost[];
  /**
   * Total posts in the catalog. When given, a link through to the archive is
   * rendered. Omitted on /blog, where the archive is already directly below.
   */
  total?: number;
}

/**
 * A curated handful of posts, surfaced on the homepage.
 *
 * The strongest evidence on this site was previously reachable only by opening
 * /blog and scanning a 92-item list, where it sat styled identically to
 * introductory explainers. This puts it one click from the front door.
 *
 * Context lines come from each post's own subtitle rather than a parallel set
 * of hand-written blurbs, so they cannot drift out of sync with the catalog.
 */
export function SelectedWriting({ posts, total }: SelectedWritingProps) {
  if (posts.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Selected writing</h2>
        {total !== undefined && (
          <Link
            href="/blog"
            className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            All {total} posts
          </Link>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border">
        {posts.map((post) => (
          <li key={post.id} className="flex items-start gap-3 py-3">
            <Identicon
              id={post.id}
              className="h-8 w-8 shrink-0 rounded border border-border bg-background-raised p-1 text-accent"
            />
            <div>
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium leading-snug transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
              >
                {post.title}
              </a>
              <p className="mt-1 text-sm leading-relaxed text-foreground-dim">{post.subtitle}</p>
              <p className="mt-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">
                <span className="text-accent">{post.category}</span>
                <span aria-hidden="true" className="mx-1.5 opacity-50">
                  ·
                </span>
                <time dateTime={post.date}>{post.date}</time>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

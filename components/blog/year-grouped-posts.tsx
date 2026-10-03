import { formatShortDate, groupByYear } from '@/lib/blog-stats';
import type { BlogPost } from '@/lib/blog.types';

interface YearGroupedPostsProps {
  posts: BlogPost[];
  /** Level of the year headings, so they nest under whatever heads the list. */
  headingLevel?: 2 | 3;
  /** Label each row with its topic. Off where the whole list is one topic. */
  showCategory?: boolean;
}

/**
 * Posts under year headings, one hairline row each: a mono date column, the
 * title, and the topic beneath it.
 *
 * The year sits in the heading, so each row carries only month and day. Used
 * by the hub's Latest block, the archive and each category page.
 */
export function YearGroupedPosts({ posts, headingLevel = 2, showCategory = true }: YearGroupedPostsProps) {
  if (posts.length === 0) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <div className="space-y-12">
      {groupByYear(posts).map(({ year, posts: inYear }) => (
        <section key={year}>
          <Heading className="text-2xl font-semibold tracking-tight">{year}</Heading>
          <ul className="mt-2 border-b border-border">
            {inYear.map((post) => (
              <li key={post.id} className="flex items-baseline gap-6 border-t border-border py-3">
                <time dateTime={post.date} className="w-16 shrink-0 font-mono text-sm text-foreground-dim">
                  {formatShortDate(post.date)}
                </time>
                {/* Every post lives on Medium. The arrow says so before the
                    click; the hidden text says so to a screen reader. */}
                <a
                  href={post.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block min-h-11 min-w-0 flex-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="block font-medium leading-snug text-foreground transition-colors group-hover:text-accent">
                    {post.title}
                    <span aria-hidden="true" className="ml-1 text-foreground-dim">
                      ↗
                    </span>
                    <span className="sr-only"> (opens on Medium)</span>
                  </span>
                  {showCategory && (
                    <span className="mt-1 block font-mono text-xs text-foreground-dim">{post.category}</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

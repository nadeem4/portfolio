import Link from 'next/link';
import type { GithubRepo } from '@/lib/github.types';

/** How many featured repos the homepage shows before handing off to /projects. */
const FEATURED_COUNT = 3;

/**
 * Compact featured-project rows for the homepage.
 *
 * The page's argument is claim → context → evidence, and until this section the
 * only evidence shown was the writing — the repos never appeared unless a
 * visitor clicked Projects in the nav. Rows stay one level flatter than the
 * /projects cards: this is a teaser, the cards are the destination.
 *
 * Takes the already-curated list from getGithubRepos, which pins featured repos
 * to the front, so the first three are the flagship work by construction.
 */
export function SelectedProjects({ repos }: { repos: GithubRepo[] }) {
  // Mirrors /projects: a GitHub outage hides the section rather than
  // rendering an empty frame.
  if (repos.length === 0) return null;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Selected projects</h2>
        <Link
          href="/projects"
          className="text-[0.65rem] uppercase tracking-[0.18em] text-foreground-dim transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          All projects
        </Link>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {repos.slice(0, FEATURED_COUNT).map((repo) => (
          <li key={repo.slug} className="py-3">
            <a
              href={repo.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium leading-snug transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
            >
              {repo.name}
              <span aria-hidden="true" className="ml-1 text-foreground-dim">
                ↗
              </span>
              <span className="sr-only"> (opens on GitHub)</span>
            </a>
            <p className="mt-1 text-sm leading-relaxed text-foreground-dim">{repo.description}</p>
            <p className="mt-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">
              {repo.language ?? 'N/A'}
              <span aria-hidden="true" className="mx-1.5 opacity-50">
                ·
              </span>
              {repo.stars} stars
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

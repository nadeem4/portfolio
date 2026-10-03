import Image from 'next/image';
import type { GithubRepo } from '@/lib/github.types';
import { projectMedia, type ProjectMedia } from '@/config/project-media';

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';
const linkClasses = `link-underline inline-flex h-11 items-center rounded transition-colors hover:text-accent ${focusRing}`;

function monthYear(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

function NewTab() {
  return <span className="sr-only"> (opens in a new tab)</span>;
}

function ProjectCard({ repo, media }: { repo: GithubRepo; media: ProjectMedia }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-md border border-border bg-background-raised">
      <Image
        src={media.image}
        alt={media.alt}
        width={1280}
        height={800}
        sizes="(min-width: 768px) 50vw, 100vw"
        className="aspect-video w-full border-b border-border object-cover object-top"
      />
      <div className="flex flex-1 flex-col px-5 pb-3 pt-5">
        <h3 className="text-lg font-semibold">{media.title ?? repo.name}</h3>
        {repo.description && <p className="mt-1.5 text-[15px] text-foreground-soft">{repo.description}</p>}
        <p className="mt-auto flex gap-5 pt-2 text-sm">
          {repo.homepage && (
            <a href={repo.homepage} target="_blank" rel="noreferrer" className={`${linkClasses} font-medium`}>
              {media.linkLabel} <span aria-hidden="true">&nbsp;↗</span>
              <NewTab />
            </a>
          )}
          <a href={repo.url} target="_blank" rel="noreferrer" className={`${linkClasses} text-foreground-soft`}>
            Code
            <NewTab />
          </a>
        </p>
      </div>
    </li>
  );
}

/** Hairline rows: repo name, description, and "Language, Mon YYYY". */
export function RepoRows({ repos }: { repos: GithubRepo[] }) {
  if (repos.length === 0) return null;

  return (
    <ul className="border-b border-border">
      {repos.map((repo) => (
        <li key={repo.slug} className="flex flex-wrap items-baseline gap-x-8 gap-y-1 border-t border-border py-4">
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className={`${linkClasses} shrink-0 basis-52 font-semibold`}
          >
            {repo.name} <span aria-hidden="true">&nbsp;↗</span>
            <NewTab />
          </a>
          <p className="min-w-0 flex-1 basis-96 text-[15px] text-foreground-soft">{repo.description}</p>
          <p className="shrink-0 basis-36 font-mono text-xs text-foreground-dim">
            {[repo.language, monthYear(repo.updatedAt)].filter(Boolean).join(', ')}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The pinned repos: a screenshot card for each one with a live site and an
 * entry in `config/project-media.ts`, then rows for the rest. Carries no
 * heading of its own, so the homepage and /projects can each title it.
 */
export function ProjectShowcase({ repos }: { repos: GithubRepo[] }) {
  const cards = repos.filter((repo) => repo.homepage && projectMedia[repo.name]);
  const rows = repos.filter((repo) => !cards.includes(repo));

  return (
    <div className="space-y-10">
      {cards.length > 0 && (
        <ul aria-label="Live projects" className="grid gap-5 md:grid-cols-2">
          {cards.map((repo) => (
            <ProjectCard key={repo.slug} repo={repo} media={projectMedia[repo.name]} />
          ))}
        </ul>
      )}
      <RepoRows repos={rows} />
    </div>
  );
}

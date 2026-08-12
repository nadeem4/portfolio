'use client';

import { useState } from 'react';
import type { GithubRepo } from '@/lib/github.types';
import type { PipelineStep } from '@/config/project-pipelines';
import { ProjectCard } from './project-card';
import { sortRepos, type ProjectView } from './sort-repos';

interface ProjectListProps {
  repos: GithubRepo[];
  pipelines: Record<string, PipelineStep[]>;
}

const chipClasses =
  'rounded border border-border px-3 py-1 text-xs uppercase tracking-widest font-medium text-foreground-dim transition-colors hover:border-accent hover:text-accent aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent aria-[pressed=true]:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

const buttonClasses =
  'inline-block rounded border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

const VIEWS: { value: ProjectView; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'stars', label: 'Most Starred' },
  { value: 'open-source', label: 'Open Source' },
];

const DEFAULT_VISIBLE_COUNT = 5;

export function ProjectList({ repos, pipelines }: ProjectListProps) {
  const [view, setView] = useState<ProjectView>('recent');
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);

  const sorted = sortRepos(repos, view);
  const visible = sorted.slice(0, visibleCount);

  function handleViewChange(next: ProjectView) {
    setView(next);
    setVisibleCount(DEFAULT_VISIBLE_COUNT);
  }

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
        {VIEWS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleViewChange(value)}
            aria-pressed={view === value}
            className={chipClasses}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'open-source' && sorted.length === 0 ? (
        <p className="text-foreground-dim leading-relaxed">No open-source-licensed repos yet.</p>
      ) : (
        <ul className="space-y-6">
          {visible.map((repo) => (
            <ProjectCard key={repo.slug} repo={repo} pipeline={pipelines[repo.slug]} />
          ))}
        </ul>
      )}

      {visibleCount < sorted.length && (
        <button type="button" onClick={() => setVisibleCount(sorted.length)} className={buttonClasses}>
          Load more
        </button>
      )}
    </div>
  );
}

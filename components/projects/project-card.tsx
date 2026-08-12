import type { GithubRepo } from '@/lib/github.types';
import type { PipelineStep } from '@/config/project-pipelines';
import { PipelineDiagram } from './pipeline-diagram';

interface ProjectCardProps {
  repo: GithubRepo;
  pipeline?: PipelineStep[];
}

function lastWorkedOn(updatedAt: string): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' }).format(new Date(updatedAt));
}

export function ProjectCard({ repo, pipeline }: ProjectCardProps) {
  return (
    <li className="border border-border rounded-lg bg-background-raised p-6 space-y-3">
      <h2>
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-sm"
        >
          {repo.name}
        </a>
      </h2>
      {repo.description && <p className="text-foreground-dim leading-relaxed">{repo.description}</p>}
      <p className="text-xs uppercase tracking-widest font-medium text-foreground-dim">
        {repo.language ?? 'N/A'} · {repo.stars} stars · {lastWorkedOn(repo.updatedAt)}
      </p>
      {pipeline && <PipelineDiagram steps={pipeline} />}
    </li>
  );
}

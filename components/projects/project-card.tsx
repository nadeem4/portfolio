import type { GithubRepo } from '@/lib/github.types';
import type { FeaturedProject } from '@/config/featured-projects';
import { PipelineDiagram } from './pipeline-diagram';

interface ProjectCardProps {
  repo: GithubRepo;
  project: FeaturedProject;
}

export function ProjectCard({ repo, project }: ProjectCardProps) {
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
      <p className="text-foreground-dim leading-relaxed">{project.blurb}</p>
      <p className="text-xs uppercase tracking-widest font-medium text-foreground-dim">
        {repo.language ?? 'N/A'} · {repo.stars} stars
      </p>
      {project.pipeline && <PipelineDiagram steps={project.pipeline} />}
    </li>
  );
}

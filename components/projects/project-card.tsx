import type { GithubRepo } from '@/lib/github.types';
import type { FeaturedProject } from '@/config/featured-projects';
import { PipelineDiagram } from './pipeline-diagram';

interface ProjectCardProps {
  repo: GithubRepo;
  project: FeaturedProject;
}

export function ProjectCard({ repo, project }: ProjectCardProps) {
  return (
    <li className="border border-border rounded p-4">
      <h2>
        <a href={repo.url} target="_blank" rel="noreferrer">
          {repo.name}
        </a>
      </h2>
      <p>{project.blurb}</p>
      <p>
        {repo.language ?? 'N/A'} · {repo.stars} stars
      </p>
      {project.pipeline && <PipelineDiagram steps={project.pipeline} />}
    </li>
  );
}

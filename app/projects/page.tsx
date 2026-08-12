import { ProjectCard } from '@/components/projects/project-card';
import { getGithubRepos } from '@/lib/projects';
import { projectPipelines } from '@/config/project-pipelines';

export const revalidate = 21600;

export default async function ProjectsPage() {
  const repos = await getGithubRepos();

  return (
    <main className="px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        {repos.length === 0 ? (
          <p className="text-foreground-dim leading-relaxed">
            Projects temporarily unavailable — check back soon.
          </p>
        ) : (
          <ul className="space-y-6">
            {repos.map((repo) => (
              <ProjectCard key={repo.slug} repo={repo} pipeline={projectPipelines[repo.slug]} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

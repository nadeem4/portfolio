import type { Metadata } from 'next';
import { ProjectList } from '@/components/projects/project-list';
import { getGithubRepos } from '@/lib/projects';
import { projectPipelines } from '@/config/project-pipelines';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Open-source work: NL2SQL execution, metadata-driven ETL, search, and LLM tooling.',
};

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
          <ProjectList repos={repos} pipelines={projectPipelines} />
        )}
      </div>
    </main>
  );
}

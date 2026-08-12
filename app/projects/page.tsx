import { ProjectCard } from '@/components/projects/project-card';
import { getFeaturedRepos } from '@/lib/projects';
import { featuredProjects } from '@/config/featured-projects';

export const revalidate = 21600;

export default async function ProjectsPage() {
  const repos = await getFeaturedRepos();

  return (
    <main className="px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <ul className="space-y-6">
          {featuredProjects.map((project) => {
            const repo = repos.find((r) => r.slug === project.repoSlug);
            if (!repo) return null;
            return <ProjectCard key={project.repoSlug} repo={repo} project={project} />;
          })}
        </ul>
      </div>
    </main>
  );
}

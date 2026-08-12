import { ProjectCard } from '@/components/projects/project-card';
import { fetchPinnedRepos } from '@/lib/github';
import { featuredProjects } from '@/config/featured-projects';

export const revalidate = 21600;

export default async function ProjectsPage() {
  const repos = await fetchPinnedRepos(featuredProjects.map((project) => project.repoSlug));

  return (
    <main className="px-6 py-12">
      <h1>Projects</h1>
      <ul>
        {featuredProjects.map((project) => {
          const repo = repos.find((r) => r.slug === project.repoSlug);
          if (!repo) return null;
          return <ProjectCard key={project.repoSlug} repo={repo} project={project} />;
        })}
      </ul>
    </main>
  );
}

import { liveProjects } from '@/config/live-projects';

export default function LiveProjectsPage() {
  return (
    <main className="px-6 py-12">
      <h1>Live Projects</h1>
      <ul>
        {liveProjects.map((project) => (
          <li key={project.name}>
            <span>{project.name}</span> — Coming soon
          </li>
        ))}
      </ul>
    </main>
  );
}

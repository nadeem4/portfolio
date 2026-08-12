import { liveProjects } from '@/config/live-projects';

export default function LiveProjectsPage() {
  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <h1 className="text-2xl font-bold tracking-tight">Live Projects</h1>
        <ul className="divide-y divide-border">
          {liveProjects.map((project) => (
            <li key={project.name} className="flex items-center justify-between py-4">
              <span>{project.name}</span>
              <span className="inline-block rounded border border-accent/50 px-2 py-0.5 text-xs uppercase tracking-widest font-medium text-accent">
                Coming soon
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import { liveProjects } from '@/config/live-projects';

// Unlinked from the nav until something is deployed, but still reachable by URL,
// so it gets its own title rather than falling back to the site default.
export const metadata: Metadata = {
  title: 'Live Projects',
  robots: { index: false },
};

export default function LiveProjectsPage() {
  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl lg:max-w-3xl mx-auto space-y-12">
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

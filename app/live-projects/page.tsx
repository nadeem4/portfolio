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
    <main className="pb-24 pt-16">
      <div className="mx-auto max-w-page space-y-10 px-6 sm:px-10">
        <h1 className="text-5xl font-semibold tracking-tight">Live Projects</h1>
        <ul className="divide-y divide-border">
          {liveProjects.map((project) => (
            <li key={project.name} className="flex items-center justify-between py-4">
              <span>{project.name}</span>
              <span className="font-mono text-[13px] text-foreground-dim">
                Coming soon
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

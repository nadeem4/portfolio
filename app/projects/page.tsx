import type { Metadata } from 'next';
import { ProjectShowcase, RepoRows } from '@/components/projects/project-showcase';
import { getProjects } from '@/lib/projects';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Projects',
  description: 'Live demos you can run in a browser, and the open-source code behind them: NL2SQL, RAG, decision models and LLM post-training.',
};

export const revalidate = 21600;

/** Repos last pushed before this year go behind the "Earlier work" disclosure. */
const RECENT_FROM_YEAR = 2024;

const h2Classes = 'text-2xl font-semibold tracking-tight';

export default async function ProjectsPage() {
  const { pinned, others } = await getProjects();
  const recent = others.filter((repo) => new Date(repo.updatedAt).getUTCFullYear() >= RECENT_FROM_YEAR);
  const earlier = others.filter((repo) => !recent.includes(repo));

  return (
    <main className="max-w-page mx-auto px-6 sm:px-10 pb-28 pt-16 sm:pt-20">
      <h1 className="text-5xl font-semibold tracking-tight">Projects</h1>
      <p className="mt-5 max-w-[52ch] text-lg text-foreground-soft">
        Things you can run in a browser first, then the code behind them.
      </p>

      {pinned.length === 0 && others.length === 0 ? (
        <p className="mt-16 text-foreground-soft">
          The project list could not be loaded right now. Every repository is on{' '}
          <a href={siteConfig.socials.github} className="link-underline text-foreground hover:text-accent">
            my GitHub profile
          </a>
          .
        </p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section aria-labelledby="pinned" className="mt-16">
              <h2 id="pinned" className={`${h2Classes} mb-6`}>
                Pinned
              </h2>
              <ProjectShowcase repos={pinned} />
            </section>
          )}

          {recent.length > 0 && (
            <section aria-labelledby="others" className="mt-20">
              <h2 id="others" className={`${h2Classes} mb-4`}>
                Other repositories
              </h2>
              <RepoRows repos={recent} />
            </section>
          )}

          {earlier.length > 0 && (
            <details className="mt-14 rounded-md border border-border px-6 py-2">
              <summary className="flex h-11 cursor-pointer items-center rounded font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                Earlier work, before {RECENT_FROM_YEAR}
              </summary>
              <div className="mt-2 pb-4">
                <RepoRows repos={earlier} />
              </div>
            </details>
          )}
        </>
      )}
    </main>
  );
}

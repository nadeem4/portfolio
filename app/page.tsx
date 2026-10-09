import Link from 'next/link';
import { Hero } from '@/components/hero/hero';
import { CdcDiagram } from '@/components/hero/cdc-diagram';
import { HeroSearch } from '@/components/hero/hero-search';
import { Experience } from '@/components/home/experience';
import { ProjectCards, RepoRows, splitShowcase } from '@/components/projects/project-showcase';
import { PostList } from '@/components/blog/post-list';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';
import { getProjects } from '@/lib/projects';
import { readDiagramSvg } from '@/lib/diagram';
import { cdcDiagram } from '@/config/cdc-diagram';
import { siteConfig } from '@/config/site';

// Matches /projects: the repo list refreshes on the same six-hour cadence.
export const revalidate = 21600;

/** How many posts each writing column shows before handing off to the blog. */
const WRITING_COUNT = 4;

const sectionHeading = 'text-[28px] font-semibold tracking-tight';
const sideLink =
  'link-underline inline-flex min-h-11 items-center text-[15px] text-foreground-dim hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * Who, then where, then what you can run, what is open, then what was written.
 *
 * Experience leads the evidence: the distributed-systems claim is proven by the
 * jobs, and the live systems (AI tools) corroborate it rather than set the
 * first impression.
 *
 * Separate quiet sections, each in its own form, and no sales devices: no
 * numbers strip, no closing pitch. Contact lives in the hero links and footer.
 */
export default async function HomePage() {
  const posts = getBlogPosts();
  const selected = getSelectedPosts().slice(0, WRITING_COUNT);
  const selectedIds = new Set(selected.map((post) => post.id));
  // The catalogue is newest-first. Skipping pinned posts keeps the two columns
  // from repeating each other side by side.
  const latest = posts.filter((post) => !selectedIds.has(post.id)).slice(0, WRITING_COUNT);
  const { pinned } = await getProjects();
  const { cards, rows } = splitShowcase(pinned);

  return (
    <main>
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <div className="pb-20 pt-16 sm:pt-24">
          <Hero />
          {/* The claim, then the system behind it: a real pipeline, each part
              naming the guarantee it holds, rather than an illustration. */}
          <div className="mt-14">
            <CdcDiagram svg={readDiagramSvg(cdcDiagram.svg)} />
          </div>
        </div>

        <div className="border-t border-border pt-16">
          <Experience />
        </div>

        {cards.length > 0 && (
          <section aria-labelledby="live-heading" className="pt-20">
            <div className="mb-7 flex items-baseline justify-between gap-6">
              <h2 id="live-heading" className={sectionHeading}>
                Live systems
              </h2>
              <Link href="/projects" className={sideLink}>
                All projects
              </Link>
            </div>
            <ProjectCards repos={cards} />
          </section>
        )}

        {rows.length > 0 && (
          <section aria-labelledby="open-source-heading" className="pt-20">
            <div className="mb-5 flex items-baseline justify-between gap-6">
              <h2 id="open-source-heading" className={sectionHeading}>
                Open source
              </h2>
              <a href={siteConfig.socials.github} target="_blank" rel="noreferrer" className={sideLink}>
                GitHub ↗
              </a>
            </div>
            <RepoRows repos={rows} />
          </section>
        )}

        <section aria-labelledby="writing-heading" className="pt-20">
          <div className="mb-5 flex items-baseline justify-between gap-6">
            <h2 id="writing-heading" className={sectionHeading}>
              Writing
            </h2>
            <Link href="/blog" className={sideLink}>
              All {posts.length} posts
            </Link>
          </div>
          <div className="mb-10">
            <HeroSearch posts={posts} />
          </div>
          <div className="grid gap-x-14 gap-y-8 md:grid-cols-2">
            <PostList heading="Selected" posts={selected} compact />
            <PostList heading="Latest" posts={latest} compact />
          </div>
        </section>

        <div className="pb-24 pt-20">
          <SkillsVisual />
        </div>

        {/* Hides itself until public/resume.pdf exists. */}
        <ResumeSection />
      </div>
    </main>
  );
}

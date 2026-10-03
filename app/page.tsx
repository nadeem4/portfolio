import Link from 'next/link';
import { Hero } from '@/components/hero/hero';
import { HeroSearch } from '@/components/hero/hero-search';
import { Experience } from '@/components/home/experience';
import { ProjectShowcase } from '@/components/projects/project-showcase';
import { PostList } from '@/components/blog/post-list';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';
import { getProjects } from '@/lib/projects';

// Matches /projects: the repo list refreshes on the same six-hour cadence.
export const revalidate = 21600;

/** How many posts each writing column shows before handing off to the blog. */
const WRITING_COUNT = 4;

const sectionHeading = 'text-[28px] font-semibold tracking-tight';
const sideLink =
  'link-underline inline-flex min-h-11 items-center text-[15px] text-foreground-dim hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/**
 * Who, then where, then what you can run, then what was written.
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

  return (
    <main>
      <div className="mx-auto max-w-page px-6 sm:px-10">
        <div className="flex flex-wrap items-start gap-14 pb-20 pt-16 sm:pt-24">
          <div className="min-w-0 flex-[6_1_460px]">
            <Hero />
          </div>
          <div className="min-w-0 flex-[5_1_340px]">
            <HeroSearch posts={posts} />
          </div>
        </div>

        <div className="border-t border-border pt-16">
          <Experience />
        </div>

        {pinned.length > 0 && (
          <section aria-labelledby="projects-heading" className="pt-20">
            <div className="mb-7 flex items-baseline justify-between gap-6">
              <h2 id="projects-heading" className={sectionHeading}>
                Projects
              </h2>
              <Link href="/projects" className={sideLink}>
                All projects
              </Link>
            </div>
            <ProjectShowcase repos={pinned} />
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

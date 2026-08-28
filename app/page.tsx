import { Hero } from '@/components/hero/hero';
import { Experience } from '@/components/home/experience';
import { SelectedProjects } from '@/components/home/selected-projects';
import { WritingActivity } from '@/components/home/writing-activity';
import { PostList } from '@/components/blog/post-list';
import { ArchiveLink } from '@/components/blog/archive-link';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { ContactSection } from '@/components/contact/contact-section';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';
import { getGithubRepos } from '@/lib/projects';
import { hasResume } from '@/lib/resume';

// Matches /projects: the repo list refreshes on the same six-hour cadence.
export const revalidate = 21600;

/** How many recent posts the Latest block shows. */
const LATEST_COUNT = 5;

export default async function HomePage() {
  const posts = getBlogPosts();
  const selected = getSelectedPosts();
  const repos = await getGithubRepos();
  // The catalog is sorted newest-first. Taken literally: a post that is both
  // pinned and recent appears in both blocks, which is accepted — they answer
  // different questions, and skipping it would make "Latest" untrue.
  const latest = posts.slice(0, LATEST_COUNT);

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="space-y-6">
          <Hero />
          {/* Hugs the hero deliberately: the blocks below sit past the
              experience list, so a skimmer never reaches them. */}
          <WritingActivity posts={posts} />
        </div>
        {/* Claim, then context, then evidence. The hero states what he does,
            experience says where and at what scope so a reader can establish
            level, and the projects and writing below are the corroboration. */}
        <div className="border-t border-border pt-12">
          <Experience />
        </div>
        {/* Wrapper is conditional too: SelectedProjects hides itself when the
            repo fetch comes back empty, and a border above nothing is a line. */}
        {repos.length > 0 && (
          <div className="border-t border-border pt-12">
            <SelectedProjects repos={repos} />
          </div>
        )}
        <div className="border-t border-border pt-12">
          <PostList heading="Selected writing" posts={selected} action={<ArchiveLink />} />
        </div>
        {/* Compact: full-format rows here would rerun the block above. */}
        <div className="border-t border-border pt-12">
          <PostList heading="Latest" posts={latest} compact />
        </div>
        <div className="border-t border-border pt-12">
          <SkillsVisual />
        </div>
        {/* Same border-above-nothing guard as the projects block: the section
            hides itself until public/resume.pdf exists. */}
        {hasResume() && (
          <div className="border-t border-border pt-12">
            <ResumeSection />
          </div>
        )}
        <div className="border-t border-border pt-12">
          <ContactSection />
        </div>
      </div>
    </main>
  );
}

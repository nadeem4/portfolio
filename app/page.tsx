import { Hero } from '@/components/hero/hero';
import { Experience } from '@/components/home/experience';
import { WritingActivity } from '@/components/home/writing-activity';
import { SelectedWriting } from '@/components/blog/selected-writing';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { ContactSection } from '@/components/contact/contact-section';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';

export default function HomePage() {
  const posts = getBlogPosts();
  const selected = getSelectedPosts();
  const total = posts.length;
  // The catalog is sorted newest-first, so [0] is the most recent post. Taken
  // from the catalog rather than the curated list, which is ordered for
  // legibility and whose newest entry may be months old.
  const latestDate = posts[0]?.date;

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <div className="space-y-6">
          <Hero />
          {/* Hugs the hero deliberately: the recency signal on the Selected
              writing header sits below the fold, so a skimmer never reaches it. */}
          <WritingActivity posts={posts} />
        </div>
        {/* Claim, then context, then evidence. The hero states what he does,
            experience says where and at what scope so a reader can establish
            level, and the writing below is the corroboration. This space
            previously went to a skills chip list. */}
        <div className="border-t border-border pt-12">
          <Experience />
        </div>
        <div className="border-t border-border pt-12">
          <SelectedWriting posts={selected} total={total} latestDate={latestDate} />
        </div>
        <div className="border-t border-border pt-12">
          <SkillsVisual />
        </div>
        <div className="border-t border-border pt-12">
          <ResumeSection />
        </div>
        <div className="border-t border-border pt-12">
          <ContactSection />
        </div>
      </div>
    </main>
  );
}

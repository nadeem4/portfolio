import { Hero } from '@/components/hero/hero';
import { Experience } from '@/components/home/experience';
import { SelectedWriting } from '@/components/home/selected-writing';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { ContactSection } from '@/components/contact/contact-section';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';

export default function HomePage() {
  const selected = getSelectedPosts();
  const total = getBlogPosts().length;

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <Hero />
        {/* Claim, then context, then evidence. The hero states what he does,
            experience says where and at what scope so a reader can establish
            level, and the writing below is the corroboration. This space
            previously went to a skills chip list. */}
        <div className="border-t border-border pt-12">
          <Experience />
        </div>
        <div className="border-t border-border pt-12">
          <SelectedWriting posts={selected} total={total} />
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

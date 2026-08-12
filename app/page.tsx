import { Hero } from '@/components/hero/hero';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { ContactSection } from '@/components/contact/contact-section';

export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-12">
        <Hero />
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

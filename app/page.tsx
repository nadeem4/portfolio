import { Hero } from '@/components/hero/hero';
import { SkillsVisual } from '@/components/skills/skills-visual';
import { ResumeSection } from '@/components/resume/resume-section';
import { ContactSection } from '@/components/contact/contact-section';

export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <Hero />
      <SkillsVisual />
      <ResumeSection />
      <ContactSection />
    </main>
  );
}

import { Hero } from '@/components/hero/hero';
import { SkillsVisual } from '@/components/skills/skills-visual';

export default function HomePage() {
  return (
    <main className="px-6 py-12">
      <Hero />
      <SkillsVisual />
    </main>
  );
}

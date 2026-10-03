import { hasResume } from '@/lib/resume';

interface ResumeSectionProps {
  /** Defaults to whether public/resume.pdf exists; injectable for tests. */
  available?: boolean;
}

export function ResumeSection({ available = hasResume() }: ResumeSectionProps = {}) {
  if (!available) return null;

  return (
    <section aria-label="Resume" className="space-y-4 pb-24">
      <h2 className="text-xl font-semibold">Resume</h2>
      <a
        href="/resume.pdf"
        download
        className="inline-flex h-11 items-center rounded border border-border-strong bg-background-raised px-4 text-sm font-medium transition-colors hover:border-foreground-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        Download Resume (PDF)
      </a>
    </section>
  );
}

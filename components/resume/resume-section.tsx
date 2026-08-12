export function ResumeSection() {
  return (
    <section aria-label="Resume" className="space-y-4">
      <h2 className="text-xs uppercase tracking-widest font-medium text-foreground-dim">Resume</h2>
      <a
        href="/resume.pdf"
        download
        className="inline-block rounded border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        Download Resume (PDF)
      </a>
    </section>
  );
}

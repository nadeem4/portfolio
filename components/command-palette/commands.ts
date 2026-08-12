export interface Command {
  id: string;
  label: string;
  href: string;
}

export const commands: Command[] = [
  { id: 'home', label: 'Go to Home', href: '/' },
  { id: 'blog', label: 'Go to Blog', href: '/blog' },
  { id: 'projects', label: 'Go to Projects', href: '/projects' },
  { id: 'live-projects', label: 'Go to Live Projects', href: '/live-projects' },
  { id: 'resume', label: 'Open Resume', href: '/resume.pdf' },
];

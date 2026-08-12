import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <Link href="/">Home</Link>
      <nav className="flex gap-4">
        <Link href="/blog">Blog</Link>
        <Link href="/projects">Projects</Link>
        <Link href="/live-projects">Live Projects</Link>
      </nav>
      <ThemeToggle />
    </header>
  );
}

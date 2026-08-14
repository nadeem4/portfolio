import type { Metadata } from 'next';
import { BlogList } from '@/components/blog/blog-list';
import { BlogMasthead } from '@/components/blog/blog-masthead';
import { getBlogPosts } from '@/lib/blog';
import { getSelectedPosts } from '@/lib/selected-writing';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Writing on Postgres CDC, Kafka at scale, distributed SQL execution, and applied AI infrastructure.',
};

export default function BlogPage() {
  const posts = getBlogPosts();
  const selected = getSelectedPosts();

  return (
    <main className="px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
          <BlogMasthead posts={posts} />
        </header>
        <BlogList posts={posts} selected={selected} />
      </div>
    </main>
  );
}

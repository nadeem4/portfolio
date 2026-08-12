import { BlogList } from '@/components/blog/blog-list';
import { getBlogPosts } from '@/lib/blog';

export const revalidate = 21600;

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <main className="px-6 py-12">
      <h1>Blog</h1>
      <BlogList posts={posts} />
    </main>
  );
}

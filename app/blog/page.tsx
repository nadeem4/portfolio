import { BlogList } from '@/components/blog/blog-list';
import { fetchMediumPosts } from '@/lib/medium';
import { getCategoryOverrides, applyCategoryOverrides } from '@/lib/blog-categories';
import { siteConfig } from '@/config/site';

export const revalidate = 21600;

export default async function BlogPage() {
  const [posts, overrides] = await Promise.all([
    fetchMediumPosts(siteConfig.mediumFeedUrl),
    getCategoryOverrides(),
  ]);
  return (
    <main className="px-6 py-12">
      <h1>Blog</h1>
      <BlogList posts={applyCategoryOverrides(posts, overrides)} />
    </main>
  );
}

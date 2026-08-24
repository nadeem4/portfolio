import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';
import { hasLiveProjects } from '@/config/live-projects';
import { getBlogPosts } from '@/lib/blog';
import { categoryStats } from '@/lib/blog-stats';
import { categorySlug } from '@/lib/categories';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();

  return [
    {
      url: `${baseUrl}/`,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog/archive`,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/projects`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    // One entry per category page. Derived from the catalog rather than listed
    // by hand, so a category added in Notion becomes crawlable on the next sync.
    // Ranked below /blog: the hub is the entry point, a topic page a slice of it.
    ...categoryStats(getBlogPosts()).map((stat) => ({
      url: `${baseUrl}/blog/${categorySlug(stat.category)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    // Listed only once something is deployed. The page is noindex until then,
    // and advertising a URL in the sitemap that the page asks not to be indexed
    // is a contradiction crawlers report as an error.
    ...(hasLiveProjects
      ? [
          {
            url: `${baseUrl}/live-projects`,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
          },
        ]
      : []),
  ];
}

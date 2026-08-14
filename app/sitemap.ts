import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';
import { hasLiveProjects } from '@/config/live-projects';

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
      url: `${baseUrl}/projects`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
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

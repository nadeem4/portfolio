import { getBlogPosts } from './blog';

/**
 * URL slug for a category name.
 *
 * Every run of non-alphanumerics collapses to one hyphen, so `Azure & Cloud
 * Fundamentals` and `J-Space Primer` both produce a clean slug rather than the
 * doubled separators a naive space-to-hyphen replacement leaves behind.
 *
 * Categories come from a Notion select field, so the set is small, curated and
 * stable — collisions are guarded by a test over the real catalog rather than
 * by disambiguating suffixes that would churn the URLs.
 */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Every category present in the catalog, deduplicated. */
function allCategories(): string[] {
  return [...new Set(getBlogPosts().map((post) => post.category))];
}

/** Slugs for every category, for `generateStaticParams`. */
export function categorySlugs(): string[] {
  return allCategories().map(categorySlug);
}

/**
 * The category a slug refers to, or null if none does.
 *
 * Resolved by slugging the catalog rather than by un-slugging the URL: the
 * transform is lossy (`azure-cloud-fundamentals` cannot be reversed into an
 * ampersand), so the catalog is the only thing that can answer this.
 */
export function categoryFromSlug(slug: string): string | null {
  return allCategories().find((category) => categorySlug(category) === slug) ?? null;
}

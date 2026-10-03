export interface GithubRepo {
  slug: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  language: string | null;
  updatedAt: string;
  license: string | null;
  /** The repo's website field: a live demo or docs site, or null when unset. */
  homepage: string | null;
}

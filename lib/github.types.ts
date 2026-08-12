export interface GithubRepo {
  slug: string;
  name: string;
  description: string;
  url: string;
  stars: number;
  language: string | null;
  updatedAt: string;
}

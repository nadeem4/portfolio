export interface BlogPost {
  /** Trailing hex id from the Medium URL. Stable across slug rewrites; seeds the identicon. */
  id: string;
  title: string;
  subtitle: string;
  url: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  date: string;
  category: string;
}

/**
 * Every category defined in the Notion database schema.
 *
 * All sixteen are listed, not just those currently carrying posts — validating
 * against the in-use set would fail the first time an unused category is
 * assigned to a new post.
 *
 * Kept in sync by hand with the Notion select options. A category present in the
 * catalogue but missing here fails the catalogue test, which is the intended
 * signal that this list has drifted.
 */
export const BLOG_CATEGORIES = [
  'AI System Design',
  'System Design Case Studies',
  'LLM Architectures',
  'RAG on PDFs',
  'Vector Databases',
  'AI Breakthroughs',
  'J-Space Primer',
  'LLM-Era System Design Case Studies',
  'Backend & Infra',
  'Postgres Series',
  'Python Logging',
  'Azure & Cloud Fundamentals',
  'Azure Functions Internals',
  'Java & Spring Boot',
  'Data Science',
  'Software Engineering',
] as const;

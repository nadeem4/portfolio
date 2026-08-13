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
 * All fourteen are listed, not just the twelve currently carrying posts —
 * validating against the in-use set would fail the first time an unused
 * category is assigned to a new post.
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
] as const;

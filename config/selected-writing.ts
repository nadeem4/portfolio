/**
 * The handful of posts worth leading with, in display order.
 *
 * Every strong engineering site curates a small set above the archive —
 * "Popular Posts", "Publications", "Analyses", "Favorites". None present an
 * undifferentiated list of everything they have written, which is what a flat
 * flat archive is. These are the entries that get surfaced on the homepage.
 *
 * Selection favours systems actually operated in production over explainers and
 * third-party case studies: reading about scale is not the same evidence as
 * running it. Ordering favours what is legible at a glance — a post with a
 * concrete number in its title leads, because the first reader is skimming.
 *
 * Values are post ids from `config/blog-posts.json`. A test asserts every one
 * resolves, so a typo fails the build rather than silently dropping an entry.
 */
export const selectedWriting: string[] = [
  // Operated in production
  'bdb4bd9cf398', // How Kafka Really Works: 60M+ Events/Day Production Pipeline
  '14d108cbfbb6', // Protecting PostgreSQL Primaries from Replication Slot Failures
  '10729660cf3a', // PostgreSQL Logical Replication at Scale: Guardrails for 60M+ Change Events

  // Applied AI
  'f575c832af69', // How to Stop Your NL2SQL Agents From Crashing in Production
  'b60e8b0fb0b6', // The 70B LLM Optimisation Playbook: 57.5GB to 24.3GB Per GPU
  '3b5bf9705c59', // Scaling Contrastive Training: Batch Size, GPU Gathering, Gradient Caching
];

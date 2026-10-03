/**
 * The series featured as tiles on the /blog hub.
 *
 * Each one is a catalog category, so the tile links to that category's page and
 * its post count is read live from the catalog rather than kept here.
 */
export interface Series {
  /** Category name exactly as the catalog spells it. */
  category: string;
  description: string;
}

export const SERIES: Series[] = [
  {
    category: 'Vector Databases',
    description: 'From embeddings to HNSW, IVF, DiskANN and billion-vector sharding.',
  },
  {
    category: 'Postgres Series',
    description: 'Logical replication, WAL limits and protecting the primary.',
  },
  {
    category: 'AI System Design',
    description: 'Serving and tuning LLMs, agents and RAG in production.',
  },
];

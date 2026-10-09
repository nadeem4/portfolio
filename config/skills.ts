export interface SkillGroup {
  category: 'Systems' | 'Data' | 'AI' | 'Languages' | 'Cloud';
  items: string[];
}

/**
 * Systems first: the site is positioned for backend and distributed systems
 * roles. Nothing here claims a skill the master resume marks stale
 * (Kubernetes, PyTorch, D3, Angular) or portfolio-only (FastAPI).
 */
export const skillGroups: SkillGroup[] = [
  {
    category: 'Systems',
    items: [
      'Kafka',
      'Debezium',
      'Postgres logical replication',
      'Pub/Sub',
      'Postgres job queues (Procrastinate)',
      'Durable Functions',
      'OpenTelemetry',
    ],
  },
  { category: 'Data', items: ['PostgreSQL', 'SQL Server', 'MySQL', 'Azure Synapse', 'Delta Lake'] },
  { category: 'AI', items: ['LangGraph', 'RAG', 'Embeddings and vector search', 'LLM inference'] },
  { category: 'Languages', items: ['Python', 'Java', 'SQL', 'TypeScript'] },
  { category: 'Cloud', items: ['Google Cloud', 'Azure', 'Docker'] },
];

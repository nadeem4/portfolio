export interface SkillGroup {
  category: 'Languages' | 'Data' | 'AI' | 'Infra';
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  { category: 'Languages', items: ['Python', 'Java', 'SQL', 'TypeScript'] },
  { category: 'Data', items: ['PostgreSQL', 'Kafka', 'Debezium', 'Azure Synapse', 'SQL Server', 'MySQL'] },
  { category: 'AI', items: ['LangGraph', 'NL2SQL', 'RAG', 'Vector Databases', 'LLM Serving'] },
  { category: 'Infra', items: ['Azure', 'Kubernetes', 'Docker', 'Spring Boot', 'OpenTelemetry', 'Azure DevOps'] },
];

export interface SkillGroup {
  category: 'Languages' | 'Data' | 'ML' | 'Infra';
  items: string[];
}

export const skillGroups: SkillGroup[] = [
  { category: 'Languages', items: ['Python', 'TypeScript', 'SQL', 'Go'] },
  { category: 'Data', items: ['Spark', 'Kafka', 'Airflow', 'dbt'] },
  { category: 'ML', items: ['PyTorch', 'scikit-learn', 'MLflow'] },
  { category: 'Infra', items: ['AWS', 'Docker', 'Kubernetes', 'Terraform'] },
];

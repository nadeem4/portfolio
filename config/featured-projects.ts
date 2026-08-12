export interface PipelineStep {
  label: string;
}

export interface FeaturedProject {
  repoSlug: string;
  blurb: string;
  pipeline?: PipelineStep[];
}

export const featuredProjects: FeaturedProject[] = [
  {
    repoSlug: 'yourhandle/example-pipeline',
    blurb: 'Batch ETL pipeline processing 10M+ events/day.',
    pipeline: [{ label: 'Kafka' }, { label: 'Spark' }, { label: 'S3' }, { label: 'Redshift' }],
  },
];

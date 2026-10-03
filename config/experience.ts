export interface Role {
  company: string;
  title: string;
  /** Display period, e.g. "Jan 2022 to Mar 2026". */
  period: string;
  location: string;
  /** One line of scope. Numbers belong here, where an employer and a date make them checkable. */
  scope: string;
}

/**
 * Work history, newest first.
 *
 * The site previously carried no employer, title, or date anywhere, which left
 * its headline numbers unanchored — a reviewer's summary was "I can't pitch a
 * candidate whose level I can't establish". Scale claims live here rather than
 * in the hero for that reason: attached to a job and a date, they are checkable.
 *
 * Kept to four entries. The Boston University row sits between the two Crowe
 * stints because it explains the gap between them rather than leaving it to be
 * inferred. Roles before 2017 are omitted; a portfolio is not a résumé.
 */
export const roles: Role[] = [
  {
    company: 'EvolutionIQ',
    title: 'Senior Software Engineer',
    period: 'Mar 2026 to now',
    location: 'New York, US',
    scope:
      'Moved document ingestion from a 30-minute scheduled scan to Pub/Sub events feeding Postgres-backed job queues, so documents become searchable as they land. Own the embedding pipeline, and rebuilt tracing that took a slow endpoint from about 2 minutes to under one at p95.',
  },
  {
    company: 'Crowe',
    title: 'Senior Software Engineer, previously Cloud Senior Engineer',
    period: 'Jan 2022 to Mar 2026',
    location: 'Chicago, US',
    scope:
      'Architected a real-time CDC integration from Postgres to Salesforce on Debezium and Kafka, carrying 60M+ row changes a day, and led a SQL execution platform with planning, validation and sandboxed runs across four databases.',
  },
  {
    company: 'Boston University',
    title: 'MSc Computer Science, research and teaching',
    period: 'Jan 2021 to Feb 2022',
    location: 'Boston, US',
    scope:
      'Led product development for a public data-visualisation platform on US racial disparities at the Center for Antiracist Research (React, D3). Teaching assistant for MET CS 677, Data Science with Python.',
  },
  {
    company: 'Crowe',
    title: 'Backend Team Lead',
    period: 'Mar 2018 to Dec 2020',
    location: 'India',
    scope:
      'Led a team of five building a horizontally scalable microservice platform for a SaaS product on Spring, Docker and Kubernetes, with autoscaling tuned to 70% average CPU.',
  },
];

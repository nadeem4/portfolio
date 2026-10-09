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
 * its headline numbers unanchored: a reviewer's summary was "I can't pitch a
 * candidate whose level I can't establish". Scale claims live here rather than
 * in the hero for that reason: attached to a job and a date, they are checkable.
 *
 * Kept to four entries. The Boston University row sits between the two Crowe
 * stints because it explains the gap between them rather than leaving it to be
 * inferred. Roles before 2017 are omitted; a portfolio is not a résumé.
 *
 * Every claim is cut from the master resume (C:\Resume\source\master-resume.md)
 * and takes the smaller of two phrasings: "re-architected an existing pattern",
 * not "introduced"; 60M+ is a month-end peak, not a daily average. A merged
 * same-employer block carries one title. No em dashes.
 */
export const roles: Role[] = [
  {
    company: 'EvolutionIQ',
    title: 'Senior Software Engineer',
    period: 'Mar 2026 to now',
    location: 'New York, US',
    scope:
      'Re-architected an existing event-driven pattern for a CPU-bound embedding workload: Pub/Sub into Postgres-backed job queues, separate subscriber and worker pools, 100 in-flight messages as backpressure. Documents went from waiting up to 30 minutes to searchable on arrival. Replaced a deadline-bound RPC router with a worker pool scaled on queue depth, taking LLM fallbacks from about 2% to zero so the legacy path could be deleted.',
  },
  {
    company: 'Crowe',
    title: 'Senior Software Engineer',
    period: 'Jan 2022 to Mar 2026',
    location: 'Chicago, US',
    scope:
      "Architected and built the first version of real-time CDC from a Postgres ERP into Salesforce, carrying 60M+ row changes a day at month-end peaks, then re-architected it onto Kafka when a second consumer arrived. Built a control loop that projects WAL growth against the primary's 50 GB slot budget and restarts the connector or resets the slot before it is reached, cutting manual-intervention incidents by about 70 to 80%. Led the SQL execution platform and its team of about ten.",
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

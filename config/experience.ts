export interface Role {
  company: string;
  title: string;
  /** Display period, e.g. "Jan 2022 — Mar 2026". */
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
    period: 'Mar 2026 — Present',
    location: 'New York, US',
    scope:
      'Shipped a product extension surfacing critical claim data directly to adjusters, removing manual parsing of demand packages. Led a cross-stack refactor and introduced SQL query tagging for end-to-end performance visibility across jobs and routes.',
  },
  {
    company: 'Crowe',
    title: 'Senior Software Engineer, previously Cloud Senior Engineer',
    period: 'Jan 2022 — Mar 2026',
    location: 'Chicago, US',
    scope:
      'Owned a distributed SQL execution platform and the CDC pipelines behind it — 60M+ Postgres change events and 10TB+ of batch data per day, at 99%+ reliability. Cut ETL runtime from 8 hours to 2.5 and cloud costs by roughly 40%.',
  },
  {
    company: 'Boston University',
    title: 'MSc Computer Science · Research & Teaching',
    period: 'Jan 2021 — Feb 2022',
    location: 'Boston, US',
    scope:
      'Led product development for a public data-visualisation platform on US racial disparities at the Center for Antiracist Research (React, D3). Teaching assistant for MET CS 677, Data Science with Python.',
  },
  {
    company: 'Crowe',
    title: 'Senior Cloud Software Engineer · Backend Team Lead',
    period: 'Mar 2018 — Dec 2020',
    location: 'India',
    scope:
      'Led a team of five building a horizontally scalable microservice platform for a SaaS product on Spring, Docker and Kubernetes, with autoscaling tuned to 70% average CPU.',
  },
];

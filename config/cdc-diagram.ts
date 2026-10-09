/**
 * The hero's architecture diagram: the Kafka-based CDC pipeline (V2) built at
 * Crowe, drawn in Mermaid (`diagrams/cdc-v2.mmd`) and rendered to a committed
 * SVG by `npm run diagrams`.
 *
 * Each node carries the guarantee it holds, shown when the node is hovered or
 * focused. Every claim is cut from the master resume and the CDC series the
 * candidate named as the source of truth for this system; take the smaller
 * claim, and keep 60M+ a month-end peak.
 */
export interface DiagramNode {
  name: string;
  guarantee: string;
}

export const cdcDiagram = {
  source: 'diagrams/cdc-v2.mmd',
  svg: 'public/diagrams/cdc-v2.svg',
  /** The `--svgId` the render script passes; Mermaid prefixes node ids with it. */
  svgId: 'cdc-v2',
  label: 'Kafka CDC pipeline from Postgres to Salesforce and the lake',
  caption:
    'Kafka CDC from Postgres to Salesforce and the lake, as built at Crowe: 60M+ row changes a day at month-end peak. Hover a component for the guarantee it holds.',
  seriesUrl:
    'https://medium.com/learnwithnk/postgresql-internals-cdc-kafka-and-distributed-systems-engineering-series-866226068cc4',
  nodes: {
    pg: {
      name: 'Postgres ERP',
      guarantee: 'CDC may degrade; the primary may not. Its WAL is capped at 50 GB, and nothing downstream is allowed to hold it there.',
    },
    ps: {
      name: 'Protection Service',
      guarantee:
        'Polls the replication slot every 15 seconds, projects WAL growth against the 50 GB budget, and restarts the connector or resets the slot before it is reached.',
    },
    dbz: {
      name: 'Debezium on Kafka Connect',
      guarantee:
        'One logical slot and no transformation, so downstream logic can never throttle capture: backpressure builds in Kafka, not in WAL.',
    },
    kafka: {
      name: 'Kafka',
      guarantee:
        'A raw topic per table plus an LSN topic for recovery, written with acks=all, min.insync.replicas 2 and replication factor 3.',
    },
    xf: {
      name: 'Transformer',
      guarantee: 'Poll, transform, produce, continuously: raw rows become Salesforce-shaped records on their own topic.',
    },
    sf: {
      name: 'Salesforce consumer',
      guarantee:
        'Flushes at 10,000 records or 60 seconds and commits offsets only after Salesforce confirms the load; failures go to a dead-letter queue with backoff.',
    },
    sfapi: {
      name: 'Salesforce',
      guarantee: 'Loaded through the Bulk API with idempotent External ID upserts, so a replayed batch changes nothing.',
    },
    dl: {
      name: 'Delta consumer',
      guarantee: 'Keeps the latest version per business key with lineage; a slow Salesforce API never stops lake ingestion.',
    },
    lake: {
      name: 'Delta Bronze',
      guarantee: 'Bounded state: soft deletes stay queryable for 30 days, and Kafka remains the source of truth for replay.',
    },
  } satisfies Record<string, DiagramNode>,
};

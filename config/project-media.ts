/**
 * Screenshots and link copy for pinned repos that have a live site.
 *
 * Keyed by repo name. A pinned repo shows as a card with its screenshot only
 * when it has both an entry here and a GitHub `homepage`; anything else falls
 * back to a plain row. Screenshots live in `public/projects/`, taken at a
 * 1280x800 viewport.
 */
export interface ProjectMedia {
  /** Path under `public/`, e.g. `/projects/nl2sql.png`. */
  image: string;
  alt: string;
  /** Text for the link to the live site, e.g. "Open demo". */
  linkLabel: string;
  /** Display name; the repo name is used when absent. */
  title?: string;
  /**
   * The stages the system runs through, joined by arrows, rendered in mono.
   * This is where "distributed systems" stops being a label: a reader can
   * check each stage against the code.
   */
  system: string;
  /** One plain sentence: the property the design holds to. No em dashes. */
  guarantee: string;
}

export const projectMedia: Record<string, ProjectMedia> = {
  nl2sql: {
    image: '/projects/nl2sql.png',
    alt: 'nl2sql playground: the Ask tab with the search index, the sample database and guided questions',
    linkLabel: 'Open demo',
    title: 'nl2sql playground',
    system: 'question → planner (typed plan, never SQL) → validator (schema, joins, role) → sqlglot → read-only executor',
    guarantee:
      'A plan that fails validation never becomes SQL, and a security refusal is final. On PyPI as nl2sql-engine.',
  },
  'rag-playground': {
    image: '/projects/rag-playground.png',
    alt: 'RAG playground: the index pipeline steps beside the Ask panel and its retrieval settings',
    linkLabel: 'Open demo',
    title: 'RAG playground',
    system: 'PDF → parse → clean → chunk → index → retrieve (dense, keyword or hybrid) → rerank → cited answer',
    guarantee: 'Every stage is swappable, and evaluation says why each miss missed.',
  },
  'jev-demo': {
    image: '/projects/jev-demo.png',
    alt: 'Decision Arena: two decision models set up side by side on the highway scenario',
    linkLabel: 'Open arena',
    title: 'Decision Arena',
    system: 'game state → decision model (Jev or Laya) → probability per allowed action → environment step',
    guarantee:
      'The model can only answer with an option on the list. Includes agent-watchdog, which scores each Claude Code tool call before it runs.',
  },
  'ai-experiments': {
    image: '/projects/ai-experiments.png',
    alt: 'AI experiments site: the introduction and the re-ranking experiment with its measured results',
    linkLabel: 'Read the results',
    title: 'AI experiments',
    system: 'protocol committed → run (local or Kaggle GPU) → every call recorded → results committed',
    guarantee: 'Predictions are committed before the run, and negative results are published as they came out.',
  },
  post_training: {
    image: '/projects/post_training.png',
    alt: 'Post-training docs site: the overview page with scope, quickstart and tests',
    linkLabel: 'Read the docs',
    title: 'Post-training',
    system: 'environment → agent (Q-learning, DQN, PPO, GRPO) → policy update → tests',
    guarantee: 'Each method is small enough to read in one sitting, and each has its own tests.',
  },
};

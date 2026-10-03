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
}

export const projectMedia: Record<string, ProjectMedia> = {
  nl2sql: {
    image: '/projects/nl2sql.png',
    alt: 'nl2sql playground: the Ask tab with the search index, the sample database and guided questions',
    linkLabel: 'Open demo',
    title: 'nl2sql playground',
  },
  'rag-playground': {
    image: '/projects/rag-playground.png',
    alt: 'RAG playground: the index pipeline steps beside the Ask panel and its retrieval settings',
    linkLabel: 'Open demo',
    title: 'RAG playground',
  },
  'jev-demo': {
    image: '/projects/jev-demo.png',
    alt: 'Decision Arena: two decision models set up side by side on the highway scenario',
    linkLabel: 'Open arena',
    title: 'Decision Arena',
  },
  post_training: {
    image: '/projects/post_training.png',
    alt: 'Post-training docs site: the overview page with scope, quickstart and tests',
    linkLabel: 'Read the docs',
    title: 'Post-training',
  },
};

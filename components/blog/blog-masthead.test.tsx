import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BlogMasthead } from './blog-masthead';
import { getBlogPosts } from '@/lib/blog';
import { catalogStats } from '@/lib/blog-stats';

const posts = getBlogPosts();
const stats = catalogStats(posts)!;

describe('BlogMasthead', () => {
  // Asserted against derived values rather than literals, so the test cannot rot
  // as the sync job adds posts.
  it('introduces the catalog in one sentence, with the total and first year', () => {
    const { container } = render(<BlogMasthead posts={posts} />);
    expect(container.textContent).toBe(
      `${stats.total} posts since ${stats.firstYear}, mostly on Postgres, Kafka, vector databases and the systems around LLMs. Each one opens on Medium.`,
    );
  });

  it('renders nothing for an empty catalog rather than claiming zero posts', () => {
    const { container } = render(<BlogMasthead posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

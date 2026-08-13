import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlogMasthead } from './blog-masthead';
import { getBlogPosts } from '@/lib/blog';
import { catalogStats } from '@/lib/blog-stats';

const posts = getBlogPosts();
const stats = catalogStats(posts)!;

describe('BlogMasthead', () => {
  // Asserted against derived values rather than literals, so the test cannot rot
  // as the sync job adds posts.
  it('states the total number of posts', () => {
    render(<BlogMasthead posts={posts} />);
    expect(screen.getByText(String(stats.total))).toBeInTheDocument();
  });

  it('states how many domains the writing spans', () => {
    render(<BlogMasthead posts={posts} />);
    expect(screen.getByText(String(stats.categoryCount))).toBeInTheDocument();
  });

  it('states the year range', () => {
    render(<BlogMasthead posts={posts} />);
    expect(screen.getByText(String(stats.firstYear))).toBeInTheDocument();
    expect(screen.getByText(String(stats.lastYear))).toBeInTheDocument();
  });

  it('renders nothing for an empty catalog rather than claiming zero posts', () => {
    const { container } = render(<BlogMasthead posts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

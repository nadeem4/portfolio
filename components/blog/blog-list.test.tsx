import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogList } from './blog-list';
import type { MediumPost } from '@/lib/medium.types';

const posts: MediumPost[] = [
  { title: 'Data Post', link: 'https://a', pubDate: '', categories: ['Data'], contentSnippet: 'about data', imageUrl: null },
  { title: 'ML Post', link: 'https://b', pubDate: '', categories: ['ML'], contentSnippet: 'about ml', imageUrl: null },
];

describe('BlogList', () => {
  it('shows every post by default', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByText('Data Post')).toBeInTheDocument();
    expect(screen.getByText('ML Post')).toBeInTheDocument();
  });

  it('narrows to one category when its filter is clicked', () => {
    render(<BlogList posts={posts} />);
    fireEvent.click(screen.getByRole('button', { name: 'ML' }));
    expect(screen.getByText('ML Post')).toBeInTheDocument();
    expect(screen.queryByText('Data Post')).not.toBeInTheDocument();
  });

  it('shows a fallback message when there are no posts', () => {
    render(<BlogList posts={[]} />);
    expect(screen.getByText(/posts temporarily unavailable/i)).toBeInTheDocument();
  });

  it('renders a thumbnail image for a post with an imageUrl', () => {
    const withImage: MediumPost[] = [
      { title: 'Image Post', link: 'https://c', pubDate: '', categories: [], contentSnippet: 'has an image', imageUrl: 'https://cdn.example.com/cover.png' },
    ];
    // The thumbnail is decorative (alt=""), which removes it from the accessibility
    // tree's "img" role, so it's queried directly rather than via getByRole('img').
    const { container } = render(<BlogList posts={withImage} />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/cover.png');
  });

  it('does not render a thumbnail image for a post without an imageUrl', () => {
    const { container } = render(<BlogList posts={posts} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});

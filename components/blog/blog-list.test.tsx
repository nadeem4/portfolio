import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogList } from './blog-list';
import type { MediumPost } from '@/lib/medium.types';

const posts: MediumPost[] = [
  { title: 'Data Post', link: 'https://a', pubDate: '', categories: ['Data'], contentSnippet: 'about data' },
  { title: 'ML Post', link: 'https://b', pubDate: '', categories: ['ML'], contentSnippet: 'about ml' },
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
});

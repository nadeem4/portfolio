import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlogList } from './blog-list';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, title: string, category: string, subtitle = ''): BlogPost {
  return { id, title, subtitle, url: `https://medium.com/@you/p-${id}`, date: '2026-02-06', category };
}

const posts: BlogPost[] = [
  post('aaaaaaaaaaaa', 'Data Post', 'Data', 'about data'),
  post('bbbbbbbbbbbb', 'ML Post', 'ML', 'about ml'),
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

  it('renders an identicon for every post', () => {
    const { container } = render(<BlogList posts={posts} />);
    expect(container.querySelectorAll('svg')).toHaveLength(posts.length);
  });

  it('no longer renders remote thumbnail images', () => {
    // Cover images came from the Medium RSS payload, which is no longer fetched.
    const { container } = render(<BlogList posts={posts} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows the hand-written subtitle', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByText('about data')).toBeInTheDocument();
  });

  it('shows the published date as a machine-readable time element', () => {
    const { container } = render(<BlogList posts={posts} />);
    const time = container.querySelector('time');
    expect(time).toHaveAttribute('dateTime', '2026-02-06');
    expect(time).toHaveTextContent('2026-02-06');
  });

  it('links each post to its Medium url', () => {
    render(<BlogList posts={posts} />);
    expect(screen.getByRole('link', { name: 'Data Post' })).toHaveAttribute(
      'href',
      'https://medium.com/@you/p-aaaaaaaaaaaa',
    );
  });
});

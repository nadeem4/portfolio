import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryCards } from './category-cards';
import type { BlogPost } from '@/lib/blog.types';

function post(id: string, category: string, date: string): BlogPost {
  return { id, title: id, subtitle: '', url: `https://medium.com/@you/p-${id}`, date, category };
}

const posts: BlogPost[] = [
  post('aaaaaa', 'Current', '2026-08-01'),
  post('bbbbbb', 'Current', '2026-07-01'),
  post('cccccc', 'Current', '2026-06-01'),
  post('dddddd', 'Stale', '2020-01-01'),
];

describe('the All card', () => {
  // Regression: the chip row had an "All" chip. Converting to cards dropped it,
  // leaving only a 10px dim text link as the way back to the full list, which
  // read as a label rather than a control.
  it('renders first, ahead of every category', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    expect(screen.getAllByRole('button')[0]).toHaveTextContent(/All/);
  });

  it('shows the total post count across the catalog', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /All/ })).toHaveTextContent('4');
  });

  it('shows the catalog year range', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /All/ })).toHaveTextContent('2020');
    expect(screen.getByRole('button', { name: /All/ })).toHaveTextContent('2026');
  });

  it('is pressed when no category is selected, so the default state reads as a choice', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('is not pressed once a category is selected', () => {
    render(<CategoryCards posts={posts} selected="Stale" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clears the filter when clicked', () => {
    const onSelect = vi.fn();
    render(<CategoryCards posts={posts} selected="Stale" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /All/ }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('CategoryCards', () => {
  it('renders one card per category', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Current/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stale/ })).toBeInTheDocument();
  });

  it('shows each category post count', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Current/ })).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: /Stale/ })).toHaveTextContent('1');
  });

  it('orders the most recently active category first, after the All card', () => {
    render(<CategoryCards posts={posts} selected={null} onSelect={() => {}} />);
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names[1]).toContain('Current');
  });

  it('selects a category when its card is clicked', () => {
    const onSelect = vi.fn();
    render(<CategoryCards posts={posts} selected={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Stale/ }));
    expect(onSelect).toHaveBeenCalledWith('Stale');
  });

  it('clears the filter when the already-selected card is clicked again', () => {
    const onSelect = vi.fn();
    render(<CategoryCards posts={posts} selected="Stale" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Stale/ }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the selected card with aria-pressed', () => {
    render(<CategoryCards posts={posts} selected="Stale" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: /Stale/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Current/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders nothing for an empty catalog', () => {
    const { container } = render(<CategoryCards posts={[]} selected={null} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

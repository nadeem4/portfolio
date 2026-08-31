import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VectorIndexLabPage, { metadata } from './page';
import { getBlogPosts } from '@/lib/blog';

const search = (params: Record<string, string | string[] | undefined> = {}) => ({
  searchParams: Promise.resolve(params),
});

// Looked up rather than hardcoded, for the same reason the page itself looks it
// up: the title lives in the catalog and the sync job may rewrite it.
const distanceMetrics = getBlogPosts().find((post) => post.id === 'f32b19d708c8');

describe('VectorIndexLabPage', () => {
  it('heads the page with what the lab is', async () => {
    render(await VectorIndexLabPage(search()));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/vector index playground/i);
  });

  it('renders real prose on the server, not an empty div', async () => {
    // The prose is the SEO answer for a page whose value is otherwise
    // client-side JavaScript, and the no-JavaScript fallback.
    render(await VectorIndexLabPage(search()));
    expect(screen.getByRole('heading', { name: /what this teaches/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what the controls do/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what to watch for/i })).toBeInTheDocument();
    expect(screen.getByText(/scans every point/i)).toBeInTheDocument();
  });

  it('is honest that 2D shows the mechanism, not the geometry', async () => {
    render(await VectorIndexLabPage(search()));
    expect(screen.getByText(/2D shows the mechanism, not the geometry/i)).toBeInTheDocument();
  });

  it('mounts the island below the prose', async () => {
    render(await VectorIndexLabPage(search()));
    expect(screen.getByRole('img', { name: /points plotted/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /replay/i })).toBeInTheDocument();
  });

  it('links out to the posts it illustrates, marked as leaving the site', async () => {
    expect(distanceMetrics).toBeDefined();
    render(await VectorIndexLabPage(search()));
    const link = screen.getByRole('link', { name: (name) => name.startsWith(distanceMetrics!.title) });
    expect(link).toHaveAttribute('href', distanceMetrics!.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(/opens on Medium/i);
  });

  it('resolves every illustrated post from the catalog', async () => {
    // A mistyped id would otherwise drop a link silently rather than fail.
    render(await VectorIndexLabPage(search()));
    expect(screen.getAllByRole('link', { name: /opens on Medium/i })).toHaveLength(3);
  });

  it('configures the island from ?k= on mount', async () => {
    render(await VectorIndexLabPage(search({ k: '5' })));
    expect(screen.getByText('recall@5')).toBeInTheDocument();
  });

  it('ignores an index that does not exist yet rather than erroring', async () => {
    render(await VectorIndexLabPage(search({ index: 'hnsw' })));
    expect(screen.getByRole('img', { name: /points plotted/i })).toBeInTheDocument();
  });

  it('uses the same content column as every other page', async () => {
    const { container } = render(await VectorIndexLabPage(search()));
    expect(container.querySelector('main > div')).toHaveClass('max-w-2xl', 'lg:max-w-3xl');
  });

  it('carries its own metadata', () => {
    expect(metadata.title).toMatch(/vector index/i);
    expect(metadata.description).toBeTruthy();
  });
});

describe('VectorIndexLabPage layout', () => {
  it('lets the lab break the shared prose column', async () => {
    // The site keeps one content width across pages, and prose should keep it.
    // An instrument is not an article: the canvas needs room the reading column
    // cannot give it, so the lab alone opts out, bounded rather than full-bleed.
    const { container } = render(await VectorIndexLabPage(search()));
    const lab = container.querySelector('[data-testid="lab-region"]');
    expect(lab).toBeInTheDocument();
    expect(lab?.className).toMatch(/max-w-\[/);
  });

  it('keeps the prose at reading width', async () => {
    const { container } = render(await VectorIndexLabPage(search()));
    expect(container.querySelector('main > div')).toHaveClass('max-w-2xl', 'lg:max-w-3xl');
  });
});

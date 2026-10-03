import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ProjectShowcase, RepoRows } from './project-showcase';
import type { GithubRepo } from '@/lib/github.types';

function makeRepo(overrides: Partial<GithubRepo> & { name: string }): GithubRepo {
  return {
    slug: `nadeem4/${overrides.name}`,
    description: `${overrides.name} description`,
    url: `https://github.com/nadeem4/${overrides.name}`,
    stars: 42,
    language: 'Python',
    updatedAt: '2026-08-15T00:00:00Z',
    license: null,
    homepage: null,
    ...overrides,
  };
}

const nl2sql = makeRepo({ name: 'nl2sql', homepage: 'https://nadeem4nk-nl2sql-demo.hf.space/' });
const postTraining = makeRepo({ name: 'post_training', homepage: 'https://nadeem4.github.io/post_training/' });
// Has a homepage but no screenshot in config/project-media.ts.
const logscribe = makeRepo({ name: 'logscribe', homepage: 'https://example.com/logscribe' });
// Has a screenshot entry but no homepage on GitHub.
const rag = makeRepo({ name: 'rag-playground', homepage: null, language: null });

describe('ProjectShowcase', () => {
  it('renders repos with a homepage and media as cards with a screenshot and display title', () => {
    render(<ProjectShowcase repos={[nl2sql, postTraining]} />);

    expect(screen.getByRole('heading', { name: 'nl2sql playground' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Post-training' })).toBeInTheDocument();
    expect(screen.getByAltText(/nl2sql playground/i)).toBeInTheDocument();
    expect(screen.getByText('nl2sql description')).toBeInTheDocument();
  });

  it('links the card to the live site in a new tab and to the code', () => {
    render(<ProjectShowcase repos={[nl2sql, postTraining]} />);

    const demo = screen.getByRole('link', { name: /open demo.*opens in a new tab/i });
    expect(demo).toHaveAttribute('href', 'https://nadeem4nk-nl2sql-demo.hf.space/');
    expect(demo).toHaveAttribute('target', '_blank');
    expect(demo).toHaveAttribute('rel', 'noreferrer');

    expect(screen.getByRole('link', { name: /read the docs/i })).toHaveAttribute(
      'href',
      'https://nadeem4.github.io/post_training/',
    );

    const code = screen.getAllByRole('link', { name: /^code/i });
    expect(code.map((link) => link.getAttribute('href'))).toEqual([nl2sql.url, postTraining.url]);
  });

  it('falls back to rows for repos missing a homepage or media, after the cards', () => {
    render(<ProjectShowcase repos={[logscribe, nl2sql, rag]} />);

    expect(screen.getAllByRole('img')).toHaveLength(1);
    const rows = screen.getAllByRole('list').at(-1)!;
    expect(within(rows).getByRole('link', { name: /logscribe/ })).toHaveAttribute('href', logscribe.url);
    expect(within(rows).getByRole('link', { name: /rag-playground/ })).toHaveAttribute('href', rag.url);
    expect(within(rows).queryByText('nl2sql')).not.toBeInTheDocument();
  });

  it('never shows star counts', () => {
    const { container } = render(<ProjectShowcase repos={[nl2sql, logscribe]} />);
    expect(container.textContent).not.toMatch(/42|stars?/i);
  });
});

describe('RepoRows', () => {
  it('shows name, description and "Language, Mon YYYY" meta', () => {
    render(<RepoRows repos={[logscribe]} />);

    expect(screen.getByRole('link', { name: /logscribe/ })).toHaveAttribute('href', logscribe.url);
    expect(screen.getByText('logscribe description')).toBeInTheDocument();
    expect(screen.getByText('Python, Aug 2026')).toBeInTheDocument();
  });

  it('omits the language when GitHub has none, rather than printing a placeholder', () => {
    render(<RepoRows repos={[rag]} />);

    expect(screen.getByText('Aug 2026')).toBeInTheDocument();
    expect(screen.queryByText(/N\/A/)).not.toBeInTheDocument();
  });

  it('renders nothing for an empty list', () => {
    const { container } = render(<RepoRows repos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

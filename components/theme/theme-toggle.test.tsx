import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

function renderWithTheme() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  afterEach(() => {
    cleanup();
    document.documentElement.className = '';
  });

  it('offers to switch to light mode when starting in dark mode', async () => {
    renderWithTheme();
    expect(await screen.findByRole('button', { name: /switch to light theme/i })).toBeInTheDocument();
  });

  it('switches the document theme class when clicked', async () => {
    renderWithTheme();
    const button = await screen.findByRole('button', { name: /switch to light theme/i });
    fireEvent.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains('light')).toBe(true));
  });
});

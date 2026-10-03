import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

function renderWithTheme(defaultTheme = 'dark') {
  return render(
    <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  afterEach(() => {
    document.documentElement.className = '';
    localStorage.clear();
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

  it('offers dark mode when the resolved theme is light', async () => {
    renderWithTheme('light');
    expect(await screen.findByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it('is a 44px icon button, not a text label', async () => {
    renderWithTheme();
    const button = await screen.findByRole('button', { name: /switch to light theme/i });
    expect(button).toHaveClass('h-11', 'w-11');
    expect(button.textContent?.trim()).toBe('');
  });
});

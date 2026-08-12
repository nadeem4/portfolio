import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from './command-palette';

describe('CommandPalette', () => {
  it('opens when Ctrl+K is pressed and lists all commands', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    expect(await screen.findByPlaceholderText('Jump to...')).toBeInTheDocument();
    expect(screen.getByText('Go to Blog')).toBeInTheDocument();
  });

  it('filters commands as the user types', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const input = await screen.findByPlaceholderText('Jump to...');
    await userEvent.type(input, 'resume');
    expect(screen.getByText('Open Resume')).toBeInTheDocument();
    expect(screen.queryByText('Go to Blog')).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(<CommandPalette />);
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await screen.findByPlaceholderText('Jump to...');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Jump to...')).not.toBeInTheDocument();
  });
});

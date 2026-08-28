import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaletteTrigger } from './palette-trigger';

describe('PaletteTrigger', () => {
  it('dispatches the toggle event on click', async () => {
    const listener = vi.fn();
    window.addEventListener('command-palette:toggle', listener);
    render(<PaletteTrigger />);
    await userEvent.click(screen.getByRole('button', { name: 'Open command palette' }));
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener('command-palette:toggle', listener);
  });
});

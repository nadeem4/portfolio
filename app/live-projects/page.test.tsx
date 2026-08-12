import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LiveProjectsPage from './page';
import { liveProjects } from '@/config/live-projects';

describe('LiveProjectsPage', () => {
  it('lists every configured live project as coming soon', () => {
    render(<LiveProjectsPage />);
    liveProjects.forEach((project) => {
      expect(screen.getByText(project.name)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/coming soon/i)).toHaveLength(liveProjects.length);
  });
});

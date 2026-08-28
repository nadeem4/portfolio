import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkillsVisual } from './skills-visual';
import { skillGroups } from '@/config/skills';

// Derived from the config rather than hard-coded, so editing the skill list is a
// content change and never a test failure.
describe('SkillsVisual', () => {
  it('renders a heading for every group', () => {
    render(<SkillsVisual />);
    for (const group of skillGroups) {
      expect(screen.getByRole('heading', { name: group.category })).toBeInTheDocument();
    }
  });

  it('renders the chips in every group', () => {
    render(<SkillsVisual />);
    for (const group of skillGroups) {
      expect(screen.getByText(group.items[0]), group.category).toBeInTheDocument();
      expect(screen.getByText(group.items[group.items.length - 1]), group.category).toBeInTheDocument();
    }
  });

  it('has no filter controls', () => {
    render(<SkillsVisual />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillsVisual } from './skills-visual';
import { skillGroups } from '@/config/skills';

// Derived from the config rather than hard-coded, so editing the skill list is a
// content change and never a test failure.
const [first, second] = skillGroups;

describe('SkillsVisual', () => {
  it('shows every category by default', () => {
    render(<SkillsVisual />);
    for (const group of skillGroups) {
      expect(screen.getByText(group.items[0]), group.category).toBeInTheDocument();
    }
  });

  it('renders a chip for every category', () => {
    render(<SkillsVisual />);
    for (const group of skillGroups) {
      expect(screen.getByRole('button', { name: group.category })).toBeInTheDocument();
    }
  });

  it('narrows to one category when its chip is clicked', () => {
    render(<SkillsVisual />);
    fireEvent.click(screen.getByRole('button', { name: second.category }));
    expect(screen.getByText(second.items[0])).toBeInTheDocument();
    expect(screen.queryByText(first.items[0])).not.toBeInTheDocument();
  });
});

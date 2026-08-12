import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SkillsVisual } from './skills-visual';

describe('SkillsVisual', () => {
  it('shows every category by default', () => {
    render(<SkillsVisual />);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Spark')).toBeInTheDocument();
  });

  it('narrows to one category when its chip is clicked', () => {
    render(<SkillsVisual />);
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(screen.getByText('Spark')).toBeInTheDocument();
    expect(screen.queryByText('Python')).not.toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Identicon } from './identicon';
import { identiconCells } from '@/lib/identicon';

const ID = 'bdb4bd9cf398';

describe('Identicon', () => {
  it('draws exactly one rect per lit cell', () => {
    const lit = identiconCells(ID).flat().filter(Boolean).length;
    const { container } = render(<Identicon id={ID} />);
    expect(container.querySelectorAll('rect')).toHaveLength(lit);
  });

  it('inherits colour from CSS rather than hard-coding the accent', () => {
    const { container } = render(<Identicon id={ID} />);
    expect(container.querySelector('svg')).toHaveAttribute('fill', 'currentColor');
  });

  it('is hidden from assistive technology, since the title carries the meaning', () => {
    const { container } = render(<Identicon id={ID} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders identical markup for the same id', () => {
    const a = render(<Identicon id={ID} />).container.innerHTML;
    const b = render(<Identicon id={ID} />).container.innerHTML;
    expect(a).toBe(b);
  });

  it('renders different markup for different ids', () => {
    const a = render(<Identicon id={ID} />).container.innerHTML;
    const b = render(<Identicon id="3b5bf9705c59" />).container.innerHTML;
    expect(a).not.toBe(b);
  });

  it('passes through a className so callers control sizing', () => {
    const { container } = render(<Identicon id={ID} className="h-20 w-20" />);
    expect(container.querySelector('svg')).toHaveClass('h-20', 'w-20');
  });
});

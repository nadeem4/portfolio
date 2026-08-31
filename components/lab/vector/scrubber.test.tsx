import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Scrubber, stepValueText } from './scrubber';

describe('stepValueText', () => {
  it('counts from one and names the step in words', () => {
    expect(stepValueText(11, 40, 'scanning point 7, distance 0.42')).toBe(
      'step 12 of 40: scanning point 7, distance 0.42',
    );
  });

  it('says so plainly when there is nothing to replay', () => {
    expect(stepValueText(0, 0, '')).toBe('no steps to replay');
  });
});

describe('Scrubber', () => {
  it('is a native range input, which is what buys keyboard, touch and scroll behaviour', () => {
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('type', 'range');
    expect(slider.tagName).toBe('INPUT');
  });

  it('spans the steps, one per position', () => {
    render(<Scrubber index={2} count={5} description="appending point 3" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '4');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('2');
  });

  it('describes the current step in aria-valuetext, not just as a number', () => {
    // A bare "12" tells a screen reader reader nothing about what the index is
    // showing. The words are the whole point of the control.
    render(<Scrubber index={11} count={40} description="scanning point 7, distance 0.42" onChange={() => {}} />);
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-valuetext',
      'step 12 of 40: scanning point 7, distance 0.42',
    );
  });

  it('announces the same description in a polite live region', () => {
    render(<Scrubber index={11} count={40} description="scanning point 7, distance 0.42" onChange={() => {}} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('step 12 of 40: scanning point 7, distance 0.42');
  });

  it('has an accessible name of its own', () => {
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={() => {}} />);
    expect(screen.getByRole('slider', { name: /replay/i })).toBeInTheDocument();
  });

  it('takes keyboard focus, so arrow keys drive it in a real browser', async () => {
    // jsdom does not implement arrow-key stepping on input[type=range] and
    // user-event does not emulate it, so the assertion is that the control is
    // the native one and is reachable by tab — which is the entire mechanism.
    // The change path is asserted separately below with the event a keypress
    // would produce.
    const user = userEvent.setup();
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    await user.tab();
    expect(slider).toHaveFocus();
    expect(slider).not.toHaveAttribute('tabindex', '-1');
  });

  it('reports the new index as a number when moved', () => {
    const onChange = vi.fn();
    render(<Scrubber index={0} count={5} description="appending point 3" onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('disables itself when there are no steps, and says why', () => {
    render(<Scrubber index={0} count={0} description="" onChange={() => {}} />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
    expect(slider).toHaveAttribute('aria-valuetext', 'no steps to replay');
    expect(screen.getByRole('status')).toHaveTextContent('no steps to replay');
  });

  it('does not report changes while disabled', () => {
    const onChange = vi.fn();
    render(<Scrubber index={0} count={0} description="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});

import { describe, it, expect } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CdcDiagram } from './cdc-diagram';
import { cdcDiagram } from '@/config/cdc-diagram';

// A stand-in for the Mermaid output: one group per node, ids as Mermaid writes them.
const svg = `<svg id="cdc-v2" viewBox="0 0 100 20">
  <g class="node" id="cdc-v2-flowchart-kafka-3"><rect/></g>
  <g class="node" id="cdc-v2-flowchart-sf-5"><rect/></g>
</svg>`;

function node(id: string) {
  return document.querySelector<SVGGElement>(`[id^="cdc-v2-flowchart-${id}-"]`)!;
}

describe('CdcDiagram', () => {
  it('shows the diagram as a figure with the default caption and a link to the CDC series', () => {
    render(<CdcDiagram svg={svg} />);
    expect(screen.getByRole('figure', { name: /kafka cdc/i })).toBeInTheDocument();
    expect(screen.getByText(cdcDiagram.caption)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /read the cdc series/i })).toHaveAttribute('href', cdcDiagram.seriesUrl);
  });

  it('makes every node reachable by keyboard, labelled with its guarantee', async () => {
    render(<CdcDiagram svg={svg} />);
    await act(async () => {});
    expect(node('kafka')).toHaveAttribute('tabindex', '0');
    expect(node('kafka')).toHaveAttribute('aria-label', `${cdcDiagram.nodes.kafka.name}: ${cdcDiagram.nodes.kafka.guarantee}`);
  });

  it('swaps the caption for the guarantee of the node under the pointer, and back on leave', async () => {
    render(<CdcDiagram svg={svg} />);
    await act(async () => {});
    fireEvent.mouseOver(node('sf'));
    expect(screen.getByText(cdcDiagram.nodes.sf.guarantee)).toBeInTheDocument();
    expect(node('sf')).toHaveClass('is-active');
    fireEvent.mouseOut(node('sf'));
    expect(screen.getByText(cdcDiagram.caption)).toBeInTheDocument();
    expect(node('sf')).not.toHaveClass('is-active');
  });

  it('does the same on keyboard focus', async () => {
    render(<CdcDiagram svg={svg} />);
    await act(async () => {});
    fireEvent.focus(node('kafka'));
    expect(screen.getByText(cdcDiagram.nodes.kafka.guarantee)).toBeInTheDocument();
  });
});

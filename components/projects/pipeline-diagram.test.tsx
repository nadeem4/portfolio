import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineDiagram } from './pipeline-diagram';

describe('PipelineDiagram', () => {
  it('renders every step label in order', () => {
    render(<PipelineDiagram steps={[{ label: 'Kafka' }, { label: 'Spark' }, { label: 'S3' }]} />);
    const labels = screen.getAllByText(/^(Kafka|Spark|S3)$/).map((el) => el.textContent);
    expect(labels).toEqual(['Kafka', 'Spark', 'S3']);
  });
});

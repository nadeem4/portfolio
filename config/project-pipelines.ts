export interface PipelineStep {
  label: string;
}

export const projectPipelines: Record<string, PipelineStep[]> = {
  // Keyed by repo slug ("owner/repo"). Most repos have no entry and simply
  // render without a pipeline diagram. Add entries here for the few
  // projects worth hand-diagramming.
};

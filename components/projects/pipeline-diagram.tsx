'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { PipelineStep } from '@/config/project-pipelines';

interface PipelineDiagramProps {
  steps: PipelineStep[];
}

export function PipelineDiagram({ steps }: PipelineDiagramProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div aria-label="Architecture pipeline" className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <motion.span
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="rounded border border-accent/40 bg-background-raised px-3 py-1.5 text-xs uppercase tracking-widest font-medium text-foreground-dim"
          >
            {step.label}
          </motion.span>
          {index < steps.length - 1 && (
            <span aria-hidden="true" className="text-accent">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

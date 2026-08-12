'use client';

import { motion } from 'motion/react';

interface PipelineDiagramProps {
  steps: { label: string }[];
}

export function PipelineDiagram({ steps }: PipelineDiagramProps) {
  return (
    <div aria-label="Architecture pipeline" className="flex items-center gap-2">
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2"
        >
          <span className="rounded border border-border px-2 py-1 text-xs">{step.label}</span>
          {index < steps.length - 1 && <span aria-hidden="true">→</span>}
        </motion.div>
      ))}
    </div>
  );
}

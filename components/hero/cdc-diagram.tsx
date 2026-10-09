'use client';

import { useEffect, useRef, useState } from 'react';
import { cdcDiagram } from '@/config/cdc-diagram';

type NodeId = keyof typeof cdcDiagram.nodes;

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

/** The node id inside a Mermaid group id, `cdc-v2-flowchart-kafka-3` -> `kafka`. */
function nodeId(el: Element): NodeId | undefined {
  const match = el.id.match(new RegExp(`^${cdcDiagram.svgId}-flowchart-(\\w+)-\\d+$`));
  return match && match[1] in cdcDiagram.nodes ? (match[1] as NodeId) : undefined;
}

/**
 * The CDC pipeline as a diagram that answers questions. The SVG is Mermaid's,
 * rendered ahead of time and passed in as markup, so the page ships no Mermaid
 * runtime. Each node becomes focusable and swaps the caption for the guarantee
 * it holds; leaving it brings the caption back.
 *
 * Listeners sit on the wrapper (event delegation) so the injected markup needs
 * no per-node wiring beyond tabindex and a label.
 */
export function CdcDiagram({ svg }: { svg: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<NodeId | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.querySelectorAll('g.node').forEach((el) => {
      const id = nodeId(el);
      if (!id) return;
      const { name, guarantee } = cdcDiagram.nodes[id];
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', `${name}: ${guarantee}`);
    });
  }, [svg]);

  useEffect(() => {
    ref.current?.querySelectorAll('g.node').forEach((el) => el.classList.toggle('is-active', nodeId(el) === active));
  }, [active]);

  const pick = (target: EventTarget | null) => {
    const group = target instanceof Element ? target.closest('g.node') : null;
    setActive(group ? (nodeId(group) ?? null) : null);
  };

  const node = active ? cdcDiagram.nodes[active] : null;

  return (
    <figure aria-label={cdcDiagram.label} className="cdc-diagram">
      <div
        ref={ref}
        className="overflow-x-auto [&>svg]:h-auto [&>svg]:w-full [&>svg]:min-w-[760px] [&>svg]:max-w-full"
        onMouseOver={(e) => pick(e.target)}
        onMouseOut={() => setActive(null)}
        onFocus={(e) => pick(e.target)}
        onBlur={() => setActive(null)}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[15px]">
        <p aria-live="polite" className="min-h-[3em] max-w-[70ch] text-foreground-soft">
          {node ? (
            <>
              <span className="mr-2 font-mono text-[13px] text-accent">{node.name}</span>
              <span>{node.guarantee}</span>
            </>
          ) : (
            cdcDiagram.caption
          )}
        </p>
        <a
          href={cdcDiagram.seriesUrl}
          target="_blank"
          rel="noreferrer"
          className={`link-underline inline-flex min-h-11 shrink-0 items-center hover:text-accent ${focusRing}`}
        >
          Read the CDC series <span aria-hidden="true">&nbsp;↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </figcaption>
    </figure>
  );
}

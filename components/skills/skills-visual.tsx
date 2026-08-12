'use client';

import { useState } from 'react';
import { skillGroups } from '@/config/skills';
import { filterByCategory } from './filter-by-category';

const chipClasses =
  'rounded border border-border px-3 py-1 text-xs uppercase tracking-widest font-medium text-foreground-dim transition-colors hover:border-accent hover:text-accent aria-[pressed=true]:border-accent aria-[pressed=true]:text-accent aria-[pressed=true]:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2';

export function SkillsVisual() {
  const [active, setActive] = useState<string | null>(null);
  const visible = filterByCategory(skillGroups, active);
  const categories = skillGroups.map((group) => group.category);

  return (
    <section aria-label="Skills" className="space-y-6">
      <h2 className="text-xs uppercase tracking-widest font-medium text-foreground-dim">Skills</h2>
      <div role="group" aria-label="Skill categories" className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setActive(null)} aria-pressed={active === null} className={chipClasses}>
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            aria-pressed={active === category}
            className={chipClasses}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        {visible.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs uppercase tracking-widest font-medium text-foreground-dim mb-2">{group.category}</h3>
            <ul className="flex flex-wrap gap-2">
              {group.items.map((item) => (
                <li key={item} className="rounded border border-border px-2 py-1 text-xs text-foreground-dim">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { skillGroups } from '@/config/skills';
import { filterByCategory } from './filter-by-category';

export function SkillsVisual() {
  const [active, setActive] = useState<string | null>(null);
  const visible = filterByCategory(skillGroups, active);
  const categories = skillGroups.map((group) => group.category);

  return (
    <section aria-label="Skills">
      <div role="group" aria-label="Skill categories">
        <button type="button" onClick={() => setActive(null)} aria-pressed={active === null}>
          All
        </button>
        {categories.map((category) => (
          <button key={category} type="button" onClick={() => setActive(category)} aria-pressed={active === category}>
            {category}
          </button>
        ))}
      </div>
      {visible.map((group) => (
        <div key={group.category}>
          <h3>{group.category}</h3>
          <ul>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

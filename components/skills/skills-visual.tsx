import { skillGroups } from '@/config/skills';

/**
 * The tools behind the work, as plain grouped text.
 *
 * Deliberately quieter than the sections above it: a smaller heading and no
 * chips. A tag cloud gives every tool equal visual weight and says nothing.
 */
export function SkillsVisual() {
  return (
    <section aria-labelledby="tools-heading">
      <h2 id="tools-heading" className="mb-5 text-xl font-semibold">
        Tools I use
      </h2>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {skillGroups.map((group) => (
          <div key={group.category}>
            <h3 className="mb-1 font-mono text-xs font-normal text-foreground-dim">{group.category}</h3>
            <ul className="text-[15px] text-foreground-soft">
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

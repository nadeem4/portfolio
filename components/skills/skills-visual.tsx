import { skillGroups } from '@/config/skills';

export function SkillsVisual() {
  return (
    <section aria-label="Skills" className="space-y-6">
      <h2 className="text-xs uppercase tracking-widest font-medium text-foreground-dim">Skills</h2>
      <div className="grid gap-6 sm:grid-cols-2">
        {skillGroups.map((group) => (
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

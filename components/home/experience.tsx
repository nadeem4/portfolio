import { roles } from '@/config/experience';

/**
 * Work history on the homepage.
 *
 * Deliberately terse — company, title, dates, location, and a single line of
 * scope. Its job is to let a reader establish level and anchor the numbers in
 * the hero, not to reproduce a résumé.
 */
export function Experience() {
  if (roles.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-bold uppercase tracking-[0.18em]">Experience</h2>

      <ul className="mt-4 divide-y divide-border">
        {roles.map((role) => (
          <li key={`${role.company}-${role.period}`} className="py-4">
            {/* Stacked rather than justified: role titles vary enough in length
                that a right-aligned date sits inline on some rows and wraps
                below on others, which reads as a layout bug. */}
            <p className="font-medium">
              {role.company}
              <span aria-hidden="true" className="mx-1.5 text-foreground-dim opacity-50">
                ·
              </span>
              <span className="text-foreground-dim">{role.title}</span>
            </p>
            <p className="mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-foreground-dim">
              <span className="text-accent">{role.period}</span>
              <span aria-hidden="true" className="mx-1.5 opacity-50">
                ·
              </span>
              {role.location}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground-dim">{role.scope}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

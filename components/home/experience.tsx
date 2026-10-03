import { roles } from '@/config/experience';

/**
 * Work history on the homepage.
 *
 * Deliberately terse: company, title, dates, location, and one line of scope.
 * Its job is to let a reader establish level and anchor the numbers, not to
 * reproduce a résumé. Dates sit in their own column so the eye can run down
 * them; only the current role's date is in the accent colour.
 */
export function Experience() {
  if (roles.length === 0) return null;

  return (
    <section aria-labelledby="experience-heading">
      <h2 id="experience-heading" className="mb-8 text-[28px] font-semibold tracking-tight">
        Experience
      </h2>

      <ul>
        {roles.map((role, index) => (
          <li
            key={`${role.company}-${role.period}`}
            className="flex flex-wrap gap-x-10 gap-y-1.5 border-t border-border py-6"
          >
            <p className="w-44 shrink-0 pt-0.5 font-mono text-[13px] text-foreground-dim">
              <span className={index === 0 ? 'text-accent' : undefined}>{role.period}</span>
              <span className="block">{role.location}</span>
            </p>
            <div className="min-w-0 flex-[1_1_480px]">
              <h3 className="text-lg font-semibold">
                {role.company} <span className="font-normal text-foreground-dim">{role.title}</span>
              </h3>
              <p className="mt-2 max-w-[64ch] text-base text-foreground-soft">{role.scope}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

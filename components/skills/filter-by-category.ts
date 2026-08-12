import type { SkillGroup } from '@/config/skills';

export function filterByCategory(groups: SkillGroup[], category: string | null): SkillGroup[] {
  if (!category) return groups;
  return groups.filter((group) => group.category === category);
}

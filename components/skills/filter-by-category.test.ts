import { describe, it, expect } from 'vitest';
import { filterByCategory } from './filter-by-category';
import type { SkillGroup } from '@/config/skills';

const groups: SkillGroup[] = [
  { category: 'Languages', items: ['Python'] },
  { category: 'Data', items: ['Spark'] },
];

describe('filterByCategory', () => {
  it('returns all groups when no category is selected', () => {
    expect(filterByCategory(groups, null)).toEqual(groups);
  });

  it('returns only the matching group when a category is selected', () => {
    expect(filterByCategory(groups, 'Data')).toEqual([{ category: 'Data', items: ['Spark'] }]);
  });
});

import { describe, it, expect } from 'vitest';
import { siteConfig } from './site';
import { skillGroups } from './skills';
import { roles } from './experience';

const EM_DASH = /—/;

describe('site config', () => {
  it('has the fields required to render the hero and contact sections', () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.email).toContain('@');
    expect(siteConfig.socials.medium).toMatch(/^https:\/\/medium\.com\//);
    expect(siteConfig.socials.github).toContain('github.com');
    expect(siteConfig.githubUsername).toBeTruthy();
    expect(typeof siteConfig.githubUsername).toBe('string');
  });

  it('leads with backend and distributed systems', () => {
    expect(siteConfig.pitch).toMatch(/^Backend and distributed systems engineer\./);
    expect(siteConfig.pitch).toContain('change data capture');
  });

  it('keeps em dashes out of the copy', () => {
    expect(`${siteConfig.pitch} ${siteConfig.now}`).not.toMatch(EM_DASH);
  });
});

describe('skills config', () => {
  it('groups skills under the five expected categories, systems first', () => {
    const categories = skillGroups.map((g) => g.category);
    expect(categories).toEqual(['Systems', 'Data', 'AI', 'Languages', 'Cloud']);
    skillGroups.forEach((group) => expect(group.items.length).toBeGreaterThan(0));
  });

  it('claims no stale skill as current', () => {
    const items = skillGroups.flatMap((g) => g.items).join(' ');
    ['Kubernetes', 'PyTorch', 'D3', 'Angular', 'FastAPI'].forEach((stale) => expect(items).not.toContain(stale));
  });
});

describe('experience config', () => {
  it('gives each employer block one title', () => {
    roles.forEach((role) => expect(role.title).not.toMatch(/previously/i));
  });

  it('states 60M+ as a month-end peak, not a daily average', () => {
    const crowe = roles.find((role) => role.company === 'Crowe' && role.period.startsWith('Jan 2022'));
    expect(crowe?.scope).toMatch(/60M\+ row changes a day at month-end peaks/);
  });

  it('describes the EvolutionIQ migration as a re-architecture of an existing pattern', () => {
    expect(roles[0].scope).toMatch(/^Re-architected an existing event-driven pattern/);
  });

  it('keeps em dashes out of the copy', () => {
    roles.forEach((role) => expect(`${role.title} ${role.scope}`).not.toMatch(EM_DASH));
  });
});

import { describe, it, expect } from 'vitest';
import { siteConfig } from './site';
import { skillGroups } from './skills';
import { featuredProjects } from './featured-projects';
import { liveProjects } from './live-projects';

describe('site config', () => {
  it('has the fields required to render the hero and contact sections', () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.email).toContain('@');
    expect(siteConfig.mediumFeedUrl).toMatch(/^https:\/\/medium\.com\/feed\//);
    expect(siteConfig.socials.github).toContain('github.com');
  });

  it('groups skills under the four expected categories', () => {
    const categories = skillGroups.map((g) => g.category);
    expect(categories).toEqual(['Languages', 'Data', 'ML', 'Infra']);
    skillGroups.forEach((group) => expect(group.items.length).toBeGreaterThan(0));
  });

  it('gives every featured project a repo slug and a blurb', () => {
    expect(featuredProjects.length).toBeGreaterThan(0);
    featuredProjects.forEach((project) => {
      expect(project.repoSlug).toMatch(/^[\w-]+\/[\w.-]+$/);
      expect(project.blurb).toBeTruthy();
    });
  });

  it('marks live projects as coming-soon until a real URL is added', () => {
    expect(liveProjects.length).toBeGreaterThan(0);
    liveProjects.forEach((project) => expect(project.status).toBe('coming-soon'));
  });
});

import { describe, it, expect } from 'vitest';
import { siteConfig } from './site';
import { skillGroups } from './skills';
import { projectPipelines } from './project-pipelines';
import { liveProjects } from './live-projects';

describe('site config', () => {
  it('has the fields required to render the hero and contact sections', () => {
    expect(siteConfig.name).toBeTruthy();
    expect(siteConfig.email).toContain('@');
    expect(siteConfig.socials.medium).toMatch(/^https:\/\/medium\.com\//);
    expect(siteConfig.socials.github).toContain('github.com');
    expect(siteConfig.githubUsername).toBeTruthy();
    expect(typeof siteConfig.githubUsername).toBe('string');
  });

  it('groups skills under the four expected categories', () => {
    const categories = skillGroups.map((g) => g.category);
    expect(categories).toEqual(['Languages', 'Data', 'ML', 'Infra']);
    skillGroups.forEach((group) => expect(group.items.length).toBeGreaterThan(0));
  });

  it('keys every pipeline override by a valid owner/repo slug', () => {
    Object.keys(projectPipelines).forEach((slug) => {
      expect(slug).toMatch(/^[\w-]+\/[\w.-]+$/);
    });
  });

  it('marks live projects as coming-soon until a real URL is added', () => {
    expect(liveProjects.length).toBeGreaterThan(0);
    liveProjects.forEach((project) => expect(project.status).toBe('coming-soon'));
  });
});

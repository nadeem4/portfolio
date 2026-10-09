import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { projectMedia } from './project-media';

describe('projectMedia', () => {
  it('covers every pinned repo that has a live site', () => {
    expect(Object.keys(projectMedia).sort()).toEqual([
      'ai-experiments',
      'jev-demo',
      'nl2sql',
      'post_training',
      'rag-playground',
    ]);
  });

  it.each(Object.entries(projectMedia))('%s names the system behind it and one guarantee, without em dashes', (_, media) => {
    expect(media.system).toContain('→');
    expect(media.guarantee.length).toBeGreaterThan(20);
    expect(`${media.system} ${media.guarantee}`).not.toMatch(/—/);
  });

  it.each(Object.entries(projectMedia))('%s points at a screenshot that exists under public/', (_, media) => {
    expect(media.image).toMatch(/^\/projects\/.+\.png$/);
    expect(existsSync(join(process.cwd(), 'public', media.image))).toBe(true);
  });

  it.each(Object.entries(projectMedia))('%s has alt text and a link label without dashes', (_, media) => {
    expect(media.alt.length).toBeGreaterThan(10);
    expect(media.linkLabel).toBeTruthy();
    expect(`${media.alt} ${media.linkLabel} ${media.title ?? ''}`).not.toMatch(/[–—]/);
  });
});

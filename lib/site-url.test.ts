import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getSiteUrl } from './site-url';

describe('getSiteUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('falls back to localhost when no Vercel env vars are set', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('prefers VERCEL_PROJECT_PRODUCTION_URL when set', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'my-portfolio.vercel.app';
    process.env.VERCEL_URL = 'my-portfolio-git-branch.vercel.app';
    expect(getSiteUrl()).toBe('https://my-portfolio.vercel.app');
  });

  it('falls back to VERCEL_URL when production URL is not set', () => {
    process.env.VERCEL_URL = 'my-portfolio-preview.vercel.app';
    expect(getSiteUrl()).toBe('https://my-portfolio-preview.vercel.app');
  });
});

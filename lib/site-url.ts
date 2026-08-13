/**
 * Resolves the site's canonical base URL.
 *
 * Uses Vercel's automatically-injected env vars when deployed:
 * - `VERCEL_PROJECT_PRODUCTION_URL` (stable production domain)
 * - `VERCEL_URL` (deployment-specific URL, e.g. preview deployments)
 *
 * Falls back to localhost for local development, since this site
 * has no custom production domain configured yet.
 */
export function getSiteUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

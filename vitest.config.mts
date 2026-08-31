import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false,
    // Git worktrees live under .claude/worktrees and contain full copies of the
    // project, including its tests. Without this they are collected as if they
    // were source, so a stale branch can fail the run for the checked-out one.
    exclude: [...configDefaults.exclude, '**/.claude/**'],
    // The archive page renders the whole 102-post catalog, and its role queries
    // walk an accessibility tree over 100+ links. That sat just inside the 5s
    // default until the lab suite roughly doubled the file count and starved it
    // under parallel load. The render is legitimately heavy, not stuck, so the
    // default is what is wrong here.
    testTimeout: 15000,
  },
});

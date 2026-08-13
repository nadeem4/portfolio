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
  },
});

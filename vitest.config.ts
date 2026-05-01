import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/test/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['**/dist/**', '**/test/**'],
    },
  },
});

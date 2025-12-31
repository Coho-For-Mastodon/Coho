import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['urlpattern-polyfill', './tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/generated/**'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});

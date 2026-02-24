import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    reporters: ['verbose', 'html'],
    outputFile: {
      html: './html-report/index.html',
    },
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});

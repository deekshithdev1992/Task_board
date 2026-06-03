import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    include: [
      'src/**/*.spec.ts',
      path.resolve(__dirname, '../tests/**/*.spec.ts'),
    ],
    coverage: {
      include: ['src/**'],
      reporter: 'text',
      reportsDirectory: path.resolve(__dirname, 'coverage'),
    },
  },
  resolve: {
    alias: {
      express: path.resolve(__dirname, 'node_modules/express'),
      supertest: path.resolve(__dirname, 'node_modules/supertest'),
    },
  },
});

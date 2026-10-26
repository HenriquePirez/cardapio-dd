import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Ambiente node: os alvos são lógica pura (auth, validações, formatadores).
// 'cloudflare:workers' só existe no runtime do Workers — o stub cobre as
// leituras de binding usadas pelos testes (ver tests/cloudflare-workers-stub.ts).
export default defineConfig({
  resolve: {
    alias: {
      'cloudflare:workers': path.resolve(import.meta.dirname, 'tests/cloudflare-workers-stub.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

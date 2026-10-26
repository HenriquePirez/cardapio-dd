// Fast lint tier (sem informação de tipos). Regras que exigem o type checker
// vivem em eslint.typed.config.mjs e rodam no script separado `lint:typed`.
//
// Adaptações do template do toolkit (rev 790a895) para Astro + Cloudflare:
//   - fronteira de bindings: só src/lib/ pode importar 'cloudflare:workers'
//   - componentes não fazem acesso a dados em runtime (só tipos)
//   - console.log/error/warn são o canal de log do Workers (sem logger estruturado)
//   - max-lines em warn com 4 violações medidas (plano de redução em docs/quality.md)
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

import quality from './eslint-rules/index.cjs';

const testFiles = [
  '**/*{.,-}{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}',
  '**/{__tests__,__mocks__,fixtures,mocks}/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}',
];

export default defineConfig([
  globalIgnores([
    'dist/**',
    '.astro/**',
    'node_modules/**',
    'coverage/**',
    '.agents/**',
    '.superpowers/**',
    'public/**',
    'worker-configuration.d.ts',
    '**/*.tsbuildinfo',
    'package-lock.json',
  ]),
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astro.configs.recommended,
  {
    // Globals do runtime real: Workers (web APIs) + node_compat + browser nos
    // scripts de cliente do Astro. Lista ampla de propósito: no-undef em TS
    // é ruído; o `astro check` é quem garante tipos/identificadores.
    files: [
      'src/**/*.{ts,astro}',
      'scripts/**/*.mjs',
      '*.config.{mjs,mts,ts}',
      'eslint-rules/**/*.cjs',
    ],
    languageOptions: {
      globals: { ...globals.worker, ...globals.node, ...globals.browser },
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/**/*.{ts,astro}'],
    plugins: { quality },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Legados medidos (ver docs/quality.md): promover a error quando zerar.
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/triple-slash-reference': 'warn',
      'no-useless-assignment': 'warn',
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-statements': ['warn', 20],
      'max-params': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['warn', 3],
      // 4 violações medidas (ver docs/quality.md); promover a error quando zerar.
      'quality/max-lines': 'warn',
      // console é o canal de log do Workers (wrangler tail / dashboard).
      // Métodos fora de log/warn/error continuam proibidos.
      'quality/no-direct-console': [
        'error',
        { allow: ['log', 'warn', 'error'], logger: 'console (canal de log do Workers)' },
      ],
    },
  },
  {
    // Fronteira de bindings: o env do Cloudflare só é lido em src/lib/env.ts.
    files: ['src/**/*.{ts,astro}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'cloudflare:workers',
              message: 'Bindings do Cloudflare (D1/KV/env) só via src/lib/env.ts.',
            },
          ],
        },
      ],
    },
  },
  {
    // Dentro da lib o binding é permitido (env.ts é o dono).
    files: ['src/lib/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Componentes não acessam dados em runtime (páginas/APIs sim); tipos ok.
    files: ['src/components/**/*.{ts,astro}'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/db', '../lib/db', '../../lib/db'],
              allowTypeImports: true,
              message: 'Componentes não importam o módulo de dados em runtime; tipos via `import type`.',
            },
          ],
        },
      ],
    },
  },
  {
    files: testFiles,
    rules: {
      'max-statements': 'off',
      'max-lines-per-function': 'off',
      'max-nested-callbacks': 'off',
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': 'off',
      // Testes usam valores arbitrários em asserções.
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  {
    files: ['eslint-rules/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
]);

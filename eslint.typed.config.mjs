// Type-aware lint tier, separado do eslint.config.mjs de propósito:
// projectService monta o programa TS completo (mais lento que o fast tier).
// Local e CI rodam os mesmos dois scripts — nada de branch por env var.
import defaultConfig from './eslint.config.mjs';

export default [
  ...defaultConfig,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Perfil focused do toolkit (docs/tools/06) + regras de segurança de
      // tipos. Severidades por medição: ver docs/quality.md.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/unbound-method': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/restrict-plus-operands': 'warn',
      '@typescript-eslint/require-await': 'warn',
    },
  },
];

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Todo arquivo de migration referenciado nos scripts precisa estar versionado. */
describe('migrations versionadas', () => {
  it('inclui todas as migrations usadas por db:apply:local e db:apply:remote', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };
    const referenciados = new Set<string>();
    for (const nome of ['db:apply:local', 'db:apply:remote']) {
      const script = pkg.scripts[nome] ?? '';
      for (const match of script.matchAll(/--file=\.\/(migrations\/[^"'\s]+)/g)) {
        referenciados.add(match[1] ?? '');
      }
    }

    const versionados = new Set(
      execFileSync('git', ['ls-files', 'migrations'], { encoding: 'utf8' })
        .split('\n')
        .filter(Boolean),
    );

    expect([...referenciados].filter((arquivo) => !versionados.has(arquivo))).toEqual([]);
  });
});

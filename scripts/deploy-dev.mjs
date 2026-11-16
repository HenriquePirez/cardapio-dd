/**
 * Deploy do ambiente de desenvolvimento na Cloudflare.
 *
 * O adapter do Astro gera o manifesto final em dist/server/wrangler.json
 * com o nome e os bindings do wrangler.jsonc raiz — ou seja, os de produção.
 * Aqui trocamos apenas nome, KV e D1 para os recursos próprios do dev, e
 * deployamos esse manifesto diretamente (ele aponta para o servidor já
 * compilado em dist/server/entry.mjs; nada é recompilado).
 * Este script NÃO toca na produção: ele só existe para o ambiente dev.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const caminho = `${raiz}/dist/server/wrangler.json`;

let manifest;
try {
  manifest = JSON.parse(readFileSync(caminho, 'utf8'));
} catch {
  console.error('dist/server/wrangler.json não encontrado. Rode `npm run build` antes.');
  process.exit(1);
}

console.log(`[deploy:dev] preparando manifesto para cardapio-dd-dev (a partir de ${manifest.name})`);

manifest.name = 'cardapio-dd-dev';
manifest.topLevelName = 'cardapio-dd-dev';
manifest.kv_namespaces = [
  { binding: 'SESSION', id: '80f39729496649b59890b82ff4903cea' },
  { binding: 'MEDIA', id: '361b7df7f7664b659948136fa5ba7dd1' },
];
manifest.d1_databases = [
  {
    binding: 'DB',
    database_name: 'cardapio-dd-dev',
    database_id: '92f3390f-ac78-4fa7-abc6-9a9977f6036b',
    migrations_dir: manifest.d1_databases?.[0]?.migrations_dir ?? '../../migrations',
  },
];

writeFileSync(caminho, JSON.stringify(manifest, null, 2));

// --dry-run quando passada; deploy de verdade caso contrário
const args = ['wrangler', 'deploy', '--config', caminho];
if (process.argv.includes('--dry-run')) args.push('--dry-run');
execFileSync('npx', args, { stdio: 'inherit', cwd: raiz });

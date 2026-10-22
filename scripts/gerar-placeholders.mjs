/**
 * Gera imagens de PLACEHOLDER em public/media/ para desenvolvimento.
 * NÃO use em produção — substitua pelos seus arquivos reais no R2.
 *   node scripts/gerar-placeholders.mjs
 */
import { createRequire } from 'module';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'media');

const CORES = {
  'x-burger': ['#e8734a', '#c8502e'],
  'x-bacon': ['#d98324', '#a85f10'],
  milkshake: ['#8a5a3b', '#5f3a24'],
  batata: ['#e0a531', '#b37d15'],
};

function corPara(nome) {
  const chave = Object.keys(CORES).find((k) => nome.includes(k));
  return CORES[chave] || ['#6b7280', '#374151'];
}

async function gerar(nomeArquivo, texto, [c1, c2], w, h, format) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <text x="50%" y="50%" fill="rgba(255,255,255,0.92)" font-family="sans-serif"
      font-size="${Math.round(w / 14)}" font-weight="700" text-anchor="middle"
      dominant-baseline="middle">${texto}</text>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).toFormat(format).toBuffer();
  await sharp(buf).toFile(path.join(OUT, nomeArquivo));
  console.log('  ✓', nomeArquivo);
}

const alvos = [
  // thumbs (card) ~800px webp | full ~1600px jpg | poster video webp
  ['x-burger-1.webp', 'X-Burger', 800, 800, 'webp'],
  ['x-burger-2.webp', 'X-Burger', 800, 800, 'webp'],
  ['x-burger-3.webp', 'X-Burger', 800, 800, 'webp'],
  ['x-burger-1-full.jpg', 'X-Burger HD', 1600, 1600, 'jpeg'],
  ['x-burger-2-full.jpg', 'X-Burger HD', 1600, 1600, 'jpeg'],
  ['x-burger-3-full.jpg', 'X-Burger HD', 1600, 1600, 'jpeg'],
  ['x-burger-poster.webp', '▶ X-Burger', 800, 800, 'webp'],

  ['x-bacon-1.webp', 'X-Bacon', 800, 800, 'webp'],
  ['x-bacon-2.webp', 'X-Bacon', 800, 800, 'webp'],
  ['x-bacon-1-full.jpg', 'X-Bacon HD', 1600, 1600, 'jpeg'],
  ['x-bacon-2-full.jpg', 'X-Bacon HD', 1600, 1600, 'jpeg'],
  ['x-bacon-poster.webp', '▶ X-Bacon', 800, 800, 'webp'],

  ['milkshake-1.webp', 'Milkshake', 800, 800, 'webp'],
  ['milkshake-2.webp', 'Milkshake', 800, 800, 'webp'],
  ['milkshake-1-full.jpg', 'Milkshake HD', 1600, 1600, 'jpeg'],
  ['milkshake-2-full.jpg', 'Milkshake HD', 1600, 1600, 'jpeg'],

  ['batata-1.webp', 'Batata', 800, 800, 'webp'],
  ['batata-2.webp', 'Batata', 800, 800, 'webp'],
  ['batata-1-full.jpg', 'Batata HD', 1600, 1600, 'jpeg'],
  ['batata-2-full.jpg', 'Batata HD', 1600, 1600, 'jpeg'],
];

await mkdir(OUT, { recursive: true });
console.log('Gerando placeholders em', OUT);
for (const [arq, texto, w, h, fmt] of alvos) {
  await gerar(arq, texto, corPara(arq), w, h, fmt);
}
console.log('Pronto:', alvos.length, 'arquivos.');

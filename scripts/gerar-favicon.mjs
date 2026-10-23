/**
 * Gera os ícones da aba (favicon) a partir de public/logo-donadora.png.
 *
 *   node scripts/gerar-favicon.mjs
 *
 * A logo é branca sobre transparente, então os ícones ganham um fundo verde
 * (#14532d) — sem ele, o ícone branco sumiria em abas com tema claro.
 *
 * Saída em public/:
 *   favicon-32x32.png, favicon-16x16.png, apple-touch-icon.png e favicon.ico
 */
import { createRequire } from 'module';
import { writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FONTE = path.join(ROOT, 'public', 'logo-donadora.png');

const VERDE = '#14532d'; // cor da marca (header/footer da landing)

// Recorte do ícone (duas fatias), medido na logo original 568x573.
const RECORTE_ICONE = { left: 176, top: 70, width: 211, height: 154 };

/** Monta um .ico a partir de PNGs (o formato aceita PNG embutido). */
function montarIco(pngs) {
  // pngs: [{ size, buf }]
  const numImagens = pngs.length;
  const CABECALHO = 6; // reserved(2) + type(2) + count(2)
  const ENTRADA = 16; // 16 bytes por diretório
  const inicioDados = CABECALHO + ENTRADA * numImagens;

  const diretorios = [];
  const payloads = [];
  let offset = inicioDados;

  for (const { size, buf } of pngs) {
    const largura = size >= 256 ? 0 : size; // 0 codifica 256
    const altura = size >= 256 ? 0 : size;
    const dir = Buffer.alloc(ENTRADA);
    dir.writeUInt8(largura, 0); // width
    dir.writeUInt8(altura, 1); // height
    dir.writeUInt8(0, 2); // cores (0 = paleta aduinha)
    dir.writeUInt8(0, 3); // reservado
    dir.writeUInt16LE(1, 4); // planes
    dir.writeUInt16LE(32, 6); // bits per pixel
    dir.writeUInt32LE(buf.length, 8); // tamanho do dado
    dir.writeUInt32LE(offset, 12); // offset
    diretorios.push(dir);
    payloads.push(buf);
    offset += buf.length;
  }

  const cabecalho = Buffer.alloc(CABECALHO);
  cabecalho.writeUInt16LE(0, 0); // reservado
  cabecalho.writeUInt16LE(1, 2); // tipo 1 = icone
  cabecalho.writeUInt16LE(numImagens, 4);

  return Buffer.concat([cabecalho, ...diretorios, ...payloads]);
}

/**
 * Gera um ícone quadrado de `size` px: recorta o ícone da logo, ajusta ao
 * quadrado com folga e cola no fundo verde.
 */
async function iconeQuadrado(size) {
  const FOLGA = 0.14; // respiro nas bordas
  const disponivel = Math.round(size * (1 - FOLGA * 2));

  const icone = await sharp(FONTE)
    .extract(RECORTE_ICONE)
    .resize(disponivel, disponivel, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const meta = await sharp(icone).metadata();

  return sharp({
    create: { width: size, height: size, channels: 4, background: VERDE },
  })
    .composite([
      {
        input: icone,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

console.log('Gerando favicons a partir de logo-donadora.png');

const png16 = await iconeQuadrado(16);
const png32 = await iconeQuadrado(32);
const png180 = await iconeQuadrado(180);

await writeFile(path.join(ROOT, 'public', 'favicon-16x16.png'), png16);
await writeFile(path.join(ROOT, 'public', 'favicon-32x32.png'), png32);
await writeFile(path.join(ROOT, 'public', 'apple-touch-icon.png'), png180);
await writeFile(path.join(ROOT, 'public', 'favicon.ico'), montarIco([
  { size: 32, buf: png32 },
  { size: 16, buf: png16 },
]));

console.log('  ✓ favicon-16x16.png');
console.log('  ✓ favicon-32x32.png');
console.log('  ✓ apple-touch-icon.png (180x180)');
console.log('  ✓ favicon.ico (32 + 16)');
console.log('Pronto.');

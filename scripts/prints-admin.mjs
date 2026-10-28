#!/usr/bin/env node
/**
 * Gera os prints anotados do painel e o PDF do manual do administrador.
 *
 * Uso:
 *   npm run build && npm run docs:prints
 *
 * Requisitos: Playwright + Chromium (`npm i -D playwright && npx playwright install chromium`).
 * Roda contra o Worker local (`wrangler dev --local`), com D1/KV locais.
 * O script apaga os usuários do D1 LOCAL e cria uma conta de demonstração
 * descartável — nunca aponte para produção.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = resolve(RAIZ, 'docs/img/admin');
const PORTA = 8802;
const BASE = `http://127.0.0.1:${PORTA}`;

const CONTA = {
  nome: 'Demonstração',
  email: 'demo@exemplo.com',
  senha: 'senha-de-demonstracao-123',
};

const TOKEN = (() => {
  const bruto = spawnSync('bash', ['-lc', "grep '^SETUP_TOKEN=' .dev.vars | cut -d= -f2-"], {
    cwd: RAIZ,
    encoding: 'utf8',
  }).stdout.trim();
  if (!bruto) throw new Error('Defina SETUP_TOKEN no .dev.vars antes de gerar os prints.');
  return bruto;
})();

function consoleEtapa(texto) {
  process.stdout.write(`• ${texto}\n`);
}

function prepararBanco() {
  // Conta descartável: a página de criação só abre sem usuários.
  spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'cardapio-dd', '--local', '--command', 'DELETE FROM usuarios'],
    { cwd: RAIZ, stdio: 'ignore' },
  );
}

async function iniciarWorker() {
  const filho = spawn('npx', ['wrangler', 'dev', '--local', `--port=${PORTA}`], {
    cwd: RAIZ,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  filho.stdout.on('data', (d) => (log += d));
  filho.stderr.on('data', (d) => (log += d));

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const r = await fetch(`${BASE}/admin/login`);
      if (r.ok) return { filho, log: () => log };
    } catch {
      /* ainda subindo */
    }
  }
  filho.kill('SIGTERM');
  throw new Error(`wrangler dev não respondeu na porta ${PORTA}.\n${log.slice(-2000)}`);
}

/**
 * Desenha seta + círculo numerado em volta de cada alvo e tira o print.
 * `alvos`: [{ sel, dir }] — dir: left | top | right | bottom.
 */
async function print(page, arquivo, alvos) {
  // Rola para que todos os alvos caibam na tela (descontando o topo fixo).
  await page.evaluate((alvos) => {
    const caixas = alvos
      .map(({ sel }) => document.querySelector(sel)?.closest('label') ?? document.querySelector(sel))
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect());
    if (!caixas.length) return;
    const topo = Math.min(...caixas.map((b) => b.top));
    const base = Math.max(...caixas.map((b) => b.bottom));
    const limiteTopo = 118;
    const limiteBase = window.innerHeight - 24;
    if (topo < limiteTopo) window.scrollBy(0, topo - limiteTopo);
    else if (base > limiteBase) window.scrollBy(0, Math.min(base - limiteBase, topo - limiteTopo));
  }, alvos);
  await page.waitForTimeout(250);

  // O Chromium do Playwright não tem traduções pt-BR: o seletor de arquivo
  // nativo aparece em inglês. Desenha o rótulo que o navegador do dono mostra.
  await page.evaluate(() => {
    document.querySelectorAll('input[type="file"]').forEach((inp) => {
      const el = inp;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      el.style.visibility = 'hidden';
      const caixa = document.createElement('div');
      caixa.setAttribute('data-print-fake', '');
      caixa.style.cssText = `position:absolute;left:${r.left + window.scrollX}px;top:${r.top + window.scrollY}px;width:${r.width}px;height:${r.height}px;display:flex;align-items:center;gap:8px;padding:0 6px;border:1px solid #d1d5db;border-radius:6px;background:#fff;font:400 14px system-ui,sans-serif;color:#111827;z-index:5;pointer-events:none;`;
      caixa.innerHTML =
        '<span style="border:1px solid #d1d5db;border-radius:4px;background:#f3f4f6;padding:5px 12px;">Escolher arquivos</span><span style="color:#374151;">Nenhum arquivo escolhido</span>';
      document.body.appendChild(caixa);
    });
  });

  await page.evaluate((alvos) => {
    document.querySelectorAll('[data-print-annotation]').forEach((e) => e.remove());

    const camada = document.createElement('div');
    camada.setAttribute('data-print-annotation', '');
    camada.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:2147483647;';
    document.body.appendChild(camada);

    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;';
    svg.setAttribute('width', '1');
    svg.setAttribute('height', '1');
    camada.appendChild(svg);

    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML =
      '<marker id="ponta-print" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#e11d48"/></marker>';
    svg.appendChild(defs);

    const sy = window.scrollY;
    const sx = window.scrollX;
    const largura = window.innerWidth;
    const altura = window.innerHeight;
    const prender = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo);

    alvos.forEach(({ sel, dir = 'left' }, i) => {
      // Campo de checkbox: destaca o rótulo inteiro, que é o alvo real do dedo.
      const encontrado = document.querySelector(sel);
      const el = encontrado?.closest('label') ?? encontrado;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const x = r.left + sx;
      const y = r.top + sy;
      const cx = x + r.width / 2;
      const cy = y + r.height / 2;

      const caixa = document.createElement('div');
      caixa.style.cssText = `position:absolute;left:${x - 6}px;top:${y - 6}px;width:${r.width + 12}px;height:${r.height + 12}px;border:3px solid #e11d48;border-radius:12px;`;
      camada.appendChild(caixa);

      let inicio;
      let fim;
      if (dir === 'left') {
        inicio = [x - 110, cy - 60];
        fim = [x - 8, cy];
      } else if (dir === 'right') {
        inicio = [x + r.width + 110, cy + 60];
        fim = [x + r.width + 8, cy];
      } else if (dir === 'bottom') {
        inicio = [cx - 90, y + r.height + 110];
        fim = [cx, y + r.height + 8];
      } else {
        inicio = [cx + 90, y - 110];
        fim = [cx, y - 8];
      }

      // Sem espaço na direção escolhida: usa o lado oposto.
      const vistaY = inicio[1] - sy;
      if (dir === 'bottom' && vistaY > altura - 40) {
        inicio = [cx + 90, y - 110];
        fim = [cx, y - 8];
      } else if (dir === 'top' && vistaY < 40) {
        inicio = [cx - 90, y + r.height + 110];
        fim = [cx, y + r.height + 8];
      }

      // Nunca deixa a bolinha/seta saírem da área fotografada.
      inicio = [
        sx + prender(inicio[0] - sx, 34, largura - 34),
        sy + prender(inicio[1] - sy, 34, altura - 34),
      ];

      const linha = document.createElementNS(NS, 'path');
      linha.setAttribute('d', `M ${inicio[0]} ${inicio[1]} L ${fim[0]} ${fim[1]}`);
      linha.setAttribute('stroke', '#e11d48');
      linha.setAttribute('stroke-width', '5');
      linha.setAttribute('fill', 'none');
      linha.setAttribute('marker-end', 'url(#ponta-print)');
      svg.appendChild(linha);

      const numero = document.createElement('div');
      numero.textContent = String(i + 1);
      numero.style.cssText = `position:absolute;left:${inicio[0] - 17}px;top:${inicio[1] - 17}px;width:34px;height:34px;border-radius:50%;background:#e11d48;color:#fff;font:600 18px/34px system-ui,sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);`;
      camada.appendChild(numero);
    });
  }, alvos);

  await page.screenshot({ path: resolve(IMG, arquivo), fullPage: false });
  await page.evaluate(() => {
    document.querySelectorAll('[data-print-annotation], [data-print-fake]').forEach((e) => e.remove());
    document.querySelectorAll('input[type="file"]').forEach((el) => {
      el.style.visibility = '';
    });
  });
  consoleEtapa(arquivo);
}

/** Rola até o alvo e espera o layout assentar antes de anotar. */
async function ir(page, sel) {
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await page.evaluate((s) => {
    document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, sel);
  await page.waitForTimeout(200);
}

async function main() {
  prepararBanco();
  mkdirSync(IMG, { recursive: true });

  consoleEtapa('subindo wrangler dev local');
  const { filho } = await iniciarWorker();

  const navegador = await chromium.launch();
  const contexto = await navegador.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await contexto.newPage();

  try {
    // 1) Primeiro acesso: criar conta
    await page.goto(`${BASE}/admin/criar-conta`, { waitUntil: 'networkidle' });
    await page.fill('#token', TOKEN);
    await page.fill('#nome', CONTA.nome);
    await page.fill('#email', CONTA.email);
    await page.fill('#senha', CONTA.senha);
    await page.fill('#senha2', CONTA.senha);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    await print(page, '02-criar-conta.png', [
      { sel: '#token', dir: 'right' },
      { sel: '#nome', dir: 'left' },
      { sel: '#senha', dir: 'right' },
      { sel: 'form.form .btn-primario', dir: 'right' },
    ]);

    await page.click('form.form .btn-primario');
    await page.waitForURL('**/admin', { timeout: 20000 });

    // 2) Painel
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await print(page, '03-painel.png', [
      { sel: '.admin-nav a[href="/admin/produtos"]', dir: 'bottom' },
      { sel: '.admin-nav a[href="/admin/categorias"]', dir: 'bottom' },
      { sel: '.sair-btn', dir: 'bottom' },
    ]);

    // 3) Categorias
    await page.goto(`${BASE}/admin/categorias`, { waitUntil: 'networkidle' });
    await ir(page, '#nome');
    await print(page, '04-categorias-form.png', [
      { sel: '#nome', dir: 'left' },
      { sel: '#icone', dir: 'left' },
      { sel: '#ordem', dir: 'top' },
      { sel: 'section.cartao form .btn-primario', dir: 'bottom' },
    ]);
    await ir(page, 'section.cartao:nth-of-type(2)');
    await print(page, '05-categorias-lista.png', [
      { sel: 'section.cartao:nth-of-type(2) .linha-lista', dir: 'left' },
    ]);

    // 4) Produtos
    await page.goto(`${BASE}/admin/produtos`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await print(page, '06-produtos.png', [
      { sel: 'a[href="/admin/produtos/novo"]', dir: 'bottom' },
      { sel: 'input[name="q"]', dir: 'bottom' },
    ]);

    // 5) Edição de produto
    await page.goto(`${BASE}/admin/produtos/crostini`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await print(page, '07-produto-dados.png', [
      { sel: '#nome', dir: 'left' },
      { sel: '#preco', dir: 'left' },
      { sel: '#categoria', dir: 'top' },
    ]);

    await ir(page, '#modalidade');
    await print(page, '08-produto-modalidade.png', [{ sel: '#modalidade', dir: 'left' }]);

    await ir(page, '#galeria');
    await print(page, '09-produto-galeria.png', [
      { sel: '#arquivos', dir: 'left' },
      { sel: '#galeria', dir: 'bottom' },
    ]);

    await ir(page, '#ordem');
    await print(page, '10-produto-opcoes.png', [
      { sel: '#ordem', dir: 'left' },
      { sel: 'input[name="destaque"]', dir: 'right' },
      { sel: 'input[name="disponivel"]', dir: 'right' },
    ]);

    // 6) Cardápio público
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, 0));
    await ir(page, '.btn-comprar');
    await print(page, '11-cardapio-publico.png', [{ sel: '.btn-comprar', dir: 'right' }]);

    await page.click('.btn-comprar');
    await page.waitForSelector('#pedido-dialog:not([hidden])');
    await page.waitForTimeout(400); // fim da animação de entrada
    await print(page, '12-comprar.png', [
      { sel: '[data-escolha="local"]', dir: 'left' },
      { sel: '[data-escolha="retirada"]', dir: 'right' },
    ]);
    await page.keyboard.press('Escape');

    // 7) Sair (dentro do painel)
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
    await print(page, '13-sair.png', [{ sel: '.sair-btn', dir: 'bottom' }]);

    // 8) Login (sem sessão)
    await contexto.clearCookies();
    await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });
    await print(page, '01-login.png', [
      { sel: '#email', dir: 'left' },
      { sel: '#senha', dir: 'left' },
      { sel: '.login-btn', dir: 'right' },
    ]);

    // 9) PDF do manual
    consoleEtapa('gerando PDF');
    const html = pathToFileURL(resolve(RAIZ, 'docs/manual-admin.html')).href;
    await page.goto(html, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: resolve(RAIZ, 'docs/manual-admin.pdf'),
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;font:10px system-ui,sans-serif;color:#6b7280;padding:0 14mm;display:flex;justify-content:space-between;"><span>Manual do painel · Dona Dôra</span><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
    });
    consoleEtapa('docs/manual-admin.pdf');

    // Cópia dos prints para a pasta que o HTML referencia
    consoleEtapa('pronto');
  } finally {
    await navegador.close();
    filho.kill('SIGTERM');
  }
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  });

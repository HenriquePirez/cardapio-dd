# Fonte Fredoka + Ícones Flaticon + Lightbox Instagram — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tipografia da marca (Fredoka, sem pesos grossos) em cardápio e painel via token único, emojis substituídos por ícones Uicons (Flaticon, com crédito), categorias com seletor de ícone, e lightbox estilo Instagram (quadrado 1:1, bolinhas, seta de voltar).

**Architecture:** Dois pacotes npm auto-hospedados (`@fontsource/fredoka`, `@flaticon/flaticon-uicons`) + token `--fonte` em `global.css`. Lógica de ícone (nome vs. emoji legado) em `src/lib/icone.ts` (puro, testado). Lightbox redesenhado dentro de `Gallery.astro` (CSS/JS próprios, sem dependência nova).

**Tech Stack:** Astro 7 · TypeScript estrito · Vitest 30 · ESLint 10 · npm.

**Spec:** `docs/superpowers/specs/2026-10-26-fonte-e-icones-design.md` (aprovado; este plano argumenta do spec).

## Global Constraints

- Pesos tipográficos permitidos: 300/400/500 apenas (remover 600/700/800).
- Token único: `--fonte: 'Fredoka', system-ui, sans-serif;` em `src/styles/global.css`; `body` e `.admin-body` usam `var(--fonte)`.
- Importar somente `css/bold/rounded.css` dos Uicons (estilo `fi-br-*`; selectors funcionam sem classe base `.fi`).
- Nomes de ícone só os verificados no pacote: `pizza-slice`, `burger-alt`, `bowl-chopsticks-noodles`, `cake-birthday`, `cake-slice`, `beer`, `leaf`, `pot`, `mushroom`, `bread-slice`, `store-alt`, `tags`, `camera`.
- Emoji legado já gravado no D1 continua renderizando como texto — nunca quebrar dado existente.
- `✕`/`✓` (símbolos de texto) permanecem como estão (spec: não metas).
- Crédito obrigatório: "Ícones por Flaticon" (link `https://www.flaticon.com/br/`) no rodapé público e no painel.
- Lightbox: quadro `aspect-ratio: 1/1` de largura cheia; fotos `object-fit: cover`; vídeo `contain`; bolinhas abaixo do quadrado (esconder quando ≤1 item); seta `←` no topo à esquerda fecha; sem setas laterais, sem `✕`, sem texto "n / total".
- Toda verificação: `npm run check` + `npm run test` + `npm run lint` (ou `npm run verify` no fim).
- Idioma pt-BR em mensagens/código; commits convencionais em pt-BR.

## Review Focus

- **Dado legado multibyte:** `resolverIcone('🍕')` com ZWJ/sequência deve virar texto sem crash — teste pinado no Task 1.
- **Salvamento sem perda:** salvar categoria com nome de ícone passa intacto pela API; salvar sem mudar a seleção de um valor legado preserva o valor — teste no Task 1 (`normalizarIcone`) + conferência manual no Task 5.
- **Fontes empacotadas offline:** `url()` do woff2/woff nos CSS do Fontsource/Uicons é resolvido pelo Vite; build falha ruidoso se quebrar — `npm run build` no Task 2.
- **Bolinhas vs. scroll:** dots devem acompanhar o swipe (scroll-snap existente) e vídeo pausa ao trocar de slide (comportamento já existente, deve sobreviver) — Task 6.
- **Select de categoria com valor fora da lista:** opção extra "Atual: <valor>" garante que editar/salvar sem escolher nada não apaga o ícone — Task 5.

---

### Task 1: Helper de ícone (TDD)

**Files:**
- Modify: `src/lib/icone.ts` (adicionar exports abaixo; manter `limitarEmojis`/`contarEmojis`)
- Test: `src/lib/icone.test.ts` (novo)

**Interfaces:**
- Produz (consumidos nos Tasks 4/5):
  - `export const ICONES_CATEGORIA: readonly string[]` — os 13 nomes da Global Constraints, na ordem acima.
  - `export type IconeCategoria = { classe: string } | { texto: string };`
  - `export function resolverIcone(valor: string | null | undefined): IconeCategoria | null` — `null` se vazio; `{ classe: 'fi-br-<nome>' }` se `valor` ∈ `ICONES_CATEGORIA`; senão `{ texto: valor }`.
  - `export function normalizarIcone(valor: string): string` — se `valor` ∈ lista → `valor`; senão `limitarEmojis(valor)` (caminho legado).

- [ ] **Step 1: Escrever o teste falhando**

```ts
import { describe, expect, it } from 'vitest';
import { ICONES_CATEGORIA, normalizarIcone, resolverIcone } from './icone';

describe('resolverIcone', () => {
  it('retorna null para vazio', () => {
    expect(resolverIcone(null)).toBeNull();
    expect(resolverIcone(undefined)).toBeNull();
    expect(resolverIcone('')).toBeNull();
  });
  it('nome da lista vira classe fi-br-', () => {
    expect(resolverIcone('pizza-slice')).toEqual({ classe: 'fi-br-pizza-slice' });
  });
  it('emoji legado vira texto', () => {
    expect(resolverIcone('\u{1F355}')).toEqual({ texto: '\u{1F355}' });
    expect(resolverIcone('\u{1F468}\u{200D}\u{1F469}')).toEqual({ texto: '\u{1F468}\u{200D}\u{1F469}' });
  });
  it('valor desconhecido vira texto', () => {
    expect(resolverIcone('qualquercoisa')).toEqual({ texto: 'qualquercoisa' });
  });
});

describe('normalizarIcone', () => {
  it('preserva nome da lista', () => {
    expect(normalizarIcone('pizza-slice')).toBe('pizza-slice');
  });
  it('mantém emoji legado (máx 2)', () => {
    expect(normalizarIcone('\u{1F355}\u{1F355}\u{1F355}')).toBe('\u{1F355}\u{1F355}');
  });
  it('descarta texto sem emoji', () => {
    expect(normalizarIcone('abc')).toBe('');
  });
  it('lista tem os nomes verificados', () => {
    expect(ICONES_CATEGORIA).toContain('pizza-slice');
    expect(ICONES_CATEGORIA).toContain('burger-alt');
    expect(ICONES_CATEGORIA.length).toBeGreaterThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm run test`
Expected: falha (imports inexistentes)

- [ ] **Step 3: Implementar em `src/lib/icone.ts`**

Adicionar ao final do arquivo: `ICONES_CATEGORIA` (13 nomes), `IconeCategoria`, `resolverIcone`, `normalizarIcone` conforme Interfaces.

- [ ] **Step 4: Rodar e confirmar passagem**

Run: `npm run test`
Expected: todos passam (30 + 8 novos)

- [ ] **Step 5: Commit**

```bash
git add src/lib/icone.ts src/lib/icone.test.ts
git commit -m "Adiciona helper de icone de categoria (nome x emoji legado)"
```

### Task 2: Dependências + token de tipografia

**Files:**
- Modify: `package.json` (2 deps novas)
- Modify: `src/styles/global.css:36-43` (body font-family → `var(--fonte)`; novo token na linha ~22)
- Modify: `src/layouts/BaseLayout.astro:1-2` (imports de CSS)
- Modify: `src/layouts/AdminLayout.astro` (imports de CSS no frontmatter; `.admin-body` linha 108 → `var(--fonte)`)

**Interfaces:**
- Produz: CSS global com `--fonte`, Fredoka (300/400/500) e `.fi-br-*` disponíveis em todas as páginas.

- [ ] **Step 1: Instalar pacotes**

Run: `npm install @fontsource/fredoka @flaticon/flaticon-uicons`
Expected: lockfile atualizado, sem erros

- [ ] **Step 2: Tokens e imports**

`global.css`: `--fonte: 'Fredoka', system-ui, sans-serif;` em `:root`; `body { font-family: var(--fonte); }`.
`BaseLayout.astro` e `AdminLayout.astro` (frontmatter):
`import '@fontsource/fredoka/300.css'; import '@fontsource/fredoka/400.css'; import '@fontsource/fredoka/500.css'; import '@flaticon/flaticon-uicons/css/bold/rounded.css';`
`AdminLayout`: `.admin-body` → `font-family: var(--fonte);`.

- [ ] **Step 3: Verificar**

Run: `npm run check && npm run build`
Expected: 0 erros; build gera arquivos de fonte em `dist/`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/styles/global.css src/layouts/BaseLayout.astro src/layouts/AdminLayout.astro
git commit -m "Adiciona fonte Fredoka e Uicons (Flaticon) auto-hospedadas com token --fonte"
```

### Task 3: Reduzir pesos 600+ para 500

**Files:**
- Modify (só `font-weight` 600/700/800 → 500): `src/components/ProductForm.astro` (611, 670, 690), `src/components/ProductCard.astro` (153, 174, 201, 217, 227), `src/components/Gallery.astro` (186, 205), `src/pages/index.astro` (210, 251, 278, 336, 345), `src/pages/admin/index.astro` (151, 160, 172), `src/pages/admin/login.astro` (104, 133), `src/pages/admin/criar-conta.astro` (119, 148), `src/pages/admin/produtos/index.astro` (183, 208), `src/layouts/AdminLayout.astro` (154, 179, 220, 235, 258, 268, 328, 403)

- [ ] **Step 1: Substituir os pesos**

Para cada arquivo/linha: `font-weight: 600|700|800` → `font-weight: 500`. Pesos 500/400 permanecem.

- [ ] **Step 2: Conferir que não sobrou nenhum**

Run: `grep -rn "font-weight: \(600\|700\|800\)" src/`
Expected: vazio

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run check`
Expected: 0 erros

- [ ] **Step 4: Commit**

```bash
git add -A src/
git commit -m "Remove pesos tipograficos grossos (maximo 500)"
```

### Task 4: Emojis fixos → ícones + créditos Flaticon

**Files:**
- Modify: `src/pages/index.astro:81` (👀 → `<i class="fi-br-eye" aria-hidden="true"></i>`), `:101` (🍔 → `fi-br-burger-alt`), rodapé `:170-172` (acrescentar crédito)
- Modify: `src/pages/admin/criar-conta.astro:24` (🔐 → `fi-br-lock`)
- Modify: `src/pages/admin/login.astro:40` (⚙️ → `fi-br-settings`)
- Modify: `src/pages/admin/produtos/index.astro:94` (🖼 → `fi-br-images`)
- Modify: `src/components/ProductForm.astro:115` (👁 → `<i class="fi-br-eye"></i>`), `:197-199` (função `emoji()` passa a devolver classe: `'fi-br-film'` / `'fi-br-images'`; chamadas em `${emoji(...)}` viram `<i class="${emoji(...)}" aria-hidden="true"></i>`)
- Modify: `src/layouts/AdminLayout.astro` (crédito após `</main>`)
- Modify: estilos dos arquivos acima para dimensionar ícones (`font-size`/`vertical-align`; herdam `color: currentColor`)

**Interfaces:**
- Consumes: CSS `.fi-br-*` do Task 2.

- [ ] **Step 1: Trocar os emojis pela classe ícone correspondente**

Mapeamento: 👀→`fi-br-eye`, 🍔→`fi-br-burger-alt`, 🔐→`fi-br-lock`, ⚙️→`fi-br-settings`, 🖼→`fi-br-images`, 🎬→`fi-br-film`. Em `ProductForm.astro`, `emoji()` vira `iconeClasse(tipo: string): string` (devolve a classe; ajustar os 2 usos no innerHTML).

- [ ] **Step 2: Créditos Flaticon**

Rodapé público (`index.astro`): `<p>Ícones por <a href="https://www.flaticon.com/br/" ...>Flaticon</a></p>`. Painel (`AdminLayout`, após `</main>`): mesma linha, estilo discreto.

- [ ] **Step 3: Verificar**

Run: `npm run lint && npm run check && npm run build`
Expected: 0 erros

- [ ] **Step 4: Commit**

```bash
git add -A src/
git commit -m "Troca emojis fixos por icones Uicons e adiciona credito Flaticon"
```

### Task 5: Categorias por seletor de ícone (admin + render)

**Files:**
- Modify: `src/pages/admin/categorias.astro:58-70` (input → `<select>`), `:102` (miniatura usa `resolverIcone`), `:127-140` (script: trocar `limitarEmojis` por preview do ícone escolhido), estilos do campo
- Modify: `src/pages/admin/api/categorias/salvar.ts:9,41` (trocar `limitarEmojis` por `normalizarIcone`)
- Modify: `src/pages/index.astro` (frontmatter: `categorias.map` gera `vis: resolverIcone(c.icone)`; chip da nav `:89-94` e título da seção `:147` renderizam `<i class={vis.classe}>` ou `<span>{vis.texto}</span>`)
- Modify: `src/pages/admin/index.astro:100` (miniatura: `resolverIcone`; sem ícone → `fi-br-folder`)

**Interfaces:**
- Consumes: `ICONES_CATEGORIA`, `resolverIcone`, `normalizarIcone`, `IconeCategoria` (Task 1).

- [ ] **Step 1: Trocar o input por select em `categorias.astro`**

Opções: `<option value="">Sem ícone</option>` + `ICONES_CATEGORIA.map(...)` com miniatura `<i>` no label (usar `<optgroup label="Ícones">`) +, se `alvo?.icone` existir e não estiver na lista, `<option value={alvo.icone}>Atual: {alvo.icone}</option>`. Remover `maxlength`/`placeholder`/script de `limitarEmojis`; script passa a atualizar o preview `<i>` ao trocar a opção.

- [ ] **Step 2: API salva nome de ícone**

`salarvar.ts`: `const icone = normalizarIcone(String(form.get('icone') ?? '').trim());`

- [ ] **Step 3: Renderização público/admin via `resolverIcone`**

Padrão: `const vis = resolverIcone(c.icone);` → `vis?.classe ? <i class={vis.classe} aria-hidden="true"></i> : vis?.texto ? <span aria-hidden="true">{vis.texto}</span> : null`; em `admin/index.astro` e `categorias.astro`, `null` → `<i class="fi-br-folder" aria-hidden="true"></i>`. Ajustar CSS (tamanho do `<i>` na miniatura 52px e nos chips).

- [ ] **Step 4: Verificar**

Run: `npm run lint && npm run check && npm run test`
Expected: 0 erros; testes do Task 1 continuam verdes

- [ ] **Step 5: Commit**

```bash
git add -A src/
git commit -m "Categorias passam a escolher icone por lista com preview"
```

### Task 6: Lightbox estilo Instagram (`Gallery.astro`)

**Files:**
- Modify: `src/components/Gallery.astro` (markup `:28-53`, estilos `:58-222`, script `:224-363`)

- [ ] **Step 1: Markup**

Remover `.lb-fechar`, `.lb-antes`, `.lb-prox`, `.lb-contador`. Adicionar `<button class="lb-voltar" type="button" aria-label="Voltar">←</button>` (topo à esquerda) e `<div class="lb-dots" id="lb-dots" role="tablist" aria-label="Navegação da galeria"></div>` entre stage e barra. Barra inferior mantém nome + Comprar.

- [ ] **Step 2: Estilos**

`.lb-track` mantém `display:flex; overflow-x:auto; scroll-snap`; slides passam a `flex: 0 0 auto; height: 100%; aspect-ratio: 1; width: auto; max-width: 100%; margin: auto;` (quadrado definido pela altura do stage, centralizado; `max-width` evita estouro em telas largas). `.lb-slide img { width: 100%; height: 100%; object-fit: cover; }`; `.lb-slide video { width: 100%; height: 100%; object-fit: contain; background: #000; }`. `.lb-dots`: flex centralizada abaixo do stage, bolinhas 7px (`border-radius: 50%`, `rgba(255,255,255,.4)`), ativa alongada 18px sólida via classe `.ativo`; `[hidden]` quando ≤1 item. `.lb-voltar`: topo à esquerda, mesmo estilo do fundo das bolinhas.

- [ ] **Step 3: Script**

`montar()`: cria uma bolinha por item (`button.lb-dot`, `aria-label=Ir para item N+1`), clique leva ao slide (`scrollTo`), esconde dots se `total <= 1`. Handler de scroll existente passa a atualizar também a bolinha ativa (`dots[atual]?.classList.add('ativo')` + `aria-current`). `btnVoltar` chama `fechar()`. Remover referências aos botões excluídos; manter `pararVideos`, teclado, clique no fundo, swipe.

- [ ] **Step 4: Verificar**

Run: `npm run lint && npm run check && npm run build`
Expected: 0 erros (conferir no build que o JSON injetado continua escapado — linha do `set:html` intocada)

- [ ] **Step 5: Commit**

```bash
git add src/components/Gallery.astro
git commit -m "Lightbox em formato quadrado com bolinhas e seta de voltar (estilo Instagram)"
```

### Task 7: Docs + verificação final

**Files:**
- Modify: `docs/design.md` (token `--fonte`/Fredoka na tabela; regra de ícones Uicons + fallback + crédito; lightbox quadrado/dots/seta)

- [ ] **Step 1: Atualizar `docs/design.md`**

Linha de tipografia da tabela: `--fonte` (Fredoka 300–500, auto-hospedada). Nova seção curta "Ícones": Uicons Flaticon `fi-br-*`, `src/lib/icone.ts` decide classe vs. texto legado, crédito no rodapé. Seção "Lightbox": quadrado 1:1, cover p/ foto, contain p/ vídeo, bolinhas, `←`.

- [ ] **Step 2: Verificação completa**

Run: `npm run verify`
Expected: exit 0 (lint + typed + check + test + build)

- [ ] **Step 3: Commit**

```bash
git add docs/design.md
git commit -m "Documenta tipografia da marca, icones e lightbox em docs/design.md"
```

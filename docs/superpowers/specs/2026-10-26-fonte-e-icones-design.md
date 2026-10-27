# Design: fonte da marca e ícones Flaticon (cardápio + painel)

Data: 2026-10-26 · Status: aguardando aprovação

## Intenção

O cardápio e o painel hoje usam `system-ui` com pesos até 800 e emojis como ícone. A marca
Dona Dôra tem uma tipografia própria (logo "D'DORA", traço arredondado). O pedido: usar a
fonte da logo em tudo via token único, sem pesos grossos, e trocar os emojis por ícones
gratuitos do Flaticon (crédito autorizado pelo usuário).

## Metas

- Um token `--fonte` em `src/styles/global.css` governa cardápio e painel.
- Pesos tipográficos limitados a 300/400/500 (remover 600/700/800); hierarquia por tamanho
  e cor, não por grossura.
- Todo emoji de vira ícone Uicons (Flaticon); o campo de ícone de categoria vira seleção
  de lista com preview no admin.
- Dados já gravados (emoji antigo em categorias) continuam renderizando — nada quebra.
- Crédito "Ícones por Flaticon" no rodapé do cardápio e do painel (licença free).

## Não metas

- Sem mudança de cores, layout ou estrutura de páginas.
- `✕`/`✓` (símbolos de texto, não emoji) permanecem como estão.
- Sem upload de ícone por categoria (opção C descartada pelo custo).

## Lightbox (adição do usuário, mesmo escopo de aprovação)

Hoje o `Gallery.astro` mostra mídia em tamanho natural (aspect variável), setas laterais
`◀ ▶`, contador texto "1 / 5" e botão `✕`. Fica estilo Instagram:

- **Todas as mídias no mesmo quadro quadrado 1:1** (`aspect-ratio: 1`, largura cheia,
  centralizado) — mesmo tamanho para toda imagem, como o feed do Instagram.
- **Fotos em `object-fit: cover`** (corte tipo Instagram); **vídeo mantém `contain`**
  dentro do quadro quadrado (letterbox preto, sem cortar o vídeo).
- **Bolinhas de navegação embaixo** do quadrado: uma por item, a ativa destacada, com
  clique/tap que leva ao item — substituem o texto "1 / 5".
- **Seta simples de voltar (`←`) no topo à esquerda**, no lugar do `✕` — fecha como no
  Instagram. As setas laterais `◀ ▶` saem; navegação por swipe, bolinhas e teclado
  (setas do teclado continuam).
- Barra inferior (nome + botão Comprar) permanece; vídeo continua com `preload="none"` +
  poster, pausando ao trocar de item.
- Só CSS/JS dentro do próprio `Gallery.astro` — sem dependência nova.

## Restrições

- Licença Flaticon free exige atribuição visível.
- Sem requisições externas em runtime: tudo via npm, build offline (CSP-friendly).
- Um escritor por arquivo; seguir convenções do repo (pt-BR, tokens no `global.css`).

## Abordagens (resumo)

- **A (escolhida):** Uicons via npm `@flaticon/flaticon-uicons` (fonte de ícones, estilo
  rounded que combina com a logo) + categorias por lista de nomes.
- B (só emojis fixos): descartada — deixaria emojis na navegação pública (mistura).
- C (upload por categoria): descartada — novo fluxo de upload, muito mais trabalho.

## Como fica

- **Dependências:** `@fontsource/fredoka` (fonte auto-hospedada, pesos 300/400/500) e
  `@flaticon/flaticon-uicons` (CSS rounded; nomes verificados: `pizza-slice`, `burger-alt`,
  `eye`, `lock`, `settings`, `folder`, `images`, `film`, `trash` etc.).
- **Tipografia:** `--fonte: 'Fredoka', system-ui, sans-serif` em `global.css`; imports do
  Fontsource nos dois layouts (`BaseLayout`, `AdminLayout`); `body` e `.admin-body` usam o
  token; `font-weight` 600+ reduzidos para 500.
- **Ícones fixos:** 👀/👁 → `fi-br-eye`; 🍔 → `fi-br-burger-alt`; 🔐 → `fi-br-lock`;
  ⚙️ → `fi-br-settings`; 📁 → `fi-br-folder`; 🖼 → `fi-br-images`; 🎬 → `fi-br-film`.
- **Categorias:** admin passa a escolher de lista curada (~12 ícones) com miniatura;
  valor guardado = nome do ícone. Se o valor atual não for da lista (emoji antigo),
  aparece como opção extra "atual" e é preservado no save.
- **Renderização:** helper puro em `src/lib/icone.ts` (`resolverIcone(valor)` → classe
  `fi-br-*` ou texto), usado no cardápio e nas listas do painel; emoji antigo cai no
  texto. Teste unitário (lógica pura).
- **Crédito:** linha "Ícones por Flaticon" (link) no rodapé de `BaseLayout` e
  `AdminLayout`.
- **Docs:** `docs/design.md` atualizado (token de tipografia, regra de ícones, crédito).

## O que fica para a execução

Mapeamento exato dos emojis fixos, lista curada final de categorias (só nomes já
verificados no pacote), testes/lint/build, atualização de `docs/design.md`.

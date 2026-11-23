---
name: MyShelf
description: Plataforma de vitrine online — cardápio digital para restaurantes e pequenos negócios — construída em Astro SSR sobre Cloudflare Workers.
colors:
  green-primary: "#14532d"
  green-deep: "#0f3d21"
  orange-brand: "#f97316"
  orange-deep: "#ea580c"
  cta-deep: "#c2410c"
  cta-deep-hover: "#9a3412"
  myshelf-yellow: "#f9df8e"
  myshelf-yellow-hover: "#f5d367"
  myshelf-brown: "#39282c"
  myshelf-blue: "#9cb7d3"
  myshelf-blue-deep: "#88a7c1"
  neutral-bg: "#f9f9f9"
  neutral-card: "#ffffff"
  neutral-elev: "#f3f4f6"
  neutral-text: "#1f2937"
  neutral-text-dim: "#6b7280"
  neutral-border: "#e5e7eb"
  dark-bg: "#141a15"
  dark-card: "#1e2620"
  dark-elev: "#26302a"
  dark-text: "#f2f4ef"
  dark-text-dim: "#b5bdaa"
  dark-border: "#2e3833"
  adm-bg: "#f5f6f8"
  adm-card: "#ffffff"
  adm-elev: "#f9fafb"
  adm-text: "#111827"
  adm-dim: "#6b7280"
  adm-label: "#374151"
  adm-border: "#e5e7eb"
  adm-input-border: "#d1d5db"
  ok-bg: "#f0fdf4"
  ok-text: "#15803d"
  ok-border: "#bbf7d0"
  status-ativo-bg: "#ecf5ee"
  status-ativo-text: "#15803d"
  status-inativo-bg: "#fbeaea"
  role-loja-bg: "#e4ebf2"
  role-loja-text: "#4a6a82"
  page-warm: "#f5efe4"
  erro-bg: "#fef2f2"
  erro-text: "#b91c1c"
  erro-border: "#fecaca"
typography:
  display:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "clamp(42px, 5vw, 64px)"
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: "-0.03em"
  auth-display:
    fontFamily: "'Newsreader', Georgia, 'Times New Roman', serif"
    fontSize: "clamp(46px, 5.4vw, 70px)"
    fontWeight: 500
    lineHeight: 1.03
    letterSpacing: "-0.025em"
  auth-ui:
    fontFamily: "'Inter', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  headline:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 500
    lineHeight: 1.15
  body:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Fredoka, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.02em"
rounded:
  xs: "9px"
  sm: "10px"
  md: "14px"
  pill: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.myshelf-yellow}"
    textColor: "{colors.myshelf-brown}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  button-primary-hover:
    backgroundColor: "{colors.myshelf-yellow-hover}"
  button-local:
    backgroundColor: "{colors.myshelf-blue}"
    textColor: "{colors.myshelf-brown}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  card:
    backgroundColor: "{colors.neutral-card}"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: MyShelf

## Overview

**Creative North Star: "A Vitrine Bem-Arrumada"**

MyShelf é uma vitrine digital para pequenos negócios. A personalidade central é a de uma vitrine física bem cuidada: cada item exposto com intenção, sem poluição visual, para que o cliente decida rápido. Não há excesso — há estrutura.

A estética é **direta e funcional**. Tipografia Fredoka com peso médio, fundos claríssimos, cores de marca contidas. A densidade é média — nem confortável demais (que induz pressa) nem apertada demais (que repele). Ar livre, grid simples, focadas.

Os consumidores vestem dois papéis distintos: visitantes (quem vê o cardápio) e gestores (quem cuida dele). As duas superfícies compartilham a mesma linguagem — mesma família tipográfica, mesmo gesto amarelo MyShelf nos CTAs — mas têm pesos distintos: o cardápio público usa valor de destaque para venda imediata; o painel administrativo privilegia clareza e fluxo de trabalho.

**Key Characteristics:**
- Fundo neutro quase branco (#f9f9f9) como padrão, com overlay suave onde há transparência.
- Destaque amarelo MyShelf (#f9df8e) reservado a *uma única acao primária* por tela. Sua raridade é a função dele.
- Verde profundo (#14532d) marca título e identidade loja; amarelo aparece nos CTAs e preços.
- Sombras sob demanda: superfícies são planas por padrão; sombras só aparecem como resposta a estado (hover, foco ativo, diálogo aberto).
- Cor MyShelf #9cb7d3 (azul muted) apoia CTAs secundários e estados informativos; não compete com o Amarelo.
- Ausência total de gradientes, neon, glassmorphism, ou “AI gradients” em qualquer ponto do sistema.

## Colors

A paleta é pequena: **verde loja, amarelo MyShelf, neutro de papel** e um **azul de apoio**.

### Primary
- **Verde Loja** (#14532d): Marca da loja pessoal (Dona Dôra). Usado no título do cardápio público, categorias, bordas ativas, ícones de cadastro e identidade visual da vitrine. É a cor mais "loja" do sistema.
- **Verde Escuro** (#0f3d21): Suporte ao Verde Loja para estados densos (hover, fundos escuros). Raramente usado isolado.

### Tertiary
- **Amarelo MyShelf** (#f9df8e): Destaque essencial do sistema. Usado em CTAs primários (CTAs de compra), preços, título da vitrine no modo escuro. Soberano.
- **Amarelo MyShelf Hover** (#f5d367): Variação hover do destaque; estável na transição, sem flash.
- **CTA Deep Vermelho-Terra** (#c2410c): Laranja queimado usado para CTAs no modo claro (legacy). Mantido por compatibilidade; será eliminado nos próximos redesigns.
- **CTA Deep Hover** (#9a3412): Hover do CTA vermelho-terra.

### Secondary
- **Azul MyShelf** (#9cb7d3): Destaque secundário. Usado em CTAs de segundo plano (Comer no local) e em ícones/estados informativos. Em fundos escuros ajuda a separar o primário do secundário sem introduzir hierarquia competitiva.
- **Azul Profundo** (#88a7c1): Hover do Azul MyShelf (#9cb7d3).

### Neutral
- **Fundo Papel** (#f9f9f9): Superfície clara padrão do cardápio público. Papel quase branco, levemente quente.
- **Cartão Branco** (#ffffff): Fundo de cards de produto, diálogos.
- **Elevacao Papel** (#f3f4f6): Camada acima do fundo — header, dividers dinâmicos, inputs em repouso.
- **Texto Principal** (#1f2937): Texto corpo no modo claro.
- **Texto Dim** (#6b7280): Texto secundário, metadata, timestamps.
- **Borda** (#e5e7eb): Borda sutil entre seções e cards.

### Admin Panel Neutral
- **Fundo Painel** (#f5f6f8): Superfície do painel de gestão.
- **Cartão Painel** (#ffffff): Cards e formulários do painel.
- **Texto Painel** (#111827): Texto corpo do painel.
- **Input Border Painel** (#d1d5db): Borda de campos de formulário.

### Papéis e status (painel)
- **Papel Loja — fundo** (#e4ebf2) / **texto** (#4a6a82): badge "Loja" na tabela de usuários.
- **Papel Master — fundo** (#f9df8e) / **texto** (#39282c): badge "Master"; usa o Amarelo MyShelf.
- **Status ativo** (#ecf5ee / #15803d) e **status inativo** (#fbeaea / #b91c1c): pills de situação do usuário.

### Login (superfície de autenticação)
- **Fundo quente** (#f5efe4): papel creme do painel direito do login.
- **Marrom MyShelf** (#39282c): painel esquerdo do login, texto e foco.
- **Amarelo MyShelf** (#f9df8e): único CTA de entrada; hover #f5d367.

### Modo escuro (público e painel)
- **Fundo Quente** (#141a15): Fundo escuro principal do cardápio e painel.
- **Cartão Quente** (#1e2620): Fundo de cards sobre fundo quente.
- **Elevação Quente** (#26302a): Camada acima do fundo escuro.
- **Texto Clara** (#f2f4ef): Texto principal em fundo escuro.
- **Texto Dim Claro** (#b5bdaa): Texto secundário em escuro.
- **Amarelo MyShelf** (#f9df8e): CTAs e preços no escuro (também cor-texto do `.art-badge`).
- **Azul MyShelf** (#9cb7d3): Secundário no escuro.

### Named Rules
**The One Voice Rule.** O Amarelo MyShelf (#f9df8e) é usado uma única vez por tela, em um único botão de ação primária. Sua raridade é a sua função: quando aparece, é porque a ação importa.

## Typography

**Display Font:** Fredoka (with fallback to system-ui, sans-serif)
**Body Font:** Fredoka (with fallback to system-ui, sans-serif)
**Label Font:** Fredoka (with fallback to system-ui, sans-serif)

**Character:** Fredoka é uma fonte humanista arredondada, com personalidade amigável, mas estruturada o suficiente para funcionar como UI densa. O 500 medium domina os títulos; o 400 regular cumpre o corpo. Nenhum peso 700+ existe no sistema — evita-se o falso negrito.

### Hierarchy
- **Display** (500, clamp(42px, 5vw, 64px), 1.0, -0.03em): Hero de páginas públicas.
- **Auth Display** (Newsreader 500, clamp(46px, 5.4vw, 70px), 1.03, -0.025em): headline do login e wordmark MyShelf.
- **Auth UI** (Inter 400/500, 13–15.5px, 1.55): corpo, labels e links do login.
- **Headline** (500, 1.5rem, 1.15, -0.02em): H1 do painel e cardápio; títulos de seções.
- **Title** (500, 1.05rem, 1.15): H2 do painel, títulos de cards.
- **Body** (400, 1rem, 1.55): Parágrafos, descrições de produto, textos de diálogo.
- **Label** (500, 0.8rem, 1.25, 0.02em): Labels de campo, chips, badges, botões em minúsculas.

### Superfície de autenticação
O login é a única superfície com par tipográfico próprio: **Newsreader** (serifada, display) para a headline e o wordmark, e **Inter** (sans) para corpo, labels, alertas e botões. A exceção existe para dar ao login um tom editorial; qualquer outra tela usa Fredoka. Inter 600 é permitido apenas aqui (badge e CTA).

### Named Rules
**The No-Bold Rule.** Nunca use `font-weight: 700`. O sistema carrega 400 e 500 (Inter 600 só no login). Qualquer peso maior gera faux bold — descontinuado em todo o sistema.

## Layout

O layout de cardápio público é de página única com seções verticais. Container central `--max: 640px`, padding lateral `--pad: 16px`. O sistema de grid é implícito: uma coluna, com cards lado a lado de 2 ou 3 colunas em breakpoints maiores.

O painel administrativo é largura total (max 1000px), com `.barra-acoes` no topo, `.grade-stats` em `grid-template-columns: repeat(4, 1fr)` em desktop, 2 colunas em mobile. Formulários fixos com inputs `width: 100%`.

Responsivo principal: 1 coluna (< 640px), 2-4 colunas (>= 560px e 900px), sempre com `prefers-reduced-motion` respeitado.

## Elevation & Depth

Sombras **sob demanda**. O sistema é flat por padrão (superfícies sem sombra); sombras aparecem apenas em dois estados:

- **Hover/Active em elementos interativos** (`.shadow` / `--shadow-hover: 0 12px 28px rgba(0,0,0,0.14)`). Única razão tonal reservada para hover, para destacar interatividade.
- **Superfícies sobre outras superfícies** (diálogos, modais, avisos): `0 4px 14px rgba(0,0,0,0.22)` para separar o diálogo do fundo.

### Shadow Vocabulary
- **shadow-hover** (`0 12px 28px rgba(0,0,0,0.14)`): CTAs públicos e cards de produto no hover.
- **shadow-base** (`0 4px 14px rgba(0,0,0,0.08)`): Sombra ambiente em condição normal de elementos destacados (botões, crachás).
- **shadow-dialog** (`0 10px 28px rgba(0,0,0,0.22)`): Diálogos, lightboxes, menus.

### Named Rules
**The Flat-By-Default Rule.** Superfícies são planas em repouso. Sombras só aparecem como resposta a estado — hover, foco ativo, ou quando um elemento flutua sobre outro.

## Shapes

Formas arredondadas e suaves. Raios consistentes em 4 valores:

- **--radius-xs: 9px**: inputs, botões do painel e do login, chips pequenos.
- **--radius-sm: 10px**: botões públicos, cards de produto, badges.
- **--radius: 14px (--radius-md)**: cards, telas, containers grandes.
- **50% / 999px**: avatares circulares, badges de status, pills.

Não há cantos retos em nenhum elemento — nada é `radius: 0`. Bordas sutis (`1px solid`) em torno de cards e inputs; nunca bordas duplas ou divisores acima de 1px.

## Components

### Buttons
- **Shape:** `border-radius: 10px (--radius-sm)`; peso 500, caixa com `padding: 11px 18px` e fonte 0.9rem.
- **Primary:** Amarelo MyShelf (#f9df8e), texto marrom MyShelf (#39282c), `box-shadow: 0 4px 14px rgba(57, 40, 44, 0.22)`. Hover: `#f5d367` + `transform: translateY(-2px)` + sombra maior (0 8px 20px). Active: `transform: scale(0.96)`. Disabled: fundo cinza + texto dim, sem sombra.
- **Local (secundário):** Azul MyShelf (#9cb7d3), texto marrom (#39282c), mesma métrica. Hover: #88a7c1 + y-translate + sombra.
- **Danger:** Fundo erro bg (#fef2f2 / #2a1616 para escuro), texto erro (#b91c1c), borda erro (#fecaca / #8a3030).
- **Disabled:** Sempre cinza de elevação (--bg-elev), texto --text-dim, sem sombra.

### Chips
- **Status:** Ativo: fundo verde suave (#ecf5ee) + texto verde (#15803d). Inativo: fundo vermelho suave (#fbeaea) + texto vermelho (#b91c1c). `padding: 3px 9px; border-radius: 999px`.

### Cards / Containers
- **Corner Style:** `border-radius: 14px (--radius)`.
- **Background:** Branco #ffffff (claro) / #1e2620 (escuro) sobre fundo neutro #f9f9f9 / #141a15.
- **Shadow Strategy:** plana em repouso; sombra em hover.
- **Border:** `1px solid #e5e7eb` em claro; `1px solid #2e3833` em escuro.
- **Internal Padding:** `12px` (cards de produto), `18px` (cartões do painel).

### Inputs / Fields
- **Style:** Fundo branco, borda `1px solid #d1d5db` (ou `#3c4a3f` em escuro), `border-radius: 9px`.
- **Focus:** `outline: 2px solid var(--cor-preco)` (ou #f9df8e no escuro), `outline-offset: 1px`. Nunca border-color.
- **Disabled:** Fundo cinza de elevação, texto dim.

### Navigation
- **Style:** Header fixo/sticky, background verde loja (#14532d), texto creme, borda inferior laranja (#f97316) no claro. Em escuro: background marrom MyShelf (#39282c), borda inferior amarelo MyShelf (#f9df8e), texto azul claro (#9cb7d3), ativo com fundo amarelo + texto marrom.
- **Active:** Texto em destaque + borda inferior da cor da marca girada para cima (border-bottom).
- **Missão (default):** Painel lojista mostra nome + logo da loja. Painel master mostra logo MyShelf.
- **Mobile:** Wrapping com `flex-wrap: wrap`, nunca corte — navbar cresce se preciso (sem overflow hidden).

### Recommendations
- Existe um sistema de **i18n próprio** no `src/lib/idioma.ts` com produção PT + fallback EN. Não use strings/tradução fora dele.
- Todas as propostas novas devem usar `data-i18n` ou a chave correspondente se reusável.

## Do's and Don'ts

### Do:
- **Do** use o Amarelo MyShelf (#f9df8e) em **apenas um botão de ação primária** por tela.
- **Do** use Verde Loja (#14532d) para título de vitrine, ícones de cadastro e identidade.
- **Do** mantenha o sistema **flat por padrão**; sombra só em hover/foco/dialog.
- **Do** use Fredoka em **peso 400 ou 500**; nada maior que 500.
- **Do** mantenha os raios em 9px (--radius-xs), 10px (--radius-sm), 14px (--radius) e 999px (badges).
- **Do** use tons de fundo neutro e papel claro (`#f9f9f9` no claro; `#141a15` no escuro); nunca cores saturadas como fundo.
- **Do** use `--cor-preco` (amarelo no escuro) nas cifras de produtos.
- **Do** mantenha o corpo de texto em tamanho 1rem (16px) e line-height 1.55.

### Don't:
- **Don't** gradientes, neon, glassmorphism, gota de sangue, sombras dramáticas, tint transparente, ou "AI gradients" em nenhum ponto do sistema.
- **Don't** use o Amarelo MyShelf em dois elementos na mesma tela para não perder o significado.
- **Don't** use `font-weight: 700` ou maior; 600 só no login.
- **Don't** use `border-radius: 0` (cantos retos). Sempre arredondamento.
- **Don't** use tons saturados ou híper-verde como fundo de card (quebra a regra de papel sob sombra).
- **Don't** use sombras no estado de repouso — o sistema é flat por padrão.
- **Don't** criar novas paletas para o sistema sem revisar este `DESIGN.md`.

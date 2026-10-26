# Design e acessibilidade

## Direção

Público: cliente final no **celular**, em **pt-BR**. Tom visual: **tema claro da Dona Dôra**,
alinhado à landing `ddora.net.br` (decisão já implementada — commit `8bfe5be`). Nada abaixo é
direção futura: tudo o que se descreve existe no código.

## Sistema existente

Fonte única de tokens: [`src/styles/global.css`](../src/styles/global.css).

| Token | Valor | Uso |
|---|---|---|
| `--verde` / `--verde-escuro` | `#14532d` / `#0f3d21` | marca |
| `--laranja` / `--laranja-escuro` | `#f97316` / `#ea580c` | acento (`--accent`) |
| `--bg` / `--bg-card` / `--bg-elev` | `#f9f9f9` / `#ffffff` / `#f3f4f6` | superfícies |
| `--text` / `--text-dim` | `#1f2937` / `#6b7280` | texto |
| `--radius` / `--radius-sm` | 14px / 10px | cantos |
| `--max` / `--pad` | 640px / 16px | leitura mobile (`container`) |
| `--shadow` / `--shadow-hover` | sombras suaves | cards |
| `--fonte` | `'Fredoka', system-ui, sans-serif` | tipografia de todo o site (`line-height: 1.5`); pesos **300–500 apenas** (sem negrito); Fredoka auto-hospedada via `@fontsource/fredoka` (300/400/500) — é a fonte mais próxima do traço arredondado da logo |

Componentes: `ProductCard` (card do produto), `Gallery` (lightbox quadrado 1:1 estilo
Instagram — bolinhas de navegação, seta `←`, swipe, vídeo sob demanda), `ProductForm`
(formulário + galeria/upload), `BaseLayout` (cardápio), `AdminLayout` (painel). Não há
biblioteca de UI (Tailwind/shadcn não adotados) — CSS próprio com classes globais.

## Ícones

Ícones são **Uicons do Flaticon** (`@flaticon/flaticon-uicons`, estilo bold rounded
`fi-br-*`), auto-hospedados via npm. Crédito obrigatório no rodapé do cardápio e do
painel: "Ícones por Flaticon" (licença free exige atribuição).

O valor do campo `icone` de categoria é um **nome da lista curada**
(`ICONES_CATEGORIA` em `src/lib/icone.ts`, verificado no pacote). O helper puro
`resolverIcone(valor)` decide a exibição: nome da lista vira classe `fi-br-*`; valor
antigo (emoji gravado no D1) vira texto — dado legado nunca quebra. No painel, o campo
é um select com preview; a API salva com `normalizarIcone` (nome passa intacto; senão
aplica o corte legado de emojis). Testes: `src/lib/icone.test.ts`.

## Interação

Critérios em uso no código: HTML semântico, utilitário `.sr-only` (`global.css`), controles
de formulário com elementos reais (`button`, inputs com rótulos), botões com `cursor: pointer`,
`img/video` com `max-width: 100%`. Ainda **não validado formalmente**: navegação por
teclado, indicador de foco visível, contraste medido e `prefers-reduced-motion` — revisão
de acessibilidade registrada como pendente em `docs/setup.md` (skills
`web-design-guidelines` disponíveis para a revisão).

## Layout e estados

Mobile-first, coluna única limitada a `--max: 640px` com `container`; o painel usa o mesmo
token de largura. O lightbox do `Gallery` mostra toda mídia num quadrado 1:1 do menor
lado do palco (fotos com corte `cover`, vídeo contido), bolinhas de navegação embaixo
(escondidas com ≤1 item) e seta `←` que fecha. Estados que existem no código: cardápio
vazio (mensagem em `index.astro`),
carregando/progresso no `ProductForm` durante upload, erros de validação exibidos junto aos
campos, bloqueio de login após 5 tentativas. Estados **não** implementados/verificados:
vazios elaborados, offline, imagens quebradas.

## Manutenção

Mudanças visuais atualizam o token/componente de origem **e** esta orientação quando uma
regra mudar. Consulte as skills de UI instaladas (`web-design-guidelines`) em revisões de
interface relevantes.

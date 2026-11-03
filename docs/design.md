# Design e acessibilidade

## Direção

Público: cliente final no **celular**. Tom visual: paleta da Dona Dôra, alinhada à landing
`ddora.net.br`, com **tema claro (padrão) e escuro** e interface em **pt-BR ou inglês**.
Nada abaixo é direção futura: tudo o que se descreve existe no código.

## Sistema existente

Fonte única de tokens: [`src/styles/global.css`](../src/styles/global.css).

| Token | Valor | Uso |
|---|---|---|
| `--verde` / `--verde-escuro` | `#14532d` / `#0f3d21` | marca |
| `--laranja` / `--laranja-escuro` | `#f97316` / `#ea580c` | acento decorativo (`--accent`) |
| `--laranja-aa` / `--laranja-aa-hover` | `#c2410c` / `#9a3412` | texto e fundo de CTA com contraste AA |
| `--cor-preco` / `--cor-titulo` | laranja escuro / verde | clareiam no tema escuro |
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

## Preferências do visitante

`Preferencias.astro` adiciona dois botões de 44px no cabeçalho do cardápio (Uicons
`fi-br-moon`/`fi-br-sun` e `fi-br-language`):

- **Tema:** `data-tema="claro|escuro"` em `<html>`, persistido em `localStorage` (`dd-tema`);
  sem escolha salva, segue `prefers-color-scheme`. O tema escuro sobrescreve os tokens em
  `:root[data-tema='escuro']` — o painel `/admin` não recebe o atributo.
- **Idioma:** `data-idioma="pt|en"` em `<html>` e `lang` correspondente; textos marcados com
  `data-i18n`/`data-i18n-aria`/`data-i18n-alt` são trocados por `src/lib/idioma.ts`
  (testes em `src/lib/idioma.test.ts`). Nomes, descrições e categorias vindos do D1 **não**
  são traduzidos.
- Um script inline no `BaseLayout` aplica tema e idioma antes da primeira pintura, evitando
  flash. As escolhas valem só no navegador do visitante; nada é gravado no banco.

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
`img/video` com `max-width: 100%`. Critique de 03/11/2026 medida no cardápio público:
contraste de preço/CTA em 5,18:1, alvos de toque principais em 44px, foco preso e devolvido
no lightbox e no diálogo de compra, Esc fecha ambos. `prefers-reduced-motion` segue não
tratado.

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

# Design e acessibilidade

## Direção

Público: cliente final no **celular**. Tom visual: paleta da Dona Dôra, alinhada à landing
`ddora.net.br`, com **tema claro (padrão) e escuro** e interface em **pt-BR ou inglês**.
Nada abaixo é direção futura: tudo o que se descreve existe no código.

## Sistema existente

Fonte única de tokens: [`src/styles/global.css`](../src/styles/global.css). Os tokens de
marca/acento são **sobrescritos por loja** no `<head>` (`src/lib/cores.ts` + `cssPaleta`),
com tons derivados para hover, CTA AA e título/preço no tema escuro; os valores abaixo são
o padrão da loja Dona Dôra.

| Token | Valor | Uso |
|---|---|---|
| `--verde` / `--verde-escuro` | `#14532d` / `#0f3d21` | marca (livre por loja) |
| `--laranja` / `--laranja-escuro` | `#f97316` / `#ea580c` | acento decorativo (livre por loja) |
| `--laranja-aa` / `--laranja-aa-hover` | `#c2410c` / `#9a3412` | CTA AA derivado da cor de destaque |
| `--cor-preco` / `--cor-titulo` | laranja escuro / verde | clareiam no tema escuro |
| `--bg` / `--bg-card` / `--bg-elev` | `#f9f9f9` / `#ffffff` / `#f3f4f6` | superfícies |
| `--text` / `--text-dim` | `#1f2937` / `#6b7280` | texto |
| `--radius` / `--radius-sm` | 14px / 10px | cantos |
| `--max` / `--pad` | 640px / 16px | leitura mobile (`container`); o cardápio amplia para 1024px em telas ≥900px |
| `--shadow` / `--shadow-hover` | sombras suaves | cards |
| `--fonte` | `'Fredoka', system-ui, sans-serif` | tipografia de todo o site (`line-height: 1.5`); pesos **300–500 apenas** (sem negrito); Fredoka auto-hospedada via `@fontsource/fredoka` (300/400/500) — é a fonte mais próxima do traço arredondado da logo |

Componentes: `Cardapio` (vitrine completa da loja, recebe dados prontos), `ProductCard`
(card do produto), `Gallery` (lightbox quadrado 1:1 estilo Instagram — bolinhas de
navegação, seta `←`, swipe, vídeo sob demanda), `ProductForm` (formulário + galeria/upload),
`BaseLayout` (cardápio), `AdminLayout` (painel com seletor de loja),
`ConsentimentoCookies` (banner), `RodapeLegal` (contato e links legais) e `LegalLayout`
(páginas de privacidade, termos, cookies, reembolso e exclusão). Não há biblioteca de UI
(Tailwind/shadcn não adotados) — CSS próprio com classes globais.

## Branding por loja

`/admin/loja` edita nome, slogan, descrição, logo, **duas cores livres** (marca e destaque),
tema padrão e idioma padrão. A logo vai para o KV (`lojas/<id>/logo-*`) e substitui a
anterior (a antiga é apagada). O cardápio usa a logo no cabeçalho e como favicon; sem logo,
cai na arte padrão da Dona Dôra. Nome/slogan aparecem no topo; descrição alimenta
`meta description` e Open Graph. A loja principal fica em `/`; as outras em `/loja/<slug>`.

## Preferências do visitante

`Preferencias.astro` adiciona dois botões compactos (44px, só o ícone, sem círculo) no
cabeçalho do cardápio e do painel: lua/brilho (Uicons `fi-br-moon` / `fi-br-brightness`) e
bandeira do Brasil/Estados Unidos (SVG inline, sem dependência).

- **Tema:** `data-tema="claro|escuro"` em `<html>`, persistido em `localStorage` (`dd-tema`);
  sem escolha salva, segue o padrão da loja (`data-tema-padrao`); no painel sem loja,
  segue `prefers-color-scheme`. O tema escuro sobrescreve os tokens em
  `:root[data-tema='escuro']`, incluindo os tokens `--adm-*` usados pelo painel `/admin`.
- **Idioma:** botão de bandeira abre uma lista (Português/English) e a bandeira passa a
  refletir a escolha. `data-idioma="pt|en"` em `<html>` e `lang` correspondente; sem escolha
  salva, vale o idioma padrão da loja (`data-idioma-padrao`); textos
  marcados com `data-i18n`/`data-i18n-aria`/`data-i18n-alt`/`data-i18n-ph` são trocados por
  `src/lib/idioma.ts` (testes em `src/lib/idioma.test.ts`), aplicados por
  `src/lib/idiomaCliente.ts`. O dicionário cobre cardápio, cabeçalho do painel, login,
  painel, listas, categorias e formulário de produto. Nomes e descrições de produtos vindos
  do D1 **não** são traduzidos. Categorias usam um mapa fixo por id
  (`CATEGORIAS_EN`/`CATEGORIAS_DESC_EN` em `src/lib/idioma.ts`); ids novos caem no texto em
  português até o mapa ser atualizado.
- `TemaInicial` aplica tema e idioma antes da primeira pintura, evitando flash. As escolhas
  valem só no navegador do visitante; o padrão de cada loja fica no D1.

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

Critérios em uso no código: HTML semântico, atalho “Pular para o conteúdo”, foco visível
global, utilitário `.sr-only` (`global.css`), controles de formulário com elementos reais
(`button`, inputs com rótulos), botões com `cursor: pointer`, `img/video` com
`max-width: 100%` e texto alternativo nas imagens de conteúdo. Critique de 03/11/2026 medida no cardápio público:
contraste de preço/CTA em 5,18:1, alvos de toque principais em 44px, foco preso e devolvido
no lightbox e no diálogo de compra, Esc fecha ambos. O banner de cookies vem logo após o
atalho de pular conteúdo; ao aceitar/rejeitar, o foco volta ao conteúdo ou ao botão que o
reabriu. `prefers-reduced-motion` reduz animações e transições.

## Layout e estados

Páginas legais usam o mesmo layout mobile-first, com título de seção, data/versão e links
legais no rodapé. O banner de cookies é fixo na parte inferior, com dois botões de 44px e peso visual
equivalente (aceitar não é induzido), e reabertura pelo rodapé.

Mobile-first, coluna única limitada a `--max: 640px` com `container`; o painel usa o mesmo
token de largura. No cardápio público, a partir de 900px o container vai a 1024px e cada
produto vira um card horizontal (imagem à esquerda, dados e CTA à direita). “Destaques” é
omitido quando todos os produtos já são destaque. O lightbox do `Gallery` mostra toda mídia num quadrado 1:1 do menor
lado do palco (fotos com corte `cover`, vídeo contido), bolinhas de navegação embaixo
(escondidas com ≤1 item) e seta `←` que fecha. Estados que existem no código: cardápio
vazio (mensagem em `index.astro`),
carregando/progresso no `ProductForm` durante upload, erros de validação exibidos junto aos
campos, bloqueio de login após 5 tentativas. A opção de retirada fica desabilitada quando o link de compra é inválido ou de exemplo;
produtos só de local não exigem link e produtos de ambos mantêm o totem. Antes de abrir
o app de pedidos, o diálogo confirma que o pagamento acontece fora do cardápio. Estados **não** implementados/verificados:
vazios elaborados, offline, imagens quebradas.

## Manutenção

Mudanças visuais atualizam o token/componente de origem **e** esta orientação quando uma
regra mudar. Consulte as skills de UI instaladas (`web-design-guidelines`) em revisões de
interface relevantes.

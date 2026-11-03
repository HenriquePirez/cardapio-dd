---
target: cardápio público
total_score: 20
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:/home/Henrique/projetos/cardapio-dd/src/pages/index.astro"
target_fingerprint: "sha256:85569f928b2e1d52e52b340363b07efc6071e054b746cf58207a61113b3733f4"
target_path: /home/Henrique/projetos/cardapio-dd/src/pages/index.astro
timestamp: 2026-11-03T13-05-52Z
slug: src-pages-index-astro
---
# Critique — cardápio público (`src/pages/index.astro`)

Method: dual-agent (A: design review · B: detector + browser)

## Design Health Score

| # | Heurística | Nota | Problema-chave |
|---|---|---:|---|
| 1 | Visibilidade do status | 2 | Sem categoria ativa; "Comprar" não avisa que sai do site; sem feedback de link quebrado. |
| 2 | Mundo real | 3 | pt-BR claro; "2 mídias" é jargão; "Ampliar" só no hover. |
| 3 | Controle e liberdade | 3 | Esc, voltar e retorno de foco bons; vista do totem não tinha como voltar. |
| 4 | Consistência | 3 | Componentes coerentes; affordance da galeria só em hover/focus. |
| 5 | Prevenção de erro | 2 | Chips de categorias sem produtos continuavam clicáveis; CTA não valida destino. |
| 6 | Reconhecer em vez de recordar | 3 | Sem marcador de seção atual. |
| 7 | Flexibilidade e eficiência | n/a | Superfície Persuade/Experience. |
| 8 | Estética e minimalismo | 3 | "Destaques" duplica produtos; desktop preso em 640 px; rodapé termina em crédito. |
| 9 | Recuperação de erro | 1 | Imagem do totem 404 é removida em silêncio; link externo sem fallback. |
| 10 | Ajuda e documentação | n/a | Não é superfície de documentação. |
| **Total** | | **20/32** | **Aceitável (62,5%)** |

## Design Specificity

Autoral na marca (verde/laranja, Fredoka, logo, "O sabor que começa pelos olhos", "Pizzas gigante/grande"), genérico na composição (header sticky, chips, carrossel de destaques, grade de cards, modal). A mesma estrutura serviria a hamburgueria ou açaí. No desktop, vira um celular de 640 px centralizado.

Detector: 1 achado `side-tab` em `src/components/ProductCard.astro:90` (faixa superior de 4 px via `::before`) — falso positivo parcial: a regra descreve borda lateral, o CSS é faixa superior.

Browser: 0 erros de console/rede na carga; overflow 0; `totem-local.jpg` 404 ao abrir a vista local; contraste reprovando em preço/CTA; alvos de toque de 36–43 px; lightbox e diálogo prendem e devolvem foco corretamente; Esc fecha ambos. Overlay do detector bloqueado por CSP (`script-src 'self' 'unsafe-inline'`), sem injeção.

## Forças

1. Identidade visual coerente e barata de manter.
2. Galeria acima da média: swipe com snap, dots, teclado, foco preso, `preload="none"` e poster para vídeo.
3. Separação correta entre vitrine e pedido; bottom sheet com botões grandes e copy direta.

## Problemas prioritários

- [P0] CTA principal abre destino externo quebrado (404), sem validação no painel nem fallback. Correção: validar `comprar_url` ao salvar e mostrar aviso quando indisponível.
- [P1] Chips de categorias sem produtos apontam para âncoras inexistentes. Correção: derivar chips das categorias com produtos.
- [P1] Contraste: preço e CTA em `#f97316` = 2,8:1. Correção: laranja `#c2410c` (5,18:1) para texto e fundo de CTA.
- [P1] Vista "Peça pelo totem" sem foto (404), sem localização e sem voltar. Correção: voltar para a pergunta, texto operacional e foto real.
- [P2] Mídia não entrega "fotos em alta qualidade": lightbox corta retratos em 1:1; desktop preso em 640 px; grade de 2 colunas deixa metade da linha vazia.

## Personas

- Casey (mobile): header + chips fixos ocupam 16% da tela; chips de 38 px; chips mortos; lightbox com foto pequena e barras pretas.
- Jordan (primeira vez): toca em "Pizzas" e nada acontece; "2 mídias"; nenhuma pista de que a foto abre galeria; sem endereço/horário.
- Sam (acessibilidade): contraste reprova; `alt="crostini-2"` descreve arquivo; foco de 1 px sobre foto; alvos de 36–42 px.

## Observações menores

- Logo de 48 px deixa o wordmark ilegível.
- "Ampliar" só existe em hover/focus; no toque não aparece.
- Carrossel de destaques sem setas nem paginação; no desktop cabe inteiro.
- Barra de categorias ficava 9 px sob o header.
- Rodapé sem endereço, horário, telefone ou status.
- Filtro de categorias vazias aplicado no corpo, mas não nos chips.

## Perguntas

- Por que a primeira foto não é a pizza assinatura?
- Onde o cliente vê a diferença entre "gigante" e "grande"?
- Qual frase de reassurance (endereço, horário, tempo de retirada) torna o "Comprar" seguro?
- O desktop precisa ser um celular de 640 px centralizado?

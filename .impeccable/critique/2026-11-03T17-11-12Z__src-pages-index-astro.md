---
target: cardápio público
total_score: 19
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 1
target_identity: "file:/home/Henrique/projetos/cardapio-dd/src/pages/index.astro"
target_fingerprint: "sha256:60f3b43f8a48bf93d41db16da5a0f2bc9effbdca32ac5b9163e452341dda6690"
target_path: /home/Henrique/projetos/cardapio-dd/src/pages/index.astro
timestamp: 2026-11-03T17-11-12Z
slug: src-pages-index-astro
---
# Critique — cardápio público (`src/pages/index.astro`)

Method: dual-agent (A: general · B: general)

## Design Health Score

| # | Heurística | Nota | Problema-chave |
|---|---|---:|---|
| 1 | Visibilidade do status | 3 | Modais e galeria dão feedback; saída para site externo é abrupta e não avisa nova aba; sem categoria ativa. |
| 2 | Mundo real | 2 | “Comprar” sugere checkout local, mas abre app externo/totem; “Painel” aparece no banner público. |
| 3 | Controle e liberdade | 3 | Esc, voltar e retorno de foco funcionam; banner não fecha e, ao aceitar, foco cai no `body`. |
| 4 | Consistência | 2 | PT/EN misturado: “Comprar” vira “Order”, descrições e textos legais ficam em português. |
| 5 | Prevenção de erro | 2 | Link do milkshake é placeholder; nenhuma confirmação antes de sair do cardápio. |
| 6 | Reconhecimento | 3 | Fotos, nomes e preços visíveis; preferências são ícones sem rótulo e “Ampliar” só aparece no hover/focus. |
| 7 | Flexibilidade e eficiência | n/a | Superfície de descoberta/decisão; não exige aceleradores. |
| 8 | Estética e minimalismo | 2 | Desktop usa 640 px de 1440; “Destaques” duplica todo o catálogo local. |
| 9 | Recuperação de erro | 2 | Totem 404 é removido em silêncio; link externo quebrado não tem fallback. |
| 10 | Ajuda e documentação | n/a | Não é superfície de documentação; links legais existem. |
| **Total** | | **19/32** | **Aceitável (59%)** |

## Design Specificity

**LLM:** 2/5 — autoral na pele, intercambiável no esqueleto. Verde/laranja, Fredoka, slogan e ícones dão pertencimento; header fixo, chips, carrossel de destaques, cards e CTA laranja serviriam a qualquer delivery. O conteúdo agrava: o logo renderizado é uma embalagem de suco Tial caju e o milkshake é um placeholder marrom com a palavra “Milkshake”. A promessa “o sabor começa pelos olhos” não se sustenta na primeira dobra.

**Deterministic scan:** exit code 2; 1 warning `side-tab` em `src/components/ProductCard.astro:94`. É provável falso positivo: a regra descreve borda lateral, mas o CSS é uma faixa superior de 4 px (`::before`, `top: 0`, `scaleX(0)` até hover/focus).

**Visual overlays:** bloqueado por CSP. O preflight de mutação passou, mas a injeção de `http://localhost:8400/detect.js` foi recusada por `script-src`; nenhuma mensagem `impeccable` apareceu. `live-server` foi parado com `--keep-inject`; o HTML não foi alterado. Portanto, não há overlay confiável nesta execução.

## Overall Impression

O cardápio é limpo e funcional no mobile, com boa galeria e um modelo de compra honesto. Mas a primeira impressão é sabotada por ativos errados, e a metade dos produtos locais leva a um destino placeholder. O maior ganho não é decorar mais: é consertar confiança e conclusão do pedido.

## What's Working

- **Anatomia do card**: foto, nome, descrição, preço e CTA seguem leitura natural; no mobile o botão fica na zona do polegar.
- **Compra honesta**: “Comer no local” explica o totem em vez de fingir checkout; “Retirada” assume o app externo.
- **Base acessível**: skip link funciona, foco visível, contraste principal entre 5,18:1 e 15:1, foco preso e devolvido em galeria/diálogo.

## Priority Issues

### [P0] CTA de compra leva a destino placeholder/quebrado

**What:** O milkshake aponta para `https://app.exemplo.com/comprar?...`, que redireciona para um site de terceiros. Um de dois produtos locais não conclui a compra.  
**Why it matters:** bloqueia a tarefa principal e destrói confiança.  
**Fix:** validar `comprar_url` ao salvar no painel, bloquear domínios placeholder, não renderizar CTA sem destino válido, mostrar fallback e avisar “Você será levado ao app de pedidos; o pagamento acontece lá” antes de abrir nova aba.  
**Suggested command:** `/impeccable harden` + `/impeccable clarify`.

### [P1] Ativos de marca e produto errados

**What:** O logo é uma embalagem de suco Tial caju; a mídia principal do milkshake é um placeholder de texto; `alt="crostini-2"` descreve o arquivo.  
**Why it matters:** a primeira dobra parece de outra marca e o produto parece inacabado.  
**Fix:** trocar `loja.logo_chave` e as mídias do milkshake por ativos reais; usar fallback neutro quando faltar foto; corrigir o alt para descrever o prato.  
**Suggested command:** correção de conteúdo no painel; depois `/impeccable polish`.

### [P2] Banner de cookies fora da ordem de foco e com copy interno

**What:** O banner é o último item do DOM; o teclado passa por ~20 controles antes dele. Ao aceitar/rejeitar, o foco cai no `body`. O texto diz “essenciais para o painel funcionar” para o visitante público. Comprar pela galeria mantém dois `aria-modal="true"` abertos (lightbox atrás do diálogo).  
**Why it matters:** desorienta teclado e leitor de tela; “painel” é jargão do admin.  
**Fix:** mover o banner para o início do fluxo de foco ou gerenciar foco explicitamente; devolver foco ao conteúdo após a escolha; trocar “painel” por “cardápio/site”; fechar o lightbox ou aplicar `inert` ao abrir o diálogo de compra.  
**Suggested command:** `/impeccable audit` + `/impeccable clarify`.

### [P2] Sticky quebra em 320 px

**What:** O header cresce para 96,8 px, mas `.atalhos` continua em `top: 77px`; ao rolar, a barra de categorias sobe ~20 px sobre o header.  
**Why it matters:** telas pequenas perdem navegação e veem o header quebrado.  
**Fix:** colocar header e chips no mesmo contêiner sticky ou calcular o offset pela altura real do header; testar 320, 360 e zoom de texto.  
**Suggested command:** `/impeccable adapt`.

### [P2] Desktop sem composição e hierarquia tipográfica rasa

**What:** Em 1440 px o conteúdo fica em 640 px; cada categoria com um produto ocupa metade da grade; H1/H2/H3 quase não se diferenciam; “Destaques” repete 100% do catálogo local.  
**Why it matters:** parece um mobile esticado; o olho não encontra foco.  
**Fix:** ampliar a largura útil, usar grade responsiva que preencha colunas, escalar títulos no desktop e ocultar “Destaques” quando ele duplicar o catálogo inteiro.  
**Suggested command:** `/impeccable layout`.

## Persona Red Flags

**Casey — mobile, uma mão, interrompida.** O banner ocupa 200–264 px e cobre o card; em 320 px os chips sobrepõem o header; links legais têm 14–18 px de altura. Casey erra o toque no rodapé ou desiste do banner.

**Jordan — primeira vez.** “Comprar” não avisa que o pedido será concluído fora do site; “Comer no local” manda ao totem sem endereço; “Painel” no banner não significa nada. Jordan hesita e pode escolher a modalidade errada.

**Sam — teclado e leitor de tela.** Contraste e foco passam, mas o banner é a 21ª parada de Tab; aceitar derruba o foco no `body`; o skip leva o foco para um elemento parcialmente sob o header sticky; comprar pela galeria mantém dois `aria-modal` abertos.

## Minor Observations

- `404` em `/totem-local.jpg`; a imagem é removida em silêncio e a vista local fica sem foto.
- `.card-zoom` “Ampliar” mede 4,29:1 (11,2 px), abaixo de 4,5; sobre foto clara cai para ~4,0.
- Alvos de toque: tema/idioma 32×32; fechar do diálogo 40×40; links legais 18 px.
- Sem estado ativo/`aria-current` na navegação por categoria.
- Idioma híbrido: interface traduz, mas descrições, banner e páginas legais ficam em português.
- Sem `prefers-reduced-motion`, endereço, horário ou área de entrega.
- Sem overflow horizontal em 320, 390 e 1440; links legais retornam 200; banner reabre e persiste a escolha.

## Questions to Consider

- Se o cardápio promete “o sabor começa pelos olhos”, por que a primeira imagem é um suco de caixinha e um placeholder?
- O que “Destaques” ensina quando exibe os mesmos produtos que aparecem logo abaixo?
- Quando “Retirada” abre outra aba, o visitante sabe que saiu do cardápio?
- A versão em inglês é um recurso real ou um toggle esquecido?

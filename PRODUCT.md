# Cardápio DD

> Documento de escopo. Atualize quando objetivo, restrições ou critérios de aceitação mudarem.
> Decisões técnicas e evidências: `docs/architecture.md` e `docs/setup.md`.

## Problema e objetivo

A Dona Dôra (pizzarias, massas e lasanhas artesanais) precisa mostrar o cardápio com
**fotos e vídeos em alta qualidade** para o cliente decidir pelo celular e, ao tocar em
**Comprar**, sair para o link de compra do app de pedido. Hoje isso depende de material
solto (mensagens/fotos); o produto deve centralizar tudo em um **cardápio web** com
**painel administrativo** para o dono cadastrar categorias, produtos e mídia **sem tocar
em código**.

## Público e papéis

- **Cliente final:** visita o cardápio pelo navegador do celular (pt-BR), sem instalar nada.
- **Dono do cardápio:** conta **única** do painel `/admin`, criada na primeira utilização e
  compartilhada com até 2 pessoas de confiança. Sem papéis/permissionamento: quem está
  logado tem acesso total. A mesma conta pode administrar **várias lojas** (ex.: Dona Dôra
  Ipatinga e Dona Dôra Timóteo), cada uma com cardápio, logo e cores próprios.
- Não existe papel de desenvolvedor/expoente no produto; operação é feita só pelo painel.

## Preferências do visitante

O cardápio público oferece **tema claro/escuro** e **interface em português ou inglês**,
escolhidos no cabeçalho e lembrados no navegador do visitante. A tradução cobre a interface
(menus, botões, avisos); nomes de categorias e produtos continuam como cadastrados pelo dono.
O painel administrativo oferece as mesmas preferências de tema e idioma; a tradução cobre
cabeçalho, login, painel, listas, categorias e formulário de produto.

## Lojas e identidade (SaaS local)

Cada loja tem uma URL pública estável: a loja principal (`padrao = 1`) fica em `/` e as
demais em `/loja/<slug>`. No painel, o seletor do cabeçalho troca a loja ativa (cookie
`loja_ativa`); o dono cria novas lojas em `/admin/loja`.

O branding é editável sem deploy: nome, slogan, descrição, logo (KV), **duas cores livres**
(marca e destaque, com tons de contraste derivados automaticamente) e padrões de tema
(claro/escuro) e idioma (pt/en). Não há cadastro público nem cobrança: a criação de lojas é
assistida pelo dono já autenticado.

## Fluxos da primeira versão

1. **Ver cardápio** — `/` (loja principal) ou `/loja/<slug>` lista categorias e produtos com
   capa, preço, destaque e galeria (foto/vídeo com lightbox e seek). Entrada: visita.
   Resultado: cardápio renderizado com cache na edge por URL (mudanças aparecem em ~30s).
2. **Comprar** — toque no botão abre o fluxo de pedido conforme a `modalidade` do produto:
   **retirada** vai direto para o `comprar_url` (http/https, nova aba); **local** mostra o
   aviso de que pedidos no local são feitos no totem; **ambos** pergunta
   "comer no local ou retirada?". Entrada: produto. Resultado: link externo aberto ou
   aviso do totem exibido.
3. **Criar conta (primeiro acesso)** — `/admin` redireciona para `/admin/criar-conta`
   enquanto não existe usuário; define nome, e-mail e senha (mínimo 10 caracteres).
4. **Entrar no painel** — `/admin/login`; 5 falhas bloqueiam por 10 min; escritas exigem
   mesma origem (CSRF); sessão em KV.
5. **Gerenciar categorias** — `/admin/categorias`: criar, renomear (com emoji), reordenar,
   excluir.
6. **Gerenciar produtos** — `/admin/produtos`: criar/editar com preço, categoria, link de
   compra, disponibilidade, modalidade (local/retirada/ambos), destaque, ordem e **galeria** (upload de foto otimizada no
   navegador ou vídeo bruto; poster gerado automaticamente; exclusão remove objetos do KV).
7. **Servir mídia** — `/media/<chave>` lê do KV com suporte a Range (206) para o seek do
   vídeo.
8. **Configurar a loja** — `/admin/loja`: logo, nome, slogan, descrição, duas cores, tema e
   idioma padrão. A mesma tela cria outra loja para a conta.
9. **Trocar de loja** — seletor no cabeçalho do painel; todas as categorias, produtos e
   mídias passam a ser lidos/gravados com o `loja_id` ativo.

## MVP (entregue e em produção)

Cardápio público com cache · painel com login único e proteções · CRUD de categorias e
produtos · upload/otimização de mídia em KV com limpeza de órfãos · tema/idioma ·
**multi-loja local** (branding, URLs por loja, isolamento por `loja_id`) · deploy
automático Git → Workers Builds (a versão multi-loja ainda não foi implantada).

## Transparência, privacidade e acessibilidade

- Páginas públicas: `/privacidade`, `/termos`, `/cookies`, `/reembolso` e
  `/exclusao-de-dados`, linkadas no rodapé do cardápio e do painel.
- Banner de cookies com “Aceitar todos” e “Rejeitar opcionais”; analytics só carrega com
  aceite. A escolha pode ser refeita pelo link “Preferências de cookies”.
- Formulários de login e criação de conta exigem aceite dos Termos e da Política e registram
  data/versão em `usuarios.aceite_em`/`aceite_versao`.
- Dados de contato do responsável no rodapé: Henrique Pires, telefone e e-mail. Sem CNPJ
  informado até o momento.
- Coleta mínima: conta do painel (nome, e-mail, senha com hash) e conteúdo da loja; não há
  cadastro público, CPF, endereço ou dados de pagamento neste sistema.
- Exclusão de dados por solicitação identificada em `/exclusao-de-dados` (e-mail com prazo
  de resposta de 15 dias), pois a conta é única e a remoção é irreversível.
- Acessibilidade: atalho “Pular para o conteúdo”, foco visível, imagens com texto
  alternativo, botões com rótulo e contraste derivado por loja.

## Fora de escopo

Carrinho/pagamento/emissão de pedido (fica no app externo) · múltiplos usuários com papéis ·
cadastro público de lojas/cobrança · domínio próprio por loja · app nativo · R2 (exige
cartão — ver `README.md`) · painel de métricas · SEO avançado/sitemap. Analytics é opcional
e desativado sem `GA_ID`/`META_PIXEL_ID`; não há CRM nem envio de e-mail pelo sistema.

## Requisitos

- Mobile-first, com padrão de idioma por loja (**pt-BR** ou **en**), moeda **BRL**.
- Fotos otimizadas no navegador (thumbnail WebP ≤1600px, lightbox JPEG ≤1920px); vídeo ≤12 MB
  no painel (15 MB no endpoint) com poster automático.
- Segurança: senha com hash **PBKDF2-SHA256 + pepper** (segredo fora do banco), senha mínima
  de 10 caracteres, rate-limit de login, CSRF por mesma origem, sessão em KV, redirecionamento
  de `/admin/*` sem sessão.
- Acessibilidade básica: HTML semântico, utilitário `.sr-only`, controles reais de formulário
  (revisão formal pendente — ver `docs/design.md`).

## Restrições e decisões técnicas

- **Stack:** Astro 7 (SSR, `output: 'server'`) · Cloudflare Workers · D1 (`DB`) · KV
  (`SESSION`, `MEDIA`, `ASSETS`) · TypeScript estrito (`astro/tsconfigs/strictest`) ·
  **npm** (lockfile `package-lock.json`).
- **Exceção ao padrão do toolkit (Drizzle + PostgreSQL):** persistência em **D1 + KV** porque
  o plano Cloudflare Free funciona **sem cartão de crédito** (R2/Postgres gerenciado exigem
  pagamento). Revisitar se liberar R2 ou outro serviço pago — a troca de bindings é feita em
  `src/lib/env.ts` (ver `README.md`).
- **Workers Free:** 10 ms de CPU/req → cache da edge (30s) no `/`, vídeo como corpo bruto,
  PBKDF2 em 40k iterações (limite de 100k do workerd + medição documentada no `README.md`).
- **Deploy:** push no Git = deploy automático (Workers Builds, build `npm run build`).
- **Sem CI de testes no Git hoje:** validação era local (`npm run check`, `npm run build`);
  a partir desta adoção há também lint/testes e workflow de CI (ver `docs/quality.md`).

## Premissas e decisões pendentes

- `astro.config.mjs` ainda tem `site: 'https://cardapio.exemplo.com'` (placeholder) —
  decisão pendente: domínio real (reversível; afeta URLs canônicas).
- O link de compra padrão `https://donadora.com.br` redireciona para uma página 404
  (configuração externa, fora deste repositório) — corrigir `comprar_url` no painel quando o
  destino estiver certo (fato verificado e documentado no `README.md`).
- Migração para R2/pagamento: só com decisão explícita (custo/novo serviço).

## Critérios de aceitação (produto)

- O cliente vê o cardápio completo no celular, abre a galeria e conclui o pedido pelo
  caminho certo: link de retirada ou aviso do totem para consumo no local.
- O dono cadastra categoria/produto/mídia pelo painel sem deploy nem edição de código.
- O dono administra mais de uma loja na mesma conta; cada loja vê apenas o seu cardápio,
  branding e mídias, e a loja principal continua em `/`.
- Escritas sem sessão retornam 401, leituras sem sessão redirecionam ao login; 5 falhas de
  login bloqueiam por 10 min.
- Excluir produto/mídia remove os objetos do KV (sem órfãos consumindo a cota de 1 GB).
- Verificações técnicas (tipos/lint/testes/build) ficam em `docs/quality.md`.

## Próxima entrega

Trocar o placeholder `site` do `astro.config.mjs` pelo domínio real do cardápio (dependência
externa: definição do domínio) e, em paralelo, corrigir o destino do link de compra no painel
quando a configuração externa for resolvida.

## Manutenção

Atualize este documento quando escopo, restrições ou aceitação mudarem. Detalhes técnicos:
`docs/architecture.md`; evidências de setup: `docs/setup.md`.

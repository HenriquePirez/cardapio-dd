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
  logado tem acesso total.
- Não existe papel de desenvolvedor/expoente no produto; operação é feita só pelo painel.

## Fluxos da primeira versão

1. **Ver cardápio** — `/` lista categorias e produtos com capa, preço, destaque e galeria
   (foto/vídeo com lightbox e seek). Entrada: visita. Resultado: cardápio renderizado com
   cache na edge (mudanças aparecem em ~30s).
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

## MVP (entregue e em produção)

Cardápio público com cache · painel com login único e proteções · CRUD de categorias e
produtos · upload/otimização de mídia em KV com limpeza de órfãos · deploy automático
Git → Workers Builds.

## Fora de escopo

Carrinho/pagamento/emissão de pedido (fica no app externo) · múltiplos usuários com papéis ·
multi-tenancy · app nativo · R2 (exige cartão — ver `README.md`) · i18n · analytics ·
painel de métricas · SEO avançado/sitemap.

## Requisitos

- Mobile-first, em **português (pt-BR)**, moeda **BRL**.
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

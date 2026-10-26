# Setup e evidências

## Fonte e contexto

- **Data de verificação:** 2026-10-26 · **Toolkit:** `vibe-coding-toolkit` rev **`790a895`**
  (cópia versionada em `/tmp/opencode/vibe-coding-toolkit`; nunca copiado por inteiro).
- **Produto:** Cardápio DD (Dona Dôra) — Astro 7 SSR em Cloudflare Workers (D1 + KV).
- **Client/modelo:** OpenCode **v2.0.24** (Linux); modelo e autenticação da sessão
  preservados em todas as execuções e subagentes. Sem política de seleção de modelo
  autorizada — subagentes herdam o modelo da sessão (limitação do host registrada).
- **Runtime local:** Node 24.22.1 / npm 11.19.1.
- Escopo autorizado: cobertura completa do catálogo; instalações globais conforme
  apresentadas; sem push, sem tocar em produção/segredos, sem hooks/branch protection.

## Decisões e fontes

| Decisão | Razão | Fonte consultada |
|---|---|---|
| Fixar Superpowers em `#v7.0.1` (não `main`) | evitar mudança silenciosa de plugin que executa com acesso total | instruções `.opencode/INSTALL.md` do upstream (fetch) |
| ESLint **10** (não 9) | `eslint-plugin-astro@3.2.1` exige `eslint>=10`; `typescript-eslint@8.72` aceita 10; `eslint-import-resolver-typescript` (v9-only) descartado — fronteiras com `no-restricted-imports` | erros `ERESOLVE` reais do npm (evidência de instalação) |
| Fronteira de bindings via `no-restricted-imports` de `cloudflare:workers` | arquitetura real: bindings só em `src/lib/env.ts`; sem dependência de plugin import-x | código do projeto + schema do ESLint (verificado no plugin instalado) |
| Context7 em escopo de **projeto** (`opencode.json`) | reproduzível para qualquer sessão do repo; sem token | `opencode mcp add --help` (escopo padrão = projeto) |
| Skills Vercel em `.agents/skills/` + `skills-lock.json` versionados | método oficial com lockfile (MIT; `agent-skills` sem LICENSE — atribuição `author: vercel` mantida, risco registrado) | `docs/tools/16` + README do `vercel-labs/skills` |
| Modo Harness2 = **native method adaptation** | CLI oficial é lab isolado (requer `uv`+Python 3.12; sem autorização de benchmark/custo) | `docs/tools/23` rev `790a895` |
| Relatório de segurança privado e fora do repo | convenção do prompt 13 | `docs/prompts/13` rev `790a895` |
| Caveman via instalador próprio fixado (`#v4.0.1`), sem login/roteamento | usuário autorizou explicitamente; telemetria inativa (CLI standalone ausente; plugin sem chamadas de rede — grep) | INSTALL.md do upstream + inspeção dos arquivos instalados |

## Componentes (matriz completa do catálogo, rev `790a895`)

| # | Componente | Decisão | Escopo | Estado e evidência |
|---|---|---|---|---|
| 01 | Superpowers | Instalar (plugin fixado v7.0.1) | global (`~/.config/opencode/opencode.json`) | **Validado:** `opencode plugin list`; skills carregaram na sessão viva (presença ≠ loading — loading observado) |
| 02 | Subagent-orchestration | Reusar o mecanismo nativo (`subagent`) | sessão | **Validado em uso:** 6 subagentes (2 pesquisas, 3 casos de harness, 1 review de segurança); herdam o modelo da sessão |
| 03 | RTK / token proxy | Bloqueado | — | Requer Homebrew (`brew install rtk-ai/tap/rtk`); máquina sem brew. Retomar: instalar brew + RTK |
| 04 | Ponytail | Instalar (`@dietrichgebert/ponytail@5.3.2`) | global | **Validado:** plugin list + skill carregada |
| 05 | Caveman | Instalar (v4.0.1, instalador próprio autorizado) | global | **Validado:** skill carregada; bloco em `~/.config/opencode/AGENTS.md`; telemetria inativa (sem CLI standalone; plugin sem rede) |
| 06 | ESLint/quality gates | Instalar (ESLint 10 + ts-eslint + astro + regras custom) | projeto | **Validado:** `npm run lint` 0 erros; perfil tipado 0 erros; self-check das regras 3/3; ver `docs/quality.md` |
| 07 | Graphify | Bloqueado (preparado) | — | Requer `uv`/`pipx`; `.graphifyignore` já versionado. Retomar: instalar uv + `uv tool install graphifyy` |
| 08 | Obsidian memory | Não adotado | — | Sem vault Obsidian; a memória de longo prazo do projeto é a documentação canônica (este `docs/`) |
| 09 | Claude memory system | Não adotado | — | `CLAUDE.md` = `@AGENTS.md` (1 linha, sem duplicação de memória) |
| 10 | Hooks best practices | Adaptado/adiado | — | Sem hooks `pre-commit`/`pre-push` por restrição do escopo; disciplina via `npm run verify` + AGENTS.md |
| 11 | agent-browser | Bloqueado | — | Requer Chrome + npm global; Chrome ausente na máquina. Retomar: instalar Chrome |
| 12 | Context7 (MCP) | Instalar (remoto `https://mcp.context7.com/mcp`) | projeto (`opencode.json`) | **Validado com consulta real:** resolve + query do adapter Astro (sessions/KV); sem token (pool anônimo; rate limit registrado) |
| 13 | Anthropic skills | Adaptado via #16 | — | Marketplace/plugin Anthropic não é o client; skills equivalentes instaladas via `npx skills` |
| 14 | Chrome DevTools MCP | Bloqueado | — | Requer Chrome instalado |
| 15 | Codex workflow | Inaplicável | — | Client é OpenCode; sem migração de stack de agente |
| 16 | Vercel skills | Instalar (`web-design-guidelines`, `writing-guidelines`, `find-skills`) | projeto (`.agents/skills/` + lockfile) | **Validado:** discovery imediato no OpenCode; nomes de frontmatter conferidos; licenças: `vercel-labs/skills` MIT; `agent-skills` sem LICENSE (atribuição mantida) |
| 17 | Next.js runtime/performance | Inaplicável | — | Projeto é Astro (preservar stack); image service `compile` já configurado. Bundle budgets: medida futura se necessária |
| 18 | PostgreSQL skills | Inaplicável | — | Persistência D1 + KV (exceção registrada em `PRODUCT.md`/`docs/architecture.md`; revisitar com serviços pagos) |
| 19 | GitHub CI repair | Parcial (criação nova) | projeto | Workflow `.github/workflows/ci.yml` criado (PR + push main, `permissions: contents: read`); **configurado sem execução** — primeiro run real ocorre no próximo push/PR no GitHub |
| 20 | Security review | Prompt 13 local + revisão manual | projeto | **Validado:** baseline review executada (11 findings; 6 corrigidos em `8cb02a4`); skill `differential-review` (Trail of Bits) = Claude Code/Codex only → fallback manual documentado |
| 21 | shadcn/ui | Inaplicável | — | Sem React/Tailwind; CSS próprio com tokens (`src/styles/global.css`) — preservar stack |
| 22 | Sentry MCP | Bloqueado | — | Exige conta/projeto Sentry e autorização separada. Retomar: criar conta + token |
| 23 | Harness2 | **Native method adaptation** | projeto | Ver evidências abaixo; CLI oficial = lab bloqueado (uv/Python 3.12 ausente; sem autorização de custo) |

## Documentação criada

`PRODUCT.md`, `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), `docs/architecture.md`,
`docs/design.md`, `docs/onboarding.md`, `docs/quality.md`, este `docs/setup.md`,
`docs/task-handoff.md.template`, `docs/prompts/review-de-seguranca.md`.
`README.md` **preservado** com seção nova "Documentação" (mapa) — conteúdo de produto
existente consolidado, não duplicado.

## Checks (antes → depois)

| Item | Estado | Evidência |
|---|---|---|
| `npm run check` (baseline) | OK antes das mudanças | 0 errors (2026-10-26, pré-adocao) |
| `npm run build` (baseline) | OK antes | exit 0 (pré-adocao) |
| `npm run lint` (novo) | Validado | 0 erros / 31 avisos legados medidos (plano em `docs/quality.md`) |
| `npm run lint:typed` (novo) | Validado | 0 erros / 34 avisos; regras `error` limpas; ~5 s |
| `npm test` (novo) | Validado | 30/30 (`vitest run`, ambiente node, stub de `cloudflare:workers`) |
| `npm run rules:selfcheck` (novo) | Validado | 3/3 regras custom via `RuleTester` |
| `npm run verify` (novo) | Validado | lint → typed → check → test → build, exit 0 |
| `npm audit` | Validado | deps de produção: 0; 5 advisories dev-only (undici via wrangler ≥4.36; downgrade descartado e registrado) |
| CI (GitHub Actions) | Configurado sem execução | YAML estático revisado; roda no GitHub no próximo push/PR |
| Context7 | Validado | resolve-library-id + query-docs reais (adapter Astro/sessions) |
| Idempotência do setup | Validado | re-execução de `mcp add` +2× `skills add` + caveman installer: hash agregado idêntico antes/depois; git limpo; caveman reporta "already contains" |
| Segurança (baseline) | Validado | 11 findings no relatório privado; F-01/02/04/05/10/11 corrigidos (`8cb02a4`); demais pendentes abaixo |
| Refator de arquivos >350 linhas | Não executado (pendência) | 4 arquivos medidos; refactor dedicado registrado em `docs/quality.md` |
| Deploy/produção/D1 remoto | Não executado por decisão | fora do escopo (sem tocar em produção) |

Recursos temporários criados: `/tmp/opencode/harness-eval/` (3 cópias descartáveis +
relatório do caso 3) — mantidos como evidência; limpeza opcional posterior
(`rm -rf /tmp/opencode/harness-eval`). Relatório de segurança privado:
`~/.local/share/security-reviews/cardapio-dd-baseline-2026-10-26.md` (dir 700, file 600,
não versionado).

## Memória e evidências de harness

- **Memória canônica:** `AGENTS.md` (índice curto) + `docs/*.md`; o cliente carrega o
  `AGENTS.md` do projeto automaticamente (observado nesta sessão após criação).
  Recuperação em contexto limpo: subagentes receberam caminhos explícitos e leram os
  documentos com sucesso (observado). `CLAUDE.md` importa o mesmo conteúdo.
- **Smoke cases (prompt 14 + guia 07, toolkit rev `790a895`)** — fixture descartável,
  baseline do avaliador confirmada antes (5 pass/2 fail), hash do avaliador registrado
  (`14220a75…`), verificação independente do coordenador em cada caso:
  - **Caso 1 boundary fix: PASS** (7/7; diff mínimo; customização preservada).
  - **Caso 2 stale handoff: PASS** (rejeitou claim falsa, corrigiu o código, evidência real).
  - **Caso 3 review read-only: PASS** (fixture byte-idêntico; relatório com cross-tenant +
    identidades ausentes, exemplos concretos, impacto/confiança/cobertura/limitações).
  - **Caso 4 reapply setup: PASS parcial (idempotência real das instalações)** — conteúdo
    idêntico após reaplicação; duplicatas evitadas.
  - **Casos 5-7: not run** — exigem observação de interação do host (conflito de recurso
    entre workers, pausa/resumo) não disponível sem simulação; marcados, não simulados.
- **Limite explícito:** subagente com contexto novo ≠ cliente reiniciado. Plugins/skills
  foram observados carregando **nesta sessão viva**; um restart completo do cliente
  (`opencode service restart`) não foi executado para não interromper a sessão — próxima
  sessão do usuário confirma o carregamento em frio. Um case passante = smoke, não taxa
  de confiabilidade.

## Segurança (resumo sanitizado)

- Prompt adotado: cópia versionada do prompt 13 (`docs/prompts/review-de-seguranca.md`,
  rev `790a895`). Convenção: relatório privado fora do repo, permissões restritivas,
  sem segredos; este documento guarda só o resumo.
- Baseline: **11 findings** (3 medium, 8 low; ASVS 4.0.3 como referência de cobertura).
  **6 corrigidos** em `8cb02a4` (breakout de JSON no lightbox, Content-Type de upload,
  nosniff em `/media`, open redirect via backslash, innerHTML do formulário, permissões
  de CI, e-mail em log). Evidência: `npm run verify` verde após as correções.
- **Pendências residuais** (detalhes no relatório privado; gatilho de retomada):
  - *F-03 (medium, needs-validation):* criação de conta no primeiro uso com race
    (TOCTOU + `ON CONFLICT`) — corrigir com transação D1 quando o estado de produção
    for confirmado.
  - *F-06 (low):* CSP/HSTS/Referrer-Policy ausentes — avaliar no proxy/zona (edge) ou
    middleware quando houver teste de UI.
  - *F-08 (low):* PBKDF2 40k + senha mínima 10 abaixo do ASVS — desvio documentado
    (limite do workerd; compensações: pepper + lockout); revisar se o runtime mudar.
  - *F-09 (low):* lockout por e-mail sem camada de IP (DoS de login) — aceito para
    conta única; revisar se houver mais usuários.

## Trabalho pendente e próxima entrega

- **Bloqueios de máquina** (retomar quando o pré-requisito existir): RTK (Homebrew),
  Graphify (`uv`), agent-browser e Chrome DevTools MCP (Chrome), Sentry (conta externa),
  CI real no GitHub (primeiro push/PR), Harness2 CLI lab (`uv` + Python 3.12 + autorização).
- **Pendências do produto** (ver `PRODUCT.md`): domínio real em `astro.config.mjs`
  (placeholder), destino do link de compra (configuração externa).
- **Pendências de qualidade:** refactor dos 4 arquivos >350 linhas (plano em
  `docs/quality.md`); promoção dos warns a error ao zerar.
- **Pendências de segurança:** F-03 e F-06 acima.
- **Próxima entrega (menor passo):** trocar o placeholder `site` pelo domínio real e
  confirmar o destino do link de compra (ambos dependem de definição externa).
- **Manutenção:** reaplicar o setup preserva tudo (idempotência testada); após mudanças
  materiais de client/modelo/instruções, reexecutar os smoke cases do harness.

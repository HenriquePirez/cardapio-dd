# Qualidade

## Comandos

| Comando | O que prova |
|---|---|
| `npm run lint` | ESLint 10 fast tier (regras core + typescript-eslint strict + astro + 3 regras custom do toolkit). Sem tipos. |
| `npm run lint:typed` | Perfil tipado (`projectService`): `no-floating-promises`, `no-misused-promises`, `only-throw-error`, `return-await`, `await-thenable` + avisos de segurança de tipos. ~5 s. |
| `npm run check` | `astro check` — tipos e diagnostics do framework (gate pré-existente). |
| `npm run test` | Vitest (ambiente node): lógica pura de `src/lib` (auth/PBKDF2, rate-limit, validadores, formatador). |
| `npm run rules:selfcheck` | Self-check das regras custom `eslint-rules/` via `RuleTester` (sem framework extra). |
| `npm run build` | Build SSR do Astro para Workers. |
| **`npm run verify`** | **Combinado canônico:** lint → lint:typed → check → test → build. Rodar antes de commitar. |

Escopo pontual: `npx vitest run src/lib/auth.test.ts` (um arquivo) ou
`npx eslint src/lib` (diretório).

CI: `.github/workflows/ci.yml` roda `npm ci` + as cinco checagens em **pull request**
e em push para `main` (sem branch protection — é só feedback).

## Regras baseline

- TypeScript estrito (`astro/tsconfigs/strictest`) + presets oficiais (`astro check`).
- Limite de **350 linhas/arquivo** (`quality/max-lines`, warn com plano abaixo).
- Bindings do Cloudflare só via `src/lib/env.ts` (`no-restricted-imports` de
  `cloudflare:workers` fora de `src/lib/`); componentes sem acesso a dados em runtime.
- `console.log/warn/error` é o canal de log do Workers; outros métodos proibidos.
- Validação e segurança nas fronteiras: testes de `auth`, `login-guard` e validadores.

## Contagem e plano (medição de 2026-10-26)

Estado: **lint 0 erros / 31 avisos** (fast) · **0 erros / 34 avisos** (typed).

| Regra | Sev. | Qtd. | Plano de redução |
|---|---|---|---|
| `quality/max-lines` | warn | 4 arquivos (`ProductForm.astro` 729, `AdminLayout.astro` 448, `index.astro` 386, `Gallery.astro` 363) | Refatorar por responsabilidade real (prompt 09 do toolkit) como tarefa dedicada — UI sem testes E2E; promover a error ao zerar. *Nota: o parser do Astro avalia `ProductForm.astro` duas vezes (frontmatter+template), gerando 1 aviso duplicado.* |
| `complexity` | warn | 9 | Mesma frente de refatoração; concentradas em rotas `/admin/api`. |
| `max-statements` | warn | 8 | Idem. |
| `no-useless-assignment` | warn | 3 | Inicializações mortas antes de try/catch reatribuir; corrigir junto do refator (mudança de fluxo exige cuidado sem testes de rota). |
| `@typescript-eslint/no-non-null-assertion` | warn | 5 | Substituir `!` por tratamento explícito de nulo nas rotas admin. |
| `@typescript-eslint/triple-slash-reference` | warn | 1 | Padrão do Astro gerado (`src/env.d.ts`); mantido como warn. |
| `@typescript-eslint/require-await` | warn | 4 | Revisar handlers async sem await nas rotas admin. |

Regras `error` do perfil tipado estão **limpas** (0 violações) — promovidas por medição,
não por default.

## Dependências (npm audit, 2026-10-26)

- `npm audit --omit=dev`: **0 vulnerabilidades** (não há dependências de produção —
  tudo é devDependency; o artefato de produção é build estático + bindings).
- `npm audit`: 5 advisories (1 high, 4 moderate) todos em `undici` via `wrangler ≥4.36`
  (toolchain dev local). Correção sugerida = **downgrade** para `wrangler@4.35.0` —
  descartada (perde correções do wrangler; não afeta o runtime em produção).
  Reavaliar quando houver versão do wrangler corrigida acima da atual (`^4.152`).
- Adoções novas: `eslint@^10`, `@eslint/js`, `typescript-eslint@^8`, `eslint-plugin-astro@^3`,
  `globals`, `vitest@^5`. Nenhuma delas é executada em produção.

## Estratégia de testes

- **Cobertura atual:** lógica pura e crítica de `src/lib` — 30 testes:
  - `auth.test.ts`: PBKDF2 (hash/verificação/pepper/hash legado/erros de formato).
  - `login-guard.test.ts`: rate-limit com D1 fake em memória, incluindo regressão do
    bug corrigido em 2026-10-26 (bloqueio anulado por `Date.parse('...ZZ')` → NaN).
  - `env.test.ts`: chaves de mídia, tipos MIME, `urlMidia`.
  - `config.test.ts`: `formatarPreco` (BRL).
- `cloudflare:workers` é substituído por stub (`tests/cloudflare-workers-stub.ts`)
  no Vitest; o restante do Workers (KV/D1 reais) só se comporta em `wrangler dev`.
- **Não há:** E2E/browser (agent-browser/Chrome indisponíveis — ver `docs/setup.md`),
  testes de UI, testes de segurança automatizados. Não afirmar cobertura porcentual.
- Testes novos seguem TDD; os existentes são de caracterização (comportamento atual
  documentado — mudança de comportamento exige atualizar o teste de propósito).

## Regras customizadas

`eslint-rules/` (copiadas do toolkit rev `790a895`, sem alterações) + `scripts/verify-quality-rules.mjs`.
Adaptações de aplicação vivem no `eslint.config.mjs` (documentadas no cabeçalho dele),
não nas regras — manter sincronia com o toolkit na origem.

## Manutenção

- Ao adicionar lógica nova: teste junto (TDD) e `npm run verify` antes do commit.
- Ao refatorar arquivo grande: atualizar a tabela de contagem acima.
- Ao subir dependência: `npm audit` e registro de qualquer advisory restante.

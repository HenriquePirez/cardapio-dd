# Cardápio DD

> Instruções compartilhadas para agentes de IA. Mantenha este arquivo curto: comandos,
> restrições e um mapa para as fontes detalhadas.

## Produto e stack

- Escopo e aceitação: [`PRODUCT.md`](PRODUCT.md).
- Stack: **Astro 7** (SSR, `output: 'server'`) · **Cloudflare Workers** · **D1** (`DB`) ·
  **KV** (`SESSION`, `MEDIA`, `ASSETS`) · **TypeScript estrito** (`astro/tsconfigs/strictest`,
  alias `@/*` → `src/*`) · **npm** com lockfile (`package-lock.json`; Node 24+).
- Mapa e decisões: [`docs/architecture.md`](docs/architecture.md) · Preparação local:
  [`docs/onboarding.md`](docs/onboarding.md) · Checagens: [`docs/quality.md`](docs/quality.md) ·
  Evidências de setup: [`docs/setup.md`](docs/setup.md).

## Comandos canônicos

- Instalar: `npm ci`
- Desenvolver: `npm run dev` (astro dev — **não liga as bindings** do Cloudflare)
- Runtime real local: `npm run build && npx wrangler dev` (lê `.dev.vars`, serve `dist/`)
- Tipos das bindings: `npm run types`
- Tipos (cheque): `npm run check`
- Build: `npm run build`
- Banco local: `npm run db:apply:local` (remoto `db:apply:remote` = produção; só com autorização)

## Acordos de trabalho

- Leia o código e os documentos relevantes antes de editar. Distinga observação, premissa,
  decisão e evidência.
- Faça a menor mudança suficiente. Reutilize padrões, componentes e dependências existentes.
- Preserve validação, tratamento de erros, segurança, acessibilidade e requisitos explícitos.
- Não crie abstrações, camadas, opções ou dependências para necessidades não pedidas.
- Rode as checagens apropriadas (`docs/quality.md`). Não simule resultados.
- Continue trabalho autorizado; pergunte só para informação essencial ou ação fora da autorização.
- Publicar, mensagens a terceiros, custos e ações destrutivas exigem autorização explícita.
- Instalar ferramentas não concede essa autorização.

## Continuidade de execução

- Responda perguntas de status e retome as ações restantes; pare só se o usuário pedir.
- Um bloqueio trava apenas as tarefas dependentes; conclua as independentes seguras.
- Ao retomar de um handoff (template: [`docs/task-handoff.md.template`](docs/task-handoff.md.template)),
  verifique arquivos, Git, checagens e processos antes de confiar no registro.
- Não repita uma tentativa idêntica sem nova evidência.

## Padrões e documentação

- **Persistência:** D1 + KV (exceção registrada ao padrão do toolkit; razão em
  `PRODUCT.md` e `docs/architecture.md`). Queries via prepared statements parametrizados em
  `src/lib/db.ts`; sem N+1; sem migrations automáticas em build/request.
- **Fronteiras:** páginas/components falam com `src/lib/*`; bindings só via `src/lib/env.ts`.
- Valide entradas e chaves com os helpers existentes (`src/lib/env.ts`, `src/lib/auth.ts`);
  não introduza dependências de validação sem necessidade nova.
- Segredos fora do repositório (`.dev.vars` é gitignored); erros públicos sem segredos nem
  corpos completos.
- Atualize o documento responsável junto com a mudança: escopo → `PRODUCT.md`;
  estrutura/decisões → `docs/architecture.md`; interface → `docs/design.md`;
  preparação → `docs/onboarding.md`; checagens → `docs/quality.md`.
- Memória em camadas: este arquivo é o índice curto; detalhes nos `docs/*.md` sob demanda.
  Localização, mecanismo de carregamento e gatilhos de invalidação: `docs/setup.md`.

## Ferramentas e estilo

- **Superpowers** (plugin, v7.0.1): use as skills relevantes e dimensione o processo ao
  tamanho da tarefa. Instruções explícitas e execução já autorizada têm prioridade sobre
  aprovações repetidas.
- **Ponytail** (`full`): solução mais pequena que resolve completamente; comente
  `shortcut: <limite>, <quando evoluir>` em atalhos conhecidos. `stop ponytail` desativa.
- **Caveman**: conversa concisa em português; código, docs e commits com redação normal.
  `stop caveman` desativa.
- **Context7** (MCP, no `opencode.json` do projeto): documentação atual de bibliotecas —
  resolva o identificador e consulte um conceito por vez; nunca envie segredos ou código
  privado. Sem servidor ativo: use as fontes oficiais e registre a limitação.
- **RTK / Graphify / agent-browser / Chrome DevTools MCP:** não instalados — pré-requisitos
  de máquina ausentes (Homebrew, uv/pipx, Chrome). Condição de retomada em `docs/setup.md`.
- **LLM/subagentes:** preservar o cliente, modelo e autenticação da sessão. Sem política de
  seleção autorizada, subagentes herdam o modelo da sessão (limitação do OpenCode).

## Skills locais (escopo do projeto, `.agents/skills/`)

- `web-design-guidelines`: revisão de UI/acessibilidade quando houver mudança de interface.
- `writing-guidelines`: revisão de prosa/documentação.
- `find-skills`: descoberta quando faltar uma capacidade concreta.
Instalar skills não executa suas ações nem autoriza deploy/publicação.

## Git e colaboração

- Sem bloqueios de push, exigência de branch/worktree ou hooks `pre-commit`/`pre-push`.
- Lint, tipos, testes e build são checagens explícitas (comandos acima).
- Um escritor por arquivo; lockfiles e configs compartilhadas são do coordenador.

## Delegação e revisão

- Delegue só quando isolar contexto, especializar ou paralelizar independente justificar a
  coordenação; para tarefas simples, execute direto.
- Cada tarefa delegada recebe objetivo, arquivos permitidos, critérios de aceitação e
  checagens; revisores são somente leitura.
- Dimensione a revisão ao risco e ao diff real. Para mudanças não triviais, use revisão
  independente quando disponível; pare quando os achados relevantes forem resolvidos ou
  explicitamente dispostos e as checagens afetadas passarem.

## Convenções

- Imports relativos dentro de `src/`; alias `@/*` para `src/*` em imports transversais.
- Nomes de arquivo em português, como o restante do repositório; prosa em pt-BR.
- Erros e mensagens em português; links de documentação oficiais em inglês quando citados.

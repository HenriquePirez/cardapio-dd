# Código e arquitetura

## Stack atual

| Camada | Tecnologia | Versão observada |
|---|---|---|
| Framework | Astro (`output: 'server'`) | 7.4.x (`^7.4.2`) |
| Adapter | `@astrojs/cloudflare` (imageService `compile`) | 14.4.x |
| Runtime | Cloudflare Workers (`nodejs_compat`, compat date 2025-10-01) | workerd via wrangler 4.152.0 |
| Banco | Cloudflare D1 (binding `DB`) | driver nativo do Workers |
| Objetos | Cloudflare KV: `SESSION` (sessão), `MEDIA` (fotos/vídeos), `ASSETS` (build) | — |
| Linguagem | TypeScript estrito (`astro/tsconfigs/strictest`, alias `@/*` → `src/*`) | 6.0.x |
| Pacotes | npm | Node 24 / npm 11 (lockfile `package-lock.json`) |

**Exceção registrada (padrão do toolkit = Drizzle + PostgreSQL):** este projeto usa
**D1 + KV** porque o plano Cloudflare Free não exige cartão de crédito. Revisitar se houver
autorização para serviços pagos (R2/Postgres gerenciado). Não introduzir Drizzle/Postgres
apenas para seguir exemplos.

## Mapa de código

```
src/
├── middleware.ts          # cache por URL (30s) + sessão/loja ativa em /admin/*
├── config.ts              # padrões globais (SITE) + formatarPreco()
├── env.d.ts               # tipos de App.SessionData e Cloudflare.Env
├── lib/
│   ├── db.ts              # D1 tipado; toda leitura/escrita recebe lojaId
│   ├── cores.ts           # validação de hex e derivação de tons acessíveis por loja
│   ├── consentimento.ts   # leitura/serialização da escolha de cookies
│   ├── env.ts             # bindings D1/KV + urlMidia() + validação de chaves de mídia
│   ├── auth.ts            # PBKDF2-SHA256 (Web Crypto) com pepper + promoção de hash legado
│   ├── session.ts         # cria/lê/destrói sessão (KV via driver do adapter)
│   ├── login-guard.ts     # rate-limit de login em D1 (5 falhas → 10 min)
│   ├── midia.ts           # apaga objetos do KV (evita órfãos)
│   ├── cache.ts           # helpers do cache da edge
│   └── icone.ts           # helpers de emoji/ícone
├── components/            # Cardapio, ProductCard, Gallery, ProductForm, ConsentimentoCookies, RodapeLegal
├── layouts/               # BaseLayout (cardápio), AdminLayout (painel)
├── pages/
│   ├── index.astro        # cardápio da loja principal (/)
│   ├── loja/[slug].astro  # cardápio das demais lojas
│   ├── privacidade.astro, termos.astro, cookies.astro,
│   ├── reembolso.astro, exclusao-de-dados.astro
│   ├── media/[...chave].ts# serve mídia do KV (Range/206)
│   └── admin/             # login, criar-conta, CRUD, /admin/loja, APIs internas
├── styles/global.css      # tokens de tema (fonte única de design)
scripts/                   # gerar-favicon.mjs, gerar-placeholders.mjs (dev util)
migrations/                # 0001 init, 0002 seed, 0003 modalidade, 0004 multi-loja
```

Não existe camada de serviço/domain: a apresentação (páginas/components) chama
`lib/db.ts` e as libs de apoio diretamente. **Não criar camadas vazias.**

## Fronteiras e fluxo

- **Leitura pública:** `pages/index.astro` (loja `padrao`) e `pages/loja/[slug].astro`
  → `lib/db.ts` → D1, sempre com `loja.id`; a resposta tem `Cache-Control` de 30s
  aplicado/gravado pelo `middleware.ts` (Cache API da edge; só `/` e `/loja/*`, só status 200,
  chave pela URL sem query). `components/Cardapio.astro` recebe loja/categorias/produtos
  prontos — componente não acessa D1.
- **Loja ativa no painel:** middleware lê a sessão, lista as lojas do usuário e valida o
  cookie `loja_ativa`; ausente → primeira loja (ou cria/adota uma). APIs e páginas usam
  `Astro.locals.loja`; toda query de categoria/produto/mídia inclui `loja_id`.
- **Escrita do painel:** páginas `/admin` + APIs `/admin/api/*` → middleware exige sessão
  (GET sem sessão → redirect; métodos de escrita → **401**) → APIs validam mesma origem
  (CSRF) → `lib/db.ts` com prepared statements parametrizados → D1.
- **Autenticação:** `lib/auth.ts` (PBKDF2 40k + pepper em secret do Worker) +
  `lib/login-guard.ts` (rate-limit em D1) + `lib/session.ts` (sessão em KV `SESSION`).
- **Mídia:** upload (multipart p/ foto; corpo bruto p/ vídeo) → KV `MEDIA` → servida por
  `/media/<chave>` com Range → exclusões em `lib/midia.ts` no fluxo do painel.
- **Consentimento e analytics:** `ConsentimentoCookies.astro` lê/grava a escolha em
  `localStorage` (`dd-consentimento`) e só injeta GA4/Meta Pixel após aceite. IDs vêm de
  `GA_ID`/`META_PIXEL_ID` via `lib/env.ts`; vazios = nenhum script externo. O CSP libera só
  os domínios desses provedores.
- **Documentos legais:** páginas estáticas em `src/pages/*` com `LegalLayout` e
  `RodapeLegal`; dados do responsável em `src/config.ts` (`EMPRESA`). Login e criação de
  conta exigem aceite e registram versão/data em `usuarios`.
- O código de servidor é dono de environment/binding: tudo passa por `lib/env.ts`
  (nenhuma página toca `env.DB`/`env.MEDIA` diretamente).

## Dados e migrações

- Schema: `migrations/0001_init.sql` (`categorias`, `produtos`, `produto_midia`,
  `usuarios`, `login_tentativas`), `0003_modalidade.sql`, `0004_saas_lojas.sql`
  (`lojas`; `loja_id` em categorias/produtos/mídia; PK composta; preço em centavos) e
  `0005_aceite_legal.sql` (`usuarios.aceite_em`, `usuarios.aceite_versao`).
  Seed: `migrations/0002_seed.sql`. A 0004 copia os dados existentes para a loja
  `dona-dora` (rebuild das tabelas) — aplicar só com backup (`wrangler d1 export`).
- **Aplicação manual e explícita** (nunca em build/request):
  `npm run db:apply:local` / `npm run db:apply:remote` (`wrangler d1 execute`).
- Sem ORM: SQL direto, tipado em `src/lib/db.ts`, com prepared statements e projeções
  explícitas; listagens limitadas.
- Migração nova = escrever `migrations/0006_*.sql` (ou próximo número) e aplicar no destino apropriado
  (local primeiro). **Produção não é ambiente de teste.**

## Decisões

| Decisão | Razão | Alternativa descartada | Revisitar quando |
|---|---|---|---|
| KV para mídia em vez de R2 | R2 exige cartão; KV free não | R2 ( melhor para objetos) | liberar pagamento/R2 |
| Cache da edge de 30s no `/` | Workers Free: 10 ms CPU/req | SSR a cada visita | limite de CPU mudar |
| PBKDF2 40k iterações + pepper | workerd limita a 100k; 40k ≈12 ms medido | OWASP 600k (inviável) | runtime permitir mais iterações |
| Vídeo como corpo bruto | multipart caro em CPU no plano free | multipart unificado | limite de CPU mudar |
| Conta única sem papéis | produto é de um dono + até 2 ajudantes | RBAC | múltiplos perfis |
| `loja_id` em toda query + PKs compostas | D1/SQLite não tem RLS; isolamento testado no código | schema por banco/loja | muitas lojas ou exigência de RLS |
| Duas cores livres com derivação AA | branding sem depender de paleta fixa | lista de temas prontos | pedido de identidade visual avançada |
| Logo em KV (`lojas/`) | mesmo caminho da mídia, sem R2 | bucket R2 | migrar mídia para R2 |

## Manutenção

Atualize este mapa quando diretórias, dependências relevantes, contratos ou fronteiras
mudarem. Registre apenas comportamento verificado; remova decisões que não existem mais.

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
├── middleware.ts          # cache da edge em "/" (30s) + guarda de sessão em /admin/*
├── config.ts              # SITE (nome/descrição/idioma) + formatarPreco()
├── env.d.ts               # tipos de App.SessionData e Cloudflare.Env
├── lib/
│   ├── db.ts              # acesso ao D1 tipado (funções por tabela; prepared statements)
│   ├── env.ts             # bindings D1/KV + urlMidia() + validação de chaves de mídia
│   ├── auth.ts            # PBKDF2-SHA256 (Web Crypto) com pepper + promoção de hash legado
│   ├── session.ts         # cria/lê/destrói sessão (KV via driver do adapter)
│   ├── login-guard.ts     # rate-limit de login em D1 (5 falhas → 10 min)
│   ├── midia.ts           # apaga objetos do KV (evita órfãos)
│   ├── cache.ts           # helpers do cache da edge
│   └── icone.ts           # helpers de emoji/ícone
├── components/            # ProductCard, Gallery (lightbox), ProductForm (CRUD + upload)
├── layouts/               # BaseLayout (cardápio), AdminLayout (painel)
├── pages/
│   ├── index.astro        # cardápio público (lê do D1, cacheado na edge)
│   ├── media/[...chave].ts# serve mídia do KV (Range/206)
│   └── admin/             # login, criar-conta, CRUD, APIs internas
├── styles/global.css      # tokens de tema (fonte única de design)
scripts/                   # gerar-favicon.mjs, gerar-placeholders.mjs (dev util)
migrations/                # 0001_init.sql (schema), 0002_seed.sql (dados de exemplo)
```

Não existe camada de serviço/domain: a apresentação (páginas/components) chama
`lib/db.ts` e as libs de apoio diretamente. **Não criar camadas vazias.**

## Fronteiras e fluxo

- **Leitura pública:** `pages/index.astro` → `lib/db.ts` → D1; resposta com `Cache-Control`
  de 30s aplicado/gravado pelo `middleware.ts` (Cache API da edge; só `/` e só status 200).
- **Escrita do painel:** páginas `/admin` + APIs `/admin/api/*` → middleware exige sessão
  (GET sem sessão → redirect; métodos de escrita → **401**) → APIs validam mesma origem
  (CSRF) → `lib/db.ts` com prepared statements parametrizados → D1.
- **Autenticação:** `lib/auth.ts` (PBKDF2 40k + pepper em secret do Worker) +
  `lib/login-guard.ts` (rate-limit em D1) + `lib/session.ts` (sessão em KV `SESSION`).
- **Mídia:** upload (multipart p/ foto; corpo bruto p/ vídeo) → KV `MEDIA` → servida por
  `/media/<chave>` com Range → exclusões em `lib/midia.ts` no fluxo do painel.
- O código de servidor é dono de environment/binding: tudo passa por `lib/env.ts`
  (nenhuma página toca `env.DB`/`env.MEDIA` diretamente).

## Dados e migrações

- Schema: `migrations/0001_init.sql` — `categorias`, `produtos`, `produto_midia`,
  `usuarios`, `login_tentativas`. Seed: `migrations/0002_seed.sql`.
- **Aplicação manual e explícita** (nunca em build/request):
  `npm run db:apply:local` / `npm run db:apply:remote` (`wrangler d1 execute`).
- Sem ORM: SQL direto, tipado em `src/lib/db.ts`, com prepared statements e projeções
  explícitas; listagens limitadas.
- Migração nova = escrever `migrations/0003_*.sql` e aplicar no destino apropriado
  (local primeiro). **Produção não é ambiente de teste.**

## Decisões

| Decisão | Razão | Alternativa descartada | Revisitar quando |
|---|---|---|---|
| KV para mídia em vez de R2 | R2 exige cartão; KV free não | R2 ( melhor para objetos) | liberar pagamento/R2 |
| Cache da edge de 30s no `/` | Workers Free: 10 ms CPU/req | SSR a cada visita | limite de CPU mudar |
| PBKDF2 40k iterações + pepper | workerd limita a 100k; 40k ≈12 ms medido | OWASP 600k (inviável) | runtime permitir mais iterações |
| Vídeo como corpo bruto | multipart caro em CPU no plano free | multipart unificado | limite de CPU mudar |
| Conta única sem papéis | produto é de um dono + até 2 ajudantes | RBAC | múltiplos perfis |

## Manutenção

Atualize este mapa quando diretórias, dependências relevantes, contratos ou fronteiras
mudarem. Registre apenas comportamento verificado; remova decisões que não existem mais.

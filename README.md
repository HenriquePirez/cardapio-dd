# Cardápio DD

Cardápio digital **web** (sem app para baixar), feito para celular. Mostra fotos em alta
qualidade e vídeos dos produtos; ao tocar em **Comprar**, o cliente vai para o link de compra
(http/https) do app de compra.

Inclui **painel administrativo** (`/admin`) com login único para cadastrar categorias,
produtos e subir fotos/vídeos — tudo sem tocar em código.

- **Stack:** Astro 7 (SSR) · Cloudflare Workers · D1 (banco) · R2 (fotos/vídeos) · KV (sessão)
- **Deploy:** Git → **Workers Builds** (push = deploy automático)
- **Plano inicial:** Cloudflare Free (com cache na edge para caber no limite de CPU)

---

## Arquitetura

```
Visitante ──► Cloudflare Workers ──► D1 (categorias/produtos/mídia/usuário)
                    │                    │
                    ├─► Cache da edge (30s) no cardápio público "/"
                    └─► R2 (fotos e vídeos) ◄── upload do admin
                                                    │
                                          direto no R2 (vídeo, presigned)
                                          ou pelo Worker (foto otimizada)
```

| Recurso   | Binding  | Para quê                                              |
| --------- | -------- | ----------------------------------------------------- |
| D1        | `DB`     | Categorias, produtos, galeria, usuário, tentativas    |
| R2        | `MEDIA`  | Fotos e vídeos (zero custo de egress)                 |
| KV        | `SESSION`| Sessão do login (provisionado automaticamente)        |
| Assets    | `ASSETS` | CSS/JS do build                                       |

### Rotas

- `/` — cardápio público (SSR + cache na edge)
- `/admin/login`, `/admin/criar-conta` — acesso
- `/admin`, `/admin/categorias`, `/admin/produtos`, `/admin/produtos/[id]` — gestão
- `/media/<chave>` — serve objeto do R2 (fallback quando `MEDIA_PUBLIC_BASE` está vazio)

---

## Primeiros passos (local)

```bash
npm install
npm run types        # gera worker-configuration.d.ts (tipos das bindings)
npm run db:apply:local   # cria o schema + dados de exemplo no D1 local
npm run dev          # http://localhost:4321  (ou: npm run preview, igual à produção)
```

Validação e build:

```bash
npm run check        # astro check (tipos)
npm run build        # build de produção
```

> **Importante:** `npm run dev` não liga as bindings do Cloudflare. Para testar login,
> D1 e R2 de verdade, use `npm run preview` (sobe o `workerd`, mesmo runtime da produção).

### Primeiro acesso ao painel

1. Acesse `http://localhost:4321/admin` → redireciona para **Criar conta** (só funciona
   enquanto não existe nenhum usuário).
2. Defina nome, e-mail e senha (mínimo 6 caracteres).
3. Pronto: a partir daí é só **Entrar** com essas credenciais.

> Conta **única** (o dono cria e compartilha com até 2 pessoas de confiança).
> A senha é guardada apenas como hash **PBKDF2-SHA256** (Web Crypto).

**Proteções:** 5 tentativas erradas → bloqueio de 10 min · exigência de mesma origem
(CSRF) nas escritas · sem sessão em `/admin/*` → redirect para login (ou 401 em escritas).

---

## Upload de mídia

O painel otimiza **fotos** no próprio navegador antes de enviar:

- thumbnail do card: WebP até 1600px (qualidade 0.82)
- versão do lightbox: JPEG até 1920px (qualidade 0.85)

**Vídeos** podem subir de duas formas (automático):

| Caminho                     | Quando                                    | Passa pelo Worker? |
| --------------------------- | ----------------------------------------- | ------------------ |
| **Presigned → R2 direto**   | credenciais S3 configuradas (recomendado) | Não                |
| **Fallback pelo Worker**    | sem credenciais S3                        | Sim                |

Também é gerado um **poster** do vídeo (frame ~0.5s) automaticamente no navegador.

O padrão do cardápio é: a **primeira mídia** da galeria vira a capa do card.
Reordene com as setas ↑↓ ou arrastando.

---

## Configuração

### 1. `wrangler.jsonc`

| Campo                  | O que é                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `d1_databases[0].database_id` | ID real do D1 (criado no 1º deploy — ver abaixo)        |
| `r2_buckets[0].bucket_name`    | Nome do bucket R2                                    |
| `vars.MEDIA_PUBLIC_BASE`       | Domínio público do R2 (opcional)                    |

`MEDIA_PUBLIC_BASE`:

- **vazia** (padrão): as mídias são servidas por `/media/<chave>` — o Worker lê do R2.
  Funciona em dev e produção, sem configuração extra.
- **preenchida** (recomendado em produção): URL aponta direto para a CDN do R2
  (ex.: `https://media.seudominio.com`), mais rápido e sem passar pelo Worker.

### 2. Envio de vídeo direto ao R2 (opcional, recomendado)

Se não configurado, o vídeo sobe pelo Worker (funciona, limite de 100 MB por requisição).
Para enviar direto ao R2, crie um **API token R2** (Object Read & Write) e rode:

```bash
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_BUCKET_NAME
```

### 3. Link de compra

Cada produto tem um campo **Link de compra (app)** — é para onde o botão **Comprar**
redireciona. Os dados de exemplo usam `https://app.exemplo.com/...`: **troque pelo link real**
no painel (`/admin/produtos`).

---

## Deploy (Git → Workers Builds)

O deploy é automático: **push no Git = deploy no Cloudflare**.

### 1. Criar os recursos no Cloudflare

```bash
npx wrangler login              # abre o navegador

# Banco
npx wrangler d1 create cardapio-dd
#   -> copie o database_id gerado para wrangler.jsonc

# Bucket de mídia
npx wrangler r2 bucket create cardapio-dd-media

# Sessão (pode deixar o adapter criar; explícito por clareza)
npx wrangler kv namespace create SESSION
```

Aplique as migrations no banco **remoto**:

```bash
npm run db:apply:remote
```

### 2. Repository Git

```bash
git init
git add .
git commit -m "Cardápio com painel admin no Cloudflare Workers"
# crie o repositório no GitHub e:
git remote add origin git@github.com:<usuario>/<repo>.git
git push -u origin main
```

### 3. Conectar o Git no Cloudflare

**Workers & Pages → Create → Import a repository →** selecione o repo:

| Campo        | Valor                                             |
| ------------ | ------------------------------------------------- |
| Build command| `npm run build`                                   |
| Build output | `dist`                                            |
| Root         | `/`                                               |

Depois do 1º deploy, confira se o `database_id` do `wrangler.jsonc` já é o real
(e re-commita se precisou alterar).

### 4. Pós-deploy

1. Acesse `https://<worker>.<sub>.workers.dev/admin` e **crie a conta**.
2. Troque os `comprar_url` de exemplo pelo link real do app.
3. (Opcional) Configure `MEDIA_PUBLIC_BASE` + os secrets do R2.

---

## Banco de dados (D1)

Schema em [`migrations/0001_init.sql`](migrations/0001_init.sql), dados de exemplo em
[`migrations/0002_seed.sql`](migrations/0002_seed.sql).

| Tabela             | Conteúdo                                                   |
| ------------------ | ---------------------------------------------------------- |
| `categorias`       | Seções do cardápio (nome, ordem, emoji, descrição)         |
| `produtos`         | Nome, preço, categoria, destaque, ordem, link, disponível  |
| `produto_midia`    | Galeria por produto (`imagem`/`video`, thumbnail, full, poster) |
| `usuarios`         | Conta única do painel (`senha_hash` = PBKDF2)              |
| `login_tentativas` | Rate-limit do login                                        |

Para criar uma migration nova:

```bash
# 1) escreva migrations/0003_*.sql
npm run db:apply:remote     # ou --local para testar
```

> Os arquivos JSON de exemplo (`src/content/`) foram migrados para o D1 via seed e não existem
> mais — a fonte de verdade é o banco, editada pelo painel.

---

## Estrutura

```
src/
├── middleware.ts              # cache da edge em "/" + guarda de /admin/*
├── config.ts                  # nome do site, formatarPreco()
├── env.d.ts                   # tipos de App.SessionData + Cloudflare.Env
├── lib/
│   ├── db.ts                  # acesso ao D1 (tipado)
│   ├── env.ts                 # bindings (D1/R2) + urlMidia()
│   ├── auth.ts                # PBKDF2-SHA256 via Web Crypto
│   ├── session.ts             # cria/ler/destroi sessão do Astro
│   ├── login-guard.ts         # rate-limit do login (D1)
│   └── r2-presign.ts          # URL presigned (assinatura S3 SigV4)
├── components/
│   ├── ProductCard.astro      # card: capa, preço, Comprar
│   ├── Gallery.astro          # lightbox: swipe + vídeo sob demanda
│   └── ProductForm.astro      # formulário do produto + galeria/upload
├── layouts/
│   ├── BaseLayout.astro       # cardápio público
│   └── AdminLayout.astro      # painel
└── pages/
    ├── index.astro            # cardápio (lê do D1)
    ├── media/[...chave].ts    # fallback de mídia do R2
    └── admin/                 # login, CRUD e APIs
```

---

## Limites do plano Free (e como mitigamos)

| Limite            | Mitigação                                                |
| ----------------- | -------------------------------------------------------- |
| 10 ms de CPU/req  | Cache da edge (30s) no `/` — a maioria das visitas não executa SSR |
| 100 MB de corpo   | Vídeo vai direto ao R2 (quando presigned configurado)    |
| 100k requisições/dia | mídia com `Cache-Control: immutable` e CSS/JS cached   |

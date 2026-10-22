# Cardápio DD

Cardápio digital **web** (sem app para baixar), feito para celular. Mostra fotos em alta
qualidade e vídeos dos produtos; ao tocar em **Comprar**, o cliente vai para o link de compra
(http/https) do app de compra.

Inclui **painel administrativo** (`/admin`) com login único para cadastrar categorias,
produtos e subir fotos/vídeos — tudo sem tocar em código.

- **Stack:** Astro 7 (SSR) · Cloudflare Workers · D1 (banco) · KV (fotos/vídeos + sessão)
- **Deploy:** Git → **Workers Builds** (push = deploy automático)
- **Plano inicial:** Cloudflare Free (com cache na edge para caber no limite de CPU)

> **Por que KV e não R2?** O R2 exige assinatura com **método de pagamento**, mesmo no free
> tier. O KV funciona no free **sem cartão** — por isso a mídia mora lá. Se um dia liberar o
> R2, dá para migrar mudando só a camada de bindings (`src/lib/env.ts`).

---

## Arquitetura

```
Visitante ──► Cloudflare Workers ──► D1 (categorias/produtos/mídia/usuário)
                    │
                    ├─► Cache da edge (30s) no cardápio público "/"
                    └─► KV MEDIA (fotos e vídeos) ◄── upload do admin
                                                        │
                                              foto otimizada no navegador
                                              vídeo como corpo bruto
```

| Recurso   | Binding  | Para quê                                              |
| --------- | -------- | ----------------------------------------------------- |
| D1        | `DB`     | Categorias, produtos, galeria, usuário, tentativas    |
| KV        | `MEDIA`  | Fotos e vídeos                                        |
| KV        | `SESSION`| Sessão do login (provisionado automaticamente)        |
| Assets    | `ASSETS` | CSS/JS do build                                       |

### Rotas

- `/` — cardápio público (SSR + cache na edge)
- `/admin/login`, `/admin/criar-conta` — acesso
- `/admin`, `/admin/categorias`, `/admin/produtos`, `/admin/produtos/[id]` — gestão
- `/media/<chave>` — serve objeto do KV, com suporte a **Range** (206) para o seek do vídeo

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
> D1 e KV de verdade, use `npm run preview` (sobe o `workerd`, mesmo runtime da produção).

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

Também é gerado um **poster** do vídeo (frame ~0.5s) automaticamente no navegador.

| Tipo   | Caminho                                  | Limite por arquivo |
| ------ | ---------------------------------------- | ------------------ |
| Foto   | multipart → `/admin/api/midia/upload`    | 15 MB              |
| Vídeo  | corpo bruto → `/admin/api/midia/upload-video` | 15 MB (limite do painel: **12 MB**) |

> O vídeo vai como **corpo bruto** (sem multipart) de propósito: um arquivo grande passando
> pelo parser de multipart é caro em CPU, e o plano free do Workers tem 10ms por requisição.

Para deixar o vídeo abaixo de 12 MB:

```bash
ffmpeg -i in.mp4 -vf "scale=1280:-2" -c:v libx264 -crf 26 -preset slow \
       -movflags +faststart -an out.mp4
```

O padrão do cardápio é: a **primeira mídia** da galeria vira a capa do card.
Reordene com as setas ↑↓ ou arrastando.

Ao **tirar um item da galeria** ou **excluir um produto**, os objetos correspondentes são
apagados do KV — importante porque o plano free guarda só **1 GB** no total.

---

## Configuração

### 1. `wrangler.jsonc`

| Campo                         | O que é                                                  |
| ----------------------------- | -------------------------------------------------------- |
| `d1_databases[0].database_id` | ID real do D1 (criado no 1º deploy — ver abaixo)         |
| `kv_namespaces[0].id`         | ID do namespace KV da **sessão**                         |
| `kv_namespaces[1].id`         | ID do namespace KV da **mídia** (`MEDIA`)                |
| `vars.MEDIA_PUBLIC_BASE`      | Base externa de mídia (opcional)                         |

`MEDIA_PUBLIC_BASE`:

- **vazia** (padrão): as mídias são servidas por `/media/<chave>`, lidas do KV.
  Funciona em dev e produção, sem configuração extra.
- **preenchida**: só se um dia mover as mídias para um host externo (ex.: um CDN próprio).

### 2. Limites do KV (plano free)

| Limite             | Valor     | Efeito prático                                          |
| ------------------ | --------- | ------------------------------------------------------- |
| Armazenamento      | 1 GB      | Otimize as fotos; apague mídia que não usa              |
| Tamanho por valor  | 25 MB     | Motivo do limite de 12 MB no envio de vídeo             |
| Escritas           | 1.000/dia | Uploads são raros — sem impacto                         |
| Leituras           | 100k/dia  | Mídia usa `Cache-Control: immutable` na edge            |

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

# Sessão do login
npx wrangler kv namespace create SESSION

# Mídia (fotos e vídeos)
npx wrangler kv namespace create MEDIA
#   -> copie o id gerado para kv_namespaces[1]
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
│   ├── env.ts                 # bindings (D1/KV) + urlMidia() + validação de chave
│   ├── auth.ts                # PBKDF2-SHA256 via Web Crypto
│   ├── session.ts             # cria/ler/destroi sessão do Astro
│   ├── login-guard.ts         # rate-limit do login (D1)
│   └── media.ts               # apaga objetos do KV (evita órfãos)
├── components/
│   ├── ProductCard.astro      # card: capa, preço, Comprar
│   ├── Gallery.astro          # lightbox: swipe + vídeo sob demanda
│   └── ProductForm.astro      # formulário do produto + galeria/upload
├── layouts/
│   ├── BaseLayout.astro       # cardápio público
│   └── AdminLayout.astro      # painel
└── pages/
    ├── index.astro            # cardápio (lê do D1)
    ├── media/[...chave].ts    # serve mídia do KV (com Range/206)
    └── admin/                 # login, CRUD e APIs
```

---

## Limites do plano Free (e como mitigamos)

| Limite            | Mitigação                                                |
| ----------------- | -------------------------------------------------------- |
| 10 ms de CPU/req  | Cache da edge (30s) no `/` — a maioria das visitas não executa SSR |
| 100 MB de corpo   | Vídeo vai como corpo bruto direto ao KV (sem multipart)  |
| 100k requisições/dia | mídia com `Cache-Control: immutable` e CSS/JS cached   |
| 1 GB de KV        | otimização de foto no navegador + apagar mídia sem uso   |

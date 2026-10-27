# Preparação local

## Pré-requisitos

- **Node.js 24+** e **npm 11+** (verificado: Node 24.22.1 / npm 11.19.1).
- **Wrangler** já vem como devDependency (use `npx wrangler ...`) — não instalar global.
- Conta Cloudflare **apenas** para deploy e banco remoto (`npx wrangler login`).
- Chrome/ffmpeg **opcionais**: ffmpeg só para deixar vídeo <12 MB antes do upload (comando
  no `README.md`); nenhum navegador é necessário para rodar o projeto.

## Primeira execução

```bash
npm ci                      # instala pelo lockfile
npm run types               # gera worker-configuration.d.ts (tipos das bindings)
npm run db:apply:local      # schema + seed no D1 local (.wrangler/)
npm run db:0003:local       # coluna modalidade (aplicar depois do schema)
npm run dev                 # http://localhost:4321
```

Variáveis de ambiente: **`.dev.vars`** (gitignored, já existente localmente) contém
`AUTH_PEPPER` e `SETUP_TOKEN`. Nunca comite valores; para criar em outra máquina:

```bash
printf 'AUTH_PEPPER=%s\n' '<valor aleatório forte>' >> .dev.vars
printf 'SETUP_TOKEN=%s\n' '<código de uso único>' >> .dev.vars
```

`SETUP_TOKEN` é obrigatório para criar a primeira conta: a página `/admin/criar-conta`
pede esse código. Em produção, defina com `npx wrangler secret put SETUP_TOKEN` **antes**
do primeiro acesso; sem ele a criação de conta responde 503.

## Ambientes

- `npm run dev` (astro dev): lê `.dev.vars`, mas **não liga as bindings do Cloudflare** —
  login/D1/KV não funcionam de verdade.
- `npm run preview` (astro preview): **não injeta** `.dev.vars` no Worker.
- **Para testar o runtime real localmente:** `npx wrangler dev` (lê `.dev.vars`, serve
  `dist/` — rode `npm run build` antes). É o equivalente local da produção.
- Banco: local em `.wrangler/state` (`npm run db:apply:local`) ou remoto
  (`npm run db:apply:remote`) — **não use a produção como ambiente de teste**.

## Verificar

```bash
npm run verify              # lint + regras custom + tipos + testes + build (combinado)
```

Checagens individuais e o que cada uma prova: `docs/quality.md`. Checagens independentes de
credencial: `npm run check` e `npm run build` (rodam sem serviços externos).

## Agentes

Leia [`AGENTS.md`](../AGENTS.md); [`CLAUDE.md`](../CLAUDE.md) importa as mesmas instruções.
Integrações, escopos e evidências de setup ficam em [`setup.md`](setup.md); decisões de
produto em [`../PRODUCT.md`](../PRODUCT.md).

## Problemas conhecidos

- **`npm run preview` reclama de `AUTH_PEPPER` ausente** — causa: o astro preview não injeta
  `.dev.vars` no Worker. Correção: use `npx wrangler dev` sobre o `dist/` (ver `README.md`).
- **Botão "Comprar" leva a 404** — causa: `https://donadora.com.br` faz 301 para
  `...mandarpedido.com/site` (404), configuração externa fora do Cloudflare. Correção: ajustar
  `comprar_url` no painel quando o destino externo estiver correto.
- **Conta de demonstração não pode ser recriada sem limpar** — causa: já existe usuário.
  Correção: `DELETE FROM usuarios` no D1 remoto (procedimento no `README.md`).

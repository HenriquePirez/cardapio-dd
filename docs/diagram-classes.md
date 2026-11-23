# Diagrama de Classes — MyShelf

Visão geral das principais entidades do banco de dados e componentes do sistema.

## 1. Esquema D1 (SQLite compatível)

### `usuários`
| Campo | Tipo | Restrições |
|-------|------|------------|
| `id` | TEXT | PRIMARY KEY |
| `email` | TEXT | UNIQUE NOT NULL |
| `nome` | TEXT | NOT NULL |
| `senha_hash` | TEXT | NOT NULL |
| `criado_em` | TEXT | DEFAULT datetime('now') |

> **Autenticação**: hash PBKDF2-SHA256 (40k iterações + pepper). Pepper armazenado em segredo do Worker (`AUTH_PEPPER`). Login com 5 tentativas erradas → bloqueio 10 min (Tabela `login_tentativas`).

### `categorias` (por loja)
| Campo | Tipo | Restrições |
|-------|------|------------|
| `loja_id` | TEXT | NOT NULL + PK composta |
| `id` | TEXT | NOT NULL + PK composta |
| `nome` | TEXT | NOT NULL |
| `ordem` | INTEGER | DEFAULT 0 |
| `icone` | TEXT | — |
| `descricao` | TEXT | — |

> **Relacionamento**: `categorias` têm `PRIMARY KEY (loja_id, id)` e `FK → lojas(id) ON DELETE CASCADE`. Cada loja tem seu próprio conjunto de categorias.

### `produtos` (por loja)
| Campo | Tipo | Restrições |
|-------|------|------------|
| `loja_id` | TEXT | NOT NULL + PK composta |
| `id` | TEXT | NOT NULL + PK composta |
| `nome` | TEXT | NOT NULL |
| `preco_centavos` | INTEGER | CHECK (≥ 0) |
| `categoria_id` | TEXT | FK composta → `categorias(loja_id, id)` RESTRICT |
| `descricao` | TEXT | — |
| `destaque` | INTEGER | CHECK (0/1) |
| `ordem` | INTEGER | DEFAULT 0 |
| `comprar_url` | TEXT | — |
| `disponivel` | INTEGER | CHECK (0/1) |
| `modalidade` | TEXT | 'local' | 'retirada' | 'ambos' (DEFAULT 'ambos') |

> **Relacionamento**: `produtos` referenciam `categorias` pela chave composta e pertencem a uma única loja (`loja_id`). `produto_midia` tem `FK → produtos(loja_id, id) ON DELETE CASCADE`.

### `lojas`
| Campo | Tipo | Restrições |
|-------|------|------------|
| `id` | TEXT | PRIMARY KEY |
| `slug` | TEXT | UNIQUE |
| `usuario_id` | TEXT | FK → `usuários(id) ON DELETE SET NULL` (pode ser NULL na instalação inicial) |
| `nome` | TEXT | NOT NULL |
| `slogan` | TEXT | — |
| `descricao` | TEXT | — |
| `logo_chave` | TEXT | Chave no KV `MEDIA` |
| `cor_marca` | TEXT | DEFAULT `'#14532d'` |
| `cor_acento` | TEXT | DEFAULT `'#f97316'` |
| `tema_padrao` | TEXT | CHECK (`'claro'` | `'escuro'`) DEFAULT `'claro'` |
| `idioma_padrao` | TEXT | CHECK (`'pt'` | `'en'`) DEFAULT `'pt'` |
| `padrao` | INTEGER | CHECK (0/1) DEFAULT 0 |
| `criado_em` | TEXT | DEFAULT datetime('now') |
| `atualizado_em` | TEXT | DEFAULT datetime('now') |
| `versao` | INTEGER | DEFAULT 1 |

> **Comportamento**: `padrao = 1` identifica a loja principal (URL `/`). Outras lojas em `/loja/<slug>`. No painel, seletor altera `loja_ativa` (cookie). Toda query de categorias/produtos/mídia inclui `loja_id`.

### `produto_midia`
| Campo | Tipo | Restrições |
|-------|------|------------|
| `id` | INTEGER | AUTOINCREMENT PK |
| `loja_id` | TEXT | NOT NULL + FK → `lojas(id) ON DELETE CASCADE` |
| `produto_id` | TEXT | NOT NULL + FK composta → `produtos(loja_id, id) ON DELETE CASCADE` |
| `tipo` | TEXT | CHECK (`'imagem'` | `'video'`) |
| `url` | TEXT | NOT NULL (caminho no KV) |
| `full` | TEXT | — (full resolution image/video) |
| `poster` | TEXT | — (apenas video: thumbnail do player) |
| `alt` | TEXT | — |
| `ordem` | INTEGER | DEFAULT 0 |

> **Entrega**: `full_webp` (opcional) para navegadores que suportam WebP. Servida por `/media/<chave>` com suporte a `Range` (206) para seek de vídeo.

### `redefinicoes_senha`
| Campo | Tipo | Restrições |
|-------|------|------------|
| `id` | TEXT | PRIMARY KEY |
| `usuario_id` | TEXT | NOT NULL + FK → `usuários(id) ON DELETE CASCADE` |
| `token_hash` | TEXT | NOT NULL UNIQUE (SHA-256 do token puro) |
| `expira_em` | TEXT | NOT NULL (ISO com fuso, ex: `2026-11-23T14:30:00.000Z`) |
| `usado_em` | TEXT | — (NULL = pendente) |
| `criado_em` | TEXT | DEFAULT datetime('now') |

> **Fluxo**: Um link por usuário (o INSERT apaga pendentes anteriores). Validade 1 hora. Página `/admin/redefinir-senha?token=` pede senha antiga + nova + confirmação. Sucesso → `/admin/login?ok=redefinida`.

### `login_tentativas`
| Campo | Tipo | Restrições |
|-------|------|------------|
| `email` | TEXT | PRIMARY KEY (normalizado em minúsculas) |
| `tentativas` | INTEGER | NOT NULL DEFAULT 0 |
| `bloqueado_ate` | TEXT | — (ISO timestamp ou NULL) |

> **Proteção**: 5 falhas → `bloqueado_ate` = `now + 10 min`. Novas tentativas durante bloqueio são ignoradas. Reset após janela expirar.

---

## 2. Componentes Astro (principal)

### `src/components/ProductCard.astro`
- Recebe `compraDisponivel`, `compraUrl`, dados do produto
- Renderiza card com foto, nome, preço, CTA "Comprar"
- Hover: faixa laranja sólida (`var(--cor-preco)`) + `transform: translateY(-2px)` + sombra
- Estado indisponível: texto "Indisponível" + CTA desabilitado

### `src/components/ProductForm.astro`
- Formulário de criar/editar produto
- Campos: nome, preço, categoria, destaque, modalidade (local/retirada/ambos), galeria (foto/video)
- `accent-color: var(--cor-preco)` nos inputs type=color
- Barra de progresso circular com `linear-gradient` em `var(--cor-preco)`
- Estados: hover, focus, disabled

### `src/components/AdminSistema.astro`
- Layout do painel administrativo
- Navbar master: itens fixos **Painel** + **Perfil** (sem Produtos/Categorias/Loja/Usuários para master)
- Tabela de usuários com busca, filtro Ativos/Inativos, coluna "Papel" (Master/Loja)
- Estatísticas rápidas no topo (cards numerados)
- Confirmação "Deseja desativar?" antes de alterar status
- Toast padrão do sistema para feedback
- Estados de vazio (mensagens "Nenhum produto ainda", "Nenhuma categoria")

### `src/components/IndicadorCarregamento.astro`
- Barra amarela 3px no topo
- Ativo em submits de formulário e navegação interna

### `src/components/TemaInicial.astro`
- Aplica tema claro/escuro persistente em `localStorage` (`dd-tema`)
- Padrão: claro
- Ao escolher escuro: meta `theme-color` muda para `#11150f`
- Também salva idioma (`dd-idioma`): `pt`/`en`

### `src/components/Toast.astro`
- Padrão fixo: `position: fixed`, `right: 18px`, `bottom: 18px`
- Duas variantes: `.toast-ok` (borda esquerda `#15803d`, bg `#eef4ec`) e `.toast-erro` (borda `#b91c1c`, bg `#fdf2f2`)
- Texto `var(--adm-text)`/`var(--adm-text-dim)`
- `box-shadow: 0 10px 28px rgba(0,0,0,0.14)`
- **Regra F5**: limpeza de `?ok`/`?erro` da URL impede reexibição após refresh

### `src/components/LegalLayout.astro`
- Layout padrão para páginas legais (privacidade, termos, cookies)
- `border-left: 3px solid var(--laranja)` (ou token equivalente)
- Rodapé `.legal-rodape` com texto dim

---

## 3. Layouts

### `src/layouts/AdminLayout.astro`
- Header fixo com navegação master
- Logo MyShelf (ícone + "Admin")
- Seletor de loja (quando o usuário tem >1 loja)
- Conteúdo centralizado com `.barra-acoes` no topo
- Grade `.grade-stats`: 4 colunas desktop, 2 em mobile
- Footer legal (privacidade/termos) — exceto quando `semRodape=true`
- Responsivo: 1 coluna < 640px, 2 colunas ≥ 560px

### `src/layouts/BaseLayout.astro`
- Cardápio público
- Header com nav (itens dependem de tema/loja)
- Área de conteúdo principal
- IndicadorCarregamento incluso
- Footer com links úteis

---

## 4. Páginas Públicas

### `src/pages/index.astro`
- Cardápio da loja principal (`/`)
- Grid de categorias → cards de produtos
- CTA "Comprar" → valida `modalidade` + `comprar_url`
- Lightbox/seek para mídia (foto/video)
- Tema claro/escuro toggle no header
- Idioma pt/en no header

### `src/pages/loja/[slug].astro`
- Igual ao index, mas para loja específica
- URL `/loja/<slug>` (ex: `/loja/dona-dora-timoteo`)

---

## 5. Páginas Admin

### `src/pages/admin/login.astro`
- Layout split-screen
- Esquerda: marca MyShelf, headline "Sua loja, aberta sempre.", badge, texto explicativo
- Direita: formulário login (email + senha), toggle de senha, link "Esqueci a senha"
- Estados: erro (e-mail inexistente/hashDummy), sucesso (`?ok=redefinida`), bloqueio (10 min)
- Footer removido; centralizado; nome abaixo do ícone = "MyShelf"

### `src/pages/admin/criar-conta.astro`
- Formulário definir conta na primeira utilização
- Campos: nome, e-mail, senha (mínimo 10 caracteres)
- Após criado → login automático ou redirect para `/admin`

### `src/pages/admin/index.astro`
- Dashboard master (quando `usuario.papel = master`)
- Stats: total de lojas, total de produtos, total de usuários, faturamento/visitas
- Tabela de usuários: busca nome/e-mail, filtro Ativos/Inativos, coluna "Papel" + "Loja"
- Ações: desativar usuário (confirm + e-mail para ambos)
- Links rápidos: categorias, produtos, loja, perfil

### `src/pages/admin/produtos/index.astro`
- Lista de produtos da loja ativa
- Filtros: disponível, modalidade, busca nome
- Estados de vazio: "Nenhum produto ainda. Cadastre o primeiro →"
- Estados de filtro sem resultado: "Nenhum produto encontrado com esses critérios."

### `src/pages/admin/categorias/index.astro`
- Lista de categorias da loja
- CRUD: criar, renomear (com emoji), reordenar, excluir

### `src/pages/admin/loja/index.astro`
- Configurações da loja: nome, slogan, descrição, logo, duas cores livres (marca + acento), tema padrão, idioma padrão
- Criar nova loja para a conta

### `src/pages/admin/perfil.astro`
- Dados do usuário logado: nome, e-mail
- Botão "Alterar senha" (secundário — One Voice Rule: só um CTA amarelo por tela)
- Formulário troca de senha: exige senha atual + nova + confirmação
- Alterar e-mail: valida unicidade; sessão regenra ao trocar

### `src/pages/admin/recuperar-senha.astro`
- Página que recebe token da URL (?token=)
- Formulário: senha antiga + nova + confirmação
- Sucesso → `/admin/login?ok=redefinida`

### `src/pages/admin/trocar-loja.astro`
- Formulário GET com seletor de loja
- Atualiza cookie `loja_ativa`

---

## 6. Módulos de Apoio (lib/)

### `src/lib/db.ts`
- Todas as queries recebem `lojaId` ativo
- Prepared statements parametrizados
- Nenhum N+1; projeções explícitas
- `obterUsuarioPorId` busca por `id` (não por e-mail — bug corrigido)

### `src/lib/auth.ts`
- `hashPBKDF2(password, salt, pepper)` → hex
- `compararHash(password, hash)` → boolean
- Pepper em `AUTH_PEPPER` (secret do Worker)
- Hash dummy para e-mail inexistente (evita erro 500)

### `src/lib/session.ts`
- `criarSessao(usuarioId)` → KV `SESSION`
- `lerUsuario(Astro)` → lê session do contexto
- `destruirSessao()` → KV delete

### `src/lib/login-guard.ts`
- Rate-limit em D1 tabela `login_tentativas`
- 5 falhas → bloqueio 10 min
- Check via `SELECT tentativas, bloqueado_ate FROM login_tentativas WHERE email = ?`

### `src/lib/midia.ts`
- `apagarObjetoKV(chave)` → remove do KV `MEDIA`
- Evita órfãos na limpeza de produto

### `src/lib/env.ts`
- Valida bindings `DB`, `SESSION`, `MEDIA`, `ASSETS`
- `urlMidia(chave)` → URL pública para mídia
- Valida `GA_ID`, `META_PIXEL_ID` (se vazios, nenhum script externo)

### `src/lib/idioma.ts`
- Chaves `pt` e `en` para: login, sistema, usuários, senha, categorias, produtos
- Interface publica usa `data-i18n` nos elementos
- Tradução cobre menus, botões, avisos; nomes de categorias/produtos mantidos como cadastrados

### `src/styles/global.css`
- **Tokens de design system**: `--verde`, `--laranja`, `--bg`, `--bg-card`, `--bg-elev`, `--text`, `--text-dim`, `--radius`, `--radius-sm`, `--max`, `--pad`, `--shadow`, `--shadow-hover`
- **Tokens de botão**: `--btn-primario-bg`, `--btn-primario-bg-hover`, `--btn-primario-texto`, `--btn-local-bg`, `--btn-local-bg-hover`, `--btn-local-texto`
- **Tokens admin**: `--adm-bg`, `--adm-card`, `--adm-text`, `--adm-dim`, `--adm-label`, `--adm-border`, `--adm-input-border`, `--adm-perigo`, `--adm-perigo-borda`
- **Tokens tema escuro**: `--bg-escuro`, `--card-escuro`, `--texto-escuro`, `--texto-escuro-dim`, `--acento-escuro`
- **Derivação por loja**: `cores.ts` lê `cor_marca`/`cor_acento` do KV e gera tons de contraste automáticos

---

## 7. Regras de Segurança

| Área | Regra |
|------|-------|
| Leitura pública | Anonymous; cache edge 30s; `loja.id` pela URL; status 200 só |
| Escrita painel | GET sem sessão → redirect `/admin/login`; escritas → **401**; CSRF check em APIs |
| Autenticação | `lib/auth.ts` + rate-limit D1 + sessão KV |
| Mídia | Apenas dono da loja (via `loja_id` FK) pode upload/listar; exclusão em `lib/midia.ts` |
| Consentimento | Nenhum script externo injeta sem aceite em `ConsentimentoCookies.astro` |
| E-mail | Via Resend HTTP puro (`src/lib/email.ts`); domínio `myshelf.app.br` verificado |

---

## 8. Decisões de Design (ref do DESIGN.md)

- **North Star**: "A Vitrine Bem-Arrumada" — cada item exposto com intenção, sem poluição
- **One Voice Rule**: Amarelo MyShelf (#f9df8e) usado uma única vez por tela, em um único CTA primário
- **Flat-by-default**: Sombras só em hover/foco/dialog
- **Tipografia**: Fredoka (400/500) em quase todo o sistema; login exceção: Newsreader (headline/wordmark) + Inter (corpo, labels, CTA)
- **Raios**: --radius-xs: 9px (inputs/login), --radius-sm: 10px (botões públicos), --radius: 14px (cards), 999px (badges/pills)
- **Cores admin**: --adm-bg: #f5f6f8 (papel), --adm-text: #111827, --cor-preco: variação da marca
- **Cores público**: Verde loja #14532d, Amarelo MyShelf #f9df8e (único CTA), Azul MyShelf #9cb7d3 (secundário), Modo escuro tokens
- **Sem gradientes, neon, glassmorphism** em nenhum ponto do sistema

---

*Documento gerado a partir do esquema D1, migrações SQL e estrutura de código do projeto MyShelf.*
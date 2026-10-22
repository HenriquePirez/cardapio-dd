-- Migration inicial do cardápio-dd (Cloudflare D1 / SQLite)
-- Aplicar com: npx wrangler d1 execute cardapio-dd --file=./migrations/0001_init.sql

-- =========================================================
-- Categorias
-- =========================================================
CREATE TABLE IF NOT EXISTS categorias (
  id         TEXT PRIMARY KEY,          -- slug: "lanches", "bebidas"...
  nome       TEXT NOT NULL,
  ordem      INTEGER NOT NULL DEFAULT 0,
  icone      TEXT,
  descricao  TEXT
);

-- =========================================================
-- Produtos
-- =========================================================
CREATE TABLE IF NOT EXISTS produtos (
  id           TEXT PRIMARY KEY,        -- slug: "x-burger-classico"
  nome         TEXT NOT NULL,
  preco        REAL NOT NULL,
  categoria_id TEXT NOT NULL,
  descricao    TEXT,
  destaque     INTEGER NOT NULL DEFAULT 0,  -- 0/1 (boolean no SQLite)
  ordem        INTEGER NOT NULL DEFAULT 0,
  comprar_url  TEXT NOT NULL,
  disponivel   INTEGER NOT NULL DEFAULT 1,  -- 0/1
  criado_em    TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_destaque ON produtos (destaque);

-- =========================================================
-- Mídia dos produtos (galeria: fotos + vídeo)
-- =========================================================
CREATE TABLE IF NOT EXISTS produto_midia (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  produto_id TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('imagem', 'video')),
  -- caminho/URL no R2. Para imagem: thumbnail do card.
  url        TEXT NOT NULL,
  -- alta resolução (lightbox) — só de imagem; opcional
  full       TEXT,
  -- capa do vídeo — só de vídeo; opcional
  poster     TEXT,
  alt        TEXT,
  ordem      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (produto_id) REFERENCES produtos (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_midia_produto ON produto_midia (produto_id);

-- =========================================================
-- Usuário do admin (conta única compartilhada)
-- A senha NUNCA fica em texto puro: guardamos o hash PBKDF2.
-- formato do hash: pbkdf2$<iter>$<salt_b64>$<hash_b64>
-- =========================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id         TEXT PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  nome       TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =========================================================
-- Controle de tentativas de login (proteção contra força bruta)
-- 5 tentativas erradas -> bloqueia por 10 minutos.
-- =========================================================
CREATE TABLE IF NOT EXISTS login_tentativas (
  email      TEXT PRIMARY KEY,          -- normalizado em minúsculas
  tentativas INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate TEXT
);

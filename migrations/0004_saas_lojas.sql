-- 0004: multi-loja (SaaS) + preço em centavos.
-- Aplica sobre o schema 0001-0003. Dados atuais viram a loja "dona-dora".
-- Migração de rebuild: renomeia as tabelas antigas, cria as novas e copia.
-- Aplicar só com backup: npx wrangler d1 export cardapio-dd --local --output=backup.sql

-- =========================================================
-- Lojas (tenant)
-- =========================================================
CREATE TABLE lojas (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  usuario_id    TEXT,                    -- dono; NULL em instalação sem conta ainda
  nome          TEXT NOT NULL,
  slogan        TEXT,
  descricao     TEXT,
  logo_chave    TEXT,                    -- chave no KV MEDIA
  cor_marca     TEXT NOT NULL DEFAULT '#14532d',
  cor_acento    TEXT NOT NULL DEFAULT '#f97316',
  tema_padrao   TEXT NOT NULL DEFAULT 'claro' CHECK (tema_padrao IN ('claro', 'escuro')),
  idioma_padrao TEXT NOT NULL DEFAULT 'pt' CHECK (idioma_padrao IN ('pt', 'en')),
  padrao        INTEGER NOT NULL DEFAULT 0 CHECK (padrao IN (0, 1)),
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  versao        INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
);

CREATE INDEX idx_lojas_usuario ON lojas (usuario_id);

INSERT INTO lojas
  (id, slug, usuario_id, nome, slogan, descricao, cor_marca, cor_acento, padrao)
VALUES
  (
    'dona-dora',
    'dona-dora',
    (SELECT id FROM usuarios ORDER BY criado_em ASC LIMIT 1),
    'Dona Dôra',
    'O sabor que começa pelos olhos',
    'Pizzas artesanais, massas e lasanhas — veja as fotos e faça seu pedido.',
    '#14532d',
    '#f97316',
    1
  );

-- =========================================================
-- Rebuild de categorias/produtos/mídia com loja_id
-- =========================================================
ALTER TABLE produto_midia RENAME TO produto_midia_old;
ALTER TABLE produtos RENAME TO produtos_old;
ALTER TABLE categorias RENAME TO categorias_old;

DROP INDEX IF EXISTS idx_produtos_categoria;
DROP INDEX IF EXISTS idx_produtos_destaque;
DROP INDEX IF EXISTS idx_midia_produto;

CREATE TABLE categorias (
  loja_id   TEXT NOT NULL,
  id        TEXT NOT NULL,
  nome      TEXT NOT NULL,
  ordem     INTEGER NOT NULL DEFAULT 0,
  icone     TEXT,
  descricao TEXT,
  PRIMARY KEY (loja_id, id),
  FOREIGN KEY (loja_id) REFERENCES lojas (id) ON DELETE CASCADE
);

CREATE TABLE produtos (
  loja_id         TEXT NOT NULL,
  id              TEXT NOT NULL,
  nome            TEXT NOT NULL,
  preco_centavos  INTEGER NOT NULL CHECK (preco_centavos >= 0),
  categoria_id    TEXT NOT NULL,
  descricao       TEXT,
  destaque        INTEGER NOT NULL DEFAULT 0 CHECK (destaque IN (0, 1)),
  ordem           INTEGER NOT NULL DEFAULT 0,
  comprar_url     TEXT,
  disponivel      INTEGER NOT NULL DEFAULT 1 CHECK (disponivel IN (0, 1)),
  modalidade      TEXT NOT NULL DEFAULT 'ambos'
                  CHECK (modalidade IN ('local', 'retirada', 'ambos')),
  criado_em       TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (loja_id, id),
  FOREIGN KEY (loja_id) REFERENCES lojas (id) ON DELETE CASCADE,
  FOREIGN KEY (loja_id, categoria_id)
    REFERENCES categorias (loja_id, id) ON DELETE RESTRICT
);

CREATE TABLE produto_midia (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  loja_id    TEXT NOT NULL,
  produto_id TEXT NOT NULL,
  tipo       TEXT NOT NULL CHECK (tipo IN ('imagem', 'video')),
  url        TEXT NOT NULL,
  full       TEXT,
  poster     TEXT,
  alt        TEXT,
  ordem      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (loja_id) REFERENCES lojas (id) ON DELETE CASCADE,
  FOREIGN KEY (loja_id, produto_id)
    REFERENCES produtos (loja_id, id) ON DELETE CASCADE
);

INSERT INTO categorias (loja_id, id, nome, ordem, icone, descricao)
SELECT 'dona-dora', id, nome, ordem, icone, descricao FROM categorias_old;

INSERT INTO produtos
  (loja_id, id, nome, preco_centavos, categoria_id, descricao, destaque, ordem,
   comprar_url, disponivel, modalidade, criado_em, atualizado_em)
SELECT
  'dona-dora', id, nome, CAST(ROUND(preco * 100) AS INTEGER), categoria_id,
  descricao, destaque, ordem, comprar_url, disponivel, modalidade,
  criado_em, atualizado_em
FROM produtos_old;

INSERT INTO produto_midia (id, loja_id, produto_id, tipo, url, full, poster, alt, ordem)
SELECT
  m.id, 'dona-dora', m.produto_id, m.tipo, m.url, m.full, m.poster, m.alt, m.ordem
FROM produto_midia_old m
JOIN produtos_old p ON p.id = m.produto_id;

DROP TABLE produto_midia_old;
DROP TABLE produtos_old;
DROP TABLE categorias_old;

CREATE INDEX idx_categorias_loja ON categorias (loja_id, ordem);
CREATE INDEX idx_produtos_loja ON produtos (loja_id, disponivel, ordem);
CREATE INDEX idx_produtos_categoria ON produtos (loja_id, categoria_id);
CREATE INDEX idx_produtos_destaque ON produtos (loja_id, destaque);
CREATE INDEX idx_midia_produto ON produto_midia (loja_id, produto_id, ordem);

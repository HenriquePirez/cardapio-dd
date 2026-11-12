-- 0006: redefinição de senha por e-mail (fluxo "esqueci a senha").
-- Guarda só o SHA-256 do token; o token em texto puro existe apenas no link
-- enviado por e-mail. Um token por vez por usuário (o INSERT apaga pendentes).
-- Aplicar: npx wrangler d1 execute DB --file=./migrations/0006_redefinicao_senha.sql [--remote]

CREATE TABLE IF NOT EXISTS redefinicoes_senha (
  id         TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em  TEXT NOT NULL,             -- ISO com fuso (new Date().toISOString())
  usado_em   TEXT,                      -- NULL = pendente
  criado_em  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_redefinicoes_usuario ON redefinicoes_senha (usuario_id);

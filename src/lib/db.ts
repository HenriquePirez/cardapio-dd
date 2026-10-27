/**
 * Camada de acesso ao banco (D1).
 *
 * Os bindings vêm do wrangler.jsonc:
 *   DB     -> D1 (categorias, produtos, mídia, usuário)
 *   MEDIA  -> KV (fotos e vídeos) — ver env.ts
 *
 * No Cloudflare, obtenha via:
 *   import { env } from 'cloudflare:workers';  -> env.DB
 */

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
  icone: string | null;
  descricao: string | null;
}

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria_id: string;
  descricao: string | null;
  destaque: number;
  ordem: number;
  comprar_url: string;
  disponivel: number;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Midia {
  id: number;
  produto_id: string;
  tipo: 'imagem' | 'video';
  url: string;
  full: string | null;
  poster: string | null;
  alt: string | null;
  ordem: number;
}

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  senha_hash: string;
  criado_em?: string;
}

/** Binding do D1 — tipagem estrutural mínima (evita depender dos tipos gerados). */
export interface D1Like {
  prepare(query: string): D1StmtLike;
}
export interface D1StmtLike {
  bind(...values: unknown[]): D1StmtLike;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number } }>;
}

// ---------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------

export async function listarCategorias(db: D1Like): Promise<Categoria[]> {
  const { results } = await db
    .prepare('SELECT * FROM categorias ORDER BY ordem ASC, nome ASC')
    .all<Categoria>();
  return results;
}

export async function obterCategoria(db: D1Like, id: string): Promise<Categoria | null> {
  return db.prepare('SELECT * FROM categorias WHERE id = ?').bind(id).first<Categoria>();
}

export async function salvarCategoria(
  db: D1Like,
  c: Pick<Categoria, 'id' | 'nome' | 'ordem' | 'icone' | 'descricao'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO categorias (id, nome, ordem, icone, descricao)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, ordem = excluded.ordem,
         icone = excluded.icone, descricao = excluded.descricao`,
    )
    .bind(c.id, c.nome, c.ordem, c.icone ?? null, c.descricao ?? null)
    .run();
}

export async function excluirCategoria(db: D1Like, id: string): Promise<void> {
  await db.prepare('DELETE FROM categorias WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------

/** Cardápio público: categorias + produtos disponíveis (com mídia ordenada). */
export async function cardapioCompleto(db: D1Like): Promise<{
  categorias: Categoria[];
  produtos: (Produto & { midia: Midia[] })[];
}> {
  const categorias = await listarCategorias(db);

  const { results: produtos } = await db
    .prepare('SELECT * FROM produtos WHERE disponivel = 1 ORDER BY ordem ASC, nome ASC')
    .all<Produto>();

  const ids = produtos.map((p) => p.id);
  const midias = ids.length ? await listarMidiasPorProdutos(db, ids) : [];

  const porProduto = new Map<string, Midia[]>();
  for (const m of midias) {
    const arr = porProduto.get(m.produto_id) ?? [];
    arr.push(m);
    porProduto.set(m.produto_id, arr);
  }

  return {
    categorias,
    produtos: produtos.map((p) => ({ ...p, midia: porProduto.get(p.id) ?? [] })),
  };
}

export async function listarMidiasPorProdutos(
  db: D1Like,
  produtoIds: string[],
): Promise<Midia[]> {
  if (!produtoIds.length) return [];
  const placeholders = produtoIds.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT * FROM produto_midia WHERE produto_id IN (${placeholders})
       ORDER BY ordem ASC, id ASC`,
    )
    .bind(...produtoIds)
    .all<Midia>();
  return results;
}

export async function listarProdutos(db: D1Like): Promise<(Produto & { midia: Midia[] })[]> {
  const { results: produtos } = await db
    .prepare('SELECT * FROM produtos ORDER BY ordem ASC, nome ASC')
    .all<Produto>();
  const midias = await listarMidiasPorProdutos(db, produtos.map((p) => p.id));
  const porProduto = new Map<string, Midia[]>();
  for (const m of midias) {
    const arr = porProduto.get(m.produto_id) ?? [];
    arr.push(m);
    porProduto.set(m.produto_id, arr);
  }
  return produtos.map((p) => ({ ...p, midia: porProduto.get(p.id) ?? [] }));
}

export async function obterProduto(
  db: D1Like,
  id: string,
): Promise<(Produto & { midia: Midia[] }) | null> {
  const produto = await db.prepare('SELECT * FROM produtos WHERE id = ?').bind(id).first<Produto>();
  if (!produto) return null;
  const midia = await listarMidiasPorProdutos(db, [id]);
  return { ...produto, midia };
}

export async function salvarProduto(
  db: D1Like,
  p: Omit<Produto, 'criado_em' | 'atualizado_em'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO produtos (id, nome, preco, categoria_id, descricao, destaque, ordem, comprar_url, disponivel)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nome = excluded.nome, preco = excluded.preco,
         categoria_id = excluded.categoria_id, descricao = excluded.descricao,
         destaque = excluded.destaque, ordem = excluded.ordem,
         comprar_url = excluded.comprar_url, disponivel = excluded.disponivel,
         atualizado_em = datetime('now')`,
    )
    .bind(
      p.id,
      p.nome,
      p.preco,
      p.categoria_id,
      p.descricao ?? null,
      p.destaque,
      p.ordem,
      p.comprar_url,
      p.disponivel,
    )
    .run();
}

export async function excluirProduto(db: D1Like, id: string): Promise<void> {
  await db.prepare('DELETE FROM produtos WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------
// Mídia
// ---------------------------------------------------------------

export async function adicionarMidia(
  db: D1Like,
  m: Omit<Midia, 'id'>,
): Promise<number> {
  const { results } = await db
    .prepare(
      `INSERT INTO produto_midia (produto_id, tipo, url, full, poster, alt, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(m.produto_id, m.tipo, m.url, m.full ?? null, m.poster ?? null, m.alt ?? null, m.ordem)
    .all<{ id: number }>();
  return results[0]?.id ?? 0;
}

export async function atualizarMidia(
  db: D1Like,
  id: number,
  m: { url: string; full: string | null; poster: string | null; alt: string | null; ordem: number },
): Promise<void> {
  await db
    .prepare(
      `UPDATE produto_midia SET url = ?, full = ?, poster = ?, alt = ?, ordem = ? WHERE id = ?`,
    )
    .bind(m.url, m.full, m.poster, m.alt, m.ordem, id)
    .run();
}

export async function excluirMidia(db: D1Like, id: number): Promise<void> {
  await db.prepare('DELETE FROM produto_midia WHERE id = ?').bind(id).run();
}

// ---------------------------------------------------------------
// Usuário (conta única compartilhada)
// ---------------------------------------------------------------

export async function obterUsuario(db: D1Like, email: string): Promise<Usuario | null> {
  return db
    .prepare('SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE')
    .bind(email)
    .first<Usuario>();
}

export async function contarUsuarios(db: D1Like): Promise<number> {
  const r = await db.prepare('SELECT COUNT(*) AS n FROM usuarios').first<{ n: number }>();
  return r?.n ?? 0;
}

/**
 * Cria o primeiro usuário do painel de forma atômica.
 * Retorna false quando já existe alguém — dois POSTs simultâneos não
 * conseguem mais sobrescrever a conta um do outro.
 */
export async function criarPrimeiroUsuario(
  db: D1Like,
  u: { id: string; email: string; nome: string; senha_hash: string },
): Promise<boolean> {
  const resultado = await db
    .prepare(
      `INSERT INTO usuarios (id, email, nome, senha_hash)
       SELECT ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM usuarios)`,
    )
    .bind(u.id, u.email, u.nome, u.senha_hash)
    .run();
  return (resultado.meta?.changes ?? 0) > 0;
}

export async function trocarSenha(db: D1Like, email: string, senhaHash: string): Promise<void> {
  await db
    .prepare('UPDATE usuarios SET senha_hash = ? WHERE email = ? COLLATE NOCASE')
    .bind(senhaHash, email)
    .run();
}

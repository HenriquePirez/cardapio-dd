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

export interface Loja {
  id: string;
  slug: string;
  usuario_id: string | null;
  nome: string;
  slogan: string | null;
  descricao: string | null;
  logo_chave: string | null;
  cor_marca: string;
  cor_acento: string;
  tema_padrao: 'claro' | 'escuro';
  idioma_padrao: 'pt' | 'en';
  padrao: number;
  criado_em?: string;
  atualizado_em?: string;
  versao: number;
}

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
  preco_centavos: number;
  categoria_id: string;
  descricao: string | null;
  destaque: number;
  ordem: number;
  comprar_url: string;
  disponivel: number;
  /** 'local' | 'retirada' | 'ambos' (ver src/lib/pedido.ts). */
  modalidade: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Midia {
  id: number;
  produto_id: string;
  tipo: 'imagem' | 'video';
  url: string;
  full: string | null;
  fullWebp: string | null;
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
  ativo?: number | null;
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

export async function listarCategorias(db: D1Like, lojaId: string): Promise<Categoria[]> {
  const { results } = await db
    .prepare('SELECT * FROM categorias WHERE loja_id = ? ORDER BY ordem ASC, nome ASC')
    .bind(lojaId)
    .all<Categoria>();
  return results;
}

export async function obterCategoria(
  db: D1Like,
  lojaId: string,
  id: string,
): Promise<Categoria | null> {
  return db
    .prepare('SELECT * FROM categorias WHERE loja_id = ? AND id = ?')
    .bind(lojaId, id)
    .first<Categoria>();
}

export async function salvarCategoria(
  db: D1Like,
  lojaId: string,
  c: Pick<Categoria, 'id' | 'nome' | 'ordem' | 'icone' | 'descricao'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO categorias (loja_id, id, nome, ordem, icone, descricao)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(loja_id, id) DO UPDATE SET
         nome = excluded.nome, ordem = excluded.ordem,
         icone = excluded.icone, descricao = excluded.descricao`,
    )
    .bind(lojaId, c.id, c.nome, c.ordem, c.icone ?? null, c.descricao ?? null)
    .run();
}

/** Exclui a categoria. Retorna false quando ainda há produtos nela. */
export async function excluirCategoria(
  db: D1Like,
  lojaId: string,
  id: string,
): Promise<boolean> {
  const r = await db
    .prepare(
      `DELETE FROM categorias
       WHERE loja_id = ? AND id = ?
         AND NOT EXISTS (
           SELECT 1 FROM produtos WHERE loja_id = ? AND categoria_id = ?
         )`,
    )
    .bind(lojaId, id, lojaId, id)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

// ---------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------

/** Cardápio público: categorias + produtos disponíveis (com mídia ordenada). */
export async function cardapioCompleto(
  db: D1Like,
  lojaId: string,
): Promise<{
  categorias: Categoria[];
  produtos: (Produto & { midia: Midia[] })[];
}> {
  const categorias = await listarCategorias(db, lojaId);

  const { results: produtos } = await db
    .prepare(
      'SELECT * FROM produtos WHERE loja_id = ? AND disponivel = 1 ORDER BY ordem ASC, nome ASC',
    )
    .bind(lojaId)
    .all<Produto>();

  const ids = produtos.map((p) => p.id);
  const midias = ids.length ? await listarMidiasPorProdutos(db, lojaId, ids) : [];

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
  lojaId: string,
  produtoIds: string[],
): Promise<Midia[]> {
  if (!produtoIds.length) return [];
  const placeholders = produtoIds.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT id, produto_id, tipo, url, full, full_webp AS fullWebp, poster, alt, ordem
       FROM produto_midia
       WHERE loja_id = ? AND produto_id IN (${placeholders})
       ORDER BY ordem ASC, id ASC`,
    )
    .bind(lojaId, ...produtoIds)
    .all<Midia>();
  return results;
}

export async function listarProdutos(
  db: D1Like,
  lojaId: string,
): Promise<(Produto & { midia: Midia[] })[]> {
  const { results: produtos } = await db
    .prepare('SELECT * FROM produtos WHERE loja_id = ? ORDER BY ordem ASC, nome ASC')
    .bind(lojaId)
    .all<Produto>();
  const midias = await listarMidiasPorProdutos(db, lojaId, produtos.map((p) => p.id));
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
  lojaId: string,
  id: string,
): Promise<(Produto & { midia: Midia[] }) | null> {
  const produto = await db
    .prepare('SELECT * FROM produtos WHERE loja_id = ? AND id = ?')
    .bind(lojaId, id)
    .first<Produto>();
  if (!produto) return null;
  const midia = await listarMidiasPorProdutos(db, lojaId, [id]);
  return { ...produto, midia };
}

export async function salvarProduto(
  db: D1Like,
  lojaId: string,
  p: Omit<Produto, 'criado_em' | 'atualizado_em'>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO produtos (loja_id, id, nome, preco_centavos, categoria_id, descricao, destaque, ordem, comprar_url, disponivel, modalidade)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(loja_id, id) DO UPDATE SET
         nome = excluded.nome, preco_centavos = excluded.preco_centavos,
         categoria_id = excluded.categoria_id, descricao = excluded.descricao,
         destaque = excluded.destaque, ordem = excluded.ordem,
         comprar_url = excluded.comprar_url, disponivel = excluded.disponivel,
         modalidade = excluded.modalidade,
         atualizado_em = datetime('now')`,
    )
    .bind(
      lojaId,
      p.id,
      p.nome,
      p.preco_centavos,
      p.categoria_id,
      p.descricao ?? null,
      p.destaque,
      p.ordem,
      p.comprar_url,
      p.disponivel,
      p.modalidade,
    )
    .run();
}

export async function excluirProduto(db: D1Like, lojaId: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM produtos WHERE loja_id = ? AND id = ?').bind(lojaId, id).run();
}

// ---------------------------------------------------------------
// Mídia
// ---------------------------------------------------------------

export async function adicionarMidia(
  db: D1Like,
  lojaId: string,
  m: Omit<Midia, 'id'>,
): Promise<number> {
  const { results } = await db
    .prepare(
      `INSERT INTO produto_midia (loja_id, produto_id, tipo, url, full, full_webp, poster, alt, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      lojaId,
      m.produto_id,
      m.tipo,
      m.url,
      m.full ?? null,
      m.fullWebp ?? null,
      m.poster ?? null,
      m.alt ?? null,
      m.ordem,
    )
    .all<{ id: number }>();
  return results[0]?.id ?? 0;
}

export async function atualizarMidia(
  db: D1Like,
  lojaId: string,
  id: number,
  m: {
    url: string;
    full: string | null;
    fullWebp: string | null;
    poster: string | null;
    alt: string | null;
    ordem: number;
  },
): Promise<void> {
  await db
    .prepare(
      `UPDATE produto_midia SET url = ?, full = ?, full_webp = ?, poster = ?, alt = ?, ordem = ?
       WHERE loja_id = ? AND id = ?`,
    )
    .bind(m.url, m.full, m.fullWebp, m.poster, m.alt, m.ordem, lojaId, id)
    .run();
}

export async function excluirMidia(db: D1Like, lojaId: string, id: number): Promise<void> {
  await db.prepare('DELETE FROM produto_midia WHERE loja_id = ? AND id = ?').bind(lojaId, id).run();
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

/** Verifica se o usuário é o admin master (único que gerencia outros usuários). */
export async function ehUsuarioMaster(db: D1Like, usuarioId: string): Promise<boolean> {
  const r = await db
    .prepare('SELECT master FROM usuarios WHERE id = ?')
    .bind(usuarioId)
    .first<{ master: number | null }>();
  return (r?.master ?? 0) === 1;
}

/** Linhas antigas não tinham a coluna `ativo`; ausência significa ativo. */
export function usuarioPodeAcessar(usuario: { ativo?: number | null }): boolean {
  return (usuario.ativo ?? 1) !== 0;
}

/** Estado de acesso usado pelo middleware em uma única consulta. */
export async function estadoAcesso(
  db: D1Like,
  usuarioId: string,
): Promise<{ master: boolean; ativo: boolean; senhaHash: string | null }> {
  const r = await db
    .prepare('SELECT master, ativo, senha_hash FROM usuarios WHERE id = ?')
    .bind(usuarioId)
    .first<{ master: number | null; ativo: number | null; senha_hash: string | null }>();
  return {
    master: (r?.master ?? 0) === 1,
    ativo: r !== null && usuarioPodeAcessar(r),
    senhaHash: r?.senha_hash ?? null,
  };
}

export interface UsuarioResumo {
  id: string;
  email: string;
  nome: string;
  criado_em?: string | null;
  aceite_em?: string | null;
  aceite_versao?: string | null;
  qtd_lojas: number;
  ativo: number;
  master: number;
}

/** Ativa ou desativa um usuário (soft delete). */
export async function alternarUsuarioAtivo(db: D1Like, usuarioId: string, ativo: boolean): Promise<void> {
  await db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').bind(ativo ? 1 : 0, usuarioId).run();
}

/** Verifica se já existe usuário com esse e-mail (unique). */
export async function existeUsuarioComEmail(db: D1Like, email: string): Promise<boolean> {
  const { results } = await db
    .prepare('SELECT 1 AS encontrado FROM usuarios WHERE email = ?')
    .bind(email)
    .all<{ encontrado: number }>();
  return (results?.length ?? 0) > 0;
}

/** Insere um novo usuário (id gerado pela aplicação — sessão referencia-o). */
export async function criarUsuario(
  db: D1Like,
  dados: { email: string; nome: string; senha_hash: string; master?: boolean },
): Promise<void> {
  await db
    .prepare('INSERT INTO usuarios (id, email, nome, senha_hash, master) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), dados.email, dados.nome, dados.senha_hash, dados.master ? 1 : 0)
    .run();
}

/** Lista todos os usuários com a quantidade de lojas de cada um. */
export async function listarUsuariosComLojas(db: D1Like): Promise<UsuarioResumo[]> {
  const { results } = await db
    .prepare(
      `SELECT u.id, u.email, u.nome, u.criado_em, u.aceite_em, u.aceite_versao, u.ativo, u.master,
              COUNT(l.id) AS qtd_lojas
       FROM usuarios u
       LEFT JOIN lojas l ON l.usuario_id = u.id
       GROUP BY u.id, u.email, u.nome, u.criado_em, u.aceite_em, u.aceite_versao, u.ativo, u.master
       ORDER BY u.ativo DESC, u.master DESC, u.criado_em DESC`,
    )
    .all<UsuarioResumo>();
  return results ?? [];
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

/** Busca usuário pelo id (perfil e redefinição de senha). */
export async function obterUsuarioPorId(db: D1Like, id: string): Promise<Usuario | null> {
  return db.prepare('SELECT * FROM usuarios WHERE id = ?').bind(id).first<Usuario>();
}

/** true se outro usuário já usa este e-mail (troca de e-mail no perfil). */
export async function emailJaUsado(
  db: D1Like,
  email: string,
  excetoId: string,
): Promise<boolean> {
  const r = await db
    .prepare('SELECT 1 FROM usuarios WHERE email = ? COLLATE NOCASE AND id <> ? LIMIT 1')
    .bind(email, excetoId)
    .first();
  return r !== null;
}

/** Atualiza nome e/ou e-mail do usuário (só o que vier preenchido). */
export async function atualizarPerfil(
  db: D1Like,
  usuarioId: string,
  dados: { nome?: string; email?: string },
): Promise<void> {
  const campos: string[] = [];
  const valores: unknown[] = [];
  if (dados.nome !== undefined) {
    campos.push('nome = ?');
    valores.push(dados.nome);
  }
  if (dados.email !== undefined) {
    campos.push('email = ?');
    valores.push(dados.email);
  }
  if (!campos.length) return;
  valores.push(usuarioId);
  await db
    .prepare(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`)
    .bind(...valores)
    .run();
}

// ---------------------------------------------------------------
// Redefinição de senha (fluxo "esqueci a senha")
// ---------------------------------------------------------------

export interface Redefinicao {
  id: string;
  usuario_id: string;
  token_hash: string;
  expira_em: string;
  usado_em: string | null;
  criado_em: string;
}

/**
 * Grava uma redefinição nova invalidando as pendentes anteriores do mesmo
 * usuário: só existe um link válido por vez.
 */
export async function criarRedefinicao(
  db: D1Like,
  r: { id: string; usuarioId: string; tokenHash: string; expiraEm: string },
): Promise<void> {
  await db
    .prepare('DELETE FROM redefinicoes_senha WHERE usuario_id = ? AND usado_em IS NULL')
    .bind(r.usuarioId)
    .run();
  await db
    .prepare(
      `INSERT INTO redefinicoes_senha (id, usuario_id, token_hash, expira_em)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(r.id, r.usuarioId, r.tokenHash, r.expiraEm)
    .run();
}

/** Última redefinição pendente do usuário (rate-limit: uma a cada N minutos). */
export async function ultimaRedefinicaoPendente(
  db: D1Like,
  usuarioId: string,
): Promise<{ criado_em: string } | null> {
  return db
    .prepare(
      `SELECT criado_em FROM redefinicoes_senha
       WHERE usuario_id = ? AND usado_em IS NULL
       ORDER BY criado_em DESC LIMIT 1`,
    )
    .bind(usuarioId)
    .first<{ criado_em: string }>();
}

/** Busca a redefinição pelo hash do token vindo do link do e-mail. */
export async function obterRedefinicao(
  db: D1Like,
  tokenHash: string,
): Promise<Redefinicao | null> {
  return db
    .prepare('SELECT * FROM redefinicoes_senha WHERE token_hash = ?')
    .bind(tokenHash)
    .first<Redefinicao>();
}

/**
 * Marca como usada só se ainda estiver pendente (UPDATE condicional).
 * Dois POSTs simultâneos com o mesmo link: só um devolve true.
 */
export async function consumirRedefinicao(db: D1Like, id: string): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE redefinicoes_senha SET usado_em = datetime('now')
       WHERE id = ? AND usado_em IS NULL`,
    )
    .bind(id)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

// ---------------------------------------------------------------
// Lojas
// ---------------------------------------------------------------

export async function obterLojaPadrao(db: D1Like): Promise<Loja | null> {
  return db
    .prepare('SELECT * FROM lojas ORDER BY padrao DESC, criado_em ASC LIMIT 1')
    .first<Loja>();
}

export async function obterLojaPorSlug(db: D1Like, slug: string): Promise<Loja | null> {
  return db.prepare('SELECT * FROM lojas WHERE slug = ?').bind(slug).first<Loja>();
}

export async function listarLojasDoUsuario(db: D1Like, usuarioId: string): Promise<Loja[]> {
  const { results } = await db
    .prepare('SELECT * FROM lojas WHERE usuario_id = ? ORDER BY padrao DESC, criado_em ASC')
    .bind(usuarioId)
    .all<Loja>();
  return results;
}

export async function obterLojaDoUsuario(
  db: D1Like,
  usuarioId: string,
  lojaId: string,
): Promise<Loja | null> {
  return db
    .prepare('SELECT * FROM lojas WHERE id = ? AND usuario_id = ?')
    .bind(lojaId, usuarioId)
    .first<Loja>();
}

export async function criarLoja(
  db: D1Like,
  dados: {
    id: string;
    slug: string;
    usuarioId: string;
    nome: string;
    slogan?: string | null;
    descricao?: string | null;
    corMarca?: string;
    corAcento?: string;
    temaPadrao?: 'claro' | 'escuro';
    idiomaPadrao?: 'pt' | 'en';
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO lojas
         (id, slug, usuario_id, nome, slogan, descricao, cor_marca, cor_acento, tema_padrao, idioma_padrao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      dados.id,
      dados.slug,
      dados.usuarioId,
      dados.nome,
      dados.slogan ?? null,
      dados.descricao ?? null,
      dados.corMarca ?? '#14532d',
      dados.corAcento ?? '#f97316',
      dados.temaPadrao ?? 'claro',
      dados.idiomaPadrao ?? 'pt',
    )
    .run();
}

export async function salvarLoja(
  db: D1Like,
  usuarioId: string,
  lojaId: string,
  dados: {
    nome: string;
    slogan: string | null;
    descricao: string | null;
    corMarca: string;
    corAcento: string;
    temaPadrao: 'claro' | 'escuro';
    idiomaPadrao: 'pt' | 'en';
  },
): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE lojas SET
         nome = ?, slogan = ?, descricao = ?,
         cor_marca = ?, cor_acento = ?,
         tema_padrao = ?, idioma_padrao = ?,
         atualizado_em = datetime('now'), versao = versao + 1
       WHERE id = ? AND usuario_id = ?`,
    )
    .bind(
      dados.nome,
      dados.slogan,
      dados.descricao,
      dados.corMarca,
      dados.corAcento,
      dados.temaPadrao,
      dados.idiomaPadrao,
      lojaId,
      usuarioId,
    )
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

export async function salvarLogoLoja(
  db: D1Like,
  usuarioId: string,
  lojaId: string,
  chave: string | null,
): Promise<boolean> {
  const r = await db
    .prepare(
      `UPDATE lojas SET logo_chave = ?, atualizado_em = datetime('now'), versao = versao + 1
       WHERE id = ? AND usuario_id = ?`,
    )
    .bind(chave, lojaId, usuarioId)
    .run();
  return (r.meta?.changes ?? 0) > 0;
}

/**
 * Garante uma loja para o usuário: adota uma loja sem dono (instalação antiga)
 * ou cria uma nova. Usado depois da criação da primeira conta e no painel.
 */
export async function garantirLojaDoUsuario(db: D1Like, usuarioId: string): Promise<Loja> {
  const existentes = await listarLojasDoUsuario(db, usuarioId);
  if (existentes[0]) return existentes[0];

  const semDono = await db
    .prepare('SELECT * FROM lojas WHERE usuario_id IS NULL ORDER BY criado_em ASC LIMIT 1')
    .first<Loja>();
  if (semDono) {
    await db
      .prepare('UPDATE lojas SET usuario_id = ? WHERE id = ?')
      .bind(usuarioId, semDono.id)
      .run();
    return { ...semDono, usuario_id: usuarioId };
  }

  const id = crypto.randomUUID();
  const loja: Loja = {
    id,
    slug: `loja-${id.slice(0, 8)}`,
    usuario_id: usuarioId,
    nome: 'Minha loja',
    slogan: null,
    descricao: null,
    logo_chave: null,
    cor_marca: '#14532d',
    cor_acento: '#f97316',
    tema_padrao: 'claro',
    idioma_padrao: 'pt',
    padrao: 1,
    versao: 1,
  };
  await criarLoja(db, {
    id: loja.id,
    slug: loja.slug,
    usuarioId,
    nome: loja.nome,
  });
  return loja;
}

/** Registra o aceite dos documentos legais no login/criação de conta. */
export async function registrarAceite(
  db: D1Like,
  usuarioId: string,
  versao: string,
): Promise<void> {
  await db
    .prepare("UPDATE usuarios SET aceite_em = datetime('now'), aceite_versao = ? WHERE id = ?")
    .bind(versao, usuarioId)
    .run();
}

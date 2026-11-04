import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import type { D1Like } from './db';
import {
  criarLoja,
  listarCategorias,
  listarLojasDoUsuario,
  listarProdutos,
  obterLojaPadrao,
  obterLojaPorSlug,
  obterProduto,
  salvarCategoria,
  salvarProduto,
  excluirCategoria,
} from './db';

/** Adaptador mínimo do D1 sobre o SQLite nativo do Node (para testar o SQL real). */
function bancoLocal(): D1Like {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const dir = join(process.cwd(), 'migrations');
  const arquivos = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const arquivo of arquivos) {
    if (arquivo.startsWith('0004')) {
      // A conta já existiria quando a 0004 rodasse em produção.
      sqlite
        .prepare('INSERT INTO usuarios (id, email, nome, senha_hash) VALUES (?, ?, ?, ?)')
        .run('dono-teste', 'dono@exemplo.com', 'Dono', 'hash');
    }
    sqlite.exec(readFileSync(join(dir, arquivo), 'utf8'));
  }

  return {
    prepare(sql: string) {
      const stmt = sqlite.prepare(sql);
      let params: unknown[] = [];
      const api = {
        bind(...novos: unknown[]) {
          params = novos;
          return api;
        },
        async all<T>() {
          return { results: stmt.all(...(params as never[])) as T[] };
        },
        async first<T>() {
          return (stmt.get(...(params as never[])) as T | undefined) ?? null;
        },
        async run() {
          const r = stmt.run(...(params as never[]));
          return { meta: { changes: Number(r.changes) } };
        },
      };
      return api;
    },
  } as unknown as D1Like;
}

function produto(id: string, categoriaId: string) {
  return {
    id,
    nome: id,
    preco_centavos: 1990,
    categoria_id: categoriaId,
    descricao: null,
    destaque: 0,
    ordem: 0,
    comprar_url: 'https://exemplo.com/comprar',
    disponivel: 1,
    modalidade: 'ambos' as const,
  };
}

describe('banco multi-loja', () => {
  it('aplica 0001-0004 e migra os dados para a loja dona-dora', async () => {
    const db = bancoLocal();
    const loja = await obterLojaPadrao(db);
    expect(loja?.slug).toBe('dona-dora');

    const produtos = await listarProdutos(db, 'dona-dora');
    expect(produtos.length).toBeGreaterThan(0);
    expect(produtos[0]?.preco_centavos).toBeGreaterThan(0);
    expect((await obterLojaPorSlug(db, 'dona-dora'))?.id).toBe('dona-dora');
  });

  it('isola categorias e produtos por loja, inclusive com o mesmo id', async () => {
    const db = bancoLocal();
    const dono = 'dono-teste';

    await criarLoja(db, {
      id: 'loja-timoteo',
      slug: 'dona-dora-timoteo',
      usuarioId: dono,
      nome: 'Dona Dôra Timóteo',
    });
    await salvarCategoria(db, 'loja-timoteo', {
      id: 'pizzas-gigante',
      nome: 'Pizzas gigantes de Timóteo',
      ordem: 1,
      icone: null,
      descricao: null,
    });
    await salvarProduto(db, 'loja-timoteo', produto('marguerita', 'pizzas-gigante'));

    const categoriasTimoteo = await listarCategorias(db, 'loja-timoteo');
    expect(categoriasTimoteo.map((c) => c.id)).toEqual(['pizzas-gigante']);

    const produtosDonaDora = await listarProdutos(db, 'dona-dora');
    expect(produtosDonaDora.some((p) => p.id === 'marguerita')).toBe(false);

    expect(await obterProduto(db, 'dona-dora', 'marguerita')).toBeNull();
    expect(await obterProduto(db, 'loja-timoteo', 'marguerita')).not.toBeNull();

    // Mesmo id pode existir nas duas lojas, com valores diferentes.
    await salvarProduto(db, 'dona-dora', { ...produto('marguerita', 'lanches'), preco_centavos: 2500 });
    expect((await obterProduto(db, 'dona-dora', 'marguerita'))?.preco_centavos).toBe(2500);
    expect((await obterProduto(db, 'loja-timoteo', 'marguerita'))?.preco_centavos).toBe(1990);
  });

  it('não exclui categoria com produtos e escopa a remoção', async () => {
    const db = bancoLocal();
    await criarLoja(db, {
      id: 'loja-b',
      slug: 'loja-b',
      usuarioId: 'dono-teste',
      nome: 'Loja B',
    });
    await salvarCategoria(db, 'loja-b', {
      id: 'bebidas',
      nome: 'Bebidas B',
      ordem: 1,
      icone: null,
      descricao: null,
    });
    await salvarProduto(db, 'loja-b', produto('suco', 'bebidas'));

    expect(await excluirCategoria(db, 'loja-b', 'bebidas')).toBe(false);
    // A categoria homônima da outra loja continua intacta.
    expect((await listarCategorias(db, 'dona-dora')).some((c) => c.id === 'bebidas')).toBe(true);
  });

  it('lista só as lojas do dono', async () => {
    const db = bancoLocal();
    const dono = 'dono-teste';
    await criarLoja(db, {
      id: 'loja-c',
      slug: 'loja-c',
      usuarioId: dono,
      nome: 'Loja C',
    });
    const lojas = await listarLojasDoUsuario(db, dono);
    expect(lojas.map((l) => l.slug)).toContain('dona-dora');
    expect(lojas.map((l) => l.slug)).toContain('loja-c');
  });
});

/**
 * POST /admin/api/produtos/excluir
 * Remove o produto, suas mídias (CASCADE) e os objetos no KV.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { excluirProduto, listarMidiasPorProdutos } from '../../../../lib/db';
import { apagarObjetos, caminhosDaMidia } from '../../../../lib/midia';
import { invalidarCardapio } from '../../../../lib/cache';
import { mesmaOrigem } from '../../../../lib/http';


export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const id = String(form.get('id') ?? '').trim().toLowerCase();
  if (id) {
    const d1 = db();
    // Coleta os caminhos ANTES do CASCADE apagar as linhas.
    const midias = await listarMidiasPorProdutos(d1, [id]);
    await excluirProduto(d1, id);
    await apagarObjetos(midias.flatMap(caminhosDaMidia));
    // O cardápio público ("/") é cacheado na edge: purga para a mudança aparecer na hora.
    await invalidarCardapio(ctx.request);
  }

  return new Response(null, {
    status: 303,
    headers: { Location: '/admin/produtos?msg=excluido' },
  });
};

/**
 * POST /admin/api/categorias/excluir
 * Remove uma categoria. Produtos vinculados são removidos também
 * (ON DELETE CASCADE) — o formulário já pede confirmação.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { excluirCategoria, listarProdutos } from '../../../../lib/db';
import { invalidarCardapio } from '../../../../lib/cache';
import { mesmaOrigem } from '../../../../lib/http';


function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const id = String(form.get('id') ?? '').trim().toLowerCase();
  if (!id) return voltar('/admin/categorias');

  const d1 = db();
  const loja = ctx.locals.loja!;

  // Produtos ficariam órfãos: recusa se houver vínculo sem cascade garantido
  const produtos = await listarProdutos(d1, loja.id);
  const vinculados = produtos.filter((p) => p.categoria_id === id);
  if (vinculados.length > 0) {
    const msg = encodeURIComponent(
      `A categoria tem ${vinculados.length} produto(s). Mova ou exclua-os antes.`,
    );
    return voltar(`/admin/categorias?msg=erro&erro=${msg}`);
  }

  const removida = await excluirCategoria(d1, loja.id, id);
  if (!removida) return voltar('/admin/categorias?msg=erro');
  // O cardápio público ("/") é cacheado na edge: purga para a mudança aparecer na hora.
  await invalidarCardapio(ctx.request, loja.slug);
  return voltar('/admin/categorias?msg=excluida');
};

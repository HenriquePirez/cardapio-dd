/**
 * POST /admin/api/produtos/excluir
 * Remove o produto e suas mídias (CASCADE).
 * (Arquivos no R2 são mantidos por segurança — ver README.)
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { excluirProduto } from '../../../../lib/db';

function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
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
  if (id) await excluirProduto(db(), id);

  return new Response(null, {
    status: 303,
    headers: { Location: '/admin/produtos?msg=excluido' },
  });
};

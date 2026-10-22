/**
 * POST /admin/api/categorias/salvar
 * Cria ou atualiza uma categoria.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { salvarCategoria, obterCategoria } from '../../../../lib/db';

const SLUG = /^[a-z0-9-]+$/;

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

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
  const idOriginal = String(form.get('id_original') ?? '').trim().toLowerCase();
  const nome = String(form.get('nome') ?? '').trim();
  const icone = String(form.get('icone') ?? '').trim();
  const descricao = String(form.get('descricao') ?? '').trim();
  const ordem = Number(form.get('ordem') ?? 0);

  if (!SLUG.test(id)) return voltar('/admin/categorias?erro=slug');
  if (!nome) return voltar('/admin/categorias?erro=nome');

  const d1 = db();

  // Mudou o slug? Opcionalmente rebatemos os produtos vinculados para
  // não deixar órfãos. (Mantemos simples: só renomeia a categoria.)
  if (idOriginal && idOriginal !== id) {
    const existente = await obterCategoria(d1, id);
    if (existente) return voltar('/admin/categorias?editar=' + encodeURIComponent(idOriginal));
    await d1
      .prepare('UPDATE produtos SET categoria_id = ? WHERE categoria_id = ?')
      .bind(id, idOriginal)
      .run();
    await d1.prepare('DELETE FROM categorias WHERE id = ?').bind(idOriginal).run();
  } else {
    const existente = await obterCategoria(d1, id);
    if (!existente && idOriginal) {
      // era inédito e agora quer usar um slug que já existe
      return voltar('/admin/categorias?editar=' + encodeURIComponent(idOriginal));
    }
  }

  await salvarCategoria(d1, {
    id,
    nome,
    icone: icone || null,
    descricao: descricao || null,
    ordem: Number.isFinite(ordem) ? ordem : 0,
  });

  return voltar('/admin/categorias?msg=ok');
};

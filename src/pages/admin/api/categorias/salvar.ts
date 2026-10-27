/**
 * POST /admin/api/categorias/salvar
 * Cria ou atualiza uma categoria.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { salvarCategoria, obterCategoria } from '../../../../lib/db';
import { invalidarCardapio } from '../../../../lib/cache';
import { normalizarIcone } from '../../../../lib/icone';

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
  // A miniatura é um quadrado de 52px: cabem no máximo 2 emojis.
  // Valor legado fora da lista é preservado quando o select não mudou.
  const iconeEnviado = String(form.get('icone') ?? '').trim();
  const iconeOriginal = String(form.get('icone_original') ?? '').trim();
  const icone = iconeEnviado === iconeOriginal ? iconeOriginal : normalizarIcone(iconeEnviado);
  const descricao = String(form.get('descricao') ?? '').trim();
  const ordem = Number(form.get('ordem') ?? 0);

  if (!SLUG.test(id)) return voltar('/admin/categorias?erro=slug');
  if (!nome) return voltar('/admin/categorias?erro=nome');

  const d1 = db();

  // Mudou o slug? Rebatemos os produtos vinculados para não deixar órfãos.
  // A ordem importa: a categoria NOVA precisa existir antes do UPDATE, senão o
  // FK (produtos.categoria_id -> categorias.id) rejeita a mudança.
  if (idOriginal && idOriginal !== id) {
    const existente = await obterCategoria(d1, id);
    if (existente) return voltar('/admin/categorias?editar=' + encodeURIComponent(idOriginal));

    // 1) cria já a categoria com o novo slug
    await salvarCategoria(d1, {
      id,
      nome,
      icone: icone || null,
      descricao: descricao || null,
      ordem: Number.isFinite(ordem) ? ordem : 0,
    });

    // 2) move os produtos para o novo slug
    await d1
      .prepare('UPDATE produtos SET categoria_id = ? WHERE categoria_id = ?')
      .bind(id, idOriginal)
      .run();

    // 3) remove a categoria antiga (sem produtos apontando para ela)
    await d1.prepare('DELETE FROM categorias WHERE id = ?').bind(idOriginal).run();

    // O cardápio público ("/") é cacheado na edge: purga para a mudança aparecer na hora.
    await invalidarCardapio(ctx.request);
    return voltar('/admin/categorias?msg=ok');
  }

  const existente = await obterCategoria(d1, id);
  if (!existente && idOriginal) {
    // era inédito e agora quer usar um slug que já existe
    return voltar('/admin/categorias?editar=' + encodeURIComponent(idOriginal));
  }

  await salvarCategoria(d1, {
    id,
    nome,
    icone: icone || null,
    descricao: descricao || null,
    ordem: Number.isFinite(ordem) ? ordem : 0,
  });

  // O cardápio público ("/") é cacheado na edge: purga para a mudança aparecer na hora.
  await invalidarCardapio(ctx.request);

  return voltar('/admin/categorias?msg=ok');
};

/**
 * POST /admin/api/loja/criar
 * Cria outra loja para o usuário logado e a torna a loja ativa.
 */
import type { APIRoute } from 'astro';
import { db } from '../../../../lib/env';
import { criarLoja, listarLojasDoUsuario } from '../../../../lib/db';
import { lerUsuario } from '../../../../lib/session';
import { mesmaOrigem } from '../../../../lib/http';

const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/;

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const usuario = await lerUsuario(ctx);
  if (!usuario) return ctx.redirect('/admin/login', 303);

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const nome = String(form.get('nome') ?? '').trim();
  const slug = String(form.get('slug') ?? '').trim().toLowerCase();
  if (!nome) return ctx.redirect('/admin/loja?erro=nome#nova', 303);
  if (!SLUG.test(slug)) return ctx.redirect('/admin/loja?erro=slug#nova', 303);

  const d1 = db();
  const existentes = await listarLojasDoUsuario(d1, usuario.id);
  if (existentes.some((l) => l.slug === slug)) {
    return ctx.redirect('/admin/loja?erro=slug#nova', 303);
  }

  const id = crypto.randomUUID();
  try {
    await criarLoja(d1, { id, slug, usuarioId: usuario.id, nome: nome.slice(0, 80) });
  } catch {
    // UNIQUE(slug) ou corrida entre duas abas
    return ctx.redirect('/admin/loja?erro=slug#nova', 303);
  }

  ctx.cookies.set('loja_ativa', id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return ctx.redirect('/admin/loja?ok=criada', 303);
};

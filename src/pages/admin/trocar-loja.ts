/**
 * GET /admin/trocar-loja?slug=<slug>
 * Define a loja ativa do painel (cookie). Só aceita loja do próprio usuário.
 */
import type { APIRoute } from 'astro';
import { db } from '../../lib/env';
import { listarLojasDoUsuario } from '../../lib/db';
import { lerUsuario } from '../../lib/session';

export const GET: APIRoute = async (ctx) => {
  const usuario = await lerUsuario(ctx);
  if (!usuario) return ctx.redirect('/admin/login', 303);

  const slug = ctx.url.searchParams.get('slug') ?? '';
  const lojas = await listarLojasDoUsuario(db(), usuario.id);
  const loja = lojas.find((l) => l.slug === slug);
  if (!loja) return ctx.redirect('/admin', 303);

  ctx.cookies.set('loja_ativa', loja.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return ctx.redirect('/admin', 303);
};

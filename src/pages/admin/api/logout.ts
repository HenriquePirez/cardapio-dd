/**
 * POST /admin/api/logout
 * Encerra a sessão do painel.
 */
import type { APIRoute } from 'astro';
import { destruirSessao } from '../../../lib/session';
import { mesmaOrigem } from '../../../lib/http';


export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) {
    return new Response('Origem inválida.', { status: 403 });
  }
  await destruirSessao(ctx);
  return ctx.redirect('/admin/login', 303);
};

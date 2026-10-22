/**
 * POST /admin/api/logout
 * Encerra a sessão do painel.
 */
import type { APIRoute } from 'astro';
import { destruirSessao } from '../../../lib/session';

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
  if (!mesmaOrigem(ctx.request)) {
    return new Response('Origem inválida.', { status: 403 });
  }
  await destruirSessao(ctx);
  return ctx.redirect('/admin/login', 303);
};

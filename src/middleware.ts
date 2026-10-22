/**
 * Middleware global.
 *
 * 1) Cardápio público ("/") -> cache na edge. Isso evita executar o SSR
 *    a cada visita e mantém a página dentro do limite de 10ms de CPU do
 *    Workers Free. TTL curto: mudanças do admin aparecem em ~30s.
 *
 * 2) Painel "/admin/*" -> exige sessão. Sem sessão, redireciona pro login
 *    (ou responde 401 em escritas). Não há roles: logado = acesso total.
 */
import { defineMiddleware } from 'astro:middleware';
import { lerUsuario } from './lib/session';

// Rotas do painel que funcionam sem login
const PUBLICAS_ADMIN = new Set([
  '/admin/login',
  '/admin/criar-conta',
  '/admin/api/login',
  '/admin/api/criar-conta',
]);

const CACHE_SEGUNDOS = 30;

/**
 * Cache padrão da edge (Cache API do Workers).
 * O tipo DOM de `CacheStorage` não expõe `.default`, por isso o cast.
 */
function cachePadrao(): Cache | undefined {
  try {
    return (caches as unknown as { default?: Cache }).default;
  } catch {
    return undefined;
  }
}

async function respondeuCache(ctx: { request: Request; url: URL }): Promise<Response | null> {
  // Só cacheamos o cardápio público
  if (ctx.url.pathname !== '/') return null;
  // Nunca cacheia respostas de erro
  try {
    const cache = cachePadrao();
    if (!cache) return null;
    // Chave estável por URL (sem headers variáveis)
    const chave = new Request(ctx.url.toString(), { method: 'GET' });
    return (await cache.match(chave)) ?? null;
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const caminho = ctx.url.pathname;

  // ---------------------------------------------------------------
  // Cardápio público com cache na edge
  // ---------------------------------------------------------------
  if (caminho === '/') {
    const emCache = await respondeuCache(ctx);
    if (emCache) return emCache;

    const resposta = await next();

    if (resposta.status === 200) {
      // Clona para poder ler o corpo E armazenar
      const paraCache = resposta.clone();
      const headers = new Headers(paraCache.headers);
      headers.set('Cache-Control', `public, s-maxage=${CACHE_SEGUNDOS}, stale-while-revalidate=60`);
      const cacheavel = new Response(paraCache.body, {
        status: paraCache.status,
        statusText: paraCache.statusText,
        headers,
      });

      try {
        const cache = cachePadrao();
        const chave = new Request(ctx.url.toString(), { method: 'GET' });
        if (cache) {
          // waitUntil: não segura a resposta do usuário
          ctx.locals.cfContext?.waitUntil?.(cache.put(chave, cacheavel.clone()));
        }
      } catch {
        /* cache é otimização, não crítico */
      }

      return new Response(resposta.body, {
        status: resposta.status,
        statusText: resposta.statusText,
        headers: new Headers([
          ...[...resposta.headers.entries()],
          ['Cache-Control', `public, s-maxage=${CACHE_SEGUNDOS}, stale-while-revalidate=60`],
        ]),
      });
    }

    return resposta;
  }

  // ---------------------------------------------------------------
  // Proteção do painel
  // ---------------------------------------------------------------
  if (!caminho.startsWith('/admin')) return next();

  const jaLogado = (await lerUsuario(ctx)) !== null;
  if (jaLogado) return next();

  if (PUBLICAS_ADMIN.has(caminho)) return next();

  // Escritas sem sessão -> 401 (não redireciona AJAX/fetch)
  if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
    return new Response('Não autenticado.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Cookie' },
    });
  }

  const destino = `/admin/login?prox=${encodeURIComponent(caminho + ctx.url.search)}`;
  return ctx.redirect(destino, 302);
});

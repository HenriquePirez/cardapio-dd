/**
 * Middleware global.
 *
 * 1) Cardápio público ("/") -> cache na edge. Isso evita executar o SSR
 *    a cada visita e mantém a página dentro do limite de 10ms de CPU do
 *    Workers Free. TTL curto: mudanças do admin aparecem em ~30s.
 *
 * 2) Painel "/admin/*" -> exige sessão. Sem sessão, redireciona pro login
 *    (ou responde 401 em escritas). Não há roles: logado = acesso total.
 *
 * 3) Cabeçalhos de segurança em toda resposta.
 */
import type { APIContext, MiddlewareNext } from 'astro';
import { defineMiddleware } from 'astro:middleware';
import { lerUsuario } from './lib/session';
import { chaveCardapio } from './lib/cache';

// Rotas do painel que funcionam sem login
const PUBLICAS_ADMIN = new Set([
  '/admin/login',
  '/admin/criar-conta',
  '/admin/api/login',
  '/admin/api/criar-conta',
]);

const CACHE_SEGUNDOS = 30;

/**
 * CSP com 'unsafe-inline' porque o Astro gera scripts inline de hidratação.
 * Sem nonce/hash isto continua bloqueando script externo e injeção de origem
 * desconhecida. shortcut: nonce por resposta, quando houver build com hash.
 */
const CSP = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const CABECALHOS: Array<[string, string]> = [
  ['Content-Security-Policy', CSP],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Strict-Transport-Security', 'max-age=15552000; includeSubDomains'],
];

function comCabecalhos(resposta: Response): Response {
  const headers = new Headers(resposta.headers);
  for (const [nome, valor] of CABECALHOS) {
    if (!headers.has(nome)) headers.set(nome, valor);
  }
  return new Response(resposta.body, {
    status: resposta.status,
    statusText: resposta.statusText,
    headers,
  });
}

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

async function tratar(ctx: APIContext, next: MiddlewareNext): Promise<Response> {
  const caminho = ctx.url.pathname;

  // ---------------------------------------------------------------
  // Cardápio público com cache na edge
  // ---------------------------------------------------------------
  if (caminho === '/') {
    // A chave é a URL raiz, sem query: "/?qualquer" não cria variante órfã
    // e a invalidação do admin (src/lib/cache.ts) acerta sempre.
    const chave = chaveCardapio(ctx.url);
    try {
      const emCache = await cachePadrao()?.match(chave);
      if (emCache) return emCache;
    } catch {
      /* cache é otimização, não crítico */
    }

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

  // Nenhuma página do painel pode ser guardada por proxy/navegador compartilhado.
  const semCache = (r: Response): Response => {
    const headers = new Headers(r.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('Vary', 'Cookie');
    return new Response(r.body, { status: r.status, statusText: r.statusText, headers });
  };

  const jaLogado = (await lerUsuario(ctx)) !== null;
  if (jaLogado) return semCache(await next());

  if (PUBLICAS_ADMIN.has(caminho)) return semCache(await next());

  // Escritas sem sessão -> 401 (não redireciona AJAX/fetch)
  if (ctx.request.method !== 'GET' && ctx.request.method !== 'HEAD') {
    return new Response('Não autenticado.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Cookie' },
    });
  }

  const destino = `/admin/login?prox=${encodeURIComponent(caminho + ctx.url.search)}`;
  return ctx.redirect(destino, 302);
}

export const onRequest = defineMiddleware(async (ctx, next) => comCabecalhos(await tratar(ctx, next)));

/**
 * GET /media/<chave>
 *
 * Fallback: serve objetos do R2 quando MEDIA_PUBLIC_BASE não está configurada.
 *
 * Comportamento das URLs do cardápio:
 *  - MEDIA_PUBLIC_BASE definida (domínio do R2) -> URL aponta direto pra CDN
 *    (recomendado em produção: mais rápido e não passa pelo Worker)
 *  - sem base -> cai aqui, e o Worker lê do R2
 *
 * Isso faz o dev local e a produção funcionarem sem configuração extra.
 */
import type { APIRoute } from 'astro';
import { r2 } from '../../lib/env';

// Chaves que servimos (mesmas geradas pelo upload do admin)
const PREFIXOS_PERMITIDOS = ['fotos/', 'videos/'];

export const GET: APIRoute = async (ctx) => {
  const chave = (ctx.params.chave ?? '').replace(/^\/+/, '');

  if (!chave || chave.includes('..') || chave.includes('\0')) {
    return new Response('Chave inválida.', { status: 400 });
  }
  if (!PREFIXOS_PERMITIDOS.some((p) => chave.startsWith(p))) {
    return new Response('Não encontrado.', { status: 404 });
  }

  let objeto;
  try {
    objeto = await r2().get(chave);
  } catch {
    return new Response('Erro ao ler o armazenamento.', { status: 500 });
  }

  if (!objeto) return new Response('Não encontrado.', { status: 404 });

  const headers = new Headers({
    'Content-Type': objeto.httpMetadata?.contentType ?? tipoPorExtensao(chave),
    // Mídia é imutável por chave (já tem timestamp): cache agressivo
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  });

  return new Response(objeto.body as unknown as ReadableStream, { headers });
};

function tipoPorExtensao(chave: string): string {
  const ext = chave.split('.').pop()?.toLowerCase() ?? '';
  const mapa: Record<string, string> = {
    webp: 'image/webp',
    avif: 'image/avif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };
  return mapa[ext] ?? 'application/octet-stream';
}

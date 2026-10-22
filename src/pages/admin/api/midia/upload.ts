/**
 * POST /admin/api/midia/upload
 *
 * Envia mídia PELO Worker para o R2. Uso:
 *  - Foto: campos "arquivo" (thumb) + "full" (alta resolução) + "alt"
 *          -> cria dois objetos e devolve url/full
 *  - Poster de vídeo: campos "arquivo" + "chave"
 *          -> grava no objeto indicado (chave pré-assinada pelo presign)
 *
 * Vídeos grandes NÃO passam por aqui — vão direto ao R2 (ver presign.ts).
 */
import type { APIRoute } from 'astro';
import { r2 } from '../../../../lib/env';

function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function limparNome(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return base || 'arquivo';
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const arquivo = form.get('arquivo');
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return new Response('Nenhum arquivo recebido.', { status: 400 });
  }

  const bucket = r2();
  const selo = Date.now();

  // --- Caso 1: poster de vídeo (chave explícita) ------------------------
  const chave = form.get('chave');
  if (typeof chave === 'string' && chave.trim()) {
    const alvo = chave.trim().replace(/^\/+/, '');
    if (alvo.includes('..')) return new Response('Chave inválida.', { status: 400 });

    await bucket.put(alvo, arquivo, {
      httpMetadata: { contentType: arquivo.type || 'image/webp' },
    });
    return json({ url: alvo, full: alvo, alt: String(form.get('alt') ?? '') });
  }

  // --- Caso 2: foto (thumb + full) -------------------------------------
  const full = form.get('full');
  const nomeBase = limparNome(arquivo.name);
  const thumbKey = `fotos/${selo}-${nomeBase.replace(/\.[a-z0-9]+$/i, '')}.webp`;

  await bucket.put(thumbKey, arquivo, {
    httpMetadata: { contentType: arquivo.type || 'image/webp' },
  });

  let fullKey = thumbKey;
  if (full instanceof File && full.size > 0) {
    fullKey = `fotos/${selo}-${nomeBase.replace(/\.[a-z0-9]+$/i, '')}-full.jpg`;
    await bucket.put(fullKey, full, {
      httpMetadata: { contentType: full.type || 'image/jpeg' },
    });
  }

  return json({
    url: thumbKey,
    full: fullKey,
    alt: String(form.get('alt') ?? ''),
  });
};

function json(dados: unknown): Response {
  return new Response(JSON.stringify(dados), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

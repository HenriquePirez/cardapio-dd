/**
 * POST /admin/api/midia/upload-video
 *
 * Envia VÍDEO para o KV com corpo bruto (sem multipart).
 *
 * Por que corpo bruto: um vídeo de vários MB passaria pelo parser de
 * multipart/form-data, que é caro em CPU — e o plano free do Workers tem
 * limite de 10ms de CPU por requisição. Aqui lemos os bytes direto.
 *
 * Headers:
 *   Content-Type      -> video/mp4 | video/webm | video/quicktime
 *   X-Original-Name   -> nome original (usado só para gerar a chave)
 *
 * Devolve: { url: "<chave>", contentType }
 */
import type { APIRoute } from 'astro';
import { kvMidia, nomeSeguro, LIMITE_ARQUIVO } from '../../../../lib/env';

const TIPOS_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime'];

function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function json(dados: unknown, status = 200): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const brutoTipo = ctx.request.headers.get('content-type') ?? '';
  const contentType = (brutoTipo.split(';')[0] ?? '').trim();
  if (!TIPOS_VIDEO.includes(contentType)) {
    return json({ erro: `Tipo de vídeo não suportado: ${contentType || '(vazio)'}` }, 415);
  }

  const nomeOriginal = ctx.request.headers.get('x-original-name') ?? 'video.mp4';
  const tamanho = Number(ctx.request.headers.get('content-length') ?? '0');
  if (Number.isFinite(tamanho) && tamanho > LIMITE_ARQUIVO) {
    return json(
      { erro: `Vídeo maior que ${Math.round(LIMITE_ARQUIVO / 1024 / 1024)} MB. Comprima antes de enviar.` },
      413,
    );
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await ctx.request.arrayBuffer();
  } catch {
    return json({ erro: 'Falha ao ler o arquivo.' }, 400);
  }

  if (bytes.byteLength === 0) return json({ erro: 'Arquivo vazio.' }, 400);
  if (bytes.byteLength > LIMITE_ARQUIVO) {
    return json(
      { erro: `Vídeo maior que ${Math.round(LIMITE_ARQUIVO / 1024 / 1024)} MB.` },
      413,
    );
  }

  const extensao = (nomeOriginal.match(/\.[a-z0-9]+$/i)?.[0] || '.mp4').toLowerCase();
  const chave = `videos/${Date.now()}-${nomeSeguro(nomeOriginal).replace(/\.[a-z0-9]+$/i, '')}${extensao}`;

  await kvMidia().put(chave, bytes, { httpMetadata: { contentType } });

  return json({ url: chave, contentType, bytes: bytes.byteLength });
};

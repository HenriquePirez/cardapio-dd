/**
 * POST /admin/api/midia/upload
 *
 * Envia FOTO ou POSTER para o KV.
 *
 *  - Foto: campos "arquivo" (thumbnail) + "full" (alta resolução) + "alt"
 *          -> grava dois objetos e devolve url/full
 *  - Poster de vídeo: campos "arquivo" + "chave"
 *          -> grava no objeto indicado (mesma raiz do vídeo)
 *
 * A conversão/otimização (WebP, redimensionamento) já acontece NO NAVEGADOR
 * antes do envio — aqui só gravamos os bytes no KV.
 *
 * VíDEO não passa por aqui (corpo grande demais para multipart):
 * ver /admin/api/midia/upload-video, que recebe corpo bruto.
 */
import type { APIRoute } from 'astro';
import {
  kvMidia,
  chaveValida,
  nomeSeguro,
  LIMITE_ARQUIVO,
  TIPOS_ACEITOS,
} from '../../../../lib/env';

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
  if (arquivo.size > LIMITE_ARQUIVO) {
    return json({ erro: `Arquivo maior que ${Math.round(LIMITE_ARQUIVO / 1024 / 1024)} MB.` }, 413);
  }

  const tipo = arquivo.type || 'application/octet-stream';
  if (!TIPOS_ACEITOS.includes(tipo as (typeof TIPOS_ACEITOS)[number])) {
    return json({ erro: `Formato não suportado: ${tipo}` }, 415);
  }

  const kv = kvMidia();
  const bytes = await arquivo.arrayBuffer();

  // --- Caso 1: poster de vídeo (chave explícita) -------------------------
  const chave = form.get('chave');
  if (typeof chave === 'string' && chave.trim()) {
    const alvo = chave.trim().replace(/^\/+/, '');
    if (!chaveValida(alvo)) return json({ erro: 'Chave inválida.' }, 400);

    await kv.put(alvo, bytes, { httpMetadata: { contentType: tipo } });
    return json({ url: alvo, full: alvo, alt: String(form.get('alt') ?? '') });
  }

  // --- Caso 2: foto (thumbnail + full) ----------------------------------
  // O navegador já converteu: "arquivo" = WebP, "full" = JPEG.
  const base = `${Date.now()}-${nomeSeguro(arquivo.name).replace(/\.[a-z0-9]+$/i, '')}`;
  const thumbKey = `fotos/${base}.webp`;

  await kv.put(thumbKey, bytes, { httpMetadata: { contentType: 'image/webp' } });

  let fullKey = thumbKey;
  const full = form.get('full');
  if (full instanceof File && full.size > 0 && full.size <= LIMITE_ARQUIVO) {
    fullKey = `fotos/${base}-full.jpg`;
    // Confia no tipo do cliente só se ele estiver na allowlist de imagens;
    // qualquer outro vira octet-stream (não executável no mesmo origin).
    const tipoImagem =
      full.type.startsWith('image/') && (TIPOS_ACEITOS as readonly string[]).includes(full.type);
    await kv.put(fullKey, await full.arrayBuffer(), {
      httpMetadata: { contentType: tipoImagem ? full.type : 'application/octet-stream' },
    });
  }

  return json({ url: thumbKey, full: fullKey, alt: String(form.get('alt') ?? '') });
};

/**
 * POST /admin/api/midia/presign
 * Corpo (text/plain): nome sugerido do arquivo de vídeo.
 *
 * Devolve uma URL pré-assinada para o navegador enviar o vídeo DIRETO ao R2.
 * Se as credenciais S3 não estiverem configuradas, responde 501 e o cliente
 * usa o envio pelo Worker (upload.ts) como alternativa.
 */
import type { APIRoute } from 'astro';
import { presignDisponivel, gerarUrlPresigned } from '../../../../lib/r2-presign';

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
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  if (!presignDisponivel()) {
    return new Response(
      'Credenciais R2 (S3) não configuradas. Usando envio alternativo.',
      { status: 501 },
    );
  }

  const bruto = (await ctx.request.text()).trim();
  const nome = bruto || `video-${Date.now()}.mp4`;
  const ext = (nome.match(/\.[a-z0-9]+$/i)?.[0] || '.mp4').toLowerCase();
  const contentType = ext === '.webm' ? 'video/webm' : ext === '.mov' ? 'video/quicktime' : 'video/mp4';

  const chave = `videos/${Date.now()}-${slug(nome)}`;
  const posterKey = chave.replace(/\.[a-z0-9]+$/i, '') + '-poster.webp';

  try {
    const uploadUrl = await gerarUrlPresigned(chave, contentType);
    return json({ uploadUrl, key: chave, posterKey });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : 'Erro ao assinar URL', { status: 500 });
  }
};

function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'arquivo'
  );
}

function json(dados: unknown): Response {
  return new Response(JSON.stringify(dados), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

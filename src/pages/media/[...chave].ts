/**
 * GET /media/<chave>
 *
 * Serve um objeto de mídia guardado no KV (fotos e vídeos enviados pelo painel).
 *
 * - Suporta requisições Range (206), essencial para o seek do vídeo no <video>.
 * - Cache agressivo: cada chave já tem timestamp, então o conteúdo é imutável.
 * - Só aceita chaves sob os prefixos autorizados (fotos/ e videos/) e bloqueia
 *   path traversal.
 *
 * Observação: arquivos de exemplo em /public/media/ têm prioridade (servidos
 * como assets estáticos antes de chegar aqui).
 */
import type { APIRoute } from 'astro';
import {
  kvMidia,
  chaveValida,
  tipoPorExtensao,
  type MetaMidia,
} from '../../lib/env';

export const GET: APIRoute = async (ctx) => {
  const chave = decodeURIComponent(ctx.params.chave ?? '').replace(/^\/+/, '');

  if (!chaveValida(chave)) {
    return new Response('Chave inválida.', { status: 400 });
  }

  let valor: ArrayBuffer | null = null;
  let contentType = '';
  try {
    const kv = kvMidia();
    const r = await kv.getWithMetadata<MetaMidia>(chave, 'arrayBuffer');
    valor = r.value;
    contentType = r.metadata?.httpMetadata?.contentType ?? '';
  } catch {
    return new Response('Erro ao ler o armazenamento.', { status: 500 });
  }

  if (!valor) return new Response('Não encontrado.', { status: 404 });

  const tamanho = valor.byteLength;
  const tipo = contentType || tipoPorExtensao(chave);

  // Cabeçalhos comuns (a chave já contém timestamp -> imutável)
  const base = {
    'Content-Type': tipo,
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': '*',
  } as const;

  // ---- Suporte a Range (necessário para seek de vídeo) -------------------
  const faixa = ctx.request.headers.get('Range');
  if (faixa) {
    const parsed = lerRange(faixa, tamanho);
    if (parsed) {
      const { inicio, fim } = parsed;
      const fatia = valor.slice(inicio, fim + 1);
      return new Response(fatia, {
        status: 206,
        headers: {
          ...base,
          'Content-Range': `bytes ${inicio}-${fim}/${tamanho}`,
          'Content-Length': String(fim - inicio + 1),
        },
      });
    }
    // Sintaxe de Range inválida -> ignora e devolve o arquivo inteiro
  }

  return new Response(valor, {
    status: 200,
    headers: { ...base, 'Content-Length': String(tamanho) },
  });
};

/** Interpreta um header Range (só "bytes=a-b", "bytes=a-" e "bytes=-n"). */
function lerRange(header: string, tamanho: number): { inicio: number; fim: number } | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;

  let inicio: number;
  let fim: number;

  if (m[1] === '') {
    // Últimos N bytes ("bytes=-500")
    const n = Number(m[2]);
    if (!Number.isFinite(n) || n <= 0) return null;
    inicio = Math.max(0, tamanho - n);
    fim = tamanho - 1;
  } else {
    inicio = Number(m[1]);
    fim = m[2] === '' ? tamanho - 1 : Number(m[2]);
  }

  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return null;
  if (inicio < 0 || inicio >= tamanho || fim < inicio) return null;
  return { inicio, fim: Math.min(fim, tamanho - 1) };
}

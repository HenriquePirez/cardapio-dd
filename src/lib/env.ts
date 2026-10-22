/**
 * Acesso centralizado aos bindings do Cloudflare (D1 e KV).
 *
 * Em SSR (rotas do cardápio e do admin) o `env` é lido do módulo
 * `cloudflare:workers`, que o adapter do Astro injeta em runtime.
 */
import { env } from 'cloudflare:workers';
import type { D1Like } from './db';

/**
 * Tipos estruturais mínimos do KV, para não depender dos tipos gerados.
 * A mídia usa KV (e não R2) porque o R2 exige assinatura com cartão.
 */
export interface KvLike {
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string): Promise<string | null>;
  getWithMetadata<T = unknown>(
    key: string,
    type: 'arrayBuffer',
  ): Promise<{ value: ArrayBuffer | null; metadata: T | null }>;
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob,
    options?: { httpMetadata?: { contentType?: string }; expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}

/** Metadados gravados junto de cada objeto de mídia. */
export interface MetaMidia {
  httpMetadata?: { contentType?: string };
}

interface EnvBindings {
  DB?: D1Like;
  MEDIA?: KvLike;
  MEDIA_PUBLIC_BASE?: string;
  [k: string]: unknown;
}

function bindings(): EnvBindings {
  // O `env` de cloudflare:workers é `any` em runtime; validamos em runtime.
  return env as unknown as EnvBindings;
}

export function db(): D1Like {
  const b = bindings().DB;
  if (!b) {
    throw new Error(
      'Binding D1 (DB) ausente. Verifique "d1_databases" no wrangler.jsonc e rode `npx wrangler types`.',
    );
  }
  return b;
}

/** Namespace KV que guarda as fotos e vídeos enviados pelo painel. */
export function kvMidia(): KvLike {
  const b = bindings().MEDIA;
  if (!b) {
    throw new Error(
      'Binding KV (MEDIA) ausente. Verifique "kv_namespaces" no wrangler.jsonc e rode `npx wrangler types`.',
    );
  }
  return b;
}

// ---------------------------------------------------------------------------
// Limites de mídia
// ---------------------------------------------------------------------------

/**
 * Limite por arquivo, em bytes.
 * O KV do plano free aceita até 25 MB por valor; usamos 15 MB de margem porque
 * o corpo da requisição é lido de uma vez pelo Worker (limite de memória/CPU).
 */
export const LIMITE_ARQUIVO = 15 * 1024 * 1024;

/** Formatos aceitos no upload. */
export const TIPOS_ACEITOS = [
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

/** Prefixos de chave permitidos (mesmos gerados pelo upload do admin). */
export const PREFIXOS_MIDIA = ['fotos/', 'videos/'] as const;

/**
 * Valida uma chave de mídia antes de gravar/ler.
 * Evita path traversal e fora dos prefixos autorizados.
 */
export function chaveValida(chave: string): boolean {
  if (!chave || chave.length > 300) return false;
  if (chave.includes('..') || chave.includes('\0') || chave.startsWith('/')) return false;
  return PREFIXOS_MIDIA.some((p) => chave.startsWith(p));
}

/** Extensão (com ponto) de uma chave, em minúsculas. */
export function extensao(chave: string): string {
  const i = chave.lastIndexOf('.');
  return i === -1 ? '' : chave.slice(i).toLowerCase();
}

/** Guess do Content-Type a partir da extensão (fallback sem metadado). */
export function tipoPorExtensao(chave: string): string {
  const mapa: Record<string, string> = {
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
  };
  return mapa[extensao(chave)] ?? 'application/octet-stream';
}

/** Nome de arquivo seguro para URL (sem acentos, sem espaços). */
export function nomeSeguro(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 120) || 'arquivo'
  );
}

// ---------------------------------------------------------------------------
// URLs de mídia
// ---------------------------------------------------------------------------

/**
 * Base pública para montar URL de mídia no cardápio.
 * - MEDIA_PUBLIC_BASE definida (host externo/CDN) -> usa ela.
 * - Vazia -> caminho relativo, lido do KV pelo Worker em /media/<chave>.
 */
export function baseMidia(): string {
  const base = bindings().MEDIA_PUBLIC_BASE || '';
  return base.replace(/\/+$/, '');
}

/**
 * Resolve um caminho de mídia (gravado no D1) para URL completa.
 * Aceita caminho relativo ("x-burger-1.webp") ou URL absoluta.
 */
export function urlMidia(caminho: string | null | undefined): string {
  if (!caminho) return '';
  if (/^(https?:)?\/\//.test(caminho) || caminho.startsWith('data:') || caminho.startsWith('/')) {
    return caminho;
  }
  const base = baseMidia();
  if (!base) return `/media/${caminho}`;
  return `${base}/${caminho.replace(/^\/+/, '')}`;
}

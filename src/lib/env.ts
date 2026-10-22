/**
 * Acesso centralizado aos bindings do Cloudflare (D1, R2, KV).
 *
 * Em SSR (rotas do cardápio e do admin) o `env` é lido do módulo
 * `cloudflare:workers`, que o adapter do Astro injeta em runtime.
 */
import { env } from 'cloudflare:workers';
import type { D1Like } from './db';

/** Tipos estruturais mínimos para não depender dos tipos gerados do wrangler. */
export interface R2Like {
  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream | Blob,
    options?: { httpMetadata?: Record<string, string>; customMetadata?: Record<string, string> },
  ): Promise<{ key: string; size: number } | null>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: Record<string, string> } | null>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number }): Promise<{
    objects: Array<{ key: string; size: number }>;
    truncated: boolean;
  }>;
}

interface EnvBindings {
  DB?: D1Like;
  MEDIA?: R2Like;
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

export function r2(): R2Like {
  const b = bindings().MEDIA;
  if (!b) {
    throw new Error(
      'Binding R2 (MEDIA) ausente. Verifique "r2_buckets" no wrangler.jsonc e rode `npx wrangler types`.',
    );
  }
  return b;
}

/**
 * Base pública para montar URL de mídia no cardápio.
 * - Se MEDIA_PUBLIC_BASE estiver definida (custom domain do R2), usa ela.
 * - Caso contrário, caminho relativo (dev local: arquivos em /public/media).
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

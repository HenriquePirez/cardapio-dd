/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
// Tipos de runtime (D1Database, R2Bucket, KVNamespace) vêm de
// worker-configuration.d.ts, gerado por `npx wrangler types`.

declare namespace App {
  // A sessão do Astro é `context.session` / `Astro.session`
  // (tipada pelo próprio Astro), não `locals.session`.
  interface SessionData {
    usuario?: import('./lib/session').UsuarioSessao;
  }
}

declare namespace Cloudflare {
  interface Env {
    // Bindings declarados em wrangler.jsonc (D1, R2, KV)
    DB: D1Database;
    MEDIA: R2Bucket;
    SESSION: KVNamespace;
    MEDIA_PUBLIC_BASE: string;

    // Credenciais S3 do R2 para URLs pré-assinadas (enviar vídeo DIRETO ao R2).
    // Configuradas como secrets: `npx wrangler secret put R2_ACCESS_KEY_ID` etc.
    // Ver README. Ausentes -> o upload de vídeo usa o Worker (fallback).
    R2_ACCOUNT_ID?: string;
    R2_ACCESS_KEY_ID?: string;
    R2_SECRET_ACCESS_KEY?: string;
    R2_BUCKET_NAME?: string;
  }
}

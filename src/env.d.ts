/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
// Tipos de runtime (D1Database, KVNamespace) vêm de
// worker-configuration.d.ts, gerado por `npx wrangler types`.

declare namespace App {
  // A sessão do Astro é `context.session` / `Astro.session`
  // (tipada pelo próprio Astro), não `locals.session`.
  interface SessionData {
    usuario?: import('./lib/session').UsuarioSessao;
  }

  interface Locals {
    /** Loja ativa do painel (resolvida pelo middleware). */
    loja?: import('./lib/db').Loja | null;
    /** Lojas do usuário logado, para o seletor do cabeçalho. */
    lojas?: import('./lib/db').Loja[];
  }
}

/**
 * Sessão do admin: guarda o usuário logado na sessão do Astro
 * (driver KV configurado automaticamente pelo adapter Cloudflare).
 *
 * IMPORTANTE: a sessão é `context.session` / `Astro.session`,
 * e NÃO `locals.session`.
 */
import type { APIContext } from 'astro';

export interface UsuarioSessao {
  id: string;
  email: string;
  nome: string;
}

const CHAVE = 'usuario';

function sessao(ctx: APIContext) {
  return ctx.session;
}

export async function lerUsuario(ctx: APIContext): Promise<UsuarioSessao | null> {
  const s = sessao(ctx);
  if (!s) return null;
  const v = await s.get<UsuarioSessao>(CHAVE);
  return v ?? null;
}

export async function criarSessao(ctx: APIContext, u: UsuarioSessao): Promise<void> {
  const s = sessao(ctx);
  if (!s) {
    throw new Error(
      'Sessão indisponível: driver de sessão não configurado (verifique a sessão no astro.config e o adapter Cloudflare).',
    );
  }
  // Regenera o ID para evitar fixação de sessão
  await s.regenerate();
  s.set(CHAVE, u, { ttl: 60 * 60 * 24 * 7 }); // 7 dias
}

export async function destruirSessao(ctx: APIContext): Promise<void> {
  const s = sessao(ctx);
  if (s) s.destroy();
}

/** true se há sessão válida. */
export async function autenticado(ctx: APIContext): Promise<boolean> {
  return (await lerUsuario(ctx)) !== null;
}

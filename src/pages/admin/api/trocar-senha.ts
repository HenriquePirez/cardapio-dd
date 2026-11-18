/**
 * POST /admin/api/trocar-senha
 * Troca a senha do usuário logado (autenticado + senha atual obrigatória).
 * Após trocar, encerra a sessão e redireciona para /admin/login?ok=redefinida.
 */
import type { APIRoute } from 'astro';
import { obterUsuarioPorId, trocarSenha } from '../../../lib/db';
import { db, pepper } from '../../../lib/env';
import { conferirSenha, hashSenha, validarSenha } from '../../../lib/auth';
import { destruirSessao, lerUsuario } from '../../../lib/session';
import { mesmaOrigem } from '../../../lib/http';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const sessao = await lerUsuario(ctx);
  if (!sessao) return voltar('/admin/login');

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const atual = String(form.get('senha_atual') ?? '');
  const nova = String(form.get('senha_nova') ?? '');
  const nova2 = String(form.get('senha_nova2') ?? '');

  const d1 = db();
  const usuario = await obterUsuarioPorId(d1, sessao.id);
  if (!usuario) return new Response('Conta não encontrada.', { status: 404 });

  if (!atual || !nova || !nova2) return voltar('/admin/trocar-senha?erro=campos');

  const pimenta = pepper() ?? undefined;
  if (!(await conferirSenha(atual, usuario.senha_hash, pimenta))) {
    return voltar('/admin/trocar-senha?erro=senha-atual');
  }

  const erroSenha = validarSenha(nova);
  if (erroSenha) return voltar(`/admin/trocar-senha?erro=${encodeURIComponent(erroSenha)}`);

  if (nova !== nova2) return voltar('/admin/trocar-senha?erro=divergentes');

  await trocarSenha(d1, usuario.email, await hashSenha(nova, pimenta));
  await destruirSessao(ctx);
  return voltar('/admin/login?ok=redefinida');
};

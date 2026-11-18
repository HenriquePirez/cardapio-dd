/**
 * POST /admin/api/redefinir-senha
 * Troca a senha usando o token do e-mail e leva de volta para o login.
 * O token é consumido com UPDATE condicional: mesmo link, dois POSTs — só um vale.
 */
import type { APIRoute } from 'astro';
import { consumirRedefinicao, obterRedefinicao, obterUsuarioPorId, trocarSenha } from '../../../lib/db';
import { db, pepper } from '../../../lib/env';
import { hashSenha, validarSenha } from '../../../lib/auth';
import { hashToken, utilizavel } from '../../../lib/recuperacao';
import { mesmaOrigem } from '../../../lib/http';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const token = String(form.get('token') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  const senha2 = String(form.get('senha2') ?? '');

  if (token.length < 32) return voltar('/admin/redefinir-senha?erro=token');

  const d1 = db();
  const registro = await obterRedefinicao(d1, await hashToken(token));
  if (!registro || !utilizavel(registro.expira_em, registro.usado_em)) {
    return voltar('/admin/redefinir-senha?erro=token');
  }

  const usuario = await obterUsuarioPorId(d1, registro.usuario_id);
  if (!usuario) return voltar('/admin/redefinir-senha?erro=token');

  if (!senha || !senha2) return voltar('/admin/redefinir-senha?erro=campos');

  const erroSenha = validarSenha(senha);
  if (erroSenha) return voltar(`/admin/redefinir-senha?erro=${encodeURIComponent(erroSenha)}`);

  if (senha !== senha2) return voltar('/admin/redefinir-senha?erro=divergentes');

  // Consome antes de trocar: se dois POSTs chegarem juntos, o perdedor falha aqui.
  if (!(await consumirRedefinicao(d1, registro.id))) {
    return voltar('/admin/redefinir-senha?erro=token');
  }

  const pimenta = pepper() ?? undefined;
  await trocarSenha(d1, usuario.email, await hashSenha(senha, pimenta));

  return voltar('/admin/login?ok=redefinida');
};

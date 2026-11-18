/**
 * POST /admin/api/redefinir-senha
 * Troca a senha usando o token do e-mail + senha atual + confirmação.
 * O token identifica o usuário, a senha atual confirma que ele a conhece.
 * Ao final, encerra a sessão (quem clicou no link pode não ter sessão) e
 * redireciona para /admin/login?ok=redefinida.
 */
import type { APIRoute } from 'astro';
import {
  consumirRedefinicao,
  obterRedefinicao,
  obterUsuarioPorId,
  trocarSenha,
} from '../../../lib/db';
import { db, pepper } from '../../../lib/env';
import { conferirSenha, hashSenha, validarSenha } from '../../../lib/auth';
import { hashToken, utilizavel } from '../../../lib/recuperacao';
import { destruirSessao } from '../../../lib/session';
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
  const senhaAtual = String(form.get('senha_atual') ?? '');
  const senha = String(form.get('senha_nova') ?? '');
  const senha2 = String(form.get('senha_nova2') ?? '');

  const destinoErro = (e: string) => {
    const t = encodeURIComponent(token);
    return `/admin/redefinir-senha?token=${t}&erro=${e}`;
  };

  if (token.length < 32) return voltar('/admin/redefinir-senha?erro=token');

  const d1 = db();
  const registro = await obterRedefinicao(d1, await hashToken(token));
  if (!registro || !utilizavel(registro.expira_em, registro.usado_em)) {
    return voltar('/admin/redefinir-senha?erro=token');
  }

  const usuario = await obterUsuarioPorId(d1, registro.usuario_id);
  if (!usuario) return voltar('/admin/redefinir-senha?erro=token');

  if (!senhaAtual || !senha || !senha2) return voltar(destinoErro('campos'));

  const pimenta = pepper() ?? undefined;
  if (!(await conferirSenha(senhaAtual, usuario.senha_hash, pimenta))) {
    return voltar(destinoErro('senha-atual'));
  }

  const erroSenha = validarSenha(senha);
  if (erroSenha) return voltar(destinoErro(encodeURIComponent(erroSenha)));

  if (senha !== senha2) return voltar(destinoErro('divergentes'));

  // Consome antes de trocar: dois POSTs com o mesmo link — só um vale.
  if (!(await consumirRedefinicao(d1, registro.id))) {
    return voltar('/admin/redefinir-senha?erro=token');
  }

  await trocarSenha(d1, usuario.email, await hashSenha(senha, pimenta));
  await destruirSessao(ctx);

  return voltar('/admin/login?ok=redefinida');
};

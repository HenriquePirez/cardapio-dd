/**
 * POST /admin/api/perfil
 * Edita o próprio perfil: nome/e-mail OU troca de senha (o corpo diz qual fluxo).
 * Só o usuário logado mexe no que é dele — não há edição de terceiros aqui.
 *
 * Custo de CPU: conferir a senha atual (~4,4 ms) + gerar o novo hash (~4,4 ms)
 * chega perto dos 10 ms do Workers Free — mesmo perfil do login, que já faz as
 * duas etapas quando atualiza o hash.
 */
import type { APIRoute } from 'astro';
import { emailJaUsado, obterUsuarioPorId, atualizarPerfil, trocarSenha } from '../../../lib/db';
import { db, pepper } from '../../../lib/env';
import { conferirSenha, hashSenha, validarSenha } from '../../../lib/auth';
import { criarSessao, lerUsuario } from '../../../lib/session';
import { mesmaOrigem } from '../../../lib/http';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const sessao = await lerUsuario(ctx);
  if (!sessao) return new Response('Não autenticado.', { status: 401 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const d1 = db();
  const usuario = await obterUsuarioPorId(d1, sessao.id);
  if (!usuario) return new Response('Conta não encontrada.', { status: 404 });

  // ---------------------------------------------------------------
  // Troca de senha
  // ---------------------------------------------------------------
  if (form.has('senha_atual')) {
    const atual = String(form.get('senha_atual') ?? '');
    const nova = String(form.get('senha_nova') ?? '');
    const nova2 = String(form.get('senha_nova2') ?? '');

    if (!atual || !nova || !nova2) return voltar('/admin/perfil?erro=campos');

    const pimenta = pepper() ?? undefined;
    if (!(await conferirSenha(atual, usuario.senha_hash, pimenta))) {
      return voltar('/admin/perfil?erro=senha-atual');
    }

    const erroSenha = validarSenha(nova);
    if (erroSenha) return voltar(`/admin/perfil?erro=${encodeURIComponent(erroSenha)}`);

    if (nova !== nova2) return voltar('/admin/perfil?erro=divergentes');

    await trocarSenha(d1, usuario.email, await hashSenha(nova, pimenta));
    return voltar('/admin/perfil?ok=senha');
  }

  // ---------------------------------------------------------------
  // Nome e e-mail
  // ---------------------------------------------------------------
  const nome = String(form.get('nome') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();

  if (!nome || !email) return voltar('/admin/perfil?erro=campos');
  if (!EMAIL_OK.test(email)) return voltar('/admin/perfil?erro=email');

  const mudouEmail = email.toLowerCase() !== usuario.email.toLowerCase();
  if (mudouEmail && (await emailJaUsado(d1, email, usuario.id))) {
    return voltar('/admin/perfil?erro=email-existente');
  }

  await atualizarPerfil(d1, usuario.id, { nome, ...(mudouEmail ? { email } : {}) });

  // O e-mail fica guardado na sessão: regenera para não continuar com o antigo.
  if (mudouEmail) await criarSessao(ctx, { id: usuario.id, email, nome });

  return voltar('/admin/perfil?ok=perfil');
};

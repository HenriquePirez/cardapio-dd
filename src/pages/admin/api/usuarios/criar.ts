/**
 * POST /admin/api/usuarios/criar
 * Cadastra um novo usuário no painel. Apenas o admin master.
 * Corpo (form): { nome, email, senha, senha2, master }
 */
import type { APIRoute } from 'astro';
import { lerUsuario } from '../../../../lib/session';
import { criarUsuario, existeUsuarioComEmail } from '../../../../lib/db';
import { hashSenha, validarSenha } from '../../../../lib/auth';
import { db } from '../../../../lib/env';
import { mesmaOrigem } from '../../../../lib/http';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const sessao = await lerUsuario(ctx);
  if (!sessao || !ctx.locals.usuarioMaster) {
    return new Response('Acesso restrito ao admin master.', { status: 403 });
  }

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const nome = String(form.get('nome') ?? '').trim();
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const senha = String(form.get('senha') ?? '');
  const senha2 = String(form.get('senha2') ?? '');
  const master = String(form.get('master') ?? '') === '1';

  if (!nome || !email || !senha) return voltar('/admin?erro=campos');
  if (senha !== senha2) return voltar('/admin?erro=senha_incoerente');
  const erroSenha = validarSenha(senha);
  if (erroSenha) return voltar('/admin?erro=senha_fraca');
  if (await existeUsuarioComEmail(db(), email)) return voltar('/admin?erro=email_ja_existe');

  await criarUsuario(db(), { email, nome, senha_hash: await hashSenha(senha), master });

  return voltar('/admin?ok=criado');
};

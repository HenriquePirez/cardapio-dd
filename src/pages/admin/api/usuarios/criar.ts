/**
 * POST /admin/api/usuarios/criar
 * Cadastra um novo usuário no painel. Apenas o admin master.
 * A senha é gerada server-side e enviada por e‑mail ao usuário.
 * Corpo (form): { nome, email, master }
 */
import type { APIRoute } from 'astro';
import { lerUsuario } from '../../../../lib/session';
import { criarUsuario, existeUsuarioComEmail } from '../../../../lib/db';
import { hashSenha } from '../../../../lib/auth';
import { db } from '../../../../lib/env';
import { mesmaOrigem } from '../../../../lib/http';
import { enviarEmail } from '../../../../lib/email';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

/** Senha aleatória que substitui os campos de senha do formulário. */
function gerarSenha(tamanho = 14): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function corpoEmail(dados: { nome: string; email: string; senha: string; origem: string }): string {
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:520px;text-align:left">
      <p style="margin:0 0 8px">Olá, <strong>${dados.nome}</strong>,</p>
      <p style="margin:0 0 8px">Você foi cadastrado no painel do MyShelf. Seus dados de acesso:</p>
      <p style="margin:0 0 8px"><strong>E‑mail:</strong> ${dados.email}</p>
      <p style="margin:0 0 18px"><strong>Senha:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px">${dados.senha}</code></p>
      <a href="${dados.origem}/admin/login" style="display:inline-block;background:#f9df8e;color:#39282c;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:500">Entrar no sistema</a>
    </div>`;
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
  const master = String(form.get('master') ?? '') === '1';

  if (!nome || !email) return voltar('/admin?erro=campos');
  if (await existeUsuarioComEmail(db(), email)) return voltar('/admin?erro=email_ja_existe');

  const senha = gerarSenha();
  await criarUsuario(db(), { email, nome, senha_hash: await hashSenha(senha), master });

  // Best-effort: sem segredo configurado, o e-mail fica só no log do worker.
  await enviarEmail({
    para: email,
    assunto: 'Acesso ao painel MyShelf — seus dados de login',
    html: corpoEmail({ nome, email, senha, origem: new URL(ctx.request.url).origin }),
  });

  return voltar('/admin?ok=criado');
};

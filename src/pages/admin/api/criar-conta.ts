/**
 * POST /admin/api/criar-conta
 * Cria a conta única do painel — funciona SÓ enquanto não há nenhum usuário.
 * Depois disso a rota volta 409 (o painel já está protegido).
 */
import type { APIRoute } from 'astro';
import { contarUsuarios, criarUsuario, obterUsuario } from '../../../lib/db';
import { db, pepperObrigatorio } from '../../../lib/env';
import { hashSenha, validarSenha } from '../../../lib/auth';
import { criarSessao } from '../../../lib/session';

function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const d1 = db();

  // Só permite criar conta se ainda não existe nenhuma
  if ((await contarUsuarios(d1)) > 0) {
    return new Response('Conta já existe.', { status: 409 });
  }

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const nome = String(form.get('nome') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  const senha2 = String(form.get('senha2') ?? '');

  if (!nome || !email) return voltar('/admin/criar-conta?erro=campos');

  const erroSenha = validarSenha(senha);
  if (erroSenha) return voltar(`/admin/criar-conta?erro=${encodeURIComponent(erroSenha)}`);

  if (senha !== senha2) return voltar('/admin/criar-conta?erro=divergentes');

  if (await obterUsuario(d1, email)) {
    return voltar('/admin/criar-conta?erro=existe');
  }

  const id = crypto.randomUUID();
  // Exige o pepper ANTES de gravar: uma conta criada sem ele nasceria mais
  // fraca e não teria como reforçar depois sem a senha em mãos.
  const pepper = pepperObrigatorio();
  await criarUsuario(d1, { id, email, nome, senha_hash: await hashSenha(senha, pepper) });
  await criarSessao(ctx, { id, email, nome });

  return ctx.redirect('/admin', 303);
};

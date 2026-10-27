/**
 * POST /admin/api/criar-conta
 * Cria a conta única do painel — funciona SÓ enquanto não há nenhum usuário.
 * Depois disso redireciona para o login.
 *
 * Exige o segredo SETUP_TOKEN (wrangler secret put SETUP_TOKEN): sem ele,
 * qualquer anônimo que abrisse a página no primeiro deploy viraria admin.
 *
 * O INSERT é atômico (`WHERE NOT EXISTS`), então dois POSTs simultâneos não
 * conseguem sobrescrever a senha um do outro.
 */
import type { APIRoute } from 'astro';
import { criarPrimeiroUsuario } from '../../../lib/db';
import { db, pepperObrigatorio, setupToken } from '../../../lib/env';
import { hashSenha, validarSenha } from '../../../lib/auth';
import { criarSessao } from '../../../lib/session';
import { mesmaOrigem } from '../../../lib/http';


function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

/** Comparação sem saída antecipada (o comprimento ainda vaza; o valor não). */
function seguroIgual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferenca === 0;
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const esperado = setupToken();
  if (!esperado) {
    return new Response(
      'Criação de conta desativada: configure o segredo SETUP_TOKEN com `npx wrangler secret put SETUP_TOKEN` e recarregue esta página.',
      { status: 503 },
    );
  }

  const token = String(form.get('token') ?? '');
  if (!seguroIgual(token, esperado)) return voltar('/admin/criar-conta?erro=token');

  const nome = String(form.get('nome') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');
  const senha2 = String(form.get('senha2') ?? '');

  if (!nome || !email) return voltar('/admin/criar-conta?erro=campos');

  const erroSenha = validarSenha(senha);
  if (erroSenha) return voltar(`/admin/criar-conta?erro=${encodeURIComponent(erroSenha)}`);

  if (senha !== senha2) return voltar('/admin/criar-conta?erro=divergentes');

  const d1 = db();
  const id = crypto.randomUUID();
  // Exige o pepper ANTES de gravar: uma conta criada sem ele nasceria mais
  // fraca e não teria como reforçar depois sem a senha em mãos.
  const pepper = pepperObrigatorio();
  const criado = await criarPrimeiroUsuario(d1, {
    id,
    email,
    nome,
    senha_hash: await hashSenha(senha, pepper),
  });

  // Já existe conta (duplo clique, corrida ou painel em uso): manda ao login.
  if (!criado) return ctx.redirect('/admin/login', 303);

  await criarSessao(ctx, { id, email, nome });

  return ctx.redirect('/admin', 303);
};

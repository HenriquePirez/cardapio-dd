/**
 * POST /admin/api/login
 * Autentica a conta única do painel e cria a sessão.
 * - Valida senha com PBKDF2 (Web Crypto)
 * - Rate-limit: 5 falhas -> bloqueio de 10 min
 * - Proteção CSRF: exige Origin da mesma origem
 */
import type { APIRoute } from 'astro';
import { obterUsuario, contarUsuarios } from '../../../lib/db';
import { conferirSenha } from '../../../lib/auth';
import { db } from '../../../lib/env';
import { criarSessao } from '../../../lib/session';
import {
  verificarBloqueio,
  registrarTentativaFalha,
  limparTentativas,
} from '../../../lib/login-guard';

function mesmaOrigem(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) {
    return new Response('Origem inválida.', { status: 403 });
  }

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const email = String(form.get('email') ?? '').trim();
  const senha = String(form.get('senha') ?? '');

  if (!email || !senha) {
    return redirecionar('/admin/login?erro=campos');
  }

  const d1 = db();

  // Primeiro uso: se não há usuário, manda criar a conta inicial
  if ((await contarUsuarios(d1)) === 0) {
    return redirecionar('/admin/criar-conta');
  }

  const bloqueio = await verificarBloqueio(d1, email);
  if (bloqueio.bloqueado) {
    const min = Math.max(1, Math.ceil(((bloqueio.bloqueadoAte ?? 0) - Date.now() / 1000) / 60));
    return redirecionar(`/admin/login?erro=bloqueado&min=${min}`);
  }

  const usuario = await obterUsuario(d1, email);
  const ok = usuario ? await conferirSenha(senha, usuario.senha_hash) : false;

  if (!ok) {
    // Sem o mesmo tempo de resposta quando o e-mail não existe (evita enumeração)
    if (!usuario) await conferirSenha(senha, 'pbkdf2$1$AAAA$AAAA');
    const estado = await registrarTentativaFalha(d1, email);
    if (estado.bloqueado) {
      return redirecionar('/admin/login?erro=bloqueado&min=10');
    }
    return redirecionar(`/admin/login?erro=senha&restam=${estado.restantes}`);
  }

  await limparTentativas(d1, email);

  await criarSessao(ctx, {
    id: usuario!.id,
    email: usuario!.email,
    nome: usuario!.nome,
  });

  const prox = String(form.get('prox') ?? '').trim();
  // Só aceita caminho interno (evita open redirect)
  const destino = prox.startsWith('/') && !prox.startsWith('//') ? prox : '/admin';
  return ctx.redirect(destino, 303);
};

function redirecionar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

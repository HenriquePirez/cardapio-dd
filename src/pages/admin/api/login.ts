/**
 * POST /admin/api/login
 * Autentica a conta única do painel e cria a sessão.
 * - Valida senha com PBKDF2 (Web Crypto)
 * - Rate-limit: 5 falhas -> bloqueio de 10 min
 * - Proteção CSRF: exige Origin da mesma origem
 */
import type { APIRoute } from 'astro';
import { obterUsuario, contarUsuarios, trocarSenha } from '../../../lib/db';
import {
  conferirSenha,
  hashSenha,
  hashDummy,
  lerIteracoes,
  hashComPepper,
  ITERACOES,
} from '../../../lib/auth';
import { db, pepper } from '../../../lib/env';
import { criarSessao } from '../../../lib/session';
import {
  verificarBloqueio,
  registrarTentativaFalha,
  limparTentativas,
} from '../../../lib/login-guard';
import { mesmaOrigem } from '../../../lib/http';


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
  const ip = ctx.request.headers.get('cf-connecting-ip') ?? 'local';

  // Primeiro uso: se não há usuário, manda criar a conta inicial
  if ((await contarUsuarios(d1)) === 0) {
    return redirecionar('/admin/criar-conta');
  }

  const bloqueio = await verificarBloqueio(d1, email, ip);
  if (bloqueio.bloqueado) {
    const min = Math.max(1, Math.ceil(((bloqueio.bloqueadoAte ?? 0) - Date.now() / 1000) / 60));
    return redirecionar(`/admin/login?erro=bloqueado&min=${min}`);
  }

  const usuario = await obterUsuario(d1, email);
  // pepper() pode ser null só se a conta foi criada antes de definir o segredo;
  // conferirSenha lança nesse caso (melhor que devolver "senha incorreta").
  const pimenta = usuario ? pepper() : null;
  const ok =
    usuario !== null && (await conferirSenha(senha, usuario.senha_hash, pimenta ?? undefined));

  // `!usuario` junto do `!ok` não muda o comportamento (ok só é true com
  // usuário), mas é o que dá ao TypeScript o narrowing pros blocos seguintes.
  if (!ok || !usuario) {
    // Mesmo custo de CPU de um hash real, senão o tempo de resposta
    // denunciaria que o e-mail não existe (enumeração).
    if (!usuario) await conferirSenha(senha, hashDummy(pepper() ?? undefined));
    const estado = await registrarTentativaFalha(d1, email, ip);
    if (estado.bloqueado) {
      return redirecionar('/admin/login?erro=bloqueado&min=10');
    }
    return redirecionar(`/admin/login?erro=senha&restam=${estado.restantes}`);
  }

  await limparTentativas(d1, email, ip);

  // Upgrade transparente: se o hash gravado usa menos iterações que o código
  // atual (ou ficou sem pepper depois de o segredo ser definido), regrava já
  // que a senha está em mãos. O formato guarda a iteração, então o que está
  // gravado continua verificável.
  const it = lerIteracoes(usuario.senha_hash);
  if (it === null || it < ITERACOES || (!hashComPepper(usuario.senha_hash) && pimenta)) {
    try {
      await trocarSenha(d1, usuario.email, await hashSenha(senha, pimenta ?? undefined));
      // e-mail não entra no log (PII); id opaco é suficiente para diagnóstico
      console.log(`[auth] hash atualizado (usuario ${usuario.id}: ${it ?? '?'} -> ${ITERACOES} it)`);
    } catch (erro) {
      // Não bloqueia o login por causa do upgrade
      console.error('[auth] falha ao atualizar hash:', erro);
    }
  }

  await criarSessao(ctx, {
    id: usuario!.id,
    email: usuario!.email,
    nome: usuario!.nome,
  });

  const prox = String(form.get('prox') ?? '').trim();
  // Só aceita caminho interno (evita open redirect — inclusive via "\\" e
  // via caractere de controle, que o browser ignora e reabre como "//")
  // eslint-disable-next-line no-control-regex -- caracteres de controle são exatamente o alvo do teste
  const possuiControle = /[\u0000-\u0020]/.test(prox);
  const destino =
    prox.startsWith('/') && !/^\/[/\\]/.test(prox) && !possuiControle ? prox : '/admin';
  return ctx.redirect(destino, 303);
};

function redirecionar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

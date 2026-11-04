/**
 * POST /admin/api/usuarios/toggle-ativo
 * Ativa ou desativa um usuário (soft delete). Apenas o admin master pode usar.
 * Corpo: { id, ativo }
 */
import type { APIRoute } from 'astro';
import { lerUsuario } from '../../../../lib/session';
import { alternarUsuarioAtivo, obterUsuario } from '../../../../lib/db';
import { db } from '../../../../lib/env';
import { mesmaOrigem } from '../../../../lib/http';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  const usuarioSessao = await lerUsuario(ctx);
  if (!usuarioSessao || !ctx.locals.usuarioMaster) {
    return new Response('Acesso restrito ao admin master.', { status: 403 });
  }

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const id = String(form.get('id') ?? '');
  const ativo = String(form.get('ativo') ?? '') === '1';

  if (!id) return voltar('/admin/usuarios?erro=id');

  const alvo = await obterUsuario(db(), id);
  if (!alvo) return voltar('/admin/usuarios?erro=nao-encontrado');

  if (alvo.id === usuarioSessao.id && !ativo) {
    return voltar('/admin/usuarios?erro=proprio-master');
  }

  await alternarUsuarioAtivo(db(), id, ativo);
  return voltar('/admin/usuarios');
};

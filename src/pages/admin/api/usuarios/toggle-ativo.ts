/**
 * POST /admin/api/usuarios/toggle-ativo
 * Ativa ou desativa um usuário (soft delete). Apenas o admin master.
 * Envia e-mail para quem foi desativado e para quem desativou.
 * Corpo: { id, ativo }
 */
import type { APIRoute } from 'astro';
import { lerUsuario } from '../../../../lib/session';
import { alternarUsuarioAtivo, obterUsuarioPorId } from '../../../../lib/db';
import { db } from '../../../../lib/env';
import { mesmaOrigem } from '../../../../lib/http';
import { enviarEmail } from '../../../../lib/email';
import { EMPRESA } from '../../../../config';

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

  const id = String(form.get('id') ?? '');
  const ativo = String(form.get('ativo') ?? '') === '1';

  if (!id) return voltar('/admin?erro=id');

  const alvo = await obterUsuarioPorId(db(), id);
  if (!alvo) return voltar('/admin?erro=nao-encontrado');

  if (alvo.id === sessao.id && !ativo) {
    return voltar('/admin?erro=proprio-master');
  }

  await alternarUsuarioAtivo(db(), id, ativo);

  // Best-effort: a ação já foi feita; falha no e-mail não anula o toggle.
  if (!ativo) {
    const origem = new URL(ctx.request.url).origin;
    const logo = `${origem}/logo-myshelf-180.png`;
    await Promise.allSettled([
      enviarEmail({
        para: alvo.email,
        assunto: 'Sua conta foi desativada — MyShelf',
        html: corpoEmail({
          logo,
          titulo: 'Sua conta foi desativada',
          paragrafos: [
            `Olá, ${escapeHtml(alvo.nome)},`,
            'Sua conta de acesso ao painel MyShelf foi desativada pelo administrador.',
            `Se você acredita que isso foi um engano, entre em contato com ${escapeHtml(EMPRESA.nome)} pelo e-mail ${escapeHtml(EMPRESA.email)}.`,
          ],
        }),
      }),
      enviarEmail({
        para: sessao.email,
        assunto: `Você desativou ${alvo.email} — MyShelf`,
        html: corpoEmail({
          logo,
          titulo: 'Conta desativada',
          paragrafos: [
            `Olá, ${escapeHtml(sessao.nome)},`,
            `Você desativou o acesso de ${escapeHtml(alvo.nome)} (${escapeHtml(alvo.email)}) no painel MyShelf.`,
            'Ação registrada. Você pode reativar a qualquer momento pelo mesmo painel.',
          ],
        }),
      }),
    ]);
  }

  return voltar(ativo ? '/admin?ok=ativado' : '/admin?ok=desativado');
};

function corpoEmail({
  logo,
  titulo,
  paragrafos,
}: { logo: string; titulo: string; paragrafos: string[] }): string {
  const corpo = paragrafos.map((p) => `<p style="margin:0 0 12px">${p}</p>`).join('');
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:520px;text-align:left">
    <img src="${logo}" alt="MyShelf" width="72" height="72"
         style="display:block;border-radius:16px;margin:6px auto 14px" />
    <h2 style="margin:0 0 12px;font-size:20px;text-align:center">${escapeHtml(titulo)}</h2>
    ${corpo}
  </div>`;
}

function escapeHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * POST /admin/api/recuperar-senha
 * Pede o link de redefinição de senha por e-mail (Resend).
 *
 * Regras:
 * - resposta idêntica exista ou não a conta (não denuncia quem existe);
 * - um link por vez, com rate-limit de10 min por usuário;
 * - sem RESEND_API_KEY o erro é de infraestrutura, avisado antes de olhar a
 *   conta — assim o mesmo erro aparece para e-mail existente e inexistente.
 */
import type { APIRoute } from 'astro';
import { criarRedefinicao, obterUsuario, ultimaRedefinicaoPendente } from '../../../lib/db';
import { db, resendApiKey } from '../../../lib/env';
import { enviarEmail } from '../../../lib/email';
import { dentroDoIntervalo, expiraEm, gerarToken, hashToken } from '../../../lib/recuperacao';
import { mesmaOrigem } from '../../../lib/http';

function voltar(para: string): Response {
  return new Response(null, { status: 303, headers: { Location: para } });
}

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (ctx) => {
  if (!mesmaOrigem(ctx.request)) return new Response('Origem inválida.', { status: 403 });

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return new Response('Corpo inválido.', { status: 400 });
  }

  const email = String(form.get('email') ?? '').trim();
  // prox exato (allowlist): o perfil usa este fluxo para avisar a conta logada.
  // Qualquer outro valor cai no fluxo público padrão.
  const prox = String(form.get('prox') ?? '') === '/admin/perfil?ok=enviado';
  const destinoOk = prox ? '/admin/perfil?ok=enviado' : '/admin/recuperar-senha?enviado=1';
  const destinoErro = (e: string) =>
    prox ? `/admin/perfil?erro=${e}` : `/admin/recuperar-senha?erro=${e}`;

  // Formato inválido responde como sucesso: mesma saída de conta inexistente.
  if (!EMAIL_OK.test(email)) return voltar(destinoOk);

  if (!resendApiKey()) return voltar(destinoErro('email-config'));

  const d1 = db();
  const usuario = await obterUsuario(d1, email);
  if (!usuario) return voltar(destinoOk);

  const ultima = await ultimaRedefinicaoPendente(d1, usuario.id);
  if (ultima && dentroDoIntervalo(ultima.criado_em)) {
    return voltar(destinoOk);
  }

  const token = gerarToken();
  const redefinicaoId = crypto.randomUUID();
  await criarRedefinicao(d1, {
    id: redefinicaoId,
    usuarioId: usuario.id,
    tokenHash: await hashToken(token),
    expiraEm: expiraEm(),
  });

  const link = `${new URL(ctx.request.url).origin}/admin/redefinir-senha?token=${token}`;
  const enviado = await enviarEmail({
    para: usuario.email,
    assunto: 'Redefinição de senha — Cardápio Digital',
    html: corpoEmail(usuario.nome, link),
  });

  // Falha de envio com conta existente devolve erro visível: custo aceitável de
  // enumeração (só enquanto o Resend está falhando), ganho é poder testar o fluxo.
  // O token criado nesses casos é descartado para não bloquear o retry
  // (rate-limit transformaria a falha em sucesso silencioso nos 10 min seguintes).
  if (!enviado) {
    await d1.prepare('DELETE FROM redefinicoes_senha WHERE id = ?').bind(redefinicaoId).run();
    return voltar(destinoErro('email'));
  }
  return voltar(destinoOk);
};

function corpoEmail(nome: string, link: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827;max-width:520px">
    <h2 style="margin:0 0 12px;font-size:20px">Redefinição de senha</h2>
    <p style="margin:0 0 8px">Olá, ${escapeHtml(nome)},</p>
    <p style="margin:0 0 16px">
      Recebemos um pedido para criar uma nova senha no painel do Cardápio Digital.
      O link vale por <strong>1 hora</strong> e só pode ser usado uma vez:
    </p>
    <p style="margin:0 0 20px">
      <a href="${link}"
         style="display:inline-block;padding:11px 18px;border-radius:8px;background:#ea580c;color:#fff;text-decoration:none;font-weight:600">
        Criar nova senha
      </a>
    </p>
    <p style="margin:0 0 6px;font-size:13px;color:#6b7280">
      Se o botão não abrir, copie este link no navegador:
    </p>
    <p style="margin:0 0 20px;font-size:13px;word-break:break-all">
      <a href="${link}" style="color:#ea580c">${link}</a>
    </p>
    <p style="margin:0;font-size:13px;color:#6b7280">
      Não foi você? Ignore este e-mail: sua senha continua a mesma.
    </p>
  </div>`;
}

function escapeHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

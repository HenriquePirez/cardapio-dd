/**
 * Envio de e-mail transacional via Resend (HTTP puro, sem SDK — uma chamada
 * POST não justifica dependência).
 *
 * Segredo: `npx wrangler secret put RESEND_API_KEY` (local: `.dev.vars`).
 * Sem segredo o envio é desativado (retorna false, com log do motivo).
 *
 * Sem domínio verificado no Resend, o remetente padrão é `onboarding@resend.dev`
 * e a entrega é limitada ao e-mail dono da conta (limite de teste do Resend).
 */
import { emailDe, resendApiKey } from './env';

interface EmailSimples {
  para: string;
  assunto: string;
  html: string;
}

export async function enviarEmail({ para, assunto, html }: EmailSimples): Promise<boolean> {
  const chave = resendApiKey();
  if (!chave) {
    console.error('[email] RESEND_API_KEY ausente — defina com `npx wrangler secret put RESEND_API_KEY`');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${chave}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: emailDe(), to: [para], subject: assunto, html }),
    });

    if (!res.ok) {
      // Corpo truncado para o log do wrangler: diagnóstico sem derrubar nada.
      const corpo = (await res.text()).slice(0, 300);
      console.error(`[email] Resend respondeu ${res.status}: ${corpo}`);
      return false;
    }
    return true;
  } catch (erro) {
    console.error('[email] falha ao chamar o Resend:', erro);
    return false;
  }
}

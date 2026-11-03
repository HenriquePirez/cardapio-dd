/**
 * Consentimento de cookies: guarda apenas a escolha do visitante no
 * navegador (localStorage). Cookies essenciais não dependem de aceite.
 */

export const CHAVE_CONSENTIMENTO = 'dd-consentimento';
export const VERSAO_CONSENTIMENTO = 1;

export interface Consentimento {
  analytics: boolean;
  versao: number;
  data: string;
}

/** Lê o valor salvo; devolve null para ausente, inválido ou versão antiga. */
export function lerConsentimento(bruto: string | null): Consentimento | null {
  if (!bruto) return null;
  try {
    const valor = JSON.parse(bruto) as Partial<Consentimento>;
    if (valor.versao !== VERSAO_CONSENTIMENTO || typeof valor.analytics !== 'boolean') {
      return null;
    }
    return {
      analytics: valor.analytics,
      versao: VERSAO_CONSENTIMENTO,
      data: typeof valor.data === 'string' ? valor.data : '',
    };
  } catch {
    return null;
  }
}

/** Escolha atual no formato persistido. */
export function criarConsentimento(analytics: boolean, agora = new Date()): Consentimento {
  return { analytics, versao: VERSAO_CONSENTIMENTO, data: agora.toISOString() };
}

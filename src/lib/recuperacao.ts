/**
 * Regras puras da recuperação de senha (sem I/O): testáveis isolado.
 * O fluxo está em src/pages/admin/api/recuperar-senha.ts e redefinir-senha.ts.
 */

/** Validade do link enviado por e-mail. */
export const VALIDADE_MS = 60 * 60 * 1000; // 1 hora

/** Intervalo mínimo entre dois pedidos de redefinição do mesmo usuário. */
export const INTERVALO_MS = 10 * 60 * 1000; // 10 minutos

/** Token opaco de32 bytes aleatórios em hex (64 caracteres). */
export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * SHA-256 do token em hex: é o que vai no banco.
 * Assim um vazamento do D1 não entrega links de troca de senha válidos.
 */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Momento de expiração do link, como ISO com fuso. */
export function expiraEm(agoraMs = Date.now()): string {
  return new Date(agoraMs + VALIDADE_MS).toISOString();
}

/**
 * Um registro pendente ainda serve? Não usado e não expirado.
 * Data inválida conta como não utilizável (não abre por engano).
 */
export function utilizavel(
  expiraEmValor: string,
  usadoEm: string | null | undefined,
  agoraMs = Date.now(),
): boolean {
  if (usadoEm) return false;
  const expira = Date.parse(expiraEmValor);
  return Number.isFinite(expira) && expira > agoraMs;
}

/**
 * Deve ignorar um novo pedido porque o anterior é recente demais (rate-limit
 * por e-mail, sem depender de IP). Data sem fuso (datetime('now') do D1) é
 * lida como UTC — o mesmo cuidado de login-guard.ts.
 */
export function dentroDoIntervalo(criadoEmValor: string, agoraMs = Date.now()): boolean {
  const comFuso = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(criadoEmValor)
    ? criadoEmValor
    : `${criadoEmValor}Z`;
  const criado = Date.parse(comFuso);
  return Number.isFinite(criado) && agoraMs - criado < INTERVALO_MS;
}

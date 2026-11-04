/**
 * Fluxo de compra: decide o que acontece depois do toque em "Comprar".
 *
 * - `ambos`: pergunta se o pedido é para comer no local ou retirada.
 * - `retirada`: vai direto para o link do app.
 * - `local`: mostra o aviso do totem (pedido no local só no totem).
 */
export type Modalidade = 'local' | 'retirada' | 'ambos';

export const MODALIDADES: readonly Modalidade[] = ['local', 'retirada', 'ambos'];

/** Converte o valor cru do formulário/banco. `null` quando não é válido. */
export function normalizarModalidade(valor: unknown): Modalidade | null {
  return MODALIDADES.includes(valor as Modalidade) ? (valor as Modalidade) : null;
}

export type FluxoPedido = 'perguntar' | 'retirada' | 'local';

export function fluxoDoPedido(modalidade: Modalidade): FluxoPedido {
  if (modalidade === 'retirada') return 'retirada';
  if (modalidade === 'local') return 'local';
  return 'perguntar';
}

/**
 * Domínios usados em exemplos/placeholders. Nunca são destinos reais de compra;
 * aceitá-los faz o CTA abrir uma página de terceiros ou um 404.
 */
const HOSTS_PLACEHOLDER = new Set([
  'exemplo.com',
  'app.exemplo.com',
  'example.com',
  'app.example.com',
  'teste.com',
  'test.com',
]);

/** URL http(s) de compra, recusando vazios, protocolos estranhos e placeholders. */
export function urlCompraValida(valor: unknown): boolean {
  if (typeof valor !== 'string' || !valor.trim()) return false;
  try {
    const url = new URL(valor.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (HOSTS_PLACEHOLDER.has(host)) return false;
    if (host.endsWith('.exemplo.com') || host.endsWith('.example.com')) return false;
    return true;
  } catch {
    return false;
  }
}

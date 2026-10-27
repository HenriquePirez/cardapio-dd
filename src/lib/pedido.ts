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

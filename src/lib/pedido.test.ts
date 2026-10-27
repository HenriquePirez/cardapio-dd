import { describe, expect, it } from 'vitest';

import { fluxoDoPedido, MODALIDADES, normalizarModalidade } from './pedido';

describe('pedido', () => {
  it('aceita as três modalidades', () => {
    for (const m of MODALIDADES) expect(normalizarModalidade(m)).toBe(m);
  });

  it('recusa valor desconhecido', () => {
    expect(normalizarModalidade('delivery')).toBeNull();
    expect(normalizarModalidade('')).toBeNull();
    expect(normalizarModalidade(null)).toBeNull();
  });

  it('só pergunta quando o produto atende os dois modos', () => {
    expect(fluxoDoPedido('ambos')).toBe('perguntar');
    expect(fluxoDoPedido('retirada')).toBe('retirada');
    expect(fluxoDoPedido('local')).toBe('local');
  });
});

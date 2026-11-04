import { describe, expect, it } from 'vitest';

import {
  fluxoDoPedido,
  MODALIDADES,
  normalizarModalidade,
  urlCompraValida,
} from './pedido';

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

describe('urlCompraValida', () => {
  it('aceita http(s) de um app real', () => {
    expect(urlCompraValida('https://pedidos.donadora.com/produto/1')).toBe(true);
    expect(urlCompraValida('http://localhost:3000/pedido')).toBe(true);
  });

  it('recusa vazio, protocolo inválido e URL malformada', () => {
    expect(urlCompraValida('')).toBe(false);
    expect(urlCompraValida('ftp://loja.com/pedido')).toBe(false);
    expect(urlCompraValida('nao-e-url')).toBe(false);
    expect(urlCompraValida(null)).toBe(false);
  });

  it('recusa domínios de exemplo/placeholder', () => {
    expect(urlCompraValida('https://app.exemplo.com/comprar?produto=1')).toBe(false);
    expect(urlCompraValida('https://example.com/pedido')).toBe(false);
    expect(urlCompraValida('https://sub.exemplo.com/pedido')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { traduzir } from './idioma';

describe('traduzir', () => {
  it('traduz e substitui as variáveis', () => {
    expect(traduzir('en', 'midias', { n: 2 })).toBe('2 media');
    expect(traduzir('en', 'comprar')).toBe('Order');
    expect(traduzir('pt', 'comprar')).toBe('Comprar');
  });

  it('mantém o marcador quando o valor não é informado', () => {
    expect(traduzir('pt', 'verFotos')).toBe('Ver fotos de {nome}');
  });
});

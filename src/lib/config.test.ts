import { describe, expect, it } from 'vitest';

import { formatarPreco, SITE } from '../config';

describe('SITE', () => {
  it('expõe nome e idioma do cardápio', () => {
    expect(SITE.nome).toBe('Dona Dôra');
    expect(SITE.idioma).toBe('pt-BR');
  });
});

describe('formatarPreco', () => {
  // O Intl separa "R$" e o número com espaço não separável (U+00A0).
  it('formata moeda BRL com vírgula decimal', () => {
    expect(formatarPreco(28.9)).toBe('R$ 28,90');
  });

  it('formata valor inteiro', () => {
    expect(formatarPreco(30)).toBe('R$ 30,00');
  });

  it('formata zero', () => {
    expect(formatarPreco(0)).toBe('R$ 0,00');
  });
});

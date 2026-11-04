import { describe, expect, it } from 'vitest';
import {
  ACENTO_PADRAO,
  MARCA_PADRAO,
  contraste,
  cssPaleta,
  normalizarHex,
  paletaLoja,
} from './cores';

describe('normalizarHex', () => {
  it('expande #rgb e rejeita valores inválidos', () => {
    expect(normalizarHex('#ABC', MARCA_PADRAO)).toBe('#aabbcc');
    expect(normalizarHex('#14532D', MARCA_PADRAO)).toBe('#14532d');
    expect(normalizarHex('vermelho', MARCA_PADRAO)).toBe(MARCA_PADRAO);
    expect(normalizarHex(null, ACENTO_PADRAO)).toBe(ACENTO_PADRAO);
  });
});

describe('paletaLoja', () => {
  it('mantém o acento original e deriva um tom legível', () => {
    const p = paletaLoja('#14532d', '#f97316');
    expect(p.marca).toBe('#14532d');
    expect(p.acento).toBe('#f97316');
    expect(contraste(p.acentoAcessivel, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('torna título e preço legíveis no tema escuro', () => {
    const p = paletaLoja('#14532d', '#f97316');
    expect(contraste(p.tituloEscuro, '#11150f')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(p.precoEscuro, '#11150f')).toBeGreaterThanOrEqual(4.5);
  });

  it('aceita cores livres claras e escuras', () => {
    for (const [marca, acento] of [
      ['#ffd400', '#00aaff'],
      ['#000000', '#ffffff'],
      ['#7c3aed', '#10b981'],
    ] as const) {
      const p = paletaLoja(marca, acento);
      expect(contraste(p.acentoAcessivel, '#ffffff')).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.tituloEscuro, '#11150f')).toBeGreaterThanOrEqual(4.5);
      expect(contraste(p.precoEscuro, '#11150f')).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gera o bloco de variáveis CSS com as duas cores', () => {
    const css = cssPaleta(paletaLoja('#7c3aed', '#10b981'));
    expect(css).toContain('--verde:#7c3aed');
    expect(css).toContain('--laranja:#10b981');
    expect(css).toContain("[data-tema='escuro']");
  });
});

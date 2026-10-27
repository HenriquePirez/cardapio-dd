import { describe, expect, it } from 'vitest';
import { ICONES_CATEGORIA, normalizarIcone, resolverIcone } from './icone';

describe('resolverIcone', () => {
  it('retorna null para vazio', () => {
    expect(resolverIcone(null)).toBeNull();
    expect(resolverIcone(undefined)).toBeNull();
    expect(resolverIcone('')).toBeNull();
  });
  it('nome da lista vira classe fi-br-', () => {
    expect(resolverIcone('pizza-slice')).toEqual({ classe: 'fi-br-pizza-slice' });
  });
  it('emoji legado vira texto', () => {
    expect(resolverIcone('\u{1F355}')).toEqual({ texto: '\u{1F355}' });
    expect(resolverIcone('\u{1F468}\u{200D}\u{1F469}')).toEqual({
      texto: '\u{1F468}\u{200D}\u{1F469}',
    });
  });
  it('valor desconhecido vira texto', () => {
    expect(resolverIcone('qualquercoisa')).toEqual({ texto: 'qualquercoisa' });
  });
});

describe('normalizarIcone', () => {
  it('preserva nome da lista', () => {
    expect(normalizarIcone('pizza-slice')).toBe('pizza-slice');
  });
  it('mantém emoji legado (máx 2)', () => {
    expect(normalizarIcone('\u{1F355}\u{1F355}\u{1F355}')).toBe('\u{1F355}\u{1F355}');
  });
  it('reconhece keycap (1️⃣) como emoji', () => {
    expect(normalizarIcone('1\uFE0F\u20E3')).toBe('1\uFE0F\u20E3');
  });

  it('descarta texto sem emoji', () => {
    expect(normalizarIcone('abc')).toBe('');
  });
  it('lista tem os nomes verificados', () => {
    expect(ICONES_CATEGORIA).toContain('pizza-slice');
    expect(ICONES_CATEGORIA).toContain('burger-alt');
    expect(ICONES_CATEGORIA.length).toBeGreaterThanOrEqual(10);
  });
});

import { describe, expect, it } from 'vitest';
import { idEdicaoValido } from './produto';

describe('identificador do produto', () => {
  it('recusa trocar o id de um produto existente', () => {
    expect(idEdicaoValido('burger-2', 'burger')).toBe(false);
    expect(idEdicaoValido('burger', 'burger')).toBe(true);
    expect(idEdicaoValido('burger-novo', '')).toBe(true);
  });
});

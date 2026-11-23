import { describe, expect, it } from 'vitest';
import { chaveLogoParaApagar, chavePertenceALoja, chavesMidiaPermitidas } from './midia';

describe('propriedade das chaves de mídia', () => {
  it('aceita chave da loja atual e recusa a de outra loja', () => {
    expect(chavePertenceALoja('videos/loja-a/123-filme.mp4', 'loja-a')).toBe(true);
    expect(chavePertenceALoja('fotos/loja-a/123.webp', 'loja-a')).toBe(true);
    expect(chavePertenceALoja('lojas/loja-a/logo-1.png', 'loja-a')).toBe(true);

    expect(chavePertenceALoja('videos/loja-b/123-filme.mp4', 'loja-a')).toBe(false);
    expect(chavePertenceALoja('lojas/loja-b/logo-1.png', 'loja-a')).toBe(false);
  });

  it('recusa chave de outra loja enviada na galeria do produto', () => {
    expect(
      chavesMidiaPermitidas(['videos/loja-b/x-filme.mp4'], 'loja-a', new Set()),
    ).toBe(false);
    expect(
      chavesMidiaPermitidas(['videos/loja-a/x-filme.mp4'], 'loja-a', new Set()),
    ).toBe(true);
    expect(
      chavesMidiaPermitidas(
        ['videos/x-antigo.mp4'],
        'loja-a',
        new Set(['videos/x-antigo.mp4']),
      ),
    ).toBe(true);
    expect(
      chavesMidiaPermitidas(['https://cdn.exemplo.com/foto.png'], 'loja-a', new Set()),
    ).toBe(true);
  });

  it('escolhe a chave da logo a apagar conforme o resultado do banco', () => {
    expect(
      chaveLogoParaApagar(true, 'lojas/a/logo-nova.png', 'lojas/a/logo-antiga.png'),
    ).toBe('lojas/a/logo-antiga.png');
    expect(
      chaveLogoParaApagar(false, 'lojas/a/logo-nova.png', 'lojas/a/logo-antiga.png'),
    ).toBe('lojas/a/logo-nova.png');
    expect(chaveLogoParaApagar(true, 'lojas/a/logo-nova.png', null)).toBe(null);
  });
});

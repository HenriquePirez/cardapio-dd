import { describe, expect, it } from 'vitest';

import { chaveValida, extensao, nomeSeguro, tipoPorExtensao, urlMidia } from './env';

describe('chaveValida', () => {
  it('aceita chaves nos prefixos autorizados', () => {
    expect(chaveValida('fotos/x-burger-1.webp')).toBe(true);
    expect(chaveValida('videos/x-burger.mp4')).toBe(true);
  });

  it('rejeita vazio, fora de prefixo, traversal e caminho absoluto', () => {
    expect(chaveValida('')).toBe(false);
    expect(chaveValida('outros/a.webp')).toBe(false);
    expect(chaveValida('fotos/../etc/passwd')).toBe(false);
    expect(chaveValida('/fotos/a.webp')).toBe(false);
    expect(chaveValida('fotos/a\0b.webp')).toBe(false);
    expect(chaveValida('fotos/'.padEnd(301, 'a'))).toBe(false);
  });
});

describe('extensao / tipoPorExtensao', () => {
  it('extrai extensão em minúsculas', () => {
    expect(extensao('fotos/FOTO.JPG')).toBe('.jpg');
    expect(extensao('sem-extensao')).toBe('');
  });

  it('adivinha o Content-Type com fallback seguro', () => {
    expect(tipoPorExtensao('fotos/a.JPG')).toBe('image/jpeg');
    expect(tipoPorExtensao('videos/a.mov')).toBe('video/quicktime');
    expect(tipoPorExtensao('fotos/a.desconhecido')).toBe('application/octet-stream');
  });
});

describe('nomeSeguro', () => {
  it('remove acentos, espaços e caracteres especiais', () => {
    expect(nomeSeguro('X-Burger Especial!')).toBe('x-burger-especial');
    expect(nomeSeguro('Coração de Frango')).toBe('coracao-de-frango');
  });

  it('cai para "arquivo" quando nada sobra', () => {
    expect(nomeSeguro('---')).toBe('arquivo');
    expect(nomeSeguro('')).toBe('arquivo');
  });
});

describe('urlMidia (stub com MEDIA_PUBLIC_BASE vazio)', () => {
  it('monta caminho relativo para /media/<chave>', () => {
    expect(urlMidia('fotos/a.webp')).toBe('/media/fotos/a.webp');
  });

  it('repassa URL absoluta, protocolo-relativo e data URI', () => {
    expect(urlMidia('https://cdn.exemplo/a.webp')).toBe('https://cdn.exemplo/a.webp');
    expect(urlMidia('//cdn.exemplo/a.webp')).toBe('//cdn.exemplo/a.webp');
    expect(urlMidia('data:image/webp;base64,AAAA')).toBe('data:image/webp;base64,AAAA');
  });

  it('devolve string vazia para caminho vazio/nulo', () => {
    expect(urlMidia(null)).toBe('');
    expect(urlMidia(undefined)).toBe('');
    expect(urlMidia('')).toBe('');
  });
});

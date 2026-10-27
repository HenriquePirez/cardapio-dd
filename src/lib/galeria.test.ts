import { describe, expect, it } from 'vitest';
import { lerGaleriaJson } from './galeria';

describe('lerGaleriaJson', () => {
  it('recusa campo ausente (não pode virar lista vazia)', () => {
    expect(lerGaleriaJson(null)).toBeNull();
    expect(lerGaleriaJson(undefined)).toBeNull();
    expect(lerGaleriaJson('')).toBeNull();
    expect(lerGaleriaJson('   ')).toBeNull();
  });

  it('recusa JSON inválido ou que não é lista', () => {
    expect(lerGaleriaJson('{')).toBeNull();
    expect(lerGaleriaJson('{"a":1}')).toBeNull();
    expect(lerGaleriaJson('null')).toBeNull();
  });

  it('aceita lista vazia explícita', () => {
    expect(lerGaleriaJson('[]')).toEqual([]);
  });

  it('lê itens e ignora campos desconhecidos', () => {
    const bruto = JSON.stringify([
      { id: 7, tipo: 'imagem', url: 'fotos/a.jpg', full: 'fotos/a-full.jpg', lixo: 1 },
      { id: 'novo-1', tipo: 'video', url: 'videos/b.mp4', poster: 'fotos/b.jpg', ordem: 2 },
    ]);
    expect(lerGaleriaJson(bruto)).toEqual([
      {
        id: 7,
        tipo: 'imagem',
        url: 'fotos/a.jpg',
        full: 'fotos/a-full.jpg',
        poster: undefined,
        alt: undefined,
        ordem: undefined,
      },
      {
        id: 'novo-1',
        tipo: 'video',
        url: 'videos/b.mp4',
        full: undefined,
        poster: 'fotos/b.jpg',
        alt: undefined,
        ordem: 2,
      },
    ]);
  });

  it('recusa item malformado', () => {
    expect(lerGaleriaJson('[{"id":1,"tipo":"imagem"}]')).toBeNull();
    expect(lerGaleriaJson('[{"tipo":"imagem","url":"x"}]')).toBeNull();
    expect(lerGaleriaJson('[{"id":1,"tipo":"audio","url":"x"}]')).toBeNull();
    expect(lerGaleriaJson('[null]')).toBeNull();
    expect(lerGaleriaJson('["x"]')).toBeNull();
  });
});

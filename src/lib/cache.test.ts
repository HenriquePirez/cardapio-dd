import { afterEach, describe, expect, it, vi } from 'vitest';
import { invalidarCardapio } from './cache';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('invalidação do cardápio', () => {
  it('apaga a chave da raiz mesmo quando o pedido vem de uma API do admin', async () => {
    const apagadas: string[] = [];
    vi.stubGlobal('caches', {
      default: {
        delete: async (chave: Request) => {
          apagadas.push(chave.url);
          return true;
        },
      },
    });

    await invalidarCardapio(
      new Request('https://myshelf.test/admin/api/produtos/salvar'),
      'dona-dora',
    );

    expect(apagadas).toContain('https://myshelf.test/');
    expect(apagadas).toContain('https://myshelf.test/loja/dona-dora');
  });
});

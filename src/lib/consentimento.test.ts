import { describe, expect, it } from 'vitest';
import { criarConsentimento, lerConsentimento, VERSAO_CONSENTIMENTO } from './consentimento';

describe('consentimento de cookies', () => {
  it('lê uma escolha válida', () => {
    const salvo = JSON.stringify(criarConsentimento(true, new Date('2026-11-03T12:00:00Z')));
    expect(lerConsentimento(salvo)).toEqual({
      analytics: true,
      versao: VERSAO_CONSENTIMENTO,
      data: '2026-11-03T12:00:00.000Z',
    });
  });

  it('rejeita JSON inválido, versão antiga e valor ausente', () => {
    expect(lerConsentimento(null)).toBeNull();
    expect(lerConsentimento('{')).toBeNull();
    expect(lerConsentimento(JSON.stringify({ analytics: true, versao: 0 }))).toBeNull();
    expect(lerConsentimento(JSON.stringify({ analytics: 'sim', versao: 1 }))).toBeNull();
  });

  it('cria a escolha com a versão atual', () => {
    expect(criarConsentimento(false)).toMatchObject({
      analytics: false,
      versao: VERSAO_CONSENTIMENTO,
    });
  });
});

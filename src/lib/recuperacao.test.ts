import { describe, expect, it } from 'vitest';

import { dentroDoIntervalo, expiraEm, gerarToken, hashToken, utilizavel } from './recuperacao';

describe('token de redefinição', () => {
  it('gera64 caracteres hex aleatórios', () => {
    const t = gerarToken();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(gerarToken()).not.toBe(t);
  });

  it('hash é SHA-256 conhecido e determinístico', async () => {
    expect(await hashToken('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(await hashToken('abc')).toBe(await hashToken('abc'));
  });
});

describe('expiraEm', () => {
  it('vence1 hora depois do pedido', () => {
    const agora = Date.parse('2026-11-12T12:00:00.000Z');
    expect(Date.parse(expiraEm(agora))).toBe(agora + 60 * 60 * 1000);
  });
});

describe('utilizavel', () => {
  const agora = Date.parse('2026-11-12T12:00:00.000Z');

  it('aceita pendente dentro da validade', () => {
    expect(utilizavel('2026-11-12T12:30:00.000Z', null, agora)).toBe(true);
  });

  it('recusa token já usado', () => {
    expect(utilizavel('2026-11-12T12:30:00.000Z', '2026-11-12T12:05:00.000Z', agora)).toBe(
      false,
    );
  });

  it('recusa expirado e data inválida', () => {
    expect(utilizavel('2026-11-12T11:59:00.000Z', null, agora)).toBe(false);
    expect(utilizavel('não é data', null, agora)).toBe(false);
  });
});

describe('dentroDoIntervalo', () => {
  const agora = Date.parse('2026-11-12T12:00:00.000Z');

  it('segura o segundo pedido em menos de10 min', () => {
    expect(dentroDoIntervalo('2026-11-12T11:55:00.000Z', agora)).toBe(true);
    expect(dentroDoIntervalo('2026-11-12T11:50:00.000Z', agora)).toBe(false);
  });

  it('lê datetime sem fuso do D1 como UTC', () => {
    expect(dentroDoIntervalo('2026-11-12 11:55:00', agora)).toBe(true);
    expect(dentroDoIntervalo('2026-11-12 11:45:00', agora)).toBe(false);
  });

  it('data inválida não segura nada', () => {
    expect(dentroDoIntervalo('lixo', agora)).toBe(false);
  });
});
